import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel


class SessionImage(BaseModel):
    image_id: str  # UUID string instead of integer
    file_name: str
    file_path: str
    resolution: Optional[str] = None
    source: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None  # For TIFF and other image metadata
    capture_date: datetime = datetime.now()
    created_at: datetime = datetime.now()


class SessionAnnotation(BaseModel):
    annotation_id: str  # UUID string
    image_id: str  # Reference to SessionImage
    file_path: str
    created_at: datetime = datetime.now()
    auto_generated: bool = False
    model_id: Optional[str] = None


class SessionStore:
    """
    In-memory session-based storage for images and annotations.
    This replaces the database for storing metadata.
    """
    def __init__(self):
        # Dictionary to store active sessions
        self.sessions: Dict[str, Dict] = {}    
    def create_session(self, session_id: str) -> None:
        """Create a new session if it doesn't exist"""
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                "images": {},
                "annotations": {},
                "created_at": datetime.now()
            }

    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get session data by ID"""
        return self.sessions.get(session_id)

    def add_image(self, session_id: str, file_name: str, file_path: str, 
                 resolution: Optional[str] = None, source: Optional[str] = None,
                 metadata: Optional[Dict[str, Any]] = None) -> SessionImage:
        """Add image to session and return the created image object"""
        self.create_session(session_id)
        
        image_id = str(uuid.uuid4())
        image = SessionImage(
            image_id=image_id,
            file_name=file_name,
            file_path=file_path,
            resolution=resolution,
            source=source or "user_upload",
            metadata=metadata
        )
        
        self.sessions[session_id]["images"][image_id] = image
        return image
    
    def get_images(self, session_id: str, skip: int = 0, limit: int = 100) -> List[SessionImage]:
        """Get all images in a session with pagination"""
        if session_id not in self.sessions:
            return []
        
        images = list(self.sessions[session_id]["images"].values())
        # Apply pagination
        return images[skip:skip + limit]
    
    def get_image(self, session_id: str, image_id: str) -> Optional[SessionImage]:
        """Get specific image by ID"""
        if session_id not in self.sessions:
            return None
        
        return self.sessions[session_id]["images"].get(image_id)
    
    def add_annotation(self, session_id: str, image_id: str, file_path: str,
                      auto_generated: bool = False, model_id: Optional[str] = None) -> Optional[SessionAnnotation]:
        """Add annotation to session and return the created annotation object"""
        if session_id not in self.sessions or image_id not in self.sessions[session_id]["images"]:
            return None
            
        annotation_id = str(uuid.uuid4())
        annotation = SessionAnnotation(
            annotation_id=annotation_id,
            image_id=image_id,
            file_path=file_path,
            auto_generated=auto_generated,
            model_id=model_id
        )
        
        self.sessions[session_id]["annotations"][annotation_id] = annotation
        return annotation
    
    def get_annotations(self, session_id: str, image_id: Optional[str] = None) -> List[SessionAnnotation]:
        """Get annotations, optionally filtered by image_id"""
        if session_id not in self.sessions:
            return []
            
        annotations = list(self.sessions[session_id]["annotations"].values())
        
        # Filter by image_id if provided
        if image_id:
            annotations = [a for a in annotations if a.image_id == image_id]
            
        return annotations
    
    def get_annotation(self, session_id: str, annotation_id: str) -> Optional[SessionAnnotation]:
        """Get specific annotation by ID"""
        if session_id not in self.sessions:
            return None
            
        return self.sessions[session_id]["annotations"].get(annotation_id)
    
    def get_annotations_by_image(self, session_id: str, image_id: str) -> List[SessionAnnotation]:
        """Get all annotations for a specific image"""
        if session_id not in self.sessions:
            return []
        
        return [
            annotation for annotation in self.sessions[session_id]["annotations"].values()
            if annotation.image_id == image_id
        ]
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session and return True if successful"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False
    
    def export_session(self, session_id: str) -> Optional[Dict]:
        """Export session data as a dictionary"""
        return self.get_session(session_id)
    
    def import_session(self, session_id: str, data: Dict) -> bool:
        """Import session data from a dictionary"""
        if "images" in data and "annotations" in data:
            self.sessions[session_id] = data
            return True
        return False


# Global session store instance
session_store = SessionStore()
