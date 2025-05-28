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
import uuid

# Set up logging
log_dir = Path("app/logs")
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
    simplify: Optional[bool] = True
    target_points: Optional[int] = 20

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
        
        # Construct image path - handle processed TIFF files
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
        
        # Check if file exists, if not try to find processed version
        if not os.path.exists(image_path):
            # For TIFF files, try to find the processed version
            if stored_path.endswith(('.tif', '.tiff')):
                processed_filename = f"processed_{Path(stored_path).stem}.png"
                if in_docker:
                    processed_path = f"/app/uploads/processed/{processed_filename}"
                else:
                    processed_path = os.path.join(base_dir, "uploads", "processed", processed_filename)
                
                if os.path.exists(processed_path):
                    image_path = processed_path
                    logger.info(f"Using processed TIFF version: {image_path}")
                else:
                    raise FileNotFoundError(f"Neither original nor processed image found for {stored_path}")
            else:
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
        
        polygon = segmenter.mask_to_polygon(mask, simplify=prompt.simplify, target_points=prompt.target_points)
        
        if not polygon:
            raise HTTPException(status_code=400, detail="Could not generate polygon from mask")        # Generate a temporary annotation ID for the segmentation (not saved to store yet)
        # This ID will be used when the user actually exports the annotation
        temp_annotation_id = f"ai-{str(uuid.uuid4())}"
        
        logger.debug(f"Generated segmentation with {len(polygon)} points, cached: {is_cached}")
        
        return SegmentationResponse(
            success=True,
            polygon=polygon,
            annotation_id=temp_annotation_id,
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
                    geojson = json.load(f)
                
                result.append({
                    "annotation_id": ann.annotation_id,
                    "created_at": ann.created_at,
                    "auto_generated": ann.auto_generated,
                    "data": geojson
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