from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import FileResponse
from app.storage.session_manager import get_session_manager, SessionManager
from app.storage.session_store import session_store
from app.utils.sam_model import SAMSegmenter
from pydantic import BaseModel
from typing import List, Optional
import json
from pathlib import Path
import os
import logging
from datetime import datetime
import cv2
from app.schemas.session_schemas import ManualAnnotationCreate, ManualAnnotationUpdate, AnnotationResponse

# Set up logging
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)
log_filename = f"debug_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_dir / log_filename),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("segmentation_router")

router = APIRouter()
segmenter = SAMSegmenter()

class PointPrompt(BaseModel):
    image_id: str
    x: float
    y: float

class SegmentationResponse(BaseModel):
    success: bool
    polygon: List[List[float]]
    annotation_id: Optional[str] = None
    cached: bool = False

@router.post("/segment/", response_model=SegmentationResponse)
async def segment_from_point(
    prompt: PointPrompt,
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Generate segmentation from a point click, with caching for subsequent clicks on the same image."""
    session_id = session_manager.session_id
    
    # Debug: log the received coordinates
    logger.debug(f"Received segmentation request: image_id={prompt.image_id}, x={prompt.x}, y={prompt.y}")
    
    image = session_store.get_image(session_id, prompt.image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        # Determine if running in Docker
        in_docker = os.path.exists('/.dockerenv')
        
        # Define annotation directory
        if in_docker:
            annotation_dir = Path("/app/annotations")
        else:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            annotation_dir = Path(os.path.join(base_dir, "annotations"))
        annotation_dir.mkdir(exist_ok=True)
        
        # Get the image path from the session store
        stored_path = image.file_path
        
        # Construct image path
        if in_docker:
            if stored_path.startswith("uploads/"):
                image_path = "/app/" + stored_path
            else:
                image_path = "/app/uploads/" + os.path.basename(stored_path)
        else:
            if stored_path.startswith("uploads/"):
                image_path = os.path.join(base_dir, stored_path)
            else:
                image_path = stored_path
        
        # Check if file exists
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image file not found at {image_path}")
        
        # Check if this is a new image or one we've already processed
        is_cached = image_path == segmenter.current_image_path and image_path in segmenter.cache
        
        logger.debug(f"Processing image: {image_path}, cached: {is_cached}")
        
        # Set the image in the segmenter
        height, width = segmenter.set_image(image_path)
        pixel_x = int(prompt.x * width)
        pixel_y = int(prompt.y * height)
        
        logger.debug(f"Click at coordinates: ({pixel_x}, {pixel_y}) for image size: {width}x{height}")
        
        # Get mask from point
        mask = segmenter.predict_from_point([pixel_x, pixel_y])
        
        # Save the mask
        mask_image_path = annotation_dir / f"mask_{session_id}_{image.image_id}.png"
        cv2.imwrite(str(mask_image_path), mask)
        logger.debug(f"Mask saved at {mask_image_path}")
        
        # Create and save overlay
        original_image = cv2.imread(image_path)
        mask_colored = cv2.applyColorMap(mask, cv2.COLORMAP_JET)
        overlay = cv2.addWeighted(original_image, 0.7, mask_colored, 0.3, 0)
        overlay_path = annotation_dir / f"overlay_{session_id}_{image.image_id}.png"
        cv2.imwrite(str(overlay_path), overlay)
        logger.debug(f"Overlay saved at {overlay_path}")
        
        polygon = segmenter.mask_to_polygon(mask)
        if not polygon:
            raise HTTPException(status_code=400, detail="Could not generate polygon from mask")
        
        # Save JSON
        annotation_path = annotation_dir / f"annotation_{session_id}_{image.image_id}_{len(polygon)}.json"
        with open(annotation_path, "w") as f:
            json.dump({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [polygon]
                },
                "properties": {
                    "cached": is_cached
                }
            }, f)
        
        # Add annotation to session store
        annotation = session_store.add_annotation(
            session_id=session_id,
            image_id=image.image_id,
            file_path=str(annotation_path),
            auto_generated=True
        )
        
        logger.debug(f"Generated segmentation with {len(polygon)} points, cached: {is_cached}")
        
        return SegmentationResponse(
            success=True,
            polygon=polygon,
            annotation_id=annotation.annotation_id if annotation else None,
            cached=is_cached
        )
        
    except Exception as e:
        logger.error(f"Error in segmentation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating segmentation: {str(e)}"
        )

@router.get("/masks/{session_id}/{image_id}/{mask_type}")
async def get_mask_image(session_id: str, image_id: str, mask_type: str):
    """Serve mask or overlay image for download or display."""
    if mask_type not in ["mask", "overlay"]:
        raise HTTPException(status_code=400, detail="Invalid mask_type. Use 'mask' or 'overlay'.")
    mask_path = Path(f"/app/annotations/{mask_type}_{session_id}_{image_id}.png")
    if not mask_path.exists():
        raise HTTPException(status_code=404, detail=f"{mask_type} image not found")
    return FileResponse(mask_path, media_type="image/png", filename=f"{mask_type}_{session_id}_{image_id}.png")

@router.get("/annotations/{image_id}")
async def get_image_annotations(
    image_id: str,
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Get all annotations for a specific image"""
    session_id = session_manager.session_id
    image = session_store.get_image(session_id, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    annotations = session_store.get_annotations(session_id, image_id)
    
    result = []
    for ann in annotations:
        try:
            file_path = ann.file_path
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    json_data = json.load(f)
                
                result.append({
                    "annotation_id": ann.annotation_id,
                    "created_at": ann.created_at,
                    "auto_generated": ann.auto_generated,
                    "data": json_data
                })
        except Exception as e:
            continue
    
    return result

@router.post("/clear-cache/{image_id}")
async def clear_image_cache(
    image_id: str,
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Clear the segmentation cache for a specific image"""
    session_id = session_manager.session_id
    image = session_store.get_image(session_id, image_id)
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    stored_path = image.file_path
    in_docker = os.path.exists('/.dockerenv')
    
    if in_docker:
        if stored_path.startswith("uploads/"):
            image_path = "/app/" + stored_path
        else:
            image_path = "/app/uploads/" + os.path.basename(stored_path)
    else:
        if stored_path.startswith("uploads/"):
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            image_path = os.path.join(base_dir, stored_path)
        else:
            image_path = stored_path
    
    segmenter.clear_cache(image_path)
    
    return {"success": True, "message": f"Cache cleared for image {image_id}"}

@router.post("/annotations/", response_model=AnnotationResponse)
async def save_manual_annotation(
    annotation_data: ManualAnnotationCreate,
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Save a manual annotation"""
    session_id = session_manager.session_id
      # Verify the image exists
    image = session_store.get_image(session_id, annotation_data.image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        # Define annotation directory
        in_docker = os.path.exists('/.dockerenv')
        if in_docker:
            annotation_dir = Path("/app/annotations")
        else:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            annotation_dir = Path(os.path.join(base_dir, "annotations"))
        annotation_dir.mkdir(exist_ok=True)
        
        # Create JSON format for the annotation
        json_data = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "label": annotation_data.label,
                        "type": annotation_data.type,
                        "source": annotation_data.source,
                        "created": datetime.now().isoformat()
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[point[0], point[1]] for point in annotation_data.polygon]]
                    }
                }
            ]
        }
          # Save annotation file
        annotation_path = annotation_dir / f"manual_{session_id}_{annotation_data.image_id}_{annotation_data.id}.json"
        with open(annotation_path, "w") as f:
            json.dump(json_data, f, indent=2)
        
        # Add annotation to session store
        annotation = session_store.add_annotation(
            session_id,
            annotation_data.image_id,
            annotation_id=annotation_data.id,
            file_path=str(annotation_path),
            auto_generated=False
        )
        
        return AnnotationResponse(
            success=True,
            message="Annotation saved successfully",
            annotation_id=annotation.annotation_id if annotation else annotation_data.id
        )
        
    except Exception as e:
        logger.error(f"Error saving annotation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving annotation: {str(e)}"
        )

