import { useState, useEffect } from 'react';
import { Annotation } from './AnnotationCanvas';

interface RegionAttributesProps {
  annotation: Annotation | null;
  onUpdateLabel: (annotationId: string, label: string) => void;
}

export const RegionAttributes = ({ annotation, onUpdateLabel }: RegionAttributesProps) => {
  const [labelInput, setLabelInput] = useState<string>('');
  
  // Update the input field when the annotation changes
  useEffect(() => {
    if (annotation) {
      setLabelInput(annotation.label || '');
    } else {
      setLabelInput('');
    }
  }, [annotation]);
  
  // Handle applying the current label to selected annotation
  const handleApplyLabel = () => {
    if (annotation) {
      onUpdateLabel(annotation.id, labelInput);
    }
  };
  
  // Handle key press to apply label on enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && annotation) {
      handleApplyLabel();
    }
  };
  
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">Region Attributes</div>
      <div className="flex mb-1">
        <input
          type="text"
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Region label"
          className="flex-1 px-2 py-1 border rounded-l text-sm"
          disabled={!annotation}
        />
        <button
          onClick={handleApplyLabel}
          disabled={!annotation}
          className="bg-blue-500 text-white px-2 py-1 rounded-r text-sm disabled:bg-gray-300"
        >
          Apply
        </button>
      </div>
      <div className="text-xs text-gray-500">
        {annotation 
          ? "Edit the label and press Enter or click Apply" 
          : "Select a region first"}
      </div>
      
      {annotation && (
        <div className="mt-3 bg-white border rounded p-2">
          <div className="text-xs text-gray-500 mb-1">Region Info:</div>
          <div className="grid grid-cols-3 gap-1 text-xs">
            <div className="text-gray-500">Type:</div>
            <div className="col-span-2 capitalize">{annotation.type}</div>
            <div className="text-gray-500">Points:</div>
            <div className="col-span-2">{annotation.points.length}</div>
            <div className="text-gray-500">ID:</div>
            <div className="col-span-2 truncate">{annotation.id}</div>
          </div>
        </div>
      )}
    </div>
  );
};
