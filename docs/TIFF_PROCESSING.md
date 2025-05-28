# TIFF Image Processing Enhancement

This enhancement adds comprehensive TIFF and GeoTIFF image processing capabilities to the Satellite Image Annotation Tool.

## Features

### 🚀 Enhanced TIFF Support
- **Multi-format TIFF handling**: Standard TIFF, GeoTIFF, multi-band satellite imagery
- **Automatic preprocessing**: Converts complex TIFF files to annotation-friendly formats
- **Web compatibility**: Creates optimized versions for frontend display
- **Metadata preservation**: Retains important geospatial information

### 🔧 Processing Pipeline
1. **Upload**: Original TIFF file is saved
2. **Analysis**: Automatic detection of format, bands, and metadata
3. **Processing**: Creates processed version for annotation workflow
4. **Web Version**: Generates optimized PNG for frontend display
5. **Annotation**: Uses processed version for SAM model compatibility

## Installation

### Option 1: Automatic Setup (Recommended)

**Windows (PowerShell):**
```powershell
.\setup_tiff_processing.ps1
```

**Linux/macOS (Bash):**
```bash
chmod +x setup_tiff_processing.sh
./setup_tiff_processing.sh
```

### Option 2: Manual Installation

1. **Install GDAL** (required for rasterio):
   
   **Windows:**
   ```bash
   pip install --find-links https://girder.github.io/large_image_wheels GDAL
   ```
   
   **Linux:**
   ```bash
   sudo apt-get update
   sudo apt-get install gdal-bin libgdal-dev
   pip install GDAL>=3.4.0
   ```
   
   **macOS:**
   ```bash
   brew install gdal
   pip install GDAL>=3.4.0
   ```

2. **Install Python dependencies:**
   ```bash
   pip install rasterio>=1.3.0
   pip install -r requirements.txt
   ```

## Usage

### Uploading TIFF Files

1. **Supported Formats:**
   - `.tif`, `.tiff` - Standard TIFF files
   - GeoTIFF files with spatial reference
   - Multi-band satellite imagery
   - Single-band grayscale images

2. **Upload Process:**
   - Use the standard upload interface
   - Select or drag-and-drop TIFF files
   - System automatically detects and processes TIFF files
   - Processing status is logged in backend

3. **File Size Limits:**
   - Maximum file size: 100MB
   - Large files are automatically resized for web compatibility
   - Original resolution maintained for annotation workflow

### Automatic Processing

The system automatically:

- **Detects TIFF format** and metadata
- **Normalizes pixel values** for consistent display
- **Handles multi-band data** (converts to RGB or grayscale)
- **Creates web-compatible versions** (PNG format, max 2048px)
- **Maintains annotation quality** (processed version up to 4096px)

### File Structure

```
uploads/
├── original_file.tif              # Original TIFF file
└── processed/
    ├── processed_uuid.png         # For annotation workflow
    └── web_uuid.png              # For frontend display
```

## Technical Details

### TIFF Processing Class (`TIFFProcessor`)

**Key Methods:**
- `get_image_info()`: Analyzes TIFF metadata
- `preprocess_tiff()`: Main processing pipeline
- `create_web_compatible_version()`: Frontend optimization

**Processing Features:**
- **Band handling**: Automatic RGB/grayscale conversion
- **Normalization**: Pixel value scaling to 0-255 range
- **Resizing**: Maintains aspect ratio with size limits
- **Transparency**: Proper RGBA to RGB conversion

### SAM Model Integration

Enhanced `SAMSegmenter` with:
- **Fallback loading**: Multiple methods for image loading
- **Format detection**: Automatic TIFF preprocessing detection
- **Error handling**: Graceful fallback to processed versions

### Backend Updates

**Enhanced Routes:**
- Updated upload handlers for TIFF preprocessing
- Processed file serving at `/uploads/processed/`
- Metadata storage for TIFF information

**Error Handling:**
- Graceful fallback if TIFF processing fails
- Detailed logging for troubleshooting
- Multiple image loading strategies

## Troubleshooting

### Common Issues

1. **GDAL Installation Errors:**
   ```bash
   # Try installing from conda-forge
   conda install -c conda-forge gdal
   
   # Or use pre-compiled wheels
   pip install --find-links https://girder.github.io/large_image_wheels GDAL
   ```

2. **Import Errors:**
   ```python
   # Check if rasterio is properly installed
   python -c "import rasterio; print('OK')"
   ```

3. **File Not Found Errors:**
   - Check that processed directory exists: `uploads/processed/`
   - Verify file permissions
   - Check backend logs for processing errors

### Debug Mode

Enable detailed logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Supported TIFF Types

✅ **Supported:**
- Standard TIFF (1, 3, 4 bands)
- GeoTIFF with spatial reference
- Multi-band satellite imagery
- Compressed TIFF files

❌ **Limitations:**
- Very large files (>100MB) may be slow
- Some exotic TIFF variants might need manual conversion
- Extremely high bit-depth images are normalized

## API Changes

### Upload Response (Enhanced)

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "image": {
    "image_id": "uuid",
    "file_name": "satellite.tif",
    "file_path": "uploads/processed/processed_uuid.png",
    "resolution": "2048x2048",
    "is_tiff": true,
    "tiff_info": {
      "format": "geotiff",
      "bands": 3,
      "crs": "EPSG:4326"
    }
  }
}
```

### Session Storage (Enhanced)

Images now include:
- `metadata.is_tiff`: Boolean flag
- `metadata.original_path`: Path to original TIFF
- `metadata.web_path`: Path to web version
- `metadata.tiff_info`: Technical details

## Performance Notes

- **First upload**: Slower due to processing
- **Subsequent uploads**: Faster with optimized pipeline
- **Memory usage**: Temporary increase during processing
- **Storage**: ~2-3x original file size (original + processed + web versions)

## Future Enhancements

- [ ] Batch TIFF processing
- [ ] Custom band combinations
- [ ] Geospatial coordinate overlay
- [ ] Progressive loading for large files
- [ ] Cloud-optimized GeoTIFF (COG) support
