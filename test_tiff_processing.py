#!/usr/bin/env python3
"""
Test script for TIFF processing functionality
"""

import os
import sys
from pathlib import Path

# Add the app directory to the Python path
app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir))

try:
    from app.utils.tiff_processor import tiff_processor
    from app.utils.image_processing import validate_image_file
    from fastapi import UploadFile
    import tempfile
    from PIL import Image
    import numpy as np
    
    print("🧪 Testing TIFF Processing Functionality")
    print("=" * 50)
    
    # Test 1: Create a sample TIFF file
    print("1. Creating sample TIFF file...")
    
    # Create a simple RGB TIFF for testing
    sample_data = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    sample_image = Image.fromarray(sample_data)
    
    with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp_file:
        sample_tiff_path = tmp_file.name
        sample_image.save(sample_tiff_path, format='TIFF')
    
    print(f"✅ Created sample TIFF: {sample_tiff_path}")
    
    # Test 2: Test TIFF processor
    print("\n2. Testing TIFF processor...")
    
    try:
        info = tiff_processor.get_image_info(sample_tiff_path)
        print(f"✅ TIFF info: {info}")
        
        # Test preprocessing
        with tempfile.TemporaryDirectory() as tmp_dir:
            output_path = Path(tmp_dir) / "processed.png"
            result_path = tiff_processor.preprocess_tiff(
                sample_tiff_path, 
                output_path,
                target_bands=3,
                normalize=True
            )
            print(f"✅ Processed TIFF saved to: {result_path}")
            
            # Verify the processed file exists and is valid
            if os.path.exists(result_path):
                with Image.open(result_path) as img:
                    print(f"✅ Processed image size: {img.size}, mode: {img.mode}")
            else:
                print("❌ Processed file not found")
                
    except Exception as e:
        print(f"❌ TIFF processing failed: {e}")
    
    # Test 3: Test file validation
    print("\n3. Testing file validation...")
    
    class MockUploadFile:
        def __init__(self, filename, content_type):
            self.filename = filename
            self.content_type = content_type
    
    test_files = [
        ("test.tif", "image/tiff", True),
        ("test.tiff", "image/tiff", True), 
        ("test.jpg", "image/jpeg", True),
        ("test.png", "image/png", True),
        ("test.txt", "text/plain", False),
        ("geotiff.tif", "application/octet-stream", True),  # Some TIFF files
    ]
    
    for filename, content_type, expected in test_files:
        mock_file = MockUploadFile(filename, content_type)
        result = validate_image_file(mock_file)
        status = "✅" if result == expected else "❌"
        print(f"{status} {filename} ({content_type}): {result}")
    
    # Cleanup
    os.unlink(sample_tiff_path)
    
    print("\n🎉 TIFF Processing Tests Complete!")
    print("\nNext steps:")
    print("1. Run the setup script: ./setup_tiff_processing.sh (Linux/Mac) or .\\setup_tiff_processing.ps1 (Windows)")
    print("2. Start the backend server")
    print("3. Try uploading a TIFF file through the web interface")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("\nMissing dependencies. Please run:")
    print("pip install rasterio pillow numpy")
    sys.exit(1)
    
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)
