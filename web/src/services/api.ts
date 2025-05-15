// Types
export interface Image {
  image_id: string; // Changed from number to string for session-based UUIDs
  file_name: string;
  file_path: string;
  resolution?: string;
  source?: string;
  capture_date: string;
  created_at: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  image?: Image;
}

export interface SegmentationRequest {
  image_id: string; // Changed from number to string for session-based UUIDs
  x: number;
  y: number;
}

export interface SegmentationResponse {
  success: boolean;
  polygon: number[][];
  annotation_id?: string;
  cached?: boolean; // Indicates if the segmentation was retrieved from cache
}

export interface AnnotationTypeRequest {
  image_id: string;
  annotation_id: string;
  object_type: string;
  polygon: number[][];
  custom_properties?: Record<string, any>;
}

export interface AnnotationResponse {
  success: boolean;
  annotation_id: string;
  message: string;
  file_path?: string;
}

// API URL configuration
// Use environment variable with fallback
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_URL = `${API_BASE_URL}/api`;

// API methods
export const api = {
  // Fetch all images
  async getImages(): Promise<Image[]> {
    const response = await fetch(`${API_URL}/images/`, {
      credentials: 'include', // Include cookies in the request
    });
    if (!response.ok) {
      throw new Error(`Error fetching images: ${response.statusText}`);
    }
    return response.json();
  },

  // Fetch a single image by ID
  async getImage(id: string): Promise<Image> {
    const response = await fetch(`${API_URL}/images/${id}/`, {
      credentials: 'include', // Include cookies in the request
    });
    if (!response.ok) {
      throw new Error(`Error fetching image ${id}: ${response.statusText}`);
    }
    return response.json();
  },
    // Upload a new image
  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/upload-image/`, {
      method: 'POST',
      body: formData,
      credentials: 'include', // Include cookies in the request
      // No Content-Type header needed as it's automatically set for FormData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error uploading image: ${response.statusText}`);
    }
    
    return response.json();
  },  // Create segmentation from a point
  async segmentFromPoint(request: SegmentationRequest): Promise<SegmentationResponse> {
    const response = await fetch(`${API_URL}/segment/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies in the request
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Error creating segmentation: ${response.statusText}`);
    }
    
    return response.json();
  },
  // Save an annotation with object type
  async saveAnnotationWithType(request: AnnotationTypeRequest): Promise<AnnotationResponse> {
    const response = await fetch(`${API_URL}/annotate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error saving annotation: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  // Get all annotations for an image
  async getAnnotationsForImage(imageId: string): Promise<any[]> {
    const response = await fetch(`${API_URL}/annotations/${imageId}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error getting annotations: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Get session info
  async getSessionInfo(): Promise<{session_id: string, image_count: number, annotation_count: number, created_at: string}> {
    const response = await fetch(`${API_URL}/session-info/`, {
      credentials: 'include', // Include cookies in the request
    });
    if (!response.ok) {
      throw new Error(`Error fetching session info: ${response.statusText}`);
    }
    return response.json();
  }
};