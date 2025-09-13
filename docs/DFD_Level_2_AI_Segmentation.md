# SAT-Annotator - Level 2 Data Flow Diagram

This diagram provides detailed breakdown of the AI Segmentation process (Process 3.0), which is the most complex part of the system.

## Level 2 DFD - AI Segmentation Process (3.0)

```mermaid
graph TB    %% External to this process
    User["👤 User"]
    DS1[("D1 Session Store")]
    DS2[("D2 Image Cache")]
    SAMModel["🤖 SAM AI Model"]
    
    %% Sub-processes of 3.0 AI Segmentation
    P31["3.1 🔍 Image Loading & Validation"]
    P32["3.2 🧠 Image Embedding Generation"]
    P33["3.3 📍 Point Prompt Processing"]
    P34["3.4 🎯 Mask Prediction & Generation"]
    P35["3.5 🔗 Polygon Conversion & Optimization"]
    P36["3.6 💾 Result Storage & Caching"]
      %% Input flows
    User -->|"Point Coordinates (x,y)"| P33
    DS1 -->|"Image Metadata & File Path"| P31
    
    %% Process flow
    P31 -->|"Validated Image Array Data"| P32
    P32 -->|"Image Embeddings"| P34
    P33 -->|"Processed Points Labels"| P34
    P34 -->|"Raw Masks Confidence Scores"| P35
    P35 -->|"Polygon Coordinates Simplified Shapes"| P36
    
    %% Cache interactions
    P32 -->|"Store Embeddings"| DS2
    DS2 -->|"Cached Embeddings (if available)"| P32
    P36 -->|"Cache Results"| DS2
    
    %% External model interaction
    P32 -->|"Image Data"| SAMModel
    SAMModel -->|"Feature Embeddings"| P32
    P34 -->|"Embeddings + Prompts"| SAMModel
    SAMModel -->|"Segmentation Masks"| P34
    
    %% Storage and output
    P36 -->|"Annotation Metadata"| DS1
    P36 -->|"Segmentation Results Polygon Data"| User
    
    %% Error flows
    P31 -->|"Validation Errors"| User
    P32 -->|"Model Load Errors"| User
    P34 -->|"Segmentation Errors"| User
    
    %% Styling
    classDef userStyle fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef processStyle fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef datastoreStyle fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef externalStyle fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef errorStyle fill:#ffebee,stroke:#c62828,stroke-width:2px,stroke-dasharray: 5 5
    
    class User userStyle
    class P31,P32,P33,P34,P35,P36 processStyle
    class DS1,DS2 datastoreStyle
    class SAMModel externalStyle
```

## Sub-Process Descriptions

### 3.1 Image Loading & Validation
- **Purpose**: Load and validate images for AI processing
- **Inputs**: 
  - Image metadata and file path from Session Store (D1)
- **Processing**:
  - Validate image file exists and is readable
  - Load image data into memory
  - Convert to required format (RGB arrays)
  - Validate image dimensions and format
- **Outputs**: 
  - Validated image array data → Process 3.2
  - Validation errors → User (if any)

### 3.2 Image Embedding Generation
- **Purpose**: Generate or retrieve cached image embeddings for SAM model
- **Inputs**: 
  - Validated image data from Process 3.1
  - Cached embeddings from Image Cache (D2) if available
- **Processing**:
  - Check cache for existing embeddings
  - If not cached, send image to SAM model for embedding
  - Store new embeddings in cache
- **Outputs**: 
  - Image embeddings → Process 3.4
  - Model load errors → User (if any)
- **External**: SAM Model for embedding generation

### 3.3 Point Prompt Processing
- **Purpose**: Process and validate user-provided point prompts
- **Inputs**: 
  - Point coordinates (x, y) from User
- **Processing**:
  - Validate coordinates are within image bounds
  - Convert web coordinates to image coordinates
  - Assign point labels (foreground/background)
  - Format prompts for SAM model
- **Outputs**: 
  - Processed points and labels → Process 3.4

### 3.4 Mask Prediction & Generation
- **Purpose**: Generate segmentation masks using SAM model
- **Inputs**: 
  - Image embeddings from Process 3.2
  - Processed points and labels from Process 3.3
- **Processing**:
  - Combine embeddings with point prompts
  - Send to SAM model for mask prediction
  - Receive multiple mask candidates with confidence scores
  - Select best mask based on confidence
- **Outputs**: 
  - Raw segmentation masks and confidence scores → Process 3.5
  - Segmentation errors → User (if any)
- **External**: SAM Model for mask prediction

### 3.5 Polygon Conversion & Optimization
- **Purpose**: Convert binary masks to polygon coordinates
- **Inputs**: 
  - Raw segmentation masks and confidence scores from Process 3.4
- **Processing**:
  - Find contours in binary mask
  - Convert contours to polygon coordinates
  - Simplify polygons (reduce vertex count)
  - Filter out small artifacts
  - Convert coordinates back to web format
- **Outputs**: 
  - Polygon coordinates and simplified shapes → Process 3.6

### 3.6 Result Storage & Caching
- **Purpose**: Store results and manage caching
- **Inputs**: 
  - Polygon coordinates from Process 3.5
- **Processing**:
  - Generate annotation metadata
  - Cache results for potential reuse
  - Prepare response format
- **Outputs**: 
  - Annotation metadata → Session Store (D1)
  - Cached results → Image Cache (D2)
  - Final segmentation results → User

## Data Flow Details

### Critical Paths:
1. **First-time segmentation**: 3.1 → 3.2 → SAM → 3.4 → SAM → 3.5 → 3.6
2. **Cached segmentation**: 3.1 → 3.2 (cache hit) → 3.4 → SAM → 3.5 → 3.6
3. **Error handling**: Each process → User (for respective error types)

### Performance Optimizations:
- **Embedding Cache**: Process 3.2 caches expensive image embeddings
- **Result Cache**: Process 3.6 caches final results
- **Async Processing**: Multiple point prompts can be processed in parallel

### Error Handling:
- Image validation errors (corrupt files, unsupported formats)
- Model loading errors (missing SAM checkpoint, CUDA issues)
- Segmentation errors (invalid prompts, model failures)

## Technical Implementation Notes

This Level 2 DFD corresponds to the following code components:
- **Process 3.1-3.6**: `app/utils/sam_model.py` - SAMSegmenter class
- **Process 3.3**: `app/routers/session_segmentation.py` - Point prompt handling
- **Cache D2**: SAMSegmenter.cache dictionary
- **Session Store D1**: `app/storage/session_store.py` - SessionStore class
