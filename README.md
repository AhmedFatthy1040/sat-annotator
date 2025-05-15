<p align="center">
  <img src="docs/logo.png" alt="SAT-Annotator Logo" width="300"/>
</p>

# Satellite Image Annotation Tool

An AI-powered tool for automated and assisted annotation of satellite imagery.

## Project Overview

The Satellite Image Annotation Tool (SAT-Annotator) is designed to streamline the process of annotating satellite images using artificial intelligence. This tool helps researchers, GIS specialists, and remote sensing analysts to quickly identify, label, and extract features from satellite imagery.

## Sponsorship

This project is sponsored by the Egyptian Space Agency (EgSA).

## Features

**Current:**
- RESTful API built with FastAPI
- Session-based in-memory storage for image metadata (no database required)
- File upload endpoint for satellite imagery
- Image retrieval endpoint
- Docker containerization for easy deployment
- Local development support without Docker
- Automatic image metadata extraction (resolution)
- AI-powered segmentation using Segment Anything Model (SAM)
- Point-prompt based segmentation
- Automatic polygon generation from segmentation masks
- JSON export format with detailed metadata

**Planned:**
- Multiple prompt types (box, points, text)
- Manual annotation tools with intuitive UI
- Export annotations in additional formats (Shapefile)
- Model training on custom datasets

## Technology Stack

- **Backend**: Python, FastAPI
- **Storage**: Session-based in-memory storage
- **AI Models**: 
  - Segment Anything Model (SAM)
  - PyTorch
- **Image Processing**: 
  - OpenCV
  - Pillow
- **Containerization**: Docker (optional)
- **Data Processing**: NumPy
- **Frontend**: React, TypeScript, Tailwind CSS

## Installation & Setup

### Prerequisites

- Git
- Python 3.10+ (Python 3.12 recommended for local development)
- Node.js and npm (for frontend)
- Docker and Docker Compose (optional, for containerized deployment)
- CUDA-capable GPU (optional, for faster segmentation)

### Quick Start with Docker

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sat-annotator.git
cd sat-annotator
```

2. Build and run with Docker:
```bash
docker-compose up --build
```

3. Access the API at `http://localhost:8000` and the frontend at `http://localhost:5173`

### Local Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sat-annotator.git
cd sat-annotator
```

2. Download the SAM model:
   - Download the SAM model checkpoint from [https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth](https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth)
   - Place it in the `models/` directory

3. Set up Python environment:
```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install backend dependencies
pip install -r app/requirements_simplified.txt
pip install git+https://github.com/facebookresearch/segment-anything.git
```

4. Run the backend:
```bash
uvicorn app.main:app --reload
```

5. Set up and run the frontend (in a separate terminal):
```bash
cd web
npm install
npm run dev
```

6. Access the API at `http://localhost:8000` and the frontend at `http://localhost:5173`

## Usage

### Testing the API

#### Root Endpoint
```bash
curl http://localhost:8000/
```

Expected response:
```json
{
  "message": "Welcome to the Satellite Image Annotation Tool"
}
```

#### Upload an Image
```bash
curl -X POST http://localhost:8000/api/upload-image/ \
  -H "Content-Type: multipart/form-data" \
  -F "file=@./data/test_image.jpg"
```

Expected response:
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "image": {
    "file_name": "test_image.jpg",
    "file_path": "uploads/b1030d37-9fa8-4823-b5ad-43ee4cd22e5c.jpg",
    "resolution": "540x360",
    "source": "user_upload",
    "image_id": 1,
    "capture_date": "2025-02-26T19:43:14.121927",
    "created_at": "2025-02-26T19:43:14.121927"
  }
}
```

#### Retrieve All Images
```bash
curl http://localhost:8000/api/images/
```

Expected response:
```json
[
  {
    "file_name": "test_image.jpg",
    "file_path": "uploads/b1030d37-9fa8-4823-b5ad-43ee4cd22e5c.jpg",
    "resolution": "540x360",
    "source": "user_upload",
    "image_id": 1,
    "capture_date": "2025-02-26T19:43:14.121927",
    "created_at": "2025-02-26T19:43:14.121927"
  },
  {
    "file_name": "test_image.jpg",
    "file_path": "uploads/d8defaa1-f5c9-400f-86e7-f2ffc4ce0d3c.jpg",
    "resolution": "540x360", 
    "source": "user_upload",
    "image_id": 2,
    "capture_date": "2025-02-26T20:42:35.066164",
    "created_at": "2025-02-26T20:42:35.066164"
  }
]
```

#### Generate Segmentation
```bash
curl -X POST http://localhost:8000/api/segment/ \
  -H "Content-Type: application/json" \
  -d '{
    "image_id": 1,
    "x": 0.5,
    "y": 0.5
  }'
```

Expected response:
```json
{
  "success": true,
  "polygon": [[x1,y1], [x2,y2], ...],
  "annotation_id": 1
}
```

#### API Documentation
- Interactive API docs: http://localhost:8000/docs
- Alternative API docs: http://localhost:8000/redoc

## API Documentation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check, returns welcome message |
| `/api/upload-image/` | POST | Upload satellite imagery |
| `/api/images/` | GET | Retrieve list of all uploaded images |
| `/api/segment/` | POST | Generate segmentation from point prompt |

## Database Schema

The application uses PostgreSQL with the following structure:

- **images**: Stores metadata about uploaded satellite images
- **labels**: Contains annotation categories (building, road, etc.)
- **ai_models**: Tracks machine learning models used for annotation
- **annotation_files**: Records annotation data associated with images
  - New: Supports auto-generated annotations from SAM

Relationships:
- An image can have multiple annotation files
- Annotation files can be linked to AI models that generated them
- Annotations store GeoJSON formatted polygons

## Development Roadmap

- [x] Project setup with FastAPI
- [x] Docker containerization
- [x] Database integration with PostgreSQL
- [x] Image upload functionality
- [x] Image metadata extraction
- [x] SAM model integration
- [x] Point-prompt segmentation
- [x] GeoJSON export
- [ ] Multiple prompt types support
- [ ] Manual annotation interface
- [ ] Additional export formats
- [ ] User authentication

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Created by ...

---

*Note: This project is under active development. Features and API endpoints are subject to change.*