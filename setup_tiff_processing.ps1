# Enhanced TIFF processing setup script for Windows
Write-Host "Setting up enhanced TIFF processing capabilities..." -ForegroundColor Green

# Navigate to the app directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptPath\app"

Write-Host "Installing Python dependencies..." -ForegroundColor Yellow

try {
    # Install rasterio first (it should handle GDAL dependency)
    Write-Host "Installing rasterio..." -ForegroundColor Cyan
    pip install rasterio>=1.3.0
    
    # Try to install GDAL
    Write-Host "Installing GDAL..." -ForegroundColor Cyan
    try {
        pip install GDAL>=3.4.0
    }
    catch {
        Write-Host "Direct GDAL installation failed, trying alternative..." -ForegroundColor Yellow
        # Try installing from pre-compiled wheels
        pip install --find-links https://girder.github.io/large_image_wheels GDAL
    }
    
    Write-Host "Installing remaining requirements..." -ForegroundColor Cyan
    pip install -r requirements.txt
    
    Write-Host "TIFF processing setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now upload and process TIFF/GeoTIFF files in your satellite annotation tool." -ForegroundColor White
    Write-Host "The system will automatically:" -ForegroundColor White
    Write-Host "  - Process TIFF files for compatibility" -ForegroundColor Gray
    Write-Host "  - Create web-compatible versions" -ForegroundColor Gray
    Write-Host "  - Handle multi-band satellite imagery" -ForegroundColor Gray
    Write-Host "  - Support GeoTIFF metadata" -ForegroundColor Gray
}
catch {
    Write-Host "Error during installation: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please try installing dependencies manually:" -ForegroundColor Yellow
    Write-Host "  pip install rasterio>=1.3.0" -ForegroundColor Gray
    Write-Host "  pip install GDAL>=3.4.0" -ForegroundColor Gray
    Write-Host "  pip install -r requirements.txt" -ForegroundColor Gray
}
