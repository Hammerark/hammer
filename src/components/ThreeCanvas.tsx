import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { motion, AnimatePresence, useMotionValue, animate } from "motion/react";
import { RotateCcw, Lock, Unlock, Copy, Check, ArrowRight, Smartphone } from "lucide-react";
import { Project } from "../data/projects";
import osloNolliMap from "../assets/images/StorOslo.png";
import boligIcon from "../assets/images/Ikoner/Bolig2.png";
import offentligIcon from "../assets/images/Ikoner/Offentlig2.png";
import naeringIcon from "../assets/images/Ikoner/Næring2.png";
import { triggerHaptic } from "../utils";

// The scale of the map (1.0 means original unscaled map)
const MAP_SCALE = 1.0;

// Underdamped spring-damping physics calculation for realistic settling weight
const getSpringWeight = (t: number): number => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  const zeta = 0.90; // slightly higher damping ratio for an elegantly controlled, non-jittery architectural motion
  const omega = 4.5; // lower natural frequency to produce a slower, more deliberate and high-precision glide into target positions
  
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const expTerm = Math.exp(-zeta * omega * t);
  const cosTerm = Math.cos(wd * t);
  const sinTerm = Math.sin(wd * t);
  
  // Underdamped response equation
  const rawResponse = 1 - expTerm * (cosTerm + (zeta * omega / wd) * sinTerm);
  
  // Normalize mathematically so that result endpoints map exactly (0.0 to 1.0)
  const expTerm1 = Math.exp(-zeta * omega);
  const cosTerm1 = Math.cos(wd);
  const sinTerm1 = Math.sin(wd);
  const endResponse = 1 - expTerm1 * (cosTerm1 + (zeta * omega / wd) * sinTerm1);
  
  return rawResponse / endResponse;
};

// Generates a deterministic key-based rotation angle (locked to 0 degrees)
const getProjectRotation = (id: string): number => {
  return 0; // Every marker is 0 degrees
};

export const projectLatLngToMapPercent = (lat: number, lng: number): { xPercent: number; yPercent: number } => {
  const t1x = 57.0, t1y = 45.1;
  const t2x = 49.1, t2y = 50.7;
  const t3x = 67.1, t3y = 30.2;
  const s1lat = 59.91746156, s1lng = 10.76030439;
  const s2lat = 59.90894970, s2lng = 10.72240599;
  const s3lat = 59.94183791, s3lng = 10.80861593;
  
  const det = (s2lat - s3lat) * (s1lng - s3lng) + (s3lng - s2lng) * (s1lat - s3lat);
  if (Math.abs(det) < 0.000001) return { xPercent: 50, yPercent: 50 };

  const l1 = ((s2lat - s3lat) * (lng - s3lng) + (s3lng - s2lng) * (lat - s3lat)) / det;
  const l2 = ((s3lat - s1lat) * (lng - s3lng) + (s1lng - s3lng) * (lat - s3lat)) / det;
  const l3 = 1 - l1 - l2;
  
  return {
    xPercent: l1 * t1x + l2 * t2x + l3 * t3x,
    yPercent: l1 * t1y + l2 * t2y + l3 * t3y,
  };
};

export const getMapPosFromLatLng = (lat: number, lng: number) => {
  const { xPercent, yPercent } = projectLatLngToMapPercent(lat, lng);
  const mapWidth = 40;
  const mapHeight = 40 * (1270 / 2048);
  return {
    x: -mapWidth / 2 + (xPercent / 100) * mapWidth,
    y: -5.75,
    z: -mapHeight / 2 + (yPercent / 100) * mapHeight
  };
};

interface ThreeCanvasProps {
  projects: Project[];
  scrollProgress: number; // 0.0 to 1.0 representing the story scroll position
  onProjectClick: (project: Project) => void;
  activeProject: Project | null;
  onHClick?: () => void;
  hasRequestedMotion?: boolean;
  sequenceStartToken?: string | null;
  onSequenceComplete?: () => void;
}


// --- DIAGNOSTICS START ---
let diagFrames: any[] = [];
let diagActive = false;
let diagStartTime = 0;
let diagPhaseTimes = { preparing: 0, playing: 0 };
let reportString = "";

export const startDiagnostics = () => {
  if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get("startDiagnostics") !== "true") return;
  (window as any).diagnosticReport = null;
  diagFrames = [];
  diagActive = true;
  diagStartTime = performance.now();
  diagPhaseTimes = { preparing: 0, playing: 0 };
  reportString = "Måler...";
  console.log("Diagnostics started");
};

