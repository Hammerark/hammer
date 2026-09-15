import React, { useEffect, useState } from "react";
import { motion } from "motion/react";

export const CustomCursor: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);
  const [isMagnetMenu, setIsMagnetMenu] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    let isTouchMode = false;

    const handleTouch = () => {
      isTouchMode = true;
      setIsVisible(false);
    };

    const updateMousePosition = (e: MouseEvent) => {
      if (isTouchMode) {
        // If we get a real mouse movement after a touch, switch back to mouse mode
        // but simple taps also fire a fake mousemove, so we check for movement
        if (e.movementX === 0 && e.movementY === 0) return;
        isTouchMode = false;
      }

      let targetPos = { x: e.clientX, y: e.clientY };
      
      const target = e.target as HTMLElement;
      let shouldHide = !!target.closest(".hide-custom-cursor");
      
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
              y: iconRect.bottom - 4
            };
          } else {
            targetPos = { x: rect.left + rect.width / 2, y: rect.bottom };
          }
        } else {
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const magnetX = centerX + 5;
          const magnetY = centerY + 5;
          targetPos = { x: magnetX, y: magnetY };
        }
      } else {
        setIsMagnetMenu(false);
      }
      
      setMousePosition(targetPos);
    };

    const handleDelayedUpdate = (e: MouseEvent) => {
      if (isTouchMode) return;
      setTimeout(() => updateMousePosition(e), 10);
      setTimeout(() => updateMousePosition(e), 50);
    };

    const handleMouseOver = (e: MouseEvent) => {
      if (isTouchMode) return;
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
    const handleMouseDown = () => { if (!isTouchMode) setIsClicking(true); };
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener("touchstart", handleTouch, { passive: true });
    window.addEventListener("mousemove", updateMousePosition, { passive: true });
    window.addEventListener("mouseover", handleMouseOver, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("click", handleDelayedUpdate);

    return () => {
      window.removeEventListener("touchstart", handleTouch);
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
        /* Fallback for safety */
        .map-container, .map-container * {
          cursor: none !important;
        }
      `}</style>
      
      <motion.div
        className={`fixed top-0 left-0 pointer-events-none z-[10000] flex items-center justify-center overflow-visible `}
        animate={{
          x: mousePosition.x - 4,
          y: mousePosition.y - 4,
          opacity: isVisible ? 1 : 0,
          scale: isClicking ? 0.6 : (isMagnetMenu ? 1 : (isHovering ? 1.5 : 1)),
        }}
        transition={{ type: "spring", stiffness: 800, damping: 35, mass: 0.2 }}
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "#111111",
          position: "fixed",
          pointerEvents: "none",
          zIndex: 999999
        }}
      />
    </>
  );
};
