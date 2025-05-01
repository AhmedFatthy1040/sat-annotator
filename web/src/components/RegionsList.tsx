import { Annotation } from './AnnotationCanvas';

interface RegionsListProps {
  annotations: Annotation[];
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

export const RegionsList = ({ annotations, onDelete, onSelect }: RegionsListProps) => {
  const getAnnotationIcon = (type: string): string => {
    switch (type) {
      case 'rectangle': return '◻';
      case 'circle': return '○';
      case 'ellipse': return '⬭';
      case 'point': return '·';
      case 'polygon': return '▰';
      case 'polyline': return '⟓';
      case 'ai': return '🧠';
      default: return '?';
    }
  };

  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">Regions List ({annotations.length})</div>
      <div className="border rounded overflow-y-auto max-h-80">
        {annotations.length === 0 ? (
          <div className="text-sm text-gray-500 p-3 text-center">
            No regions created yet
            <div className="text-xs mt-1 text-gray-400">
              Use the tools above to create annotations
            </div>
          </div>
        ) : (
          <div>
            {annotations.map((ann) => (
              <div 
                key={ann.id}
                className={`p-2 border-b text-sm cursor-pointer
                  ${ann.isSelected ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                onClick={() => onSelect(ann.id)}
              >
                <div className="flex justify-between">
                  <div>
                    <span className="font-medium">
                      <span className="inline-block w-5 text-center mr-1">
                        {getAnnotationIcon(ann.type)}
                      </span>
                      <span className="capitalize">{ann.type}</span>
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      {ann.points.length} pts
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(ann.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                    title="Delete region"
                  >
                    ×
                  </button>
                </div>
                {ann.label && (
                  <div className="mt-1 text-xs bg-gray-100 px-1 py-0.5 rounded truncate">
                    {ann.label}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
