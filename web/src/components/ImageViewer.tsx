import { useState, useRef, useEffect } from 'react';
import { api, SegmentationResponse } from '../services/api';
import type { Image } from '../services/api';

// Define point type for clarity
type Point = [number, number];

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
  const [error, setError] = useState<string | null>(null);  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasSegmented, setHasSegmented] = useState(false);
  
  // Manual annotation states
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualPoints, setManualPoints] = useState<Point[]>([]);
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [isPolygonClosed, setIsPolygonClosed] = useState(false);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [hoveredClosePoint, setHoveredClosePoint] = useState(false);
  
  // Polygon simplification settings
  const [simplifyPolygon, setSimplifyPolygon] = useState(true);
  const [targetPoints, setTargetPoints] = useState(20);
  const [isEditingMode, setIsEditingMode] = useState(false); // Add an editing mode flag
  
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
    const normalizedX = (e.clientX - rect.left) / displayWidth;
    const normalizedY = (e.clientY - rect.top) / displayHeight;
    
    // Calculate actual coordinates in the canvas
    const x = normalizedX * canvas.width;
    const y = normalizedY * canvas.height;
    
    console.log(`Clicked at normalized: x=${normalizedX}, y=${normalizedY}, display size: ${displayWidth}x${displayHeight}`);
    console.log(`Clicked at canvas coordinates: x=${x}, y=${y}, canvas size: ${canvas.width}x${canvas.height}`);
    
    if (isManualMode) {
      handleManualAnnotationClick(x, y);
    } else {
      await handleAISegmentationClick(normalizedX, normalizedY);
    }
  };
  
  // Handle AI-powered segmentation click
  const handleAISegmentationClick = async (x: number, y: number) => {
    try {
      setLoading(true);
      setError(null);
      setStatusMessage(hasSegmented ? 
        'Getting segmentation from cache...' : 
        'Processing image (first click takes longer)...'
      );      const segResponse = await api.segmentFromPoint({
        image_id: imageId,
        x,
        y,
        simplify: simplifyPolygon,
        target_points: targetPoints
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
    // Handle click for manual annotation
  const handleManualAnnotationClick = (x: number, y: number) => {
    // Convert coordinates to integers for cleaner display
    const point: Point = [Math.round(x), Math.round(y)];
    
    if (isPolygonClosed) {
      // If polygon is closed, clicking starts a new polygon
      setManualPoints([point]);
      setIsPolygonClosed(false);
      // Reset editing mode when starting a new polygon
      if (isEditingMode) {
        setIsEditingMode(false);
        console.log("Exiting editing mode due to new polygon creation");
      }
      return;
    }
    
    // Check if clicking near the first point to close the polygon
    if (manualPoints.length > 2) {
      const firstPoint = manualPoints[0];
      const distance = Math.sqrt(
        Math.pow(firstPoint[0] - point[0], 2) + 
        Math.pow(firstPoint[1] - point[1], 2)
      );
      
      // If clicking close to the first point, close the polygon
      if (distance < 20) { // 20px threshold
        setIsPolygonClosed(true);
        createSegmentationFromManualPoints();
        return;
      }
    }
    
    // Otherwise add a new point
    setManualPoints([...manualPoints, point]);
  };  // Convert manual points to segmentation format
  const createSegmentationFromManualPoints = () => {
    if (manualPoints.length < 3) {
      setStatusMessage("Need at least 3 points to create a polygon");
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }
    
    // Create a deep copy of manual points to prevent reference issues
    const pointsCopy = manualPoints.map(point => [...point] as Point);
    
    // Determine if this was an AI-generated annotation that's being modified
    const isModifyingAI = segmentation?.annotation_id && 
      !segmentation.annotation_id.startsWith('manual-') &&
      !segmentation.annotation_id.includes('-modified');
    
    // Check if we're continuing to modify an already modified AI annotation
    const isUpdatingModifiedAI = segmentation?.annotation_id?.includes('-modified');
    
    // Preserve the original annotation ID for reference, but mark as modified
    let annotationId;
    
    if (isModifyingAI) {
      // First time modifying an AI annotation
      annotationId = `${segmentation!.annotation_id}-modified`;
    } else if (isUpdatingModifiedAI) {
      // Already a modified annotation, keep the same ID
      annotationId = segmentation!.annotation_id;
    } else if (segmentation?.annotation_id?.startsWith('manual-')) {
      // Already a manual annotation, keep the same ID
      annotationId = segmentation.annotation_id;
    } else {
      // Brand new manual annotation
      annotationId = `manual-${Date.now()}`;
    }
    
    const newSegmentation: SegmentationResponse = {
      success: true,
      polygon: pointsCopy,
      annotation_id: annotationId,
      cached: false // This isn't from cache since it's manually created/edited
    };
    
    console.log("Creating segmentation from manual points", {
      pointCount: pointsCopy.length,
      annotationId,
      isModifyingAI,
      isUpdatingModifiedAI
    });
      setSegmentation(newSegmentation);
    
    // If we're creating a segmentation from manual points, we can exit editing mode
    // since we've now saved the state in the segmentation
    if (isEditingMode) {
      setIsEditingMode(false);
      console.log("Exiting editing mode after segmentation creation");
    }
    
    const message = isModifyingAI
      ? "AI segmentation modified successfully"
      : isUpdatingModifiedAI
        ? "Modified annotation updated"
        : "Manual polygon created successfully";
      
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), 3000);
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
        drawPolygon(ctx, segmentation.polygon, selectedObjectType);
      }
      
      // Draw manual annotation in progress (if in manual mode)
      if (isManualMode && manualPoints.length > 0) {
        drawManualPolygon(ctx);
      }
    };
      // Extract filename from file_path - handle both absolute and relative paths
    const filename = image.file_path.split('/').pop();
      // Determine the correct image URL - use processed version if available
    let imageUrl = `/uploads/${filename}`;
    
    // Check if this is a processed TIFF file path
    if (image.file_path.includes('processed/')) {
      imageUrl = `/${image.file_path}`;
    }
    
    // Use relative URL instead of hardcoded localhost
    img.src = imageUrl;
    img.crossOrigin = "Anonymous"; // Needed for CORS if your API is on a different domain
    
    img.onerror = () => {
      setError("Failed to load image. Make sure the backend is running and serving images correctly.");      console.error("Image failed to load:", img.src);
    };
    
  }, [image, segmentation, selectedObjectType, isManualMode, manualPoints, hoveredPointIndex, hoveredClosePoint, isPolygonClosed, isEditingMode]);
    // Keep manual points in sync with segmentation when in manual mode
  useEffect(() => {
    // Only update manual points when in manual mode and segmentation changes
    // Skip synchronization during active editing or when in edit mode
    if (isManualMode && segmentation && !isDraggingPoint && !isEditingMode) {
      // Track if this is triggered by segmentation update for logging purposes
      console.log("Sync effect triggered by segmentation change", {
        segmentationId: segmentation.annotation_id,
        pointCount: segmentation.polygon?.length || 0,
        manualPointCount: manualPoints.length,
        editingMode: isEditingMode
      });
      
      // Skip synchronization if we already have points and they match the segmentation count
      // This prevents losing points while editing
      if (manualPoints.length > 0 && 
          segmentation.polygon?.length === manualPoints.length &&
          isPolygonClosed) {
        console.log("Skipping sync - manual points already match segmentation");
        return;
      }
      
      const validPoints: Point[] = [];
      segmentation.polygon.forEach(point => {
        if (Array.isArray(point) && point.length >= 2) {
          validPoints.push([point[0], point[1]]);
        }
      });
      
      if (validPoints.length > 0) {
        console.log("Updating manual points from segmentation", { 
          validPointCount: validPoints.length 
        });
        setManualPoints(validPoints);
        if (validPoints.length >= 3) setIsPolygonClosed(true);      }
    }
  }, [segmentation?.annotation_id, segmentation?.polygon.length, isManualMode, isDraggingPoint, isEditingMode]);
  
  // Draw the final polygon
  const drawPolygon = (ctx: CanvasRenderingContext2D, polygon: number[][], objectType: string) => {
    if (!polygon.length) return;
    
    ctx.beginPath();
    const start = polygon[0];
    ctx.moveTo(start[0], start[1]);
    
    for (let i = 1; i < polygon.length; i++) {
      const point = polygon[i];
      ctx.lineTo(point[0], point[1]);
    }
    
    ctx.closePath();
    ctx.strokeStyle = objectType ? '#000000' : 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Fill with color based on object type
    ctx.fillStyle = getPolygonFillStyle();
    ctx.fill();
  };
  
  // Draw the manual annotation in progress
  const drawManualPolygon = (ctx: CanvasRenderingContext2D) => {
    if (!manualPoints.length) return;
    
    // Draw the lines connecting points
    ctx.beginPath();
    ctx.moveTo(manualPoints[0][0], manualPoints[0][1]);
    
    for (let i = 1; i < manualPoints.length; i++) {
      ctx.lineTo(manualPoints[i][0], manualPoints[i][1]);
    }
    
    // If polygon is closed, connect back to start
    if (isPolygonClosed && manualPoints.length > 2) {
      ctx.closePath();
    } else if (manualPoints.length > 1) {
      // Draw line to mouse position for visual feedback (future enhancement)
    }
    
    ctx.strokeStyle = '#0066cc';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Only fill if polygon is closed
    if (isPolygonClosed) {
      ctx.fillStyle = getPolygonFillStyle();
      ctx.fill();
    }
    
    // Draw points
    for (let i = 0; i < manualPoints.length; i++) {
      const point = manualPoints[i];
      
      // Determine point style
      let pointRadius = 4;
      let pointFillColor = '#ffffff';
      let pointStrokeColor = '#0066cc';
      
      // Special styling for hovered/selected point
      if (i === hoveredPointIndex || i === selectedPointIndex) {
        pointRadius = 6;
        pointFillColor = '#ffcc00';
      }
      
      // Special styling for first point when near completion
      if (i === 0 && (hoveredClosePoint || isPolygonClosed)) {
        pointRadius = 6;
        pointFillColor = isPolygonClosed ? '#00cc66' : '#ffcc00';
        pointStrokeColor = isPolygonClosed ? '#009933' : '#cc9900';
      }
      
      // Draw point
      ctx.beginPath();
      ctx.arc(point[0], point[1], pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = pointFillColor;
      ctx.fill();
      ctx.strokeStyle = pointStrokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Optionally add point number for debugging
      // ctx.fillStyle = '#000';
      // ctx.font = '10px Arial';
      // ctx.fillText(i.toString(), point[0] + 8, point[1] - 8);
    }
  };
    // Handle export of annotation
  const handleExportAnnotation = async () => {
    console.log("Export triggered in ImageViewer", { 
      hasSegmentation: !!segmentation, 
      selectedObjectType, 
      hasImage: !!image,
      isManualMode,
      manualPointsCount: manualPoints.length,
      isPolygonClosed,
      segmentationDetails: segmentation ? {
        annotation_id: segmentation.annotation_id,
        hasPolygon: !!segmentation.polygon,
        polygonPoints: segmentation?.polygon?.length || 0
      } : null
    });
    
    // Check if we have a manual annotation to export
    if (isManualMode && manualPoints.length >= 3) {
      // Ensure polygon is closed and segmentation is created
      if (!isPolygonClosed) {
        setIsPolygonClosed(true);
        createSegmentationFromManualPoints();
        // Need to wait for state update before continuing
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // More comprehensive checks with detailed error messages
    if (!segmentation && (!isManualMode || manualPoints.length < 3)) {
      console.error("Export failed: No valid segmentation or manual annotation");
      setStatusMessage("Cannot export: No valid annotation available");
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }
    
    // If manual mode with valid polygon but no segmentation yet, create it
    if (isManualMode && !segmentation && manualPoints.length >= 3) {
      createSegmentationFromManualPoints();
      // Need to wait for state update before continuing
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!segmentation || (!segmentation.polygon || segmentation.polygon.length === 0)) {
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
  
  // Handle mouse move over canvas for manual annotation
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isManualMode) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate position in the canvas
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    const normalizedX = (e.clientX - rect.left) / displayWidth;
    const normalizedY = (e.clientY - rect.top) / displayHeight;
    const x = normalizedX * canvas.width;
    const y = normalizedY * canvas.height;
    
    if (isDraggingPoint && selectedPointIndex !== null) {
      // Make a deep copy of manual points to avoid reference issues
      const updatedPoints = manualPoints.map(point => [...point] as Point);
      
      // Update the position of the dragged point
      updatedPoints[selectedPointIndex] = [Math.round(x), Math.round(y)];
      
      // IMPORTANT: Update manualPoints first to ensure it has the latest data
      setManualPoints(updatedPoints);
      
      // Real-time update for the segmentation if the polygon is closed
      // This ensures a smooth visual experience when modifying points
      if (isPolygonClosed && updatedPoints.length >= 3) {
        // Check if we're modifying an AI segmentation that hasn't been marked as modified yet
        const isModifyingAI = segmentation?.annotation_id && 
          !segmentation.annotation_id.startsWith('manual-') &&
          !segmentation.annotation_id.includes('-modified');
        
        // Get the appropriate annotation ID - preserve existing ID if already modified
        const annotationId = isModifyingAI 
          ? `${segmentation!.annotation_id}-modified`
          : segmentation?.annotation_id || `manual-${Date.now()}`;
        
        // Update segmentation with the latest points - but preserve other properties
        const updatedSegmentation = {
          success: true,
          polygon: updatedPoints.map(point => [...point] as Point), // Another deep copy to be safe
          annotation_id: annotationId,
          cached: false
        };
        
        // Manual update of segmentation during drag provides real-time feedback
        setSegmentation(updatedSegmentation);
      }
    } else {
      // Check if hovering over any existing point
      let hovering = false;
      for (let i = 0; i < manualPoints.length; i++) {
        const point = manualPoints[i];
        const distance = Math.sqrt(
          Math.pow(point[0] - x, 2) + Math.pow(point[1] - y, 2)
        );
        
        if (distance < 10) { // 10px threshold
          setHoveredPointIndex(i);
          hovering = true;
          break;
        }
      }
      
      if (!hovering) {
        setHoveredPointIndex(null);
        
        // Check if hovering over the first point when there are enough points to close
        if (manualPoints.length > 2) {
          const firstPoint = manualPoints[0];
          const distance = Math.sqrt(
            Math.pow(firstPoint[0] - x, 2) + Math.pow(firstPoint[1] - y, 2)
          );
          
          setHoveredClosePoint(distance < 15); // 15px threshold
        } else {
          setHoveredClosePoint(false);
        }
      } else {
        setHoveredClosePoint(false);
      }
    }
  };
  // Handle mouse down for starting a drag operation
  const handleCanvasMouseDown = () => {
    if (!isManualMode || hoveredPointIndex === null) return;
    
    // Enter editing mode when starting to drag
    setIsEditingMode(true);
    setIsDraggingPoint(true);
    setSelectedPointIndex(hoveredPointIndex);
    
    console.log("Started editing point", {
      pointIndex: hoveredPointIndex,
      editingMode: true
    });
  };  // Handle mouse up to end drag operations
  const handleCanvasMouseUp = () => {
    // Only update the segmentation if we were actually dragging a point
    if (isDraggingPoint && selectedPointIndex !== null) {
      // Make sure we have a valid polygon with at least 3 points
      if (isPolygonClosed && manualPoints.length >= 3) {
        console.log("Finalizing point movement", {
          selectedPointIndex,
          totalPoints: manualPoints.length,
          coords: manualPoints[selectedPointIndex],
          editingMode: true // We're still in editing mode after drag
        });
        
        // Use the current state of manualPoints to update the segmentation
        // This ensures that we don't lose any points during the update
        const pointsCopy = manualPoints.map(point => [...point] as Point);
        
        // Check if we're modifying an AI segmentation
        const isModifyingAI = segmentation?.annotation_id && 
          !segmentation.annotation_id.startsWith('manual-') &&
          !segmentation.annotation_id.includes('-modified');
        
        // Preserve the annotation ID but update the points
        const annotationId = isModifyingAI
          ? `${segmentation!.annotation_id}-modified`
          : segmentation?.annotation_id || `manual-${Date.now()}`;
        
        // Update segmentation with our modified points
        setSegmentation({
          success: true,
          polygon: pointsCopy,
          annotation_id: annotationId,
          cached: false
        });
        
        if (isModifyingAI) {
          setStatusMessage("AI segmentation modified successfully");
          setTimeout(() => setStatusMessage(null), 2000);
        }
      }
    }
    
    // Always reset the dragging state but maintain editing mode
    setIsDraggingPoint(false);
    setSelectedPointIndex(null);
    // Keep isEditingMode true to prevent sync from overwriting our edits
  };
  // Handle removing a point with right click
  const handleCanvasRightClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (!isManualMode || hoveredPointIndex === null) return;
    
    // Set editing mode to prevent sync from overwriting our changes
    setIsEditingMode(true);
    
    // Make a deep copy to avoid reference issues
    const newPoints = manualPoints.map(point => [...point] as Point);
    newPoints.splice(hoveredPointIndex, 1);
    
    // Update manual points first
    setManualPoints(newPoints);
    setHoveredPointIndex(null);
    
    // Update the segmentation to reflect the point removal
    if (isPolygonClosed && newPoints.length >= 3) {
      // Check if we're modifying an AI segmentation
      const isModifyingAI = segmentation?.annotation_id && 
        !segmentation.annotation_id.startsWith('manual-') &&
        !segmentation.annotation_id.includes('-modified');
      
      // Preserve the annotation ID but update the points
      const annotationId = isModifyingAI
        ? `${segmentation!.annotation_id}-modified`
        : segmentation?.annotation_id || `manual-${Date.now()}`;
      
      const updatedSegmentation = {
        success: true,
        polygon: newPoints,
        annotation_id: annotationId,
        cached: false
      };
      
      // Update segmentation with our new points
      setSegmentation(updatedSegmentation);
      
      setStatusMessage(isModifyingAI 
        ? "AI segmentation modified (point removed)" 
        : "Point removed from polygon");
      setTimeout(() => setStatusMessage(null), 2000);
    } else if (newPoints.length < 3 && isPolygonClosed) {
      // If we drop below 3 points, the polygon can't remain closed
      setIsPolygonClosed(false);
      setStatusMessage("Polygon opened (need at least 3 points)");
      setTimeout(() => setStatusMessage(null), 2000);
    }
  };
    // Clear the current manual annotation
  const clearManualAnnotation = () => {
    setManualPoints([]);
    setIsPolygonClosed(false);
    
    // If there was a segmentation based on manual annotation, clear it too
    if (segmentation && segmentation.annotation_id?.startsWith('manual-')) {
      setSegmentation(null);
    }
    
    // Exit editing mode when clearing
    if (isEditingMode) {
      setIsEditingMode(false);
      console.log("Exiting editing mode due to annotation clear");
    }
    
    setStatusMessage("Manual annotation cleared");
    setTimeout(() => setStatusMessage(null), 2000);
  };// Toggle between AI and manual annotation modes
  const toggleAnnotationMode = () => {
    const switchingToManual = !isManualMode;
    
    // Reset editing mode when changing annotation modes
    if (isEditingMode) {
      setIsEditingMode(false);
      console.log("Exiting editing mode due to mode switch");
    }
    
    if (switchingToManual && segmentation) {
      // If switching TO manual mode with existing segmentation,
      // convert the segmentation to manual points
      if (segmentation.polygon && segmentation.polygon.length > 0) {
        // Always create a fresh copy of the points to avoid reference issues
        const validPoints: Point[] = [];
        
        // Manually validate each point to ensure it's properly formatted
        segmentation.polygon.forEach(point => {
          if (Array.isArray(point) && point.length >= 2) {
            validPoints.push([point[0], point[1]]);
          }
        });
        
        console.log("Converting AI polygon to manual points:", validPoints.length);
        setManualPoints(validPoints);
        setIsPolygonClosed(true);
      }
    } else if (!switchingToManual && isPolygonClosed && manualPoints.length >= 3) {
      // If switching FROM manual mode back to AI mode with a valid polygon,
      // make sure to preserve our manual work in the segmentation
      if (segmentation?.annotation_id) {
        // Keep the existing segmentation but update the points
        setSegmentation({
          ...segmentation,
          polygon: [...manualPoints],
          annotation_id: segmentation.annotation_id.includes('-modified') 
            ? segmentation.annotation_id 
            : segmentation.annotation_id.startsWith('manual-')
              ? segmentation.annotation_id
              : `${segmentation.annotation_id}-modified`,
          cached: false
        });
      } else {
        // Create a new segmentation from our manual points
        setSegmentation({
          success: true,
          polygon: [...manualPoints],
          annotation_id: `manual-${Date.now()}`,
          cached: false
        });
      }
    }
    
    setIsManualMode(switchingToManual);
    setStatusMessage(switchingToManual ? 
      "Switched to manual annotation mode" : 
      "Switched to AI segmentation mode");
    setTimeout(() => setStatusMessage(null), 2000);
  };
  if (loading && !image) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading image...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load image</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }
    
  return (
    <div className="h-full flex flex-col">
      {/* Control Panel */}
      <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900">Analysis Mode</h3>
            </div>
            
            <button
              onClick={toggleAnnotationMode}
              className={`group relative inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isManualMode 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl' 
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isManualMode ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                )}
              </svg>
              {isManualMode ? 'Manual Annotation' : 'AI-Powered Segmentation'}
            </button>          </div>
          
          {/* AI Segmentation Settings */}
          {!isManualMode && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Polygon Simplification
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="simplify-polygon"
                    checked={simplifyPolygon}
                    onChange={(e) => setSimplifyPolygon(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="simplify-polygon" className="ml-2 text-sm text-gray-700">
                    Enable polygon simplification
                  </label>
                </div>
                
                {simplifyPolygon && (
                  <div className="ml-6">
                    <label htmlFor="target-points" className="block text-xs text-gray-600 mb-1">
                      Target number of points: {targetPoints}
                    </label>
                    <input
                      type="range"
                      id="target-points"
                      min="10"
                      max="50"
                      value={targetPoints}
                      onChange={(e) => setTargetPoints(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>10 (High simplification)</span>
                      <span>50 (Low simplification)</span>
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                  <div className="flex items-start">
                    <svg className="w-3 h-3 text-blue-500 mr-1 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Simplification reduces the number of points in AI-generated polygons, making them easier to edit manually. Lower values = fewer points = more simplified shapes.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {isManualMode && (
            <div className="flex items-center space-x-3">
              <button
                onClick={clearManualAnnotation}
                className="inline-flex items-center px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={manualPoints.length === 0}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Points
              </button>
              
              {!isPolygonClosed && manualPoints.length >= 3 && (
                <button
                  onClick={() => {
                    setIsPolygonClosed(true);
                    createSegmentationFromManualPoints();
                  }}
                  className="inline-flex items-center px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete Polygon
                </button>
              )}
              
              {isPolygonClosed && manualPoints.length >= 3 && (
                <button
                  onClick={() => {
                    setIsEditingMode(!isEditingMode);
                    setStatusMessage(isEditingMode ? 
                      "Editing mode disabled" : 
                      "Editing mode enabled - points will not be auto-synced");
                    setTimeout(() => setStatusMessage(null), 3000);
                  }}
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isEditingMode 
                      ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200' 
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {isEditingMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
          <div className="flex items-start">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm">
              {isManualMode ? (
                <div>
                  <p className="text-blue-900 font-medium mb-1">Manual Annotation Mode{isEditingMode ? ' (Editing)' : ''}</p>
                  <p className="text-blue-800">
                    {manualPoints.length === 0
                      ? "Click on the image to start creating a polygon outline"
                      : isPolygonClosed
                      ? "Polygon completed. Click again to start a new polygon, or use edit mode to modify points."
                      : manualPoints.length < 3
                      ? "Add at least 3 points to complete a polygon"
                      : "Click near the first point or use 'Complete Polygon' button to finish"}
                  </p>
                  {isEditingMode && <p className="text-yellow-700 mt-1 text-xs">⚡ Editing mode active - drag points to move, right-click to delete</p>}
                </div>
              ) : (
                <div>
                  <p className="text-blue-900 font-medium mb-1">AI-Powered Segmentation</p>
                  <p className="text-blue-800">
                    Click anywhere on an object in the image to automatically generate precise segmentation boundaries
                    {hasSegmented && <span className="text-green-700 ml-1">(subsequent clicks will use cached results for faster processing)</span>}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Canvas Area */}
      <div className="flex-1 p-6 bg-gray-50/30">
        <div className="relative bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden h-full">
          <canvas 
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseDown={handleCanvasMouseDown}
            onMouseUp={handleCanvasMouseUp}
            onContextMenu={handleCanvasRightClick}
            className={`w-full h-full object-contain cursor-${isManualMode ? 'crosshair' : 'pointer'} transition-all duration-200`}
            style={{ minHeight: '400px' }}
          />
          
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-white rounded-xl p-6 shadow-xl border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-gray-700 font-medium">
                    {hasSegmented ? 'Processing your selection...' : 'Analyzing image (this may take a moment)...'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status and Results */}
      <div className="px-6 pb-6">
        {/* Status Message */}
        {statusMessage && (
          <div className={`mb-4 p-3 rounded-lg border ${
            segmentation?.cached 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{statusMessage}</span>
            </div>
          </div>
        )}

        {/* Segmentation Results */}
        {segmentation && (
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Segmentation Results
              </h3>
              
              {selectedObjectType && (
                <button
                  onClick={handleExportAnnotation}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Export Annotation
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Annotation ID</p>
                <p className="text-sm font-mono text-gray-900 truncate">{segmentation.annotation_id}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Boundary Points</p>
                <p className="text-sm font-semibold text-gray-900">{segmentation.polygon.length}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</p>
                <p className="text-sm font-semibold text-purple-600">
                  {segmentation.annotation_id?.startsWith('manual-') 
                    ? 'Manual' 
                    : segmentation.annotation_id?.includes('-modified')
                    ? 'AI + Manual'
                    : 'AI Generated'
                  }
                </p>
              </div>
              {segmentation.cached && !segmentation.annotation_id?.startsWith('manual-') && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-green-600 uppercase tracking-wide mb-1">Status</p>
                  <p className="text-sm font-semibold text-green-700">Cached Result</p>
                </div>
              )}
            </div>
            
            {selectedObjectType && (
              <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.997.997 0 01-1.414 0l-7-7A1.997 1.997 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <div>
                  <p className="text-sm text-blue-900 font-medium">Object Classification</p>
                  <p className="text-blue-700">
                    {selectedObjectType.startsWith('custom:') ? 
                      selectedObjectType.substring(7) : selectedObjectType}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
