import { useState, useEffect, useRef } from "react";
import { Header, PageId } from "./components/Header";
import { ThreeCanvas } from "./components/ThreeCanvas";
import { Portfolio } from "./components/Portfolio";
import { OmOss } from "./components/OmOss";
import { Ansatte } from "./components/Ansatte";
import { Kontakt } from "./components/Kontakt";
import { triggerHaptic } from "./utils";
import { ProjectDrawer } from "./components/ProjectDrawer";
import { Footer } from "./components/Footer";
import { CustomCursor } from "./components/CustomCursor";
import { Project } from "./data/projects";
import { ChevronDown, ChevronUp, MapPin, Phone, Mail, Instagram } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("hjem");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skipAnimationScrollRef = useRef<boolean>(false);
  const isAutoScrollingRef = useRef<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showPromptText, setShowPromptText] = useState(false);

  const [hasRequestedMotion, setHasRequestedMotion] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hammerMotionPermission") === "granted";
    }
    return false;
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [nextPage, setNextPage] = useState<PageId | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 767);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activePage === "hjem" && scrollProgress < 0.1) {
      if (!isMobile || hasRequestedMotion) {
        timer = setTimeout(() => {
          setShowPromptText(true);
        }, 3000);
      } else {
        setShowPromptText(false);
      }
    } else {
      setShowPromptText(false);
    }
    return () => clearTimeout(timer);
  }, [activePage, scrollProgress, isMobile, hasRequestedMotion]);

  useEffect(() => {
    if (activePage === "hjem") {
      setShowBackToTop(false);
      return;
    }
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activePage]);

  const isInitialMountRef = useRef(true);

  // Scroll to top automatically when changing pages
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (skipAnimationScrollRef.current) {
        // Repeatedly check for the element over the next frame to avoid flash
        let attempts = 0;
        const jumpToMap = () => {
            if (scrollTrackRef.current) {
                const rect = scrollTrackRef.current.getBoundingClientRect();
                const th = rect.height - window.innerHeight;
                if (th > 0) {
                    window.requestAnimationFrame(() => {
                        window.scrollTo({ top: 0.85 * th, left: 0, behavior: "auto" });
                    });
                    setScrollProgress(0.85);
                    skipAnimationScrollRef.current = false;
                    return;
                }
            }
            if (attempts < 60) {
                attempts++;
                requestAnimationFrame(jumpToMap);
            } else {
                skipAnimationScrollRef.current = false;
            }
        };
        requestAnimationFrame(jumpToMap);
    } else {
        window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        });
    }
  }, [activePage]);

  useEffect(() => {
    // We only lock scrolling on the 'hjem' page
    if (activePage !== "hjem") return;

    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handlePreventScroll = (e: Event) => {
      if (isAutoScrollingRef.current) {
        e.preventDefault();
        return;
      }

      // Check for auto-start animation
      if (scrollProgress < 0.05) {
        let isScrollingDown = false;
        if (e.type === "wheel") {
          isScrollingDown = (e as WheelEvent).deltaY > 0;
        } else if (e.type === "touchmove") {
          isScrollingDown = touchStartY - (e as TouchEvent).touches[0].clientY > 0;
        } else if (e.type === "keydown") {
          isScrollingDown = ["ArrowDown", "PageDown", " ", "End"].includes((e as KeyboardEvent).key);
        }

        if (isScrollingDown) {
          e.preventDefault();
          handleHClick();
          return;
        }
      }

      if (scrollProgress >= 0.99) {
        // Prevent scrolling down, effectively locking the window
        if (e.type === "wheel") {
          const wheelEvent = e as WheelEvent;
          if (wheelEvent.deltaY > 0) {
            e.preventDefault();
          }
        } else if (e.type === "touchmove") {
          const touchEvent = e as TouchEvent;
          const touchY = touchEvent.touches[0].clientY;
          // Swipe up = scrolling down
          if (touchStartY - touchY > 0) {
            // Check if touch is on an element that needs scroll (e.g. within a small div)
            // For now, prevent default for the whole window.
            e.preventDefault();
          }
        } else if (e.type === "keydown") {
          const keyboardEvent = e as KeyboardEvent;
          // Space, PageDown, ArrowDown
          if (["ArrowDown", "PageDown", " ", "End"].includes(keyboardEvent.key)) {
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("wheel", handlePreventScroll, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handlePreventScroll, { passive: false });
    window.addEventListener("keydown", handlePreventScroll, { passive: false });

    return () => {
      window.removeEventListener("wheel", handlePreventScroll);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handlePreventScroll);
      window.removeEventListener("keydown", handlePreventScroll);
    };
  }, [scrollProgress, activePage]);

  // Compute scroll progress on vertical scroll
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!scrollTrackRef.current) {
            ticking = false;
            return;
          }
          const rect = scrollTrackRef.current.getBoundingClientRect();
          const trackHeight = rect.height - window.innerHeight;
          
          if (trackHeight > 0) {
            // Calculate progress relative to current viewport scroll within the track
            const relativeScroll = -rect.top;
            const progress = Math.min(Math.max(0, relativeScroll / trackHeight), 1);
            
            setScrollProgress(progress);
            
            // Share progress globally so high-performance animation frames can access it without lag
            (window as any).hammerScrollProgress = progress;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Run initial pass
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [activePage]); // Recalculate if activePage switches back to ensure safe bind

  // Scroll smoothly to a specific project card in the archive section
  const handleScrollToProject = (projectId: string) => {
    if (activePage !== "prosjekter") {
      setActivePage("prosjekter");
    }
    
    // Wait for the page transition to complete and target card to render in DOM
    setTimeout(() => {
      const element = document.getElementById(`project-${projectId}`);
      if (element) {
        const offsetPosition = element.getBoundingClientRect().top + window.pageYOffset - 120;
        window.requestAnimationFrame(() => {
          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        });
      }
    }, 450);
  };

  const handleHClick = () => {
    if (!scrollTrackRef.current || isAutoScrollingRef.current) return;
    const rect = scrollTrackRef.current.getBoundingClientRect();
    // trackHeight is the total scrollable area for this track
    const trackHeight = rect.height - window.innerHeight;
    
    // We want scrollProgress = 0.85 to show the fully opaque interactive map
    // scrollProgress = relativeScroll / trackHeight
    const targetScrollY = 0.85 * trackHeight;
    const startScrollY = window.scrollY;
    const distance = targetScrollY - startScrollY;
    
    // Native smooth scroll is usually ~500ms.
    // To reduce animation speed by 35%, new duration = 819 / 0.65 = 1260
    const duration = 1260;
    let startTime: number | null = null;
    isAutoScrollingRef.current = true;

    // Easing: easeOutCubic starts very fast (responsive click) then decelerates gracefully for a glorious explosion
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animateScroll = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);

      window.requestAnimationFrame(() => {
        window.scrollTo(0, startScrollY + distance * easeOutCubic(progress));
      });

      if (timeElapsed < duration) {
        requestAnimationFrame(animateScroll);
      } else {
        setTimeout(() => {
          isAutoScrollingRef.current = false;
        }, 50);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  const handlePageChange = (page: PageId, options?: { skipMapAnimation?: boolean }) => {
    if (page === activePage) {
      if (options?.skipMapAnimation) {
        if (scrollTrackRef.current) {
          const rect = scrollTrackRef.current.getBoundingClientRect();
          const th = rect.height - window.innerHeight;
          if (th > 0) {
            window.requestAnimationFrame(() => {
              window.scrollTo({ top: 0.85 * th, left: 0, behavior: "auto" });
            });
            setScrollProgress(0.85);
          }
        }
      } else {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
    } else {
      if (options?.skipMapAnimation) {
        skipAnimationScrollRef.current = true;
      }
      
      // Only show loader when completely necessary (e.g., mounting/unmounting the heavy WebGL canvas)
      const isHeavyTransition = page === "hjem" || activePage === "hjem";
      
      if (isHeavyTransition) {
        setNextPage(page);
        setIsNavigating(true);
        
        // Just enough delay to allow the loading animation to render before blocking the main thread
        setTimeout(() => {
          setActivePage(page);
          setActiveProject(null);
          
          setTimeout(() => {
            setIsNavigating(false);
            setNextPage(null);
          }, 300);
        }, 50);
      } else {
        setActivePage(page);
        setActiveProject(null);
      }
    }
  };

  return (
    <div className={`relative min-h-screen font-sans text-neutral-900 selection:bg-neutral-900 selection:text-white flex flex-col justify-between ${["om-oss", "prosjekter"].includes(activePage) ? "bg-[#fffbf0]" : ["ansatte", "kontakt"].includes(activePage) ? "bg-[#e6ffde]" : "bg-white"}`}>
      <CustomCursor />
      
      {/* Page Transition Loading Animation */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            key="page-transition-loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { delay: 0.2, duration: 0.6 } }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className={`fixed inset-0 z-[110] flex flex-col items-center justify-center ${
              ["om-oss", "prosjekter"].includes(nextPage || "") 
                ? "bg-[#fffbf0]" 
                : ["ansatte", "kontakt"].includes(nextPage || "") 
                ? "bg-[#e6ffde]" 
                : "bg-white"
            }`}
          >
            <motion.div 
              className="flex gap-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <motion.div 
                className="w-1.5 h-1.5 bg-neutral-900 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0 }}
              />
              <motion.div 
                className="w-1.5 h-1.5 bg-neutral-900 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              />
              <motion.div 
                className="w-1.5 h-1.5 bg-neutral-900 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header Navigation */}
      <Header 
        activePage={activePage} 
        onPageChange={handlePageChange} 
        scrollProgress={scrollProgress} 
        isProjectActive={!!activeProject} 
      />

      {/* Main Page Area wrapped with motion wrapper */}
      <main className="flex-grow w-full">
        <AnimatePresence mode="wait">
          {/* PAGE 1: HJEM (HOME MAP WORKSPACE) */}
          {activePage === "hjem" && (
            <motion.div
              key="hjem-page"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative w-full"
            >
              {/* Down scroll instruction indicator overlay */}
              <AnimatePresence>
                {scrollProgress < 0.1 && (
                  <>
                    {/* Fullscreen click overlay for mobile motion request */}
                    {isMobile && !hasRequestedMotion && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 z-[35] pointer-events-none"
                      />
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none"
                    >
                      {isMobile && !hasRequestedMotion ? (
                        <motion.button 
                          key="prompt-explore"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          transition={{ delay: 1, duration: 1 }}
                          className="flex flex-col items-center text-center animate-pulse cursor-pointer pointer-events-auto"
                          onClick={() => {
                            triggerHaptic();
                            setHasRequestedMotion(true);
                            localStorage.setItem("hammerMotionPermission", "granted");
                            const doc = window as any;
                            if (doc.DeviceOrientationEvent && typeof doc.DeviceOrientationEvent.requestPermission === "function") {
                              doc.DeviceOrientationEvent.requestPermission().catch(console.error);
                            }
                          }}
                        >
                          <span className="text-[10px] tracking-[0.3em] uppercase font-medium text-neutral-900 mb-1">
                            Trykk for å utforske
                          </span>
                        </motion.button>
                      ) : (
                        <motion.div key="prompt-scroll" className="flex flex-col items-center">
                          <AnimatePresence>
                            {showPromptText && (
                              <motion.span 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                className="text-[10px] uppercase tracking-widest text-neutral-900 mb-2 font-medium"
                              >
                                Skroll ned
                              </motion.span>
                            )}
                          </AnimatePresence>
                          <ChevronDown className="w-5 h-5 animate-bounce text-neutral-900" />
                        </motion.div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Master Scroll Track driving the WebGL disintegration story */}
              <div ref={scrollTrackRef} className="relative h-[115vh] md:h-[160vh] w-full">
                {/* Sticky WebGL viewport */}
                <div className="sticky top-0 left-0 w-full h-screen overflow-hidden z-20 bg-white">
                  <ThreeCanvas 
                    scrollProgress={scrollProgress} 
                    onProjectClick={setActiveProject} 
                    activeProject={activeProject} 
                    onHClick={handleHClick}
                    hasRequestedMotion={hasRequestedMotion}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* PAGE 2: PROSJEKTER (SELECTED ARCHIVE PROJECTS) */}
          {activePage === "prosjekter" && (
            <motion.div
              key="prosjekter-page"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full bg-[#fffbf0]"
            >
              <Portfolio 
                onSelectProject={setActiveProject} 
                selectedProject={activeProject} 
              />
            </motion.div>
          )}

          {/* PAGE 3: OM OSS (STUDIO DETAILS) */}
          {activePage === "om-oss" && (
            <motion.div
              key="about-page"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full"
            >
              <OmOss onSelectProject={setActiveProject} />
            </motion.div>
          )}

          {/* PAGE 3.5: ANSATTE (EMPLOYEES) */}
          {activePage === "ansatte" && (
            <motion.div
              key="ansatte-page"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full"
            >
              <Ansatte onPageChange={handlePageChange} />
            </motion.div>
          )}

          {/* PAGE 4: KONTAKT (DEDICATED CONTACT FORUM) */}
          {activePage === "kontakt" && (
            <motion.div
              key="kontakt-page"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full"
            >
              <Kontakt onPageChange={handlePageChange} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Back to top button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            key="back-to-top"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            onClick={() => {
              triggerHaptic();
              window.requestAnimationFrame(() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
              });
            }}
            className="fixed bottom-8 right-6 md:right-12 z-40 flex flex-col items-center group cursor-pointer p-2 focus:outline-none back-to-top-magnet"
            aria-label="Til toppen"
          >
            <ChevronUp className="w-5 h-5 text-neutral-900 group-hover:-translate-y-1 transition-transform delay-75" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 2. Architectural Specification Overlay Drawer (Root level so it behaves as global HUD on selection) */}
      <AnimatePresence>
        {activeProject && (
          <ProjectDrawer 
            key="project-drawer"
            project={activeProject} 
            onClose={() => setActiveProject(null)} 
            onScrollToProject={handleScrollToProject}
            onPageChange={setActivePage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
