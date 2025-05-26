#!/bin/bash

# Enhanced TIFF processing setup script
echo "Setting up enhanced TIFF processing capabilities..."

# Navigate to the app directory
cd "$(dirname "$0")/app"

echo "Installing Python dependencies..."

# Install rasterio and GDAL for TIFF processing
pip install rasterio>=1.3.0

# GDAL might need special handling on different systems
if command -v conda &> /dev/null; then
    echo "Conda detected, using conda-forge for GDAL..."
    conda install -c conda-forge gdal>=3.4.0
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Linux system detected, installing GDAL..."
    sudo apt-get update
    sudo apt-get install -y gdal-bin libgdal-dev
    pip install GDAL>=3.4.0
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macOS detected, using Homebrew for GDAL..."
    brew install gdal
    pip install GDAL>=3.4.0
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "Windows detected, installing GDAL from wheel..."
    pip install --find-links https://girder.github.io/large_image_wheels GDAL
else
    echo "Unknown OS, trying direct pip install..."
    pip install GDAL>=3.4.0
fi

echo "Installing remaining requirements..."
pip install -r requirements.txt

echo "TIFF processing setup complete!"
echo ""
echo "You can now upload and process TIFF/GeoTIFF files in your satellite annotation tool."
echo "The system will automatically:"
echo "  - Process TIFF files for compatibility"
echo "  - Create web-compatible versions"
echo "  - Handle multi-band satellite imagery"
echo "  - Support GeoTIFF metadata"
