# Enhanced Image Format Support

## Overview
The satellite annotation project now supports a wide variety of image formats beyond the basic JPEG, PNG, and TIFF support. This includes scientific, medical, astronomical, and camera RAW formats.

## Supported Formats

### Standard Image Formats
- **JPEG/JPG** - Standard web format
- **PNG** - Lossless compression with transparency
- **TIFF/TIF** - High-quality, multi-page support
- **WebP** - Modern web format with better compression
- **HEIC/HEIF** - Apple's high-efficiency format

### Advanced Image Formats
- **JPEG2000 (.jp2, .j2k)** - Advanced compression standard
- **Camera RAW** - Direct from camera sensor data
  - Canon: CR2
  - Nikon: NEF
  - Sony: ARW
  - Adobe: DNG

### Scientific & Specialized Formats
- **NetCDF (.nc)** - Network Common Data Form for scientific data
- **HDF5 (.h5, .hdf)** - Hierarchical Data Format for large datasets
- **FITS (.fits, .fit)** - Flexible Image Transport System for astronomy
- **DICOM (.dcm)** - Digital Imaging and Communications in Medicine

## How It Works

### 1. Format Detection
The system automatically detects the file format based on:
- File extension
- MIME type
- File header analysis (where applicable)

### 2. Metadata Extraction
Each format processor extracts relevant metadata:
- **TIFF**: Geospatial coordinates, CRS, band information
- **RAW**: Camera settings, white balance, color matrix
- **DICOM**: Patient info, study details, image parameters
- **FITS**: Telescope data, observation details, instrument info
- **NetCDF/HDF5**: Variables, dimensions, scientific metadata

### 3. Web Conversion
Specialized formats are automatically converted to web-compatible versions:
- PNG format for lossless quality
- Proper scaling and normalization
- Maintains aspect ratio
- Optimized for annotation tools

## Usage Examples

### Upload via Web Interface
1. Navigate to the web interface
2. Click "Upload Image" 
3. Select or drag any supported format
4. The system will automatically:
   - Validate the format
   - Extract metadata
   - Convert to web format if needed
   - Make available for annotation

### Supported Use Cases

#### Satellite & Geospatial Data
- GeoTIFF files with coordinate systems
- Multi-band satellite imagery
- NetCDF climate data
- HDF5 remote sensing data

#### Medical Imaging
- DICOM medical scans
- Multi-dimensional medical data
- Patient metadata preservation

#### Astronomy
- FITS telescope images
- Multi-wavelength observations
- Instrument calibration data

#### Photography
- RAW camera files from various manufacturers
- Professional photography workflows
- HEIC mobile photography

## Dependencies

The enhanced format support requires additional Python libraries:

```bash
# Basic requirements (already installed)
rasterio>=1.3.0
pillow

# Enhanced format support
pillow-heif>=0.12.0  # HEIC/HEIF
rawpy>=0.17.0        # RAW camera files
pydicom>=2.4.0       # DICOM medical
astropy>=5.0.0       # FITS astronomy
xarray>=2023.0.0     # NetCDF scientific
netcdf4>=1.6.0       # NetCDF backend
h5py>=3.12.1         # HDF5 support
```

## Architecture

### Format Processor (`format_processor.py`)
- Modular design with format-specific processors
- Graceful degradation when libraries aren't available
- Comprehensive metadata extraction
- Web-compatible conversion pipeline

### Integration Points
- **Upload validation** - Extended MIME type and extension checking
- **Image processing** - Automatic format detection and conversion
- **SAM model** - Enhanced image loading with fallback methods
- **Frontend** - Updated file type validation and user messaging

## Error Handling

The system provides robust error handling:
- Missing library detection with helpful error messages
- Fallback to standard processing when specialized processing fails
- Detailed logging for debugging
- User-friendly error messages in the web interface

## Performance Considerations

- Large scientific files are processed efficiently
- Memory usage optimized for multi-dimensional data
- Conversion processes are cached when possible
- Background processing for time-intensive operations

## Future Enhancements

Potential additions for future versions:
- **Video formats** - MP4, AVI for temporal analysis
- **Point clouds** - LAS, PLY for 3D data
- **Vector formats** - Shapefile, GeoJSON overlay support
- **Real-time processing** - Streaming data support
- **Cloud integration** - Direct cloud storage access

## Testing

The format support has been tested with:
- Various real-world file examples
- Edge cases and corrupted files
- Performance benchmarks
- Cross-platform compatibility

Run the test suite:
```bash
python test_format_support.py
```

## Troubleshooting

### Common Issues

1. **Missing Dependencies**
   - Error: "Format support requires [library] library"
   - Solution: Install the specific library with pip

2. **Large File Processing**
   - Error: Memory issues with large files
   - Solution: Implement chunked processing or increase system memory

3. **Corrupted Files**
   - Error: Format-specific processing errors
   - Solution: System falls back to standard processing

### Getting Help

- Check the error logs in `app/logs/`
- Review the format-specific documentation
- Test with known-good sample files
- Contact the development team with specific error messages
