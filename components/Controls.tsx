
import React, { useRef, useState, useEffect } from 'react';
import { AudioSettings } from '../types';
import { audioService } from '../services/audioService';

interface ControlsProps {
  settings: AudioSettings;
  updateSettings: (key: keyof AudioSettings, value: any) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
  trackName?: string;
}

// Custom Vertical Fader Component for 1:1 Mouse Tracking
const Fader: React.FC<{
    value: number;
    min: number;
    max: number;
    label: string;
    onChange: (val: number) => void;
    step?: number;
}> = ({ value, min, max, label, onChange, step = 0.01 }) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const calculateValue = (clientY: number) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        
        const distFromBottom = rect.bottom - clientY;
        const height = rect.height;
        
        let percent = distFromBottom / height;
        percent = Math.max(0, Math.min(1, percent));
        
        const rawValue = min + percent * (max - min);
        
        const steppedValue = Math.round(rawValue / step) * step;
        const finalValue = Math.max(min, Math.min(max, steppedValue));
        
        onChange(finalValue);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        calculateValue(e.clientY);
        audioService.playSFX('switch');
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        calculateValue(e.clientY);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
        audioService.playSFX('click');
    };

    const visualPercent = ((value - min) / (max - min)) * 100;

    return (
        <div className="flex flex-col items-center gap-3 group select-none touch-none">
            {/* Fader Track */}
            <div 
                ref={trackRef}
                className="relative h-24 md:h-32 w-6 md:w-8 bg-[#111] rounded-lg shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] border border-gray-700 cursor-ns-resize"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {/* Center Groove */}
                <div className="absolute left-1/2 top-2 bottom-2 w-[2px] bg-[#222] -translate-x-1/2 rounded-full"></div>
                
                {/* Ruler Markings */}
                <div className="absolute right-0 top-2 bottom-2 w-2 flex flex-col justify-between opacity-30 pointer-events-none">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-1.5 h-[1px] bg-gray-400"></div>
                    ))}
                </div>

                {/* Fader Cap */}
                <div 
                    className={`absolute left-1/2 -translate-x-1/2 w-5 md:w-6 h-8 md:h-10 border border-gray-600 rounded-sm shadow-[0_4px_6px_rgba(0,0,0,0.5)] transition-colors duration-75 pointer-events-none
                        ${isDragging ? 'bg-gray-400' : 'bg-gradient-to-b from-gray-500 to-gray-700'}
                    `}
                    style={{ 
                        bottom: `${visualPercent}%`,
                        transform: 'translate(-50%, 50%)'
                    }}
                >
                    <div className={`w-full h-[2px] mt-[50%] ${isDragging ? 'bg-macaron-yellow shadow-[0_0_5px_#F4D35E]' : 'bg-white/50'}`}></div>
                </div>
            </div>
            
            {/* Label */}
            <span className={`font-poster text-[8px] md:text-[10px] tracking-widest transition-colors ${isDragging ? 'text-macaron-yellow' : 'text-gray-400'}`}>
                {label}
            </span>
        </div>
    );
};


