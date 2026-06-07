import React, { useState, useEffect } from 'react';
import { PondCanvas } from './components/PondCanvas';
import { PondControlPanel } from './components/PondControlPanel';
import { PondSettings } from './types';
import { Fish, Waves, CircleDot, RefreshCw, Compass } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<PondSettings>(() => {
    try {
      const saved = localStorage.getItem('pond_settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not load saved settings', e);
    }
    return {
      waterColor: 'serene_blue',
      fishCount: 24,
      koiSpeed: 1.0,
      feedingMode: false,
      ambientSound: false,
      cherryBlossoms: true,
      showStats: true,
      yinYangMode: false,
    };
  });

  const [stats, setStats] = useState({
    fishCount: 24,
    activeRipples: 0,
    foodCount: 0,
  });

  const [localTimeStr, setLocalTimeStr] = useState('');

  // Save settings on change
  useEffect(() => {
    try {
      localStorage.setItem('pond_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save settings', e);
    }
  }, [settings]);

  // Clean ambient clock simulating a cozy tea house status
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setLocalTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Quick action helpers routed directly to the canvas ref simulation arrays
  const handleAddFish = () => {
    setSettings(prev => ({
      ...prev,
      fishCount: Math.min(prev.fishCount + 1, 24),
    }));
  };

  const handleResetPond = () => {
    try {
      localStorage.removeItem('pond_fish_state');
      localStorage.removeItem('pond_turtle_state');
    } catch (e) {
      console.error(e);
    }
    setSettings(prev => ({
      ...prev,
      fishCount: 24,
      koiSpeed: 1.0,
      waterColor: 'serene_blue',
      feedingMode: false,
      cherryBlossoms: true,
      yinYangMode: false,
    }));
  };

  return (
    <div
      className="relative w-screen h-screen bg-slate-950 font-sans text-slate-100 flex flex-col justify-center items-center overflow-hidden p-3 md:p-6"
      id="root-viewport-container"
    >
      {/* Decorative Outer Slate Grid Frame representing dry gravel border */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Main Core View Area */}
      <div className="relative w-full h-full max-w-6xl aspect-[4/3] md:aspect-[16/10] flex flex-col gap-3 rounded-2xl" id="content-pond-frame">
        {/* Minimal Zen Interactive Top Header Overlay */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none" id="decorative-tea-header">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] animate-pulse" />
            <h1 className="text-sm font-semibold tracking-widest text-slate-100 uppercase font-sans">
              Koi Meditative Pond
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 font-sans tracking-wide">
            A fluid, bending-vertebrae bio-mimicry water sanctuary
          </p>
        </div>

        {/* Live Simulation Canvas Card */}
        <div className="relative w-full h-full flex-grow overflow-hidden" id="simulation-canvas-card">
          <PondCanvas settings={settings} onStatsUpdate={setStats} />

          {/* Settings overlays */}
          <PondControlPanel
            settings={settings}
            setSettings={setSettings}
            stats={stats}
            onAddFish={handleAddFish}
            onResetPond={handleResetPond}
          />

          {/* Minimal Bottom Zen HUD Status Panel */}
          {settings.showStats && (
            <div
              className="absolute bottom-4 left-4 z-10 p-3.5 rounded-xl border border-white/5 bg-slate-950/75 text-[10px] text-slate-400 font-mono tracking-wider flex items-center gap-5 shadow-lg backdrop-blur-md"
              id="live-telemetry-hud"
            >
              <div className="flex items-center gap-1.5" id="telemetry-timer">
                <span className="text-slate-500 font-sans text-[8px] uppercase tracking-widest leading-none">Local Time</span>
                <span className="text-slate-200 font-semibold text-[11px] font-mono leading-none">{localTimeStr}</span>
              </div>

              <div className="h-4 w-[1px] bg-white/10" />

              <div className="flex items-center gap-1.5" id="telemetry-population">
                <Fish className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-200 font-semibold font-mono">{stats.fishCount} Koi</span>
              </div>

              <div className="flex items-center gap-1.5" id="telemetry-ripples">
                <Waves className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-slate-200 font-semibold font-mono">{stats.activeRipples} Active Waves</span>
              </div>

              {stats.foodCount > 0 && (
                <div className="flex items-center gap-1.5" id="telemetry-pellets">
                  <CircleDot className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-amber-300 font-semibold font-mono">{stats.foodCount} Snacks</span>
                </div>
              )}
            </div>
          )}

          {/* Feed Interaction Mode Prompt Overlay on bottom edge */}
          <div
            className="absolute bottom-4 right-4 z-10 py-1.5 px-3 rounded-xl border border-white/5 bg-slate-950/60 backdrop-blur-md text-[9px] font-medium tracking-wide flex items-center gap-2 pointer-events-none text-slate-400"
            id="interaction-prompt-indicator"
          >
            <span>Current Interaction:</span>
            <span className={`px-1.5 py-0.5 rounded uppercase text-[8px] font-extrabold ${settings.feedingMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'}`}>
              {settings.feedingMode ? 'Feeding Mode' : 'Wave Ripples'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
