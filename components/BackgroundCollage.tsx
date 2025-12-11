
import React from 'react';
import { AppState } from '../types';

interface Sticker {
  id: number;
  type: 'house_blue' | 'house_yellow' | 'cloud_layer' | 'bear_torn' | 'rain_torn' | 'umbrella_torn' | 'tree_torn' | 'calendar_torn' | 'heart_torn' | 'bunny_torn';
  x: number; // percentage
  y: number; // percentage
  scale: number;
  rotation: number;
}

interface BackgroundCollageProps {
  appState: AppState;
}

// Blue & Yellow Palette
const COLORS = {
  blueDark: '#08303F',
  blueMid: '#5C7081',
  blueLight: '#A2D2FF',
  yellow: '#F4D35E',
  yellowLight: '#FFF7B1',
  paper: '#FDFCF0',
  redAccent: '#FF9AA2' // Subtle accent for hearts/details
};

const BackgroundCollage: React.FC<BackgroundCollageProps> = ({ appState }) => {
  
  // Randomly scattered "Torn Paper Wallpaper"
  // Logic: Balanced distribution, no clustering of same types.
  const stickers: Sticker[] = [
    // --- TOP LEFT ---
    { id: 1, type: 'cloud_layer', x: 5, y: 8, scale: 1.1, rotation: 0 },
    { id: 2, type: 'umbrella_torn', x: 15, y: 15, scale: 1.0, rotation: 15 },
    { id: 3, type: 'heart_torn', x: 25, y: 8, scale: 0.8, rotation: -10 },
    
    // --- TOP RIGHT ---
    { id: 4, type: 'calendar_torn', x: 85, y: 10, scale: 1.0, rotation: 5 },
    { id: 5, type: 'bunny_torn', x: 75, y: 15, scale: 0.9, rotation: -5 },
    { id: 6, type: 'rain_torn', x: 92, y: 22, scale: 0.6, rotation: 10 },

    // --- MID LEFT ---
    { id: 7, type: 'tree_torn', x: 4, y: 40, scale: 1.2, rotation: 2 },
    { id: 8, type: 'house_blue', x: 12, y: 55, scale: 0.9, rotation: -5 },
    { id: 9, type: 'rain_torn', x: 20, y: 35, scale: 0.7, rotation: 20 },

    // --- MID RIGHT ---
    { id: 10, type: 'bear_torn', x: 92, y: 45, scale: 1.0, rotation: -10 },
    { id: 11, type: 'heart_torn', x: 82, y: 55, scale: 0.9, rotation: 15 },
    { id: 12, type: 'cloud_layer', x: 88, y: 65, scale: 0.8, rotation: 0 },
    
    // --- BOTTOM LEFT ---
    { id: 13, type: 'house_yellow', x: 8, y: 82, scale: 1.1, rotation: 2 },
    { id: 14, type: 'bunny_torn', x: 20, y: 88, scale: 0.9, rotation: -15 },
    { id: 15, type: 'rain_torn', x: 15, y: 70, scale: 0.6, rotation: -10 },

    // --- BOTTOM RIGHT ---
    { id: 16, type: 'tree_torn', x: 80, y: 80, scale: 1.1, rotation: -3 },
    { id: 17, type: 'umbrella_torn', x: 90, y: 88, scale: 0.9, rotation: 10 },
    { id: 18, type: 'rain_torn', x: 72, y: 75, scale: 0.7, rotation: 5 },
  ];

  const isVisible = appState === AppState.DRAWING;

  if (!isVisible) return null;

  const renderSvg = (type: string) => {
    // Common Filter ID for torn edges
    const filterUrl = "url(#torn-paper-edge)";

    switch (type) {
      case 'house_blue':
      case 'house_yellow':
        const hColor = type === 'house_blue' ? COLORS.blueMid : COLORS.yellow;
        const roofColor = type === 'house_blue' ? COLORS.blueDark : COLORS.yellowLight;
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-md">
             <path d="M 10 40 L 50 10 L 90 40 L 85 45 L 15 45 Z" fill={roofColor} filter={filterUrl} />
             <rect x="20" y="45" width="60" height="50" fill={hColor} filter={filterUrl} />
             <rect x="40" y="65" width="20" height="30" fill={COLORS.paper} filter={filterUrl} opacity="0.8" />
             <rect x="30" y="55" width="10" height="10" fill={COLORS.paper} filter={filterUrl} opacity="0.6" />
             <rect x="60" y="55" width="10" height="10" fill={COLORS.paper} filter={filterUrl} opacity="0.6" />
          </svg>
        );
      
      case 'bear_torn':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-md">
            <circle cx="25" cy="30" r="15" fill={COLORS.blueMid} filter={filterUrl} />
            <circle cx="75" cy="30" r="15" fill={COLORS.blueMid} filter={filterUrl} />
            <circle cx="50" cy="55" r="35" fill={COLORS.blueLight} filter={filterUrl} />
            <ellipse cx="50" cy="65" rx="15" ry="12" fill={COLORS.paper} filter={filterUrl} opacity="0.9" />
            <circle cx="40" cy="50" r="3" fill={COLORS.blueDark} />
            <circle cx="60" cy="50" r="3" fill={COLORS.blueDark} />
            <ellipse cx="50" cy="62" rx="5" ry="3" fill={COLORS.blueDark} />
          </svg>
        );

      case 'bunny_torn':
        return (
          <svg viewBox="0 0 100 120" className="w-full h-full overflow-visible drop-shadow-md">
             {/* Ears */}
             <ellipse cx="35" cy="30" rx="10" ry="25" fill={COLORS.yellowLight} filter={filterUrl} transform="rotate(-10 35 30)" />
             <ellipse cx="65" cy="30" rx="10" ry="25" fill={COLORS.yellowLight} filter={filterUrl} transform="rotate(10 65 30)" />
             {/* Head */}
             <circle cx="50" cy="60" r="30" fill={COLORS.paper} filter={filterUrl} />
             {/* Face */}
             <circle cx="40" cy="55" r="2" fill={COLORS.blueDark} />
             <circle cx="60" cy="55" r="2" fill={COLORS.blueDark} />
             <path d="M 45 65 Q 50 70 55 65" fill="none" stroke={COLORS.blueDark} strokeWidth="1.5" />
          </svg>
        );

      case 'heart_torn':
         return (
             <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-md">
                 <path d="M 50 85 Q 10 55 10 30 Q 10 10 35 10 Q 50 10 50 30 Q 50 10 65 10 Q 90 10 90 30 Q 90 55 50 85 Z" fill={COLORS.blueLight} filter={filterUrl} />
                 <path d="M 55 80 Q 20 55 20 35 Q 20 20 40 20 Q 55 20 55 35" fill="none" stroke={COLORS.paper} strokeWidth="2" opacity="0.5" filter={filterUrl} />
             </svg>
         );

      case 'cloud_layer':
        return (
           <svg viewBox="0 0 120 80" className="w-full h-full overflow-visible drop-shadow-sm">
              <path d="M 10 50 Q 20 20 50 30 Q 70 10 90 30 Q 110 30 110 50 Q 110 70 80 70 L 30 70 Q 10 70 10 50 Z" fill="white" filter={filterUrl} opacity="0.9" />
              <path d="M 20 55 Q 30 35 50 40 Q 60 30 80 40 Q 90 40 90 55" fill={COLORS.yellowLight} filter={filterUrl} opacity="0.5" transform="translate(5, 5)" />
           </svg>
        );

      case 'rain_torn':
         return (
             <svg viewBox="0 0 50 80" className="w-full h-full overflow-visible drop-shadow-sm">
                 <path d="M 25 5 Q 5 50 25 75 Q 45 50 25 5 Z" fill={COLORS.blueLight} filter={filterUrl} />
             </svg>
         );

      case 'umbrella_torn':
          return (
              <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-md">
                  {/* Handle (J Shape) */}
                  <path d="M 50 20 V 75 Q 50 85 60 85" fill="none" stroke={COLORS.yellow} strokeWidth="4" strokeLinecap="round" />
                  {/* Canopy (Scalloped) */}
                  <path d="M 10 50 Q 50 0 90 50 L 90 50 Q 70 40 50 50 Q 30 40 10 50 Z" fill={COLORS.blueDark} filter={filterUrl} />
                  {/* Stripes */}
                  <path d="M 50 50 L 50 15" fill="none" stroke={COLORS.paper} strokeWidth="1" opacity="0.3" filter={filterUrl} />
              </svg>
          );

      case 'tree_torn':
          return (
              <svg viewBox="0 0 80 120" className="w-full h-full overflow-visible drop-shadow-md">
                  {/* Trunk */}
                  <path d="M 35 110 L 38 80 L 42 80 L 45 110 Z" fill={COLORS.blueMid} filter={filterUrl} />
                  {/* Foliage Layers */}
                  <path d="M 10 90 L 40 50 L 70 90 Z" fill={COLORS.blueLight} filter={filterUrl} transform="translate(0, -10)" />
                  <path d="M 15 70 L 40 30 L 65 70 Z" fill={COLORS.blueLight} filter={filterUrl} transform="translate(0, -5)" />
                  <path d="M 20 50 L 40 10 L 60 50 Z" fill={COLORS.blueLight} filter={filterUrl} />
                  {/* Snow/Light Highlight */}
                  <path d="M 40 10 L 50 40 L 30 40 Z" fill={COLORS.paper} opacity="0.3" filter={filterUrl} />
              </svg>
          );

      case 'calendar_torn':
          return (
              <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-md">
                  {/* Paper Base */}
                  <rect x="15" y="15" width="70" height="80" fill={COLORS.paper} filter={filterUrl} />
                  {/* Header */}
                  <rect x="15" y="15" width="70" height="25" fill={COLORS.blueDark} filter={filterUrl} />
                  <text x="50" y="32" fontSize="10" textAnchor="middle" fill="white" fontFamily="sans-serif">OCT</text>
                  {/* Spiral Binding */}
                  {[20, 30, 40, 50, 60, 70, 80].map(cx => (
                      <circle key={cx} cx={cx} cy="15" r="2" fill="#333" />
                  ))}
                  {[20, 30, 40, 50, 60, 70, 80].map(cx => (
                      <path key={cx} d={`M ${cx} 12 L ${cx} 25`} stroke="#ccc" strokeWidth="1" />
                  ))}
                  {/* Grid */}
                  <g transform="translate(20, 45)">
                     <rect x="0" y="0" width="10" height="8" fill="#ddd" />
                     <rect x="15" y="0" width="10" height="8" fill="#ddd" />
                     <rect x="30" y="0" width="10" height="8" fill="#ddd" />
                     <rect x="45" y="0" width="10" height="8" fill="#ddd" />
                     
                     <rect x="0" y="12" width="10" height="8" fill="#ddd" />
                     <rect x="15" y="12" width="10" height="8" fill={COLORS.yellow} />
                     <rect x="30" y="12" width="10" height="8" fill="#ddd" />
                  </g>
              </svg>
          );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
      
      {/* 
        TEXTURED OFF-WHITE PAPER CANVAS BASE 
      */}
      <div className="absolute inset-0 bg-[#FDFCF0] opacity-80 mix-blend-overlay"></div>
      <div className="absolute inset-0 opacity-20 bg-noise"></div>

      {/* SVG FILTERS DEFINITION */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          {/* Torn Paper Edge Filter */}
          <filter id="torn-paper-edge" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
            <feComposite operator="in" in="SourceGraphic" in2="noise" result="textured" />
          </filter>
        </defs>
      </svg>

      {stickers.map((s) => (
        <div
          key={s.id}
          className="absolute"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            // Responsive Size Calculation using vmin for adaptability
            width: s.type === 'rain_torn' ? '8vmin' : '15vmin',
            height: s.type === 'rain_torn' ? '12vmin' : (s.type === 'tree_torn' ? '18vmin' : '15vmin'),
            transform: `rotate(${s.rotation}deg) scale(${s.scale})`,
            zIndex: 0
          }}
        >
          {renderSvg(s.type)}
        </div>
      ))}
    </div>
  );
};

export default BackgroundCollage;
