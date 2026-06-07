import React, { useRef, useEffect, useCallback } from 'react';
import { KoiFish, Vertebra, Ripple, FoodPellet, LilyPad, CherryPetal, PondTurtle, PondSettings } from '../types';

interface PondCanvasProps {
  settings: PondSettings;
  onStatsUpdate?: (stats: { fishCount: number; activeRipples: number; foodCount: number }) => void;
}

// Spiritual and Physical Energy Particles for growth and orbits
interface SpiritParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  type?: 'mist' | 'aurora' | 'sparkle';
  growth?: number;
}

interface SubmergedGrass {
  id: string;
  x: number;
  y: number;
  baseWidth: number;
  height: number;
  bladesCount: number;
  swayOffset: number;
  swaySpeed: number;
  swayRange: number;
  color: string;
}

interface PremiumLilyPad extends LilyPad {
  hasLotus?: boolean;
  lotusScale?: number;
  lotusColor?: string;
  lotusRotation?: number;
}

// Classical Japanese Koi Color Configurations and Authentic Breeds
const KOI_VARIETIES: {
  type: 'kohaku' | 'sanke' | 'tancho' | 'yamabuki' | 'shiro_utsuri' | 'showa' | 'asagi' | 'hi_utsuri' | 'ki_bekko' | 'beni_goi' | 'hajiro' | 'koromo' | 'sakura_pink' | 'tsuki_blue';
  color: string;
  accentColor: string;
  secondaryColor?: string;
}[] = [
  { type: 'kohaku', color: '#F8F5F2', accentColor: '#E63946' }, // White body, red spots
  { type: 'sanke', color: '#F8F5F2', accentColor: '#1A1A1A', secondaryColor: '#E63946' }, // White body, black and red spots
  { type: 'tancho', color: '#F8F5F2', accentColor: '#E63946' }, // White body, red spot exclusively on head
  { type: 'yamabuki', color: '#EAD189', accentColor: '#D4AF37' }, // Shiny yellow/gold metallic
  { type: 'shiro_utsuri', color: '#2B2D42', accentColor: '#DFE3E6' }, // Black body, white patches
  { type: 'showa', color: '#1B1C1E', accentColor: '#E63946', secondaryColor: '#F8F5F2' }, // Black base, red & white markings
  { type: 'asagi', color: '#8FB8D1', accentColor: '#E63946' }, // Slate Blue, red scale edges / cheeks
  { type: 'hi_utsuri', color: '#1A1A1B', accentColor: '#E35D23' }, // Black base, fiery orange markings
  { type: 'ki_bekko', color: '#FAF089', accentColor: '#1F2022' }, // Yellow-gold base, small black patches
  { type: 'beni_goi', color: '#E53E3E', accentColor: '#E53E3E' }, // Solid radiant orange-red
  { type: 'hajiro', color: '#121214', accentColor: '#F8F5F2' }, // Deep black base with snowy white fin tips
  { type: 'koromo', color: '#F8F5F2', accentColor: '#9B2C2C', secondaryColor: '#2B1B17' }, // White base, red patches overlaid with dark indigo scale netting
  { type: 'sakura_pink', color: '#FFF2F5', accentColor: '#FF69B4', secondaryColor: '#FFAEC9' }, // Lavender blush pale-pink, glowing hot cherry pink spots
  { type: 'tsuki_blue', color: '#E0F7FA', accentColor: '#0288D1', secondaryColor: '#80DEEA' }  // Pale icy sky-blue, radiant cobalt spots
];

