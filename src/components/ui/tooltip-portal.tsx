import React from 'react';
import { createPortal } from 'react-dom';

interface TooltipPortalProps {
  isVisible: boolean;
  position: { x: number; y: number } | null;
  children: React.ReactNode;
}

export const TooltipPortal: React.FC<TooltipPortalProps> = ({ isVisible, position, children }) => {
  if (!isVisible || !position) return null;

  const tooltipElement = (
    <div
      className="fixed z-[99999] animate-fade-in pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)',
        zIndex: 99999
      }}
    >
      <div className="p-4 bg-white border rounded-lg shadow-xl w-64 relative">
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l border-t rotate-45"></div>
        {children}
      </div>
    </div>
  );

  return createPortal(tooltipElement, document.body);
};