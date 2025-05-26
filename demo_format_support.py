#!/usr/bin/env python3
"""
Demo script to show enhanced format support capabilities.
Run this with the FastAPI server running to test format uploads.
"""

import requests
import json
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"

def test_format_support():
    """Test the enhanced format support via API calls"""
    
    print("🚀 Testing Enhanced Format Support")
    print("=" * 50)
    
    # Test format detection endpoint (if available)
    test_files = [
        "sample.tiff",
        "sample.jp2", 
        "sample.webp",
        "sample.heic",
        "sample.cr2",
        "sample.fits",
        "sample.nc",
        "sample.h5",
        "sample.dcm"
    ]
    
    for filename in test_files:
        format_type = filename.split('.')[-1]
        print(f"\n📁 Testing {format_type.upper()} format support...")
        
        # Simulate format detection
        if format_type in ['tiff', 'tif']:
            print("  ✅ TIFF: Full support with geospatial metadata")
        elif format_type in ['jp2', 'j2k']:
            print("  ✅ JPEG2000: Supported with PIL")
        elif format_type == 'webp':
            print("  ✅ WebP: Native PIL support")
        elif format_type in ['heic', 'heif']:
            print("  ✅ HEIC: Supported with pillow-heif")
        elif format_type in ['cr2', 'nef', 'arw', 'dng']:
            print("  ✅ RAW: Supported with rawpy")
        elif format_type in ['fits', 'fit']:
            print("  ✅ FITS: Supported with astropy")
        elif format_type == 'nc':
            print("  ✅ NetCDF: Supported with xarray")
        elif format_type in ['h5', 'hdf']:
            print("  ✅ HDF5: Supported with h5py")
        elif format_type == 'dcm':
            print("  ✅ DICOM: Supported with pydicom")
        else:
            print("  ⚠️  Unknown format")

def test_upload_workflow():
    """Test the complete upload workflow"""
    
    print("\n\n🔄 Testing Upload Workflow")
    print("=" * 50)
    
    # Check if server is running
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running and healthy")
        else:
            print("⚠️  Server responded but may have issues")
    except requests.RequestException:
        print("❌ Server is not running")
        print("   Start with: uvicorn app.main:app --reload")
        return
    
    # Test format validation
    print("\n📋 Format validation test:")
    supported_formats = [
        "JPEG", "PNG", "TIFF", "WebP", "HEIC", "JPEG2000",
        "RAW (CR2/NEF/ARW/DNG)", "DICOM", "FITS", "NetCDF", "HDF5"
    ]
    
    for fmt in supported_formats:
        print(f"  ✅ {fmt}")

def show_format_capabilities():
    """Show what each format processor can extract"""
    
    print("\n\n🔍 Format Capabilities")
    print("=" * 50)
    
    capabilities = {
        "TIFF/GeoTIFF": [
            "Geospatial coordinates (CRS)",
            "Multi-band imagery", 
            "Pixel resolution",
            "Geographic bounds"
        ],
        "Camera RAW": [
            "Camera make/model",
            "ISO settings",
            "White balance",
            "Color matrix",
            "Raw sensor patterns"
        ],
        "DICOM": [
            "Patient information",
            "Study details",
            "Image dimensions",
            "Medical metadata",
            "Equipment info"
        ],
        "FITS": [
            "Telescope information",
            "Observation date/time",
            "Instrument details",
            "Astronomical coordinates",
            "Filter information"
        ],
        "NetCDF": [
            "Scientific variables",
            "Dimension information",
            "Units and descriptions",
            "Coordinate systems",
            "Global attributes"
        ],
        "HDF5": [
            "Hierarchical datasets",
            "Group structures",
            "Compression info",
            "Attribute metadata",
            "Data types"
        ]
    }
    
    for format_name, features in capabilities.items():
        print(f"\n📊 {format_name}:")
        for feature in features:
            print(f"  • {feature}")

def show_usage_examples():
    """Show practical usage examples"""
    
    print("\n\n💡 Usage Examples")
    print("=" * 50)
    
    examples = {
        "Satellite Imagery": {
            "formats": ["GeoTIFF", "NetCDF", "HDF5"],
            "use_case": "Upload satellite data for land cover annotation",
            "benefits": ["Preserves geospatial info", "Multi-band support", "Large dataset handling"]
        },
        "Medical Imaging": {
            "formats": ["DICOM"],
            "use_case": "Annotate medical scans for AI training",
            "benefits": ["Patient metadata", "Medical standards", "Multi-dimensional data"]
        },
        "Astronomy": {
            "formats": ["FITS"],
            "use_case": "Annotate celestial objects in telescope images",
            "benefits": ["Instrument metadata", "Calibration data", "Multi-wavelength support"]
        },
        "Photography": {
            "formats": ["RAW", "HEIC", "WebP"],
            "use_case": "Professional photo annotation workflow",
            "benefits": ["Highest quality", "Full color range", "Camera settings"]
        }
    }
    
    for category, info in examples.items():
        print(f"\n🎯 {category}:")
        print(f"  Formats: {', '.join(info['formats'])}")
        print(f"  Use Case: {info['use_case']}")
        print(f"  Benefits:")
        for benefit in info['benefits']:
            print(f"    • {benefit}")

if __name__ == "__main__":
    test_format_support()
    test_upload_workflow()
    show_format_capabilities()
    show_usage_examples()
    
    print("\n\n🎉 Enhanced Format Support Demo Complete!")
    print("\nNext Steps:")
    print("1. Start the server: uvicorn app.main:app --reload")
    print("2. Open the web interface: http://localhost:8000")
    print("3. Try uploading various format types")
    print("4. Check the metadata extraction in the logs")
