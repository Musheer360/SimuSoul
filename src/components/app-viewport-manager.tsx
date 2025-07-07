'use client';

import { useEffect, useRef } from 'react';

export function AppViewportManager({ children }: { children: React.ReactNode }) {
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layoutElement = layoutRef.current;
    // Check for visualViewport support.
    if (!layoutElement || typeof window.visualViewport === 'undefined') {
      return;
    }

    const visualViewport = window.visualViewport;

    const handleResize = () => {
        // We set the height of our container to the visual viewport height.
        // This ensures that when the keyboard appears, the container resizes
        // to fit the remaining visible space.
        layoutElement.style.height = `${visualViewport.height}px`;
    };

    // Set the initial height
    handleResize();

    // Add event listener for subsequent resizes (like keyboard opening/closing)
    visualViewport.addEventListener('resize', handleResize);

    // Cleanup function to remove the event listener
    return () => {
      visualViewport.removeEventListener('resize', handleResize);
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
