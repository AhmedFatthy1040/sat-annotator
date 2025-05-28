import os
import uuid
from pathlib import Path
from fastapi import UploadFile
from PIL import Image
import logging
from .tiff_processor import tiff_processor
from .format_processor import format_processor

logger = logging.getLogger(__name__)

# Determine if we're running in Docker or locally
in_docker = os.path.exists('/.dockerenv')

# Create upload directory with the appropriate path
if in_docker:
    UPLOAD_DIR = Path("/app/uploads")
    PROCESSED_DIR = Path("/app/uploads/processed")
else:
    # For local development, use a path relative to the project root
    base_dir = Path(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    UPLOAD_DIR = base_dir / "uploads"
    PROCESSED_DIR = UPLOAD_DIR / "processed"

# Create directories if they don't exist
UPLOAD_DIR.mkdir(exist_ok=True)
PROCESSED_DIR.mkdir(exist_ok=True)

async def save_upload_file(file: UploadFile) -> dict:
    """Save an uploaded file to the upload directory with TIFF preprocessing."""
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1].lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save the original file first
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)
    
    logger.info(f"Saved original file: {file_path}")
    
    # Initialize return data
    processed_path = None
    web_path = None
    resolution = None
    file_size = os.path.getsize(file_path)
      # Detect format type for appropriate processing
    format_type = format_processor.detect_format(file_path)
    logger.info(f"Detected format type: {format_type} for file: {file.filename}")
    
    # Handle TIFF files with existing processor
    if file_extension in ['.tif', '.tiff']:
        try:
            logger.info(f"Processing TIFF file: {file.filename}")
            
            # Get TIFF information
            tiff_info = tiff_processor.get_image_info(file_path)
            logger.info(f"TIFF info: {tiff_info}")
            
            # Create processed version for the annotation workflow
            processed_filename = f"processed_{unique_filename.replace(file_extension, '.png')}"
            processed_path = PROCESSED_DIR / processed_filename
            
            # Process the TIFF file
            actual_processed_path = tiff_processor.preprocess_tiff(
                file_path=file_path,
                output_path=processed_path,
                target_bands=3,
                max_size=(4096, 4096),  # Keep high resolution for annotation
                normalize=True
            )
            
            # Create web-compatible version
            web_filename = f"web_{unique_filename.replace(file_extension, '.png')}"
            web_path = PROCESSED_DIR / web_filename
            
            actual_web_path = tiff_processor.preprocess_tiff(
                file_path=file_path,
                output_path=web_path,
                target_bands=3,
                max_size=(2048, 2048),  # Web display size
                normalize=True
            )
            
            # Use the processed version for resolution info
            with Image.open(actual_processed_path) as img:
                resolution = f"{img.width}x{img.height}"
            
            # Return path to the processed version for annotation workflow
            return {
                "filename": unique_filename,
                "original_filename": file.filename,
                "size": file_size,
                "content_type": file.content_type,
                "path": f"uploads/{unique_filename}",  # Original file path
                "processed_path": f"uploads/processed/{processed_filename}",  # Processed for annotation
                "web_path": f"uploads/processed/{web_filename}",  # Web display version
                "resolution": resolution,
                "is_tiff": True,
                "tiff_info": tiff_info
            }
            
        except Exception as e:
            logger.error(f"TIFF processing failed: {e}")
            # Fall back to standard processing
            try:
                with Image.open(file_path) as img:
                    resolution = f"{img.width}x{img.height}"
            except Exception:
                resolution = None
    
    # Handle specialized formats (HEIC, RAW, DICOM, etc.)
    elif format_type != 'standard':
        try:
            logger.info(f"Processing specialized format: {format_type} for file: {file.filename}")
            
            # Get format metadata
            metadata = format_processor.process_format(file_path, format_type)
            
            # Convert to web format
            converted_web_path = format_processor.convert_to_web_format(file_path, format_type)
            
            if converted_web_path:
                # Create high-res processed version for annotation
                processed_filename = f"processed_{unique_filename.replace(file_extension, '.png')}"
                processed_path = PROCESSED_DIR / processed_filename
                
                # Create annotation-ready version (high resolution)
                annotation_path = format_processor.convert_to_web_format(
                    file_path, format_type, max_size=(4096, 4096)
                )
                
                if annotation_path:
                    # Move/copy to processed directory with correct name
                    import shutil
                    shutil.move(str(annotation_path), str(processed_path))
                    
                # Get resolution from the converted file
                with Image.open(converted_web_path) as img:
                    resolution = f"{img.width}x{img.height}"
                
                web_filename = f"web_{unique_filename.replace(file_extension, '.png')}"
                web_path = PROCESSED_DIR / web_filename
                
                # Move web version to correct location
                import shutil
                shutil.move(str(converted_web_path), str(web_path))
                
                return {
                    "filename": unique_filename,
                    "original_filename": file.filename,
                    "size": file_size,
                    "content_type": file.content_type,
                    "path": f"uploads/{unique_filename}",
                    "processed_path": f"uploads/processed/{processed_filename}",
                    "web_path": f"uploads/processed/{web_filename}",
                    "resolution": resolution,
                    "is_tiff": False,
                    "format_type": format_type,
                    "format_metadata": metadata
                }
            else:
                logger.warning(f"Failed to convert {format_type} format to web format")
                
        except Exception as e:
            logger.error(f"Specialized format processing failed: {e}")
            # Fall back to standard processing
    
    # Standard image processing for common formats (JPEG, PNG, WebP that PIL can handle)
    try:
        with Image.open(file_path) as img:
            resolution = f"{img.width}x{img.height}"
    except Exception:
        # Not a valid image or PIL cannot read it
        pass
    
    # Return standard format for non-TIFF files
    return {
        "filename": unique_filename,
        "original_filename": file.filename,
        "size": file_size,
        "content_type": file.content_type,
        "path": f"uploads/{unique_filename}",
        "resolution": resolution,
        "is_tiff": False
    }

