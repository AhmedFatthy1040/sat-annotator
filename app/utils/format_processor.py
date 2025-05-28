"""
Enhanced format processor for various image types beyond basic TIFF support.
Extends the preprocessing layer to handle scientific, raw, and specialized formats.
"""

import logging
from pathlib import Path
from typing import Dict, Optional, Any, Tuple, Union
import numpy as np
from PIL import Image
import rasterio

# Optional imports for specialized formats
try:
    from pillow_heif import register_heif_opener
    HEIF_AVAILABLE = True
    register_heif_opener()
except ImportError:
    HEIF_AVAILABLE = False

try:
    import rawpy
    RAW_AVAILABLE = True
except ImportError:
    RAW_AVAILABLE = False

try:
    import pydicom
    DICOM_AVAILABLE = True
except ImportError:
    DICOM_AVAILABLE = False

try:
    from astropy.io import fits
    FITS_AVAILABLE = True
except ImportError:
    FITS_AVAILABLE = False

try:
    import xarray as xr
    import netCDF4
    NETCDF_AVAILABLE = True
except ImportError:
    NETCDF_AVAILABLE = False

try:
    import h5py
    HDF5_AVAILABLE = True
except ImportError:
    HDF5_AVAILABLE = False

logger = logging.getLogger(__name__)

