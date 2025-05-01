import { useState, useRef, useEffect, useCallback, WheelEvent } from 'react';
import type { AnnotationTool } from './AnnotationToolbar';
import { api } from '../services/api';
import type { SegmentationResponse } from '../services/api';
import { generateUniqueId } from '../utils/helpers';

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  type: AnnotationTool;
  points: Point[];
  completed: boolean;
  label: string;
  isSelected: boolean;
}

interface AnnotationCanvasProps {
  imageId: string;
  tool: AnnotationTool;
  imageUrl: string;
  onStatusMessage: (message: string | null) => void;
  onLoading: (isLoading: boolean) => void;
  onError: (error: string | null) => void;
  onUpdateAnnotations?: (annotations: Annotation[]) => void;
  onUpdateSegmentation?: (segmentation: SegmentationResponse) => void;
}

export const AnnotationCanvas = ({
  imageId,
  tool,
  imageUrl,
  onStatusMessage,
  onLoading,
  onError,
  onUpdateAnnotations,
  onUpdateSegmentation
}: AnnotationCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null);
  const [currentLabel] = useState<string>('default');
  const [drawingPolygon, setDrawingPolygon] = useState<boolean>(false);
  
  // Zoom and pan state
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState<boolean>(false);
  const [lastMousePos, setLastMousePos] = useState<Point | null>(null);
  
  // Preview point for polygon/polyline (ghost point that follows cursor)
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  
  // Refs to track drawing state
  const isDrawingRef = useRef<boolean>(false);
  const isDraggingPointRef = useRef<boolean>(false);
  const draggedAnnotationIdRef = useRef<string | null>(null);
  const draggedPointIndexRef = useRef<number | null>(null);
  const canvasInitializedRef = useRef<boolean>(false);
  const selectedAnnotationIdRef = useRef<string | null>(null);
  const imageLoadedRef = useRef<boolean>(false);

  // Declare drawAnnotations function forward reference to fix circular dependency
  const drawAnnotationsRef = useRef<() => void>(() => {});

  // Update parent component's annotations when ours change
  useEffect(() => {
    if (onUpdateAnnotations) {
      onUpdateAnnotations(annotations);
    }
  }, [annotations, onUpdateAnnotations]);
  
  // Calculate distance between two points - more efficient using Math.hypot
  const distance = useCallback((p1: Point, p2: Point): number =>
    Math.hypot(p1.x - p2.x, p1.y - p2.y), []);
  
  // Simplify polygon points to reduce complexity
  const simplifyPolygon = useCallback((points: Point[], tolerance = 2): Point[] => {
    // Create a simpler version with fewer points - keep only significant corners
    if (points.length < 3) return points;
    
    // This is Douglas-Peucker algorithm simplified version
    const result: Point[] = [];
    const pointsLength = points.length;
    
    // Always include first point
    result.push(points[0]);
    
    let lastIncludedIndex = 0;
    
    for (let i = 1; i < pointsLength - 1; i++) {
      const prev = points[lastIncludedIndex];
      const current = points[i];
      const next = points[i + 1];
      
      // Calculate angle change
      const v1 = { x: current.x - prev.x, y: current.y - prev.y };
      const v2 = { x: next.x - current.x, y: next.y - current.y };
      
      // Normalize vectors
      const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      
      // Avoid division by zero
      if (len1 < 0.0001 || len2 < 0.0001) continue;
      
      const nv1 = { x: v1.x / len1, y: v1.y / len1 };
      const nv2 = { x: v2.x / len2, y: v2.y / len2 };
      
      // Calculate dot product to determine angle
      const dotProduct = nv1.x * nv2.x + nv1.y * nv2.y;
      
      // If angle changes significantly or distance is large, include this point
      if (dotProduct < 0.95 || distance(prev, current) > tolerance * 5) {
        result.push(current);
        lastIncludedIndex = i;
      }
    }
    
    // Always include last point
    result.push(points[pointsLength - 1]);
    
    return result;
  }, [distance]);
  
  // Transform point from canvas to screen coordinates
  const canvasToScreen = useCallback((point: Point): Point => {
    if (!canvasRef.current) return point;
    
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: point.x * scale + rect.left + offset.x,
      y: point.y * scale + rect.top + offset.y
    };
  }, [offset, scale]);
  
  // Convert mouse event coordinates to canvas coordinates
  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // Calculate coordinates taking into account zoom and pan
    const x = (e.clientX - rect.left - offset.x) / scale;
    const y = (e.clientY - rect.top - offset.y) / scale;
    
    return { x, y };
  }, [offset, scale]);

  // Get control points for different annotation types
  const getControlPoints = useCallback((annotation: Annotation): Point[] => {
    if (annotation.type === 'rectangle' && annotation.points.length === 4) {
      return annotation.points;
    }
    if (annotation.type === 'circle' && annotation.points.length === 2) {
      return [annotation.points[0], annotation.points[1]]; // Center and edge
    }
    if (annotation.type === 'ellipse' && annotation.points.length >= 3) {
      return [
        annotation.points[0], // Center
        annotation.points[1], // Right point
        annotation.points[2]  // Bottom point
      ];
    }
    if (annotation.type === 'polygon' || annotation.type === 'polyline') {
      return annotation.points;
    }
    return [];
  }, []);

  // Update points for active annotation
  const updateActiveAnnotationPoints = useCallback((points: Point[]) => {
    if (activeAnnotation) {
      setActiveAnnotation({ ...activeAnnotation, points });
      setAnnotations(prev =>
        prev.map(a => (a.id === activeAnnotation.id ? { ...a, points } : a))
      );
    }
  }, [activeAnnotation]);

  // Complete polygon/polyline
  const completePolygon = useCallback(() => {
    if (activeAnnotation && (activeAnnotation.type === 'polygon' || activeAnnotation.type === 'polyline')) {
      if (activeAnnotation.points.length < 3 && activeAnnotation.type === 'polygon') {
        onStatusMessage('Polygon needs at least 3 points');
        return;
      }
      
      // Complete the annotation
      const completedAnnotation = { ...activeAnnotation, completed: true };
      setAnnotations(prev => prev.map(ann => 
        ann.id === activeAnnotation.id ? completedAnnotation : ann
      ));
      setActiveAnnotation(null);
      setPreviewPoint(null);
      setDrawingPolygon(false);
      
      // Keep it selected
      selectedAnnotationIdRef.current = completedAnnotation.id;
      
      onStatusMessage(`${activeAnnotation.type} completed with ${activeAnnotation.points.length} points`);
    }
  }, [activeAnnotation, onStatusMessage]);
  // Cancel drawing
  const cancelDrawing = useCallback(() => {
    if (!activeAnnotation) return;
    
    // Remove the active annotation
    setAnnotations(prev => prev.filter(ann => ann.id !== activeAnnotation.id));
    setActiveAnnotation(null);
    setPreviewPoint(null);
    setDrawingPolygon(false);
    onStatusMessage('Drawing canceled');
  }, [activeAnnotation, onStatusMessage]);
  
  // Delete last point in polygon/polyline
  const deleteLastPoint = useCallback(() => {
    if (activeAnnotation && (activeAnnotation.type === 'polygon' || activeAnnotation.type === 'polyline')) {
      if (activeAnnotation.points.length <= 1) {
        // If only one point, cancel drawing
        cancelDrawing();
      } else {
        // Remove last point
        const updatedPoints = [...activeAnnotation.points];
        updatedPoints.pop();
        updateActiveAnnotationPoints(updatedPoints);
        
        onStatusMessage('Removed last point');
      }
    }
  }, [activeAnnotation, cancelDrawing, onStatusMessage, updateActiveAnnotationPoints]);
  
  // Delete selected annotation
  const deleteSelected = useCallback(() => {
    if (selectedAnnotationIdRef.current) {
      setAnnotations(prev => prev.filter(a => a.id !== selectedAnnotationIdRef.current));
      selectedAnnotationIdRef.current = null;
      onStatusMessage('Annotation deleted');
    } else if (activeAnnotation) {
      setAnnotations(prev => prev.filter(ann => ann.id !== activeAnnotation.id));
      setActiveAnnotation(null);
      setPreviewPoint(null);
      setDrawingPolygon(false);
      onStatusMessage('Drawing canceled');
    }
  }, [activeAnnotation, onStatusMessage]);
    // Reset zoom and pan to fit the image in view
  const resetView = useCallback(() => {
    if (canvasRef.current && containerRef.current && imageRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const imgWidth = imageRef.current.width;
      const imgHeight = imageRef.current.height;
      
      // Calculate scale to fit the entire image
      const scaleX = containerWidth / imgWidth;
      const scaleY = containerHeight / imgHeight;
      const newScale = Math.min(scaleX, scaleY) * 0.85; // 85% of available space
      
      // Center the image
      const offsetX = (containerWidth - (imgWidth * newScale)) / 2;
      const offsetY = (containerHeight - (imgHeight * newScale)) / 2;
      
      setScale(Math.min(newScale, 1.0)); // Don't exceed 1.0 to prevent enlarging beyond natural size
      setOffset({ x: offsetX, y: offsetY });
    } else {
      // Fallback if refs aren't ready
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, []);

  // Process AI segmentation response
  const handleAISegmentation = useCallback(async (point: Point) => {
    try {
      onLoading(true);
      onStatusMessage('Generating AI segmentation... (first click may take longer)');
      
      // Get the canvas dimensions for proper normalization
      const canvas = canvasRef.current;
      if (!canvas) {
        onError("Canvas not available");
        return;
      }
      
      // We need to convert the click point back to image coordinates
      // considering current scale and offset
      const adjustedX = (point.x - offset.x/scale) / scale;
      const adjustedY = (point.y - offset.y/scale) / scale;
      
      // Now normalize to 0-1 range for API
      const normalizedX = Math.max(0, Math.min(1, adjustedX / canvas.width));
      const normalizedY = Math.max(0, Math.min(1, adjustedY / canvas.height));
      
      // Visual feedback at click position
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.scale(scale, scale);
        ctx.beginPath();
        ctx.arc(adjustedX, adjustedY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 69, 0, 0.7)';
        ctx.fill();
        ctx.restore();
      }
      
      // Make the API call
      const response = await api.segmentFromPoint({
        image_id: imageId,
        x: normalizedX,
        y: normalizedY
      });
      
      // Process response
      if (!response.polygon || response.polygon.length === 0) {
        onStatusMessage('No segmentation result was returned');
        return;
      }
      
      // The API returns normalized points (0-1), convert them back to canvas coordinates
      const canvasPoints = response.polygon.map(([x, y]) => ({
        x: x * canvas.width, 
        y: y * canvas.height
      }));
      
      // Simplify polygon to reduce number of points (better performance)
      const simplifiedPoints = simplifyPolygon(canvasPoints, 2);
      
      // Create new annotation with the simplified polygon
      const newAnnotation: Annotation = {
        id: response.annotation_id || generateUniqueId(),
        type: 'polygon',
        points: simplifiedPoints,
        completed: true,
        label: currentLabel,
        isSelected: true
      };
      
      // Add to annotations
      setAnnotations(prev => {
        // Deselect all other annotations and add the new one
        return [...prev.map(a => ({ ...a, isSelected: false })), newAnnotation];
      });
      selectedAnnotationIdRef.current = newAnnotation.id;
      
      // Call onUpdateSegmentation if provided
      if (onUpdateSegmentation) {
        onUpdateSegmentation(response);
      }
      
      onStatusMessage(response.cached 
        ? 'Loaded cached segmentation' 
        : 'AI segmentation complete'
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      onLoading(false);
    }
  }, [imageId, onLoading, onStatusMessage, onError, simplifyPolygon, currentLabel, offset.x, offset.y, scale, onUpdateSegmentation]);
    // Handle zooming with mouse wheel - always enabled regardless of tool
  const handleWheel = useCallback((e: WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    // Improve zoom responsiveness and smoothness
    const delta = e.deltaY < 0 ? 0.15 : -0.15; // Stronger zoom effect
    const zoomFactor = 1 + delta;
    const newScale = Math.max(0.05, Math.min(20, scale * zoomFactor)); // Extended zoom range
    
    // Get mouse position relative to canvas
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate new offset to zoom centered on mouse position
    const newOffsetX = mouseX - (mouseX - offset.x) * zoomFactor;
    const newOffsetY = mouseY - (mouseY - offset.y) * zoomFactor;
    
    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [scale, offset]);
  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore keyboard shortcuts when typing in input fields
    if (document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA') {
      return;
    }
    
    // Drawing controls
    if (e.key === 'Escape') {
      cancelDrawing();
    } else if (e.key === 'Enter') {
      completePolygon();
    } else if (e.key === 'Backspace') {
      deleteLastPoint();
    } else if (e.key === 'Delete') {
      deleteSelected();
    } else if (e.key === '0') {
      // Add '0' key to reset view/zoom
      resetView();
    }
  }, [cancelDrawing, completePolygon, deleteLastPoint, deleteSelected, resetView]);
  
  // The actual implementation of drawAnnotations that will be used throughout the component
  const drawAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current || !imageLoadedRef.current) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas and redraw image with current zoom and pan
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply transformation for zoom and pan
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    
    // Draw the image
    try {
      ctx.drawImage(imageRef.current, 0, 0);
    } catch (e) {
      console.error('Error drawing image:', e);
    }
    
    // Draw all annotations
    annotations.forEach(annotation => {
      const { points, type, isSelected, completed, label } = annotation;
      
      if (points.length === 0) return;
      
      // Set different styles based on selection state
      ctx.strokeStyle = isSelected ? '#FF4500' : '#3B82F6';
      ctx.lineWidth = isSelected ? 2.5 / scale : 2 / scale;
      ctx.fillStyle = isSelected ? 'rgba(255, 69, 0, 0.15)' : 'rgba(59, 130, 246, 0.15)';
      
      // Draw the shape based on its type
      ctx.beginPath();
      
      // Handle different shape types
      if (type === 'rectangle' && points.length === 4) {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < 4; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
      } else if (type === 'circle' && points.length === 2) {
        const [center, edge] = points;
        const radius = distance(center, edge);
        ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
      } else if (type === 'ellipse' && points.length >= 3) {
        const [center, right, bottom] = points;
        const rx = Math.abs(center.x - right.x);
        const ry = Math.abs(center.y - bottom.y);
        
        // Use proper ellipse drawing if available
        if (typeof ctx.ellipse === 'function') {
          ctx.ellipse(center.x, center.y, rx, ry, 0, 0, 2 * Math.PI);
        } else {
          // Fallback for browsers that don't support ellipse
          const kappa = 0.5522848;
          const ox = rx * kappa;
          const oy = ry * kappa;
          
          ctx.moveTo(center.x - rx, center.y);
          ctx.bezierCurveTo(
            center.x - rx, center.y - oy,
            center.x - ox, center.y - ry,
            center.x, center.y - ry
          );
          ctx.bezierCurveTo(
            center.x + ox, center.y - ry,
            center.x + rx, center.y - oy,
            center.x + rx, center.y
          );
          ctx.bezierCurveTo(
            center.x + rx, center.y + oy,
            center.x + ox, center.y + ry,
            center.x, center.y + ry
          );
          ctx.bezierCurveTo(
            center.x - ox, center.y + ry,
            center.x - rx, center.y + oy,
            center.x - rx, center.y
          );
        }
      } else if ((type === 'polygon' || type === 'polyline') && points.length > 0) {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        if (type === 'polygon' && completed) {
          ctx.closePath();
        }
      } else if (type === 'point' && points.length === 1) {
        const point = points[0];
        ctx.arc(point.x, point.y, 5 / scale, 0, 2 * Math.PI);
      }
      
      // Stroke and fill the shape
      ctx.stroke();
      if (completed && (type === 'rectangle' || type === 'circle' || type === 'ellipse' || type === 'polygon')) {
        ctx.fill();
      }
      
      // Draw label if it exists
      if (label) {
        ctx.font = `${14 / scale}px Arial`;
        
        // Background for better readability
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(
          points[0].x, 
          points[0].y - 16/scale, 
          textWidth + 6/scale, 
          16/scale
        );
        
        // Draw the text
        ctx.fillStyle = isSelected ? '#FF4500' : '#3B82F6';
        ctx.fillText(label, points[0].x + 3 / scale, points[0].y - 4 / scale);
      }
      
      // Draw control points for selected annotations
      if (isSelected || !completed) {
        const controlPoints = getControlPoints(annotation);
        controlPoints.forEach(point => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4 / scale, 0, 2 * Math.PI);
          ctx.fillStyle = isSelected ? '#FF4500' : '#3B82F6';
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1 / scale;
          ctx.stroke();
        });
      }
    });
    
    // Draw preview line for polygon/polyline
    if (drawingPolygon && activeAnnotation && previewPoint && activeAnnotation.points.length > 0) {
      const lastPoint = activeAnnotation.points[activeAnnotation.points.length - 1];
      
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(previewPoint.x, previewPoint.y);
      ctx.strokeStyle = '#FF4500';
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([5 / scale, 5 / scale]); // Dashed line
      ctx.stroke();
      ctx.setLineDash([]); // Reset to solid line
      
      // Draw preview point
      ctx.beginPath();
      ctx.arc(previewPoint.x, previewPoint.y, 5 / scale, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 69, 0, 0.5)';
      ctx.fill();
      
      // If polygon and we're close to the starting point, show a different style to indicate closing
      if (activeAnnotation.type === 'polygon' && activeAnnotation.points.length > 2) {
        const startingPoint = activeAnnotation.points[0];
        if (distance(previewPoint, startingPoint) < 15 / scale) {
          // Visual indication that clicking will close the polygon
          ctx.beginPath();
          ctx.arc(startingPoint.x, startingPoint.y, 8 / scale, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
          ctx.fill();
          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 2 / scale;
          ctx.stroke();
        }
      }
    }
    
    ctx.restore();
  }, [annotations, distance, getControlPoints, activeAnnotation, drawingPolygon, previewPoint, offset, scale]);
  
  // Store the reference to the current drawAnnotations function
  useEffect(() => {
    drawAnnotationsRef.current = drawAnnotations;
  }, [drawAnnotations]);
  
  // Set up keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
    // Remove this duplicate effect that was causing the infinite rendering loop
  // The drawAnnotations function is now called by the effect above

  // Start drawing shapes
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !imageLoadedRef.current) return;
    
    // For middle click, always allow panning regardless of tool
    if (e.button === 1) {
      setIsDraggingCanvas(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Get click position in canvas coordinates
    const pos = getCanvasCoords(e);
    
    // Handle AI segmentation tool
    if (tool === 'ai' && e.button === 0) {
      handleAISegmentation(pos);
      return;
    }
      if (tool === 'pointer') {
      // With the pointer tool selected, enable panning with left-click
      // (Note: This is the key change - moving image with left click only when pointer tool is selected)
      
      // Check for control points first
      for (const annotation of annotations) {
        if (!annotation.completed) continue;
        
        const controlPoints = getControlPoints(annotation);
        for (let i = 0; i < controlPoints.length; i++) {
          // Convert to screen coordinates for easier hit testing
          const screenPoint = canvasToScreen(controlPoints[i]);
          const mousePoint = { x: e.clientX, y: e.clientY };
          const hitRadius = 10; // pixels
          
          if (distance(screenPoint, mousePoint) <= hitRadius) {
            // Start dragging this control point
            draggedAnnotationIdRef.current = annotation.id;
            draggedPointIndexRef.current = i;
            isDraggingPointRef.current = true;
            
            // Select the annotation
            setAnnotations(prev => prev.map(a => ({
              ...a,
              isSelected: a.id === annotation.id
            })));
            selectedAnnotationIdRef.current = annotation.id;
            return;
          }
        }
      }
      
      // Check if clicking on an annotation
      const clickedAnnotationIndex = annotations.findIndex(annotation => {
        if (!annotation.completed) return false;
        
        if (annotation.type === 'rectangle' && annotation.points.length === 4) {
          // Check if point is inside rectangle
          const [topLeft, topRight, bottomRight, bottomLeft] = annotation.points;
          return pos.x >= Math.min(topLeft.x, bottomLeft.x) && 
                 pos.x <= Math.max(topRight.x, bottomRight.x) && 
                 pos.y >= Math.min(topLeft.y, topRight.y) && 
                 pos.y <= Math.max(bottomLeft.y, bottomRight.y);
        }
        
        if (annotation.type === 'circle' && annotation.points.length === 2) {
          // Check if point is inside circle
          const [center, edge] = annotation.points;
          const radius = distance(center, edge);
          return distance(center, pos) <= radius;
        }
        
        if (annotation.type === 'ellipse' && annotation.points.length >= 3) {
          // Check if point is inside ellipse
          const [center, right, bottom] = annotation.points;
          const rx = Math.abs(center.x - right.x);
          const ry = Math.abs(center.y - bottom.y);
          
          if (rx === 0 || ry === 0) return false;
          
          // Proper ellipse check
          const normalizedX = (pos.x - center.x) / rx;
          const normalizedY = (pos.y - center.y) / ry;
          return (normalizedX * normalizedX + normalizedY * normalizedY) <= 1;
        }
        
        if (annotation.type === 'polygon' && annotation.points.length > 2) {
          // Check if inside polygon using ray casting algorithm
          let inside = false;
          const points = annotation.points;
          
          for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            
            const intersect = ((yi > pos.y) !== (yj > pos.y)) &&
                (pos.x < (xj - xi) * (pos.y - yi) / (yj - yi) + xi);
            
            if (intersect) inside = !inside;
          }
          
          return inside;
        }
        
        if (annotation.type === 'point' && annotation.points.length === 1) {
          // Check if close to point
          const point = annotation.points[0];
          return distance(point, pos) <= 8 / scale;
        }
        
        return false;
      });
      
      // Handle selection change
      if (clickedAnnotationIndex !== -1) {
        selectedAnnotationIdRef.current = annotations[clickedAnnotationIndex].id;
        setAnnotations(prev => prev.map((ann, idx) => ({
          ...ann,
          isSelected: idx === clickedAnnotationIndex
        })));
        return;
      } else {
        // If not clicking on annotation or control point, start panning
        setIsDraggingCanvas(true);
        setLastMousePos({ x: e.clientX, y: e.clientY });
        
        // Deselect all annotations when clicking on empty canvas
        if (selectedAnnotationIdRef.current !== null) {
          setAnnotations(prev => prev.map(ann => ({ ...ann, isSelected: false })));
          selectedAnnotationIdRef.current = null;
        }
        return;
      }
    }
    
    // For polygon/polyline tools we use a different approach
    if (tool === 'polygon' || tool === 'polyline') {
      if (!drawingPolygon) {
        // Start a new polygon/polyline
        const newAnnotation: Annotation = {
          id: generateUniqueId(),
          type: tool,
          points: [pos],
          completed: false,
          label: currentLabel,
          isSelected: true
        };
        
        // Deselect all other annotations
        setAnnotations(prev => [
          ...prev.map(a => ({ ...a, isSelected: false })), 
          newAnnotation
        ]);
        
        setActiveAnnotation(newAnnotation);
        setPreviewPoint(pos);
        setDrawingPolygon(true);
      } else if (activeAnnotation) {
        // Check if near starting point to complete polygon
        if (activeAnnotation.points.length > 2 && 
            activeAnnotation.type === 'polygon') {
          const firstPoint = activeAnnotation.points[0];
          const distToStart = distance(pos, firstPoint);
          
          if (distToStart < 15 / scale) {
            completePolygon();
            return;
          }
        }
        
        // Otherwise add point
        const updatedPoints = [...activeAnnotation.points, pos];
        updateActiveAnnotationPoints(updatedPoints);
      }
      return;
    }
    
    // For other tools (rectangle, circle, ellipse, point)
    // Deselect all annotations
    setAnnotations(prev => prev.map(a => ({ ...a, isSelected: false })));
    selectedAnnotationIdRef.current = null;
    
    // Start drawing
    isDrawingRef.current = true;
    
    // Create a new annotation
    const newAnnotation: Annotation = {
      id: generateUniqueId(),
      type: tool,
      points: [pos],
      completed: tool === 'point', // Points are complete immediately
      label: currentLabel,
      isSelected: true
    };
    
    setAnnotations(prev => [...prev, newAnnotation]);
    setActiveAnnotation(newAnnotation);
    
    // Complete point annotations immediately
    if (tool === 'point') {
      selectedAnnotationIdRef.current = newAnnotation.id;
    }
  }, [tool, getCanvasCoords, annotations, currentLabel, distance, getControlPoints, handleAISegmentation, 
      canvasToScreen, scale, completePolygon, drawingPolygon, activeAnnotation, updateActiveAnnotationPoints]);

  // Continue drawing shapes
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !imageLoadedRef.current) return;
    
    const pos = getCanvasCoords(e);
    
    // Handle canvas dragging (panning)
    if (isDraggingCanvas && lastMousePos) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setOffset({
        x: offset.x + dx,
        y: offset.y + dy
      });
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Handle dragging control points
    if (isDraggingPointRef.current && draggedAnnotationIdRef.current !== null && draggedPointIndexRef.current !== null) {
      setAnnotations(prev => prev.map(ann => {
        if (ann.id !== draggedAnnotationIdRef.current) return ann;
        
        // Special handling based on shape type
        if (ann.type === 'rectangle' && ann.points.length === 4) {
          // Maintain rectangle shape when dragging corners
          const updatedPoints = [...ann.points];
          const cornerIndex = draggedPointIndexRef.current!;
          updatedPoints[cornerIndex] = pos;
          
          // Update adjacent points to maintain rectangle
          if (cornerIndex === 0) { // Top-left
            updatedPoints[1].y = pos.y; // Top-right
            updatedPoints[3].x = pos.x; // Bottom-left
          } else if (cornerIndex === 1) { // Top-right
            updatedPoints[0].y = pos.y; // Top-left
            updatedPoints[2].x = pos.x; // Bottom-right
          } else if (cornerIndex === 2) { // Bottom-right
            updatedPoints[1].x = pos.x; // Top-right
            updatedPoints[3].y = pos.y; // Bottom-left
          } else if (cornerIndex === 3) { // Bottom-left
            updatedPoints[0].x = pos.x; // Top-left
            updatedPoints[2].y = pos.y; // Bottom-right
          }
          
          return { ...ann, points: updatedPoints };
        } else if (ann.type === 'circle' && ann.points.length === 2) {
          // For circle, update edge point
          const [center] = ann.points;
          return { ...ann, points: [center, pos] };
        } else if (ann.type === 'ellipse' && ann.points.length >= 3) {
          const center = ann.points[0];
          const updatedPoints = [...ann.points];
          
          // Update specific control point
          if (draggedPointIndexRef.current === 1) {
            updatedPoints[1] = { x: pos.x, y: center.y }; // Right point - adjust horizontal
          } else if (draggedPointIndexRef.current === 2) {
            updatedPoints[2] = { x: center.x, y: pos.y }; // Bottom point - adjust vertical
          } else if (draggedPointIndexRef.current === 0) {
            // Moving center - move all points
            const dx = pos.x - center.x;
            const dy = pos.y - center.y;
            
            updatedPoints[0] = pos;
            updatedPoints[1] = { x: updatedPoints[1].x + dx, y: updatedPoints[1].y + dy };
            updatedPoints[2] = { x: updatedPoints[2].x + dx, y: updatedPoints[2].y + dy };
          }
          
          return { ...ann, points: updatedPoints };
        } else {
          // For other shapes just update the specific point
          const updatedPoints = [...ann.points];
          updatedPoints[draggedPointIndexRef.current!] = pos;
          return { ...ann, points: updatedPoints };
        }
      }));
      return;
    }
    
    // Update preview point for polygon/polyline
    if (drawingPolygon) {
      setPreviewPoint(pos);
      return;
    }
    
    // Regular drawing continuation
    if (!isDrawingRef.current || !activeAnnotation) return;
    
    if (activeAnnotation.type === 'rectangle') {
      const start = activeAnnotation.points[0];
      const points = [
        start,                    // top-left
        { x: pos.x, y: start.y }, // top-right
        pos,                      // bottom-right
        { x: start.x, y: pos.y }  // bottom-left
      ];
      updateActiveAnnotationPoints(points);
    } else if (activeAnnotation.type === 'circle') {
      const center = activeAnnotation.points[0];
      const points = [center, pos];
      updateActiveAnnotationPoints(points);
    } else if (activeAnnotation.type === 'ellipse') {
      const center = activeAnnotation.points[0];
      const points = [
        center,
        { x: pos.x, y: center.y }, // right point
        { x: center.x, y: pos.y }, // bottom point
      ];
      updateActiveAnnotationPoints(points);
    }  }, [getCanvasCoords, activeAnnotation, updateActiveAnnotationPoints, isDraggingCanvas, lastMousePos, offset, 
       drawingPolygon]);

  // End drawing shapes
  const handleMouseUp = useCallback(() => {
    // End canvas dragging
    if (isDraggingCanvas) {
      setIsDraggingCanvas(false);
      setLastMousePos(null);
    }
    
    // End dragging control points
    if (isDraggingPointRef.current) {
      isDraggingPointRef.current = false;
      draggedAnnotationIdRef.current = null;
      draggedPointIndexRef.current = null;
    }
    
    // Complete non-polygon/polyline shapes on mouse up
    if (isDrawingRef.current && activeAnnotation && 
        activeAnnotation.type !== 'polygon' && 
        activeAnnotation.type !== 'polyline') {
      
      isDrawingRef.current = false;
      
      // Complete the annotation
      const completedAnnotation = { ...activeAnnotation, completed: true };
      setAnnotations(prev => prev.map(ann => 
        ann.id === activeAnnotation.id ? completedAnnotation : ann
      ));
      selectedAnnotationIdRef.current = completedAnnotation.id;
      setActiveAnnotation(null);
    }
  }, [activeAnnotation, isDraggingCanvas]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (isDraggingCanvas) {
      setIsDraggingCanvas(false);
      setLastMousePos(null);
    }
    
    if (drawingPolygon) {
      setPreviewPoint(null);
    }
  }, [isDraggingCanvas, drawingPolygon]);
  
  // Handle clicks for polygon/polyline point adding
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // For polygon/polyline we handle clicks separately to add points
    if (drawingPolygon && activeAnnotation && 
        (activeAnnotation.type === 'polygon' || activeAnnotation.type === 'polyline')) {
      
      const pos = getCanvasCoords(e);
      
      // Check if clicking near the first point to complete the polygon
      if (activeAnnotation.type === 'polygon' && activeAnnotation.points.length > 2) {
        const firstPoint = activeAnnotation.points[0];
        if (distance(pos, firstPoint) < 10 / scale) {
          completePolygon();
          return;
        }
      }
      
      // Otherwise add point to the polygon/polyline
      const updatedPoints = [...activeAnnotation.points, pos];
      updateActiveAnnotationPoints(updatedPoints);
    }
  }, [activeAnnotation, completePolygon, distance, drawingPolygon, getCanvasCoords, scale, updateActiveAnnotationPoints]);

  // Load and prepare the canvas and image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Reset state
    imageLoadedRef.current = false;
    canvasInitializedRef.current = false;
    setAnnotations([]);
    setActiveAnnotation(null);
    setPreviewPoint(null);
    setDrawingPolygon(false);
    resetView();
    
    // Show loading state
    onLoading(true);
    
    // Create a timeout for image loading
    const imageLoadTimeout = setTimeout(() => {
      onError('Image loading timed out. Please try refreshing the page.');
      onLoading(false);
    }, 30000); // 30 seconds timeout
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      clearTimeout(imageLoadTimeout);
      
      try {
        // Set canvas dimensions to match the image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Calculate appropriate scaling to fit in the container
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth;
          const containerHeight = containerRef.current.clientHeight;
          
          // Calculate scale to fit the image properly in the container
          const scaleX = containerWidth / img.width;
          const scaleY = containerHeight / img.height;
          
          // Use the smaller scale to fit the entire image
          // But don't scale up beyond 100% to avoid pixelation
          const initialScale = Math.min(scaleX, scaleY, 1);
          
          // Calculate offset to center the image
          const offsetX = (containerWidth - (img.width * initialScale)) / 2;
          const offsetY = (containerHeight - (img.height * initialScale)) / 2;
          
          // Set initial scale and offset
          setScale(initialScale);
          setOffset({ x: offsetX, y: offsetY });
        }
        
        // Store image for later use
        imageRef.current = img;
        canvasInitializedRef.current = true;
        imageLoadedRef.current = true;
        
        // Draw the image
        ctx.drawImage(img, 0, 0);
        
        onLoading(false);
        onStatusMessage('Image loaded. Use scroll wheel to zoom and middle-click to pan.');
        
      } catch (err) {
        onError('Failed to load image: ' + (err instanceof Error ? err.message : String(err)));
        onLoading(false);
      }
    };
    
    img.onerror = () => {
      clearTimeout(imageLoadTimeout);
      onError(`Failed to load image: ${imageUrl}. Check if the file exists and is accessible.`);
      onLoading(false);
    };
    
    img.src = imageUrl;
    
    return () => {
      clearTimeout(imageLoadTimeout);
      // Clean up
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl, onError, resetView, onLoading, onStatusMessage]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative flex items-center justify-center bg-gray-800"
    >
      <div className="absolute top-2 right-2 z-10 bg-white rounded shadow flex">
        <button 
          onClick={resetView} 
          className="p-1 hover:bg-gray-100"
          title="Reset zoom and position"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      <canvas
        ref={canvasRef}
        className={`${isDraggingCanvas ? 'cursor-grabbing' : 
                     tool === 'pointer' ? 'cursor-move' : 
                     tool === 'ai' ? 'cursor-cell' : 'cursor-crosshair'}`}
        onMouseDown={(e) => {
          e.preventDefault();
          handleMouseDown(e);
        }}
        onMouseMove={(e) => {
          e.preventDefault();
          handleMouseMove(e);
        }}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => {
          // Right-click can be used for panning as an alternative
          e.preventDefault();
          if (tool !== 'ai') {
            setIsDraggingCanvas(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
          }
        }}
        style={{ 
          display: 'block',
          imageRendering: 'crisp-edges'
        }}
      />
      
      {/* Hot keys help */}
      <div className="absolute bottom-2 left-2 z-10 bg-white bg-opacity-75 rounded shadow text-xs text-gray-700 p-1">
        <div>Delete: Remove selected | Esc: Cancel | Enter: Complete</div>
        {drawingPolygon && <div>Backspace: Remove last point</div>}
      </div>
    </div>
  );
};
