import React, { useState, useEffect } from "react";
import hammerLogo from "../assets/images/Hammer_logo_sort_F41.png";
import { triggerHaptic } from "../utils";
import { motion, AnimatePresence } from "motion/react";

export type PageId = "hjem" | "prosjekter" | "ansatte" | "om-oss" | "kontakt";

interface HeaderProps {
  activePage: PageId;
  onPageChange: (page: PageId, options?: { skipMapAnimation?: boolean }) => void;
  scrollProgress: number;
  isProjectActive?: boolean;
}

const DotMenuIcon = ({ isHovered, isMobileOpen }: { isHovered: boolean; isMobileOpen?: boolean }) => {
  const state = isHovered ? "hover" : "normal";

  const dot1 = {
    normal: { width: 5, height: 5, x: 3.5, y: 13.5, rotate: 0, scale: 1 },
    hover: { width: 5, height: 5, x: 8.5, y: 8.5, rotate: 0, scale: 1 }
  };
  const dot2 = {
    normal: { width: 5, height: 5, x: 13.5, y: 13.5, rotate: 0, scale: 1 },
    hover: { width: 5, height: 5, x: 18.5, y: 8.5, rotate: 0, scale: 1 }
  };
  const dot3 = {
    normal: { width: 5, height: 5, x: 23.5, y: 13.5, rotate: 0, scale: 1 },
    hover: { width: 5, height: 5, x: 8.5, y: 18.5, rotate: 0, scale: 1 }
  };
  const transitionNormal = { delay: 0.2, type: "spring", stiffness: 350, damping: 25 };
  const transitionHover = { delay: 0, type: "spring", stiffness: 350, damping: 25 };

  const dotColor = isMobileOpen ? "bg-white" : "bg-black";

  return (
    <div className={`relative w-12 h-12 -mr-2 flex items-center justify-center cursor-pointer pointer-events-auto menu-magnet-target`}>
      <div className="relative w-8 h-8 pointer-events-none">
        <motion.div className={`absolute top-0 left-0 origin-center shadow-sm rounded-full ${dotColor} transition-colors duration-300`} animate={dot1[state]} transition={isHovered ? transitionHover : transitionNormal} />
        <motion.div className={`absolute top-0 left-0 origin-center shadow-sm rounded-full ${dotColor} transition-colors duration-300`} animate={dot2[state]} transition={isHovered ? transitionHover : transitionNormal} />
        <motion.div className={`absolute top-0 left-0 origin-center shadow-sm rounded-full ${dotColor} transition-colors duration-300`} animate={dot3[state]} transition={isHovered ? transitionHover : transitionNormal} />
      </div>
    </div>
  );
};

