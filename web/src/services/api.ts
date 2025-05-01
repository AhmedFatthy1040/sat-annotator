export interface Image {
  image_id: string; // Changed from number to string for session-based UUIDs
  file_name: string;
  file_path: string;
  resolution?: string;
  source?: string;
  capture_date: string;
  created_at: string;
  width?: number;
  height?: number;
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

export interface SessionInfo {
  session_id: string;
  created_at: string;
  image_count: number;
  annotation_count: number;
}

// API methods
export const api = {
  // Fetch all images
  async getImages(): Promise<Image[]> {
    const response = await fetch(`/api/images/`, {
      credentials: 'include', // Include cookies in the request
    });
    if (!response.ok) {
      throw new Error(`Error fetching images: ${response.statusText}`);
    }
    return response.json();
  },

  // Fetch a single image by ID
  async getImage(id: string): Promise<Image> {
    const response = await fetch(`/api/images/${id}/`, {
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
    
    // Add a timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout
    
    try {
      const response = await fetch(`/api/upload-image/`, {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies in the request
        signal: controller.signal,
        // No Content-Type header needed as it's automatically set for FormData
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error uploading image: ${response.statusText}`);
      }
      
      return response.json();    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Upload timed out. Please try again with a smaller file or check your connection.');
      }
      throw error;
    }
  },
    
  // Delete an image
  async deleteImage(id: string): Promise<void> {
    const response = await fetch(`/api/images/${id}/`, {
      method: 'DELETE',
      credentials: 'include', // Include cookies in the request
    });
    if (!response.ok) {
      throw new Error(`Error deleting image ${id}: ${response.statusText}`);
    }
  },
    
  // Perform segmentation on a point in an image
  async segmentFromPoint(request: SegmentationRequest): Promise<SegmentationResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout
    
    try {
      const response = await fetch(`/api/segment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        credentials: 'include', // Include cookies in the request
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Error performing segmentation: ${response.statusText}`);
      }
      
      return response.json();    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Segmentation request timed out. Please try again or use manual annotation.');
      }
      throw error;
    }
  },
    
  // Get session information
  async getSessionInfo(): Promise<SessionInfo> {
    const response = await fetch(`/api/session-info/`, {
      credentials: 'include', // Include cookies in the request
    });
    if (!response.ok) {
      throw new Error(`Error fetching session info: ${response.statusText}`);
    }
    return response.json();
  }
};