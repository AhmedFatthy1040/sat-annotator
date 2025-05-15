import { useState, useCallback, useRef } from 'react'
import './App.css'
import { ImageGallery } from './components/ImageGallery'
import { ImageViewer } from './components/ImageViewer'
import { AnnotationSidebar } from './components/AnnotationSidebar'

function App() {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [segmentation, setSegmentation] = useState<any | null>(null);
  const [objectType, setObjectType] = useState<string>('');
  const [isEditingAnnotation, setIsEditingAnnotation] = useState<boolean>(false);
  
  // Reference to the ImageViewer's export function
  const exportAnnotationRef = useRef<(() => Promise<void>) | null>(null);
  
  const handleSegmentationUpdate = (segData: any) => {
    setSegmentation(segData);
    setIsEditingAnnotation(!!segData);
  };
  
  // Store the reference to the export function
  const handleExportRef = useCallback((exportFn: () => Promise<void>) => {
    exportAnnotationRef.current = exportFn;
  }, []);  // Call the ImageViewer's export function when the user clicks the sidebar export button
  const handleExport = async () => {
    // Enhanced debugging with detailed segmentation info
    console.log("Export button clicked in sidebar", { 
      hasSegmentation: !!segmentation, 
      segmentationDetails: segmentation ? {
        annotation_id: segmentation.annotation_id,
        hasPolygon: !!segmentation.polygon,
        polygonLength: segmentation?.polygon?.length || 0,
      } : null,
      objectType, 
      hasExportFunction: !!exportAnnotationRef.current 
    });
    
    // Make absolutely sure we have valid data before proceeding
    if (!segmentation) {
      console.error("Error: Segmentation is missing");
      return;
    }
    
    if (!segmentation.polygon || segmentation.polygon.length === 0) {
      console.error("Error: Segmentation polygon is missing or empty");
      return;
    }
    
    if (!objectType) {
      console.error("Error: Object type is not selected");
      return;
    }
    
    if (!exportAnnotationRef.current) {
      console.error("Error: Export function reference is not available");
      return;
    }
    
    // Only proceed if all preconditions are met
    try {
      console.log("Calling export function with segmentation and objectType", {
        objectType,
        polygonLength: segmentation.polygon.length
      });
      
      // Call the export function from ImageViewer
      await exportAnnotationRef.current();
    } catch (error) {
      console.error("Error exporting annotation:", error);
    }
  };
    return (
    <div className="container mx-auto px-4 py-8 relative">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Satellite Image Annotator</h1>
        <p className="text-gray-600">
          Select an image to view and segment using AI-powered tools
        </p>
      </header>
      
      {selectedImageId ? (
        <div className="mb-8">
          <button
            onClick={() => {
              setSelectedImageId(null);
              setSegmentation(null);
              setObjectType('');
              setIsEditingAnnotation(false);
            }}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
          >
            ← Back to Gallery
          </button>          <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-lg text-gray-800 sidebar-layout">
            {/* Sidebar */}
            <div className="md:w-1/4 border-r border-gray-200 annotation-sidebar-container">
              <AnnotationSidebar 
                onObjectTypeSelect={setObjectType}
                segmentation={segmentation}
                onExport={handleExport}
                activeType={objectType}
                isEditing={isEditingAnnotation}
                imageId={selectedImageId}
              />
            </div>
              {/* Main content */}
            <div className="p-6 md:w-3/4 image-viewer-container">
              <h2 className="text-xl font-bold mb-4 text-gray-900">Image Viewer</h2>
              <ImageViewer 
                imageId={selectedImageId} 
                onSegmentationChange={handleSegmentationUpdate}
                selectedObjectType={objectType}
                onExportRef={handleExportRef}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-lg text-gray-800">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Image Gallery</h2>
          <ImageGallery onSelectImage={setSelectedImageId} />
        </div>
      )}
      
      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>Click on an image to select it for segmentation</p>
        <p className="mt-2">
          © 2025 Satellite Image Annotation Tool - Powered by Segment Anything Model
        </p>
      </footer>
    </div>
  )
}

export default App
