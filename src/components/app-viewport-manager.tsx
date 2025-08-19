
'use client';

import { useEffect, useRef } from 'react';

export function AppViewportManager({ children }: { children: React.ReactNode }) {
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layoutElement = layoutRef.current;
    // Check for visualViewport support.
    const visualViewport = window.visualViewport;
    if (!layoutElement || !visualViewport) {
      return;
    }

    const documentElement = document.documentElement;

    const handleResize = () => {
        // We set the height of our container to the visual viewport height.
        // This ensures that when the keyboard appears, the container resizes
        // to fit the remaining visible space.
        layoutElement.style.height = `${visualViewport.height}px`;
        
        // Prevent scrolling issues when keyboard is open
        const keyboardHeight = window.innerHeight - visualViewport.height;
        
        if (keyboardHeight > 0) {
          // Keyboard is open - prevent body scrolling and fix viewport
          documentElement.style.overflow = 'hidden';
          documentElement.style.position = 'fixed';
          documentElement.style.width = '100%';
          documentElement.style.height = `${visualViewport.height}px`;
          
          // Ensure the layout doesn't scroll beyond the visible area
          layoutElement.style.position = 'fixed';
          layoutElement.style.top = '0';
          layoutElement.style.left = '0';
          layoutElement.style.right = '0';
          layoutElement.style.bottom = '0';
          layoutElement.style.overflow = 'hidden';
        } else {
          // Keyboard is closed - restore normal scrolling
          documentElement.style.overflow = '';
          documentElement.style.position = '';
          documentElement.style.width = '';
          documentElement.style.height = '';
          
          layoutElement.style.position = '';
          layoutElement.style.top = '';
          layoutElement.style.left = '';
          layoutElement.style.right = '';
          layoutElement.style.bottom = '';
          layoutElement.style.overflow = '';
        }
    };

    // Set the initial height
    handleResize();

    // Add event listener for subsequent resizes (like keyboard opening/closing)
    visualViewport.addEventListener('resize', handleResize);

    // Cleanup function to remove the event listener
    return () => {
      visualViewport.removeEventListener('resize', handleResize);
      
      // Clean up any styles we might have applied
      documentElement.style.overflow = '';
      documentElement.style.position = '';
      documentElement.style.width = '';
      documentElement.style.height = '';
    };
  }, []);

  // We start with 100dvh as a fallback for browsers that don't support visualViewport
  // or before the effect runs. The JS will then take over.
  return (
    <div ref={layoutRef} className="relative flex h-[100dvh] flex-col overflow-hidden">
      {children}
    </div>
  );
}
