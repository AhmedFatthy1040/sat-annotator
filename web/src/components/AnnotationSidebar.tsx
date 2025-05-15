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
  };
  return (
    <div className="bg-gray-50 border-r border-gray-200 p-4 flex flex-col h-full annotation-sidebar">
      <h3 className="text-lg font-medium mb-4">Annotation Tools</h3>
        {/* Instructions */}
      <div className="mb-6 text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-100">
        <p className="mb-2">Click on the object in the image to segment it, then select an object type from the list below.</p>
        <p>Use the export button to download the annotation in JSON format.</p>
      </div>
      
      {/* Object Type Selection */}
      <div className="mb-4">
        <h4 className="font-medium mb-2 text-gray-700">Object Types</h4>
        <div className="space-y-2">
          {OBJECT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => onObjectTypeSelect(type.id)}
              className={`w-full flex items-center px-3 py-2 rounded text-left ${
                activeType === type.id 
                  ? 'bg-gray-200 border-l-4 border-blue-500' 
                  : 'hover:bg-gray-100'
              }`}
              disabled={!isEditing}
            >
              <div className={`w-4 h-4 rounded-full mr-2 ${type.color}`}></div>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Custom Label */}
      <div className="mb-4">
        <h4 className="font-medium mb-2 text-gray-700">Custom Label</h4>
        <div className="flex space-x-2">
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Enter custom label"
            className="border rounded p-2 flex-grow text-sm"
            disabled={!isEditing}
          />
          <button
            onClick={() => {
              if (customLabel) {
                onObjectTypeSelect(`custom:${customLabel}`);
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm"
            disabled={!customLabel || !isEditing}
          >
            Add
          </button>
        </div>
      </div>
      
      {/* Existing Annotations */}
      <div className="mb-4">
        <h4 className="font-medium mb-2 text-gray-700">Existing Annotations</h4>
        {isLoadingAnnotations ? (
          <div className="text-sm text-gray-500">Loading annotations...</div>
        ) : existingAnnotations.length > 0 ? (
          <div className="max-h-40 overflow-y-auto border rounded">
            {existingAnnotations.map((annotation) => (
              <div 
                key={annotation.annotation_id} 
                className="p-2 text-sm border-b hover:bg-gray-100"
              >
                <p className="font-medium">
                  {annotation.object_type ? 
                    getObjectTypeLabel(annotation.object_type) : 
                    'Unlabeled'
                  }
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(annotation.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">No annotations yet</div>
        )}
      </div>
      
      {/* Segmentation Status */}
      <div className="mb-6">
        <h4 className="font-medium mb-2 text-gray-700">Status</h4>
        <div className="text-sm bg-gray-100 p-3 rounded">
          {segmentation ? (
            <div>
              <p>Segmentation active</p>
              <p className="text-xs text-gray-500 mt-1">Polygon points: {segmentation.polygon.length}</p>
              {activeType && (
                <p className="text-xs text-green-600 mt-1">
                  Type selected: {activeType.startsWith('custom:') 
                    ? activeType.substring(7) // Remove 'custom:' prefix
                    : OBJECT_TYPES.find(t => t.id === activeType)?.label || activeType
                  }
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No active segmentation</p>
          )}
        </div>
      </div>
        {/* Export Button */}
      <div className="mt-auto">
        {/* Debug info for developers */}
        <div className="text-xs text-gray-500 mb-1">
          Status: {!segmentation ? 'No segmentation' : !activeType ? 'No object type selected' : 'Ready to export'}
        </div>
        <button
          onClick={handleExport}
          disabled={!segmentation || !activeType || !segmentation?.polygon?.length}
          className={`w-full py-2 px-4 rounded font-medium ${
            segmentation && activeType && segmentation?.polygon?.length
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          Export Annotation
        </button>
      </div>
    </div>
  );
};