export const PondCanvas: React.FC<PondCanvasProps> = ({ settings, onStatsUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simulation State Refs (held in refs for high performing 60fps renders without React overhead)
  const fishRef = useRef<KoiFish[]>([]);
  const fishLoadedRef = useRef(false);

  // CRITICAL FIX: Load fish from localStorage SYNCHRONOUSLY during first render
  // This prevents race conditions where useEffect callbacks (fish count sync, animation loop)
  // create new fish with 0 growthPoints BEFORE the ResizeObserver callback can load saved data.
  if (!fishLoadedRef.current) {
    fishLoadedRef.current = true;
    try {
      const saved = localStorage.getItem('pond_fish_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          fishRef.current = parsed.map((lf: any) => {
            const vertebraeCount = lf.vertebraeCount || 10;
            const sizeMult = lf.sizeMultiplier || 0.18;
            const spacing = (32 * sizeMult) / vertebraeCount;
            const initialAngle = lf.angle ?? Math.random() * Math.PI * 2;
            const vertebrae: Vertebra[] = lf.vertebrae && lf.vertebrae.length > 0
              ? lf.vertebrae
              : [];
            if (vertebrae.length === 0) {
              for (let i = 0; i < vertebraeCount; i++) {
                vertebrae.push({
                  x: (lf.x ?? 400) - Math.cos(initialAngle) * i * spacing,
                  y: (lf.y ?? 300) - Math.sin(initialAngle) * i * spacing,
                });
              }
            }
            return {
              ...lf,
              vertebrae,
              maxSpeed: lf.maxSpeed ?? (1.4 + Math.random() * 0.8),
              speed: lf.speed ?? (0.5 + Math.random() * 0.5),
              turnSpeed: lf.turnSpeed ?? (0.035 + Math.random() * 0.015),
              wiggleCycle: lf.wiggleCycle ?? (Math.random() * Math.PI * 2),
              depth: lf.depth ?? (0.2 + (lf.id.charCodeAt(0) % 7) * 0.08),
              targetDepth: lf.targetDepth ?? (lf.depth ?? 0.3),
              targetX: lf.targetX ?? Math.random() * 800,
              targetY: lf.targetY ?? Math.random() * 600,
              targetFoodId: lf.targetFoodId ?? undefined,
              stateTimer: lf.stateTimer ?? (100 + Math.random() * 200),
            } as KoiFish;
          });
        }
      }
    } catch (e) {
      console.error('Failed to load saved fish state on init', e);
    }
  }

  const ripplesRef = useRef<Ripple[]>([]);
  const foodRef = useRef<FoodPellet[]>([]);
  const lilyPadsRef = useRef<PremiumLilyPad[]>([]);
  const petalsRef = useRef<CherryPetal[]>([]);
  const turtlesRef = useRef<PondTurtle[]>([]);
  const particlesRef = useRef<SpiritParticle[]>([]);
  const grassRef = useRef<SubmergedGrass[]>([]);
  
  const dimensionsRef = useRef({ width: 800, height: 600 });
  const animationFrameId = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const needsSaveRef = useRef<boolean>(false); // flag for immediate save after growth events
  const settingsRef = useRef<PondSettings>(settings);
  settingsRef.current = settings; // keep ref in sync every render so animation loop always reads latest

  // Centralized save function — used by periodic save, unmount, and beforeunload
  const saveStateToStorage = () => {
    try {
      if (fishRef.current.length > 0) {
        const serializableFish = fishRef.current.map(f => ({
          id: f.id,
          x: f.x,
          y: f.y,
          angle: f.angle,
          speed: f.speed,
          targetX: f.targetX,
          targetY: f.targetY,
          maxSpeed: f.maxSpeed,
          turnSpeed: f.turnSpeed,
          color: f.color,
          accentColor: f.accentColor,
          sizeMultiplier: f.sizeMultiplier,
          vertebrae: f.vertebrae,
          vertebraeCount: f.vertebraeCount,
          wiggleCycle: f.wiggleCycle,
          growthPoints: f.growthPoints,
          type: f.type,
          state: f.state,
          stateTimer: f.stateTimer,
          depth: f.depth,
          targetDepth: f.targetDepth,
        }));
        localStorage.setItem('pond_fish_state', JSON.stringify(serializableFish));
      }
      if (turtlesRef.current.length > 0) {
        localStorage.setItem('pond_turtle_state', JSON.stringify(turtlesRef.current));
      }
      needsSaveRef.current = false;
    } catch (e) {
      console.warn('Could not save simulation state', e);
    }
  };

  // Spawns micro-particle effects for growth & cosmic trails
  const spawnParticle = (x: number, y: number, color: string, count = 1, sizeMin = 1.0, sizeMax = 2.5, speedMultiplier = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.3 + Math.random() * 0.7) * speedMultiplier;
      particlesRef.current.push({
        id: Math.random().toString(36).substring(2, 9),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.15, // slight upward water currents drift
        color,
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        alpha: 0.7 + Math.random() * 0.3,
        decay: 0.015 + Math.random() * 0.018,
      });
    }
  };

  // Spawns beautiful, silky smooth, real looking spiritual mist particles
  const spawnSpiritualTrail = (x: number, y: number, colorToUse: string, type: 'mist' | 'aurora' | 'sparkle' = 'mist') => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.12 + Math.random() * 0.25;
    particlesRef.current.push({
      id: Math.random().toString(36).substring(2, 9),
      x,
      y,
      vx: Math.cos(angle) * speed * 0.3,
      vy: Math.sin(angle) * speed * 0.3 - 0.05,
      color: colorToUse,
      size: type === 'mist' ? 2.5 + Math.random() * 4.0 : 1.2 + Math.random() * 1.5,
      alpha: type === 'mist' ? 0.44 + Math.random() * 0.16 : 0.82 + Math.random() * 0.18,
      decay: type === 'mist' ? 0.005 + Math.random() * 0.003 : 0.012 + Math.random() * 0.008, // slow decay for long, elegant tail flow
      type,
      growth: type === 'mist' ? 0.03 + Math.random() * 0.02 : -0.01,
    });
  };

  // Instantiate standard Koi
  // Deterministic hash for consistent baseSize calculation across save/load cycles
  const fishIdHashCode = (type: string): number => {
    let hash = 0;
    for (let i = 0; i < type.length; i++) {
      hash = ((hash << 5) - hash) + type.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const createFish = useCallback((x: number, y: number, isInitial = false, forceType?: 'yin' | 'yang'): KoiFish => {
    let variety;
    if (forceType === 'yin') {
      variety = { type: 'yin', color: '#161618', accentColor: '#F8F5F2' } as const;
    } else if (forceType === 'yang') {
      variety = { type: 'yang', color: '#F8F5F2', accentColor: '#161618' } as const;
    } else {
      variety = KOI_VARIETIES[Math.floor(Math.random() * KOI_VARIETIES.length)];
    }

    // Default sizing is very elegantly small and slender to solve the "fish are too big" issue
    // Use deterministic baseSize based on fish ID for consistency across save/load cycles
    const baseSize = forceType ? 0.28 : (0.16 + (fishIdHashCode(variety.type)) % 5 * 0.012); 
    const growthPoints = isInitial ? Math.floor(Math.random() * 15) : 0;
    const sizeMultiplier = Math.min(1.3, baseSize + growthPoints * 0.005);

    const vertebraeCount = 10;
    const spacing = (32 * sizeMultiplier) / vertebraeCount;

    // Create the vertebral chain trailing behind initial heading
    const initialAngle = Math.random() * Math.PI * 2;
    const vertebrae: Vertebra[] = [];
    for (let i = 0; i < vertebraeCount; i++) {
      vertebrae.push({
        x: x - Math.cos(initialAngle) * i * spacing,
        y: y - Math.sin(initialAngle) * i * spacing,
      });
    }

    return {
      id: Math.random().toString(36).substring(2, 9),
      x,
      y,
      angle: initialAngle,
      speed: 0.5 + Math.random() * 0.5,
      targetX: Math.random() * dimensionsRef.current.width,
      targetY: Math.random() * dimensionsRef.current.height,
      maxSpeed: (1.4 + Math.random() * 0.8) * settings.koiSpeed,
      turnSpeed: 0.035 + Math.random() * 0.015,
      color: variety.color,
      accentColor: variety.accentColor,
      sizeMultiplier,
      vertebraeCount,
      vertebrae,
      wiggleCycle: Math.random() * Math.PI * 2,
      state: forceType ? 'yinyang' : 'wandering',
      stateTimer: 100 + Math.random() * 200,
      type: variety.type,
      growthPoints,
    };
  }, [settings.koiSpeed]);

  // Handle Resize safely via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        dimensionsRef.current = { width, height };

        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = width;
          canvas.height = height;
        }

        // Fish are already loaded from localStorage during component initialization (lazy init).
        // Here we only need to: (1) create initial fish if no saved data existed, (2) sync count
        if (fishRef.current.length === 0) {
          // No saved data — create initial fish set
          const initialFishCount = settings.fishCount;
          const cx = width / 2;
          const cy = height / 2;

          const yinFish = createFish(cx - 100, cy, true, 'yin');
          yinFish.state = settings.yinYangMode ? 'yinyang' : 'wandering';
          fishRef.current.push(yinFish);

          const yangFish = createFish(cx + 100, cy, true, 'yang');
          yangFish.state = settings.yinYangMode ? 'yinyang' : 'wandering';
          fishRef.current.push(yangFish);

          for (let i = 2; i < initialFishCount; i++) {
            fishRef.current.push(createFish(Math.random() * width, Math.random() * height, true));
          }
        } else {
          // Fish loaded from localStorage — sync count with current settings
          const initialFishCount = settings.fishCount;
          if (fishRef.current.length < initialFishCount) {
            for (let i = fishRef.current.length; i < initialFishCount; i++) {
              fishRef.current.push(createFish(Math.random() * width, Math.random() * height, true));
            }
          } else if (fishRef.current.length > initialFishCount) {
            const specials = fishRef.current.filter(f => f.type === 'yin' || f.type === 'yang');
            const generics = fishRef.current.filter(f => f.type !== 'yin' && f.type !== 'yang');
            const keepCount = Math.max(0, initialFishCount - specials.length);
            fishRef.current = [...specials, ...generics.slice(0, keepCount)];
          }
          // Re-apply koiSpeed to maxSpeed since lazy init uses default speed of 1.0
          fishRef.current.forEach(f => {
            f.maxSpeed = (f.maxSpeed ?? (1.4 + Math.random() * 0.8)) * settings.koiSpeed;
          });
        }

        // Initialize two unique, slow-moving Pond Turtles if empty
        if (turtlesRef.current.length === 0) {
          let loadedTurtles = [];
          try {
            const savedT = localStorage.getItem('pond_turtle_state');
            if (savedT) {
              const parsed = JSON.parse(savedT);
              if (Array.isArray(parsed) && parsed.length > 0) {
                loadedTurtles = parsed;
              }
            }
          } catch (e) {
            console.error(e);
          }

          if (loadedTurtles.length > 0) {
            turtlesRef.current = loadedTurtles;
          } else {
            const cx = width / 2;
            const cy = height / 2;
            turtlesRef.current = [
              {
                id: 'pond-turtle-1',
                x: cx - 120 + (Math.random() - 0.5) * 100,
                y: cy + (Math.random() - 0.5) * 100,
                angle: Math.random() * Math.PI * 2,
                speed: 0.14,
                targetX: cx - 80,
                targetY: cy,
                size: 27, // elder turtle
                legSway: Math.random() * 10,
                depth: 0.10,
                targetDepth: 0.10,
                state: 'wandering',
                stateTimer: 200 + Math.random() * 200,
              },
              {
                id: 'pond-turtle-2',
                x: cx + 120 + (Math.random() - 0.5) * 100,
                y: cy + (Math.random() - 0.5) * 100,
                angle: Math.random() * Math.PI * 2,
                speed: 0.16,
                targetX: cx + 80,
                targetY: cy,
                size: 21, // slightly smaller companion turtle
                legSway: Math.random() * 10,
                depth: 0.14,
                targetDepth: 0.14,
                state: 'resting',
                stateTimer: 100 + Math.random() * 250,
              }
            ];
          }
        }

        // Initialize floating lily pads with potential lotuses if list is empty
        if (lilyPadsRef.current.length === 0) {
          const pads: PremiumLilyPad[] = [];
          const padCount = 6 + Math.floor(Math.random() * 5); // 6 to 10 pads for lush beauty
          for (let i = 0; i < padCount; i++) {
            const px = 100 + Math.random() * (width - 200);
            const py = 100 + Math.random() * (height - 200);
            const hasLotus = false; // COMPLETELY REMOVED THE FLOWERS PER USER INSTRUCTIONS
            pads.push({
              id: `lily-${i}`,
              x: px,
              y: py,
              originalX: px,
              originalY: py,
              radius: 20 + Math.random() * 22, // large, majestic floating leaves
              angle: Math.random() * Math.PI * 2,
              driftSpeedX: (Math.random() - 0.5) * 0.015,
              driftSpeedY: (Math.random() - 0.5) * 0.015,
              hasLotus,
              lotusScale: 0.7 + Math.random() * 0.35,
              lotusColor: Math.random() < 0.65 ? '#FFA9C4' : '#FDFDFD', // Sacred pink or translucent pearl white
              lotusRotation: Math.random() * Math.PI * 2,
            });
          }
          lilyPadsRef.current = pads;
        }

        // Initialize submerged swaying pond grasses in multiple shades of emerald
        if (grassRef.current.length === 0) {
          const grassBunchCount = 5 + Math.floor(Math.random() * 4); // sparse decoration (5 to 8 elegant bunches)
          const grassList: SubmergedGrass[] = [];
          for (let i = 0; i < grassBunchCount; i++) {
            const gx = Math.random() * width;
            const gy = Math.random() * height;
            const heightValue = 45 + Math.random() * 65; // shorter, graceful subtle reeds
            const blades = 2 + Math.floor(Math.random() * 3); // 2 to 4 blades per bunch
            const colorVariety = Math.random();
            
            // Soft emerald garden palettes
            const gColor = colorVariety < 0.3 
              ? '#0D2E22'  // soft dark emerald
              : colorVariety < 0.7 
                ? '#124B36' // subtle medium emerald
                : '#1B6A4E'; // light jade green

            grassList.push({
              id: `grass-${i}`,
              x: gx,
              y: gy,
              baseWidth: 1.5 + Math.random() * 2.0, // extremely slender blades
              height: heightValue,
              bladesCount: blades,
              swayOffset: Math.random() * Math.PI * 2,
              swaySpeed: 0.006 + Math.random() * 0.009, // slow quiet breath
              swayRange: 10 + Math.random() * 8, // gentle elegant sway
              color: gColor,
            });
          }
          grassRef.current = grassList;
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [createFish, settings.fishCount]);

  // Sync Fish Count slider changes
  useEffect(() => {
    const { width, height } = dimensionsRef.current;
    let currentFish = [...fishRef.current];

    if (currentFish.length < settings.fishCount) {
      const needed = settings.fishCount - currentFish.length;
      for (let i = 0; i < needed; i++) {
        currentFish.push(createFish(Math.random() * width, Math.random() * height));
      }
    } else if (currentFish.length > settings.fishCount) {
      // Retain special Yin/Yang fish if present, slicing generic ones
      const specials = currentFish.filter(f => f.type === 'yin' || f.type === 'yang');
      const generics = currentFish.filter(f => f.type !== 'yin' && f.type !== 'yang');
      const keepCount = Math.max(0, settings.fishCount - specials.length);
      currentFish = [...specials, ...generics.slice(0, keepCount)];
    }
    fishRef.current = currentFish;
  }, [settings.fishCount, createFish]);

  // Adjust max speed
  useEffect(() => {
    fishRef.current.forEach(f => {
      f.maxSpeed = (1.4 + Math.random() * 0.8) * settings.koiSpeed;
    });
  }, [settings.koiSpeed]);

  // Interaction Handler: drops translucent water ripples or sinking food
  const handleInteraction = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    if (settings.feedingMode) {
      // Feed mode
      const pelletId = Math.random().toString(36).substring(2, 9);
      foodRef.current.push({
        id: pelletId,
        x: clickX,
        y: clickY,
        targetY: clickY + 8 + Math.random() * 15, // sinks much less — stays near surface
        speed: 1.2 + Math.random() * 0.5, // sinks faster so fish can eat sooner
        radius: 3.0,
        isNibhled: false,
        nibblesRemaining: 1, // eaten in one gulp
      });

      // Prominent, highly satisfying food placement ring ripples
      spawnRipple(clickX, clickY, 65, 0.42);

      // Alert nearby fishes of snacks (max-size fish skip — they leave food for smaller fish)
      fishRef.current.forEach(fish => {
        if (fish.state !== 'attracted_to_food' && fish.state !== 'yinyang' && fish.sizeMultiplier < 1.3) {
          const distance = Math.hypot(fish.x - clickX, fish.y - clickY);
          if (distance < 500) {
            fish.state = 'attracted_to_food';
            fish.targetX = clickX;
            fish.targetY = clickY;
            fish.stateTimer = 300;
          }
        }
      });
    } else {
      // Lighter, elegant, non-blending water ripples that NEVER cover the pond background
      if (ripplesRef.current.length < 8) {
        spawnRipple(clickX, clickY, 70 + Math.random() * 30, 0.28);
      }

      // Smoothly steer fish to the water ripples coordinate with natural attraction
      fishRef.current.forEach(fish => {
        if (fish.state !== 'yinyang') {
          const dist = Math.hypot(fish.x - clickX, fish.y - clickY);
          if (dist < 340) {
            fish.state = 'attracted_to_tap';
            // Set a curved, offsets target so they don't merge static-style
            const approachAngle = Math.atan2(fish.y - clickY, fish.x - clickX) + (Math.random() - 0.5) * 0.8;
            fish.targetX = clickX + Math.cos(approachAngle) * (20 + Math.random() * 30);
            fish.targetY = clickY + Math.sin(approachAngle) * (20 + Math.random() * 30);
            fish.stateTimer = 180 + Math.random() * 70;
          }
        }
      });
    }
  };

  const spawnRipple = (x: number, y: number, maxRadius: number, maxAlpha: number) => {
    ripplesRef.current.push({
      id: Math.random().toString(36).substring(2, 9),
      x,
      y,
      radius: 1,
      maxRadius,
      alpha: maxAlpha,
      speed: 1.3 + Math.random() * 0.6,
    });
  };

  const spawnSwimRipple = (x: number, y: number, maxRadius: number, maxAlpha: number) => {
    ripplesRef.current.push({
      id: Math.random().toString(36).substring(2, 9),
      x,
      y,
      radius: 2,
      maxRadius,
      alpha: maxAlpha,
      speed: 1.15 + Math.random() * 0.45, // radiates dynamically and fast!
    });
  };

  // Main 60FPS tick-driven render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateAndRender = () => {
      timeRef.current += 1;
      const { width, height } = dimensionsRef.current;

      // 1. Draw Japanese Zen Pond theme water gradients
      drawPondBackground(ctx, width, height);

      // 2. Draw static, rotated spiritual sigil in Yin-Yang mode
      if (settings.yinYangMode) {
        drawYinYangSacredSands(ctx, width / 2, height / 2);
      }

      // 2.5. Draw submerged swaying grass on pond floor
      drawSubmergedGrass(ctx, timeRef.current);

      // 3. Draw Water Caustics / Glare drift
      drawWaterCaustics(ctx, width, height, timeRef.current);

      // 4. Update and Draw slowly drifting floating Lily Pads
      updateAndDrawLilyPads(ctx, timeRef.current);

      // 5. Update and render sinking food pellets
      updateAndDrawFood(ctx);

      // 6. Update and render elegant, super-soft watercolor ripples (NEVER covers screen)
      updateAndDrawRipples(ctx);

      // 6.5. Update and render the adorable slow-moving Pond Turtle
      updateAndDrawTurtles(ctx, width, height, timeRef.current);

      // 7. Render organic growth & stardust particles
      updateAndDrawParticles(ctx);

      // 8. Draw soft fish shadows on pool floor first (for rich aesthetic height)
      drawKoiShadows(ctx);

      // 9. Process organic, snake-like serpentine movement parameters and render skin & fin layers
      updateAndDrawKoi(ctx, width, height);

      // 10. Update and draw falling sakura petals
      updateAndDrawPetals(ctx, width, height);

      // Report simulation stats back
      if (onStatsUpdate && timeRef.current % 15 === 0) {
        onStatsUpdate({
          fishCount: fishRef.current.length,
          activeRipples: ripplesRef.current.length,
          foodCount: foodRef.current.length,
        });
      }

      // Periodically write the simulation state back to localStorage for seamless refresh persistence
      // Save every 60 frames (approx 1 sec) or immediately after a growth event (food eaten)
      if ((timeRef.current % 60 === 0 || needsSaveRef.current) && fishRef.current.length > 0) {
        saveStateToStorage();
      }

      animationFrameId.current = requestAnimationFrame(updateAndRender);
    };

    animationFrameId.current = requestAnimationFrame(updateAndRender);

    // CRITICAL: Save state when user refreshes or closes the tab
    // React useEffect cleanup does NOT reliably run on page close/refresh, so we need this
    const handleBeforeUnload = () => {
      saveStateToStorage();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveStateToStorage();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps — animation loop runs once. Settings read via closure (always latest due to React re-renders feeding fresh props). We intentionally never remount this.

  // --- RENDERING ROUTINES ---

  const drawSubmergedGrass = (ctx: CanvasRenderingContext2D, time: number) => {
    ctx.save();
    ctx.globalAlpha = 0.32; // highly translucent watercolor aesthetic
    const list = grassRef.current;
    list.forEach(grass => {
      // Draw multiple swaying blades for each grass bunch
      for (let b = 0; b < grass.bladesCount; b++) {
        const bladeOffset = b * 4 - (grass.bladesCount * 2);
        const bx = grass.x + bladeOffset;
        const by = grass.y;

        // Individual blade swaying kinematics
        const swayPhase = time * grass.swaySpeed + grass.swayOffset + (b * 0.45);
        const swayX = Math.sin(swayPhase) * grass.swayRange;
        const swayY = Math.cos(swayPhase * 0.5) * (grass.swayRange * 0.15);

        ctx.beginPath();
        // Base of the seaweed blade on the pond floor
        ctx.moveTo(bx - grass.baseWidth / 2, by);
        // Left curve up directly to a swaying tip point
        ctx.quadraticCurveTo(
          bx - grass.baseWidth * 1.5 + swayX * 0.4, by - grass.height * 0.5 + swayY,
          bx + swayX, by - grass.height + swayY
        );
        // Right curve down back to the right side of the base width
        ctx.quadraticCurveTo(
          bx + grass.baseWidth * 1.5 + swayX * 0.4, by - grass.height * 0.5 + swayY,
          bx + grass.baseWidth / 2, by
        );
        ctx.closePath();

        // High precision underwater shadowing overlay and depth style coloring
        const grad = ctx.createLinearGradient(bx, by, bx + swayX, by - grass.height);
        grad.addColorStop(0, '#04100c'); // deep bottom dark green shadow
        grad.addColorStop(0.5, grass.color);
        grad.addColorStop(1, '#2ba87e'); // sunny tips absorbing light
        ctx.fillStyle = grad;
        ctx.fill();
      }
    });
    ctx.restore();
  };

  const drawPondBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    let grad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h) * 0.95);

    switch (settings.waterColor) {
      case 'deep_teal':
        grad.addColorStop(0, '#0E2831'); 
        grad.addColorStop(1, '#030C11'); 
        break;
      case 'serene_blue':
        grad.addColorStop(0, '#112235'); 
        grad.addColorStop(1, '#040B11'); 
        break;
      case 'moss_green':
        grad.addColorStop(0, '#0B231B'); 
        grad.addColorStop(1, '#020A06'); 
        break;
      case 'dark_slate':
        grad.addColorStop(0, '#151719'); 
        grad.addColorStop(1, '#060708'); 
        break;
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  // Dynamically calculate the Yin-Yang formation radius factor based on average size and follower count
  const getDynamicYinYangRadiusFactor = () => {
    const list = fishRef.current;
    if (list.length === 0) return 0.22;
    // Base factor starts at 0.22, scaling upwards if there are more fish or they are larger
    const avgSizeMultiplier = list.reduce((acc, f) => acc + (f.sizeMultiplier || 0.2), 0) / list.length;
    const countFactor = 1.0 + Math.max(0, list.length - 8) * 0.045; // scale up by 4.5% per fish above 8
    const sizeFactor = 1.0 + Math.max(0, avgSizeMultiplier - 0.2) * 0.8; // scale up if average size is larger
    const result = 0.22 * countFactor * sizeFactor;
    return Math.min(0.38, Math.max(0.22, result)); // clamp between 0.22 and 0.38 of min dimension
  };

  // Draws a beautiful, glowing ancient rotating Zen mandala outline on the bottom floor
  const drawYinYangSacredSands = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    // Dynamically scale the mandala radius based on fish sizes and count!
    const radiusFactor = getDynamicYinYangRadiusFactor();
    const maxRadius = Math.min(cx * 2, cy * 2) * radiusFactor;
    const rotation = timeRef.current * 0.0016; // slow, dreamy rotating orbit
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    // Glowing outer rings representing orbital balance
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.06)'; // elegant soft gold outer ring
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.04)'; // teal green starlight orbit ring
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, maxRadius + 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.setLineDash([4, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, maxRadius - 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Elegant, mathematically perfect Yin-Yang S-curve drawn via two tangent circles in glowing fine thread
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1.25;
    
    ctx.beginPath();
    // Top semi-circle curve of S
    ctx.arc(0, -maxRadius / 2, maxRadius / 2, -Math.PI / 2, Math.PI / 2, true);
    // Bottom semi-circle curve of S
    ctx.arc(0, maxRadius / 2, maxRadius / 2, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();

    // Sacred Yin & Yang Focus Spot-Eyes with subtle translucent glows
    const eyeRadius = maxRadius * 0.09;
    
    // Gold/White celestial eye (top center)
    ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
    ctx.beginPath();
    ctx.arc(0, -maxRadius / 2, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Obsidian/Dark subtle eye outline (bottom center)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, maxRadius / 2, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  const drawWaterCaustics = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)'; // super thin, soft caustics
    ctx.lineWidth = 1.0;

    const driftX = (time * 0.12) % 200;
    const driftY = (time * 0.08) % 200;

    for (let i = -200; i < w + 200; i += 190) {
      ctx.beginPath();
      ctx.moveTo(i + driftX, -100 + driftY);
      ctx.bezierCurveTo(
        i + driftX + 80, 120 + driftY + Math.sin(time * 0.008 + i) * 20,
        i + driftX - 80, h - 120 + driftY + Math.cos(time * 0.008 + i) * 20,
        i + driftX, h + 100 + driftY
      );
      ctx.stroke();
    }
    ctx.restore();
  };

  const updateAndDrawLilyPads = (ctx: CanvasRenderingContext2D, time: number) => {
    const list = lilyPadsRef.current;
    list.forEach(pad => {
      pad.x = pad.originalX + Math.sin(time * 0.004 + pad.radius) * 8;
      pad.y = pad.originalY + Math.cos(time * 0.003 + pad.radius) * 6;
      pad.angle += pad.driftSpeedX * 0.04;

      // Soft shadow
      ctx.save();
      ctx.translate(pad.x + 12, pad.y + 12);
      ctx.rotate(pad.angle);
      ctx.fillStyle = 'rgba(0, 0, 3, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, pad.radius, 0.35, Math.PI * 2 - 0.35);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Green Leaf
      ctx.save();
      ctx.translate(pad.x, pad.y);
      ctx.rotate(pad.angle);

      const padGrad = ctx.createRadialGradient(-3, -3, 0, 0, 0, pad.radius);
      padGrad.addColorStop(0, '#4F772D'); 
      padGrad.addColorStop(0.8, '#31572C'); 
      padGrad.addColorStop(1, '#1A301F'); 

      ctx.fillStyle = padGrad;
      ctx.beginPath();
      ctx.arc(0, 0, pad.radius, 0.38, Math.PI * 2 - 0.38);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // Veins
      ctx.strokeStyle = 'rgba(150, 190, 120, 0.16)';
      ctx.lineWidth = 1.0;
      for (let a = 0; a < Math.PI * 2; a += 0.9) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * pad.radius * 0.85, Math.sin(a) * pad.radius * 0.85);
        ctx.stroke();
      }

      // If of Premium variety, project a gorgeous blooming lotus flower on top!
      if (pad.hasLotus) {
        ctx.save();
        // Hovering flower breathing oscillations
        const breathScale = 1.0 + 0.04 * Math.sin(time * 0.035 + pad.radius);
        ctx.scale((pad.lotusScale || 1) * breathScale, (pad.lotusScale || 1) * breathScale);
        ctx.rotate(pad.lotusRotation || 0);

        // Draw soft petals
        const petalCount = 8;
        const col = pad.lotusColor || '#FAFAFA';

        // Outer petals layer (long & wide)
        for (let p = 0; p < petalCount; p++) {
          ctx.save();
          const ang = (p * Math.PI * 2) / petalCount;
          ctx.rotate(ang);

          // Deep gradient from colored tip to translucent white base
          const pGrad = ctx.createLinearGradient(0, 0, 0, -pad.radius * 0.75);
          pGrad.addColorStop(0, col);
          pGrad.addColorStop(0.5, '#FFF2F5');
          pGrad.addColorStop(1, 'rgba(255, 255, 255, 0.45)');
          ctx.fillStyle = pGrad;

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-pad.radius * 0.22, -pad.radius * 0.25, -pad.radius * 0.18, -pad.radius * 0.75, 0, -pad.radius * 0.85);
          ctx.bezierCurveTo(pad.radius * 0.18, -pad.radius * 0.75, pad.radius * 0.22, -pad.radius * 0.25, 0, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Inner petals layer (slightly shorter & offset angle)
        for (let p = 0; p < petalCount; p++) {
          ctx.save();
          const ang = ((p + 0.5) * Math.PI * 2) / petalCount;
          ctx.rotate(ang);

          const pGrad = ctx.createLinearGradient(0, 0, 0, -pad.radius * 0.55);
          pGrad.addColorStop(0, '#FFFFFF'); // white highlights
          pGrad.addColorStop(0.6, col);
          pGrad.addColorStop(1, 'rgba(255, 255, 255, 0.6)');
          ctx.fillStyle = pGrad;

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-pad.radius * 0.16, -pad.radius * 0.2, -pad.radius * 0.13, -pad.radius * 0.55, 0, -pad.radius * 0.65);
          ctx.bezierCurveTo(pad.radius * 0.13, -pad.radius * 0.55, pad.radius * 0.16, -pad.radius * 0.2, 0, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Radiant golden stamens inside
        ctx.save();
        ctx.strokeStyle = '#EAD189';
        ctx.lineWidth = 1.2;
        const stamenCount = 12;
        for (let s = 0; s < stamenCount; s++) {
          const sAng = (s * Math.PI * 2) / stamenCount;
          const sLen = pad.radius * 0.22;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(sAng) * sLen, Math.sin(sAng) * sLen);
          ctx.stroke();

          // Little yellow pollen dot
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(Math.cos(sAng) * (sLen + 1.2), Math.sin(sAng) * (sLen + 1.2), 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Center seed pod
        const coreGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, pad.radius * 0.12);
        coreGrad.addColorStop(0, '#ADFF2F'); // lime green seed pod
        coreGrad.addColorStop(1, '#82C118');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, pad.radius * 0.12, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      ctx.restore();
    });
  };

  const updateAndDrawFood = (ctx: CanvasRenderingContext2D) => {
    const list = foodRef.current;
    list.forEach(pellet => {
      if (pellet.y < pellet.targetY) {
        pellet.y += pellet.speed; 
      }

      // Safe shadow
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.arc(pellet.x + 3, pellet.y + 3, pellet.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Pellet
      ctx.save();
      const pelletGrad = ctx.createRadialGradient(pellet.x - 0.8, pellet.y - 0.8, 0, pellet.x, pellet.y, pellet.radius);
      pelletGrad.addColorStop(0, '#B88B57');
      pelletGrad.addColorStop(1, '#6F4E2B');
      ctx.fillStyle = pelletGrad;
      ctx.beginPath();
      ctx.arc(pellet.x, pellet.y, pellet.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  };

  const updateAndDrawRipples = (ctx: CanvasRenderingContext2D) => {
    let list = ripplesRef.current;

    list = list.filter(rip => {
      rip.radius += rip.speed;
      const progress = rip.radius / rip.maxRadius;
      
      // Preserve original starting alpha by storing it dynamically inside the object
      if ((rip as any).initialAlpha === undefined) {
        (rip as any).initialAlpha = rip.alpha;
      }
      const initialAlpha = (rip as any).initialAlpha;
      rip.alpha = initialAlpha * (1 - progress);

      if (progress >= 1.0) return false;

      ctx.save();
      // Cozy, extremely aesthetic soft water-cyan ring
      ctx.strokeStyle = `rgba(180, 220, 255, ${rip.alpha})`;
      ctx.lineWidth = 0.5 + (1 - progress) * 1.5;
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Secondary delay echo ring
      if (rip.radius > 20) {
        ctx.strokeStyle = `rgba(180, 220, 255, ${rip.alpha * 0.45})`;
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius - 12, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      return true;
    });

    ripplesRef.current = list;
  };

  const updateAndDrawParticles = (ctx: CanvasRenderingContext2D) => {
    let list = particlesRef.current;
    list = list.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) return false;

      // If mist, it swells/grows over time
      if (p.growth) {
        p.size += p.growth;
      }

      // Left-to-right wave swimming lateral drift for mist
      if (p.type === 'mist') {
        p.x += Math.sin(timeRef.current * 0.08 + p.size) * 0.22;
        p.y += Math.sin(timeRef.current * 0.05 + p.size) * 0.12;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'sparkle') {
        ctx.globalCompositeOperation = 'screen';
        // Draw majestic diamond or four-point light flare
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - p.size * 1.6);
        ctx.lineTo(p.x + p.size, p.y);
        ctx.lineTo(p.x, p.y + p.size * 1.6);
        ctx.lineTo(p.x - p.size, p.y);
        ctx.closePath();
        ctx.fill();
      } else {
        // Soft circular vapor node
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return true;
    });
    particlesRef.current = list;
  };

  const drawKoiShadows = (ctx: CanvasRenderingContext2D) => {
    const list = fishRef.current;
    list.forEach(fish => {
      ctx.save();
      const currentDepth = fish.depth !== undefined ? fish.depth : 0.4;
      // As depth increases (swimming deep towards the bottom floor), shadow distance decreases!
      // At surface (depth = 0), shadow offset is maximum. At bottom (depth = 1), shadow offset is minimum.
      const shadowDistanceFactor = 1.0 - currentDepth * 0.62; // closer to body when deep
      const dx = (8 + fish.sizeMultiplier * 8) * shadowDistanceFactor;
      const dy = (10 + fish.sizeMultiplier * 10) * shadowDistanceFactor;
      
      ctx.translate(dx, dy); 
      
      // Shadows expand slightly more when the fish is high near the light source (surface)
      const originalMultiplier = fish.sizeMultiplier;
      const shadowScaleFactor = 0.88 + (1.0 - currentDepth) * 0.22; // larger shadow when high
      fish.sizeMultiplier = originalMultiplier * shadowScaleFactor;

      // Deep bottom shadows are slightly darker/crisper because they are right on the plaster base
      ctx.fillStyle = `rgba(0, 0, 4, ${0.05 + currentDepth * 0.08})`; 
      ctx.beginPath();
      drawSkeletalPath(ctx, fish, true);
      ctx.fill();
      
      fish.sizeMultiplier = originalMultiplier; // Restore
      ctx.restore();
    });
  };

  const drawYinYangKoiGlow = (ctx: CanvasRenderingContext2D, fish: KoiFish) => {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    // Breathes slowly over time
    const breathingScale = 1.0 + 0.12 * Math.sin(timeRef.current * 0.045 + fish.id.charCodeAt(0));
    
    // We will draw several halo layers centering at head segment and trailing down slightly
    const head = fish.vertebrae[0];
    const maxGlowRadius = 55 * fish.sizeMultiplier * breathingScale;

    const auraColor = fish.type === 'yin' 
      ? 'rgba(34, 211, 238, 0.28)'  // Vibrant celestial cyan energy
      : 'rgba(251, 191, 36, 0.26)'; // Warm radiant golden-amber sunshine

    // Render core radial glow
    const coreGrad = ctx.createRadialGradient(
      head.x, head.y, 2 * fish.sizeMultiplier,
      head.x, head.y, maxGlowRadius
    );
    coreGrad.addColorStop(0, auraColor);
    coreGrad.addColorStop(0.4, fish.type === 'yin' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(245, 158, 11, 0.11)');
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(head.x, head.y, maxGlowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Secondary soft trail halo centering at body segment
    if (fish.vertebraeCount > 4) {
      const mid = fish.vertebrae[3];
      const midGlowRadius = maxGlowRadius * 0.75;
      const midGrad = ctx.createRadialGradient(
        mid.x, mid.y, 1 * fish.sizeMultiplier,
        mid.x, mid.y, midGlowRadius
      );
      midGrad.addColorStop(0, fish.type === 'yin' ? 'rgba(34, 211, 238, 0.18)' : 'rgba(251, 191, 36, 0.16)');
      midGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = midGrad;
      ctx.beginPath();
      ctx.arc(mid.x, mid.y, midGlowRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  };

  const updateAndDrawKoi = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Ensure Yin and Yang fish are always created and present in the pond
    let hasYin = fishRef.current.some(f => f.type === 'yin');
    let hasYang = fishRef.current.some(f => f.type === 'yang');
    const cx = w / 2;
    const cy = h / 2;

    if (!hasYin) {
      const yinFish = createFish(cx - 100, cy, false, 'yin');
      yinFish.state = settings.yinYangMode ? 'yinyang' : 'wandering';
      if (fishRef.current.length >= settings.fishCount) {
        const idx = fishRef.current.findIndex(f => f.type !== 'yin' && f.type !== 'yang');
        if (idx !== -1) fishRef.current[idx] = yinFish;
        else fishRef.current.push(yinFish);
      } else {
        fishRef.current.push(yinFish);
      }
    }

    if (!hasYang) {
      const yangFish = createFish(cx + 100, cy, false, 'yang');
      yangFish.state = settings.yinYangMode ? 'yinyang' : 'wandering';
      if (fishRef.current.length >= settings.fishCount) {
        const idx = fishRef.current.findIndex(f => f.type !== 'yin' && f.type !== 'yang');
        if (idx !== -1) fishRef.current[idx] = yangFish;
        else fishRef.current.push(yangFish);
      } else {
        fishRef.current.push(yangFish);
      }
    }

    const list = fishRef.current;
    list.forEach(fish => {
      // 1. UPDATE SPEEDS, GROWTHS, ORIENTATIONS
      updateKoiPhysics(fish, w, h);

      // 1.5. DRAW MAJESTIC GLOW EFFECT FOR SACRED YIN-YANG KOI
      if (fish.type === 'yin' || fish.type === 'yang') {
        drawYinYangKoiGlow(ctx, fish);
      }

      // Apply depth scaling (smaller size when diving deep, creating 3D perspective!)
      const originalMultiplier = fish.sizeMultiplier;
      const currentDepth = fish.depth !== undefined ? fish.depth : 0.4;
      const depthScaleFactor = 1.0 - currentDepth * 0.22; // shrinks up to 22% under deep water
      fish.sizeMultiplier = originalMultiplier * depthScaleFactor;

      // Master 3D Depth-Fade container
      ctx.save();
      // Smooth high-performance depth-fading (fades slightly as they swim deeper)
      ctx.globalAlpha = 1.0 - currentDepth * 0.42;

      // 2. DRAW PROC SKIN BACKPLATE OUTLINE
      ctx.save();
      drawSkeletalPath(ctx, fish, false);
      ctx.fillStyle = fish.color;
      ctx.fill();

      // 3. DRAW EXQUISITE PATTERNS (Clipped safely into skin block)
      drawKoiPattern(ctx, fish);

      // If deep, apply a soft dark water-tint overlay over the body to tuck it under the water column
      if (currentDepth > 0.05) {
        let tintColor = 'rgba(11, 22, 29, 0.48)';
        switch (settings.waterColor) {
          case 'deep_teal':
            tintColor = `rgba(3, 12, 17, ${0.08 + currentDepth * 0.58})`;
            break;
          case 'serene_blue':
            tintColor = `rgba(4, 11, 17, ${0.08 + currentDepth * 0.58})`;
            break;
          case 'moss_green':
            tintColor = `rgba(2, 10, 6, ${0.08 + currentDepth * 0.58})`;
            break;
          case 'dark_slate':
            tintColor = `rgba(6, 7, 8, ${0.08 + currentDepth * 0.58})`;
            break;
        }
        ctx.fillStyle = tintColor;
        ctx.fill();
      }
      ctx.restore();

      // 4. DRAW GLIDING FINS
      drawKoiGillsAndFins(ctx, fish);
      // Eyes removed per user preference — koi look cleaner without them

      ctx.restore(); // Restore master 3D Depth-Fade container

      // Restore original scale multiplier
      fish.sizeMultiplier = originalMultiplier;

      // 5. EMIT COSMIC CULTIVATION TRAILS IN YIN YANG DANCE
      if (fish.state === 'yinyang') {
        const tail = fish.vertebrae[fish.vertebraeCount - 1];
        if (timeRef.current % 3 === 0) {
          if (fish.type === 'yin') {
            // Obsidian trails electric spiritual energy! Gaseous mist & starry sparkles
            spawnSpiritualTrail(tail.x, tail.y, 'rgba(34, 211, 238, 0.35)', 'mist');
            spawnSpiritualTrail(tail.x, tail.y, '#FAFAFA', 'sparkle');
          } else {
            // Pearl trails glowing star sparkles! Gaseous mist & starry sparkles
            spawnSpiritualTrail(tail.x, tail.y, 'rgba(251, 191, 36, 0.35)', 'mist');
            spawnSpiritualTrail(tail.x, tail.y, '#FFD700', 'sparkle');
          }
        }
      }
    });
  };

  const updateKoiPhysics = (fish: KoiFish, w: number, h: number) => {
    // 0. INITIALIZE AND COAX 3D DEPTH KINEMATICS FOR NATURAL WANDERING
    if (fish.depth === undefined) {
      fish.depth = 0.2 + (fish.id.charCodeAt(0) % 7) * 0.08; // gorgeous staggered starting heights
    }
    if (fish.targetDepth === undefined) {
      fish.targetDepth = fish.depth;
    }

    // Periodically change target depth ranges during quiet walks to sway up and down
    if (fish.state !== 'attracted_to_food' && fish.state !== 'attracted_to_tap' && fish.state !== 'yinyang') {
      if (Math.random() < 0.002) { // very calming, selective frequency (approx. once a minute of swim)
        fish.targetDepth = 0.08 + Math.random() * 0.76;
      }
    } else {
      // Feeding or following rapid taps requires swimming right at the surface!
      fish.targetDepth = 0.06;
    }

    // Smoothly interpolate current depth towards its target using liquid fluid damping
    fish.depth += (fish.targetDepth - fish.depth) * 0.025;

    // Handle state transitions for Yin-Yang Mode
    if (settings.yinYangMode && (fish.type === 'yin' || fish.type === 'yang')) {
      fish.state = 'yinyang';
    } else if (fish.state === 'yinyang' && !settings.yinYangMode) {
      fish.state = 'wandering';
      fish.stateTimer = 100 + Math.random() * 100;
    }

    // GROW WITH TIME:
    // Compute dynamic physical size based on accumulated food pellets!
    // Use the same deterministic baseSize formula as createFish for consistency
    const baseSize = (fish.type === 'yin' || fish.type === 'yang') ? 0.28 : (0.16 + (fishIdHashCode(fish.type)) % 5 * 0.012);
    const growthPts = fish.growthPoints || 0;
    fish.sizeMultiplier = Math.min(1.3, baseSize + growthPts * 0.005);

    // Passive cosmic longevity growth (grow extremely slowly over time)
    if (timeRef.current % 2200 === 0) {
      fish.growthPoints = (fish.growthPoints || 0) + 1;
    }

    // ATTRACTED TO FOOD SCENT (DYNAMICS UPDATED PER FRAME WITH PERSISTENT TARGET LOCKS AND MAX CAPACITY BOOKINGS)
    const pellets = foodRef.current;
    const isMaxSize = fish.sizeMultiplier >= 1.3; // Maxed-out fish leave food for smaller fish
    const canSeekFood = fish.state !== 'yinyang' && !isMaxSize;

    if (pellets.length > 0 && canSeekFood) {
      // Find if we already have a locked food pellet that is still valid
      let targetPellet = fish.targetFoodId ? pellets.find(p => p.id === fish.targetFoodId) : null;

      // If we don't have a valid target, find the best available pellet
      if (!targetPellet) {
        // Count how many fish are currently targeting each pellet id to distribute claimants
        const targetCounts: Record<string, number> = {};
        const allFishList = fishRef.current;
        allFishList.forEach(f => {
          if (f.id !== fish.id && f.targetFoodId) {
            targetCounts[f.targetFoodId] = (targetCounts[f.targetFoodId] || 0) + 1;
          }
        });

        // Split groups intelligently (limit to 3 fish per pellet max)
        const maxClaimants = 3;
        let bestPellet: FoodPellet | null = null;
        let minD = 99999;

        pellets.forEach(pel => {
          const claimantsCount = targetCounts[pel.id] || 0;
          if (claimantsCount >= maxClaimants) return; // Already fully booked by other nearby fish!

          const d = Math.hypot(fish.x - pel.x, fish.y - pel.y);
          if (d < minD) {
            minD = d;
            bestPellet = pel;
          }
        });

        // Fallback to closest if everything is booked or out of primary range, but within safe visual field (280px)
        if (!bestPellet) {
          pellets.forEach(pel => {
            const d = Math.hypot(fish.x - pel.x, fish.y - pel.y);
            if (d < minD) {
              minD = d;
              bestPellet = pel;
            }
          });

          if (bestPellet && minD < 350) {
            targetPellet = bestPellet;
            fish.targetFoodId = bestPellet.id;
          }
        } else if (bestPellet && minD < 600) {
          targetPellet = bestPellet;
          fish.targetFoodId = bestPellet.id;
        }
      }

      if (targetPellet) {
        fish.state = 'attracted_to_food';
        fish.targetX = targetPellet.x;
        fish.targetY = targetPellet.y;
        fish.stateTimer = Math.max(90, fish.stateTimer); // Keep the attraction state active and target continuously
      } else {
        fish.targetFoodId = undefined;
        if (fish.state === 'attracted_to_food') {
          // Food pellet was eaten or went out of range, go back to wandering
          fish.state = 'wandering';
          fish.targetX = 120 + Math.random() * (w - 240);
          fish.targetY = 120 + Math.random() * (h - 240);
          fish.stateTimer = 100 + Math.random() * 100;
        }
      }
    } else {
      fish.targetFoodId = undefined;
      if (fish.state === 'attracted_to_food') {
        // No food left in the pond, revert to normal wandering
        fish.state = 'wandering';
        fish.targetX = 120 + Math.random() * (w - 240);
        fish.targetY = 120 + Math.random() * (h - 240);
        fish.stateTimer = 100 + Math.random() * 100;
      }
    }

    // STATE TIMERS & TRANSITIONS (For normal, playful, resting and schooling behaviors when idle!)
    // Max-size fish that were already heading toward food should abandon it for smaller fish
    if (fish.state === 'attracted_to_food' && isMaxSize) {
      fish.state = 'wandering';
      fish.targetFoodId = undefined;
      fish.targetX = 120 + Math.random() * (w - 240);
      fish.targetY = 120 + Math.random() * (h - 240);
      fish.stateTimer = 100 + Math.random() * 100;
    }

    if (fish.state !== 'attracted_to_food' && fish.state !== 'yinyang') {
      fish.stateTimer -= 1;
      if (fish.stateTimer <= 0) {
        const rand = Math.random();
        
        if (rand > 0.44) {
          // SELECT A WANDERING DESTINATION (With options for schooling, independent patrol, or lily shade resting!)
          fish.state = 'wandering';
          fish.stateTimer = 180 + Math.random() * 240;

          const allFishList = fishRef.current;
          // Determine the "Alpha" of the pond for schooling (simply nominating largest/first non-cosmic fish)
          const alphaLeader = allFishList.find(f => f.type !== 'yin' && f.type !== 'yang');
          const isAlpha = alphaLeader && alphaLeader.id === fish.id;

          const pads = lilyPadsRef.current;

          if (pads.length > 0 && Math.random() < 0.15 && !isAlpha) {
            // Seek resting shade under a local Floating Lily Pad!
            const randomPad = pads[Math.floor(Math.random() * pads.length)];
            fish.targetX = randomPad.x + (Math.random() - 0.5) * 15;
            fish.targetY = randomPad.y + (Math.random() - 0.5) * 15;
            fish.stateTimer = 110 + Math.random() * 90; // Longer relaxation period under shelter
          } else if (alphaLeader && !isAlpha && Math.random() < 0.65) {
            // SCHOOLING MOVEMENT: Follow close in a cascading, gorgeous V-shape trail behind the Alpha
            const fishIndex = allFishList.findIndex(f => f.id === fish.id);
            const staggerIdx = fishIndex !== -1 ? fishIndex : 1;
            const vertIndex = Math.min(6, 2 + (staggerIdx % 4));
            
            const targetNode = alphaLeader.vertebrae[vertIndex] || alphaLeader;
            const sideSign = (staggerIdx % 2 === 0) ? -1 : 1;
            const flowAngle = alphaLeader.angle + sideSign * (0.32 + 0.12 * (staggerIdx % 3));
            const dist = 50 + (staggerIdx % 5) * 20;

            fish.targetX = Math.max(100, Math.min(w - 100, targetNode.x - Math.cos(flowAngle) * dist));
            fish.targetY = Math.max(100, Math.min(h - 100, targetNode.y - Math.sin(flowAngle) * dist));
          } else {
            // Patrol Solo: explore far corners of the garden pond
            fish.targetX = 120 + Math.random() * (w - 240);
            fish.targetY = 120 + Math.random() * (h - 240);
          }
        } else if (rand > 0.12) {
          // GLIDE PERIOD: slow elegant drift allowing dynamic water physics to carry them forward
          fish.state = 'gliding';
          fish.stateTimer = 60 + Math.random() * 90;
        } else {
          // PLAYFUL SPRINT PERIOD: fish get happy energy, swishing tail rapidly and leaving ripples!
          fish.state = 'playful_sprint';
          fish.stateTimer = 35 + Math.random() * 25; // short energetic dash

          const dashAngle = fish.angle + (Math.random() - 0.5) * 2.0;
          const dashDist = 180 + Math.random() * 120;
          fish.targetX = Math.max(100, Math.min(w - 100, fish.x + Math.cos(dashAngle) * dashDist));
          fish.targetY = Math.max(100, Math.min(h - 100, fish.y + Math.sin(dashAngle) * dashDist));

          // Highlight burst entry with satisfying physical water ripples
          spawnRipple(fish.x, fish.y, 24, 0.15);
          if (Math.random() > 0.5) {
            spawnRipple(fish.x, fish.y, 38, 0.08);
          }
        }
      }
    }

    // PHYSICS MOVEMENT ORBIT & TARGET CODES
    let targetX = fish.targetX;
    let targetY = fish.targetY;

    if (fish.state === 'yinyang') {
      // Cosmic double circular orbit (Cultivation Yin Yang flow) in Center Zone
      const cx = w / 2;
      const cy = h / 2;
      const radiusFactor = getDynamicYinYangRadiusFactor();
      const radius = Math.min(w, h) * radiusFactor;
      const speedParam = 0.012 * settings.koiSpeed;

      const phaseOffset = fish.type === 'yin' ? Math.PI : 0;
      const theta = (timeRef.current * speedParam + phaseOffset) % (Math.PI * 2);

      // Pre-steer slightly ahead in the orbit circle path to create incredibly curved transitions
      const leadAngle = theta + 0.55; 
      targetX = cx + Math.cos(leadAngle) * radius;
      targetY = cy + Math.sin(leadAngle) * radius;
    } else if (settings.yinYangMode && fish.state !== 'attracted_to_food' && fish.state !== 'attracted_to_tap') {
      // White fish follow white koi (yang), black type and yellow/gold follow black koi (yin)
      const whiteLeader = fishRef.current.find(f => f.type === 'yang');
      const blackLeader = fishRef.current.find(f => f.type === 'yin');
      
      const isWhite = fish.type === 'kohaku' || fish.type === 'sanke' || fish.type === 'tancho' || fish.type === 'koromo' || fish.type === 'sakura_pink' || fish.color === '#F8F5F2';
      const leader = isWhite ? whiteLeader : blackLeader;
      
      if (leader) {
        // Unique index-based trailing offsets so fish cascade behind leader without overlapping
        const allFishList = fishRef.current;
        const fishIndex = allFishList.findIndex(f => f.id === fish.id);
        const staggerIdx = fishIndex !== -1 ? fishIndex : fish.id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
        
        // Distribute follow targets across different vertebrae points
        const vertIndex = 3 + (staggerIdx % 7);
        const targetNode = leader.vertebrae[Math.min(vertIndex, leader.vertebrae.length - 1)] || leader;
        
        // Spread fish diagonally on both sides of the line for a beautiful V-school shape
        const sideSign = (staggerIdx % 2 === 0) ? -1 : 1;
        const sideAngleOffset = sideSign * (0.28 + 0.12 * (staggerIdx % 3));
        const angle = leader.angle + sideAngleOffset;
        
        // Comfortably stagger tail lengths
        const dist = 22 + (staggerIdx % 4) * 12;
        
        targetX = targetNode.x - Math.cos(angle) * dist;
        targetY = targetNode.y - Math.sin(angle) * dist;
      } else {
        // Fallback avoid center
        const cx = w / 2;
        const cy = h / 2;
        const distanceToCenter = Math.hypot(fish.x - cx, fish.y - cy);
        const radiusFactor = getDynamicYinYangRadiusFactor();
        const sacredRadius = Math.min(w, h) * radiusFactor + 45;
 
        if (distanceToCenter < sacredRadius) {
          const steerAwayAngle = Math.atan2(fish.y - cy, fish.x - cx);
          targetX = cx + Math.cos(steerAwayAngle) * (sacredRadius + 60);
          targetY = cy + Math.sin(steerAwayAngle) * (sacredRadius + 60);
        }
      }
    }

    // SEPARATION ENGINE & PHYSICAL COLLISION RESOLVER (Prevents clipping/overlapping when feeding, wandering, or following)
    let separationX = 0;
    let separationY = 0;
    let neighborsCount = 0;
    
    const allFish = fishRef.current;
    allFish.forEach(other => {
      if (other.id === fish.id) return;
      
      const dx = fish.x - other.x;
      const dy = fish.y - other.y;
      const dist = Math.hypot(dx, dy);
      
      // 1. Direct coordinate-level push-back to physically prevent overlapping/clipping
      // SCALE DOWN physical collision circles when actively feeding so they can converge on the food pellet instead of creating a rigid stuck fence!
      let closenessScale = 1.0;
      if (fish.state === 'attracted_to_food' && other.state === 'attracted_to_food') {
        const closestFoodDist = pellets.reduce((min, pel) => Math.min(min, Math.hypot(fish.x - pel.x, fish.y - pel.y)), 9999);
        if (closestFoodDist < 65) {
          closenessScale = Math.max(0.18, closestFoodDist / 65);
        }
      }

      const minPhysicalCircle = (24 * (fish.sizeMultiplier + other.sizeMultiplier) + 14) * closenessScale;
      if (dist < minPhysicalCircle && dist > 0.1) {
        const overlap = minPhysicalCircle - dist;
        // Pushes heads apart gently in coordinate space for smooth physical collision simulation
        const pushForce = overlap * 0.45;
        fish.x += (dx / dist) * pushForce;
        fish.y += (dy / dist) * pushForce;
      }
 
      // 2. Steer separation (comfort zone boids steering)
      const minComfortCircle = 44 * (fish.sizeMultiplier + other.sizeMultiplier) * closenessScale;
      if (dist < minComfortCircle && dist > 0.1) {
        const overlapFactor = (minComfortCircle - dist) / minComfortCircle;
        
        // Pushes the targeting vector in the opposite direction
        separationX += (dx / dist) * overlapFactor * 75;
        separationY += (dy / dist) * overlapFactor * 75;
        neighborsCount++;
      }
    });
 
    if (neighborsCount > 0) {
      separationX /= neighborsCount;
      separationY /= neighborsCount;
      
      // Reduce separation slightly when close to eating so fish can capture pellets accurately
      if (fish.state === 'attracted_to_food') {
        const closestFoodDist = pellets.reduce((min, pel) => Math.min(min, Math.hypot(fish.x - pel.x, fish.y - pel.y)), 9999);
        if (closestFoodDist < 80) {
          const foodProximityWeight = closestFoodDist / 80;
          separationX *= Math.max(0.45, foodProximityWeight);
          separationY *= Math.max(0.45, foodProximityWeight);
        }
      }
      
      targetX += separationX;
      targetY += separationY;
    }
 
    // 3. Emit a beautiful, soft water swimming ripple behind the fish as it swims
    const fishIndex = allFish.findIndex(f => f.id === fish.id);
    const fishHash = fishIndex !== -1 ? fishIndex : (fish.id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % 30);
    // Emitting ripples more frequently (every 18 frames) and at normal speeds (>0.2)
    if ((timeRef.current + fishHash) % 18 === 0 && fish.speed > 0.2) {
      const v = fish.vertebrae[Math.min(3, fish.vertebraeCount - 1)] || fish;
      spawnSwimRipple(v.x, v.y, 24 * fish.sizeMultiplier + 14, 0.24); // raised alpha to 0.24 and size factor
    }

    const distanceToTarget = Math.hypot(targetX - fish.x, targetY - fish.y);

    if (fish.state === 'wandering' && distanceToTarget < 40) {
      fish.targetX = 120 + Math.random() * (w - 240);
      fish.targetY = 120 + Math.random() * (h - 240);
    }

    // Nibbling Food pellet with immediate consumption — no chew delay or overshoot to prevent body twisting
    if (fish.state === 'attracted_to_food') {
      const activeFood = foodRef.current;
      // Mouth is at fish.vertebrae[0] (fish.x, fish.y). Collision reach size-adaptive
      const reachDist = 26 * fish.sizeMultiplier + 14;
      const reachIdx = activeFood.findIndex(pel => Math.hypot(fish.x - pel.x, fish.y - pel.y) < reachDist);

      if (reachIdx !== -1) {
        const pel = activeFood[reachIdx];

        // Emerald / Amber sparkles
        spawnParticle(fish.x, fish.y, '#10B981', 6, 1.2, 2.5); // green spark
        spawnParticle(fish.x, fish.y, '#F59E0B', 3, 1.2, 3.0); // golden snack particle

        // Consume the entire pellet instantly — no nibbles, just gulp!
        fish.growthPoints = (fish.growthPoints || 0) + 8; // direct growth boost
        activeFood.splice(reachIdx, 1);
        // Gulp ring
        spawnRipple(fish.x, fish.y, 40, 0.2);

        // Immediately persist growth to localStorage so progress is never lost on refresh
        needsSaveRef.current = true;

        // Reset food target lock for next choice
        fish.targetFoodId = undefined;

        // Stay in attracted_to_food state to seek the next pellet if any remain
        // If no more food nearby, naturally transition back to wandering via stateTimer
        fish.stateTimer = 30;
      }
    }

    // STEERING ADJUSTMENT: check for social greeting / nuzzling interactions
    let isSocialInteracting = false;
    let angleToTarget = Math.atan2(targetY - fish.y, targetX - fish.x);

    if (fish.state === 'wandering' && timeRef.current % 3 === 0) {
      const activeFish = fishRef.current;
      for (let i = 0; i < activeFish.length; i++) {
        const other = activeFish[i];
        if (other.id !== fish.id && other.state === 'wandering') {
          const d = Math.hypot(fish.x - other.x, fish.y - other.y);
          if (d > 25 && d < 45) { // tight social zone
            isSocialInteracting = true;
            const angleToOther = Math.atan2(other.y - fish.y, other.x - fish.x);
            // Gently steer slightly towards each other for curious sniff behavior
            angleToTarget = angleToTarget * 0.72 + angleToOther * 0.28;
            break;
          }
        }
      }
    }

    // Set variable speeds
    let desiredSpeed = 0.7 * settings.koiSpeed;
    if (fish.state === 'attracted_to_tap') {
      desiredSpeed = 2.1 * settings.koiSpeed;
    } else if (fish.state === 'attracted_to_food') {
      desiredSpeed = 3.5 * settings.koiSpeed; // Fast excited feed surge — get to food quickly
    } else if (fish.state === 'playful_sprint') {
      desiredSpeed = 2.65 * settings.koiSpeed; // Sudden burst forward
    } else if (settings.yinYangMode && fish.type !== 'yin' && fish.type !== 'yang') {
      // OVERRIDE follower speed to keep them perfectly in formation without stopping or lagging!
      const whiteLeader = fishRef.current.find(f => f.type === 'yang');
      const blackLeader = fishRef.current.find(f => f.type === 'yin');
      const isWhite = fish.type === 'kohaku' || fish.type === 'sanke' || fish.type === 'tancho' || fish.type === 'koromo' || fish.type === 'sakura_pink' || fish.color === '#F8F5F2';
      const leader = isWhite ? whiteLeader : blackLeader;
      if (leader) {
        if (distanceToTarget > 120) {
          desiredSpeed = 1.9 * settings.koiSpeed;
        } else if (distanceToTarget > 45) {
          desiredSpeed = 1.45 * settings.koiSpeed;
        } else {
          desiredSpeed = Math.max(0.7 * settings.koiSpeed, leader.speed * 1.05); // slightly faster than leader to close loops beautifully
        }
      } else {
        desiredSpeed = 1.0 * settings.koiSpeed;
      }
    } else if (fish.state === 'gliding') {
      desiredSpeed = 0.22 * settings.koiSpeed;
    } else if (fish.state === 'yinyang') {
      desiredSpeed = 1.35 * settings.koiSpeed;
    }

    // RESTING MODIFIER: check if lounging happily under a Lily Pad shade leaf
    const isRestingUnderLily = fish.state === 'wandering' && 
      lilyPadsRef.current.some(pad => Math.hypot(fish.targetX - pad.x, fish.targetY - pad.y) < 22) &&
      distanceToTarget < 60;
    if (isRestingUnderLily) {
      desiredSpeed = 0.35 * settings.koiSpeed;
    }

    // SOCIAL MODIFIER: slow down for curious greeting nuzzles
    if (isSocialInteracting) {
      desiredSpeed *= 0.65;
    }

    // arrival decel formula: smoothly slow down as we near targets to prevent overshooting
    // For feeding fish, start decelerating earlier to prevent body twisting from sharp last-second turns
    const decelZone = fish.state === 'attracted_to_food' ? 80 : 50;
    if (distanceToTarget < decelZone && fish.state !== 'yinyang' && !settings.yinYangMode) {
      const slowMultiplier = Math.max(0.35, distanceToTarget / decelZone);
      desiredSpeed *= slowMultiplier;
    }

    // Smooth speed transitions
    fish.speed += (desiredSpeed - fish.speed) * 0.08;

    // If we are extremely close to a food pellet target, keep our current direction to prevent sub-pixel overshoot jitter!
    if (fish.state === 'attracted_to_food' && distanceToTarget < 14) {
      angleToTarget = fish.angle;
    }

    // If the fish is close to its target in Yin-Yang mode, blend its steering angle with the leader's heading
    // so it follows the curve of the circular orbit elegantly instead of jittering or breaking!
    const whiteLeader = fishRef.current.find(f => f.type === 'yang');
    const blackLeader = fishRef.current.find(f => f.type === 'yin');
    const isWhite = fish.type === 'kohaku' || fish.type === 'sanke' || fish.type === 'tancho' || fish.type === 'koromo' || fish.type === 'sakura_pink' || fish.color === '#F8F5F2';
    const leader = isWhite ? whiteLeader : blackLeader;

    if (settings.yinYangMode && fish.type !== 'yin' && fish.type !== 'yang' && leader && fish.state !== 'attracted_to_food' && fish.state !== 'attracted_to_tap') {
      if (distanceToTarget < 32) {
        const blendFactor = Math.max(0, distanceToTarget / 32);
        // Clean arc path blending preventing wild micro-target adjustments
        angleToTarget = leader.angle * (1.0 - blendFactor) + angleToTarget * blendFactor;
      }
    }

    let angleDifference = angleToTarget - fish.angle;
    angleDifference = Math.atan2(Math.sin(angleDifference), Math.cos(angleDifference));

    // Dynamic Turn Speed capabilities: sharper turns when capturing food, slow/graceful arcs when gliding
    let activeTurnMultiplier = (fish.state === 'yinyang' || (settings.yinYangMode && fish.state !== 'attracted_to_food' && fish.state !== 'attracted_to_tap')) 
      ? 1.9 
      : (fish.state === 'attracted_to_food' 
          ? 1.6 
          : (fish.state === 'playful_sprint' 
              ? 1.6 
              : (1.1 - fish.speed / (4.0 * settings.koiSpeed))));

    // DAMPEN TURN VELOCITIES SIGNIFICANTLY DURING IDLE/QUIET PERIODS FOR LAZY NATURAL SWEEPS
    if (fish.state === 'gliding') {
      activeTurnMultiplier *= 0.45; // Broad, graceful drift rotation
    } else if (fish.state === 'wandering') {
      activeTurnMultiplier *= 0.65; // Relaxed, sweeping lazy turns
    }
    const activeTurnLimit = fish.turnSpeed * activeTurnMultiplier;
    fish.angle += Math.max(-activeTurnLimit, Math.min(activeTurnLimit, angleDifference));

    // RECOIL SWAY BIO-MIMICRY YAW:
    // Extremely subtle yaw recoil when swimming fast, completely zeroed when slow/gliding for realistic pacing
    const isGlider = fish.state === 'gliding' || fish.speed < 0.25;
    const yawSway = isGlider ? 0 : Math.sin(fish.wiggleCycle) * 0.026 * Math.min(1.0, fish.speed * 0.4);
    const travelAngleCombined = fish.angle + yawSway;

    fish.x += Math.cos(travelAngleCombined) * fish.speed;
    fish.y += Math.sin(travelAngleCombined) * fish.speed;

    // SPINE LINK COMPACT LINK KINEMATICS (Hyper-realistic wave motion formula)
    const headNode = fish.vertebrae[0];
    headNode.x = fish.x;
    headNode.y = fish.y;

    const baseLength = 40 * fish.sizeMultiplier;
    const spacing = baseLength / fish.vertebraeCount;

    // Continuous organic frequency and amplitude based on speed (no stepped transitions)
    const normalizedSpeed = Math.min(1.5, fish.speed * 0.45);
    const wr = isGlider ? 0.35 : 1.0;
    const wiggleFrequency = (0.048 + normalizedSpeed * 0.1) * wr;
    const wiggleAmplitude = (0.12 + normalizedSpeed * 0.14) * wr;

    fish.wiggleCycle += wiggleFrequency;

    for (let i = 1; i < fish.vertebraeCount; i++) {
      const prev = fish.vertebrae[i - 1];
      const curr = fish.vertebrae[i];

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;

      // Base spatial connection drag angle
      const baseAngle = Math.atan2(dy, dx);

      // Elegant phase wave lag propagated downstream
      const localPhase = fish.wiggleCycle - i * 0.45;

      // Damped flexibility curve at head region (i is low), maximum flexibility at tail (i is high)
      const flexibility = Math.pow(i / (fish.vertebraeCount - 1), 1.6);
      const jointWaveOffset = Math.sin(localPhase) * wiggleAmplitude * flexibility * 0.42;

      const targetAngle = baseAngle + jointWaveOffset;

      curr.x = prev.x + Math.cos(targetAngle) * spacing;
      curr.y = prev.y + Math.sin(targetAngle) * spacing;
    }
  };

  const getBodyWidthCurve = (idx: number, total: number): number => {
    const t = idx / (total - 1);
    if (t < 0.12) {
      return 3.5 + (t / 0.12) * 5.5;
    } else if (t < 0.3) {
      return 9.0;
    } else {
      return 9.0 * (1.0 - (t - 0.3) / 0.7) * 0.85 + 1.2;
    }
  };

  const drawSkeletalPath = (ctx: CanvasRenderingContext2D, fish: KoiFish, isShadow: boolean) => {
    ctx.beginPath();
    const list = fish.vertebrae;
    const total = fish.vertebraeCount;

    const left: { x: number; y: number }[] = [];
    const right: { x: number; y: number }[] = [];

    for (let i = 0; i < total; i++) {
      const node = list[i];
      let segmentAngle = fish.angle;

      if (i > 0) {
        const prev = list[i - 1];
        segmentAngle = Math.atan2(node.y - prev.y, node.x - prev.x) + Math.PI;
      }

      const w = getBodyWidthCurve(i, total) * fish.sizeMultiplier * (isShadow ? 1.05 : 1.0);

      left.push({
        x: node.x + Math.cos(segmentAngle + Math.PI / 2) * w,
        y: node.y + Math.sin(segmentAngle + Math.PI / 2) * w,
      });
      right.unshift({
        x: node.x + Math.cos(segmentAngle - Math.PI / 2) * w,
        y: node.y + Math.sin(segmentAngle - Math.PI / 2) * w,
      });
    }

    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < left.length; i++) {
      ctx.lineTo(left[i].x, left[i].y);
    }
    for (let i = 0; i < right.length; i++) {
      ctx.lineTo(right[i].x, right[i].y);
    }
    ctx.closePath();
  };

  const drawKoiPattern = (ctx: CanvasRenderingContext2D, fish: KoiFish) => {
    ctx.save();
    ctx.clip();

    ctx.fillStyle = fish.accentColor;

    if (fish.type === 'tancho') {
      const head = fish.vertebrae[0];
      const discSize = 4.2 * fish.sizeMultiplier;
      ctx.save();
      ctx.translate(head.x + Math.cos(fish.angle) * 1.5, head.y + Math.sin(fish.angle) * 1.5);
      
      const spotGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, discSize);
      spotGrad.addColorStop(0, '#E63946');
      spotGrad.addColorStop(0.76, '#E63946');
      spotGrad.addColorStop(1, 'rgba(230, 57, 70, 0)');
      
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.arc(0, 0, discSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (fish.type === 'yin' || fish.type === 'yang') {
      // Yin and Yang fish are pure solid black & white, NO spots drawn on their back
    } else if (fish.type === 'kohaku' || fish.type === 'sanke' || fish.type === 'sakura_pink' || fish.type === 'tsuki_blue') {
      const spots = [2, 5, 8];
      const spotRadii = [5.5 * fish.sizeMultiplier, 4.8 * fish.sizeMultiplier, 2.8 * fish.sizeMultiplier];

      spots.forEach((nodeIdx, idx) => {
        const v = fish.vertebrae[nodeIdx];
        
        let segmentAngle = fish.angle;
        if (nodeIdx > 0) {
          const prev = fish.vertebrae[nodeIdx - 1];
          segmentAngle = Math.atan2(v.y - prev.y, v.x - prev.x) + Math.PI;
        }

        const rx = spotRadii[idx] * 1.35;
        const ry = spotRadii[idx] * 0.95;
        const color = fish.type === 'sanke' ? '#E63946' : fish.accentColor;

        ctx.save();
        ctx.translate(v.x, v.y);
        ctx.rotate(segmentAngle + 0.3 * idx);

        const spotGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        spotGrad.addColorStop(0, color);
        spotGrad.addColorStop(0.72, color);
        spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (fish.type === 'sanke' && idx !== 1) {
          ctx.save();
          ctx.translate(v.x - 2, v.y + 1);
          ctx.rotate(segmentAngle - 0.4);

          const blackRx = spotRadii[idx] * 0.58;
          const blackRy = spotRadii[idx] * 0.42;
          
          const blackGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, blackRx);
          blackGrad.addColorStop(0, '#181A1B');
          blackGrad.addColorStop(0.68, '#181A1B');
          blackGrad.addColorStop(1, 'rgba(24, 26, 27, 0)');

          ctx.fillStyle = blackGrad;
          ctx.beginPath();
          ctx.ellipse(0, 0, blackRx, blackRy, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    } else if (fish.type === 'shiro_utsuri') {
      const spots = [1, 4, 7];
      const spotRadii = [6.5 * fish.sizeMultiplier, 4.5 * fish.sizeMultiplier, 2.8 * fish.sizeMultiplier];

      spots.forEach((nodeIdx, idx) => {
        const v = fish.vertebrae[nodeIdx];
        
        let segmentAngle = fish.angle;
        if (nodeIdx > 0) {
          const prev = fish.vertebrae[nodeIdx - 1];
          segmentAngle = Math.atan2(v.y - prev.y, v.x - prev.x) + Math.PI;
        }

        const rx = spotRadii[idx] * 1.45;
        const ry = spotRadii[idx] * 0.82;

        ctx.save();
        ctx.translate(v.x, v.y);
        ctx.rotate(segmentAngle + idx * 0.5);

        const patchGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        patchGrad.addColorStop(0, '#DFE3E6');
        patchGrad.addColorStop(0.70, '#DFE3E6');
        patchGrad.addColorStop(1, 'rgba(223, 227, 230, 0)');

        ctx.fillStyle = patchGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    } else if (fish.type === 'showa') {
      const redSpots = [1, 5, 8];
      const whiteSpots = [3, 6];
      const redRadii = [6.2 * fish.sizeMultiplier, 4.5 * fish.sizeMultiplier, 2.5 * fish.sizeMultiplier];
      const whiteRadii = [4.8 * fish.sizeMultiplier, 3.2 * fish.sizeMultiplier];

      // Red marking sweeps
      redSpots.forEach((nodeIdx, idx) => {
        const v = fish.vertebrae[nodeIdx];
        
        let segmentAngle = fish.angle;
        if (nodeIdx > 0) {
          const prev = fish.vertebrae[nodeIdx - 1];
          segmentAngle = Math.atan2(v.y - prev.y, v.x - prev.x) + Math.PI;
        }

        const rx = redRadii[idx] * 1.4;
        const ry = redRadii[idx] * 0.85;

        ctx.save();
        ctx.translate(v.x, v.y);
        ctx.rotate(segmentAngle - 0.3 + idx * 0.4);

        const redGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        redGrad.addColorStop(0, '#E63946');
        redGrad.addColorStop(0.72, '#E63946');
        redGrad.addColorStop(1, 'rgba(230, 57, 70, 0)');

        ctx.fillStyle = redGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // White marking sweeps
      whiteSpots.forEach((nodeIdx, idx) => {
        const v = fish.vertebrae[nodeIdx];
        
        let segmentAngle = fish.angle;
        if (nodeIdx > 0) {
          const prev = fish.vertebrae[nodeIdx - 1];
          segmentAngle = Math.atan2(v.y - prev.y, v.x - prev.x) + Math.PI;
        }

        const rx = whiteRadii[idx] * 1.25;
        const ry = whiteRadii[idx] * 0.85;

        ctx.save();
        ctx.translate(v.x + 1, v.y - 1);
        ctx.rotate(segmentAngle + 0.2 + idx * 0.5);

        const whiteGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        whiteGrad.addColorStop(0, '#F8F5F2');
        whiteGrad.addColorStop(0.7, '#F8F5F2');
        whiteGrad.addColorStop(1, 'rgba(248, 245, 242, 0)');

        ctx.fillStyle = whiteGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    } else if (fish.type === 'asagi') {
      const head = fish.vertebrae[0];
      
      // Cheeks (gills edges)
      ctx.save();
      ctx.fillStyle = '#E63946';
      ctx.beginPath();
      ctx.arc(head.x + Math.cos(fish.angle + 0.6) * (3 * fish.sizeMultiplier), head.y + Math.sin(fish.angle + 0.6) * (3 * fish.sizeMultiplier), 1.6 * fish.sizeMultiplier, 0, Math.PI * 2);
      ctx.arc(head.x + Math.cos(fish.angle - 0.6) * (3 * fish.sizeMultiplier), head.y + Math.sin(fish.angle - 0.6) * (3 * fish.sizeMultiplier), 1.6 * fish.sizeMultiplier, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Lower sides red sweeps
      ctx.save();
      ctx.fillStyle = '#E63946';
      for (let i = 2; i < 8; i += 2) {
        const v = fish.vertebrae[i];
        ctx.beginPath();
        ctx.arc(v.x + Math.cos(fish.angle + Math.PI / 2) * (1.8 * fish.sizeMultiplier), v.y + Math.sin(fish.angle + Math.PI / 2) * (1.8 * fish.sizeMultiplier), 2.1 * fish.sizeMultiplier, 0, Math.PI * 2);
        ctx.arc(v.x + Math.cos(fish.angle - Math.PI / 2) * (1.8 * fish.sizeMultiplier), v.y + Math.sin(fish.angle - Math.PI / 2) * (1.8 * fish.sizeMultiplier), 2.1 * fish.sizeMultiplier, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Mesh netting lines representing scale netting
      ctx.save();
      ctx.strokeStyle = 'rgba(40, 60, 100, 0.42)';
      ctx.lineWidth = 0.5;
      for (let i = 1; i < fish.vertebraeCount - 2; i++) {
        const v = fish.vertebrae[i];
        ctx.beginPath();
        ctx.arc(v.x, v.y, 3 * fish.sizeMultiplier, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    } else if (fish.type === 'hi_utsuri') {
      const spots = [2, 5, 8];
      const spotRadii = [5.6 * fish.sizeMultiplier, 4.2 * fish.sizeMultiplier, 2.6 * fish.sizeMultiplier];
      
      spots.forEach((nodeIdx, idx) => {
        const v = fish.vertebrae[nodeIdx];
        
        let segmentAngle = fish.angle;
        if (nodeIdx > 0) {
          const prev = fish.vertebrae[nodeIdx - 1];
          segmentAngle = Math.atan2(v.y - prev.y, v.x - prev.x) + Math.PI;
        }

        const rx = spotRadii[idx] * 1.3;
        const ry = spotRadii[idx] * 0.95;

        ctx.save();
        ctx.translate(v.x, v.y);
        ctx.rotate(segmentAngle + idx * 0.4);

        const orangeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        orangeGrad.addColorStop(0, '#E35D23');
        orangeGrad.addColorStop(0.72, '#E35D23');
        orangeGrad.addColorStop(1, 'rgba(227, 93, 35, 0)');

        ctx.fillStyle = orangeGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    } else if (fish.type === 'ki_bekko') {
      const spots = [3, 6];
      const spotRadii = [3.2 * fish.sizeMultiplier, 2.5 * fish.sizeMultiplier];
      
      spots.forEach((nodeIdx, idx) => {
        const v = fish.vertebrae[nodeIdx];
        
        let segmentAngle = fish.angle;
        if (nodeIdx > 0) {
          const prev = fish.vertebrae[nodeIdx - 1];
          segmentAngle = Math.atan2(v.y - prev.y, v.x - prev.x) + Math.PI;
        }

        const rx = spotRadii[idx] * 1.2;
        const ry = spotRadii[idx] * 0.78;

        ctx.save();
        ctx.translate(v.x - 1, v.y + 1);
        ctx.rotate(segmentAngle - 0.2 + idx * 0.5);

        const blackGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        blackGrad.addColorStop(0, '#1A1B1D');
        blackGrad.addColorStop(0.72, '#1A1B1D');
        blackGrad.addColorStop(1, 'rgba(26, 27, 29, 0)');

        ctx.fillStyle = blackGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    } else if (fish.type === 'koromo') {
      const spots = [2, 5, 8];
      const spotRadii = [5.8 * fish.sizeMultiplier, 4.4 * fish.sizeMultiplier, 2.5 * fish.sizeMultiplier];

      spots.forEach((nodeIdx, idx) => {
        const v = fish.vertebrae[nodeIdx];
        
        let segmentAngle = fish.angle;
        if (nodeIdx > 0) {
          const prev = fish.vertebrae[nodeIdx - 1];
          segmentAngle = Math.atan2(v.y - prev.y, v.x - prev.x) + Math.PI;
        }

        const rx = spotRadii[idx] * 1.35;
        const ry = spotRadii[idx] * 0.95;

        ctx.save();
        ctx.translate(v.x, v.y);
        ctx.rotate(segmentAngle + 0.3 * idx);

        const redGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        redGrad.addColorStop(0, '#9B2C2C');
        redGrad.addColorStop(0.74, '#9B2C2C');
        redGrad.addColorStop(1, 'rgba(155, 44, 44, 0)');

        ctx.fillStyle = redGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(43, 27, 23, 0.45)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const offset = (j - 3) * 1.5;
          ctx.arc(offset, 0, spotRadii[idx] * 0.5, 0, Math.PI * 2);
        }
        ctx.stroke();
        ctx.restore();
      });
    }

    ctx.restore();
  };

  const drawKoiGillsAndFins = (ctx: CanvasRenderingContext2D, fish: KoiFish) => {
    ctx.save();
    
    // Custom ray / filament colors per breed to eliminate high-contrast white needles on dark bodies
    const getRayColorForType = (type: string): string => {
      switch (type) {
        case 'kohaku':
        case 'sanke':
        case 'tancho':
          return 'rgba(230, 57, 70, 0.24)';
        case 'yamabuki':
          return 'rgba(251, 191, 36, 0.28)';
        case 'shiro_utsuri':
          return 'rgba(223, 227, 230, 0.26)';
        case 'showa':
          return 'rgba(230, 57, 70, 0.22)';
        case 'asagi':
          return 'rgba(143, 184, 209, 0.30)';
        case 'hi_utsuri':
          return 'rgba(227, 93, 35, 0.28)';
        case 'ki_bekko':
          return 'rgba(250, 240, 137, 0.28)';
        case 'beni_goi':
          return 'rgba(229, 62, 62, 0.28)';
        case 'hajiro':
          return 'rgba(248, 245, 242, 0.28)';
        case 'koromo':
          return 'rgba(155, 44, 44, 0.26)';
        case 'sakura_pink':
          return 'rgba(255, 105, 180, 0.28)';
        case 'tsuki_blue':
          return 'rgba(2, 136, 209, 0.28)';
        case 'yin':
          return 'rgba(248, 245, 242, 0.14)'; // Soft, subtle white/grey filaments for black spiritual fish
        case 'yang':
          return 'rgba(22, 22, 24, 0.20)'; // Soft, dark charcoal filaments for white spiritual fish
        default:
          return 'rgba(255, 255, 255, 0.22)';
      }
    };

    const list = fish.vertebrae;
    const anchorNode = list[1]; 
    const segmentAngle = Math.atan2(list[2].y - list[0].y, list[2].x - list[0].x) + Math.PI;

    // Head barbels (whiskers) - extremely authentic and elegant!
    const head = list[0];
    const barbelLen = 14 * fish.sizeMultiplier;
    ctx.save();
    ctx.strokeStyle = fish.color;
    ctx.lineWidth = 0.55 * fish.sizeMultiplier + 0.4;
    ctx.globalAlpha = 0.77;
    
    // Left barbel swaying beautifully
    ctx.beginPath();
    ctx.moveTo(head.x, head.y);
    const bAngleL = fish.angle + Math.PI * 0.95 + Math.sin(fish.wiggleCycle * 1.4) * 0.16;
    ctx.quadraticCurveTo(
      head.x + Math.cos(bAngleL - 0.25) * barbelLen * 0.55,
      head.y + Math.sin(bAngleL - 0.25) * barbelLen * 0.55,
      head.x + Math.cos(bAngleL) * barbelLen,
      head.y + Math.sin(bAngleL) * barbelLen
    );
    ctx.stroke();

    // Right barbel swaying beautifully
    ctx.beginPath();
    ctx.moveTo(head.x, head.y);
    const bAngleR = fish.angle - Math.PI * 0.95 - Math.sin(fish.wiggleCycle * 1.4) * 0.16;
    ctx.quadraticCurveTo(
      head.x + Math.cos(bAngleR + 0.25) * barbelLen * 0.55,
      head.y + Math.sin(bAngleR + 0.25) * barbelLen * 0.55,
      head.x + Math.cos(bAngleR) * barbelLen,
      head.y + Math.sin(bAngleR) * barbelLen
    );
    ctx.stroke();
    ctx.restore();

    // Fin length scales with body size for proportional flowing wings
    const baseLen = 22 * fish.sizeMultiplier; 

    // Helper drawing a highly detailed pectoral or pelvic fin matching the tail lobes exactly
    const drawFinWithRays = (x: number, y: number, length: number, angle: number, isRight: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = 0.72;

      // Base fin translucent watercolor gradient matching the tail-fin exactly
      const finGrad = ctx.createLinearGradient(0, 0, length, 0);
      finGrad.addColorStop(0, fish.color);
      if (fish.type === 'yin') {
        finGrad.addColorStop(0, 'rgba(22, 22, 24, 0.88)');
        finGrad.addColorStop(0.4, 'rgba(40, 60, 75, 0.68)');
        finGrad.addColorStop(0.78, 'rgba(248, 245, 242, 0.35)');
        finGrad.addColorStop(1, 'rgba(34, 211, 238, 0.03)');
      } else if (fish.type === 'yang') {
        finGrad.addColorStop(0, 'rgba(240, 235, 230, 0.92)');
        finGrad.addColorStop(0.4, 'rgba(240, 235, 230, 0.65)');
        finGrad.addColorStop(0.78, 'rgba(30, 30, 35, 0.28)');
        finGrad.addColorStop(1, 'rgba(251, 191, 36, 0.03)');
      } else if (fish.type === 'hajiro') {
        finGrad.addColorStop(0, '#121214');
        finGrad.addColorStop(0.35, 'rgba(18, 18, 20, 0.88)');
        finGrad.addColorStop(0.72, 'rgba(248, 245, 242, 0.75)');
        finGrad.addColorStop(1, 'rgba(248, 245, 242, 0.03)');
      } else {
        finGrad.addColorStop(0.35, `${fish.color}E0`);
        finGrad.addColorStop(0.65, `${fish.accentColor}B0`);
        finGrad.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
      }

      ctx.fillStyle = finGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      
      const multiplier = isRight ? -1 : 1;
      
      // Graceful, sleek wing sweep (optimized to stay well-proportioned at all sizes)
      ctx.bezierCurveTo(
        length * 0.44, length * 0.36 * multiplier,
        length * 0.90, length * 0.42 * multiplier,
        length * 1.15, length * 0.14 * multiplier
      );
      ctx.bezierCurveTo(
        length * 0.85, -length * 0.10 * multiplier,
        length * 0.35, -length * 0.06 * multiplier,
        0, 0
      );
      ctx.closePath();
      ctx.fill();

      // Delicate silk outline stroke to unify and prevent visual clipping
      ctx.strokeStyle = getRayColorForType(fish.type);
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Silky, glowing filament threads inside the wing webbing (proportional to tail filaments)
      ctx.strokeStyle = getRayColorForType(fish.type);
      ctx.lineWidth = 0.4;
      const rayAngles = [0.06, 0.16, 0.26, 0.36];
      rayAngles.forEach(rad => {
        const adjustedRad = rad * multiplier;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(
          length * 0.65 * Math.cos(adjustedRad * 0.5), length * 0.38 * Math.sin(adjustedRad * 0.5),
          length * 1.05 * Math.cos(adjustedRad), length * 1.05 * Math.sin(adjustedRad)
        );
        ctx.stroke();
      });

      ctx.restore();
    };

    // 1. PECTORAL FINS (Upper wings)
    const finAngleL = segmentAngle + Math.PI * 0.6 + Math.sin(fish.wiggleCycle) * 0.12;
    drawFinWithRays(anchorNode.x, anchorNode.y, baseLen, finAngleL, false);

    const finAngleR = segmentAngle - Math.PI * 0.6 - Math.sin(fish.wiggleCycle) * 0.12;
    drawFinWithRays(anchorNode.x, anchorNode.y, baseLen, finAngleR, true);

    // 2. PELVIC / VENTRAL FINS (Lower belly wings further down the body at list[4])
    const pelvicNode = list[Math.min(4, list.length - 1)];
    const pelvicLen = baseLen * 0.68;
    const pelvicAngleL = segmentAngle + Math.PI * 0.72 + Math.sin(fish.wiggleCycle - 0.5) * 0.12;
    drawFinWithRays(pelvicNode.x, pelvicNode.y, pelvicLen, pelvicAngleL, false);

    const pelvicAngleR = segmentAngle - Math.PI * 0.72 - Math.sin(fish.wiggleCycle - 0.5) * 0.12;
    drawFinWithRays(pelvicNode.x, pelvicNode.y, pelvicLen, pelvicAngleR, true);

    // 3. DRAPED DORSAL FIN (Majestic wavy center spine veil running from list[2] to list[6])
    ctx.save();
    ctx.globalAlpha = 0.44;
    const dorsalStart = list[2];
    const dorsalEnd = list[Math.min(6, list.length - 1)];
    // Transparent center gradient mapped dynamically to the actual physical path of the dorsal fin
    const dorsalGrad = ctx.createLinearGradient(dorsalStart.x, dorsalStart.y, dorsalEnd.x, dorsalEnd.y);
    dorsalGrad.addColorStop(0, fish.color);
    dorsalGrad.addColorStop(0.5, `${fish.accentColor}90`);
    dorsalGrad.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
    ctx.fillStyle = dorsalGrad;

    ctx.beginPath();
    ctx.moveTo(dorsalStart.x, dorsalStart.y);

    // Beautiful side draping based on body curve and motion phases for 3D realism
    for (let i = 2; i <= 6; i++) {
      const node = list[i];
      const prevNode = list[i - 1];
      const linkAngle = Math.atan2(node.y - prevNode.y, node.x - prevNode.x);
      const perpAngle = linkAngle + Math.PI / 2;
      const dorsalSway = Math.sin(fish.wiggleCycle - i * 0.3) * 3.8 * fish.sizeMultiplier;
      const ox = node.x + Math.cos(perpAngle) * (dorsalSway + getBodyWidthCurve(i, list.length) * 0.35 * fish.sizeMultiplier);
      const oy = node.y + Math.sin(perpAngle) * (dorsalSway + getBodyWidthCurve(i, list.length) * 0.35 * fish.sizeMultiplier);
      ctx.lineTo(ox, oy);
    }
    for (let i = 6; i >= 2; i--) {
      const node = list[i];
      ctx.lineTo(node.x, node.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 4. CAUDAL TAIL FORK
    const tailNode = list[list.length - 1];
    const prevTail = list[list.length - 2];
    const tailAngleHeading = Math.atan2(tailNode.y - prevTail.y, tailNode.x - prevTail.x);

    ctx.save();
    ctx.translate(tailNode.x, tailNode.y);
    
    // Beautiful secondary silk ripple friction lag
    const jointLag = Math.sin(fish.wiggleCycle - list.length * 0.42) * 0.08;
    ctx.rotate(tailAngleHeading + jointLag); 

    // Dynamic length - butterfly tails are long, majestic, draping elegantly
    const tailLen = 42 * fish.sizeMultiplier;

    // Helper function for a single flowy translucent feather lobe with silky internal rays
    const drawTailLobe = (length: number, scaleY: number, rotateOffset: number, opacity: number, customColorGrad: CanvasGradient) => {
      ctx.save();
      ctx.rotate(rotateOffset);
      ctx.scale(1, scaleY);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = customColorGrad;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        length * 0.44, length * 0.38,
        length * 0.92, length * 0.46,
        length * 1.35, length * 0.18
      );
      ctx.bezierCurveTo(
        length * 0.95, -length * 0.12,
        length * 0.38, -length * 0.08,
        0, 0
      );
      ctx.closePath();
      ctx.fill();

      // Delicate silk outline stroke to unify and prevent visual clipping
      ctx.strokeStyle = getRayColorForType(fish.type);
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Silky, glowing filament threads inside the fin webbing
      ctx.strokeStyle = getRayColorForType(fish.type);
      ctx.lineWidth = 0.4;
      const rayAngles = [0.06, 0.16, 0.26, 0.36];
      rayAngles.forEach(rad => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(
          length * 0.65 * Math.cos(rad * 0.5), length * 0.38 * Math.sin(rad * 0.5),
          length * 1.2 * Math.cos(rad), length * 1.2 * Math.sin(rad)
        );
        ctx.stroke();
      });

      ctx.restore();
    };

    // Build multi-stop gradients for the primary and secondary wing lobes
    const primaryGrad = ctx.createLinearGradient(0, 0, tailLen, 0);
    primaryGrad.addColorStop(0, fish.color);
    if (fish.type === 'yin') {
      primaryGrad.addColorStop(0, 'rgba(22, 22, 24, 0.88)');
      primaryGrad.addColorStop(0.45, 'rgba(40, 60, 75, 0.65)');
      primaryGrad.addColorStop(0.8, 'rgba(248, 245, 242, 0.35)');
      primaryGrad.addColorStop(1, 'rgba(34, 211, 238, 0.03)');
    } else if (fish.type === 'yang') {
      primaryGrad.addColorStop(0, 'rgba(240, 235, 230, 0.92)');
      primaryGrad.addColorStop(0.5, 'rgba(240, 235, 230, 0.60)');
      primaryGrad.addColorStop(0.8, 'rgba(30, 30, 35, 0.28)');
      primaryGrad.addColorStop(1, 'rgba(251, 191, 36, 0.03)');
    } else if (fish.type === 'hajiro') {
      primaryGrad.addColorStop(0, '#121214');
      primaryGrad.addColorStop(0.35, 'rgba(18, 18, 20, 0.88)');
      primaryGrad.addColorStop(0.72, 'rgba(248, 245, 242, 0.75)');
      primaryGrad.addColorStop(1, 'rgba(248, 245, 242, 0.03)');
    } else {
      primaryGrad.addColorStop(0.35, `${fish.color}E0`);
      primaryGrad.addColorStop(0.65, `${fish.accentColor}B0`);
      primaryGrad.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
    }

    const secondaryGrad = ctx.createLinearGradient(0, 0, tailLen * 1.25, 0);
    secondaryGrad.addColorStop(0, fish.color);
    if (fish.type === 'yin') {
      secondaryGrad.addColorStop(0, 'rgba(22, 22, 24, 0.68)');
      secondaryGrad.addColorStop(0.5, 'rgba(40, 60, 75, 0.48)');
      secondaryGrad.addColorStop(0.85, 'rgba(248, 245, 242, 0.22)');
      secondaryGrad.addColorStop(1, 'rgba(34, 211, 238, 0.02)');
    } else if (fish.type === 'yang') {
      secondaryGrad.addColorStop(0, 'rgba(240, 235, 230, 0.72)');
      secondaryGrad.addColorStop(0.5, 'rgba(240, 235, 230, 0.45)');
      secondaryGrad.addColorStop(0.85, 'rgba(30, 30, 35, 0.22)');
      secondaryGrad.addColorStop(1, 'rgba(251, 191, 36, 0.02)');
    } else if (fish.type === 'hajiro') {
      secondaryGrad.addColorStop(0, '#121214');
      secondaryGrad.addColorStop(0.48, 'rgba(18, 18, 20, 0.60)');
      secondaryGrad.addColorStop(0.82, 'rgba(248, 245, 242, 0.48)');
      secondaryGrad.addColorStop(1, 'rgba(248, 245, 242, 0.01)');
    } else {
      secondaryGrad.addColorStop(0.4, `${fish.color}90`);
      secondaryGrad.addColorStop(0.72, `${fish.accentColor}60`);
      secondaryGrad.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
    }

    // Draw multiple overlapping lobes at slightly offset wave-angles for stunning 3D depth and flutter!
    const wavePhase = fish.wiggleCycle * 0.95;
    
    // Lobe 1: Upper Primary
    drawTailLobe(tailLen, 0.85, 0.12 + Math.sin(wavePhase - 0.2) * 0.08, 0.52, primaryGrad);
    
    // Lobe 2: Lower Primary
    drawTailLobe(tailLen, -0.85, -0.12 + Math.sin(wavePhase - 0.25) * 0.08, 0.52, primaryGrad);

    // Lobe 3: Center Draping Veil Lobe (providing secondary flowing mesh overlay)
    drawTailLobe(tailLen * 1.3, 0.42, Math.sin(wavePhase - 0.5) * 0.12, 0.38, secondaryGrad);
    
    // Lobe 4 & 5: Delicate wispy horizontal outer trailing strands
    drawTailLobe(tailLen * 1.45, 0.12, 0.35 + Math.sin(wavePhase - 0.8) * 0.16, 0.25, secondaryGrad);
    drawTailLobe(tailLen * 1.45, -0.12, -0.35 + Math.sin(wavePhase - 0.82) * 0.16, 0.25, secondaryGrad);

    ctx.restore();
    ctx.restore();
  };

  const drawKoiEyes = (ctx: CanvasRenderingContext2D, fish: KoiFish) => {
    const head = fish.vertebrae[0];
    const angle = fish.angle;
    // Eyes use sub-linear scaling so they stay proportionally small on bigger fish
    // Real koi have tiny eyes relative to body size
    const eyeScale = Math.pow(fish.sizeMultiplier, 0.55);
    const headWidth = 3.3 * eyeScale;

    const leftEyeX = head.x + Math.cos(angle + 0.5) * headWidth;
    const leftEyeY = head.y + Math.sin(angle + 0.5) * headWidth;

    const rightEyeX = head.x + Math.cos(angle - 0.5) * headWidth;
    const rightEyeY = head.y + Math.sin(angle - 0.5) * headWidth;

    const r = 1.0 * eyeScale;

    let eyeStyle = '#070C12';
    let specStyle = '#FFFFFF';

    if (fish.type === 'yin') {
      eyeStyle = '#FAFAFA'; // White seed bead eyes representing spiritual presence
      specStyle = '#161618';
    } else if (fish.type === 'yang') {
      eyeStyle = '#161618'; // Obsidian black eyes in pure white body
      specStyle = '#FAFAFA';
    }

    // Left Eye
    ctx.save();
    ctx.fillStyle = eyeStyle;
    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, r * 1.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = specStyle;
    ctx.beginPath();
    ctx.arc(leftEyeX - 0.3, leftEyeY - 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right Eye
    ctx.save();
    ctx.fillStyle = eyeStyle;
    ctx.beginPath();
    ctx.arc(rightEyeX, rightEyeY, r * 1.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = specStyle;
    ctx.beginPath();
    ctx.arc(rightEyeX - 0.3, rightEyeY - 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const updateAndDrawPetals = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (!settings.cherryBlossoms) {
      petalsRef.current = [];
      return;
    }

    // Seed initial petals if none exist
    if (petalsRef.current.length === 0) {
      for (let i = 0; i < 16; i++) {
        petalsRef.current.push({
          id: `initial-petal-${i}-${Math.random()}`,
          x: Math.random() * w,
          y: Math.random() * h,
          angle: Math.random() * Math.PI * 2,
          speedX: 0.16 + Math.random() * 0.3,
          speedY: 0.12 + Math.random() * 0.25,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.008,
          scale: 0.55 + Math.random() * 0.45,
          opacity: 0.45 + Math.random() * 0.45,
        });
      }
    }

    // Spawn new drifting petals from the top or left edges at a calming, realistic rate
    if (petalsRef.current.length < 24 && Math.random() < 0.012) {
      const fromTop = Math.random() > 0.45;
      petalsRef.current.push({
        id: `sakura-petal-${timeRef.current}-${Math.random()}`,
        x: fromTop ? Math.random() * w : -15,
        y: fromTop ? -15 : Math.random() * (h * 0.7),
        angle: Math.random() * Math.PI * 2,
        speedX: 0.16 + Math.random() * 0.3,
        speedY: 0.12 + Math.random() * 0.25,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.008,
        scale: 0.55 + Math.random() * 0.45,
        opacity: 0.45 + Math.random() * 0.45,
      });
    }

    const nextPetals: CherryPetal[] = [];

    petalsRef.current.forEach(petal => {
      // 1. UPDATE PHYSICS
      // Drift organically in a soft down-right current
      petal.x += petal.speedX;
      petal.y += petal.speedY;
      
      // Fine-grained harmonic sway (leaves breeze sway signature)
      const sway = Math.sin(timeRef.current * 0.015 + petal.x * 0.005) * 0.14;
      petal.x += sway;

      // Gentle rotation change
      petal.rotation += petal.rotationSpeed;

      // Keep if within boundary plus breathing offset
      if (petal.x < w + 30 && petal.y < h + 30 && petal.x > -30 && petal.y > -30) {
        nextPetals.push(petal);

        // 2. DRAW PETAL FLOOR SHADOW FIRST (casts deep shadow on pool floor)
        ctx.save();
        ctx.translate(petal.x + 16, petal.y + 18); // 3D offset representation
        ctx.rotate(petal.rotation);
        ctx.scale(petal.scale * 0.88, petal.scale * 0.88);
        ctx.fillStyle = 'rgba(0, 0, 4, 0.06)'; // extremely soft bottom shadow
        drawPetalShape(ctx);
        ctx.restore();

        // 3. DRAW FLOATING PETAL
        ctx.save();
        ctx.translate(petal.x, petal.y);
        ctx.rotate(petal.rotation);
        ctx.scale(petal.scale, petal.scale);
        
        // Exquisite pink petal gradient
        const pGrad = ctx.createLinearGradient(-3, -3, 3, 3);
        pGrad.addColorStop(0, `rgba(255, 218, 224, ${petal.opacity})`); // highlight cherry tip
        pGrad.addColorStop(0.65, `rgba(254, 180, 196, ${petal.opacity})`);
        pGrad.addColorStop(1, `rgba(244, 143, 177, ${petal.opacity * 0.95})`); // deep rich pink base
        
        ctx.fillStyle = pGrad;
        drawPetalShape(ctx);
        ctx.restore();
      }
    });

    petalsRef.current = nextPetals;
  };

  const drawPetalShape = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.bezierCurveTo(3, -7, 6, -4, 3, 1);
    ctx.bezierCurveTo(1.5, 3.5, 0, 6.5, 0, 7.5);
    ctx.bezierCurveTo(0, 6.5, -1.5, 3.5, -3, 1);
    ctx.bezierCurveTo(-6, -4, -4, -7, 0, -4);
    ctx.closePath();
    ctx.fill();
  };

  const updateAndDrawTurtles = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
    const list = turtlesRef.current;
    
    list.forEach(turtle => {
      // 1. UPDATE PHYSICS & STATES
      turtle.stateTimer -= 1;
      
      const distToTarget = Math.hypot(turtle.targetX - turtle.x, turtle.targetY - turtle.y);
      
      if (turtle.stateTimer <= 0 || distToTarget < 25) {
        // Change state
        if (turtle.state === 'wandering') {
          // Change to resting
          turtle.state = Math.random() < 0.4 ? 'sleeping' : 'resting';
          turtle.stateTimer = 180 + Math.random() * 240;
          turtle.targetDepth = 0.3 + Math.random() * 0.45; // Sinks deeper to relax!
        } else {
          // Start wandering again
          turtle.state = 'wandering';
          turtle.stateTimer = 350 + Math.random() * 350;
          
          // Head towards a random lily pad or deep water
          const pads = lilyPadsRef.current;
          if (pads.length > 0 && Math.random() < 0.6) {
            const randomPad = pads[Math.floor(Math.random() * pads.length)];
            turtle.targetX = randomPad.x + (Math.random() - 0.5) * 80;
            turtle.targetY = randomPad.y + (Math.random() - 0.5) * 80;
          } else {
            turtle.targetX = 150 + Math.random() * (w - 300);
            turtle.targetY = 150 + Math.random() * (h - 300);
          }
          turtle.targetDepth = 0.08 + Math.random() * 0.14; // swims close to surface where it is visible
        }
      }

      // Smooth depth adjustment
      turtle.depth += (turtle.targetDepth - turtle.depth) * 0.025;

      // Leg / paddle animation cycle
      if (turtle.state === 'wandering') {
        turtle.speed = 0.28 * settings.koiSpeed;
        turtle.legSway += 0.085;
      } else {
        turtle.speed = 0.05 * settings.koiSpeed;
        turtle.legSway += 0.015; // sleepy breathing sway
      }

      // Steering logic
      if (turtle.state === 'wandering') {
        const targetAngle = Math.atan2(turtle.targetY - turtle.y, turtle.targetX - turtle.x);
        let angleDiff = targetAngle - turtle.angle;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        
        // Very slow turn rate to feel like a heavy turtle
        const turtleTurnSpeed = 0.018; 
        turtle.angle += Math.max(-turtleTurnSpeed, Math.min(turtleTurnSpeed, angleDiff));
      }

      // Move forward
      turtle.x += Math.cos(turtle.angle) * turtle.speed;
      turtle.y += Math.sin(turtle.angle) * turtle.speed;

      // Keep inside bounds
      turtle.x = Math.max(80, Math.min(w - 80, turtle.x));
      turtle.y = Math.max(80, Math.min(h - 80, turtle.y));

      // Emit soft, tiny swimming ripples when swimming near the surface!
      if (turtle.state === 'wandering' && turtle.depth < 0.25 && time % 68 === 0) {
        spawnSwimRipple(turtle.x, turtle.y, 24, 0.12);
      }

      // 2. DRAW SHADOWS FIRST (cast on background)
      const currentDepth = turtle.depth;
      const shadowDist = 1.0 - currentDepth * 0.6;
      const sdx = 12 * shadowDist;
      const sdy = 14 * shadowDist;

      ctx.save();
      ctx.translate(turtle.x + sdx, turtle.y + sdy);
      ctx.rotate(turtle.angle);
      const sScale = (1.0 - currentDepth * 0.18) * 0.95;
      ctx.scale(sScale, sScale);
      ctx.fillStyle = `rgba(0, 0, 4, ${0.05 + currentDepth * 0.09})`;

      // Render simple outline shape of turtle for shadow
      drawTurtleSilhoutte(ctx, turtle.size, turtle.legSway);
      ctx.fill();
      ctx.restore();

      // 3. DRAW BODY & CARAPACE WITH DEPTH PERSPECTIVE & MASTER FLOW FADING
      ctx.save(); // Master depth container for turtle
      ctx.globalAlpha = 1.0 - currentDepth * 0.42;

      ctx.translate(turtle.x, turtle.y);
      ctx.rotate(turtle.angle);
      const bScale = 1.0 - currentDepth * 0.18;
      ctx.scale(bScale, bScale);

      // Draw Head, legs and tail
      drawTurtleBody(ctx, turtle.size, turtle.legSway, turtle.state === 'sleeping');

      // Draw Shell (Carapace)
      drawTurtleShell(ctx, turtle.size);

      // Sinking depth tint overlay
      if (currentDepth > 0.05) {
        let tintColor = 'rgba(11, 22, 29, 0.44)';
        switch (settings.waterColor) {
          case 'deep_teal':
            tintColor = `rgba(3, 12, 17, ${0.08 + currentDepth * 0.54})`;
            break;
          case 'serene_blue':
            tintColor = `rgba(4, 11, 17, ${0.08 + currentDepth * 0.54})`;
            break;
          case 'moss_green':
            tintColor = `rgba(2, 10, 6, ${0.08 + currentDepth * 0.54})`;
            break;
          case 'dark_slate':
            tintColor = `rgba(6, 7, 8, ${0.08 + currentDepth * 0.54})`;
            break;
        }
        ctx.fillStyle = tintColor;
        // draw shell area to mask with a circular tint
        ctx.beginPath();
        ctx.ellipse(0, 0, turtle.size * 1.15, turtle.size * 0.95, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore(); // Restore master depth container
    });
  };

  const drawTurtleSilhoutte = (ctx: CanvasRenderingContext2D, size: number, legSway: number) => {
    ctx.beginPath();
    
    // Head
    ctx.ellipse(size * 1.15, 0, size * 0.35, size * 0.28, 0, 0, Math.PI * 2);

    // Front Left paddle
    const flAngle = -Math.PI / 4.4 + Math.sin(legSway) * 0.22;
    ctx.ellipse(size * 0.6, -size * 0.7, size * 0.45, size * 0.15, flAngle, 0, Math.PI * 2);

    // Front Right paddle
    const frAngle = Math.PI / 4.4 - Math.sin(legSway) * 0.22;
    ctx.ellipse(size * 0.6, size * 0.7, size * 0.45, size * 0.15, frAngle, 0, Math.PI * 2);

    // Rear Left paddle
    const rlAngle = -Math.PI / 1.4 - Math.sin(legSway) * 0.14;
    ctx.ellipse(-size * 0.6, -size * 0.6, size * 0.32, size * 0.12, rlAngle, 0, Math.PI * 2);

    // Rear Right paddle
    const rrAngle = Math.PI / 1.4 + Math.sin(legSway) * 0.14;
    ctx.ellipse(-size * 0.6, size * 0.6, size * 0.32, size * 0.12, rrAngle, 0, Math.PI * 2);

    // Tail
    ctx.moveTo(-size * 0.9, 0);
    ctx.lineTo(-size * 1.25, 0);
    ctx.lineTo(-size * 0.9, size * 0.12);
    ctx.closePath();

    // Carapace center shell
    ctx.ellipse(0, 0, size * 1.1, size * 0.9, 0, 0, Math.PI * 2);
  };

  const drawFlipper = (ctx: CanvasRenderingContext2D, size: number, legSway: number, isRight: boolean) => {
    ctx.save();
    const mult = isRight ? 1 : -1;
    // Translate out to shoulder pivot points
    ctx.translate(size * 0.42, mult * size * 0.48);
    const angleOffset = mult * (Math.PI / 4.8) - Math.sin(legSway) * 0.24 * mult;
    ctx.rotate(angleOffset);

    // Dynamic, deep glassy green membrane gradient
    const padGrad = ctx.createLinearGradient(0, 0, size * 0.52, mult * size * 0.18);
    padGrad.addColorStop(0, '#192807'); // Dark green shoulder connection
    padGrad.addColorStop(0.35, '#35511B');
    padGrad.addColorStop(0.72, 'rgba(135, 165, 45, 0.88)'); // Soft chartreuse skin
    padGrad.addColorStop(1, 'rgba(215, 185, 60, 0.08)'); // Wet, translucent membrane tips

    ctx.fillStyle = padGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // Draw fully sculpted graceful web-flipper shape (similar to pectoral fins)
    ctx.bezierCurveTo(
      size * 0.24, mult * size * 0.38,
      size * 0.56, mult * size * 0.42,
      size * 0.66, mult * size * 0.16
    );
    ctx.bezierCurveTo(
      size * 0.48, -mult * size * 0.1,
      size * 0.22, -mult * size * 0.04,
      0, 0
    );
    ctx.closePath();
    ctx.fill();

    // Silk golden outline stroke
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.38)';
    ctx.lineWidth = 0.75;
    ctx.stroke();

    // Luminous cartilaginous ray filaments inside flipper membrane
    ctx.strokeStyle = 'rgba(195, 235, 95, 0.24)';
    ctx.lineWidth = 0.45;
    const rayAngles = [0.06, 0.16, 0.26, 0.36];
    rayAngles.forEach(rad => {
      const adjustedRad = rad * mult;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(
        size * 0.36 * Math.cos(adjustedRad * 0.6), size * 0.25 * Math.sin(adjustedRad * 0.6),
        size * 0.58 * Math.cos(adjustedRad), size * 0.58 * Math.sin(adjustedRad)
      );
      ctx.stroke();
    });

    ctx.restore();
  };

  const drawRearFlipper = (ctx: CanvasRenderingContext2D, size: number, legSway: number, isRight: boolean) => {
    ctx.save();
    const mult = isRight ? 1 : -1;
    // Translate out to hip pivot points
    ctx.translate(-size * 0.45, mult * size * 0.42);
    const angleOffset = mult * (Math.PI / 1.45) + Math.sin(legSway) * 0.16 * mult;
    ctx.rotate(angleOffset);

    const padGrad = ctx.createLinearGradient(0, 0, size * 0.36, mult * size * 0.12);
    padGrad.addColorStop(0, '#192807');
    padGrad.addColorStop(0.5, '#2B3F18');
    padGrad.addColorStop(1, 'rgba(135, 165, 45, 0.34)');

    ctx.fillStyle = padGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      size * 0.16, mult * size * 0.28,
      size * 0.38, mult * size * 0.30,
      size * 0.44, mult * size * 0.12
    );
    ctx.bezierCurveTo(
      size * 0.30, -mult * size * 0.08,
      size * 0.14, -mult * size * 0.04,
      0, 0
    );
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.26)';
    ctx.lineWidth = 0.65;
    ctx.stroke();

    ctx.restore();
  };

  const drawTurtleBody = (ctx: CanvasRenderingContext2D, size: number, legSway: number, isSleeping: boolean) => {
    const oliveGreen = '#3B5323'; 
    const lightYellow = '#D4AF37'; 

    // 1. Draw paddles/flippers using matching high-fidelity ray rendering
    drawFlipper(ctx, size, legSway, false); // Front left
    drawFlipper(ctx, size, legSway, true);  // Front right
    drawRearFlipper(ctx, size, legSway, false); // Rear left
    drawRearFlipper(ctx, size, legSway, true);  // Rear right

    // Neck / Head
    ctx.fillStyle = '#2A3C17';
    ctx.beginPath();
    ctx.moveTo(size * 0.3, -size * 0.2);
    ctx.quadraticCurveTo(size * 0.9, -size * 0.15, size * 1.1, -size * 0.18);
    ctx.lineTo(size * 1.3, -size * 0.1);
    ctx.lineTo(size * 1.4, 0);
    ctx.lineTo(size * 1.3, size * 0.1);
    ctx.lineTo(size * 1.1, size * 0.18);
    ctx.quadraticCurveTo(size * 0.9, size * 0.15, size * 0.3, size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Round head cap
    ctx.fillStyle = oliveGreen;
    ctx.beginPath();
    ctx.ellipse(size * 1.18, 0, size * 0.32, size * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Elegant golden striped neck lines (magnificent detail!)
    ctx.strokeStyle = lightYellow;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(size * 0.6, -size * 0.08);
    ctx.lineTo(size * 1.05, -size * 0.08);
    ctx.moveTo(size * 0.55, 0);
    ctx.lineTo(size * 1.1, 0);
    ctx.moveTo(size * 0.6, size * 0.08);
    ctx.lineTo(size * 1.05, size * 0.08);
    ctx.stroke();

    // 2. Draw glassy, polished bead eyes with custom ambient topaz light reflection iris
    const leftEyeX = size * 1.25;
    const leftEyeY = -size * 0.15;
    const rightEyeX = size * 1.25;
    const rightEyeY = size * 0.15;
    const eyeR = size * 0.07;

    const drawGlassyEye = (ex: number, ey: number) => {
      ctx.save();
      ctx.translate(ex, ey);
      
      if (isSleeping) {
        // Sleep state slit
        ctx.strokeStyle = '#121C06';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, eyeR, Math.PI, 0, false);
        ctx.stroke();
      } else {
        // Luminous Golden Topaz Iris ring
        const irisGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, eyeR);
        irisGrad.addColorStop(0, '#FFE89E');  // core glow
        irisGrad.addColorStop(0.5, '#D4AF37'); // warm amber
        irisGrad.addColorStop(1, '#563E0B');   // deep outer ring
        
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
        ctx.fill();

        // Obsidian pupil inside
        ctx.fillStyle = '#080C02';
        ctx.beginPath();
        ctx.arc(0, 0, eyeR * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Elegant crisp white specular glint representing glassy moisture
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-eyeR * 0.25, -eyeR * 0.25, eyeR * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    drawGlassyEye(leftEyeX, leftEyeY);
    drawGlassyEye(rightEyeX, rightEyeY);

    // Tail
    ctx.fillStyle = '#223212';
    ctx.beginPath();
    ctx.moveTo(-size * 0.85, 0);
    ctx.lineTo(-size * 1.25, 0);
    ctx.lineTo(-size * 0.85, size * 0.1);
    ctx.closePath();
    ctx.fill();
  };

  const drawTurtleShell = (ctx: CanvasRenderingContext2D, size: number) => {
    // 1. Carapace master base radial gradient
    const shellGrad = ctx.createRadialGradient(-size * 0.2, -size * 0.2, size * 0.15, 0, 0, size * 1.15);
    shellGrad.addColorStop(0, '#6B8E23');   // olive drab green plate center highlight
    shellGrad.addColorStop(0.4, '#3A5212');  // mid moss emerald
    shellGrad.addColorStop(0.78, '#22320A'); // shade forest green
    shellGrad.addColorStop(1, '#111A05');    // deep core shadow edge

    ctx.fillStyle = shellGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.08, size * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();

    // Marginal outer shell plate rim border
    ctx.strokeStyle = 'rgba(195, 235, 95, 0.38)'; // gold-chartreuse rim highlight to match koi outlines
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 2. Beautiful individual plate scutes detailing with radial highlights
    ctx.strokeStyle = 'rgba(215, 255, 120, 0.24)';
    ctx.lineWidth = 1.0;

    const drawCarapaceScute = (cx: number, cy: number, w: number, h: number, rotateAngle = 0) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotateAngle);
      
      // Fine-art plate gradients
      const scuteGrad = ctx.createRadialGradient(-w * 0.25, -h * 0.25, 1, 0, 0, w * 1.1);
      scuteGrad.addColorStop(0, 'rgba(165, 215, 85, 0.42)'); // glowing growth plate concentric
      scuteGrad.addColorStop(0.55, 'rgba(45, 70, 15, 0.12)');
      scuteGrad.addColorStop(1, 'rgba(12, 22, 6, 0.55)');   // shadow groove
      ctx.fillStyle = scuteGrad;
      
      ctx.beginPath();
      ctx.moveTo(w * 0.5, -h);
      ctx.lineTo(w, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.lineTo(-w * 0.5, h);
      ctx.lineTo(-w, 0);
      ctx.lineTo(-w * 0.5, -h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    // Center vertebral line scutes
    const cw = size * 0.41;
    const ch = size * 0.27;
    drawCarapaceScute(0, 0, cw, ch);
    drawCarapaceScute(size * 0.47, 0, cw * 0.82, ch * 0.78);
    drawCarapaceScute(-size * 0.47, 0, cw * 0.82, ch * 0.78);

    // Lateral costal scutes
    drawCarapaceScute(size * 0.2, -size * 0.48, cw * 0.72, ch * 0.72, -Math.PI / 9);
    drawCarapaceScute(size * 0.2, size * 0.48, cw * 0.72, ch * 0.72, Math.PI / 9);
    drawCarapaceScute(-size * 0.2, -size * 0.48, cw * 0.72, ch * 0.72, Math.PI / 9);
    drawCarapaceScute(-size * 0.2, size * 0.48, cw * 0.72, ch * 0.72, -Math.PI / 9);

    // Marginal grooves on the outer rim
    ctx.strokeStyle = 'rgba(215, 185, 60, 0.24)';
    ctx.lineWidth = 0.8;
    const steps = 14;
    for (let i = 0; i < steps; i++) {
      const aStart = (i / steps) * Math.PI * 2;
      const aEnd = ((i + 0.85) / steps) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 1.11, size * 0.91, 0, aStart, aEnd);
      ctx.stroke();
    }

    // 3. Luxurious Wet Shell Glass reflection sheens!
    const sheenGrad = ctx.createLinearGradient(-size * 0.8, -size * 0.6, size * 0.6, size * 0.5);
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)'); // gloss highlights matching the glassy koi body shine
    sheenGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.05)');
    sheenGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = sheenGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.02, size * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();

    // Elegant sliver wet glaze arc
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.ellipse(-size * 0.35, -size * 0.35, size * 0.55, size * 0.25, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawHexagon = (ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) => {
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.5, cy - h);
    ctx.lineTo(cx + w, cy);
    ctx.lineTo(cx + w * 0.5, cy + h);
    ctx.lineTo(cx - w * 0.5, cy + h);
    ctx.lineTo(cx - w, cy);
    ctx.lineTo(cx - w * 0.5, cy - h);
    ctx.closePath();
    ctx.stroke();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-slate-950 shadow-2xl"
      onClick={(e) => handleInteraction(e.clientX, e.clientY)}
      onTouchStart={(e) => {
        if (e.touches && e.touches[0]) {
          handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      id="aquarium-pond-container"
    >
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.012)_0%,transparent_100%)] mix-blend-overlay" />
      <canvas ref={canvasRef} className="block w-full h-full animate-fade-in" id="koi-pond-canvas" />
    </div>
  );
};
