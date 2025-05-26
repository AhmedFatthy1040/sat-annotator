from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Response, Request, status
from app.utils.image_processing import save_upload_file, validate_image_file
from app.schemas.session_schemas import UploadResponse, Image, ImageCreate
from app.storage.session_manager import get_session_manager, SessionManager
from app.storage.session_store import session_store
from typing import List, Optional
import os

router = APIRouter()

@router.post("/upload-image/", response_model=UploadResponse)
async def upload_image(
    file: UploadFile = File(...),
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
        )        # Process and save the file
    try:
        file_info = await save_upload_file(file)
        
        # Save to session store
        session_id = session_manager.session_id
        
        # Determine which path to use for annotation workflow
        annotation_path = file_info.get("processed_path", file_info["path"])
        
        # Prepare metadata for TIFF files
        metadata = None
        if file_info.get("is_tiff"):
            metadata = {
                "is_tiff": True,
                "original_path": file_info["path"],
                "web_path": file_info.get("web_path"),
                "tiff_info": file_info.get("tiff_info", {})
            }
        
        session_image = session_store.add_image(
            session_id=session_id,
            file_name=file_info["original_filename"],
            file_path=annotation_path,  # Use processed path for TIFF files
            resolution=file_info["resolution"],
            source="user_upload",
            metadata=metadata
        )        # Convert SessionImage to the expected Image pydantic model format
        # Create an Image Pydantic model directly from the SessionImage attributes
        image = Image(
            image_id=session_image.image_id,
            file_name=session_image.file_name,
            file_path=session_image.file_path,
            resolution=session_image.resolution,
            source=session_image.source,
            metadata=session_image.metadata,  # Use metadata directly from session_image
            capture_date=session_image.capture_date,
            created_at=session_image.created_at
        )
        
        return UploadResponse(
            success=True,
            message="File uploaded successfully",
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

@router.get("/session-info/")
def get_session_info(
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Get information about the current session"""
    session_id = session_manager.session_id
    session = session_store.get_session(session_id)
    
    if not session:
        return {
            "session_id": session_id,
            "image_count": 0,
            "annotation_count": 0,
            "created_at": None
        }
    
    return {
        "session_id": session_id,
        "image_count": len(session["images"]),
        "annotation_count": len(session["annotations"]),
        "created_at": session["created_at"]
    }

@router.post("/clear-session/")
def clear_session(
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Clear the current session data"""
    session_id = session_manager.session_id
    session_store.delete_session(session_id)
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