const Controls: React.FC<ControlsProps> = ({ settings, updateSettings, isPlaying, onPlayToggle, trackName }) => {
  const handlePlayClick = () => {
      onPlayToggle();
  };

  const handleMoodChange = (mood: 'calm' | 'energetic' | 'melancholic' | 'lofi') => {
      audioService.playSFX('click');
      updateSettings('musicStyle', mood);
  };

  const toggleAmbience = (type: 'vinylNoise' | 'rainNoise') => {
      audioService.playSFX('switch');
      updateSettings(type, !settings[type]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 md:mt-12 relative pb-8 md:pb-12">
      
      {/* Studio Rack Unit Container */}
      <div className="bg-[#1a1a1a] border-t-2 border-b-2 border-gray-700 shadow-2xl relative rounded-sm overflow-hidden">
         
         {/* Rack Ears (Hidden on Mobile) */}
         <div className="absolute top-1/2 left-4 -translate-y-1/2 hidden md:flex flex-col gap-12">
            <div className="w-3 h-3 rounded-full bg-[#333] border border-gray-500 shadow-inner flex items-center justify-center"><div className="w-1.5 h-1.5 bg-[#111] rounded-full"></div></div>
            <div className="w-3 h-3 rounded-full bg-[#333] border border-gray-500 shadow-inner flex items-center justify-center"><div className="w-1.5 h-1.5 bg-[#111] rounded-full"></div></div>
         </div>
         <div className="absolute top-1/2 right-4 -translate-y-1/2 hidden md:flex flex-col gap-12">
            <div className="w-3 h-3 rounded-full bg-[#333] border border-gray-500 shadow-inner flex items-center justify-center"><div className="w-1.5 h-1.5 bg-[#111] rounded-full"></div></div>
            <div className="w-3 h-3 rounded-full bg-[#333] border border-gray-500 shadow-inner flex items-center justify-center"><div className="w-1.5 h-1.5 bg-[#111] rounded-full"></div></div>
         </div>

         {/* MAIN PANEL CONTENT */}
         <div className="px-4 py-4 md:px-12 md:py-8 flex flex-col gap-6 md:gap-8 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a]">
            
            {/* TOP ROW: DISPLAY & TRANSPORT */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-10 items-center w-full">
                {/* Transport */}
                <div className="flex flex-row md:flex-col items-center gap-4 md:gap-2">
                    <button
                        id ="play-button" 
                        onClick={handlePlayClick}
                        className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-4 flex items-center justify-center text-xl transition-all shadow-[0_4px_10px_rgba(0,0,0,0.5)] active:translate-y-[2px] active:shadow-none ${isPlaying ? 'border-[#A2D2FF] bg-[#08303F] text-[#A2D2FF] shadow-[0_0_15px_#A2D2FF]' : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-400 hover:text-white'}`}
                    >
                        {isPlaying ? '■' : '▶'}
                    </button>
                    <span className="text-[10px] font-poster tracking-widest text-gray-500 uppercase hidden md:block">{isPlaying ? 'Playing' : 'Stopped'}</span>
                </div>

                {/* VFD Display */}
                <div className="flex-1 w-full bg-[#0a0a0a] border border-gray-700 rounded p-3 md:p-4 relative shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_2px,3px_100%]"></div>
                    <div className="flex justify-between items-end border-b border-gray-800 pb-2 mb-2">
                        <span className="font-mono text-[8px] md:text-xs text-teal-700/50">STYLE: {settings.musicStyle.toUpperCase()}</span>
                        <span className="font-mono text-[8px] md:text-xs text-teal-700/50">44.1kHz</span>
                    </div>
                    <div className="font-mono text-base md:text-2xl text-teal-400 glow-text truncate tracking-widest">
                        {trackName || "NO DISC INSERTED"}
                    </div>
                    <div className="mt-2 flex gap-1 overflow-hidden">
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className={`h-1.5 md:h-2 w-1 rounded-sm flex-shrink-0 ${isPlaying ? (i < 12 ? 'bg-teal-500 animate-pulse' : 'bg-gray-800') : 'bg-gray-800'}`} style={{ animationDelay: `${i * 0.05}s` }}></div>
                        ))}
                    </div>
                    <style>{`.glow-text { text-shadow: 0 0 5px rgba(45, 212, 191, 0.5); }`}</style>
                </div>
            </div>

            {/* BOTTOM ROW: MOODS & AMBIENCE & FX */}
            <div className="flex flex-col md:flex-row w-full gap-6 md:gap-8 border-t border-white/5 pt-4 md:pt-6">
                
                <div className="flex flex-row justify-between w-full md:w-auto md:flex-1 gap-4">
                    {/* 1. MOOD SELECTORS */}
                    <div className="flex flex-col gap-2 flex-1">
                        <span className="text-[8px] md:text-[10px] font-poster tracking-widest text-gray-500 uppercase mb-1 md:mb-2">MUSIC STYLE</span>
                        <div className="grid grid-cols-2 gap-2">
                            {['calm', 'energetic', 'melancholic', 'lofi'].map((m) => (
                                <button
                                    key={m}
                                    onClick={() => handleMoodChange(m as any)}
                                    className={`px-1 py-2 md:px-2 text-[9px] md:text-xs uppercase font-bold tracking-wider rounded border border-white/10 transition-all ${settings.musicStyle === m ? 'bg-teal-900/50 text-teal-300 border-teal-500/50 shadow-[0_0_10px_rgba(20,184,166,0.2)]' : 'bg-[#222] text-gray-500 hover:bg-[#333]'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2. AMBIENCE TOGGLES */}
                    <div className="flex flex-col gap-2">
                        <span className="text-[8px] md:text-[10px] font-poster tracking-widest text-gray-500 uppercase mb-1 md:mb-2">AMBIENCE</span>
                        <div className="flex gap-2 md:gap-4">
                            <button onClick={() => toggleAmbience('vinylNoise')} className="flex flex-col items-center gap-2 group">
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center transition-all ${settings.vinylNoise ? 'border-yellow-500 bg-yellow-900/20 shadow-[0_0_8px_orange]' : 'border-gray-600 bg-[#111]'}`}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={settings.vinylNoise ? 'text-yellow-500 animate-spin-slow' : 'text-gray-600'}>
                                        <circle cx="12" cy="12" r="10"/>
                                        <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                </div>
                            </button>
                            <button onClick={() => toggleAmbience('rainNoise')} className="flex flex-col items-center gap-2 group">
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center transition-all ${settings.rainNoise ? 'border-blue-400 bg-blue-900/20 shadow-[0_0_8px_blue]' : 'border-gray-600 bg-[#111]'}`}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={settings.rainNoise ? 'text-blue-400' : 'text-gray-600'}>
                                        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
                                        <path d="M16 14v6"/>
                                        <path d="M8 14v6"/>
                                        <path d="M12 16v6"/>
                                    </svg>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. FX FADERS */}
                <div className="flex gap-4 md:gap-6 items-end justify-between md:justify-end flex-1 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                    <Fader 
                        label="WAH" 
                        value={settings.wahwah} 
                        min={0} 
                        max={100} 
                        onChange={(v) => updateSettings('wahwah', v)} 
                    />
                    <Fader 
                        label="DIST" 
                        value={settings.distortion} 
                        min={0} 
                        max={100} 
                        onChange={(v) => updateSettings('distortion', v)} 
                    />
                    <Fader 
                        label="VOL" 
                        value={settings.volume} 
                        min={0} 
                        max={1} 
                        step={0.01}
                        onChange={(v) => updateSettings('volume', v)} 
                    />
                </div>

            </div>

         </div>

         {/* Bottom Plate */}
         <div className="h-2 bg-[#222] border-t border-gray-600"></div>
      </div>
    </div>
  );
};

export default Controls;
