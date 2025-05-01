import { useState } from 'react';
import { Annotation } from './AnnotationCanvas';

interface AnnotationListProps {
  annotations: Annotation[];
  onDelete: (id: string) => void;
  onEdit?: (id: string, label: string) => void;
  onSelect?: (id: string) => void;
}

export const AnnotationList = ({ 
  annotations, 
  onDelete, 
  onEdit = () => {}, 
  onSelect = () => {} 
}: AnnotationListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');

  if (annotations.length === 0) {
    return <div className="text-sm text-gray-500 p-2">No annotations yet</div>;
  }

  const handleStartEdit = (annotation: Annotation) => {
    setEditingId(annotation.id);
    setNewLabel(annotation.label || '');
  };

  const handleSaveLabel = (id: string) => {
    onEdit(id, newLabel);
    setEditingId(null);
  };
  
  return (
    <div>
      <h3 className="font-medium mb-2">Annotations ({annotations.length})</h3>
      <div className="max-h-60 overflow-y-auto border rounded">
        {annotations.map((annotation) => (
          <div 
            key={annotation.id} 
            className={`p-2 border-b hover:bg-gray-50 ${annotation.isSelected ? 'bg-blue-50' : ''}`}
            onClick={() => onSelect(annotation.id)}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="font-medium capitalize">{annotation.type}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {annotation.points.length} points
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(annotation);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                  title="Edit label"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(annotation.id);
                  }}
                  className="text-red-600 hover:text-red-800"
                  title="Delete annotation"
                >
                  &times;
                </button>
              </div>
            </div>
            
            {/* Label input when editing */}
            {editingId === annotation.id ? (
              <div className="mt-1 flex">
                <input 
                  type="text"
                  value={newLabel} 
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="border rounded px-2 py-1 text-sm flex-grow"
                  placeholder="Enter label"
                  autoFocus
                />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveLabel(annotation.id);
                  }}
                  className="bg-blue-500 text-white px-2 py-1 text-sm rounded ml-2"
                >
                  Save
                </button>
              </div>
            ) : (
              annotation.label && (
                <div className="mt-1 text-sm bg-gray-100 px-2 py-1 rounded">
                  {annotation.label}
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
