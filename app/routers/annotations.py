from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from app.storage.session_manager import get_session_manager, SessionManager
from app.storage.session_store import session_store
from pydantic import BaseModel
from typing import List, Optional
import json
from pathlib import Path
import os
import logging
from datetime import datetime

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
logger = logging.getLogger("annotation_router")

router = APIRouter()

class AnnotationTypeRequest(BaseModel):
    image_id: str
    annotation_id: str
    object_type: str
    polygon: List[List[float]]
    custom_properties: Optional[dict] = None

class AnnotationResponse(BaseModel):
    success: bool
    annotation_id: str
    message: str
    file_path: Optional[str] = None

@router.post("/annotate/", response_model=AnnotationResponse)
async def save_annotation_with_type(
    request: AnnotationTypeRequest,
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Save an annotation with object type information"""
    session_id = session_manager.session_id
    
    # Check if image exists
    image = session_store.get_image(session_id, request.image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Check if annotation exists
    annotation = session_store.get_annotation(session_id, request.annotation_id)
    if not annotation:
        # If annotation doesn't exist, we'll create a new one
        logger.info(f"Creating new annotation for {request.image_id} with type {request.object_type}")
    else:
        logger.info(f"Updating annotation {request.annotation_id} with type {request.object_type}")
    
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
        
        # Create GeoJSON with object type
        geojson_data = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [request.polygon]
            },
            "properties": {
                "object_type": request.object_type,
                "image_id": request.image_id,
                "timestamp": datetime.now().isoformat()
            }
        }
        
        # Add any custom properties if provided
        if request.custom_properties:
            geojson_data["properties"].update(request.custom_properties)
        
        # Generate filename with object type
        safe_type = request.object_type.replace(':', '_').replace('/', '_')
        annotation_path = annotation_dir / f"annotation_{session_id}_{request.image_id}_{safe_type}.geojson"
        
        # Save to file
        with open(annotation_path, "w") as f:
            json.dump(geojson_data, f, indent=2)
        
        # Add or update annotation in session store
        if annotation:
            # Update existing annotation
            annotation.file_path = str(annotation_path)
            session_store.sessions[session_id]["annotations"][request.annotation_id] = annotation
            response_message = "Annotation updated successfully"
        else:
            # Create new annotation
            annotation = session_store.add_annotation(
                session_id=session_id,
                image_id=request.image_id,
                file_path=str(annotation_path),
                auto_generated=False
            )
            response_message = "Annotation created successfully"
        
        logger.debug(f"Saved annotation to {annotation_path}")
        
        return AnnotationResponse(
            success=True,
            annotation_id=annotation.annotation_id,
            message=response_message,
            file_path=str(annotation_path)
        )
        
    except Exception as e:
        logger.error(f"Error saving annotation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save annotation: {str(e)}"
        )

@router.get("/annotations/{image_id}", response_model=List[dict])
async def get_annotations_for_image(
    image_id: str,
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Get all annotations for a specific image"""
    session_id = session_manager.session_id
    
    # Check if image exists
    image = session_store.get_image(session_id, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        # Get all annotations for this image
        annotations = session_store.get_annotations_by_image(session_id, image_id)
        
        # Collect annotation data including object type if available
        results = []
        for annotation in annotations:
            annotation_data = {
                "annotation_id": annotation.annotation_id,
                "file_path": annotation.file_path,
                "created_at": annotation.created_at.isoformat(),
                "auto_generated": annotation.auto_generated
            }
            
            # Try to parse object type from GeoJSON if it exists
            try:
                if os.path.exists(annotation.file_path):
                    with open(annotation.file_path, 'r') as f:
                        geojson = json.load(f)
                        if "properties" in geojson and "object_type" in geojson["properties"]:
                            annotation_data["object_type"] = geojson["properties"]["object_type"]
                        if "geometry" in geojson and "coordinates" in geojson["geometry"]:
                            annotation_data["polygon"] = geojson["geometry"]["coordinates"][0]
            except Exception as e:
                logger.warning(f"Could not parse GeoJSON for {annotation.file_path}: {str(e)}")
            
            results.append(annotation_data)
        
        return results
        
    except Exception as e:
        logger.error(f"Error retrieving annotations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve annotations: {str(e)}"
        )
