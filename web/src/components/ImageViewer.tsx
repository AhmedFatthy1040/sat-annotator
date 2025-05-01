import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { Image, SegmentationResponse } from '../services/api';
import { AnnotationToolbar, AnnotationTool } from './AnnotationToolbar';
import { AnnotationCanvas, Annotation } from './AnnotationCanvas';
import ProjectEditor from './ProjectEditor';

interface ImageViewerProps {
  imageId: string;
}

export const ImageViewer = ({ imageId }: ImageViewerProps) => {  // Main state
  const [image, setImage] = useState<Image | null>(null);
  const [selectedTool, setSelectedTool] = useState<AnnotationTool>('pointer');
  // Remove sidebar toggle - sidebar will always be visible
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  
  // Segmentation state
  const [segmentation, setSegmentation] = useState<SegmentationResponse | null>(null);
  const [hasSegmented, setHasSegmented] = useState(false);
    // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // The AnnotationCanvas will handle the canvas references internally
  
  // Load image data with error handling
  useEffect(() => {
    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(null);
        const imageData = await api.getImage(imageId);
        setImage(imageData);
        // Reset segmentation state for new image
        setSegmentation(null);
        setHasSegmented(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [imageId]);

  // Handle annotations from canvas
  const handleUpdateAnnotations = (newAnnotations: Annotation[]) => {
    setAnnotations(newAnnotations);
  };
    // Handle status messages from canvas
  const handleStatusMessage = (message: string | null) => {
    setStatusMessage(message);
    if (message) {
      // Keep success messages visible slightly longer
      const timeout = message.includes('success') ? 4000 : 3000;
      setTimeout(() => setStatusMessage(null), timeout);
    }
  };
  
  // Handle loading state from canvas
  const handleLoading = (isLoading: boolean) => {
    setLoading(isLoading);
  };
    // Handle errors from canvas
  const handleError = (errorMessage: string | null) => {
    setError(errorMessage);
  };
  
  // Handle annotation deletion
  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    handleStatusMessage("Annotation deleted");
  };
  // Handle segmentation updates from canvas
  const handleUpdateSegmentation = (segResult: SegmentationResponse) => {
    setSegmentation(segResult);
    setHasSegmented(true);
  };
  
  // Get the direct image URL from the API response
  let imageUrl = '';
  if (image) {
    // Directly use the path from the API
    imageUrl = `/${image.file_path}`;
  }
    return (
    <div className="flex flex-col h-full w-full bg-gray-100 overflow-hidden">
      {/* Top toolbar */}      <div className="bg-gray-800 text-white p-2 flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          <div className="text-base font-semibold">Image Annotator</div>
          
          <div className="border-l border-gray-600 h-6 mx-2"></div>
          
          <div>
            <span className="text-sm">Current tool: </span>
            <span className="font-semibold capitalize">{selectedTool}</span>
            {selectedTool === 'ai' && 
              <span className="ml-2 text-xs bg-blue-500 px-1.5 py-0.5 rounded">SAM</span>
            }
          </div>
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center space-x-3">
          {loading && (
            <div className="text-xs bg-blue-600 py-1 px-2 rounded flex items-center">
              <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </div>
          )}
          
          {statusMessage && (
            <div className="text-xs bg-gray-700 py-1 px-2 rounded">
              {statusMessage}
            </div>
          )}
          
          {error && (
            <div className="text-xs bg-red-600 py-1 px-2 rounded">
              Error: {error}
            </div>
          )}
        </div>
      </div>      {/* Main content */}
      <div className="flex flex-1 overflow-hidden w-full h-full">
        {/* Left sidebar - always visible */}
        <div className="w-64 min-w-[16rem] bg-gray-100 border-r border-gray-300 flex flex-col">
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-4">
                {/* Annotation Tools Section */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Annotation Tools</div>
                  <AnnotationToolbar 
                    selectedTool={selectedTool}
                    onSelectTool={setSelectedTool}
                  />
                  <div className="text-xs text-gray-800 mt-2 bg-blue-50 p-2 rounded shadow-sm">
                    {selectedTool === 'pointer' && 'Select and move annotations. Use the scroll wheel to zoom and middle-click to pan.'}
                    {selectedTool === 'ai' && (
                      <div>
                        <p>Left-click anywhere to generate AI segmentation with SAM.</p>
                        {hasSegmented && <p className="text-green-600 mt-1 font-medium">Subsequent clicks will use cached results for faster processing</p>}
                      </div>
                    )}
                    {(selectedTool === 'polygon' || selectedTool === 'polyline') && (
                      'Click to add points. Click near the starting point to complete.'
                    )}
                    {(selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'ellipse') && (
                      'Click and drag to create shape.'
                    )}
                    {selectedTool === 'point' && 'Click to place point annotation.'}
                  </div>
                </div>
                  {/* Saved Annotations Section */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Saved Annotations ({annotations.length})</div>
                  <div className="max-h-40 overflow-y-auto border rounded bg-white shadow-sm">                    {annotations.length === 0 ? (
                      <div className="p-2 text-xs text-gray-500">No annotations yet</div>
                    ) : (
                      <div>
                        {annotations.map(annotation => (
                          <div 
                            key={annotation.id} 
                            className={`px-2 py-1 border-b text-xs hover:bg-gray-100 cursor-pointer ${
                              annotation.isSelected ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span 
                                  className={`w-2 h-2 rounded-full mr-1 ${
                                    annotation.type === 'polygon' ? 'bg-green-500' : 
                                    annotation.type === 'rectangle' ? 'bg-blue-500' :
                                    annotation.type === 'circle' ? 'bg-purple-500' :
                                    'bg-gray-500'
                                  }`}
                                ></span>
                                <span className="font-medium capitalize">{annotation.type}</span>
                              </div>
                              <div className="flex items-center space-x-1">                                <span className="text-gray-500">{annotation.label || 'Unlabeled'}</span>
                                <button 
                                  onClick={() => handleDeleteAnnotation(annotation.id)}
                                  className="text-red-500 hover:text-red-700" 
                                  title="Delete annotation"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                  {/* AI Segmentation Results Section */}
                {segmentation && (
                  <div className="pt-3 border-t mt-2">
                    <div className="text-sm font-medium text-gray-700 mb-2">Segmentation Results</div>
                    <div className="border rounded bg-white p-2 text-xs shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span>Annotation ID:</span>
                        <span className="font-mono">{segmentation.annotation_id || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span>Polygon points:</span>
                        <span>{segmentation.polygon?.length || 0}</span>
                      </div>
                      {segmentation.cached && (
                        <div className="mt-1 text-green-600 font-medium text-center">
                          Retrieved from cache
                        </div>
                      )}
                    </div>
                  </div>
                )}
                  {/* Project Editor Section */}
                <div className="pt-3 border-t mt-2">
                  <div className="flex items-center mb-2">
                    <div className="text-sm font-medium text-gray-700">Project Editor</div>
                    <div className="text-xs ml-2 text-blue-600 font-medium">(EgSA)</div>
                  </div>
                  <div className="border rounded bg-white p-2 shadow-sm">
                    <ProjectEditor onSelectImage={(id) => console.log(`Selected image with ID: ${id}`)} />
                  </div>                </div>
              </div>
            </div>
          </div>
          
          {/* Main canvas area */}        <div className="flex-1 relative bg-gray-800 overflow-hidden w-full h-full" ref={containerRef}>
          {image && (
            <AnnotationCanvas
              imageId={imageId}
              tool={selectedTool}
              imageUrl={imageUrl}
              onStatusMessage={handleStatusMessage}
              onLoading={handleLoading}
              onError={handleError}
              onUpdateAnnotations={handleUpdateAnnotations}
              onUpdateSegmentation={handleUpdateSegmentation}
            />
          )}
          
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-10">
              <div className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg shadow-lg">
                {hasSegmented ? 'Processing...' : 'Segmenting image (first click may take longer)...'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}