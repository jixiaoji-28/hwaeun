
import React, { useRef, useState } from 'react';

interface HeroProps {
    onStart: () => void;
    onAbout: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStart, onAbout }) => {
  const [userImage, setUserImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePolaroidClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      
      {/* Hidden File Input for Polaroid Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*"
      />

      <div className="relative flex items-center justify-center w-full h-full">
        
        {/* 
            NAVIGATION - Pushed to FAR edges (Screen Left/Right)
            Matched Fonts and Border Alignment
            Responsive positioning and spacing
        */}
        <button 
            onClick={onAbout}
            className="absolute left-2 md:left-12 top-1/2 -translate-y-1/2 z-50 text-[#08303F] font-serif font-medium tracking-[0.2em] md:tracking-[0.4em] text-xs md:text-base hover:opacity-60 transition-opacity uppercase animate-fade-in vertical-text md:vertical-lr whitespace-nowrap border-l md:border-l-0 md:border-t border-[#08303F] pl-2 md:pl-0 md:pt-4"
            style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
        >
            About
        </button>

        <button 
            onClick={onStart}
            className="absolute right-2 md:right-12 top-1/2 -translate-y-1/2 z-50 text-[#08303F] font-serif font-medium tracking-[0.2em] md:tracking-[0.4em] text-xs md:text-base hover:opacity-60 transition-opacity uppercase animate-fade-in vertical-text md:vertical-rl whitespace-nowrap border-r md:border-r-0 md:border-b border-[#08303F] pr-2 md:pr-0 md:pb-4"
            style={{ animationDelay: '1s', animationFillMode: 'both' }}
        >
            Hwaeun
        </button>

        {/* 
            CENTER PIECE 
            Metaphor: Sketch (Input) -> Cassette (Process) -> Music (Output)
            Responsive Container: Scale with Viewport Width
            Added max-height to fit landscape mobile screens
        */}
        <div className="relative z-10 flex flex-col items-center transition-transform duration-500 scale-100 md:scale-110">
            
            {/* Visual Container - Adjusted max-height for better fit */}
            <div className="relative w-[85vw] max-w-[400px] md:max-w-[600px] lg:max-w-[700px] aspect-[4/6] max-h-[80vh] flex items-center justify-center">
                
                {/* Expanded viewBox to prevent clipping of top script and bottom notes */}
                <svg viewBox="-50 -180 600 950" className="absolute inset-0 w-full h-full drop-shadow-2xl overflow-visible">
                    <defs>
                        {/* High-End Metallic Gradient for Main Title */}
                        <linearGradient id="mainTitleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#08303F" />
                            <stop offset="40%" stopColor="#2c4c5b" />
                            <stop offset="60%" stopColor="#08303F" />
                            <stop offset="100%" stopColor="#0f172a" />
                        </linearGradient>

                        {/* Gold Gradient for Script */}
                        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#F4D35E" />
                            <stop offset="100%" stopColor="#C7B299" />
                        </linearGradient>

                        {/* 
                            WEAVE MASK 
                            Defines which parts of the "Hwaeun" script sit ON TOP of the Main Title.
                            White = Visible (On Top), Black = Hidden (Goes Behind).
                        */}
                        <mask id="weaveMask">
                            {/* Start hidden (Behind) */}
                            <rect x="-400" y="-400" width="1200" height="1200" fill="black" />
                            
                            {/* Reveal the start loop (H) */}
                            <circle cx="-100" cy="100" r="150" fill="white" filter="url(#softEdge)" />
                            
                            {/* Reveal the end tail (n) */}
                            <rect x="200" y="0" width="200" height="300" fill="white" filter="url(#softEdge)" />
                            
                            {/* Reveal random crossing strokes for weaving effect */}
                            <path d="M 0 100 Q 150 150 300 100" stroke="white" strokeWidth="40" fill="none" />
                        </mask>

                        {/* 
                            CLIP PATH FOR PAPER
                            Ensures the paper disappears inside the cassette body (bottom y=530 global)
                            and doesn't exit from the bottom.
                            Paper Group Y = 200.
                            Clip Limit Y = 530 - 200 = 330.
                            We clip everything > 330.
                        */}
                        <clipPath id="paperClip">
                             <rect x="-200" y="-1000" width="1000" height="1330" />
                        </clipPath>
                        
                        <filter id="softEdge">
                             <feGaussianBlur stdDeviation="10" />
                        </filter>

                        {/* Animations */}
                        <style>{`
                            @keyframes spin-reel {
                                from { transform: rotate(0deg); }
                                to { transform: rotate(360deg); }
                            }
                            
                            /* 
                                FEED-IN ANIMATION UPDATE:
                                Starts from ABOVE the cassette (negative Y) and slides DOWN into it.
                                Global Cassette Y starts at 250. Paper Group Y is 200.
                                translateY(-180) -> global Y = 20 (Way above cassette)
                                translateY(150) -> global Y = 350 (Inside cassette body)
                            */
                            @keyframes feed-in {
                                0% { transform: translateY(-180px); opacity: 0; }
                                10% { opacity: 1; }
                                50% { transform: translateY(150px); opacity: 1; } /* Reaches inside */
                                55% { opacity: 0; }
                                100% { transform: translateY(150px); opacity: 0; }
                            }

                            /* Notes fall DOWN out of cassette BOTTOM */
                            /* Adjusted start point to align with bottom of cassette (y=530) */
                            @keyframes float-down-out {
                                0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
                                20% { opacity: 1; }
                                100% { transform: translate(0, 200px) scale(1.5) rotate(10deg); opacity: 0; }
                            }
                            
                            .tape-reel { animation: spin-reel 8s linear infinite; }
                            
                            .animate-feed {
                                animation: feed-in 6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
                            }
                            
                            /* 
                                Delays adjusted: 
                                Feed-in takes ~3s to reach inside (50% of 6s).
                                Notes start delayed at 3.5s to ensure paper is 'processed' first.
                                Added opacity: 0 to ensure they are hidden during the delay.
                            */
                            .note-1 { animation: float-down-out 6s linear infinite; animation-delay: 3.5s; opacity: 0; }
                            .note-2 { animation: float-down-out 6s linear infinite; animation-delay: 4.0s; opacity: 0; }
                            .note-3 { animation: float-down-out 6s linear infinite; animation-delay: 4.5s; opacity: 0; }
                        `}</style>
                    </defs>

                    {/* 
                        LAYER 1: OUTPUT NOTES
                        Animates: Bottom of Cassette -> Down
                        Positioned at y=530 (Bottom edge of Cassette)
                        Centered at x=250
                    */}
                    <g transform="translate(250, 530)">
                        <g className="note-1" transform="translate(-60, 0)">
                            <path d="M 10 10 L 10 40 Q 10 50 0 50 Q -10 50 -10 40 Q -10 30 0 30 L 0 10 L 10 10" fill="#F4D35E" stroke="#08303F" strokeWidth="2" />
                        </g>
                        <g className="note-2" transform="translate(0, 0)">
                            <path d="M 10 0 L 10 30 Q 10 40 0 40 Q -10 40 -10 30 Q -10 20 0 20 L 0 0 L 30 0 L 30 30 Q 30 40 20 40 Q 10 40 10 30 L 10 0" fill="#08303F" stroke="#F4D35E" strokeWidth="2" />
                        </g>
                        <g className="note-3" transform="translate(60, 0)">
                            <path d="M 10 10 L 10 40 Q 10 50 0 50 Q -10 50 -10 40 Q -10 30 0 30 L 0 10 L 10 10" fill="#F4D35E" stroke="#08303F" strokeWidth="2" />
                        </g>
                    </g>

                    {/* 
                        LAYER 2: INPUT SKETCH (Doodle Collage)
                        Animates: Starts from ABOVE -> Down into Cassette body
                        Z-Index: Behind Cassette Body
                        Positioned centered horizontally (135) and vertically at 200
                        
                        Wrapped in a positioning group to ensure centering.
                        Added ClipPath to hide paper when it reaches the bottom of the cassette.
                    */}
                    <g transform="translate(135, 200)" clipPath="url(#paperClip)">
                        <g className="animate-feed">
                            {/* Grey Base Sheet */}
                            <rect x="0" y="0" width="230" height="280" fill="#6d5e53" stroke="none" rx="2" className="shadow-sm" />
                            
                            {/* DOODLE COLLAGE CONTENT */}
                            <g transform="scale(0.85) translate(15, 15)">
                                
                                {/* 1. CLOUD WITH STARS - Top Left */}
                                <g transform="translate(15, 15)">
                                    {/* Cloud Outline */}
                                    <path d="M 10 25 Q 15 5 35 10 Q 45 0 60 10 Q 75 5 85 20 Q 95 25 90 40 Q 95 50 85 55 Q 65 60 40 55 Q 20 60 15 45 Q 0 40 10 25" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
                                    {/* Stars inside */}
                                    <g transform="translate(25, 25) scale(0.6)"><path d="M 5 0 L 6 4 L 10 4 L 7 6 L 8 10 L 5 7 L 2 10 L 3 6 L 0 4 L 4 4 Z" fill="#FDE047" stroke="none"/></g>
                                    <g transform="translate(50, 20) scale(0.6)"><path d="M 5 0 L 6 4 L 10 4 L 7 6 L 8 10 L 5 7 L 2 10 L 3 6 L 0 4 L 4 4 Z" fill="#FDE047" stroke="none"/></g>
                                    <g transform="translate(65, 35) scale(0.6)"><path d="M 5 0 L 6 4 L 10 4 L 7 6 L 8 10 L 5 7 L 2 10 L 3 6 L 0 4 L 4 4 Z" fill="#FDE047" stroke="none"/></g>
                                </g>

                                {/* 2. MOON - Top Right */}
                                <g transform="translate(150, 10)">
                                    <path d="M 30 5 C 30 5 45 15 45 35 C 45 55 30 65 30 65 C 50 60 60 45 60 35 C 60 20 50 10 30 5 Z" fill="none" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" />
                                    {/* Dots */}
                                    <circle cx="45" cy="25" r="2" fill="#C084FC" />
                                    <circle cx="40" cy="40" r="2" fill="#C084FC" />
                                    <circle cx="50" cy="50" r="2" fill="#C084FC" />
                                </g>

                                {/* 3. BIG STAR - Center */}
                                <g transform="translate(65, 80)">
                                    {/* Star Outline */}
                                    <path d="M 50 5 L 65 40 L 100 40 L 70 65 L 80 100 L 50 75 L 20 100 L 30 65 L 0 40 L 35 40 Z" fill="none" stroke="#F472B6" strokeWidth="2.5" strokeLinejoin="round" />
                                    {/* Crosses inside */}
                                    <g transform="translate(35, 55)"><path d="M 5 0 V 10 M 0 5 H 10" stroke="#86EFAC" strokeWidth="2" strokeLinecap="round"/></g>
                                    <g transform="translate(65, 55)"><path d="M 5 0 V 10 M 0 5 H 10" stroke="#86EFAC" strokeWidth="2" strokeLinecap="round"/></g>
                                    <g transform="translate(50, 35)"><path d="M 5 0 V 10 M 0 5 H 10" stroke="#86EFAC" strokeWidth="2" strokeLinecap="round"/></g>
                                    <g transform="translate(50, 75)"><path d="M 5 0 V 10 M 0 5 H 10" stroke="#86EFAC" strokeWidth="2" strokeLinecap="round"/></g>
                                </g>

                                {/* 4. HOUSE - Bottom Left */}
                                <g transform="translate(25, 180)">
                                    <path d="M 5 40 L 35 10 L 65 40 V 85 H 5 V 40 Z" fill="none" stroke="#86EFAC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    {/* Window */}
                                    <rect x="25" y="50" width="20" height="20" fill="none" stroke="#60A5FA" strokeWidth="2.5" />
                                    <line x1="35" y1="50" x2="35" y2="70" stroke="#60A5FA" strokeWidth="1.5" />
                                    <line x1="25" y1="60" x2="45" y2="60" stroke="#60A5FA" strokeWidth="1.5" />
                                </g>

                                {/* 5. ARCHED WINDOW - Bottom Right */}
                                <g transform="translate(140, 180)">
                                    <path d="M 0 40 C 0 10 10 0 35 0 C 60 0 70 10 70 40 V 70 H 0 V 40 Z" fill="none" stroke="#C084FC" strokeWidth="2.5" strokeLinecap="round" />
                                    <line x1="35" y1="0" x2="35" y2="70" stroke="#C084FC" strokeWidth="2" />
                                    {/* Moon inside */}
                                    <g transform="translate(10, 15) scale(0.4)">
                                        <path d="M 15 0 C 15 0 25 10 25 25 C 25 40 15 50 15 50 C 35 45 45 35 45 25 C 45 15 35 5 15 0 Z" fill="#FDE047" />
                                    </g>
                                    {/* Star inside */}
                                    <g transform="translate(45, 40) scale(0.4)">
                                        <path d="M 10 0 L 12 8 L 20 8 L 14 12 L 16 20 L 10 14 L 4 20 L 6 12 L 0 8 L 8 8 Z" fill="#60A5FA" />
                                    </g>
                                </g>
                                
                            </g>
                        </g>
                    </g>

                    {/* 
                        LAYER 3: CASSETTE TAPE (The Processor)
                        Position adjusted DOWN to y=250
                        Centered at x=250
                        Z-Index: Front (Hides the bottom of the paper)
                    */}
                    <g transform="translate(-10, 250)">
                        {/* Main Shell - Widescreen Rect */}
                        <rect x="0" y="0" width="520" height="280" rx="12" fill="#FDFCF8" stroke="#08303F" strokeWidth="3" />
                        
                        {/* Vintage Aging Texture overlay on shell */}
                        <rect x="0" y="0" width="520" height="280" rx="12" fill="#eaddcf" opacity="0.3" style={{mixBlendMode: 'multiply'}} />

                        {/* Inner Bevel - Detailed */}
                        <rect x="10" y="10" width="500" height="260" rx="8" fill="none" stroke="#08303F" strokeWidth="1" opacity="0.5" />
                        
                        {/* Horizontal Texture Ridges */}
                        <g opacity="0.15">
                            {[...Array(5)].map((_, i) => <line key={`t${i}`} x1="20" y1={20 + i*4} x2="500" y2={20 + i*4} stroke="#08303F" strokeWidth="1" />)}
                            {[...Array(5)].map((_, i) => <line key={`b${i}`} x1="20" y1={240 + i*4} x2="500" y2={240 + i*4} stroke="#08303F" strokeWidth="1" />)}
                        </g>

                        {/* Screws - Rusty/Vintage */}
                        {[
                        [25, 25], [260, 20], [495, 25],
                        [25, 255], [260, 260], [495, 255]
                        ].map(([cx, cy], i) => (
                        <g key={i} transform={`translate(${cx}, ${cy})`}>
                            <circle r="4" fill="#d1d5db" stroke="#08303F" strokeWidth="1" />
                            <path d="M-2.5 -2.5 L2.5 2.5 M-2.5 2.5 L2.5 -2.5" stroke="#08303F" strokeWidth="1" opacity="0.7"/>
                        </g>
                        ))}

                        {/* Label Area - Vintage Yellowed Paper */}
                        <g transform="translate(50, 45)">
                            <path d="M 0 0 H 420 V 130 H 0 V 0 M 115 40 A 40 40 0 1 0 115 120 H 305 A 40 40 0 1 0 305 40 Z" fill="#f0e6d2" stroke="#08303F" strokeWidth="1.5" fillRule="evenodd" />
                            
                            {/* Label Grunge */}
                            <path d="M 0 0 H 420 V 130 H 0 V 0 M 115 40 A 40 40 0 1 0 115 120 H 305 A 40 40 0 1 0 305 40 Z" fill="url(#dotPattern)" opacity="0.1" fillRule="evenodd" style={{mixBlendMode: 'multiply'}} />
                            
                            <rect x="0" y="15" width="420" height="25" fill="#08303F" opacity="0.15" />
                            <line x1="0" y1="115" x2="420" y2="115" stroke="#08303F" strokeWidth="2" />
                            
                            {/* Updated Label Text - Reduced Font Size */}
                            <text x="210" y="100" fontFamily="Oswald" fontSize="20" fill="#08303F" textAnchor="middle" fontWeight="bold" letterSpacing="2">CTP431</text>
                            <text x="210" y="32" fontFamily="Oswald" fontSize="12" fill="#08303F" textAnchor="middle" letterSpacing="4" opacity="0.8">COLORS TO CHORDS</text>
                            
                            <text x="20" y="32" fontFamily="Oswald" fontSize="14" fill="#08303F">SIDE A</text>
                            <text x="400" y="32" fontFamily="Oswald" fontSize="14" fill="#08303F" textAnchor="end">70μs EQ</text>
                        </g>

                        {/* Window & Reels */}
                        <g transform="translate(130, 80)">
                            {/* TRANSPARENT WINDOW to show paper feeding through behind */}
                            <rect x="0" y="0" width="260" height="90" rx="4" fill="rgba(255,255,255,0.2)" stroke="#08303F" strokeWidth="2" />
                            
                            {/* Tape Spool 1 */}
                            <g className="tape-reel" style={{transformOrigin: '65px 45px'}}>
                                <circle cx="65" cy="45" r="28" fill="#333" stroke="#08303F" strokeWidth="1" />
                                {/* Tape remaining */}
                                <circle cx="65" cy="45" r="24" fill="#5C7081" stroke="none" opacity="0.8" />
                                {[...Array(6)].map((_,i) => (
                                    <path key={i} d="M 65 45 L 65 20" stroke="white" strokeWidth="2" transform={`rotate(${i*60} 65 45)`} />
                                ))}
                                <circle cx="65" cy="45" r="6" fill="white" stroke="#08303F" strokeWidth="1.5" />
                            </g>
                            
                            {/* Tape Spool 2 */}
                            <g className="tape-reel" style={{transformOrigin: '195px 45px'}}>
                                <circle cx="195" cy="45" r="28" fill="#333" stroke="#08303F" strokeWidth="1" />
                                {/* Tape remaining (less) */}
                                <circle cx="195" cy="45" r="18" fill="#5C7081" stroke="none" opacity="0.8" />
                                {[...Array(6)].map((_,i) => (
                                    <path key={i} d="M 195 45 L 195 20" stroke="white" strokeWidth="2" transform={`rotate(${i*60} 195 45)`} />
                                ))}
                                <circle cx="195" cy="45" r="6" fill="white" stroke="#08303F" strokeWidth="1.5" />
                            </g>
                            <path d="M 95 45 A 35 35 0 0 1 165 45" fill="none" stroke="#08303F" strokeWidth="0.5" />
                        </g>

                        {/* Head Mechanism - Rusty */}
                        <path d="M 40 280 L 60 200 L 460 200 L 480 280" fill="#d1d5db" stroke="#08303F" strokeWidth="2" opacity="0.8" />
                        <g transform="translate(70, 205)">
                            <rect x="30" y="55" width="320" height="20" fill="#3f3f3f" stroke="#08303F" strokeWidth="1" />
                            <rect x="160" y="10" width="60" height="40" fill="#e5e5e5" stroke="#08303F" strokeWidth="1.5" />
                            <rect x="175" y="20" width="30" height="20" fill="#334155" rx="2" />
                            <circle cx="60" cy="45" r="8" fill="#f3f4f6" stroke="#08303F" strokeWidth="2" />
                            <circle cx="320" cy="45" r="8" fill="#f3f4f6" stroke="#08303F" strokeWidth="2" />
                        </g>
                    </g>

                    {/* 
                        LAYER 4: MAIN TITLE (Interlaced Composition)
                        Position adjusted UP to y=50 for more spacing
                        Z-Index: Highest
                        Centered at x=250
                    */}
                    <g transform="translate(250, 50)">
                        
                        {/* --- Layer 4.1: SCRIPT BEHIND (Dark Shadow) --- */}
                        <g transform="translate(0, 10) scale(1.2, 1)">
                             <text x="0" y="0" textAnchor="middle" fontFamily="Mrs Saint Delafield" fontSize="260" fill="black" opacity="0.3" style={{filter: 'blur(4px)'}}>Hwaeun</text>
                             <text x="0" y="0" textAnchor="middle" fontFamily="Mrs Saint Delafield" fontSize="260" fill="#08303F" opacity="0.8">Hwaeun</text>
                        </g>

                        {/* --- Layer 4.2: MAIN TITLE (Solid Songti with Halftone Gradient) --- */}
                        <g>
                            {/* 3D Deep Shadow */}
                            <text x="6" y="6" textAnchor="middle" dominantBaseline="middle" fontFamily="'Noto Serif SC', 'Songti SC', serif" fontWeight="bold" fontSize="280" fill="#000" opacity="0.2" style={{ filter: 'blur(4px)' }}>画音</text>
                            
                            {/* Main Face: Solid Blue masked with Halftone */}
                            <text 
                                x="0" y="0" 
                                textAnchor="middle" 
                                dominantBaseline="middle" 
                                fontFamily="'Noto Serif SC', 'Songti SC', serif"
                                fontWeight="bold" 
                                fontSize="280" 
                                fill="#08303F" 
                                mask="url(#halftoneMask)"
                                style={{ filter: 'url(#rough-ink)' }}
                                className="drop-shadow-sm"
                            >
                                画音
                            </text>
                        </g>

                        {/* --- Layer 4.3: SCRIPT IN FRONT (Weave Interlace) --- */}
                        <g transform="translate(0, 10) scale(1.2, 1)">
                            {/* White Outline/Halo for clean cut */}
                            <text x="0" y="0" textAnchor="middle" fontFamily="Mrs Saint Delafield" fontSize="260" stroke="white" strokeWidth="12" strokeLinejoin="round" opacity="1" mask="url(#weaveMask)">Hwaeun</text>
                            
                            {/* Gold Text Top */}
                            <text x="0" y="0" textAnchor="middle" fontFamily="Mrs Saint Delafield" fontSize="260" fill="url(#goldGradient)" mask="url(#weaveMask)" className="drop-shadow-md">Hwaeun</text>
                            
                            {/* Shine Overlay */}
                            <text x="0" y="0" textAnchor="middle" fontFamily="Mrs Saint Delafield" fontSize="260" fill="white" mask="url(#weaveMask)" opacity="0.2" className="mix-blend-overlay">Hwaeun</text>
                        </g>
                    </g>

                </svg>
            </div>

            {/* SLOGAN - Closer to Cassette, Handwritten, Replaced English */}
            <div className="-mt-28 z-20 overflow-hidden text-center relative w-full px-4">
                <p 
                    className="font-korean text-xl md:text-3xl text-[#08303F] opacity-0 animate-fade-in-up"
                     style={{ animationDelay: '1.5s', animationFillMode: 'forwards' }}
                >
                    그림이 소리가 되는 순간
                </p>
            </div>
        </div>

      </div>
      
       <style>{`
        @keyframes type-reveal {
            from { width: 0; }
            to { width: 100%; }
        }
        .animate-type-reveal {
            overflow: hidden;
            white-space: nowrap;
            animation: type-reveal 1.5s steps(20, end) forwards;
            animation-delay: 1s;
            width: 0;
        }
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in {
            opacity: 0;
            animation: fade-in 1s ease-out forwards;
        }
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Hero;
