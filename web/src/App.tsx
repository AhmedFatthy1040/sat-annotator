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
  };    return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 relative">
        <header className="mb-12 text-center">
          <div className="inline-block mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Satellite Image Annotator
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Harness the power of AI to analyze and annotate satellite imagery with precision and ease
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
              className="group mb-6 inline-flex items-center px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-gray-300"
            >
              <svg className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Gallery
            </button>
            
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm bg-white/80 border border-gray-200">
              <div className="flex flex-col lg:flex-row min-h-[600px]">                {/* Sidebar */}
                <div className="lg:w-80 border-r border-gray-200 bg-gradient-to-b from-gray-50 to-white">
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
                <div className="flex-1 p-8 bg-gray-50/30">
                  <div className="h-full flex flex-col">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Image Analysis</h2>
                      <p className="text-gray-600">Click on the image to perform AI-powered segmentation</p>
                    </div>
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <ImageViewer 
                        imageId={selectedImageId} 
                        onSegmentationChange={handleSegmentationUpdate}
                        selectedObjectType={objectType}
                        onExportRef={handleExportRef}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>      ) : (
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-gray-200">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Image Gallery</h2>
              <p className="text-gray-600 text-lg">Choose an image to start analyzing</p>
            </div>
            <ImageGallery onSelectImage={setSelectedImageId} />
          </div>
        </div>
      )}
      
      <footer className="mt-16 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-500 text-lg mb-4">
            Click on an image to unlock AI-powered segmentation capabilities
          </p>
          <div className="border-t border-gray-200 pt-6">
            <p className="text-gray-400 text-sm">
              © 2025 Satellite Image Annotation Tool
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Powered by Segment Anything Model & Advanced Computer Vision
            </p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  )
}

export default App