class FormatProcessor:
    """Handles various image formats with specialized processing"""
    
    def __init__(self):
        # Format-specific processors
        self.processors = {
            'jpeg2000': self._process_jpeg2000,
            'webp': self._process_webp,
            'heic': self._process_heic,
            'netcdf': self._process_netcdf,
            'hdf5': self._process_hdf5,
            'raw': self._process_raw,
            'dicom': self._process_dicom,
            'fits': self._process_fits,
        }
    
    def detect_format(self, file_path: Path) -> str:
        """Detect the actual format of the file"""
        suffix = file_path.suffix.lower()
        
        format_map = {
            '.jp2': 'jpeg2000',
            '.j2k': 'jpeg2000', 
            '.webp': 'webp',
            '.heic': 'heic',
            '.heif': 'heic',
            '.nc': 'netcdf',
            '.h5': 'hdf5',
            '.hdf': 'hdf5',
            '.cr2': 'raw',
            '.nef': 'raw',
            '.arw': 'raw',
            '.dng': 'raw',
            '.dcm': 'dicom',
            '.fits': 'fits',
            '.fit': 'fits',
        }
        
        return format_map.get(suffix, 'standard')
    
    def process_format(self, file_path: Path, format_type: str = None) -> Dict[str, Any]:
        """Process file based on format type"""
        if format_type is None:
            format_type = self.detect_format(file_path)
        
        if format_type in self.processors:
            return self.processors[format_type](file_path)
        else:
            return self._process_standard(file_path)
    
    def convert_to_web_format(self, file_path: Path, format_type: str = None) -> Optional[Path]:
        """Convert specialized formats to web-compatible formats (PNG/JPEG)"""
        if format_type is None:
            format_type = self.detect_format(file_path)
        
        # Create processed directory
        processed_dir = file_path.parent / 'processed'
        processed_dir.mkdir(exist_ok=True)
        
        output_path = processed_dir / f"{file_path.stem}_converted.png"
        
        try:
            if format_type == 'heic' and HEIF_AVAILABLE:
                return self._convert_heic_to_web(file_path, output_path)
            elif format_type == 'raw' and RAW_AVAILABLE:
                return self._convert_raw_to_web(file_path, output_path)
            elif format_type == 'dicom' and DICOM_AVAILABLE:
                return self._convert_dicom_to_web(file_path, output_path)
            elif format_type == 'fits' and FITS_AVAILABLE:
                return self._convert_fits_to_web(file_path, output_path)
            elif format_type == 'netcdf' and NETCDF_AVAILABLE:
                return self._convert_netcdf_to_web(file_path, output_path)
            elif format_type == 'hdf5' and HDF5_AVAILABLE:
                return self._convert_hdf5_to_web(file_path, output_path)
            else:
                # Try standard PIL conversion
                return self._convert_standard_to_web(file_path, output_path)
        
        except Exception as e:
            logger.error(f"Format conversion failed for {file_path}: {e}")
            return None
    
    def _process_standard(self, file_path: Path) -> Dict[str, Any]:
        """Standard PIL-based processing"""
        try:
            with Image.open(file_path) as img:
                return {
                    'format': img.format.lower(),
                    'mode': img.mode,
                    'size': img.size,
                    'has_transparency': img.mode in ('RGBA', 'LA', 'P'),
                    'metadata': getattr(img, 'info', {}),
                    'bands': len(img.getbands()) if hasattr(img, 'getbands') else 1
                }
        except Exception as e:
            logger.error(f"Standard processing failed for {file_path}: {e}")
            return {'error': str(e)}
    
    def _process_jpeg2000(self, file_path: Path) -> Dict[str, Any]:
        """Process JPEG2000 files"""
        try:
            # Try with PIL first (if Pillow supports it)
            with Image.open(file_path) as img:
                metadata = {
                    'format': 'jpeg2000',
                    'size': img.size,
                    'mode': img.mode,
                    'compression': 'jpeg2000',
                    'lossless': True,  # JPEG2000 can be lossless
                }
                return metadata
        except Exception as e:
            logger.warning(f"JPEG2000 processing failed: {e}")
            # Could fallback to rasterio or specialized library            return {'error': str(e), 'format': 'jpeg2000'}
    
    def _process_webp(self, file_path: Path) -> Dict[str, Any]:
        """Process WebP files"""
        try:
            with Image.open(file_path) as img:
                return {
                    'format': 'webp',
                    'size': img.size,
                    'mode': img.mode,
                    'has_transparency': img.mode in ('RGBA', 'LA'),
                    'animated': getattr(img, 'is_animated', False),
                    'lossless': img.info.get('lossless', False),
                }
        except Exception as e:
            return {'error': str(e), 'format': 'webp'}
    
    def _process_heic(self, file_path: Path) -> Dict[str, Any]:
        """Process HEIC/HEIF files (requires pillow-heif)"""
        if not HEIF_AVAILABLE:
            return {
                'error': 'HEIC support requires pillow-heif library. Install with: pip install pillow-heif',
                'format': 'heic'
            }
        
        try:
            with Image.open(file_path) as img:
                return {
                    'format': 'heic',
                    'size': img.size,
                    'mode': img.mode,
                    'metadata': img.info,
                    'has_transparency': img.mode in ('RGBA', 'LA'),
                    'quality': 'high'  # HEIC is typically high quality
                }
        except Exception as e:
            return {'error': f'HEIC processing failed: {e}', 'format': 'heic'}
    
    def _process_netcdf(self, file_path: Path) -> Dict[str, Any]:
        """Process NetCDF files (requires xarray/netCDF4)"""
        if not NETCDF_AVAILABLE:
            return {
                'error': 'NetCDF support requires xarray and netcdf4 libraries. Install with: pip install xarray netcdf4',
                'format': 'netcdf'
            }
        
        try:
            ds = xr.open_dataset(file_path)
            variables = list(ds.data_vars)
            
            if not variables:
                return {'error': 'No data variables found in NetCDF file', 'format': 'netcdf'}
            
            # Get info about the first 2D variable for visualization
            var_name = variables[0]
            data_var = ds[var_name]
            
            return {
                'format': 'netcdf',
                'variables': variables,
                'dimensions': dict(ds.dims),
                'shape': data_var.shape,
                'dtype': str(data_var.dtype),
                'units': data_var.attrs.get('units', 'unknown'),
                'long_name': data_var.attrs.get('long_name', var_name),
                'coordinates': list(data_var.coords),
                'metadata': dict(ds.attrs)
            }
        except Exception as e:
            return {'error': f'NetCDF processing failed: {e}', 'format': 'netcdf'}
    
    def _process_hdf5(self, file_path: Path) -> Dict[str, Any]:
        """Process HDF5 files (requires h5py)"""
        if not HDF5_AVAILABLE:
            return {
                'error': 'HDF5 support requires h5py library. Install with: pip install h5py',
                'format': 'hdf5'
            }
        
        try:
            with h5py.File(file_path, 'r') as f:
                datasets = list(f.keys())
                
                if not datasets:
                    return {'error': 'No datasets found in HDF5 file', 'format': 'hdf5'}
                
                # Get info about the first dataset
                first_dataset = f[datasets[0]]
                
                return {
                    'format': 'hdf5',
                    'datasets': datasets,
                    'shape': first_dataset.shape,
                    'dtype': str(first_dataset.dtype),
                    'compression': first_dataset.compression,
                    'metadata': dict(f.attrs) if hasattr(f, 'attrs') else {}
                }
        except Exception as e:
            return {'error': f'HDF5 processing failed: {e}', 'format': 'hdf5'}
    
    def _process_raw(self, file_path: Path) -> Dict[str, Any]:
        """Process RAW camera files (requires rawpy)"""
        if not RAW_AVAILABLE:
            return {
                'error': 'RAW support requires rawpy library. Install with: pip install rawpy',
                'format': 'raw'
            }
        
        try:
            with rawpy.imread(str(file_path)) as raw:
                return {
                    'format': 'raw',
                    'camera_make': getattr(raw, 'camera_make', 'unknown'),
                    'camera_model': getattr(raw, 'camera_model', 'unknown'),
                    'iso': getattr(raw, 'camera_iso', 'unknown'),
                    'raw_pattern': getattr(raw, 'raw_pattern', None),
                    'sizes': getattr(raw, 'sizes', None),
                    'color_matrix': getattr(raw, 'color_matrix', None)[:3, :3].tolist() if hasattr(raw, 'color_matrix') else None,
                    'white_balance': getattr(raw, 'camera_whitebalance', None),
                    'daylight_whitebalance': getattr(raw, 'daylight_whitebalance', None)
                }
        except Exception as e:
            return {'error': f'RAW processing failed: {e}', 'format': 'raw'}
    
    def _process_dicom(self, file_path: Path) -> Dict[str, Any]:
        """Process DICOM medical images (requires pydicom)"""
        if not DICOM_AVAILABLE:
            return {
                'error': 'DICOM support requires pydicom library. Install with: pip install pydicom',
                'format': 'dicom'
            }
        
        try:
            ds = pydicom.dcmread(file_path)
            
            return {
                'format': 'dicom',
                'patient_name': str(getattr(ds, 'PatientName', 'unknown')),
                'study_date': str(getattr(ds, 'StudyDate', 'unknown')),
                'modality': str(getattr(ds, 'Modality', 'unknown')),
                'image_type': str(getattr(ds, 'ImageType', 'unknown')),
                'rows': getattr(ds, 'Rows', None),
                'columns': getattr(ds, 'Columns', None),
                'pixel_spacing': getattr(ds, 'PixelSpacing', None),
                'bits_allocated': getattr(ds, 'BitsAllocated', None),
                'photometric_interpretation': str(getattr(ds, 'PhotometricInterpretation', 'unknown'))
            }
        except Exception as e:
            return {'error': f'DICOM processing failed: {e}', 'format': 'dicom'}
    
    def _process_fits(self, file_path: Path) -> Dict[str, Any]:
        """Process FITS astronomy files (requires astropy)"""
        if not FITS_AVAILABLE:
            return {
                'error': 'FITS support requires astropy library. Install with: pip install astropy',
                'format': 'fits'
            }
        
        try:
            with fits.open(file_path) as hdul:
                primary_hdu = hdul[0]
                header = primary_hdu.header
                data = primary_hdu.data
                
                return {
                    'format': 'fits',
                    'shape': data.shape if data is not None else None,
                    'dtype': str(data.dtype) if data is not None else None,
                    'instrument': header.get('INSTRUME', 'unknown'),
                    'telescope': header.get('TELESCOP', 'unknown'),
                    'object': header.get('OBJECT', 'unknown'),
                    'observation_date': header.get('DATE-OBS', 'unknown'),
                    'exposure_time': header.get('EXPTIME', None),
                    'filter': header.get('FILTER', 'unknown'),
                    'num_hdus': len(hdul),
                    'metadata': dict(header)
                }
        except Exception as e:
            return {'error': f'FITS processing failed: {e}', 'format': 'fits'}
    
    def _convert_heic_to_web(self, file_path: Path, output_path: Path) -> Path:
        """Convert HEIC to PNG"""
        with Image.open(file_path) as img:
            img.convert('RGB').save(output_path, 'PNG', optimize=True)
        return output_path
    
    def _convert_raw_to_web(self, file_path: Path, output_path: Path) -> Path:
        """Convert RAW to PNG"""
        with rawpy.imread(str(file_path)) as raw:
            rgb = raw.postprocess()
            Image.fromarray(rgb).save(output_path, 'PNG', optimize=True)
        return output_path
    
    def _convert_dicom_to_web(self, file_path: Path, output_path: Path) -> Path:
        """Convert DICOM to PNG"""
        ds = pydicom.dcmread(file_path)
        pixel_array = ds.pixel_array
        
        # Normalize to 0-255 range
        if pixel_array.max() > 255:
            pixel_array = ((pixel_array - pixel_array.min()) / 
                          (pixel_array.max() - pixel_array.min()) * 255).astype(np.uint8)
        
        Image.fromarray(pixel_array).convert('RGB').save(output_path, 'PNG', optimize=True)
        return output_path
    
    def _convert_fits_to_web(self, file_path: Path, output_path: Path) -> Path:
        """Convert FITS to PNG"""
        with fits.open(file_path) as hdul:
            data = hdul[0].data
            if data is None:
                raise ValueError("No image data found in FITS file")
            
            # Normalize to 0-255 range
            normalized = ((data - data.min()) / (data.max() - data.min()) * 255).astype(np.uint8)
            Image.fromarray(normalized).convert('RGB').save(output_path, 'PNG', optimize=True)
        return output_path
    
    def _convert_netcdf_to_web(self, file_path: Path, output_path: Path) -> Path:
        """Convert NetCDF to PNG (first 2D variable)"""
        ds = xr.open_dataset(file_path)
        variables = list(ds.data_vars)
        
        if not variables:
            raise ValueError("No data variables found in NetCDF file")
        
        # Get first 2D variable
        var_data = ds[variables[0]].values
        if var_data.ndim != 2:
            if var_data.ndim > 2:
                var_data = var_data[0]  # Take first slice
            else:
                raise ValueError("No 2D data found for visualization")
        
        # Normalize to 0-255 range
        normalized = ((var_data - np.nanmin(var_data)) / 
                     (np.nanmax(var_data) - np.nanmin(var_data)) * 255).astype(np.uint8)
        Image.fromarray(normalized).convert('RGB').save(output_path, 'PNG', optimize=True)
        return output_path
    
    def _convert_hdf5_to_web(self, file_path: Path, output_path: Path) -> Path:
        """Convert HDF5 to PNG (first 2D dataset)"""
        with h5py.File(file_path, 'r') as f:
            datasets = list(f.keys())
            if not datasets:
                raise ValueError("No datasets found in HDF5 file")
            
            data = f[datasets[0]][:]
            if data.ndim != 2:
                if data.ndim > 2:
                    data = data[0]  # Take first slice
                else:
                    raise ValueError("No 2D data found for visualization")
            
            # Normalize to 0-255 range
            normalized = ((data - data.min()) / (data.max() - data.min()) * 255).astype(np.uint8)
            Image.fromarray(normalized).convert('RGB').save(output_path, 'PNG', optimize=True)
        return output_path
    
    def _convert_standard_to_web(self, file_path: Path, output_path: Path) -> Path:
        """Convert standard formats to PNG"""
        with Image.open(file_path) as img:
            img.convert('RGB').save(output_path, 'PNG', optimize=True)
        return output_path

# Global processor instance
format_processor = FormatProcessor()