@router.put("/annotations/{annotation_id}", response_model=AnnotationResponse)
async def update_annotation(
    annotation_id: str,
    update_data: ManualAnnotationUpdate,
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Update an existing annotation"""
    session_id = session_manager.session_id
    
    # Get the annotation from session store
    annotation = session_store.get_annotation(session_id, annotation_id)
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    try:        # Load existing annotation data
        if not os.path.exists(annotation.file_path):
            raise HTTPException(status_code=404, detail="Annotation file not found")
        
        with open(annotation.file_path, 'r') as f:
            json_data = json.load(f)
        
        # Update the data
        if json_data.get("features"):
            feature = json_data["features"][0]
            
            if update_data.polygon:
                feature["geometry"]["coordinates"] = [[[point[0], point[1]] for point in update_data.polygon]]
            
            if update_data.label:
                feature["properties"]["label"] = update_data.label
            
            # Update modified timestamp
            feature["properties"]["modified"] = datetime.now().isoformat()
          # Save updated annotation
        with open(annotation.file_path, "w") as f:
            json.dump(json_data, f, indent=2)
        
        return AnnotationResponse(
            success=True,
            message="Annotation updated successfully",
            annotation_id=annotation_id
        )
        
    except Exception as e:
        logger.error(f"Error updating annotation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating annotation: {str(e)}"
        )

@router.delete("/annotations/{annotation_id}", response_model=AnnotationResponse)
async def delete_annotation(
    annotation_id: str,
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Delete an annotation"""
    session_id = session_manager.session_id
    
    logger.info(f"Attempting to delete annotation {annotation_id} from session {session_id}")
    
    # List all annotations in session for debugging
    all_annotations = session_store.get_annotations(session_id)
    logger.info(f"Available annotations in session: {[ann.annotation_id for ann in all_annotations]}")
    
    # Get the annotation from session store
    annotation = session_store.get_annotation(session_id, annotation_id)
    if not annotation:
        logger.error(f"Annotation {annotation_id} not found in session {session_id}")
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    logger.info(f"Found annotation to delete: {annotation.annotation_id}")
    
    try:
        # Delete the annotation file if it exists
        if os.path.exists(annotation.file_path):
            os.remove(annotation.file_path)
            logger.info(f"Deleted annotation file: {annotation.file_path}")
        
        # Remove from session store
        success = session_store.remove_annotation(session_id, annotation_id)
        logger.info(f"Removed annotation from session store: {success}")
        
        return AnnotationResponse(
            success=True,
            message="Annotation deleted successfully",
            annotation_id=annotation_id
        )
        
    except Exception as e:
        logger.error(f"Error deleting annotation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting annotation: {str(e)}"
        )

@router.get("/status")
async def get_segmentation_status():
    """Get the status of the segmentation service"""
    try:
        model_loaded = segmenter._model_loaded if hasattr(segmenter, '_model_loaded') else False
        device = str(segmenter.device) if hasattr(segmenter, 'device') else 'unknown'
        cache_size = len(segmenter.cache) if hasattr(segmenter, 'cache') else 0
        
        return {
            "status": "healthy",
            "model_loaded": model_loaded,
            "device": device,
            "cached_images": cache_size,
            "current_image": segmenter.current_image_path is not None
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

@router.post("/preload")
async def preload_sam_model():
    """Preload the SAM model to reduce first-time segmentation latency"""
    try:
        segmenter._ensure_model_loaded()
        return {"success": True, "message": "SAM model preloaded successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to preload SAM model: {str(e)}"
        )