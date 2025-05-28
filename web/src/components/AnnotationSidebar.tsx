import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Annotation {
  annotation_id: string;
  object_type?: string;
  created_at: string;
  auto_generated: boolean;
}

interface AnnotationSidebarProps {
  onObjectTypeSelect: (objectType: string) => void;
  segmentation: any | null;
  onExport: () => void;
  activeType: string;
  isEditing: boolean;
  imageId: string | null;
}

// Predefined object types commonly found in satellite imagery
const OBJECT_TYPES = [
  { id: 'building', label: 'Building', color: 'bg-red-500' },
  { id: 'road', label: 'Road', color: 'bg-blue-500' },
  { id: 'water', label: 'Water Body', color: 'bg-cyan-500' },
  { id: 'vegetation', label: 'Vegetation', color: 'bg-green-500' },
  { id: 'field', label: 'Agricultural Field', color: 'bg-yellow-500' },
  { id: 'industrial', label: 'Industrial', color: 'bg-purple-500' },
  { id: 'other', label: 'Other', color: 'bg-gray-500' },
];

export const AnnotationSidebar = ({ 
  onObjectTypeSelect, 
  segmentation, 
  onExport, 
  activeType,
  isEditing,
  imageId
}: AnnotationSidebarProps) => {
  const [customLabel, setCustomLabel] = useState<string>('');
  const [existingAnnotations, setExistingAnnotations] = useState<Annotation[]>([]);
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(false);
  
  // Debug logging for props
  useEffect(() => {
    console.log("AnnotationSidebar props updated:", { 
      segmentation: segmentation ? { 
        annotation_id: segmentation.annotation_id,
        hasPolygon: !!segmentation.polygon, 
        polygonLength: segmentation?.polygon?.length || 0 
      } : null,
      activeType,
      isEditing,
      imageId
    });
  }, [segmentation, activeType, isEditing, imageId]);
  
  // Fetch existing annotations for this image
  useEffect(() => {
    const fetchAnnotations = async () => {
      if (!imageId) {
        setExistingAnnotations([]);
        return;
      }
      
      try {
        setIsLoadingAnnotations(true);
        const annotations = await api.getAnnotationsForImage(imageId);
        setExistingAnnotations(annotations);
      } catch (error) {
        console.error("Failed to fetch annotations:", error);
      } finally {
        setIsLoadingAnnotations(false);
      }
    };
    
    fetchAnnotations();
  }, [imageId]);
  const handleExport = () => {
    console.log("Export clicked in sidebar", { 
      hasSegmentation: !!segmentation, 
      activeType,
      polygonExists: segmentation?.polygon?.length > 0,
      polygonLength: segmentation?.polygon?.length || 0
    });
    
    // Only proceed if we have the required data with enhanced checks
    if (segmentation && activeType && segmentation.polygon && segmentation.polygon.length > 0) {
      console.log("All export preconditions passed, calling onExport()");
      onExport();
    } else {
      const missingItems = [];
      if (!segmentation) missingItems.push("segmentation");
      else if (!segmentation.polygon) missingItems.push("polygon data");
      else if (!segmentation.polygon.length) missingItems.push("valid polygon points");
      if (!activeType) missingItems.push("selected object type");
      
      console.error(`Cannot export: missing ${missingItems.join(", ")}. Button should be disabled!`);
    }
  };

  const getObjectTypeLabel = (type: string) => {
    if (type.startsWith('custom:')) {
      return type.substring(7); // Remove 'custom:' prefix
    }
    return OBJECT_TYPES.find(t => t.id === type)?.label || type;
  };  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.997.997 0 01-1.414 0l-7-7A1.997 1.997 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Annotation Tools</h3>
        </div>
        <p className="text-sm text-gray-600">
          Analyze objects in satellite imagery with AI precision
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          {/* Instructions */}
          <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm">
                <p className="text-blue-900 font-medium mb-2">How to annotate:</p>
                <ol className="text-blue-800 space-y-1 text-xs">
                  <li>1. Click on an object in the image to segment it</li>
                  <li>2. Choose the appropriate object type below</li>
                  <li>3. Export your annotation when complete</li>
                </ol>
              </div>
            </div>
          </div>
          
          {/* Object Type Selection */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-2 h-2 bg-indigo-600 rounded-full mr-2"></span>
              Object Categories
            </h4>
            <div className="grid gap-2">
              {OBJECT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => onObjectTypeSelect(type.id)}
                  className={`group relative w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    activeType === type.id 
                      ? 'bg-indigo-100 border-2 border-indigo-500 shadow-md transform scale-[1.02]' 
                      : 'bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
                  }`}
                  disabled={!isEditing}
                >
                  <div className={`w-3 h-3 rounded-full mr-3 ${type.color} ${activeType === type.id ? 'ring-2 ring-white' : ''}`}></div>
                  <span className={`font-medium text-sm ${activeType === type.id ? 'text-indigo-900' : 'text-gray-700'}`}>
                    {type.label}
                  </span>
                  {activeType === type.id && (
                    <div className="ml-auto">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Custom Label */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-2 h-2 bg-purple-600 rounded-full mr-2"></span>
              Custom Label
            </h4>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Enter custom object type..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-colors bg-white"
                  disabled={!isEditing}
                />
              </div>
              <button                onClick={() => {
                  if (customLabel) {
                    onObjectTypeSelect(`custom:${customLabel}`);
                  }
                }}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!customLabel || !isEditing}
              >
                Add Custom Type
              </button>
            </div>
          </div>
          
          {/* Existing Annotations */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
              Existing Annotations
            </h4>
            {isLoadingAnnotations ? (
              <div className="flex items-center text-sm text-gray-500 py-3">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2"></div>
                Loading annotations...
              </div>
            ) : existingAnnotations.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {existingAnnotations.map((annotation) => (
                  <div 
                    key={annotation.annotation_id} 
                    className="p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-gray-900">
                        {annotation.object_type ? 
                          getObjectTypeLabel(annotation.object_type) : 
                          'Unlabeled'
                        }
                      </p>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        annotation.auto_generated 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {annotation.auto_generated ? 'AI' : 'Manual'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(annotation.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No annotations yet</p>
              </div>
            )}
          </div>
          
          {/* Segmentation Status */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-2 h-2 bg-orange-600 rounded-full mr-2"></span>
              Analysis Status
            </h4>
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
              {segmentation ? (
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <p className="text-sm font-medium text-gray-900">Segmentation Active</p>
                  </div>
                  <p className="text-xs text-gray-600 ml-4">
                    Detected {segmentation.polygon.length} boundary points
                  </p>
                  {activeType && (
                    <div className="flex items-center ml-4">
                      <svg className="w-3 h-3 text-green-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-xs text-green-700 font-medium">
                        Type: {activeType.startsWith('custom:') 
                          ? activeType.substring(7) 
                          : OBJECT_TYPES.find(t => t.id === activeType)?.label || activeType
                        }
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                  <p className="text-sm text-gray-600">Ready for analysis</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Export Button - Fixed at bottom */}
      <div className="px-6 py-6 border-t border-gray-200 bg-white">
        <div className="space-y-3">
          <div className="text-xs text-gray-500 text-center">
            {!segmentation ? 'Segment an object first' : 
             !activeType ? 'Select an object type' : 
             'Ready to export annotation'}
          </div>
          <button
            onClick={handleExport}
            disabled={!segmentation || !activeType || !segmentation?.polygon?.length}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
              segmentation && activeType && segmentation?.polygon?.length
                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {segmentation && activeType && segmentation?.polygon?.length ? (
              <span className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Export Annotation
              </span>
            ) : (
              'Export Annotation'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
