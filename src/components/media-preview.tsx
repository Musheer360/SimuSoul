'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, FileText, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMediaType, type MediaType } from '@/lib/constants';

interface MediaPreviewProps {
  src: string;
  alt: string;
  mimeType: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MediaPreview({ src, alt, mimeType, isOpen, onClose }: MediaPreviewProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [initialScale, setInitialScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const mediaType = getMediaType(mimeType);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
      setInitialDistance(null);
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Calculate distance between two touch points
  const getDistance = (touches: React.TouchList): number => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  // Handle pinch zoom start (only for images)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (mediaType !== 'image') return;
    
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = getDistance(e.touches);
      setInitialDistance(distance);
      setInitialScale(scale);
    } else if (e.touches.length === 1 && scale > 1) {
      // Start dragging when zoomed in
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  // Handle pinch zoom move (only for images)
  const handleTouchMove = (e: React.TouchEvent) => {
    if (mediaType !== 'image') return;
    
    if (e.touches.length === 2 && initialDistance !== null) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches);
      const scaleChange = currentDistance / initialDistance;
      const newScale = Math.min(Math.max(initialScale * scaleChange, 0.5), 5);
      setScale(newScale);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    setInitialDistance(null);
    setIsDragging(false);
    
    // Reset position if scale is 1 or less
    if (scale <= 1) {
      setPosition({ x: 0, y: 0 });
      setScale(1);
    }
  };

  // Handle mouse wheel zoom (only for images)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (mediaType !== 'image') return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.5), 5);
    setScale(newScale);
    
    // Reset position if scale is 1 or less
    if (newScale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale, mediaType]);

  // Handle mouse drag for panning when zoomed (only for images)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mediaType !== 'image') return;
    
    if (scale > 1) {
      e.preventDefault(); // Prevent unwanted text selection or default drag behavior
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Block right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // Handle backdrop click to close (only when not zoomed or at edges)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current && scale <= 1) {
      onClose();
    }
  };

  // Double tap/click to toggle zoom (only for images)
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (mediaType !== 'image') return;
    
    e.preventDefault();
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  if (!isOpen) return null;

  const renderMedia = () => {
    switch (mediaType) {
      case 'image':
        return (
          <div
            className={cn(
              "relative max-w-full max-h-full flex items-center justify-center",
              isDragging ? "cursor-grabbing" : scale > 1 ? "cursor-grab" : "cursor-default"
            )}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            style={{ touchAction: 'none' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={mediaRef as React.RefObject<HTMLImageElement>}
              src={src}
              alt={alt}
              className="max-w-[95vw] max-h-[95vh] object-contain select-none pointer-events-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
              draggable={false}
              onContextMenu={handleContextMenu}
            />
          </div>
        );

      case 'video':
        return (
          <div
            className="relative max-w-full max-h-full flex items-center justify-center"
            onContextMenu={handleContextMenu}
          >
            <video
              ref={videoRef}
              src={src}
              controls
              autoPlay
              className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg"
              controlsList="nodownload"
              onContextMenu={handleContextMenu}
            />
          </div>
        );

      case 'audio':
        return (
          <div
            className="flex flex-col items-center justify-center gap-6 p-8"
            onContextMenu={handleContextMenu}
          >
            <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center">
              <Music className="w-16 h-16 text-white/70" />
            </div>
            <p className="text-white/80 text-lg font-medium max-w-[80vw] text-center truncate">{alt}</p>
            <audio
              src={src}
              controls
              autoPlay
              className="w-full max-w-md"
              controlsList="nodownload"
              onContextMenu={handleContextMenu}
            />
          </div>
        );

      case 'document':
        return (
          <div
            className="flex flex-col items-center justify-center gap-6 p-8"
            onContextMenu={handleContextMenu}
          >
            <div className="w-32 h-32 rounded-2xl bg-white/10 flex items-center justify-center">
              <FileText className="w-16 h-16 text-white/70" />
            </div>
            <p className="text-white/80 text-lg font-medium max-w-[80vw] text-center truncate">{alt}</p>
            <p className="text-white/50 text-sm">Document preview not available</p>
          </div>
        );

      default:
        return null;
    }
  };

  const renderInstructions = () => {
    switch (mediaType) {
      case 'image':
        return scale === 1 ? (
          <span>Pinch or scroll to zoom • Double-tap to zoom in</span>
        ) : (
          <span>Drag to pan • Double-tap to reset</span>
        );
      case 'video':
        return <span>Use controls to play/pause • Tap outside to close</span>;
      case 'audio':
        return <span>Use controls to play/pause • Tap outside to close</span>;
      case 'document':
        return <span>Tap outside to close</span>;
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={handleBackdropClick}
      onContextMenu={handleContextMenu}
      style={{ touchAction: mediaType === 'image' ? 'none' : 'auto' }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[101] p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
        aria-label="Close preview"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Zoom indicator (only for images) */}
      {mediaType === 'image' && scale !== 1 && (
        <div className="absolute top-4 left-4 z-[101] px-3 py-1 rounded-full bg-black/50 text-white text-sm">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Media content */}
      {renderMedia()}

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/60 text-xs text-center">
        {renderInstructions()}
      </div>
    </div>
  );
}
