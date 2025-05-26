#!/usr/bin/env python3
"""
Test script to verify enhanced image format support.
"""

import sys
import os
from pathlib import Path
from PIL import Image
import tempfile
import logging

# Add the app directory to Python path
app_dir = Path(__file__).parent
sys.path.insert(0, str(app_dir))

from utils.format_processor import format_processor

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_format_detection():
    """Test format detection capabilities."""
    print("Testing format detection...")
    
    test_files = [
        "test.jpg",
        "test.png", 
        "test.tiff",
        "test.webp",
        "test.heic",
        "test.jp2",
        "test.cr2",
        "test.nef",
        "test.dcm",
        "test.fits",
        "test.nc",
        "test.h5"
    ]
    
    for filename in test_files:
        # Create a temporary file with the extension
        with tempfile.NamedTemporaryFile(suffix=f".{filename.split('.')[-1]}", delete=False) as temp_file:
            temp_path = Path(temp_file.name)
            temp_file.close()  # Close the file handle before trying to detect format
            
            format_type = format_processor.detect_format(temp_path)
            print(f"  {filename}: {format_type}")
            
            # Cleanup
            try:
                temp_path.unlink()
            except PermissionError:
                # On Windows, sometimes files are still locked
                pass

def test_library_availability():
    """Test availability of optional libraries."""
    print("\nTesting library availability...")
    
    # Test direct imports
    libraries = {
        "pillow_heif": "HEIC/HEIF support",
        "rawpy": "RAW camera file support",
        "pydicom": "DICOM medical image support", 
        "astropy": "FITS astronomy file support",
        "xarray": "NetCDF/HDF5 scientific data support",
        "netCDF4": "NetCDF file support",
        "h5py": "HDF5 file support"
    }
    
    for lib_name, description in libraries.items():
        try:
            __import__(lib_name)
            print(f"  ✓ {lib_name}: Available - {description}")
        except ImportError:
            print(f"  ✗ {lib_name}: Not available - {description}")

def test_standard_image_processing():
    """Test processing of standard image formats."""
    print("\nTesting standard image processing...")
    
    # Create a test PNG image
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp_file:
        temp_path = Path(temp_file.name)
        temp_file.close()  # Close file handle
        
        # Create a simple test image
        test_image = Image.new('RGB', (100, 100), color='red')
        test_image.save(temp_path)
        
        try:
            # Test format detection
            format_type = format_processor.detect_format(temp_path)
            print(f"  Format detected: {format_type}")
            
            # Test processing
            metadata = format_processor.process_format(temp_path, format_type)
            print(f"  Metadata: {metadata}")
            
            # Test conversion (should be no-op for standard formats)
            converted_path = format_processor.convert_to_web_format(temp_path, format_type)
            if converted_path:
                print(f"  Converted to: {converted_path}")
                try:
                    converted_path.unlink()  # Cleanup
                except PermissionError:
                    pass
            else:
                print(f"  No conversion needed for standard format")
                
        except Exception as e:
            print(f"  Error: {e}")
        finally:
            # Cleanup
            try:
                temp_path.unlink()
            except PermissionError:
                pass

def test_webp_processing():
    """Test WebP processing if supported."""
    print("\nTesting WebP processing...")
    
    try:
        # Create a test WebP image
        with tempfile.NamedTemporaryFile(suffix=".webp", delete=False) as temp_file:
            temp_path = Path(temp_file.name)
            temp_file.close()  # Close file handle
            
            # Create a simple test image and save as WebP
            test_image = Image.new('RGB', (100, 100), color='blue')
            test_image.save(temp_path, 'WEBP')
            
            # Test processing
            format_type = format_processor.detect_format(temp_path)
            print(f"  Format detected: {format_type}")
            
            metadata = format_processor.process_format(temp_path, format_type)
            print(f"  Metadata: {metadata}")
            
            # Cleanup
            try:
                temp_path.unlink()
            except PermissionError:
                pass
            
    except Exception as e:
        print(f"  WebP test failed: {e}")

def main():
    """Run all tests."""
    print("=== Enhanced Image Format Support Test ===\n")
    
    test_library_availability()
    test_format_detection()
    test_standard_image_processing()
    test_webp_processing()
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    main()
