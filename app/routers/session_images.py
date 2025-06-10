from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Response, Request, status, BackgroundTasks
from app.utils.image_processing import save_upload_file, validate_image_file
from app.schemas.session_schemas import UploadResponse, Image, ImageCreate
from app.storage.session_manager import get_session_manager, SessionManager
from app.storage.session_store import session_store
from typing import List, Optional
from app.websocket_notify import manager as ws_manager
from app.routers.session_segmentation import segmenter
import os
import logging
import asyncio
import threading
import time

router = APIRouter()

def run_background_segmentation(session_id: str, image_id: str):
    """
    Run segmentation for the uploaded image in a background thread, save mask/polygon, and notify frontend.
    """
    from app.routers.session_segmentation import segmenter
    from app.storage.session_store import session_store
    import numpy as np
    import logging
    import asyncio
    import os
    from pathlib import Path
    import cv2
    
    logger = logging.getLogger("background_segmentation")
    
    try:
        # Send initial progress update
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(ws_manager.send_message(session_id, "Starting image processing..."))
        
        image = session_store.get_image(session_id, image_id)
        if not image:
            logger.error(f"No image found for segmentation: {image_id}")
            loop.run_until_complete(ws_manager.send_message(session_id, "Error: Image not found"))
            return
            
        # Send progress update
        loop.run_until_complete(ws_manager.send_message(session_id, "Loading SAM model..."))
        
        # Get image path logic (copied from segmentation endpoint)
        in_docker = os.path.exists('/.dockerenv')
        if in_docker:
            base_dir = "/app"
        else:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        stored_path = image.file_path
        if in_docker:
            if stored_path.startswith("uploads/"):
                image_path = f"/app/{stored_path}"
            else:
                image_path = f"/app/uploads/{os.path.basename(stored_path)}"
        else:
            if stored_path.startswith("uploads/"):
                image_path = os.path.join(base_dir, stored_path)
            else:
                image_path = stored_path
                
        if not os.path.exists(image_path):
            logger.error(f"Image file not found at {image_path}")
            loop.run_until_complete(ws_manager.send_message(session_id, "Error: Image file not found"))
            return
            
        # Send progress update
        loop.run_until_complete(ws_manager.send_message(session_id, "Processing image..."))
        
        # Set image and get dimensions
        height, width = segmenter.set_image(image_path)
        
        # Send progress update
        loop.run_until_complete(ws_manager.send_message(session_id, "Generating segmentation..."))
        
        # Use center point for auto-segmentation
        pixel_x = width // 2
        pixel_y = height // 2
        mask = segmenter.predict_from_point([pixel_x, pixel_y])
        
        # Send progress update
        loop.run_until_complete(ws_manager.send_message(session_id, "Saving results..."))
        
        # Save mask and overlay (copied from segmentation endpoint)
        annotation_dir = Path(base_dir) / "annotations"
        annotation_dir.mkdir(exist_ok=True)
        mask_image_path = annotation_dir / f"mask_{session_id}_{image_id}.png"
        cv2.imwrite(str(mask_image_path), mask)
        
        original_image = cv2.imread(image_path)
        mask_colored = cv2.applyColorMap(mask, cv2.COLORMAP_JET)
        overlay = cv2.addWeighted(original_image, 0.7, mask_colored, 0.3, 0)
        overlay_path = annotation_dir / f"overlay_{session_id}_{image_id}.png"
        cv2.imwrite(str(overlay_path), overlay)
        
        polygon = segmenter.mask_to_polygon(mask)
        
        # Save annotation in session store (auto_generated=True)
        session_store.add_annotation(session_id, image_id, str(mask_image_path), auto_generated=True)
        
        # Final notification
        loop.run_until_complete(ws_manager.send_message(session_id, "Image ready for annotation"))
        
        logger.info(f"Background segmentation completed successfully for session {session_id}")
        
    except Exception as e:
        logger.error(f"Background segmentation failed for session {session_id}: {e}", exc_info=True)
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(ws_manager.send_message(session_id, f"Error: Segmentation failed - {str(e)}"))
        except:
            pass
    finally:
        try:
            loop.close()
        except:
            pass

def notify_segmentation_ready(session_id: str, image_id: str):
    thread = threading.Thread(target=run_background_segmentation, args=(session_id, image_id))
    thread.daemon = True
    thread.start()

