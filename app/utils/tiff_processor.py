"""
TIFF Image Preprocessing Module
Handles various TIFF formats including GeoTIFF, multi-band, and standard TIFF files
"""

import os
import numpy as np
from pathlib import Path
from PIL import Image
import rasterio
from rasterio.enums import Resampling
import cv2
from typing import Tuple, Optional, Union
import logging

logger = logging.getLogger(__name__)


class TIFFProcessor:
    """Enhanced TIFF processor for satellite and geospatial imagery"""
    
    def __init__(self):
        self.supported_formats = ['.tif', '.tiff', '.TIF', '.TIFF']
        
    def is_tiff_file(self, file_path: Union[str, Path]) -> bool:
        """Check if the file is a TIFF format"""
        return Path(file_path).suffix.lower() in ['.tif', '.tiff']
    
    def get_image_info(self, file_path: Union[str, Path]) -> dict:
        """Get comprehensive information about the TIFF file"""
        file_path = Path(file_path)
        info = {
            'format': 'unknown',
            'bands': 0,
            'width': 0,
            'height': 0,
            'dtype': None,
            'crs': None,
            'is_geotiff': False,
            'has_transparency': False,
            'compression': None
        }
        
        try:
            # Try rasterio first for geospatial data
            with rasterio.open(file_path) as src:
                info.update({
                    'format': 'geotiff' if src.crs else 'tiff',
                    'bands': src.count,
                    'width': src.width,
                    'height': src.height,
                    'dtype': str(src.dtypes[0]),
                    'crs': str(src.crs) if src.crs else None,
                    'is_geotiff': src.crs is not None,
                    'compression': src.compression.name if src.compression else None
                })
                logger.info(f"Successfully read TIFF with rasterio: {info}")
                return info
        except Exception as e:
            logger.warning(f"Rasterio failed to read {file_path}: {e}")
        
        try:
            # Fallback to PIL
            with Image.open(file_path) as img:
                info.update({
                    'format': 'tiff',
                    'bands': len(img.getbands()) if hasattr(img, 'getbands') else 1,
                    'width': img.width,
                    'height': img.height,
                    'dtype': str(img.mode),
                    'has_transparency': img.mode in ('RGBA', 'LA') or 'transparency' in img.info
                })
                logger.info(f"Successfully read TIFF with PIL: {info}")
                return info
        except Exception as e:
            logger.error(f"Failed to read TIFF file {file_path}: {e}")
            raise
    
    def preprocess_tiff(self, 
                       file_path: Union[str, Path], 
                       output_path: Optional[Union[str, Path]] = None,
                       target_bands: int = 3,
                       max_size: Optional[Tuple[int, int]] = None,
                       normalize: bool = True) -> str:
        """
        Preprocess TIFF file for annotation workflow
        
        Args:
            file_path: Input TIFF file path
            output_path: Output path (if None, creates processed version)
            target_bands: Target number of bands (1 for grayscale, 3 for RGB)
            max_size: Maximum dimensions (width, height) for resizing
            normalize: Whether to normalize pixel values
            
        Returns:
            Path to processed image
        """
        file_path = Path(file_path)
        
        if output_path is None:
            output_path = file_path.parent / f"processed_{file_path.stem}.png"
        else:
            output_path = Path(output_path)
        
        logger.info(f"Processing TIFF: {file_path} -> {output_path}")
        
        try:
            # Try rasterio first for geospatial data
            with rasterio.open(file_path) as src:
                # Read all bands
                data = src.read()
                
                # Handle different band configurations
                processed_data = self._process_bands(data, target_bands, normalize)
                
                # Resize if needed
                if max_size:
                    processed_data = self._resize_image(processed_data, max_size)
                
                # Save as standard image format
                self._save_processed_image(processed_data, output_path)
                
                logger.info(f"Successfully processed TIFF with rasterio")
                return str(output_path)
                
        except Exception as e:
            logger.warning(f"Rasterio processing failed: {e}, trying PIL")
            
            try:
                # Fallback to PIL
                with Image.open(file_path) as img:
                    # Convert to RGB if needed
                    if img.mode != 'RGB':
                        if img.mode == 'RGBA':
                            # Handle transparency
                            img = self._handle_transparency(img)
                        else:
                            img = img.convert('RGB')
                    
                    # Resize if needed
                    if max_size and (img.width > max_size[0] or img.height > max_size[1]):
                        img.thumbnail(max_size, Image.Resampling.LANCZOS)
                    
                    # Save as PNG
                    img.save(output_path, 'PNG')
                    
                    logger.info(f"Successfully processed TIFF with PIL")
                    return str(output_path)
                    
            except Exception as e:
                logger.error(f"All processing methods failed: {e}")
                raise
    
    def _process_bands(self, data: np.ndarray, target_bands: int, normalize: bool) -> np.ndarray:
        """Process multi-band raster data"""
        bands, height, width = data.shape
        
        if normalize:
            # Normalize to 0-255 range
            data = data.astype(np.float32)
            for i in range(bands):
                band_min, band_max = data[i].min(), data[i].max()
                if band_max > band_min:
                    data[i] = ((data[i] - band_min) / (band_max - band_min)) * 255
                else:
                    data[i] = 0
            data = data.astype(np.uint8)
        
        if target_bands == 1:
            # Convert to grayscale
            if bands == 1:
                return data[0]
            elif bands >= 3:
                # Use RGB to grayscale conversion
                return np.dot(data[:3].transpose(1, 2, 0), [0.299, 0.587, 0.114]).astype(np.uint8)
            else:
                return data[0]
                
        elif target_bands == 3:
            # Convert to RGB
            if bands == 1:
                # Grayscale to RGB
                band = data[0]
                return np.stack([band, band, band], axis=0)
            elif bands >= 3:
                # Use first 3 bands as RGB
                return data[:3]
            else:
                # Duplicate bands to reach 3
                rgb_data = np.zeros((3, height, width), dtype=data.dtype)
                for i in range(min(bands, 3)):
                    rgb_data[i] = data[i]
                return rgb_data
        
        return data
    
    def _resize_image(self, data: np.ndarray, max_size: Tuple[int, int]) -> np.ndarray:
        """Resize image data"""
        if len(data.shape) == 2:
            # Grayscale
            height, width = data.shape
            if width > max_size[0] or height > max_size[1]:
                return cv2.resize(data, max_size, interpolation=cv2.INTER_LANCZOS4)
        else:
            # Multi-band - transpose to (H, W, C) for OpenCV
            data_hwc = data.transpose(1, 2, 0)
            height, width = data_hwc.shape[:2]
            if width > max_size[0] or height > max_size[1]:
                resized = cv2.resize(data_hwc, max_size, interpolation=cv2.INTER_LANCZOS4)
                return resized.transpose(2, 0, 1)  # Back to (C, H, W)
        
        return data
    
    def _save_processed_image(self, data: np.ndarray, output_path: Path):
        """Save processed image data"""
        if len(data.shape) == 2:
            # Grayscale
            cv2.imwrite(str(output_path), data)
        else:
            # Multi-band - convert to HWC format for saving
            if data.shape[0] <= 4:  # CHW format
                data_hwc = data.transpose(1, 2, 0)
            else:  # Already HWC
                data_hwc = data
            
            if data_hwc.shape[2] == 3:
                # RGB - convert to BGR for OpenCV
                data_hwc = cv2.cvtColor(data_hwc, cv2.COLOR_RGB2BGR)
            
            cv2.imwrite(str(output_path), data_hwc)
    
    def _handle_transparency(self, img: Image.Image) -> Image.Image:
        """Handle transparent RGBA images by compositing with white background"""
        if img.mode == 'RGBA':
            # Create white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])  # Use alpha channel as mask
            return background
        return img
    
    def create_web_compatible_version(self, 
                                    file_path: Union[str, Path],
                                    output_dir: Optional[Union[str, Path]] = None) -> str:
        """
        Create a web-compatible version of TIFF file for frontend display
        
        Args:
            file_path: Input TIFF file
            output_dir: Output directory (defaults to same as input)
            
        Returns:
            Path to web-compatible image
        """
        file_path = Path(file_path)
        
        if output_dir is None:
            output_dir = file_path.parent
        else:
            output_dir = Path(output_dir)
        
        # Create PNG version for web display
        web_filename = f"web_{file_path.stem}.png"
        web_path = output_dir / web_filename
        
        # Process with reasonable size limits for web
        max_web_size = (2048, 2048)  # Max 2K resolution for web
        
        return self.preprocess_tiff(
            file_path=file_path,
            output_path=web_path,
            target_bands=3,  # RGB for web
            max_size=max_web_size,
            normalize=True
        )


# Global instance
tiff_processor = TIFFProcessor()
