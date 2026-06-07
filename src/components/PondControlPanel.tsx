import React from 'react';
import { PondSettings } from '../types';
import { Fish, Waves, Sliders, Flower, Eye, Info, RefreshCw, Compass } from 'lucide-react';

interface PondControlPanelProps {
  settings: PondSettings;
  setSettings: React.Dispatch<React.SetStateAction<PondSettings>>;
  stats: { fishCount: number; activeRipples: number; foodCount: number };
  onAddFish: () => void;
  onResetPond: () => void;
}

export const PondControlPanel: React.FC<PondControlPanelProps> = ({
  settings,
  setSettings,
  stats,
  onAddFish,
  onResetPond,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const updateSetting = <K extends keyof PondSettings>(key: K, value: PondSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2" id="pond-controls-wrapper">
      {/* Dynamic Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/10 bg-slate-900/85 text-slate-100 hover:text-white hover:bg-slate-900 shadow-lg backdrop-blur-md transition-all active:scale-95 text-xs font-medium"
        id="toggle-menu-btn"
      >
        <Sliders className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        <span>{isOpen ? 'Close Settings' : 'Settings'}</span>
      </button>

      {/* Main Glassmorphic Panel content with enter scaling animation */}
      {isOpen && (
        <div
          className="w-80 p-5 rounded-2xl border border-white/15 bg-slate-950/90 text-slate-200 shadow-2xl backdrop-blur-xl flex flex-col gap-5 text-xs select-none max-h-[85vh] overflow-y-auto"
          id="settings-content-card"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <div className="flex items-center gap-1.5 font-semibold text-white tracking-wide text-[13px]">
              <Compass className="w-4 h-4 text-cyan-400 stroke-[2.5]" />
              <span>Pond Customizer</span>
            </div>
          </div>

          {/* Interaction Mode Selection */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Tap Interaction</span>
            <div className="grid grid-cols-2 gap-2" id="interaction-mode-group">
              <button
                onClick={() => updateSetting('feedingMode', false)}
                className={`py-2 px-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                  !settings.feedingMode
                    ? 'bg-cyan-500/20 border-cyan-400 text-white font-medium shadow-[0_0_8px_rgba(34,211,238,0.15)]'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
                id="btn-ripple-mode"
              >
                <Waves className="w-3.5 h-3.5" />
                <span>Water Ripples</span>
              </button>
              <button
                onClick={() => updateSetting('feedingMode', true)}
                className={`py-2 px-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                  settings.feedingMode
                    ? 'bg-amber-500/20 border-amber-400 text-white font-medium shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
                id="btn-feed-mode"
              >
                <Fish className="w-3.5 h-3.5" />
                <span>Feed Koi</span>
              </button>
            </div>
          </div>

          {/* Water color pallet selection */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pond Water Palette</span>
            <div className="grid grid-cols-4 gap-1.5" id="water-colors-picker">
              {(['deep_teal', 'serene_blue', 'moss_green', 'dark_slate'] as const).map((color) => (
                <button
                  key={color}
                  onClick={() => updateSetting('waterColor', color)}
                  className={`h-9 rounded-lg border transition-all flex flex-col items-center justify-center relative ${
                    settings.waterColor === color
                      ? 'border-white ring-2 ring-white/10 shadow-lg scale-[1.03]'
                      : 'border-white/5 hover:border-white/20'
                  }`}
                  style={{
                    background:
                      color === 'deep_teal'
                        ? 'linear-gradient(135deg, #0F2B35, #051219)'
                        : color === 'serene_blue'
                        ? 'linear-gradient(135deg, #12263C, #060E18)'
                        : color === 'moss_green'
                        ? 'linear-gradient(135deg, #0E281F, #040F0A)'
                        : 'linear-gradient(135deg, #1E2022, #0C0E0F)',
                  }}
                  title={color.replace('_', ' ')}
                  id={`water-palette-${color}`}
                >
                  <span className="text-[9px] text-white/80 font-medium font-sans capitalize">
                    {color.split('_')[1]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Fish Count slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Koi Population</span>
              <span className="font-sans font-semibold text-slate-200">{settings.fishCount} fish</span>
            </div>
            <input
              type="range"
              min={1}
              max={24}
              value={settings.fishCount}
              onChange={(e) => updateSetting('fishCount', parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              id="slider-fish-count"
            />
          </div>

          {/* Physics parameters - Swimming speed multiplier */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Swimming Energy</span>
              <span className="font-sans font-semibold text-slate-200">{settings.koiSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.4}
              max={2.5}
              step={0.1}
              value={settings.koiSpeed}
              onChange={(e) => updateSetting('koiSpeed', parseFloat(e.target.value))}
              className="w-full accent-amber-400 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              id="slider-koi-speed"
            />
          </div>

          {/* Elements & Environment Toggles */}
          <div className="flex flex-col gap-3 border-t border-white/5 pt-3.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Environment Layers</span>

            {/* Cherry Blossom falling toggler */}
            <label className="flex items-center justify-between cursor-pointer py-0.5 group" id="label-toggle-cherry">
              <span className="flex items-center gap-2 text-slate-300 group-hover:text-white transition-colors">
                <Flower className="w-3.5 h-3.5 text-pink-400" />
                <span>Sakura Blossom Drifts</span>
              </span>
              <input
                type="checkbox"
                checked={settings.cherryBlossoms}
                onChange={(e) => updateSetting('cherryBlossoms', e.target.checked)}
                className="sr-only peer"
                id="checkbox-cherry"
              />
              <div className="w-8 h-4.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-pink-500 relative" />
            </label>

            {/* Live Stats dashboard toggler */}
            <label className="flex items-center justify-between cursor-pointer py-0.5 group" id="label-toggle-stats">
              <span className="flex items-center gap-2 text-slate-300 group-hover:text-white transition-colors">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Statistics overlay</span>
              </span>
              <input
                type="checkbox"
                checked={settings.showStats}
                onChange={(e) => updateSetting('showStats', e.target.checked)}
                className="sr-only peer"
                id="checkbox-stats"
              />
              <div className="w-8 h-4.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500 relative" />
            </label>

            {/* Yin-Yang Cultivation Toggler */}
            <label className="flex items-center justify-between cursor-pointer py-0.5 group" id="label-toggle-yinyang">
              <span className="flex items-center gap-2 text-slate-300 group-hover:text-white transition-colors">
                <Compass className="w-3.5 h-3.5 text-cyan-400 focus:animate-spin" />
                <span>Yin-Yang Cultivation</span>
              </span>
              <input
                type="checkbox"
                checked={settings.yinYangMode}
                onChange={(e) => updateSetting('yinYangMode', e.target.checked)}
                className="sr-only peer"
                id="checkbox-yinyang"
              />
              <div className="w-8 h-4.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-400 relative" />
            </label>
          </div>

          {/* Quick interactive utility buttons */}
          <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3.5" id="utility-buttons">
            <button
              onClick={onAddFish}
              className="py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 font-medium active:scale-95 transition-all text-[11px]"
              id="btn-quick-add-fish"
            >
              Add 1 Koi
            </button>
            <button
              onClick={onResetPond}
              className="py-1.5 rounded-lg border border-dashed border-red-500/20 bg-red-950/20 text-red-300 hover:bg-red-950/35 hover:text-red-200 font-medium active:scale-95 transition-all flex items-center justify-center gap-1.5 text-[11px]"
              id="btn-reset-pond"
            >
              <RefreshCw className="w-3 h-3 animate-pulse" />
              <span>Reset Pond</span>
            </button>
          </div>

          {/* Mini Info Disclaimer */}
          <div className="flex gap-2 items-start bg-cyan-950/30 border border-cyan-800/20 p-2.5 rounded-lg text-cyan-300 text-[10px] leading-relaxed">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-cyan-400 font-bold" />
            <p>
              Tap/click the water surface. Tap ripples draw and guide fish nearby. Switch to <strong>Feed Koi</strong> to drop sinking snacks!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