@router.post("/upload-image/", response_model=UploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    session_manager: SessionManager = Depends(get_session_manager)
):
    """
    Upload a satellite image file for annotation.
    
    Supports JPG, PNG, TIFF and GeoTIFF formats.
    """    # Validate file type
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )
    
    if not validate_image_file(file):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File type not supported. Please upload JPG, PNG, TIFF or GeoTIFF"
        )
        
    # Process and save the file
    try:
        file_info = await save_upload_file(file)
        
        # Save to session store
        session_id = session_manager.session_id
        session_image = session_store.add_image(
            session_id=session_id,
            file_name=file_info["original_filename"],
            file_path=file_info["path"],
            resolution=file_info["resolution"],
            source="user_upload"
        )
        
        # Convert SessionImage to the expected Image pydantic model format
        # Create an Image Pydantic model directly from the SessionImage attributes
        image = Image(
            image_id=session_image.image_id,
            file_name=session_image.file_name,
            file_path=session_image.file_path,
            resolution=session_image.resolution,
            source=session_image.source,
            capture_date=session_image.capture_date,
            created_at=session_image.created_at
        )
        # Trigger segmentation in the background (center point)
        notify_segmentation_ready(session_id, image.image_id)

        return UploadResponse(
            success=True,
            message="File uploaded successfully. Segmentation will be performed in the background.",
            image=image
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )

@router.get("/images/", response_model=List[Image])
def get_images(
    skip: int = 0, 
    limit: int = 100,
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Get list of uploaded images in the current session"""
    session_id = session_manager.session_id
    images = session_store.get_images(session_id, skip=skip, limit=limit)
    return images

@router.get("/images/{image_id}/", response_model=Image)
def get_image(
    image_id: str, 
    session_manager: SessionManager = Depends(get_session_manager)
):
    """
    Retrieve a specific image by its ID.
    """
    session_id = session_manager.session_id
    # Fetch image from the session store
    image = session_store.get_image(session_id, image_id)

    # Handle case where image doesn't exist
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image with ID {image_id} not found"
        )

    return image

@router.delete("/images/{image_id}", response_model=dict)
async def delete_image(
    image_id: str,
    session_manager: SessionManager = Depends(get_session_manager)
):
    """
    Delete an image and its associated annotations.
    """
    session_id = session_manager.session_id
    
    # Get the image from session store
    image = session_store.get_image(session_id, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        # Delete the image file if it exists
        if os.path.exists(image.file_path):
            os.remove(image.file_path)
        
        # Delete all annotations associated with this image
        annotations = session_store.get_annotations(session_id, image_id)
        for annotation in annotations:
            if os.path.exists(annotation.file_path):
                os.remove(annotation.file_path)
            session_store.remove_annotation(session_id, annotation.annotation_id)
        
        # Remove image from session store
        success = session_store.remove_image(session_id, image_id)
        
        if success:
            return {"success": True, "message": "Image and associated annotations deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to remove image from session")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting image: {str(e)}")

@router.get("/session-info/")
def get_session_info(
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Get information about the current session"""
    session_id = session_manager.session_id
    session_data = session_store.get_session(session_id)
    
    if session_data:
        return {
            "session_id": session_id,
            "images_count": len(session_data.get("images", {})),
            "annotations_count": len(session_data.get("annotations", {})),
            "created_at": session_data.get("created_at")
        }
    
    return {
        "session_id": session_id,
        "images_count": 0,
        "annotations_count": 0,
        "created_at": None
    }

@router.delete("/session/")
def clear_session(
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Clear the current session data"""
    session_id = session_manager.session_id
    
    # Remove session from store
    if session_id in session_store.sessions:
        del session_store.sessions[session_id]
    
    # Clear the session cookie
    session_manager.clear_session()
    
    return {"message": "Session cleared successfully"}

@router.post("/export-session/")
def export_session(
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Export the current session data"""
    session_id = session_manager.session_id
    session_data = session_store.export_session(session_id)
    
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No session data found"
        )
    
    # Convert session data to a format suitable for export
    export_data = {
        "session_id": session_id,
        "created_at": session_data["created_at"].isoformat(),
        "images": [img.dict() for img in session_data["images"].values()],
        "annotations": [ann.dict() for ann in session_data["annotations"].values()]
    }
    
    return export_data

@router.get("/session-id/")
def get_session_id_endpoint(
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Get the current session ID for WebSocket connections"""
    return {"session_id": session_manager.session_id}
