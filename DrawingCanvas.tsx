
import React, { useRef, useState, useEffect } from 'react';
import { MusicRecommendation } from '../types';
import { audioService } from '../services/audioService';

interface DrawingCanvasProps {
  onExport: (base64: string) => void;
  isPlaying: boolean;
  recommendation?: MusicRecommendation | null;
  isAnalyzing?: boolean;
  onPlayToggle?: () => void;
}

type ToolType = 'pencil' | 'line' | 'rect' | 'circle' | 'eraser' | 'stamp';

// Clip Art / Stamps List
const STAMPS = ['★', '♥', '✿', '☁', '✂', '♪', '⚡', '☺', '☂', '☾'];

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onExport, isPlaying, recommendation, isAnalyzing, onPlayToggle }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mutable Drawing State (Refs for performance/synchronicity)
  const isDrawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const snapshot = useRef<ImageData | null>(null);

  // UI State
  const [color, setColor] = useState('#08303F'); // Default Deep Blue
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<ToolType>('pencil');
  const [selectedStamp, setSelectedStamp] = useState(STAMPS[0]);
  
  // History
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Constants for Vintage Look
  const PAPER_COLOR = '#Fdfdfd';

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
       audioService.stop();
    };
  }, []);

  // Initialize Canvas Size with ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        
        // Save current content
        let tempCanvas: HTMLCanvasElement | null = null;
        if (canvas.width > 0 && canvas.height > 0) {
            tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx?.drawImage(canvas, 0, 0);
        }

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // Restore content or fill white
            if (tempCanvas) {
                ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
            } else {
                ctx.fillStyle = PAPER_COLOR; 
                ctx.fillRect(0, 0, rect.width, rect.height);
                // Initial history
                if (historyStep === -1) {
                    const initialUrl = canvas.toDataURL();
                    setHistory([initialUrl]);
                    setHistoryStep(0);
                }
            }
        }
    };

    const observer = new ResizeObserver(() => {
        // Debounce slightly to prevent thrashing
        requestAnimationFrame(() => resizeCanvas());
    });
    observer.observe(container);
    resizeCanvas(); // Initial call

    return () => observer.disconnect();
  }, []); // Run once on mount, but observer handles updates

  const restoreCanvasState = (dataUrl: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = canvas.width / dpr;
        const logicalHeight = canvas.height / dpr;
        
        ctx.clearRect(0, 0, logicalWidth, logicalHeight);
        ctx.drawImage(img, 0, 0, logicalWidth, logicalHeight);
      };
    }
  };

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const newHistory = history.slice(0, historyStep + 1);
      newHistory.push(dataUrl);
      if (newHistory.length > 20) newHistory.shift();
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
      onExport(dataUrl);
    }
  };

  const handleUndo = () => {
    audioService.playSFX('paper'); // SFX
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      restoreCanvasState(history[newStep]);
      onExport(history[newStep]);
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const rect = canvas.getBoundingClientRect();
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const configureContext = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
    
    // Artistic effect
    if (tool === 'pencil' || tool === 'line' || tool === 'rect' || tool === 'circle') {
       ctx.shadowColor = color;
       ctx.shadowBlur = 0.5;
    }

    if (tool === 'eraser') {
        ctx.strokeStyle = PAPER_COLOR;
        ctx.fillStyle = PAPER_COLOR;
        ctx.shadowBlur = 0;
    } 
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);

    if (tool === 'stamp') {
        audioService.playSFX('stamp'); // SFX
        ctx.font = `${lineWidth * 10 + 20}px 'Gaegu'`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(selectedStamp, x, y);
        saveToHistory();
        return;
    }

    startPos.current = { x, y };
    isDrawing.current = true;
    snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    configureContext(ctx);
    ctx.beginPath();
    ctx.moveTo(x, y);

    if (tool === 'pencil' || tool === 'eraser') {
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault();
    if (!isDrawing.current) return;
    if (tool === 'stamp') return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);

    if (tool === 'pencil' || tool === 'eraser') {
        configureContext(ctx); 
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    } else {
        if (snapshot.current) {
            ctx.putImageData(snapshot.current, 0, 0);
        }
        configureContext(ctx);
        ctx.beginPath();
        
        if (tool === 'line') {
            ctx.moveTo(startPos.current.x, startPos.current.y);
            ctx.lineTo(x, y);
            ctx.stroke();
        } else if (tool === 'rect') {
            const w = x - startPos.current.x;
            const h = y - startPos.current.y;
            ctx.strokeRect(startPos.current.x, startPos.current.y, w, h);
        } else if (tool === 'circle') {
            const radius = Math.sqrt(Math.pow(x - startPos.current.x, 2) + Math.pow(y - startPos.current.y, 2));
            ctx.arc(startPos.current.x, startPos.current.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }
  };

  const stopDrawing = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      saveToHistory();
    }
  };

  const clearCanvas = () => {
    audioService.playSFX('paper'); // SFX
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.fillStyle = PAPER_COLOR;
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      saveToHistory();
    }
  };

  const colors = [
    '#08303F', '#5C7081', '#A2D2FF', '#FFFFFF', '#000000', 
    '#B5EAD7', '#FF9AA2', '#FFDAC1', '#FFF7B1', '#C7B299',
    '#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#808080'
  ];

  const handleToolClick = (t: ToolType) => {
    audioService.playSFX('switch'); // SFX
    setTool(t);
  };

  const handleColorClick = (c: string) => {
      audioService.playSFX('click'); // SFX
      setColor(c); 
      if(tool==='eraser') setTool('pencil');
  };

  const handleStampSelect = (s: string) => {
      audioService.playSFX('click'); // SFX
      setSelectedStamp(s);
  };

  return (
    <div className="w-full max-w-6xl mx-auto select-none flex flex-col items-center">
      
      {/* 
        STUDIO CONTAINER
      */}
      <div className="relative bg-[#08303F] p-2 md:p-8 rounded-sm shadow-2xl w-full flex flex-col items-center overflow-hidden border-t border-white/10">
        
        {/* Loading Overlay */}
        {isAnalyzing && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1a1a1a]/95 backdrop-blur-md transition-all duration-500 animate-in fade-in">
                <div className="relative w-48 h-48 md:w-64 md:h-64 mb-8">
                    <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                        <defs>
                            <radialGradient id="vinylGrad" cx="0.5" cy="0.5" r="0.5">
                                <stop offset="0%" stopColor="#222" />
                                <stop offset="80%" stopColor="#111" />
                                <stop offset="100%" stopColor="#000" />
                            </radialGradient>
                            <linearGradient id="armGrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#ccc" />
                                <stop offset="100%" stopColor="#888" />
                            </linearGradient>
                        </defs>
                        <circle cx="100" cy="100" r="95" fill="#333" stroke="#444" strokeWidth="2" />
                        <g className="animate-spin-slow origin-center">
                            <circle cx="100" cy="100" r="90" fill="url(#vinylGrad)" />
                            {[85, 80, 75, 70, 65, 60, 55].map(r => (
                                <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#222" strokeWidth="1" />
                            ))}
                            <path d="M 100 10 A 90 90 0 0 1 190 100" fill="none" stroke="white" strokeWidth="15" opacity="0.05" />
                            <circle cx="100" cy="100" r="30" fill="#F4D35E" />
                            <circle cx="100" cy="100" r="3" fill="#fff" />
                            <text x="100" y="90" fontSize="8" textAnchor="middle" fontFamily="Oswald" fill="#08303F" fontWeight="bold">LOADING</text>
                        </g>
                        <g style={{ transformOrigin: '180px 20px' }} className="animate-[arm-move_1s_ease-out_forwards]">
                            <style>{`
                                @keyframes arm-move {
                                    0% { transform: rotate(-35deg); }
                                    100% { transform: rotate(15deg); }
                                }
                            `}</style>
                            <circle cx="180" cy="20" r="10" fill="#888" stroke="#555" />
                            <path d="M 180 20 L 130 130 L 110 120" fill="none" stroke="url(#armGrad)" strokeWidth="6" strokeLinecap="round" />
                            <rect x="100" y="110" width="15" height="25" fill="#222" transform="rotate(20 110 120)" />
                        </g>
                    </svg>
                </div>
                <div className="flex flex-col items-center gap-3">
                    <p className="font-poster text-xl md:text-2xl tracking-[0.3em] text-[#F4D35E] animate-pulse glow-text">PRESSING VINYL...</p>
                    <p className="font-serif text-white/50 text-xs md:text-sm italic tracking-widest">Analyzing Harmony & Rhythm</p>
                </div>
            </div>
        )}

        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#5C7081 1px, transparent 1px), linear-gradient(90deg, #5C7081 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        {/* TOP BAR: Tools */}
        <div className="relative z-10 w-full flex flex-col md:flex-row justify-between items-center mb-4 md:mb-8 pb-4 border-b border-white/20 gap-4">
             <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <span className="font-poster text-white tracking-[0.2em] text-sm md:text-lg">CD DESIGN STUDIO</span>
                <span className="font-korean text-retro-blue-light text-xs md:text-sm">Create booklet • Play music</span>
             </div>

             <div className="flex flex-wrap justify-center gap-2 items-center bg-[#05202a] px-3 py-2 rounded-full border border-white/10">
                <button onClick={() => handleToolClick('pencil')} className={`text-white p-1 md:p-2 hover:text-macaron-yellow transition-colors ${tool === 'pencil' ? 'text-macaron-yellow scale-110' : ''}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
                <button onClick={() => handleToolClick('line')} className={`text-white p-1 md:p-2 hover:text-macaron-yellow transition-colors ${tool === 'line' ? 'text-macaron-yellow scale-110' : ''}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"/></svg></button>
                <button onClick={() => handleToolClick('rect')} className={`text-white p-1 md:p-2 hover:text-macaron-yellow transition-colors ${tool === 'rect' ? 'text-macaron-yellow scale-110' : ''}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg></button>
                <button onClick={() => handleToolClick('circle')} className={`text-white p-1 md:p-2 hover:text-macaron-yellow transition-colors ${tool === 'circle' ? 'text-macaron-yellow scale-110' : ''}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg></button>
                <button onClick={() => handleToolClick('stamp')} className={`text-white p-1 md:p-2 hover:text-macaron-yellow transition-colors ${tool === 'stamp' ? 'text-macaron-yellow scale-110' : ''}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12Z"/></svg></button>
                <div className="w-px h-4 bg-white/20 mx-1"></div>
                <button onClick={() => handleToolClick('eraser')} className={`text-white p-1 md:p-2 hover:text-red-300 transition-colors ${tool === 'eraser' ? 'text-red-400 scale-110' : ''}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg></button>
             </div>

             <div className="flex gap-2 md:gap-3">
                 <button onClick={handleUndo} className="px-3 py-1 text-xs md:text-sm font-poster text-white border border-white/30 hover:bg-white/10 uppercase tracking-wider">Undo</button>
                 <button onClick={clearCanvas} className="px-3 py-1 text-xs md:text-sm font-poster text-white border border-white/30 hover:bg-red-500/20 hover:text-red-200 uppercase tracking-wider">Clear</button>
             </div>
        </div>

        {tool === 'stamp' && (
            <div className="relative z-10 mb-4 flex gap-2 bg-white/10 p-2 rounded-lg animate-in fade-in slide-in-from-top-2 overflow-x-auto max-w-full no-scrollbar">
                {STAMPS.map(s => (
                    <button key={s} onClick={() => handleStampSelect(s)} className={`w-8 h-8 flex-shrink-0 flex items-center justify-center text-white hover:bg-white/20 rounded ${selectedStamp === s ? 'bg-macaron-yellow text-black' : ''}`}>
                        {s}
                    </button>
                ))}
            </div>
        )}

        {/* 
            CD JEWEL CASE WORKSPACE
            Responsive Layout: 
            - Mobile: Stacked (Canvas Top, CD Bottom)
            - Tablet/Desktop: Side-by-Side Spread
        */}
        <div className="relative z-10 w-full max-w-[800px] md:aspect-[2/1] bg-transparent flex justify-center items-center py-2 md:py-4">
            
            {/* OUTER CASE CONTAINER */}
            <div className="flex flex-col md:flex-row w-full h-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden bg-white/5 backdrop-blur-sm border border-white/20">

                {/* --- LEFT PANEL: FRONT COVER (BOOKLET / DRAWING) --- */}
                {/* On mobile: full width, fixed height to ensure drawability */}
                <div className="w-full md:w-1/2 h-[350px] md:h-full relative bg-transparent border-b md:border-b-0 md:border-r border-white/10 shrink-0">
                     
                     {/* The Paper Booklet (CANVAS) */}
                     <div 
                        ref={containerRef}
                        className="absolute inset-[4px] md:inset-[6px] bg-white shadow-md overflow-hidden group"
                     >
                        <canvas
                            ref={canvasRef}
                            className="block w-full h-full cursor-crosshair touch-none"
                            style={{ touchAction: 'none' }}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                        <div className="absolute inset-0 pointer-events-none bg-paper-texture opacity-20 mix-blend-multiply"></div>
                     </div>

                     <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/10 via-transparent to-black/5 rounded-l-sm"></div>
                </div>

                {/* --- SPINE / HINGE AREA --- */}
                {/* Horizontal on mobile, Vertical on desktop */}
                <div className="w-full md:w-[12px] h-[12px] md:h-full bg-white/10 border-y md:border-y-0 md:border-x border-white/10 flex md:flex-col flex-row justify-between px-4 md:px-0 py-0 md:py-4 items-center shadow-inner shrink-0">
                     <div className="w-[15px] md:w-[4px] h-[3px] md:h-[15px] bg-black/20 rounded-full"></div>
                     <div className="w-[15px] md:w-[4px] h-[3px] md:h-[15px] bg-black/20 rounded-full"></div>
                </div>

                {/* --- RIGHT PANEL: CD TRAY / RETRO PLAYER --- */}
                <div className="w-full md:w-1/2 h-[300px] md:h-full relative bg-[#1a1a1a] shrink-0 overflow-hidden">
                     
                     {/* Brushed Metal Background Texture */}
                     <div className="absolute inset-0 opacity-20" style={{ 
                         backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
                         filter: 'grayscale(100%) contrast(150%)'
                     }}></div>
                     
                     {/* Internal Shadow & Bevel */}
                     <div className="absolute inset-0 border-[6px] border-[#222] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"></div>

                     {/* TONE ARM (Animated) */}
                     <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] pointer-events-none z-20 md:block hidden">
                         <div className="relative w-full h-full" style={{ 
                             transformOrigin: '80% 20%', 
                             transform: isPlaying ? 'rotate(25deg)' : 'rotate(0deg)',
                             transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
                         }}>
                             <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
                                 {/* Arm Pivot Base */}
                                 <circle cx="160" cy="40" r="25" fill="#333" stroke="#111" strokeWidth="2" />
                                 <circle cx="160" cy="40" r="10" fill="#555" />
                                 {/* Arm Tube */}
                                 <path d="M 160 40 Q 150 100 100 160" fill="none" stroke="#888" strokeWidth="8" strokeLinecap="round" />
                                 <path d="M 160 40 Q 150 100 100 160" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
                                 {/* Headshell */}
                                 <path d="M 100 160 L 85 175 L 110 185 L 120 170 Z" fill="#222" stroke="#111" />
                             </svg>
                         </div>
                     </div>

                     <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-[240px] md:w-[85%] aspect-square rounded-full bg-black shadow-2xl relative flex items-center justify-center border-4 border-[#111]">
                             
                             {/* THE DISC (Vinyl / CD Hybrid) */}
                             <div 
                                onClick={onPlayToggle}
                                className={`w-[96%] h-[96%] rounded-full shadow-[0_0_15px_rgba(0,0,0,0.8)] relative cursor-pointer group overflow-hidden`}
                                style={{
                                    animation: isPlaying ? 'spin 4s linear infinite' : 'none'
                                }}
                             >
                                  {/* Vinyl Grooves (Repeating Radial) */}
                                  <div className="absolute inset-0 rounded-full bg-[repeating-radial-gradient(#111_0,#111_2px,#222_3px,#222_4px)]"></div>
                                  
                                  {/* Anisotropic Reflection (The "CD Shine") */}
                                  <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.1)_60deg,transparent_120deg,rgba(255,255,255,0.1)_180deg,transparent_240deg,rgba(255,255,255,0.1)_300deg,transparent_360deg)] opacity-30 mix-blend-overlay"></div>

                                  {/* Play/Pause Hover Overlay */}
                                  {!isAnalyzing && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                          {isPlaying ? (
                                              <svg width="40" height="40" viewBox="0 0 24 24" fill="white" className="drop-shadow-lg"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                          ) : (
                                              <svg width="40" height="40" viewBox="0 0 24 24" fill="white" className="drop-shadow-lg"><path d="M5 3l14 9-14 9V3z"/></svg>
                                          )}
                                      </div>
                                  )}

                                  {/* Center Label */}
                                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[38%] h-[38%] rounded-full bg-gradient-to-br from-[#F4D35E] to-[#C7B299] shadow-inner flex items-center justify-center z-10 border border-[#bfae82]">
                                      
                                      {recommendation ? (
                                        <>
                                            <div className="absolute inset-0 rounded-full border border-black/10 opacity-50"></div>
                                            <div className="text-center transform rotate-0">
                                                <p className="font-poster text-[6px] md:text-[8px] tracking-widest text-[#08303F] font-bold">HWAEUN RECORDS</p>
                                                <div className="w-8 h-px bg-[#08303F] mx-auto my-0.5 opacity-50"></div>
                                                <p className="font-serif text-[4px] md:text-[6px] text-[#08303F] max-w-[50px] leading-tight mx-auto truncate">{recommendation.suggestedTrack}</p>
                                            </div>
                                        </>
                                      ) : (
                                        <span className="font-poster text-[8px] tracking-widest text-[#08303F]/50">NO DISC</span>
                                      )}
                                      
                                      {/* Spindle Hole */}
                                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[12%] h-[12%] rounded-full bg-[#eee] shadow-inner border border-gray-400"></div>
                                  </div>
                             </div>

                             {/* VFD VISUALIZER (Retro Spectrum Analyzer) */}
                             {isPlaying && (
                                 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[60%] h-12 flex items-end justify-center gap-[2px] pointer-events-none z-30 opacity-80 mix-blend-screen">
                                     <style>{`
                                         @keyframes bounceBars {
                                            0%, 100% { height: 10%; opacity: 0.5; }
                                            50% { height: 90%; opacity: 1; box-shadow: 0 0 8px #2dd4bf; }
                                         }
                                         @keyframes driftParticle {
                                            0% { transform: translateY(0) rotate(0deg); opacity: 0; }
                                            50% { opacity: 0.8; }
                                            100% { transform: translateY(-100px) rotate(45deg); opacity: 0; }
                                         }
                                     `}</style>
                                     {[...Array(12)].map((_, i) => (
                                         <div 
                                            key={i} 
                                            className="w-1 md:w-1.5 bg-teal-400 rounded-sm shadow-[0_0_5px_rgba(45,212,191,0.5)]"
                                            style={{
                                                animation: `bounceBars ${0.4 + Math.random() * 0.4}s infinite ease-in-out`,
                                                animationDelay: `${Math.random() * 0.5}s`
                                            }}
                                         />
                                     ))}
                                 </div>
                             )}

                             {/* Floating Particles (Music Dust) */}
                             {isPlaying && (
                                 <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
                                     {[...Array(6)].map((_, i) => (
                                         <div 
                                            key={i}
                                            className="absolute w-1 h-1 bg-white rounded-full opacity-0"
                                            style={{
                                                left: `${20 + Math.random() * 60}%`,
                                                top: `${50 + Math.random() * 40}%`,
                                                animation: `driftParticle ${2 + Math.random()}s infinite linear`,
                                                animationDelay: `${Math.random() * 2}s`
                                            }}
                                         ></div>
                                     ))}
                                 </div>
                             )}
                         </div>
                     </div>
                     
                     {/* Power Light / Strobe */}
                     <div className="absolute bottom-4 left-4 flex gap-2">
                        <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-500 shadow-[0_0_8px_red] animate-pulse' : 'bg-red-900'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 shadow-[0_0_8px_green]' : 'bg-green-900'}`}></div>
                     </div>
                </div>

            </div>

        </div>

        {/* BOTTOM: PALETTE */}
        <div className="mt-4 md:mt-8 relative z-10 bg-[#05202a] px-4 md:px-6 py-2 md:py-3 rounded-full border border-white/10 flex flex-wrap justify-center items-center gap-2 md:gap-4 max-w-full">
             <div className="text-white/50 text-xs font-poster tracking-widest mr-2 hidden md:block">PALETTE</div>
             {colors.map((c, i) => (
                <button
                key={i}
                onClick={() => handleColorClick(c)}
                className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c && tool !== 'eraser' ? 'border-white scale-125 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                title={c}
                />
            ))}
            <div className="hidden md:block w-px h-6 bg-white/20 mx-2"></div>
            <div className="hidden md:flex flex-col items-center">
                 <div className="w-4 h-4 rounded-full border border-white" style={{backgroundColor: color}}></div>
                 <div className="text-[8px] text-white/50 mt-1">ACTIVE</div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default DrawingCanvas;
