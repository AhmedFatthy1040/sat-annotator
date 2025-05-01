export type AnnotationTool = 
  | 'pointer' 
  | 'rectangle' 
  | 'circle' 
  | 'ellipse' 
  | 'point' 
  | 'polygon' 
  | 'polyline' 
  | 'ai';

interface AnnotationToolbarProps {
  onSelectTool: (tool: AnnotationTool) => void;
  selectedTool: AnnotationTool;
}

export const AnnotationToolbar = ({ onSelectTool, selectedTool }: AnnotationToolbarProps) => {
  const tools: { id: AnnotationTool, label: string, icon: string, shortcut?: string }[] = [
    { id: 'pointer', label: 'Select', icon: '✓', shortcut: 'V' },
    { id: 'rectangle', label: 'Rect', icon: '◻', shortcut: 'R' },
    { id: 'circle', label: 'Circle', icon: '○', shortcut: 'C' },
    { id: 'ellipse', label: 'Ellipse', icon: '⬭', shortcut: 'E' },
    { id: 'point', label: 'Point', icon: '·', shortcut: 'P' },
    { id: 'polygon', label: 'Polygon', icon: '▰', shortcut: 'G' },
    { id: 'polyline', label: 'Polyline', icon: '⟓', shortcut: 'L' },
    { id: 'ai', label: 'AI Segment', icon: '🧠', shortcut: 'A' },
  ];

  return (
    <div className="flex flex-wrap gap-1 mb-2">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onSelectTool(tool.id)}
          className={`p-1 rounded ${
            selectedTool === tool.id
              ? 'bg-blue-500 text-white'
              : 'bg-white hover:bg-gray-100 text-gray-700 border'
          } text-xs flex flex-col items-center justify-center w-14 h-14 relative transition-colors`}
          title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
        >
          <span className="text-lg mb-1">{tool.icon}</span>
          <span className="text-[10px] truncate w-full">{tool.label}</span>
          {tool.shortcut && (
            <span className="absolute top-0 right-0 bg-gray-100 text-gray-500 text-[8px] px-1 rounded-bl">
              {tool.shortcut}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
