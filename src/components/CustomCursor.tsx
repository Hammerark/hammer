import React, { useEffect } from "react";

export const CustomCursor: React.FC = () => {
  useEffect(() => {
    // Send mouse movements to Squarespace parent iframe so its custom cursor can track over the Vercel app
    const updateMousePosition = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const computedCursor = window.getComputedStyle(target).cursor;
      
      let isHovering = false;
      if (
        computedCursor === "pointer" ||
        computedCursor === "grab" ||
        computedCursor === "grabbing" ||
        computedCursor === "zoom-in" ||
        target.tagName.toLowerCase() === "button" ||
        target.tagName.toLowerCase() === "a" ||
        target.closest("button") ||
        target.closest("a") ||
        target.classList.contains("cursor-pointer") ||
        target.closest(".cursor-pointer")
      ) {
         isHovering = true;
      }

      window.parent.postMessage({
        type: 'iframe-mousemove',
        clientX: e.clientX,
        clientY: e.clientY,
        isHovering: isHovering
      }, '*');
    };

    window.addEventListener("mousemove", updateMousePosition, { passive: true });
    window.addEventListener("mouseover", updateMousePosition, { passive: true });

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      window.removeEventListener("mouseover", updateMousePosition);
    };
  }, []);

  return (
    <style>{`
      /* Hide the native browser cursor everywhere so only Squarespaces cursor is visible */
      *, *::before, *::after {
        cursor: none !important;
      }
    `}</style>
  );
};
