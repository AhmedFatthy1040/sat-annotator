import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
}

export const Tooltip = ({ content, children, position = 'top', delay = 300 }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Position mapping
  const positionClasses = {
    'top': 'bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 mb-2',
    'right': 'left-full top-1/2 transform -translate-y-1/2 translate-x-2 ml-2',
    'bottom': 'top-full left-1/2 transform -translate-x-1/2 translate-y-2 mt-2',
    'left': 'right-full top-1/2 transform -translate-y-1/2 -translate-x-2 mr-2'
  };
  
  // Arrow position classes
  const arrowClasses = {
    'top': 'bottom-0 left-1/2 transform translate-y-full -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800',
    'right': 'left-0 top-1/2 transform -translate-x-full -translate-y-1/2 border-t-4 border-r-4 border-b-4 border-transparent border-r-gray-800',
    'bottom': 'top-0 left-1/2 transform -translate-y-full -translate-x-1/2 border-l-4 border-b-4 border-r-4 border-transparent border-b-gray-800',
    'left': 'right-0 top-1/2 transform translate-x-full -translate-y-1/2 border-t-4 border-l-4 border-b-4 border-transparent border-l-gray-800'
  };
    // Handle mouse enter
  const handleMouseEnter = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    
    timerRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };
  
  // Handle mouse leave
  const handleMouseLeave = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    setIsVisible(false);
  };
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  // Adjust position if tooltip overflows viewport
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const tooltipRect = tooltip.getBoundingClientRect();
      
      // Check if tooltip is outside viewport
      const isOutsideRight = tooltipRect.right > window.innerWidth;
      const isOutsideLeft = tooltipRect.left < 0;
      const isOutsideTop = tooltipRect.top < 0;
      const isOutsideBottom = tooltipRect.bottom > window.innerHeight;
      
      // Adjust position if needed
      if (isOutsideRight) {
        tooltip.style.left = 'auto';
        tooltip.style.right = '0';
        tooltip.style.transform = 'translateY(-50%)';
      }
      
      if (isOutsideLeft) {
        tooltip.style.left = '0';
        tooltip.style.right = 'auto';
        tooltip.style.transform = 'translateY(-50%)';
      }
      
      if (isOutsideTop) {
        tooltip.style.top = '0';
        tooltip.style.bottom = 'auto';
        tooltip.style.transform = 'translateX(-50%)';
      }
      
      if (isOutsideBottom) {
        tooltip.style.top = 'auto';
        tooltip.style.bottom = '0';
        tooltip.style.transform = 'translateX(-50%)';
      }
    }
  }, [isVisible]);
  
  return (
    <div 
      className="inline-block relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={triggerRef}
    >
      {children}
      {isVisible && (
        <div 
          ref={tooltipRef}
          className={`absolute z-50 pointer-events-none ${positionClasses[position]}`}
        >
          <div className="bg-gray-800 text-white rounded py-1 px-2 shadow-lg text-sm whitespace-nowrap">
            {content}
          </div>
          <div className={`absolute w-0 h-0 ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
};
