from fastapi import FastAPI
from app.routers import session_images, session_segmentation
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os

# Determine if we're running in Docker or locally
in_docker = os.path.exists('/.dockerenv')

# Set paths based on environment
base_path = Path("/app") if in_docker else Path(".")

# Ensure uploads directory exists
uploads_dir = base_path / "uploads"
uploads_dir.mkdir(exist_ok=True)

# Ensure annotations directory exists
annotations_dir = base_path / "annotations"
annotations_dir.mkdir(exist_ok=True)

# Define frontend directory for static files (if available)
frontend_dir = base_path / "web/dist"

app = FastAPI(title="Satellite Image Annotation Tool")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins - adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint for Docker container orchestration
@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Include session-based routers
app.include_router(session_images.router, prefix="/api", tags=["images"])
app.include_router(session_segmentation.router, prefix="/api", tags=["segmentation"])

# Mount the uploads directory for static file serving
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Mount frontend if the build directory exists
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
else:
    @app.get("/")
    def read_root():
        return {"message": "Welcome to the Satellite Image Annotation Tool (API Only Mode)"}
        
    @app.get("/frontend-status")
    def frontend_status():
        return {"status": "not_mounted", "message": "Frontend build not found. Run 'npm run build' in the web directory."}