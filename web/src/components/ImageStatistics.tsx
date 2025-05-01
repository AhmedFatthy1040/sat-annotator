import { useState, useEffect } from 'react';
import { Annotation } from './AnnotationCanvas';

interface ImageStatisticsProps {
  annotations: Annotation[];
}

interface AnnotationStats {
  total: number;
  byType: Record<string, number>;
  byLabel: Record<string, number>;
  averagePoints: number;
}

export const ImageStatistics = ({ annotations }: ImageStatisticsProps) => {
  const [stats, setStats] = useState<AnnotationStats>({
    total: 0,
    byType: {},
    byLabel: {},
    averagePoints: 0
  });
  
  useEffect(() => {
    if (!annotations.length) {
      setStats({
        total: 0,
        byType: {},
        byLabel: {},
        averagePoints: 0
      });
      return;
    }
    
    // Count annotations by type
    const byType: Record<string, number> = {};
    const byLabel: Record<string, number> = {};
    let totalPoints = 0;
    
    annotations.forEach(ann => {
      // Count by type
      byType[ann.type] = (byType[ann.type] || 0) + 1;
      
      // Count by label
      const label = ann.label || 'unlabeled';
      byLabel[label] = (byLabel[label] || 0) + 1;
      
      // Add points
      totalPoints += ann.points.length;
    });
    
    const averagePoints = annotations.length > 0 
      ? Math.round((totalPoints / annotations.length) * 10) / 10
      : 0;
    
    setStats({
      total: annotations.length,
      byType,
      byLabel,
      averagePoints
    });
  }, [annotations]);
  
  return (
    <div className="p-3 bg-white rounded border border-gray-200 text-sm">
      <h3 className="font-medium mb-2 text-gray-700">Annotation Statistics</h3>
      
      {stats.total === 0 ? (
        <p className="text-gray-500 italic">No annotations yet</p>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Annotations</div>
            <div className="font-medium">{stats.total}</div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 mb-1">By Type</div>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span className="capitalize">{type}:</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          {Object.keys(stats.byLabel).length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1">By Label</div>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(stats.byLabel).map(([label, count]) => (
                  <div key={label} className="flex justify-between">
                    <span className="truncate" title={label}>
                      {label.length > 10 ? label.slice(0, 9) + '…' : label}:
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <div className="text-xs text-gray-500 mb-1">Avg. Points per Shape</div>
            <div className="font-medium">{stats.averagePoints}</div>
          </div>
        </div>
      )}
    </div>
  );
};