export const Header: React.FC<HeaderProps> = ({ activePage, onPageChange, scrollProgress, isProjectActive }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Prevent background scrolling on mobile when menu is open
  useEffect(() => {
    if (isMobile && isHovered) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isHovered]);

  const handleNavClick = (page: PageId) => {
    if (page === "hjem") {
      onPageChange(page, { skipMapAnimation: true });
    } else {
      onPageChange(page);
    }
    setIsHovered(false);
  };

  const navItems = [
    { id: "hjem", label: "Kart" },
    { id: "prosjekter", label: "Prosjekter" },
    { id: "ansatte", label: "Ansatte" },
    { id: "om-oss", label: "Om oss" },
    { id: "kontakt", label: "Kontakt" }
  ];

  let headerBgClass = "bg-transparent";
  if (isProjectActive) {
    headerBgClass = "bg-[#fffbf0]";
  } else if (activePage === "hjem") {
    if (isHeaderHovered || isMobile) {
      headerBgClass = "bg-white";
    }
  } else if (scrollY > 20) {
    if (activePage === "om-oss" || activePage === "prosjekter") headerBgClass = "bg-[#fffbf0]";
    else if (activePage === "ansatte" || activePage === "kontakt") headerBgClass = "bg-[#e6ffde]";
    else headerBgClass = "bg-white";
  }

  // When mobile menu is open, make the header transparent so it blends with the black background
  const finalHeaderBgClass = (isMobile && isHovered) ? "bg-transparent" : headerBgClass;

  return (
    <header 
      className={`fixed top-0 left-0 w-full z-[100] transition-colors duration-300 pt-[5px] px-4 sm:px-6 md:px-12 pointer-events-none`}
    >
      <div 
        className={`absolute inset-0 w-full h-[80px] md:h-[110px] pointer-events-auto transition-colors duration-300 ${finalHeaderBgClass}`}
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
      />
      
      <div 
        className="w-full py-4 md:py-8 flex items-center justify-between pointer-events-none relative z-50"
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
      >
        {/* Logo */}
        <button
          onClick={() => {
            triggerHaptic();
            onPageChange("hjem");
          }}
          className="flex items-center gap-3 cursor-pointer text-neutral-900 group focus:outline-none relative z-50 transition-transform duration-300 hover:scale-105 pointer-events-auto"
        >
          <span className="inline-flex items-center select-none" id="header-logo-container">
            <img
              src={hammerLogo}
              alt="HAMMER"
              className={`h-4 md:h-5 w-auto object-contain transition-all duration-300 ${(isMobile && isHovered) ? "invert" : ""}`}
              referrerPolicy="no-referrer"
              id="header-logo-image"
            />
          </span>
        </button>

        {/* Menu Container */}
        <div 
          className={`static md:relative flex items-center py-4 md:py-6 -my-4 md:-my-6 pl-12 -ml-12 pointer-events-auto ${isHovered ? "menu-open" : ""}`}
          onMouseLeave={() => !isMobile && setIsHovered(false)}
          onMouseEnter={() => !isMobile && setIsHovered(true)}
        >
          <motion.nav 
            className={`flex flex-col md:flex-row items-end md:items-center justify-center md:justify-end gap-6 md:gap-6 md:mr-6 absolute md:relative inset-0 md:inset-auto ${
              isMobile 
                ? "fixed w-full h-[100dvh] bg-black z-40 top-0 left-0 px-4 sm:px-6 pt-32" 
                : "pr-0 md:pr-2 bg-transparent p-0 rounded-none border-none right-auto"
            }`}
            initial="normal"
            animate={isHovered ? "hover" : "normal"}
            variants={{
              normal: { opacity: 0, x: isMobile ? 20 : 20, y: isMobile ? 0 : 0, pointerEvents: "none" as const, transition: { duration: 0.2, ease: "easeIn" } },
              hover: { opacity: 1, x: 0, y: 0, pointerEvents: "auto" as const, transition: { duration: 0.5, ease: "easeOut" } }
            }}
          >
            {navItems.map((item) => {
              const isNavActive = item.id === "hjem" ? (activePage === "hjem" && scrollProgress >= 0.8) : activePage === item.id;
              
              const textClass = isMobile
                ? (isNavActive ? "text-white" : "text-neutral-400 hover:text-white")
                : (isNavActive ? "text-neutral-900" : "text-neutral-600 hover:text-neutral-900");
                
              const underlineClass = isMobile ? "bg-white" : "bg-neutral-900";
              const label = isMobile ? item.label.toUpperCase() : item.label;

              return (
              <button
                key={item.id}
                onClick={() => {
                  triggerHaptic();
                  handleNavClick(item.id as PageId);
                }}
                className={`group relative text-right md:text-left transition-colors whitespace-nowrap ${textClass} ${
                  isMobile 
                    ? "text-4xl font-sans tracking-tight pb-2" 
                    : "text-base font-sans font-light tracking-tight"
                }`}
              >
                {label}
                <span 
                  className={`absolute right-0 md:left-0 md:right-auto bottom-0 transition-all duration-300 ease-out ${underlineClass} ${
                    isMobile ? "h-[3px]" : "h-[1px] -bottom-1"
                  } ${
                    isNavActive ? "w-full" : "w-0 group-hover:w-full"
                  }`} 
                />
              </button>
              );
            })}
          </motion.nav>

          {/* Menu Toggle area */}
          <div
            className={`pointer-events-auto relative z-50 focus:outline-none rounded-full cursor-pointer flex-shrink-0 transition-colors duration-300`}
            onMouseEnter={() => !isMobile && setIsHovered(true)}
            onClick={() => {
              if (isMobile) {
                triggerHaptic();
                setIsHovered(!isHovered);
              }
            }}
            aria-label="Toggle menu"
          >
            <DotMenuIcon isHovered={isHovered} isMobileOpen={isMobile && isHovered} />
          </div>
        </div>
      </div>
    </header>
  );
};