export const stopDiagnostics = () => {
  if (!diagActive) return;
  diagActive = false;
  
  if (diagFrames.length < 2) return;
  
  const times = diagFrames.map(f => f.time);
  let deltas = [];
  for(let i=1; i<times.length; i++) deltas.push(times[i]-times[i-1]);
  deltas.sort((a,b)=>a-b);
  
  const renderTimes = diagFrames.map(f => f.render).sort((a,b)=>a-b);
  const mathTimes = diagFrames.map(f => f.math).sort((a,b)=>a-b);
  
  const getP = (arr: number[], p: number) => arr[Math.floor(arr.length * p)] || 0;
  
  const drops16 = deltas.filter(d => d > 16.7).length;
  const drops33 = deltas.filter(d => d > 33.3).length;
  const drops50 = deltas.filter(d => d > 50.0).length;
  
  const report = {
    device: navigator.userAgent,
    frames: diagFrames.length,
    phaseTimes: {
      preparing: diagPhaseTimes.preparing.toFixed(1) + "ms",
      playing: diagPhaseTimes.playing.toFixed(1) + "ms"
    },
    frameDeltas: {
      p50: getP(deltas, 0.5).toFixed(2) + "ms",
      p95: getP(deltas, 0.95).toFixed(2) + "ms",
      worst: deltas[deltas.length-1].toFixed(2) + "ms",
    },
    droppedFrames: {
      ">16.7ms": drops16,
      ">33.3ms": drops33,
      ">50.0ms": drops50
    },
    cpuTime_math: {
      p50: getP(mathTimes, 0.5).toFixed(2) + "ms",
      worst: mathTimes[mathTimes.length-1].toFixed(2) + "ms"
    },
    cpuTime_render: {
      p50: getP(renderTimes, 0.5).toFixed(2) + "ms",
      worst: renderTimes[renderTimes.length-1].toFixed(2) + "ms"
    }
  };
  
  (window as any).diagnosticReport = report;
  reportString = JSON.stringify(report, null, 2);
  console.log("Sequence Diagnostics:", report);
};
// --- DIAGNOSTICS END ---

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  projects,
  scrollProgress,
  onProjectClick,
  activeProject,
  onHClick,
  hasRequestedMotion = false,
  sequenceStartToken = null,
  onSequenceComplete
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rigRef = useRef<THREE.Group | null>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  const osloMapRef = useRef<THREE.Mesh | null>(null);
  const htmlMapContainerRef = useRef<HTMLDivElement>(null);

  // Keep track of projected 2D coordinates for HTML markers without triggering React re-renders
  const markersRef = useRef<(HTMLDivElement | null)[]>([]);

  // Keep track of scroll progress dynamically to avoid reconstructing entire ThreeJS components on scroll
  const scrollRef = useRef(scrollProgress);

  const getBaseZoom = () => 1.0;
  const getTargetZoom = () => 1.40 * 1.50; // Increased by 50%
  const getMaxZoom = () => typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 767) ? 8.0 : 6.0;

  // Zoom & Pan states for the 2D HTML Map Layer
  const [zoom, setZoom] = useState(getBaseZoom());
  const zoomRef = useRef(getBaseZoom());
  const [pan, setPanState] = useState({ x: 0, y: 0 });
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);

  const setPan = (newPan: { x: number, y: number } | ((prev: {x: number, y: number}) => {x: number, y: number}), currentZoom: number = zoom) => {
    setPanState(prev => {
       const next = typeof newPan === 'function' ? newPan(prev) : newPan;
       if (next.x === 0 && next.y === 0) return next;
       
       const isMobile = typeof window !== 'undefined' && window.innerWidth <= 1024;
       const winW = typeof window !== 'undefined' ? window.innerWidth : 1000;
       const winH = typeof window !== 'undefined' ? window.innerHeight : 1000;
       
       const baseW = isMobile ? winH * (2048 / 1270) : winW * 0.9;
       const baseH = isMobile ? winH : baseW / (2048 / 1270);
       
       const scaledW = baseW * currentZoom;
       const scaledH = baseH * currentZoom;
       
       const maxX = Math.max(0, (scaledW - winW) / 2);
       const maxY = Math.max(0, (scaledH - winH) / 2);
       
       return {
         x: Math.max(-maxX, Math.min(maxX, next.x)),
         y: Math.max(-maxY, Math.min(maxY, next.y))
       };
    });
  };

  useEffect(() => {
    setPan(prev => prev, zoom);
  }, [zoom]);

  const [isDragging, setIsDragging] = useState(false);
  const [isMoved, setIsMoved] = useState(false);
  const [isMapInteracting, setIsMapInteracting] = useState(false);
  const isMapInteractingRef = useRef(isMapInteracting);
  const autoZoomTriggeredRef = useRef(false);
  const htmlMapInteractiveWrapperRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const actualMarkersRef = useRef<Record<string, HTMLDivElement | null>>({});
  const autoZoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    isMapInteractingRef.current = isMapInteracting;
  }, [isMapInteracting]);
  const [selectedMobileProject, setSelectedMobileProject] = useState<Project | null>(null);
  
  const hasRequestedMotionRef = useRef(hasRequestedMotion);
  useEffect(() => {
    hasRequestedMotionRef.current = hasRequestedMotion;
  }, [hasRequestedMotion]);
  
  type SequenceState = 'idle' | 'preparing' | 'playing' | 'map';
  const [sequenceState, setSequenceState] = useState<SequenceState>('idle');
  const sequenceStateRef = useRef<SequenceState>('idle');
  const sequenceStartTsRef = useRef<number | null>(null);
  const [decodeError, setDecodeError] = useState(false);

  useEffect(() => {
    // Scroll restoration/reload check
    if (sequenceStateRef.current === 'idle' && scrollProgress >= 0.85 && !sequenceStartToken) {
      sequenceStateRef.current = 'map';
      setSequenceState('map');
      setZoom(getTargetZoom());
    }
  }, []);

  const handleRetryDecode = () => {
    setDecodeError(false);
    startSequence();
  };

  const startSequence = () => {
    if (sequenceStateRef.current !== 'idle') return;
    
    sequenceStateRef.current = 'preparing';
    setSequenceState('preparing');
    if (typeof window !== 'undefined') startDiagnostics();

    const startTime = performance.now();

    const img = new Image();
    img.src = osloNolliMap;
    // We attach decode promise to component state so unmount can ignore it
    return img.decode()
       .then(() => {
          diagPhaseTimes.preparing = performance.now() - startTime;
          sequenceStateRef.current = 'playing';
          setSequenceState('playing');
          sequenceStartTsRef.current = performance.now();
       })
       .catch(err => {
          console.error("Decode failed", err);
          setSequenceState('idle');
          sequenceStateRef.current = 'idle';
          setDecodeError(true);
          if (onSequenceComplete) onSequenceComplete(); // Release App lock on error
       });
  };

  useEffect(() => {
    let isCancelled = false;
    if (sequenceStartToken && sequenceStateRef.current === 'idle') {
      const promise = startSequence();
      if (promise) {
         promise.finally(() => {
            if (isCancelled) {
               // Do nothing if unmounted
            }
         });
      }
    }
    return () => { isCancelled = true; };
  }, [sequenceStartToken]);
  
  const [activeFilter, setActiveFilter] = useState("ALLE");
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const checkHeaderMenu = () => {
      const menu = document.querySelector('.menu-open');
      setIsHeaderMenuOpen(!!menu);
    };
    checkHeaderMenu();
    const interval = setInterval(checkHeaderMenu, 100);
    return () => clearInterval(interval);
  }, []);

  const scaleMotion = useMotionValue(getBaseZoom() * MAP_SCALE);

  useEffect(() => {
    // Let tick() control the motion value during the sequence
    if (sequenceState !== 'map') return;
    
    animate(scaleMotion, zoom * MAP_SCALE, {
      type: "tween",
      duration: isDragging ? 0 : (isMapInteracting ? 0.4 : 1.5),
      ease: "easeInOut"
    });
  }, [zoom, isDragging, isMapInteracting, sequenceState]);

  // Wheel zoom injection logic
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Pinch-to-zoom on trackpad when map is visible
      if (e.ctrlKey && scrollRef.current > 0.60) {
        e.preventDefault();
        setZoom(z => {
          // e.deltaY is positive when pinching out, negative when pinching in
          const speed = 0.01;
          const newZ = Math.min(getMaxZoom(), Math.max(getBaseZoom(), z - (e.deltaY * speed)));
          if (newZ > getBaseZoom() + 0.05) setIsMapInteracting(true);
          else if (newZ <= getBaseZoom() + 0.05) {
            setPan({ x: 0, y: 0 });
            setIsMapInteracting(false);
          }
          return newZ;
        });
        return;
      }


    };
    
    // Non-passive listener allows us to block native scrolling
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  // Prevent over-scrolling behaviors on mobile devices when map is zoomed or interacting
  useEffect(() => {
    const mapEl = htmlMapContainerRef.current;
    if (!mapEl) return;

    // Passive touchstart to improve responsiveness
    const handleNativeTouchStart = () => {};

    // Non-passive touchmove to block over-scrolling behavior natively
    const handleNativeTouchMove = (e: TouchEvent) => {
      // If we are actively interacting with the map, or zoomed in, prevent the browser's default pull-to-refresh and scroll behaviors
      if (zoomRef.current > getBaseZoom() + 0.01 || isMapInteractingRef.current) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    mapEl.addEventListener("touchstart", handleNativeTouchStart, { passive: true });
    mapEl.addEventListener("touchmove", handleNativeTouchMove, { passive: false });

    return () => {
      mapEl.removeEventListener("touchstart", handleNativeTouchStart);
      mapEl.removeEventListener("touchmove", handleNativeTouchMove);
    };
  }, []);

  // States for manual coordinate placement modifications
  const [coordsState, setCoordsState] = useState<Record<string, { xPercent: number; yPercent: number }>>(() => {
    const initialCoords: Record<string, { xPercent: number; yPercent: number }> = {};
    projects.forEach(p => {
      initialCoords[p.id] = projectLatLngToMapPercent(p.lat, p.lng);
    });
    return initialCoords;
  });

  useEffect(() => {
    setCoordsState(prev => {
      const next = { ...prev };
      let changed = false;
      projects.forEach(p => {
        if (!next[p.id]) {
          next[p.id] = projectLatLngToMapPercent(p.lat, p.lng);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [projects]);
  const [draggedPinId, setDraggedPinId] = useState<string | null>(null);
  const [isDragModeEnabled, setIsDragModeEnabled] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const DEBUG_IDS = projects.map((p) => p.id);
  const [debugIndex, setDebugIndex] = useState(0);

  const clickStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch zoom/pan references
  const touchStartDistRef = useRef<number>(0);
  const touchStartZoomRef = useRef<number>(getBaseZoom());
  const touchStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset zoom and pan if we transition away from the map view
  useEffect(() => {
    scrollRef.current = scrollProgress;
    const isFinished = (window as any).hammerSequenceFinished;
    if (scrollProgress < 0.70 && !isFinished && !autoZoomTriggeredRef.current) {
      setZoom(getBaseZoom());
      setPan({ x: 0, y: 0 });
      setIsMapInteracting(false);
      autoZoomTriggeredRef.current = false;
      if (autoZoomTimeoutRef.current) clearTimeout(autoZoomTimeoutRef.current);
    }
  }, [scrollProgress]);

  // Helper to measure distance between two touch points
  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  };

  // Helper to find the midpoint of two touch points
  const getTouchCenter = (t1: React.Touch, t2: React.Touch, rect: DOMRect) => {
    return {
      x: (t1.clientX + t2.clientX) / 2 - rect.left - rect.width / 2,
      y: (t1.clientY + t2.clientY) / 2 - rect.top - rect.height / 2
    };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setIsMoved(false);

    if (e.touches.length === 1) {
      // Single finger drag path (only pan if we have actively clicked/activated map first)
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStartRef.current = { ...pan };
    } else if (e.touches.length === 2) {
      // Pinch tracking triggers zoom focus/activation immediately
      setIsMapInteracting(true);
      isMapInteractingRef.current = true;
      setIsDragging(true);
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
      touchStartPanRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (draggedPinId && e.touches.length === 1) {
      const container = document.querySelector(".map-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const xPercent = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
      const yPercent = ((e.touches[0].clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(0, Math.min(100, xPercent));
      const clampedY = Math.max(0, Math.min(100, yPercent));

      setCoordsState(prev => {
        const next = {
          ...prev,
          [draggedPinId]: {
            xPercent: parseFloat(clampedX.toFixed(1)),
            yPercent: parseFloat(clampedY.toFixed(1))
          }
        };
        try {
          localStorage.setItem("hammer-arkitekter-coords-v1", JSON.stringify(next));
        } catch (err) {
          console.error(err);
        }
        return next;
      });
      return;
    }

    if (e.touches.length === 1 && isDragging) {
      if (!isMapInteractingRef.current) return; // ignore swipe panning unless map is active

      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      
      if (Math.hypot(dx, dy) > 5) {
        setIsMoved(true);
      }

      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy
      });
    } else if (e.touches.length === 2 && isMapInteractingRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
      const baseDist = touchStartDistRef.current || 1;
      const scaleFactor = currentDist / baseDist;

      let nextZoom = touchStartZoomRef.current * scaleFactor;
      nextZoom = Math.max(getBaseZoom(), Math.min(nextZoom, getMaxZoom()));

      const center = getTouchCenter(e.touches[0], e.touches[1], rect);
      const ratio = nextZoom / touchStartZoomRef.current;

      setZoom(nextZoom);
      setPan({
        x: center.x - (center.x - touchStartPanRef.current.x) * ratio,
        y: center.y - (center.y - touchStartPanRef.current.y) * ratio
      }, nextZoom);
    }
  };

  const handleTouchEnd = () => {
    if (draggedPinId) {
      setDraggedPinId(null);
    }
    setIsDragging(false);
  };



  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only
    setIsMapInteracting(true); // Direct click focuses zoom/pan on map
    setIsDragging(true);
    setIsMoved(false);
    clickStartRef.current = { x: e.clientX, y: e.clientY };
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedPinId) {
      const container = document.querySelector(".map-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(0, Math.min(100, xPercent));
      const clampedY = Math.max(0, Math.min(100, yPercent));

      setCoordsState(prev => {
        const next = {
          ...prev,
          [draggedPinId]: {
            xPercent: parseFloat(clampedX.toFixed(1)),
            yPercent: parseFloat(clampedY.toFixed(1))
          }
        };
        try {
          localStorage.setItem("hammer-arkitekter-coords-v1", JSON.stringify(next));
        } catch (err) {
          console.error(err);
        }
        return next;
      });
      return;
    }

    if (!isDragging || !isMapInteracting) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.hypot(dx, dy) > 5) {
      setIsMoved(true);
    }

    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy
    });
  };

  const handleMouseUpOrLeave = () => {
    if (draggedPinId) {
      setDraggedPinId(null);
    }
    setIsDragging(false);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMapInteracting(true);

    if (zoom > getTargetZoom() + 0.1) {
      setZoom(getTargetZoom());
      setPan({ x: 0, y: 0 });
      setIsMapInteracting(false); // Zooming out completely releases interaction
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      const targetZoom = Math.max(getTargetZoom() * 1.5, 4.0);
      setZoom(targetZoom);
      setPan({
        x: -x * (targetZoom - 1),
        y: -y * (targetZoom - 1)
      }, targetZoom);
    }
  };

  // Dimensions of letter "H"
  const W = 180.99;
  const H = 123.93;
  const cx = 90.495;
  const cy = 61.965;

  // Configuration
  const isMobileSizeConfig = typeof window !== "undefined" && window.innerWidth <= 767;
  const LAYERS = isMobileSizeConfig ? 8 : 14;
  const LAYER_SPACING = 0.35; // Wider spacing for elegant density
  const GRID_STEP_X = W / 14;
  const GRID_STEP_Y = H / 12;
  const SMALL_SCALE = 0.024; // Scale factor for the sub-H shapes

  // Check if a coordinate is inside the "H" letter geometry
  const isInsideH = (x: number, y: number): boolean => {
    // Left vertical column
    if (x >= 0 && x <= 36.89 && y >= 0 && y <= 123.93) return true;
    // Right vertical column
    if (x >= 144.10 && x <= 180.99 && y >= 0 && y <= 123.93) return true;
    // Horizontal crossbar
    if (x >= 36.89 && x <= 144.10 && y >= 45.7 && y <= 76.14) return true;
    return false;
  };

  // State to track raw point calculations
  const [points] = useState<{ x: number; y: number }[]>(() => {
    const pts: { x: number; y: number }[] = [];
    
    const cols = 14;
    const rows = 12;
    const stepX = W / cols;
    const stepY = H / rows;

    for (let r = 0; r <= rows; r++) {
      const y = r * stepY;
      for (let c = 0; c <= cols; c++) {
        const x = c * stepX;
        if (isInsideH(x, y)) {
          pts.push({ x, y });
        }
      }
    }
    return pts;
  });

  // Set up Three.js scene
  const projectsRef = useRef(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return;

    let width = containerRef.current.clientWidth || window.innerWidth;
    let height = containerRef.current.clientHeight || window.innerHeight;
    
    // Prevent zero dimension NaN crash on Safari/Tablet
    if (width === 0) width = 1024;
    if (height === 0) height = 768;

    // 1. Renderer Creator
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // Transparent WebGL canvas to show HTML map underneath
    });
    // Boost pixel ratio on desktop, but cap at 1.0 on mobile to guarantee smooth 60fps framerate for heavy particles
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileSizeConfig ? 1.0 : 1.5));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    // Explicit style to prevent double rendering elements stacking or shifting to bottom-right
    const domEl = renderer.domElement;
    domEl.style.position = "absolute";
    domEl.style.top = "0";
    domEl.style.left = "0";
    domEl.style.width = "100%";
    domEl.style.height = "100%";
    domEl.style.display = "block";

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(domEl);
    }
    rendererRef.current = renderer;

    // 2. Scene setup
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2("#ffffff", 0.005);
    sceneRef.current = scene;

    // 3. Camera setup
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    // Initial camera placement for the elegant letter H - centered at Y=0
    camera.position.set(0, 0, 23);
    cameraRef.current = camera;

    // 4. Rig Group
    const rig = new THREE.Group();
    scene.add(rig);
    rigRef.current = rig;

    // 5. Lights
    const ambientLight = new THREE.AmbientLight("#ffffff", 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight("#ffffff", 1.25);
    dirLight1.position.set(20, 40, 20);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight("#e5e5e5", 0.6);
    dirLight2.position.set(-20, -10, -10);
    scene.add(dirLight2);

    // 6. Geometry: Shape for individual H symbols
    const hShape = new THREE.Shape();
    hShape.moveTo(36.89, 123.93);
    hShape.lineTo(0, 123.93);
    hShape.lineTo(0, 0);
    hShape.lineTo(36.89, 0);
    hShape.lineTo(36.89, 44.7);
    hShape.lineTo(144.10, 44.7);
    hShape.lineTo(144.10, 0);
    hShape.lineTo(180.99, 0);
    hShape.lineTo(180.99, 123.93);
    hShape.lineTo(144.10, 123.93);
    hShape.lineTo(144.10, 76.14);
    hShape.lineTo(36.89, 76.14);
    hShape.closePath();

    const geo = new THREE.ShapeGeometry(hShape, 4);
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    // Center the custom tiny H shape geometry
    geo.translate(
      -(bb.max.x + bb.min.x) / 2,
      -(bb.max.y + bb.min.y) / 2,
      0
    );

    // 7. Material
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, // White base color to multiply cleanly with instanceColor
      side: THREE.DoubleSide,
      vertexColors: true,
      transparent: true,
      fog: true
    });

    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute float instanceOpacity;
        varying float vInstanceOpacity;
        ${shader.vertexShader}
      `.replace(
        `#include <color_vertex>`,
        `#include <color_vertex>
         vInstanceOpacity = instanceOpacity;`
      );

      shader.fragmentShader = `
        varying float vInstanceOpacity;
        ${shader.fragmentShader}
      `.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `vec4 diffuseColor = vec4( diffuse, opacity * vInstanceOpacity );`
      );
    };

    // 8. Instanced Mesh Setup
    const perLayer = points.length;
    const count = perLayer * LAYERS;

    // Allocate instance opacity attribute on geometry to allow custom fading
    const opacityArr = new Float32Array(count);
    opacityArr.fill(1.0);
    const instanceOpacityAttr = new THREE.InstancedBufferAttribute(opacityArr, 1);
    geo.setAttribute("instanceOpacity", instanceOpacityAttr);

    const instancedMesh = new THREE.InstancedMesh(geo, mat, count);
    
    // Allocate instance colors for fading/depth effects
    instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(count * 3),
      3
    );
    
    rig.add(instancedMesh);
    instancedMeshRef.current = instancedMesh;

    // 9. Blueprint Map Elements on the ground
    // We removed GridHelper to improve performance and remove grid lines

    // 9b. Elegant Nolli Map of Oslo (Background Architectural Plan Layer)
    /*
    const mapTexture = new THREE.TextureLoader().load(osloNolliMap);
    mapTexture.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    mapTexture.minFilter = THREE.LinearMipmapLinearFilter;
    mapTexture.magFilter = THREE.LinearFilter;

    const mapGeo = new THREE.PlaneGeometry(40 * MAP_SCALE, 30 * MAP_SCALE);
    const mapMat = new THREE.MeshBasicMaterial({
      map: mapTexture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      opacity: 0.0
    });
    const mapMesh = new THREE.Mesh(mapGeo, mapMat);
    mapMesh.rotation.x = -Math.PI / 2;
    mapMesh.position.y = -5.81; // layers beautifully under grids (-5.8) and rings (-5.79)
    scene.add(mapMesh);
    osloMapRef.current = mapMesh;
    */

    // 10. Map markers linkage logic
    // Assign specific master points in the letter H (from layer index 0 / closest layer)
    // to become the projects that transition to map locations.
    // Let's select indices that are evenly spaced across the letter's legs and crossbar
    const projectCount = projects.length;
    const step = perLayer / (projectCount + 0.5);
    const selectedIndices: number[] = [];
    for (let idx = 0; idx < projectCount; idx++) {
      let candidate = Math.min(perLayer - 1, Math.floor((idx + 0.5) * step));
      while (selectedIndices.includes(candidate) && candidate < perLayer - 1) {
        candidate++;
      }
      selectedIndices.push(candidate);
    }

    // Associate metadata with each instance
    const particles: {
      initialX: number;
      initialY: number;
      initialZ: number;
      isProject: boolean;
      projectIndex: number;
      triggerStartProgress: number;
      triggerDuration: number;
      driftX: number;
      driftZ: number;
      rotSpeedX: number;
      rotSpeedY: number;
      rotSpeedZ: number;
      gravityConstant: number;
      initialVelocityY: number;
    }[] = [];

    const dz = W * LAYER_SPACING;
    const zStart = -dz * (LAYERS - 1) / 2;

    let totalIdx = 0;
    for (let li = 0; li < LAYERS; li++) {
      const z = zStart + li * dz;
      for (let pi = 0; pi < perLayer; pi++) {
        const pt = points[pi];
        const isProj = li === 0 && selectedIndices.includes(pi);
        const projIdx = isProj ? selectedIndices.indexOf(pi) : -1;

        // Custom seeds leveraging distinct mathematical frequencies
        const seedValue1 = Math.sin(pi * 13.7 + li * 2.3);
        const seedValue2 = Math.cos(pi * 9.1 + li * 5.7);
        const seedValue3 = Math.sin(pi * 23.4 + li * 19.8);

        // Core positioning relative to the letter's bounding center
        const relX = pt.x - cx;
        const relY = pt.y - cy;
        const relZ = z;

        // Core radial blasting direction relative to center of the H shape
        const distXZ = Math.sqrt(relX * relX + relZ * relZ) || 1.0;
        const radialX = relX / distXZ;
        const radialZ = relZ / distXZ;

        // Determine a fully uniform angular direction for even distribution all over the screen
        const radialAngle = ((pi * 7.0 + li * 13.0) * 1.618) % (Math.PI * 2);
        const angleCos = Math.cos(radialAngle);
        const angleSin = Math.sin(radialAngle);

        // Merge the radial outward force with uniform angular scatter for an elegant, gapless screen-wide dispersal
        const combinedDirX = radialX * 0.45 + angleCos * 0.55;
        const combinedDirZ = radialZ * 0.45 + angleSin * 0.55;

        // Moderat utadgående spredning før regn (økt hastighet utover)
        const speedMagnitude = 65.0 + Math.abs(seedValue1) * 35.0; 
        const driftX = combinedDirX * speedMagnitude;
        const driftZ = combinedDirZ * speedMagnitude;

        // Perfect physical timeline: Start at exactly the same time on all devices!
        const baseStart = 0.15;
        const triggerStartProgress = baseStart + (seedValue1 * 0.5 + 0.5) * 0.08;
        const triggerDuration = 0.35 + (seedValue2 * 0.5 + 0.5) * 0.12; 

        // Massive gravity and high pop for distinct, fast downward rain
        const gravityConstant = -80.0 - Math.abs(seedValue2) * 40.0;
        const initialVelocityY = 25.0 + Math.abs(seedValue3) * 15.0;

        // Spin offsets
        const rotSpeedX = seedValue1 * Math.PI * 4.5;
        const rotSpeedY = seedValue2 * Math.PI * 4.5;
        const rotSpeedZ = (seedValue1 + seedValue2) * Math.PI * 3.5;

        particles.push({
          initialX: pt.x - cx,
          initialY: pt.y - cy,
          initialZ: z,
          isProject: isProj,
          projectIndex: projIdx,
          triggerStartProgress,
          triggerDuration,
          driftX,
          driftZ,
          rotSpeedX,
          rotSpeedY,
          rotSpeedZ,
          gravityConstant,
          initialVelocityY
        });
      }
    }

    // Save particles configuration in a local reference to access in render loop
    (instancedMesh as any).customData = particles;

    // Mouse and Device motion tilt tracking
    let targetRotX = 0, targetRotY = 0;
    let deviceRotX = 0, deviceRotY = 0;
    let rotX = 0, rotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!renderer.domElement || !containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      
      // Mouse tilt only is prominent when scrolling has not dismantled the letter H
      const decay = Math.max(0, 1 - scrollRef.current * 3);
      const maxTilt = 0.14 * decay;
      targetRotY = nx * maxTilt;
      targetRotX = -ny * maxTilt;
    };

    const handleTouchMoveTilt = (e: TouchEvent) => {
      // No sliding on mobile to prevent interference with scrolling.
      if (typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 767)) {
        return;
      }
      if (!renderer.domElement || !containerRef.current || e.touches.length === 0) return;
      const r = containerRef.current.getBoundingClientRect();
      const nx = ((e.touches[0].clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.touches[0].clientY - r.top) / r.height) * 2 - 1;
      
      const decay = Math.max(0, 1 - scrollRef.current * 3);
      const maxTilt = 0.15 * decay; // Reduced by another 25% // Slightly larger tilt area for touch
      targetRotY = nx * maxTilt;
      targetRotX = -ny * maxTilt;
    };

    const handleTouchStartTilt = (e: TouchEvent) => {
      if (typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 767)) {
        // If motion sensor is granted on mobile, only allow interaction through moving the device.
        if (localStorage.getItem("hammerMotionPermission") === "granted") {
          return;
        }
      }
      if (!renderer.domElement || !containerRef.current || e.touches.length === 0) return;
      const r = containerRef.current.getBoundingClientRect();
      const nx = ((e.touches[0].clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.touches[0].clientY - r.top) / r.height) * 2 - 1;
      
      const decay = Math.max(0, 1 - scrollRef.current * 3);
      const maxTilt = 0.15 * decay; // Reduced by another 25% 
      targetRotY = nx * maxTilt;
      targetRotX = -ny * maxTilt;
    };

    let initialBeta: number | null = null;
    let initialGamma: number | null = null;

    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      
      // Calibrate base angles on first reading
      if (initialBeta === null || initialGamma === null) {
        initialBeta = e.beta;
        initialGamma = e.gamma;
        return;
      }

      // Slowly drift baseline to accommodate continuous shifting posture
      initialBeta = initialBeta * 0.96 + e.beta * 0.04;
      initialGamma = initialGamma * 0.96 + e.gamma * 0.04;

      const diffBeta = e.beta - initialBeta;
      const diffGamma = e.gamma - initialGamma;

      const decay = Math.max(0, 1 - scrollRef.current * 3);
      const maxTilt = 0.15 * decay; // Reduced by another 25% // Expressive controlled motion

      const deltaBeta = THREE.MathUtils.clamp(diffBeta, -20, 20);
      const deltaGamma = THREE.MathUtils.clamp(diffGamma, -20, 20);

      deviceRotY = (deltaGamma / 20) * maxTilt;
      deviceRotX = -(deltaBeta / 20) * maxTilt;
    };

    const requestOrientationPermission = async () => {
      const doc = window as any;
      if (
        typeof doc.DeviceOrientationEvent !== "undefined" &&
        typeof doc.DeviceOrientationEvent.requestPermission === "function"
      ) {
        try {
          const permissionState = await doc.DeviceOrientationEvent.requestPermission();
          if (permissionState === "granted") {
            window.addEventListener("deviceorientation", handleDeviceOrientation, { passive: true });
          }
        } catch (error) {
          console.warn("DeviceOrientationEvent permission request failed:", error);
        }
      } else {
        window.addEventListener("deviceorientation", handleDeviceOrientation, { passive: true });
      }
    };

    const initDeviceOrientationClick = (e: Event) => {
      // Recalibrate baseline on clicks or touches to adjust to new holding position
      initialBeta = null;
      initialGamma = null;

      // Only request the intrusive motion permission on mobile if they specifically clicked an H logo 
      // (the map markers or header logo)
      const target = e.target as HTMLElement;
      if (!target) return;
      
      const isHeaderLogo = target.closest("#header-logo-container") !== null;
      const isMapPin = target.closest("[id^='html-marker-']") !== null;
      
      if (isHeaderLogo || isMapPin) {
        requestOrientationPermission().catch(console.error);
      }
    };
    
    const initDeviceOrientationTouch = (e: Event) => {
      initialBeta = null;
      initialGamma = null;
    };

    window.addEventListener("click", initDeviceOrientationClick);
    window.addEventListener("touchstart", initDeviceOrientationTouch);

    // We can attempt direct registration for non-iOS devices which don't require user interaction
    const doc = window as any;
    if (!(typeof doc.DeviceOrientationEvent !== "undefined" && typeof doc.DeviceOrientationEvent.requestPermission === "function")) {
      requestOrientationPermission().catch(console.error); 
    } else {
      if (typeof window !== "undefined" && localStorage.getItem("hammerMotionPermission") === "granted") {
        try {
          doc.DeviceOrientationEvent.requestPermission()
            .then((permissionState: string) => {
              if (permissionState === "granted") {
                window.addEventListener("deviceorientation", handleDeviceOrientation, { passive: true });
              }
            })
            .catch(() => {
              // If it fails (e.g. requires user gesture despite being granted), try adding listener directly
              window.addEventListener("deviceorientation", handleDeviceOrientation, { passive: true });
            });
        } catch (e) {
          window.addEventListener("deviceorientation", handleDeviceOrientation, { passive: true });
        }
      }
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("deviceorientation", handleDeviceOrientation, { passive: true });
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'deviceorientation') {
        handleDeviceOrientation({ beta: e.data.beta, gamma: e.data.gamma } as any);
      }
    };
    
    window.addEventListener("message", handleMessage);
    window.addEventListener("touchmove", handleTouchMoveTilt, { passive: true });
    window.addEventListener("touchstart", handleTouchStartTilt, { passive: true });

    // Handle resizing
    const resize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      width = containerRef.current.clientWidth || window.innerWidth;
      height = containerRef.current.clientHeight || window.innerHeight;
      
      if (width === 0 || height === 0) return;
      
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener("resize", resize);

    // Initial setup
    resize();

    // Global dummy variables to avoid instantiating in render loop
    const dummyMatrix = new THREE.Matrix4();
    const dummyRotMatrix = new THREE.Matrix4();
    const dummyEuler = new THREE.Euler();
    const dummyScale = new THREE.Vector3();
    const dummyColor = new THREE.Color();
    const fgColor = new THREE.Color(0x111111);
    const bgColor = new THREE.Color("#ffffff");

    // 11. Core Animation loop
    let lastTime = performance.now();
    let smoothProgress = 0;
    let startTime: number | null = null;
    let animationFrameId: number;
    let hasFinalizedMapState = false;

    const tick = () => {
      animationFrameId = requestAnimationFrame(tick);
      
      const currentTime = performance.now();
      if (startTime === null) startTime = currentTime;
      const elapsedTime = currentTime - startTime;
      const openingProgress = Math.min(1.0, elapsedTime / 2500); // 2.5s duration
      const easeOutExpo = openingProgress === 1.0 ? 1.0 : 1.0 - Math.pow(2, -10 * openingProgress);
      const openingFactor = 1.0 - easeOutExpo;

      let rawP = (window as any).hammerScrollProgress !== undefined 
        ? (window as any).hammerScrollProgress 
        : scrollRef.current;

      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const isMobile = typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 767);
      
      let p = smoothProgress;

      // START STATE MACHINE LOGIC
      if (sequenceStateRef.current === 'playing' && sequenceStartTsRef.current !== null) {
        const seqElapsed = currentTime - sequenceStartTsRef.current;
        const TOTAL_DURATION = 3500;
        
        if (seqElapsed < TOTAL_DURATION) {
          const t = seqElapsed / TOTAL_DURATION;
          const ease = Math.sin((t * Math.PI) / 2); // easeOutSine makes landing less abrupt
          p = ease * 0.85;
        } else {
          // Finish Sequence
          p = 0.85;
          diagPhaseTimes.playing = currentTime - sequenceStartTsRef.current;
          sequenceStateRef.current = 'map';
          setSequenceState('map');
          
          if (!autoZoomTriggeredRef.current) {
            autoZoomTriggeredRef.current = true;
            if (onSequenceComplete) onSequenceComplete();
            setZoom(getTargetZoom()); // Hand off to framer animate
          }
          if (typeof window !== 'undefined' && diagActive) stopDiagnostics();
        }
      } else if (sequenceStateRef.current === 'map') {
        p = 0.85;
      } else if (!isMobile) {
        // Desktop scrub
        smoothProgress += (rawP - smoothProgress) * dt * 5.0;
        p = smoothProgress;
        
        if (p >= 0.85 ) {
          sequenceStateRef.current = 'map';
          setSequenceState('map');
          if (onSequenceComplete) onSequenceComplete();
          setZoom(getTargetZoom());
        }
      } else {
        // Mobile idle or preparing MUST hold p=0
        p = 0;
        smoothProgress = 0;
      }

      // Calculate Map Zoom based on unified 'p'
      if (sequenceStateRef.current !== 'map') {
        if (p >= 0.70 && p <= 0.85) {
           const zoomP = (p - 0.70) / 0.15; // 0.0 to 1.0
           const easeZoom = -(Math.cos(Math.PI * zoomP) - 1) / 2;
           const currentZoom = 1.0 + easeZoom * (getTargetZoom() - 1.0);
           scaleMotion.set(currentZoom * MAP_SCALE);
        } else if (p < 0.70) {
           scaleMotion.set(1.0 * MAP_SCALE);
        }
      }

      // CULLING OPTIMIZATION: Halt WebGL rendering when map is stationary
      let shouldRenderWebGL = true;
      if (sequenceStateRef.current === 'map') {
         // Force camera position just in case
         camera.position.set(0, 15.0, 0.0);
         camera.lookAt(0, 0.0, 0);
         // Skip WebGL render!
         shouldRenderWebGL = false;
         
         // On mobile, if we are in map state, we can skip the heavy math loop ENTIRELY
         // But only if we have run it AT LEAST ONCE to finalize the DOM markers!
         if (isMobile && hasFinalizedMapState) {
            return; // completely skip frame!
         }
         hasFinalizedMapState = true;
      } else {
         hasFinalizedMapState = false;
      }
      
      let frameData: any = { time: performance.now(), p, math: 0, render: 0 };
      const mathStart = performance.now();

      let floatX = 0;
      let floatY = 0;
      if (isMobile) {
        if (!hasRequestedMotionRef.current && p < 0.1) {
          // Floating animation (more noticeable to indicate 3D nature)
          // Smoothly fade out the idle animation to prevent a sudden snap/shake at p=0.1
          const fadeOut = Math.max(0, 1.0 - p * 10.0);
          floatX = Math.sin(elapsedTime * 0.002) * 0.056 * fadeOut;
          floatY = Math.cos(elapsedTime * 0.0015) * 0.056 * fadeOut;
        }
      }

      // Interpolate tilt (incorporate both desk mouse panning and true device orientation tilt)
      const ease = 0.08;
      rotX += ((targetRotX + deviceRotX + floatX) - rotX) * ease;
      rotY += ((targetRotY + deviceRotY + floatY) - rotY) * ease;
      if (rig) {
        rig.rotation.x = rotX;
        rig.rotation.y = rotY;
      }

      // 12. Camera Positioning along scroll progress
      // p goes 0.0 to 1.0.
      // - 0.0 to 0.2: Camera looks straight at modern central H
      // - 0.20 to 0.65: Camera flies smoothly up and tilts downwards to face the blueprint map
      // - 0.65 to 0.85: Camera sits in perfect top-down architectural layout observing the blueprint with 8 highlights
      // - 0.85 to 1.00: Camera pans down to transition to the portfolio
      let camTargetY = 0;
      let camY = 0.0; // Centered vertically at starting state
      let camZ = isMobile ? 26 : 22;
      let camX = 0;

      if (p <= 0.05) {
        // Front facing focus
        camera.position.set(0, camY, camZ);
        camera.lookAt(0, 0, 0);
      } else if (p > 0.05 && p < 0.40) {
        // Move camera EARLY so it settles BEFORE the heavy rain lands, keeping the shot calm!
        const u = (p - 0.05) / 0.35; // normalized 0 to 1
        const uEase = u * u * (3 - 2 * u); // smoothstep

        // Camera shifts from (0, camY, camZ) to perfect bird-eye site map view (0, 15.0, 0) looking at (0, 0, 0)
        camera.position.x = THREE.MathUtils.lerp(0, 0, uEase);
        camera.position.y = THREE.MathUtils.lerp(camY, 15.0, uEase);
        camera.position.z = THREE.MathUtils.lerp(camZ, 0.0, uEase);
        
        camTargetY = THREE.MathUtils.lerp(0, 0.0, uEase);
        camera.lookAt(0, camTargetY, 0);
      } else {
        // Map State: Stationary blueprint surveyor view fully settled
        camera.position.set(0, 15.0, 0.0);
        camera.lookAt(0, 0.0, 0);
      }

      // 13. Reveal architectural site rings and grids during the scroll sequence
      let gridOpacity = 0;
      if (p > 0.15 && p <= 0.85) {
        gridOpacity = (p - 0.15) / 0.70; // scales 0 to 1
      } else if (p > 0.85) {
        gridOpacity = 1.0;
      }


      /*
      const osloMapMesh = osloMapRef.current;
      if (osloMapMesh) {
        (osloMapMesh.material as THREE.Material).opacity = gridOpacity * 0.45; // Perfectly balanced low-contrastPresence
      }
      */
      // 14. Adjust scaling of letters as viewport shifts (mobile zoom adjustment)
      const scaleBoost = (isMobile ? 0.42 : 0.55) * 0.35 * 1.30 * 1.1875;
      const baseRigScale = (16 / (Math.max(W, H) || 1)) * scaleBoost;
      const currentRigScale = baseRigScale * (scaleMotion.get() / MAP_SCALE);
      
      rig.scale.setScalar(currentRigScale);
      rig.updateMatrixWorld(true);

      // 15. Render particle positions
      const mesh = instancedMeshRef.current;
      if (mesh && (mesh as any).customData) {
        const customParticles = (mesh as any).customData;
        const opacityAttr = mesh.geometry.getAttribute("instanceOpacity") as THREE.InstancedBufferAttribute;

        // CULLING OPTIMIZATION: Only compute particles if they are visible (p < 0.85)
        if (p < 0.85) {
          for (let i = 0; i < count; i++) {
            const part = customParticles[i];
            
            // Compute local animation state based on scroll
            let t = 0;
            if (p >= part.triggerStartProgress) {
              t = Math.min(1, (p - part.triggerStartProgress) / part.triggerDuration);
            }

            // Real physics and gravity-acceleration simulation as a function of the scrolling-progress 't'
            const gravityConstant = part.gravityConstant; 
            const initialVelocityY = part.initialVelocityY; 
            const initialVelocityX = part.driftX; // horizontal launch velocity (fully unscaled for wider screen spread)
            const initialVelocityZ = part.driftZ; // depth launch velocity

            // Trajectory integration (s = v0 * t + 0.5 * a * t^2)
            const physX = part.initialX + initialVelocityX * t;
            const physY = part.initialY + initialVelocityY * t + 0.5 * gravityConstant * t * t;
            const physZ = part.initialZ + initialVelocityZ * t;

            let x = part.initialX;
            let y = part.initialY;
            let z = part.initialZ;

            let rotXVal = 0;
            let rotYVal = 0;
            let rotZVal = 0;

            let finalScale = SMALL_SCALE * 1.3;
            let opacityVal = 1.0;

            if (part.isProject) {
              // High-precision landing glide to project coordinates!
              const proj = projectsRef.current[part.projectIndex];
              if (!proj) continue; // Safety bounds check for dynamic loading

              
              // Eased smooth transition using the custom spring-damping physics algorithm
              const tSpring = getSpringWeight(t);
              
              // Target coordinates mapped to local rig space coordinates
              const targetX = (part.targetX * MAP_SCALE) / currentRigScale;
              const targetY = part.targetY / currentRigScale;
              const targetZ = (part.targetZ * MAP_SCALE) / currentRigScale;

              // Transition gracefully from the physical gravitational path to the exact target coordinate
              x = THREE.MathUtils.lerp(physX, targetX, tSpring);
              y = THREE.MathUtils.lerp(physY, targetY, tSpring);
              z = THREE.MathUtils.lerp(physZ, targetZ, tSpring);

              // Align orientation seamlessly to lie flat on the map blueprint, matching the exact HTML marker rotation at landing
              const targetRotYVal = THREE.MathUtils.degToRad(getProjectRotation(proj.id));
              rotXVal = THREE.MathUtils.lerp(part.rotSpeedX * t, -Math.PI / 2, tSpring); 
              rotYVal = THREE.MathUtils.lerp(part.rotSpeedY * t, targetRotYVal, tSpring);
              rotZVal = THREE.MathUtils.lerp(part.rotSpeedZ * t, 0, tSpring);

              // Transition smoothly from 1.3x scale to 1.0x scale as particles settle to map markers
              finalScale = THREE.MathUtils.lerp(SMALL_SCALE * 1.3, SMALL_SCALE, tSpring);

              // Project marker stays dark/charcoal `#111111`
              dummyColor.copy(fgColor);

              // Swap instantly at 0.70 to avoid white fade
              opacityVal = p >= 0.70 ? 0.0 : 1.0;
            } else {
              // Ordinary dissolving background particle follows the full simulated gravity track
              x = physX;
              y = physY;
              z = physZ;

              // Spin continuously as they tumble
              rotXVal = part.rotSpeedX * t;
              rotYVal = part.rotSpeedY * t;
              rotZVal = part.rotSpeedZ * t;

              // Shrink completely to zero as it dissolves, starting from 1.3x scale
              finalScale = (SMALL_SCALE * 1.3) * (1.0 - t * t);

              // Fade to background color matching clean environment
              const lerpVal = Math.min(1, t * 1.4);
              dummyColor.copy(fgColor).lerp(bgColor, lerpVal);

              // Gently fade opacity as it dissolves
              opacityVal = Math.max(0, 1.0 - t * t * 1.3);
            }

            // Apply opening animation (reversed explosion)
            if (openingFactor > 0.001) {
              x += part.driftX * openingFactor * 2.5;
              y += Math.abs(part.initialVelocityY) * openingFactor * 3.0; 
              z += part.driftZ * openingFactor * 2.5;
              
              rotXVal += part.rotSpeedX * openingFactor;
              rotYVal += part.rotSpeedY * openingFactor;
              rotZVal += part.rotSpeedZ * openingFactor;
              
              if (openingProgress < 0.2) {
                opacityVal *= openingProgress / 0.2;
              }
            }

            // Build matrix transform for this instance
            dummyMatrix.makeTranslation(x, y, z);
            dummyEuler.set(rotXVal, rotYVal, rotZVal);
            dummyRotMatrix.makeRotationFromEuler(dummyEuler);
            dummyMatrix.multiply(dummyRotMatrix);
            dummyScale.set(finalScale, finalScale, finalScale);
            dummyMatrix.scale(dummyScale);

            mesh.setMatrixAt(i, dummyMatrix);
            mesh.instanceColor!.setXYZ(i, dummyColor.r, dummyColor.g, dummyColor.b);
            if (opacityAttr) {
              opacityAttr.setX(i, opacityVal);
            }
          }

          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true;
          }
          if (opacityAttr) {
            opacityAttr.needsUpdate = true;
          }
        }

        // 16. Update Actual HTML Map Markers
        const targetMarkerOpacity = p >= 0.70 ? "1" : "0";
        projectsRef.current.forEach((proj) => {
          const actualMarker = actualMarkersRef.current[proj.id];
          if (actualMarker && actualMarker.style.opacity !== targetMarkerOpacity) {
            actualMarker.style.opacity = targetMarkerOpacity;
            actualMarker.style.pointerEvents = p >= 0.70 ? "auto" : "none";
          }
        });
        
        // Auto-Zoom flawlessly is now handled directly by the time-sequence block!
        // We removed the redundant autoZoomTriggeredRef.current block here.

        // Update the HTML Map Layer opacity and pointer-events dynamically inside tick
        let mapOpacityVal = 0.0;
        if (p >= 0.15 && p < 0.65) {
          // Fade in map early so it's visible UNDER the particles during the rain
          mapOpacityVal = Math.pow((p - 0.15) / 0.50, 2); // Ease-in curve
        } else if (p >= 0.65) {
          mapOpacityVal = 1.0;
        }

        if (htmlMapContainerRef.current) {
          htmlMapContainerRef.current.style.opacity = mapOpacityVal.toString();
        }
        if (htmlMapInteractiveWrapperRef.current) {
          htmlMapInteractiveWrapperRef.current.style.pointerEvents = mapOpacityVal > 0.05 ? "auto" : "none";
        }
      }

      frameData.math = performance.now() - mathStart;
      
      const renderStart = performance.now();
      if (shouldRenderWebGL && rendererRef.current && sceneRef.current && cameraRef.current) {
        if (containerRef.current) containerRef.current.style.visibility = "visible";
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      } else {
        if (containerRef.current) containerRef.current.style.visibility = "hidden";
      }
      frameData.render = performance.now() - renderStart;
      
      if (diagActive) {
        diagFrames.push(frameData);
      }
    };

    tick();

    if (typeof window !== 'undefined') {
      (window as any).startDiagnostics = startDiagnostics;
    }
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("deviceorientation", handleDeviceOrientation);
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("touchmove", handleTouchMoveTilt);
      window.removeEventListener("touchstart", handleTouchStartTilt);
      window.removeEventListener("deviceorientation", handleDeviceOrientation);
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("click", initDeviceOrientationClick);
      window.removeEventListener("touchstart", initDeviceOrientationTouch);
      window.removeEventListener("resize", resize);
      if (renderer.domElement && containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (osloMapRef.current) {
        if (osloMapRef.current.geometry) osloMapRef.current.geometry.dispose();
        const mapM = osloMapRef.current.material as THREE.MeshBasicMaterial;
        if (mapM) {
          if (mapM.map) mapM.map.dispose();
          mapM.dispose();
        }
      }

    };
  }, [points]);

  // Safely inject markers into 3D instances when projects asynchronously load, without full WebGL teardown!
  useEffect(() => {
    const mesh = instancedMeshRef.current as any;
    if (!mesh || !mesh.customData) return;
    
    const customParticles = mesh.customData;
    
    // Reset previous assignments
    for (let i = 0; i < customParticles.length; i++) {
        customParticles[i].isProject = false;
        customParticles[i].projectIndex = -1;
    }

    if (projects.length === 0) return;

    const validProjects = projects.filter(proj => 
      typeof proj.lat === 'number' && !isNaN(proj.lat) && typeof proj.lng === 'number' && !isNaN(proj.lng)
    );
    
    const projectCount = validProjects.length;
    if (projectCount === 0) return;

    const isMobileSizeConfig = typeof window !== "undefined" && window.innerWidth <= 767;
    const LAYERS = isMobileSizeConfig ? 8 : 14;
    const perLayer = customParticles.length / LAYERS;
    const step = perLayer / (projectCount + 0.5);
    
    const selectedIndices: number[] = [];
    for (let idx = 0; idx < projectCount; idx++) {
      let candidate = Math.min(perLayer - 1, Math.floor((idx + 0.5) * step));
      while (selectedIndices.includes(candidate) && candidate < perLayer - 1) {
        candidate++;
      }
      selectedIndices.push(candidate);
    }

    // Inject exact indexes pointing back to the robust `projects` array via ID
    for (let pi = 0; pi < perLayer; pi++) {
      if (selectedIndices.includes(pi)) {
         const validIndex = selectedIndices.indexOf(pi);
         const proj = validProjects[validIndex];
         const originalIndex = projects.findIndex(p => p.id === proj.id);
         
         customParticles[pi].isProject = true;
         customParticles[pi].projectIndex = originalIndex;

         // Pre-calculate target landing coordinates so we don't compute on every frame
         const { xPercent, yPercent } = projectLatLngToMapPercent(proj.lat, proj.lng);
         const mapWidth = 40;
         const mapHeight = 40 * (1270 / 2048);
         customParticles[pi].targetX = -mapWidth / 2 + (xPercent / 100) * mapWidth;
         customParticles[pi].targetY = -5.75;
         customParticles[pi].targetZ = -mapHeight / 2 + (yPercent / 100) * mapHeight;
      }
    }
  }, [projects, points]);

  const mapFilters = [
    { id: "ALLE", label: "Alle", icon: null },
    { id: "BOLIG", label: "Bolig", icon: boligIcon },
    { id: "OFFENTLIG", label: "Offentlig", icon: offentligIcon },
    { id: "NÆRING", label: "Næring", icon: naeringIcon }
  ];

  const getFilterMatch = (proj: Project, filter: string) => {
    if (filter === "ALLE") return true;
    const cat = proj.category.toLowerCase();
    if (filter === "BOLIG") return cat.includes("residential") || cat.includes("multi-family") || cat.includes("renovation");
    if (filter === "OFFENTLIG") return cat.includes("public") || cat.includes("cultural");
    if (filter === "NÆRING") return cat.includes("commercial") || cat.includes("mixed use");
    return true;
  };


  const isMobileSize = typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 767);
  const isCategoriesCollapsed = false;
  
  const displayZoom = zoom;

  return (

    <div className="relative w-full h-full select-none overflow-hidden bg-white">


      {/* Diagnostics Overlay */}
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get("startDiagnostics") === "true" && reportString && (
        <div className="fixed top-4 left-4 z-50 bg-black/80 text-green-400 p-4 text-xs font-mono rounded max-w-sm overflow-auto max-h-[80vh] border border-green-500/30 backdrop-blur pointer-events-auto shadow-xl">
          <h3 className="text-white font-bold mb-2">Sequence Diagnostics</h3>
          <p className="text-white/70 mb-2">Note: RenderTime is CPU dispatch only. Actual GPU compositing time is unmeasurable in JS.</p>
          <pre className="whitespace-pre-wrap">{reportString}</pre>
        </div>
      )}
      
      {/* Decode Error Overlay */}
      {decodeError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 pointer-events-auto">
          <div className="text-center p-8 bg-neutral-900 rounded-xl max-w-sm border border-neutral-800">
            <p className="text-red-400 mb-4">Kartet kunne ikke lastes ned eller dekodes skikkelig.</p>
            <button 
              onClick={handleRetryDecode}
              className="px-6 py-3 bg-white text-black font-semibold rounded hover:bg-neutral-200 transition-colors"
            >
              Prøv på nytt
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Map Container */}
      <div 
        id="blyHBg" 
        ref={containerRef} 
        style={{ zIndex: 40, pointerEvents: scrollProgress < 0.65 ? "auto" : "none" }}
        className={`absolute inset-0 w-full h-full ${scrollProgress < 0.65 ? 'cursor-pointer' : ''}`}
        onClick={() => {
          triggerHaptic();
          if (scrollRef.current < 0.65 && onHClick && typeof window !== "undefined" && window.innerWidth > 1024) {
            onHClick();
          }
        }}
      />

      {/* 2D HTML Map Layer with crisp StorOslo.png map and absolute-percentage markers */}
      <div 
        ref={htmlMapContainerRef}
        style={{ 
          pointerEvents: "none",
          opacity: 0
        }} 
        className="absolute inset-0 z-30 flex items-center justify-center bg-white transition-opacity duration-300 overflow-hidden select-none"
      >
        {/* INTERMEDIATE FIXED WRAPPER for interaction and overflow clipping */}
        <div
          ref={htmlMapInteractiveWrapperRef}
          className="relative overflow-hidden flex items-center justify-center"
          style={{
            pointerEvents: "none",
            touchAction: "none", // Traps touch for map panning, leaving white margins for page scrolling
            width: "90vw",
            maxHeight: isMobileSize ? "75dvh" : "none",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        >
          <motion.div
            ref={mapContainerRef}
            className="map-container relative flex-shrink-0"
            style={{
              cursor: "none",
              transformOrigin: "center",
              willChange: "transform",
              backfaceVisibility: "hidden",
              scale: scaleMotion,
              width: isMobileSize && typeof window !== "undefined" && window.innerHeight > window.innerWidth 
                ? "calc(75dvh * (2048 / 1270))" 
                : "90vw",
              height: isMobileSize && typeof window !== "undefined" && window.innerHeight > window.innerWidth 
                ? "75dvh" 
                : "calc(90vw * (1270 / 2048))"
            }}
            animate={{
              x: pan.x,
              y: pan.y
            }}
          transition={
            isDragging 
              ? { type: "tween", duration: 0 } 
              : { type: "tween", duration: isMapInteracting ? 0.4 : 1.5, ease: "easeInOut" }
          }
          onClick={(e) => {
            if (isDragModeEnabled || isMoved) return;

            // Clear bottom sheet on map background click
            setSelectedMobileProject(null);

            const rect = e.currentTarget.getBoundingClientRect();

            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            const id = DEBUG_IDS[debugIndex];

            console.log(
               `"${id}": { xPercent: ${x.toFixed(1)}, yPercent: ${y.toFixed(1)} },`
            );

            setDebugIndex((prev) => Math.min(prev + 1, DEBUG_IDS.length - 1));
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
              setHoverCoords({ x, y });
            } else {
              setHoverCoords(null);
            }
          }}
          onMouseLeave={() => {
            setHoverCoords(null);
          }}
        >
          {/* The crisp, centered PNG artwork rendered directly */}
          <div className="absolute inset-0 w-full h-full pointer-events-none select-none origin-center">
            <img 
              src={osloNolliMap}
              alt="Oslo Nolli Map"
              className="w-full h-full object-fill pointer-events-none"
              loading="eager"
              fetchPriority="high"
            />
          </div>
            
          {/* Project Markers rendered above the image */}
            {projects.filter(proj => typeof proj.lat === 'number' && !isNaN(proj.lat) && typeof proj.lng === 'number' && !isNaN(proj.lng)).map((proj, idx) => {
              const coord = coordsState[proj.id];
              const isSelectedDesk = activeProject?.id === proj.id;
              const isSelectedMob = selectedMobileProject?.id === proj.id;
              const isTouchDevice = typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 1024);
              const isActive = isTouchDevice ? isSelectedMob : isSelectedDesk;
              if (!coord || !getFilterMatch(proj, activeFilter)) return null;
              
              const isMobile = typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 767);
              
              // Mobile opacity logic
              const hasMobileSelection = !!selectedMobileProject;
              const opacity = isTouchDevice && hasMobileSelection && !isSelectedMob ? "opacity-20" : "opacity-100";
              
              // Original mobile scale logic, but with a 40% boost at max zoom to prevent them from becoming too small
              const originalMobileScale = (isSelectedMob ? 2.346 : 1.38) * (0.6 / displayZoom) * (0.75 + Math.max(0, displayZoom - 3.15) / (18.0 - 3.15) * 0.25);
              const zoomBoost = 1.0 + (Math.max(0, displayZoom - 1.4) / 6.6) * 0.40; // 40% less shrinking at max zoom (8.0)
              
              const markerScale = isTouchDevice ? 
                originalMobileScale * zoomBoost :
                (0.4 + 0.6 / displayZoom) * 0.8;
                
              // Perfectly invert the map zoom and marker scale so the tooltip is exactly its base CSS size on screen.
              const tooltipScale = 1 / (displayZoom * markerScale);
              const inverseScale = isTouchDevice ? tooltipScale : 1;
              const btnSize = isTouchDevice ? 44 * inverseScale : 16;
              const btnOffset = isTouchDevice ? -22 * inverseScale : -8;
              const svgSize = isTouchDevice ? (isDragModeEnabled ? 10 * inverseScale : 8 * inverseScale) : (isDragModeEnabled ? 6.3 : 5.75);

              return (
                <div
                  key={proj.id}
                  ref={(el) => {
                    if (el) actualMarkersRef.current[proj.id] = el;
                  }}
                  className={`absolute ${isActive ? 'z-[60]' : 'z-40 hover:z-[60]'} pointer-events-none project-marker ${opacity} transition-opacity duration-300`}
                  style={{
                    position: "absolute",
                    left: `${coord.xPercent}%`,
                    top: `${coord.yPercent}%`,
                    width: "0px",
                    height: "0px",
                    opacity: 0 // Default to invisible until p >= 0.70 in tick()
                  }}
                >
                  <motion.div
                    style={{
                      width: "0px",
                      height: "0px",
                      position: "relative"
                    }}
                    animate={{ scale: markerScale }}
                    transition={
                      isDragging 
                        ? { type: "tween", duration: 0 } 
                        : { type: "tween", duration: 0.3, ease: "easeOut" }
                    }
                  >
                    <button
                      id={`html-marker-${proj.id}`}
                      aria-label={`Prosjekt: ${proj.name}, ${proj.location}`}
                      aria-expanded={isActive}
                      style={{ 
                        WebkitTapHighlightColor: 'transparent',
                        width: `${btnSize}px`,
                        height: `${btnSize}px`,
                        left: `${btnOffset}px`,
                        top: `${btnOffset}px`
                      }}
                      onClick={(e) => {
                        triggerHaptic();
                        if (isDragModeEnabled) {
                          e.stopPropagation();
                          return;
                        }
                        e.stopPropagation();
                        
                        const isMobile = typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 767);
                        if (isMobile) {
                          let targetProj = proj;
                          
                          // e.detail > 0 means physical tap/click, not keyboard Enter (which is 0)
                          if (e.detail > 0 && e.clientX && e.clientY) {
                            let minDistance = Infinity;
                            const allButtons = document.querySelectorAll('button[id^="html-marker-"]');
                            
                            allButtons.forEach((btn) => {
                               const parent = btn.closest('.project-marker') as HTMLElement;
                               if (parent && parent.style.pointerEvents !== "none") {
                                  const rect = btn.getBoundingClientRect();
                                  const centerX = rect.left + rect.width / 2;
                                  const centerY = rect.top + rect.height / 2;
                                  const dist = Math.hypot(centerX - e.clientX, centerY - e.clientY);
                                  
                                  if (dist < minDistance && dist <= 44) { 
                                      minDistance = dist;
                                      const btnProjId = btn.id.replace('html-marker-', '');
                                      const foundProj = projects.find(p => p.id === btnProjId);
                                      if (foundProj) targetProj = foundProj;
                                  }
                               }
                            });
                          }

                          if (selectedMobileProject?.id === targetProj.id) {
                            setSelectedMobileProject(null);
                          } else {
                            setSelectedMobileProject(targetProj);
                          }
                        }
                      }}
                      onMouseDown={(e) => {
                        if (isDragModeEnabled) {
                          e.stopPropagation();
                          e.preventDefault();
                          setDraggedPinId(proj.id);
                        }
                      }}
                      onTouchStart={(e) => {
                        if (isDragModeEnabled) {
                          e.stopPropagation();
                          setDraggedPinId(proj.id);
                        }
                      }}
                      onMouseEnter={() => setHoveredProjectId(proj.id)}
                      onMouseLeave={() => setHoveredProjectId(null)}
                      className={`group absolute focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:rounded-full flex items-center justify-center ${
                        isDragModeEnabled 
                          ? "cursor-grab active:cursor-grabbing" 
                          : "cursor-default"
                      }`}
                    >
                      <div 
                        className="pointer-events-none flex items-center justify-center transition-transform duration-300 ease-out absolute inset-0"
                      >
                        {/* Center pinpoint - H-logo visual with deterministic rotation (between -20 and 20 degrees) and no transparency */}
                        <span
                          style={{
                            transform: `rotate(${getProjectRotation(proj.id)}deg)`,
                            transformOrigin: "center"
                          }}
                          className="transition-all duration-300 pointer-events-none flex items-center justify-center"
                        >
                          <svg
                            viewBox="0 0 180.99 123.93"
                            style={{ width: `${svgSize}px` }}
                            className={`transition-all duration-300 opacity-100 select-none h-auto ${
                              isDragModeEnabled
                                ? `fill-amber-500 hover:fill-amber-600 drop-shadow-sm`
                                : `fill-neutral-900 drop-shadow-sm`
                            }`}
                          >
                            <path d="M 36.89 0 L 0 0 L 0 123.93 L 36.89 123.93 L 36.89 79.23 L 144.10 79.23 L 144.10 123.93 L 180.99 123.93 L 180.99 0 L 144.10 0 L 144.10 47.79 L 36.89 47.79 Z" />
                          </svg>
                          <span className="sr-only">{proj.name}</span>
                        </span>

                        {/* Popover visual tooltip text */}
                        {!isDragModeEnabled && (
                          <div
                            style={{ 
                              transform: `translateX(-50%) scale(${tooltipScale})`,
                              transformOrigin: "bottom center",
                              marginBottom: `${16 / (displayZoom * markerScale)}px`
                            }}
                            className={`flex flex-col w-48 absolute bottom-full left-1/2 pointer-events-none z-50 ${isTouchDevice && selectedMobileProject?.id !== proj.id ? 'hidden' : ''}`}
                          >
                            <div className={`relative w-full font-sans tracking-widest text-neutral-900 overflow-visible origin-bottom
                            opacity-0 group-hover:opacity-100
                            ${isActive ? '!opacity-100' : ''}
                          `}>
                            <div className="flex flex-col w-full bg-white rounded-none overflow-hidden shadow-lg border border-neutral-100">
                              <div className="w-full h-32 relative bg-neutral-100">
                                {proj.image ? (
                                  (isActive || hoveredProjectId === proj.id) ? (
                                    <img 
                                      src={proj.image.includes('?') ? `${proj.image}&w=400&fm=webp&q=75` : `${proj.image}?w=400&fm=webp&q=75`} 
                                      alt={proj.name} 
                                      className="w-full h-full object-cover" 
                                    />
                                  ) : null
                                ) : (
                                   <div className="w-full h-full flex items-center justify-center text-neutral-400 text-[10px] bg-white">Bilde kommer</div>
                                )}
                              </div>
                              <div className="px-2 py-2 bg-white relative z-10 text-center">
                                <div className="font-medium uppercase tracking-[0.1em] text-[10px] truncate">{proj.name}</div>
                              </div>
                            </div>
                            {/* Triangle pointer */}
                            <div className="absolute -bottom-[4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-b border-r border-neutral-100 rotate-45 z-[-1]" />
                          </div>
                        </div>
                      )}
                      </div>
                    </button>
                  </motion.div>
                </div>
              );
            })}
          </motion.div>
        </div>

          {/* White Fade Overlays fixed to the screen edges to provide a permanent soft vignette over the map */}
          <div className="absolute inset-x-0 top-0 h-24 md:h-32 bg-gradient-to-b from-white via-white/80 to-white/0 pointer-events-none z-50" />
          <div className="absolute inset-x-0 bottom-0 h-32 md:h-48 bg-gradient-to-t from-white via-white/80 to-white/0 pointer-events-none z-50" />
          <div className="absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-white via-white/80 to-white/0 pointer-events-none z-50" />
          <div className="absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-white via-white/80 to-white/0 pointer-events-none z-50" />

          {/* Sleek Minimalist Architectural Map Controls Panel */}
          <div className={`hidden absolute bottom-8 right-8 z-40 flex flex-col gap-2 items-center ${scrollProgress < 0.65 ? "pointer-events-none" : "pointer-events-auto"} ${isMobileSize && selectedMobileProject ? "hidden" : ""} select-none`}>
            {/* Lock/Unlock Markers Toggle */}
            <button
              onClick={(e) => {
                triggerHaptic();
                e.stopPropagation();
                setIsDragModeEnabled(prev => !prev);
              }}
              className={`w-10 h-10 border rounded-none flex items-center justify-center transition-all shadow-sm cursor-pointer ${
                isDragModeEnabled
                  ? "bg-amber-500 border-amber-500 text-white hover:bg-amber-600 cursor-pointer"
                  : "bg-[#fffbf0]/80 border-neutral-200 text-neutral-800 hover:bg-neutral-900 hover:text-white hover:border-neutral-900"
              }`}
              title={isDragModeEnabled ? "Lås markører" : "Lås opp markører for manuell plassering"}
              aria-label={isDragModeEnabled ? "Lås markører" : "Lås opp markører for manuell plassering"}
            >
              {isDragModeEnabled ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>

            {isDragModeEnabled && (
              <button
                onClick={(e) => {
                  triggerHaptic();
                  e.stopPropagation();
                  navigator.clipboard.writeText(JSON.stringify(coordsState, null, 2))
                    .catch(err => console.warn("Clipboard write failed:", err));
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className={`w-10 h-10 border rounded-none flex items-center justify-center transition-all shadow-sm cursor-pointer ${
                  isCopied
                    ? "bg-green-500 border-green-500 text-white"
                    : "bg-[#fffbf0]/80 border-neutral-200 text-neutral-800 hover:bg-neutral-900 hover:text-white hover:border-neutral-900"
                }`}
                title="Kopier koordinater (JSON)"
                aria-label="Kopier koordinater"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={(e) => {
                triggerHaptic();
                e.stopPropagation();
                setZoom(getTargetZoom());
                setPan({ x: 0, y: 0 });
                setIsMapInteracting(false);
              }}
              className={`w-10 h-10 border rounded-none flex items-center justify-center transition-all shadow-sm ${
                Math.abs(zoom - getTargetZoom()) > 0.05 || pan.x !== 0 || pan.y !== 0
                  ? "bg-neutral-900 border-neutral-900 text-white cursor-pointer hover:bg-neutral-800"
                  : "bg-[#fffbf0]/80 border-neutral-200 text-neutral-400 opacity-50 cursor-default"
              }`}
              title="Nullstill zoom og pan"
              aria-label="Nullstill zoom og pan"
              disabled={Math.abs(zoom - getTargetZoom()) <= 0.05 && pan.x === 0 && pan.y === 0}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Coordinates HUD */}
          <div 
            className={`hidden absolute bottom-8 right-[72px] z-40 h-10 pointer-events-none select-none bg-[#fffbf0]/80 border border-neutral-200 backdrop-blur-md px-3 flex items-center gap-4 text-neutral-800 font-mono text-[10px] tracking-wider shadow-sm transition-all duration-300 ${
              hoverCoords ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="opacity-40">X:</span>
              <span className="font-semibold">{hoverCoords ? hoverCoords.x.toFixed(1) : "0.0"}%</span>
            </div>
            <div className="w-[1px] h-3 bg-neutral-200" />
            <div className="flex items-center gap-1.5">
              <span className="opacity-40">Y:</span>
              <span className="font-semibold">{hoverCoords ? hoverCoords.y.toFixed(1) : "0.0"}%</span>
            </div>
          </div>
        </div>

      {/* Dummy DOM removed */}
    </div>
  );
};
