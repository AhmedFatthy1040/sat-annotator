import { useState, useRef, useEffect } from 'react';
import { api, SegmentationResponse } from '../services/api';
import type { Image } from '../services/api';

interface ImageViewerProps {
  imageId: string;  // Changed from number to string for UUID-based IDs
  onSegmentationChange: (segmentation: SegmentationResponse | null) => void;
  selectedObjectType: string;
  onExportRef?: (exportFn: () => Promise<void>) => void;
}

export const ImageViewer = ({ imageId, onSegmentationChange, selectedObjectType, onExportRef }: ImageViewerProps) => {
  const [image, setImage] = useState<Image | null>(null);
  const [segmentation, setSegmentation] = useState<SegmentationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasSegmented, setHasSegmented] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  // Register the export function with the parent component
  useEffect(() => {
    if (onExportRef) {
      const exportFn = async () => {
        try {
          // Log state at time of call
          console.log("Export function called from parent", {
            hasSegmentation: !!segmentation,
            hasObjectType: !!selectedObjectType,
            hasImage: !!image
          });
          
          await handleExportAnnotation();
          // Don't return a value to match Promise<void> type
        } catch (e) {
          console.error("Export failed:", e);
          // Don't return a value to match Promise<void> type
        }
      };
      
      onExportRef(exportFn);
    }
  }, [onExportRef, segmentation, selectedObjectType, image]);
  
  // Update parent component when segmentation changes
  useEffect(() => {
    onSegmentationChange(segmentation);
  }, [segmentation, onSegmentationChange]);
  
  // Load the image data
  useEffect(() => {
    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(null);
        const imageData = await api.getImage(imageId);
        setImage(imageData);
        // Reset segmentation state for new image
        setSegmentation(null);
        setHasSegmented(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    
    fetchImage();
  }, [imageId]);
  
  // Handle canvas click for segmentation
  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image) return;
  
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
  
    // Use the displayed (scaled) dimensions of the canvas
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
  
    // Calculate normalized coordinates (0 to 1) based on displayed size
    const x = (e.clientX - rect.left) / displayWidth;
    const y = (e.clientY - rect.top) / displayHeight;
  
    console.log(`Clicked at normalized: x=${x}, y=${y}, display size: ${displayWidth}x${displayHeight}`);
  
    try {
      setLoading(true);
      setError(null);
      setStatusMessage(hasSegmented ? 
        'Getting segmentation from cache...' : 
        'Processing image (first click takes longer)...'
      );
  
      const segResponse = await api.segmentFromPoint({
        image_id: imageId,
        x,
        y
      });
  
      setSegmentation(segResponse);
  
      if (segResponse.cached) {
        setStatusMessage('Retrieved segmentation from cache');
      } else {
        setStatusMessage('Image segmented successfully');
        setHasSegmented(true);
      }
  
      setTimeout(() => {
        setStatusMessage(null);
      }, 3000);
  
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };
  
  // Get fill color based on selected object type
  const getPolygonFillStyle = () => {
    switch (selectedObjectType) {
      case 'building': return 'rgba(255, 0, 0, 0.3)'; // Red
      case 'road': return 'rgba(0, 0, 255, 0.3)';     // Blue
      case 'water': return 'rgba(0, 255, 255, 0.3)';  // Cyan
      case 'vegetation': return 'rgba(0, 255, 0, 0.3)'; // Green
      case 'field': return 'rgba(255, 255, 0, 0.3)';  // Yellow
      case 'industrial': return 'rgba(128, 0, 128, 0.3)'; // Purple
      default:
        if (selectedObjectType.startsWith('custom:')) {
          return 'rgba(255, 165, 0, 0.3)'; // Orange for custom types
        }
        return 'rgba(255, 0, 0, 0.2)'; // Default red
    }
  };
  
  // Draw the image and segmentation on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !image) return;
    
    // Create a new image element
    const img = new Image();
    imageRef.current = img;
    
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set canvas dimensions to match image
      if (img.width > 0 && img.height > 0) {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      
      // Draw the image
      ctx.drawImage(img, 0, 0);
      
      // Draw segmentation polygon if available
      if (segmentation && segmentation.polygon.length > 0) {
        ctx.beginPath();
        const start = segmentation.polygon[0];
        ctx.moveTo(start[0], start[1]);
        
        for (let i = 1; i < segmentation.polygon.length; i++) {
          const point = segmentation.polygon[i];
          ctx.lineTo(point[0], point[1]);
        }
        
        ctx.closePath();
        ctx.strokeStyle = selectedObjectType ? '#000000' : 'red';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Fill with color based on object type
        ctx.fillStyle = getPolygonFillStyle();
        ctx.fill();
      }
    };
    
    // Extract filename from file_path - handle both absolute and relative paths
    const filename = image.file_path.split('/').pop();
    // Use relative URL instead of hardcoded localhost
    img.src = `/api/uploads/${filename}`;
    img.crossOrigin = "Anonymous"; // Needed for CORS if your API is on a different domain
    
    img.onerror = () => {
      setError("Failed to load image. Make sure the backend is running and serving images correctly.");
      console.error("Image failed to load:", img.src);
    };
    
  }, [image, segmentation, selectedObjectType]);
  // Handle export of annotation
  const handleExportAnnotation = async () => {
    console.log("Export triggered in ImageViewer", { 
      hasSegmentation: !!segmentation, 
      selectedObjectType, 
      hasImage: !!image,
      segmentationDetails: segmentation ? {
        annotation_id: segmentation.annotation_id,
        hasPolygon: !!segmentation.polygon,
        polygonPoints: segmentation?.polygon?.length || 0
      } : null
    });
    
    // More comprehensive checks with detailed error messages
    if (!segmentation) {
      console.error("Export failed: Segmentation is null or undefined");
      setStatusMessage("Cannot export: No segmentation data available");
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }
    
    if (!segmentation.polygon || segmentation.polygon.length === 0) {
      console.error("Export failed: Invalid polygon in segmentation", segmentation);
      setStatusMessage("Cannot export: Invalid segmentation polygon");
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }
    
    if (!selectedObjectType) {
      console.error("Export failed: No object type selected");
      setStatusMessage("Cannot export: Please select an object type");
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }
    
    if (!image) {
      console.error("Export failed: Image data is missing");
      setStatusMessage("Cannot export: Image data is missing");
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }
    
    console.log("All export preconditions passed, proceeding with export");
    setLoading(true);
    setStatusMessage("Exporting annotation...");
      try {
      // Create the export filename - sanitize any special characters
      const safeObjectType = selectedObjectType.replace(/[^\w-]/g, '_');
      const exportFilename = `annotation_${imageId}_${safeObjectType}.json`;
          // Create the JSON data structure (instead of GeoJSON)
      const jsonData = {
        metadata: {
          imageId: imageId,
          objectType: selectedObjectType,
          annotationId: segmentation.annotation_id || "new",
          exportedAt: new Date().toISOString(),
          serverPath: null as string | null
        },
        annotation: {
          polygon: segmentation.polygon,
          pointCount: segmentation.polygon.length
        },
        image: {
          fileName: image.file_name,
          resolution: image.resolution || null,
          source: image.source || "user_upload",
          captureDate: image.capture_date,
          dimensions: canvasRef.current ? {
            width: canvasRef.current.width, 
            height: canvasRef.current.height
          } : null
        }
      };
      
      try {
        // First try to save to the server
        const response = await api.saveAnnotationWithType({
          image_id: imageId,
          annotation_id: segmentation.annotation_id || '',
          object_type: selectedObjectType,
          polygon: segmentation.polygon,
          custom_properties: {
            exportedAt: new Date().toISOString(),
            resolution: image.resolution
          }
        });
          // Update the JSON with server data if successful
        if (response && response.annotation_id) {
          jsonData.metadata.annotationId = response.annotation_id;
          jsonData.metadata.serverPath = response.file_path || null;
          setStatusMessage("Saved to server and downloading...");
        }
      } catch (apiError) {
        console.error("API save error:", apiError);
        setStatusMessage("Server save failed, creating local file only");
      }
        // Always create a local download regardless of API success
      // Use Blob for better browser compatibility
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a hidden download link
      const downloadLink = document.createElement('a');
      downloadLink.style.display = 'none';
      downloadLink.href = url;
      downloadLink.download = exportFilename;
      
      // Trigger download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        setStatusMessage("Export completed successfully");
        setTimeout(() => setStatusMessage(null), 2000);
      }, 100);
      
    } catch (err) {
      console.error("Export error:", err);
      setStatusMessage(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !image) return <div className="text-center p-4">Loading image...</div>;
  
  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        Error: {error}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative border border-gray-300 rounded image-container">
        <canvas 
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="cursor-crosshair annotation-canvas"
          style={{ maxWidth: '100%', minHeight: '400px' }}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <div className="text-white">{hasSegmented ? 'Processing...' : 'Segmenting image (first click may take longer)...'}</div>
          </div>
        )}
      </div>
      
      {statusMessage && (
        <div className={`text-sm ${segmentation?.cached ? 'text-green-600' : 'text-blue-600'} font-medium`}>
          {statusMessage}
        </div>
      )}
      
      <div className="text-sm text-gray-600">
        Click anywhere on the image to generate segmentation
        {hasSegmented && (
          <span className="ml-1 text-green-600">(subsequent clicks will use cached results)</span>
        )}
      </div>
      
      {segmentation && (
        <div className="bg-gray-100 p-4 rounded w-full max-w-xl">
          <h3 className="font-bold mb-2">Segmentation Results:</h3>
          <div className="text-sm">
            <p>Annotation ID: {segmentation.annotation_id}</p>
            <p>Polygon points: {segmentation.polygon.length}</p>
            {segmentation.cached && (
              <p className="text-green-600 font-medium">Result retrieved from cache</p>
            )}
            {selectedObjectType && (
              <p className="text-blue-600">
                Object type: {selectedObjectType.startsWith('custom:') ? 
                  selectedObjectType.substring(7) : selectedObjectType}
              </p>
            )}
          </div>
          
          {selectedObjectType && (
            <button
              onClick={handleExportAnnotation}
              className="mt-3 bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded text-sm"
            >
              Export Annotation
            </button>
          )}
        </div>
      )}
    </div>
  );
};
