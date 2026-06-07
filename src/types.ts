export interface Vertebra {
  x: number;
  y: number;
}

export type FishState = 'wandering' | 'attracted_to_tap' | 'attracted_to_food' | 'gliding' | 'yinyang' | 'playful_sprint';

export interface KoiFish {
  id: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  targetX: number;
  targetY: number;
  maxSpeed: number;
  turnSpeed: number;
  color: string;
  accentColor: string; // markings color
  sizeMultiplier: number;
  vertebraeCount: number;
  vertebrae: Vertebra[];
  wiggleCycle: number;
  state: FishState;
  stateTimer: number;
  type: 'kohaku' | 'sanke' | 'tancho' | 'yamabuki' | 'shiro_utsuri' | 'showa' | 'asagi' | 'hi_utsuri' | 'ki_bekko' | 'beni_goi' | 'hajiro' | 'koromo' | 'sakura_pink' | 'tsuki_blue' | 'yin' | 'yang'; // classical + cosmic
  growthPoints?: number; // accumulated by eating
  targetFoodId?: string; // locked food target to prevent jitter
  depth?: number;        // water depth (0.0 = surface, 1.0 = bottom)
  targetDepth?: number;  // target water depth
}

export interface Ripple {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

export interface FoodPellet {
  id: string;
  x: number;
  y: number;
  targetY: number; // sinks to a depth or bottom
  speed: number;
  radius: number;
  isNibhled: boolean;
  nibblesRemaining: number;
}

export interface LilyPad {
  id: string;
  x: number;
  y: number;
  radius: number;
  angle: number;
  driftSpeedX: number;
  driftSpeedY: number;
  originalX: number;
  originalY: number;
}

export interface CherryPetal {
  id: string;
  x: number;
  y: number;
  angle: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  opacity: number;
}

export interface PondTurtle {
  id: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  targetX: number;
  targetY: number;
  size: number;
  legSway: number;
  depth: number;
  targetDepth: number;
  state: 'wandering' | 'resting' | 'sleeping';
  stateTimer: number;
}

export interface PondSettings {
  waterColor: 'deep_teal' | 'serene_blue' | 'moss_green' | 'dark_slate';
  fishCount: number;
  koiSpeed: number;
  feedingMode: boolean;
  ambientSound: boolean;
  cherryBlossoms: boolean;
  showStats: boolean;
  yinYangMode: boolean;
}
