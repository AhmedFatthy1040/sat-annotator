from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class Image(Base):
    __tablename__ = "images"
    
    image_id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    resolution = Column(String(50))
    capture_date = Column(DateTime, server_default=func.now())
    source = Column(String(100))
    metadata = Column(JSON, nullable=True)  # Store TIFF and other image metadata
    created_at = Column(DateTime, server_default=func.now())
    
    annotations = relationship("AnnotationFile", back_populates="image")

class AIModel(Base):
    __tablename__ = "ai_models"
    
    model_id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(255), nullable=False)
    version = Column(String(50))
    trained_on = Column(Text)
    accuracy = Column(Float)
    created_at = Column(DateTime, server_default=func.now())
    
    annotations = relationship("AnnotationFile", back_populates="model")

class AnnotationFile(Base):
    __tablename__ = "annotation_files"
    
    annotation_id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.image_id", ondelete="CASCADE"))
    file_path = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    auto_generated = Column(Boolean, default=False)
    model_id = Column(Integer, ForeignKey("ai_models.model_id", ondelete="SET NULL"), nullable=True)
    
    image = relationship("Image", back_populates="annotations")
    model = relationship("AIModel", back_populates="annotations")

class Label(Base):
    __tablename__ = "labels"
    
    label_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)