async def process_specialized_format(file_path: Path) -> tuple:
    """
    Process specialized image formats and convert to web-compatible format.
    Returns tuple of (converted_file_path, metadata)
    """
    try:
        # Detect the format
        format_type = format_processor.detect_format(file_path)
        
        # Get format metadata
        metadata = format_processor.process_format(file_path, format_type)
        
        # Convert to web format if it's a specialized format
        converted_path = None
        if format_type != 'standard':
            converted_path = format_processor.convert_to_web_format(file_path, format_type)
            if converted_path:
                logger.info(f"Converted {format_type} file to web format: {converted_path}")
        
        return converted_path, metadata
        
    except Exception as e:
        logger.error(f"Specialized format processing failed for {file_path}: {e}")
        return None, {'error': str(e), 'format': 'unknown'}

def validate_image_file(file: UploadFile) -> bool:
    """Validate if the file is a supported image format."""
    content_type = file.content_type
    filename = file.filename.lower() if file.filename else ""
      # Check MIME type
    valid_mime_types = [
        "image/jpeg", 
        "image/jpg",
        "image/png", 
        "image/tiff", 
        "image/tif",
        "image/geotiff",
        "image/webp",
        "image/heic",
        "image/heif", 
        "image/jp2",
        "image/j2k",
        "application/octet-stream",  # Some specialized files may be sent as this
        "application/dicom",
        "image/fits",
        "application/x-netcdf",
        "application/x-hdf"
    ]
    
    # Check file extension as backup
    valid_extensions = [
        '.jpg', '.jpeg', '.png', '.tif', '.tiff',
        '.webp', '.heic', '.heif', '.jp2', '.j2k',
        '.cr2', '.nef', '.arw', '.dng',  # RAW formats
        '.dcm',  # DICOM
        '.fits', '.fit',  # FITS astronomy
        '.nc',  # NetCDF
        '.h5', '.hdf'  # HDF5
    ]
    has_valid_extension = any(filename.endswith(ext) for ext in valid_extensions)
    
    # Accept if either MIME type is valid OR extension is valid (for TIFF files)
    return content_type in valid_mime_types or has_valid_extension