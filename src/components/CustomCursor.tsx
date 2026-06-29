import React, { useEffect, useState } from "react";
import { motion } from "motion/react";

export const CustomCursor: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isMagnetMenu, setIsMagnetMenu] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    // Only run on non-touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const updateMousePosition = (e: MouseEvent) => {
      let targetPos = { x: e.clientX, y: e.clientY };
      
      const target = e.target as HTMLElement;
      let shouldHide = !!target.closest(".hide-custom-cursor");
      
      // Also check element from point in case e.target is stale from a delayed click
      const elFromPoint = document.elementFromPoint(e.clientX, e.clientY);
      if (elFromPoint) {
        if (elFromPoint.closest(".hide-custom-cursor")) shouldHide = true;
      }
      
      setIsVisible(!shouldHide);
      
      let magnet = target.closest('.menu-magnet-target') || target.closest('.back-to-top-magnet') as HTMLElement;
      if (!magnet && elFromPoint) {
        magnet = elFromPoint.closest('.menu-magnet-target') || elFromPoint.closest('.back-to-top-magnet') as HTMLElement;
      }
      
      let isBackToTop = false;

      if (magnet) {
        setIsMagnetMenu(true);
        isBackToTop = magnet.classList.contains('back-to-top-magnet');
        const rect = magnet.getBoundingClientRect();
        
        if (isBackToTop) {
          const icon = magnet.querySelector('svg');
          if (icon) {
            const iconRect = icon.getBoundingClientRect();
            targetPos = { 
              x: iconRect.left + iconRect.width / 2, 
              y: iconRect.bottom - 4 // Tucks right into the ChevronUp shape
            };
          } else {
            targetPos = { x: rect.left + rect.width / 2, y: rect.bottom };
          }
        } else {
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          // The menu icon is 32x32 inside this element. 
          // We want the 4th dot of the circle to be at the bottom-right of the square (x=+5, y=+5 from center)
          const magnetX = centerX + 5;
          const magnetY = centerY + 5;
          // Hard snap completely
          targetPos = { 
            x: magnetX, 
            y: magnetY
          };
        }
      } else {
        setIsMagnetMenu(false);
      }
      
      setMousePosition(targetPos);
    };

    const handleDelayedUpdate = (e: MouseEvent) => {
      // Small delays to allow React to update the DOM classes
      setTimeout(() => updateMousePosition(e), 10);
      setTimeout(() => updateMousePosition(e), 50);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      const computedCursor = window.getComputedStyle(target).cursor;
      
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
         setIsHovering(true);
      } else {
         setIsHovering(false);
      }
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener("mousemove", updateMousePosition, { passive: true });
    window.addEventListener("mouseover", handleMouseOver, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("click", handleDelayedUpdate);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      window.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("click", handleDelayedUpdate);
    };
  }, []);

  return (
    <>
      <style>{`
        @media (pointer: fine) {
          *, *::before, *::after {
            cursor: none !important;
          }
        }
      `}</style>
      
      {/* Minimal Dot Cursor */}
      <motion.div
        className={`fixed top-0 left-0 pointer-events-none z-[10000] hidden md:flex items-center justify-center overflow-visible ${isMagnetMenu ? "" : "mix-blend-difference"}`}
        animate={{
          x: mousePosition.x - 2.5,
          y: mousePosition.y - 2.5,
          opacity: isVisible ? 1 : 0,
          scale: isClicking ? 0.6 : (isMagnetMenu ? 1 : (isHovering ? 1.5 : 1)),
        }}
        transition={{ type: "spring", stiffness: 800, damping: 35, mass: 0.2 }}
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: isMagnetMenu ? "black" : "white",
        }}
      />
    </>
  );
};
