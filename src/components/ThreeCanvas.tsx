import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
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

  const zeta = 0.85; // slightly higher damping ratio for an elegantly controlled, non-jittery architectural motion
  const omega = 6.5; // lower natural frequency to produce a slower, more deliberate and high-precision glide into target positions
  
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
  const t1x = 24.0, t1y = 50.0;
  const t2x = 30.3, t2y = 37.6;
  const t3x = 52.9, t3y = 46.8;
  const s1lat = 59.911, s1lng = 10.635;
  const s2lat = 59.932, s2lng = 10.655;
  const s3lat = 59.917, s3lng = 10.740;
  
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
  const mapHeight = 30;
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
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  projects,
  scrollProgress,
  onProjectClick,
  activeProject,
  onHClick,
  hasRequestedMotion = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rigRef = useRef<THREE.Group | null>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const concentricRingsRef = useRef<THREE.Group | null>(null);
  const osloMapRef = useRef<THREE.Mesh | null>(null);
  const htmlMapContainerRef = useRef<HTMLDivElement>(null);

  // Keep track of projected 2D coordinates for HTML markers without triggering React re-renders
  const markersRef = useRef<(HTMLDivElement | null)[]>([]);

  // Keep track of scroll progress dynamically to avoid reconstructing entire ThreeJS components on scroll
  const scrollRef = useRef(scrollProgress);

  const getBaseZoom = () => typeof window !== "undefined" && window.innerWidth <= 767 ? 3.15 : 1.0;
  const getMaxZoom = () => typeof window !== "undefined" && window.innerWidth <= 767 ? 18.0 : 6.0;

  // Zoom & Pan states for the 2D HTML Map Layer
  const [zoom, setZoom] = useState(getBaseZoom());
  const zoomRef = useRef(getBaseZoom());
  const [pan, setPanState] = useState({ x: 0, y: 0 });

  const setPan = (newPan: { x: number, y: number } | ((prev: {x: number, y: number}) => {x: number, y: number}), currentZoom: number = zoom) => {
    setPanState(prev => {
       const next = typeof newPan === 'function' ? newPan(prev) : newPan;
       if (next.x === 0 && next.y === 0) return next;
       
       const baseW = typeof window !== 'undefined' ? window.innerWidth * 0.9 : 1000;
       const baseH = baseW / (2048 / 1270);
       const scaledW = baseW * currentZoom;
       const scaledH = baseH * currentZoom;
       const winW = typeof window !== 'undefined' ? window.innerWidth : 1000;
       const winH = typeof window !== 'undefined' ? window.innerHeight : 1000;
       
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
  useEffect(() => {
    isMapInteractingRef.current = isMapInteracting;
  }, [isMapInteracting]);
  const [selectedMobileProject, setSelectedMobileProject] = useState<Project | null>(null);
  
  const hasRequestedMotionRef = useRef(hasRequestedMotion);
  useEffect(() => {
    hasRequestedMotionRef.current = hasRequestedMotion;
  }, [hasRequestedMotion]);
  
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

      // If we've reached the very end of the scroll track (map fully settled)
      if (scrollRef.current >= 0.99) {
        if (e.deltaY > 0) {
          // Scrolling down: zoom in
          e.preventDefault();
          setZoom(z => {
            // Slower zooming at the start (z near 1.0)
            const speed = z < 1.3 ? 0.0015 : 0.0035;
            const newZ = Math.min(getMaxZoom(), z + (e.deltaY * speed));
            if (newZ > getBaseZoom() + 0.05) setIsMapInteracting(true);
            return newZ;
          });
        } else if (e.deltaY < 0) {
          // Scrolling up: zoom out, ONLY if we are zoomed in.
          // Otherwise, we let native browser scroll take over.
          if (zoomRef.current > getBaseZoom() + 0.001) {
            e.preventDefault();
            setZoom(z => {
              const speed = z < 1.3 ? 0.0015 : 0.0035;
              const newZ = Math.max(getBaseZoom(), z + (e.deltaY * speed));
              // Center the map securely when completely unzoomed
              if (newZ <= getBaseZoom() + 0.05) {
                setPan({ x: 0, y: 0 });
                setIsMapInteracting(false);
                return getBaseZoom();
              }
              return newZ;
            });
          }
        }
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
    if (scrollProgress < 0.60) {
      setZoom(getBaseZoom());
      setPan({ x: 0, y: 0 });
      setIsMapInteracting(false);
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

    if (zoom > getBaseZoom() + 0.1) {
      setZoom(getBaseZoom());
      setPan({ x: 0, y: 0 });
      setIsMapInteracting(false); // Zooming out completely releases interaction
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      const targetZoom = 2.5;
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
  const LAYERS = 18;
  const LAYER_SPACING = 0.22; // Layer spacing percentage of width
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
  useEffect(() => {
    if (!containerRef.current || points.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Renderer Creator
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.setClearColor("#ffffff", 1);

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
    scene.background = new THREE.Color("#ffffff");
    // Soft architectural misty fog
    scene.fog = new THREE.FogExp2("#ffffff", 0.02);
    sceneRef.current = scene;

    // 2b. Motion blur post-processing setup
    const blurScene = new THREE.Scene();
    const blurMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: 1.0
    });
    const blurGeo = new THREE.PlaneGeometry(2, 2);
    const blurQuad = new THREE.Mesh(blurGeo, blurMat);
    blurScene.add(blurQuad);
    const blurCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

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
    // We render a soft architectural grid visible in the landscape state
    const gridHelper = new THREE.GridHelper(30 * MAP_SCALE, 30, "#111111", "#ececec");
    gridHelper.position.y = -5.8;
    gridHelper.material.opacity = 0.0;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

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

    // Circular concentric blueprint lines around the center coordinates
    const concentricRings = new THREE.Group();
    concentricRings.position.y = -5.79;
    concentricRings.scale.set(MAP_SCALE, 1, MAP_SCALE); // Scale concentric rings by map scale
    
    // Create multiple faint blueprint rings
    for (let r = 2; r <= 15; r += 3) {
      const ringGeo = new THREE.RingGeometry(r, r + 0.04, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x111111,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      concentricRings.add(ringMesh);
    }
    scene.add(concentricRings);
    concentricRingsRef.current = concentricRings;

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

        // Individual launch speeds between 35.0 and 70.0 for varied distance distributions
        const speedMagnitude = 35.0 + Math.abs(seedValue1) * 35.0; 
        const driftX = combinedDirX * speedMagnitude;
        const driftZ = combinedDirZ * speedMagnitude;

        // Perfect physical timeline: ensures all particles complete landing/trajectory BEFORE progress 0.70
        // triggerStartProgress range on desktop: 0.15 to 0.23, mobile: 0.01 to 0.09
        const baseStart = (typeof window !== "undefined" && window.innerWidth <= 767) ? 0.01 : 0.15;
        const triggerStartProgress = baseStart + (seedValue1 * 0.5 + 0.5) * 0.08;
        // triggerDuration range: 0.45 to 0.55. Total time: 0.60 to 0.78 progress units max
        const triggerDuration = 0.45 + (seedValue2 * 0.5 + 0.5) * 0.10;

        // Custom individual physics: staggered vertical recoil and gravity gives full 3D depth to the explosion plume
        const gravityConstant = -35.0 - Math.abs(seedValue2) * 20.0;
        const initialVelocityY = 16.0 + Math.abs(seedValue3) * 14.0;

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
      if (typeof window !== "undefined" && window.innerWidth <= 767) {
        return;
      }
      if (!renderer.domElement || !containerRef.current || e.touches.length === 0) return;
      const r = containerRef.current.getBoundingClientRect();
      const nx = ((e.touches[0].clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.touches[0].clientY - r.top) / r.height) * 2 - 1;
      
      const decay = Math.max(0, 1 - scrollRef.current * 3);
      const maxTilt = 0.35 * decay; // Slightly larger tilt area for touch
      targetRotY = nx * maxTilt;
      targetRotX = -ny * maxTilt;
    };

    const handleTouchStartTilt = (e: TouchEvent) => {
      if (typeof window !== "undefined" && window.innerWidth <= 767) {
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
      const maxTilt = 0.35 * decay; 
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
      const maxTilt = 0.35 * decay; // Expressive controlled motion

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
    window.addEventListener("touchmove", handleTouchMoveTilt, { passive: true });
    window.addEventListener("touchstart", handleTouchStartTilt, { passive: true });

    // Handle resizing
    const resize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
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
    let smoothProgress = scrollRef.current;
    let animationFrameId = 0;
    let startTime: number | null = null;

    const tick = () => {
      animationFrameId = requestAnimationFrame(tick);
      
      const currentTime = performance.now();
      if (startTime === null) startTime = currentTime;
      const elapsedTime = currentTime - startTime;
      const openingProgress = Math.min(1.0, elapsedTime / 2500); // 2.5s duration for a beautiful, long explosion effect
      const openingFactor = Math.pow(1.0 - openingProgress, 3); // easeOutCubic

      const rawP = (window as any).hammerScrollProgress !== undefined 
        ? (window as any).hammerScrollProgress 
        : scrollRef.current;

      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const isMobile = window.innerWidth <= 767;

      // Beautiful fluid lerp to increase scrolling smoothness (snappier on mobile)
      const lerpSpeed = isMobile ? 12.0 : 4.2;
      smoothProgress += (rawP - smoothProgress) * (1 - Math.exp(-lerpSpeed * dt));
      const p = smoothProgress;

      let floatX = 0;
      let floatY = 0;
      if (isMobile) {
        if (!hasRequestedMotionRef.current && p < 0.1) {
          // Floating animation (more noticeable to indicate 3D nature)
          floatX = Math.sin(elapsedTime * 0.002) * 0.15;
          floatY = Math.cos(elapsedTime * 0.0015) * 0.15;
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

      if (p <= 0.15) {
        // Front facing focus
        camera.position.set(0, camY, camZ);
        camera.lookAt(0, 0, 0);
      } else if (p > 0.15 && p < 0.85) {
        const u = (p - 0.15) / 0.70; // normalized 0 to 1
        const uEase = u * u * (3 - 2 * u); // smoothstep

        // Camera shifts from (0, camY, camZ) to bird-eye site map view (0, 16.5, 9.5) looking at (0, -4.5, 0)
        camera.position.x = THREE.MathUtils.lerp(0, 0, uEase);
        camera.position.y = THREE.MathUtils.lerp(camY, 15.0, uEase);
        camera.position.z = THREE.MathUtils.lerp(camZ, 11.5, uEase);
        
        camTargetY = THREE.MathUtils.lerp(0, -4.8, uEase);
        camera.lookAt(0, camTargetY, 0);
      } else {
        // Map State: Stationary blueprint surveyor view fully settled
        camera.position.set(0, 15.0, 11.5);
        camera.lookAt(0, -4.8, 0);
      }

      // 13. Reveal architectural site rings and grids during the scroll sequence
      let gridOpacity = 0;
      if (p > 0.15 && p <= 0.85) {
        gridOpacity = (p - 0.15) / 0.70; // scales 0 to 1
      } else if (p > 0.85) {
        gridOpacity = 1.0;
      }

      if (gridHelper) {
        (gridHelper.material as THREE.Material).opacity = gridOpacity * 0.13;
      }
      if (concentricRings) {
        concentricRings.children.forEach(mesh => {
          ((mesh as THREE.Mesh).material as THREE.Material).opacity = gridOpacity * 0.11;
        });
      }
      /*
      const osloMapMesh = osloMapRef.current;
      if (osloMapMesh) {
        (osloMapMesh.material as THREE.Material).opacity = gridOpacity * 0.45; // Perfectly balanced low-contrastPresence
      }
      */
      // 14. Adjust scaling of letters as viewport shifts (mobile zoom adjustment)
      // Base size of H formation is calibrated with a beautifully balanced scale boost, adjusted down by 5%
      const scaleBoost = (isMobile ? 0.42 : 0.75) * 0.35 * 1.30 * 1.1875; 
      const currentRigScale = (16 / (Math.max(W, H) || 1)) * scaleBoost;
      rig.scale.setScalar(currentRigScale);
      rig.updateMatrixWorld(true);

      // 15. Render particle positions
      const mesh = instancedMeshRef.current;
      if (mesh && (mesh as any).customData) {
        const customParticles = (mesh as any).customData;
        const opacityAttr = mesh.geometry.getAttribute("instanceOpacity") as THREE.InstancedBufferAttribute;

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
            const proj = projects[part.projectIndex];
            
            // Eased smooth transition using the custom spring-damping physics algorithm
            const tSpring = getSpringWeight(t);
            
            // Target coordinates mapped to local rig space coordinates
            const mapPos = getMapPosFromLatLng(proj.lat, proj.lng);
            const targetX = (mapPos.x * MAP_SCALE) / currentRigScale;
            const targetY = mapPos.y / currentRigScale;
            const targetZ = (mapPos.z * MAP_SCALE) / currentRigScale;

            // Transition gracefully from the physical gravitational path to the exact target coordinate
            x = THREE.MathUtils.lerp(physX, targetX, tSpring);
            y = THREE.MathUtils.lerp(physY, targetY, tSpring);
            z = THREE.MathUtils.lerp(physZ, targetZ, tSpring);

            // Add slight tactile vertical bounce
            if (t > 0.70) {
              const bt = (t - 0.70) / 0.30;
              const damping = Math.exp(-bt * 4.0);
              const bounceWave = Math.abs(Math.sin(bt * Math.PI * 3.0));
              const bounceHeight = 5.5; // beautifully tuned for tactile settle feedback
              y += bounceWave * damping * bounceHeight;
            }
            
            // Align orientation seamlessly to lie flat on the map blueprint, matching the exact HTML marker rotation at landing
            const targetRotYVal = THREE.MathUtils.degToRad(getProjectRotation(proj.id));
            rotXVal = THREE.MathUtils.lerp(part.rotSpeedX * t, -Math.PI / 2, tSpring); 
            rotYVal = THREE.MathUtils.lerp(part.rotSpeedY * t, targetRotYVal, tSpring);
            rotZVal = THREE.MathUtils.lerp(part.rotSpeedZ * t, 0, tSpring);

            // Transition smoothly from 1.3x scale to 1.0x scale as particles settle to map markers
            finalScale = THREE.MathUtils.lerp(SMALL_SCALE * 1.3, SMALL_SCALE, tSpring);

            // Project marker stays dark/charcoal `#111111`
            dummyColor.copy(fgColor);

            // Smoothly fade out the 3D target particles as the 2D HTML markers fade in
            let markerOpacity = 0.0;
            if (p >= 0.65 && p < 0.71) {
              markerOpacity = (p - 0.65) / 0.06;
            } else if (p >= 0.71) {
              markerOpacity = 1.0;
            }
            opacityVal = Math.max(0, 1.0 - markerOpacity);
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

        // 16. Update HTML labels on screen
        // We project the 3D mapPos coordinates of our 8 projects into 2D viewport coordinates
        const canvasRect = renderer.domElement.getBoundingClientRect();
        
        projects.forEach((proj, idx) => {
          const markerEl = markersRef.current[idx];
          if (!markerEl) return;

          // Project markers are only interactive during map phase
          const activeProgress = p >= 0.65;
          
          if (!activeProgress) {
            markerEl.style.opacity = "0";
            markerEl.style.pointerEvents = "none";
            return;
          }

          // Compute exact position in world coordinates (taking the rig's rotation and scale into account)
          const mapPos = getMapPosFromLatLng(proj.lat, proj.lng);
          const targetVec = new THREE.Vector3(
            (mapPos.x * MAP_SCALE) / currentRigScale,
            mapPos.y / currentRigScale,
            (mapPos.z * MAP_SCALE) / currentRigScale
          );
          if (rig) {
            targetVec.applyMatrix4(rig.matrixWorld);
          }
          targetVec.project(camera);

          // Convert to pixels on screen
          const screenX = (targetVec.x * 0.5 + 0.5) * canvasRect.width;
          const screenY = (-targetVec.y * 0.5 + 0.5) * canvasRect.height;

          // Fade markers in and out beautifully based on scroll progress
          let opacity = 0.0;
          if (p >= 0.65 && p < 0.71) {
            opacity = (p - 0.65) / 0.06; // fade in
          } else if (p >= 0.71) {
            opacity = 1.0;
          }

          // Convert to pixels on screen and apply a clear translation offset shift from 0, 0 to -50%, -50% to center markers perfectly
          markerEl.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -50%)`;
          markerEl.style.opacity = opacity.toString();
          markerEl.style.pointerEvents = "auto";
        });

        // Update the HTML Map Layer opacity and pointer-events dynamically inside tick
        let mapOpacityVal = 0.0;
        if (p >= 0.65 && p < 0.71) {
          mapOpacityVal = (p - 0.65) / 0.06;
        } else if (p >= 0.71) {
          mapOpacityVal = 1.0;
        }

        if (htmlMapContainerRef.current) {
          htmlMapContainerRef.current.style.opacity = mapOpacityVal.toString();
          htmlMapContainerRef.current.style.pointerEvents = mapOpacityVal > 0.05 ? "auto" : "none";
        }
      }

      // Dynamic post-processing motion blur based on scroll velocity
      const scrollVelocity = Math.abs(rawP - smoothProgress) / Math.max(0.001, dt);
      
      // Determine clear alpha. If velocity is high, use lower opacity (longer trail).
      // Scale scrollVelocity mapping so it feels incredibly responsive.
      const velocityScale = 1.6;
      const minOpacity = 0.45; // minimum clear alpha for dramatic long trails
      const clearAlpha = THREE.MathUtils.clamp(
        1.0 - Math.min(1.0, scrollVelocity * velocityScale) * (1.0 - minOpacity),
        minOpacity,
        1.0
      );

      if (p < 0.65) {
        // Disable autoClear so previous frames are preserved and blended
        renderer.autoClear = false;

        // Draw the full-screen semi-transparent quad to progressively sweep/wipe the previous frame
        blurMat.opacity = clearAlpha;
        renderer.render(blurScene, blurCam);
      } else {
        // Map Phase: Completely sharp, no motion blur, no ghosting
        renderer.autoClear = true;
        renderer.clear();
      }

      renderer.render(scene, camera);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMoveTilt);
      window.removeEventListener("touchstart", handleTouchStartTilt);
      window.removeEventListener("deviceorientation", handleDeviceOrientation);
      window.removeEventListener("click", initDeviceOrientationClick);
      window.removeEventListener("touchstart", initDeviceOrientationTouch);
      window.removeEventListener("resize", resize);
      if (renderer.domElement && containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      blurGeo.dispose();
      blurMat.dispose();
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

  const isMobileSize = typeof window !== "undefined" && window.innerWidth <= 767;
  const isCategoriesCollapsed = false;

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-white">
      {/* Map Filter Chips (All screen sizes) */}
      <AnimatePresence>
      {scrollProgress >= 0.70 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 pointer-events-none z-[49] overflow-hidden">
          <div className="absolute bottom-[4%] md:bottom-0 left-0 w-full px-6 pb-[24px] md:pb-[32px] flex justify-center items-center pointer-events-none z-[49]">
             <motion.div 
               transition={{ duration: 0.8, ease: "easeInOut" }}
               className={`flex flex-row items-center transition-all duration-[800ms] ease-in-out pointer-events-auto ${isCategoriesCollapsed ? "space-x-1.5 opacity-90 max-w-[50vw]" : "space-x-2 max-w-[calc(100vw-48px)] md:max-w-none overflow-x-auto no-scrollbar"}`}
               style={{ WebkitOverflowScrolling: "touch" }}
             >
               <AnimatePresence>
                {mapFilters.filter(f => !isCategoriesCollapsed || f.id !== "ALLE").map((filter, idx) => (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    key={filter.id}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    triggerHaptic();
                    e.stopPropagation();
                    setActiveFilter(filter.id);
                  }}
                  className={`pointer-events-auto flex items-center justify-center shrink-0 border transition-all duration-[800ms] ${
                    isCategoriesCollapsed 
                      ? "rounded-none h-[25px] w-[25px] p-[5px] bg-white border-neutral-200 ring-0 " + (activeFilter === filter.id ? "ring-1 ring-neutral-900 border-neutral-900" : "")
                      : "h-[25px] md:h-[24px] px-4 rounded-none text-[8px] md:text-[8px] tracking-widest uppercase " + (activeFilter === filter.id ? "bg-neutral-900 text-white border-neutral-900" : "bg-white/90 backdrop-blur-sm text-neutral-600 border-neutral-200 hover:border-neutral-400")
                  }`}
                  style={{ ...(isCategoriesCollapsed ? { zIndex: mapFilters.length - idx } : {}) }}
                >
                  {isCategoriesCollapsed ? (
                     filter.icon ? (
                       <motion.img transition={{ duration: 0.8, ease: "easeInOut" }} src={filter.icon} alt="" draggable={false} className={`w-full h-full object-contain pointer-events-none select-none ${activeFilter === filter.id ? 'invert' : ''}`} />
                     ) : null
                  ) : (
                     <motion.span transition={{ duration: 0.8, ease: "easeInOut" }} className="whitespace-nowrap flex items-center h-full pt-[1px]">{filter.label}</motion.span>
                  )}
                </motion.button>
              ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Mobile Map HUD overrides */}
      {isMobileSize && scrollProgress >= 0.5 && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {/* Bottom Sheet */}
          <div 
            className={`absolute bottom-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] w-full bg-white text-black border-t border-neutral-200 transform pointer-events-auto pb-[calc(2rem+10vh)] pt-6 px-6 ${
              selectedMobileProject ? 'translate-y-[25%] opacity-100' : 'translate-y-[100%] opacity-0'
            }`}
            style={{ transition: "all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
          >
            {selectedMobileProject && (
              <div className="flex flex-col h-full gap-4">
                <div>
                  <h3 className="font-sans font-medium text-2xl tracking-tight uppercase leading-none mb-2">
                    {selectedMobileProject.name}
                  </h3>
                  <div className="font-mono text-[9px] tracking-[0.2em] text-neutral-500 uppercase flex flex-col gap-1 mt-3">
                    <p>{selectedMobileProject.category}</p>
                    <p>{selectedMobileProject.location} • {selectedMobileProject.year}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    triggerHaptic();
                    onProjectClick(selectedMobileProject);
                  }}
                  className="mt-2 text-[10px] tracking-widest font-medium uppercase text-neutral-900 flex items-center gap-1 w-fit py-2 hover:opacity-70 transition-opacity"
                >
                  Les mer <ArrowRight className="w-3 h-3 ml-1" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Three.js canvas container */}
      <div 
        id="blyHBg" 
        ref={containerRef} 
        className={`absolute inset-0 w-full h-full ${scrollProgress < 0.65 ? 'cursor-pointer' : ''}`}
        onClick={() => {
          triggerHaptic();
          if (scrollRef.current < 0.65 && onHClick && typeof window !== "undefined" && window.innerWidth > 767) {
            onHClick();
          }
        }}
      />

      {/* 2D HTML Map Layer with crisp StorOslo.png map and absolute-percentage markers */}
      <div 
        ref={htmlMapContainerRef}
        style={{ 
          pointerEvents: "none",
          touchAction: "none",
          opacity: 0
        }} 
        className="absolute inset-0 z-30 flex items-center justify-center bg-white transition-opacity duration-300 overflow-hidden select-none"
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
          className="map-container relative"
          style={{
            width: "90vw",
            aspectRatio: "2048 / 1270",
            cursor: isMapInteracting ? (isDragging ? "grabbing" : "grab") : "zoom-in"
          }}
          animate={{
            x: pan.x,
            y: pan.y,
            scale: zoom * MAP_SCALE
          }}
          transition={
            isDragging 
              ? { type: "tween", duration: 0 } 
              : { type: "tween", duration: 0.4, ease: "easeOut" }
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
            <div className="absolute inset-0 w-full h-full pointer-events-none select-none">
              <img 
                src={osloNolliMap}
                alt="Oslo Nolli Map"
                className="w-full h-full object-fill pointer-events-none"
              />
              {/* White Fade Overlays for the 4 edges */}
              <div className="absolute inset-x-0 top-0 h-[5%] bg-gradient-to-b from-white to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-[5%] bg-gradient-to-t from-white to-transparent pointer-events-none" />
              <div className="absolute inset-y-0 left-0 w-[5%] bg-gradient-to-r from-white to-transparent pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-[5%] bg-gradient-to-l from-white to-transparent pointer-events-none" />
            </div>
            
            {/* Project Markers rendered above the image */}
            {projects.filter(proj => typeof proj.lat === 'number' && !isNaN(proj.lat) && typeof proj.lng === 'number' && !isNaN(proj.lng)).map((proj) => {
              const coord = coordsState[proj.id];
              const isSelectedDesk = activeProject?.id === proj.id;
              const isSelectedMob = selectedMobileProject?.id === proj.id;
              const isActive = isMobileSize ? isSelectedMob : isSelectedDesk;
              if (!coord || !getFilterMatch(proj, activeFilter)) return null;
              
              const isMobile = typeof window !== "undefined" && window.innerWidth <= 767;
              
              // Mobile opacity logic
              const hasMobileSelection = !!selectedMobileProject;
              const opacity = isMobile && hasMobileSelection && !isSelectedMob ? "opacity-20" : "opacity-100";

              return (
                <div
                  key={proj.id}
                  className={`absolute ${isActive ? 'z-[60]' : 'z-40 hover:z-[60]'} pointer-events-none project-marker ${opacity} transition-opacity duration-300`}
                  style={{
                    position: "absolute",
                    left: `${coord.xPercent}%`,
                    top: `${coord.yPercent}%`,
                    width: "0px",
                    height: "0px"
                  }}
                >
                  <motion.div
                    style={{
                      width: "0px",
                      height: "0px",
                      position: "relative"
                    }}
                    animate={{
                      scale: isMobile ? 
                        (isSelectedMob ? 2.346 : 1.38) * (0.6 / zoom) * (0.75 + Math.max(0, zoom - 3.15) / (18.0 - 3.15) * 0.25) :
                        (0.4 + 0.6 / zoom) * 0.8
                    }}
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
                      onClick={(e) => {
                        triggerHaptic();
                        if (isDragModeEnabled) {
                          e.stopPropagation();
                          return; // Ignore clicking on markers if we are in manual positioning mode
                        }
                        if (isMoved) {
                          e.stopPropagation();
                          return; // Ignore clicking on markers if we were dragging/panning
                        }
                        e.stopPropagation(); // Prevent logging background coordinates when clicking visual pins
                        
                        if (isMobileSize) {
                          if (selectedMobileProject?.id === proj.id) {
                            setSelectedMobileProject(null);
                          } else {
                            setSelectedMobileProject(proj);
                            const nextZoom = zoom; // Do not zoom out automatically
                            setZoom(nextZoom);
                            const mapWidth = window.innerWidth * 0.9;
                            const mapHeight = mapWidth / (2048 / 1270);
                            const relX = ((coord.xPercent - 50) / 100) * mapWidth;
                            const relY = ((coord.yPercent - 50) / 100) * mapHeight;
                            // Offset Y slightly since the bottom sheet covers ~30% of the screen
                            const yOffset = window.innerHeight * 0.15;
                            setPan({
                              x: -relX * nextZoom,
                              y: -relY * nextZoom - yOffset
                            }, nextZoom);
                          }
                        } else {
                          onProjectClick(proj);
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
                      className={`group absolute focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:rounded-full ${scrollProgress < 0.65 ? "pointer-events-none" : "pointer-events-auto"} flex items-center justify-center ${
                        isDragModeEnabled 
                          ? "cursor-grab active:cursor-grabbing" 
                          : "cursor-pointer"
                      } ${isMobile ? "w-[24px] h-[24px] -left-[12px] -top-[12px]" : "w-[16px] h-[16px] -left-[8px] -top-[8px]"}`}
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
                            className={`transition-all duration-300 opacity-100 select-none h-auto ${
                              isDragModeEnabled
                                ? `fill-amber-500 hover:fill-amber-600 drop-shadow-sm ${isMobile ? "w-[7.56px]" : "w-[6.3px]"}`
                                : `fill-neutral-900 drop-shadow-sm ${isMobile ? "w-[6.9px]" : "w-[5.75px]"}`
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
                              transform: `translateX(-50%) scale(${1 / Math.pow(zoom, 0.5)})`,
                              transformOrigin: "bottom center",
                              marginBottom: `${12 / (Math.pow(zoom, 0.5) * (0.4 * zoom + 0.6))}px`
                            }}
                            className="hidden md:flex flex-col w-36 absolute bottom-full left-1/2 pointer-events-none z-50"
                          >
                            <div className={`relative w-full font-sans tracking-widest text-neutral-900 overflow-visible origin-bottom
                            opacity-0 group-hover:opacity-100
                            ${isActive ? '!opacity-100' : ''}
                          `}>
                            <div className="flex flex-col w-full bg-white rounded-none overflow-hidden shadow-lg border border-neutral-100">
                              <div className="w-full h-24 relative bg-neutral-100">
                                {proj.image ? (
                                  <img src={proj.image} alt={proj.name} className="w-full h-full object-cover" />
                                ) : (
                                   <div className="w-full h-full flex items-center justify-center text-neutral-400 text-[10px] bg-white">Bilde kommer</div>
                                )}
                              </div>
                              <div className="px-2 py-1.5 bg-white relative z-10 text-center">
                                <div className="font-medium uppercase tracking-[0.1em] text-[8px] truncate">{proj.name}</div>
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
                setZoom(getBaseZoom());
                setPan({ x: 0, y: 0 });
                setIsMapInteracting(false);
              }}
              className={`w-10 h-10 border rounded-none flex items-center justify-center transition-all shadow-sm ${
                zoom > getBaseZoom() + 0.05 || pan.x !== 0 || pan.y !== 0
                  ? "bg-neutral-900 border-neutral-900 text-white cursor-pointer hover:bg-neutral-800"
                  : "bg-[#fffbf0]/80 border-neutral-200 text-neutral-400 opacity-50 cursor-default"
              }`}
              title="Nullstill zoom og pan"
              aria-label="Nullstill zoom og pan"
              disabled={zoom <= getBaseZoom() + 0.05 && pan.x === 0 && pan.y === 0}
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

      {/* Elegant Architectural HTML overlays (hidden to avoid duplication during map phase) */}
      <div className="absolute inset-0 pointer-events-none z-10 invisible">
        {projects.filter(proj => typeof proj.lat === 'number' && !isNaN(proj.lat) && typeof proj.lng === 'number' && !isNaN(proj.lng)).map((proj, idx) => (
          <div
            key={proj.id}
            ref={(el) => {
              markersRef.current[idx] = el;
            }}
          />
        ))}
      </div>
    </div>
  );
};
