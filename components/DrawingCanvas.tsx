import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { MusicRecommendation } from '../types';
import { audioService } from '../services/audioService';

// 1. Define the interface for methods exposed to the parent
export interface CanvasHandle {
  getVisualData: () => string;
  clear: () => void;
}

interface DrawingCanvasProps {
  // onExport is no longer strictly needed for auto-generation, 
  // but we keep the type definition to prevent breaking App.tsx immediately.
  onExport?: (base64: string) => void; 
  isPlaying: boolean;
  recommendation?: MusicRecommendation | null;
  isAnalyzing?: boolean;
  onPlayToggle?: () => void;
}

type ToolType = 'pencil' | 'line' | 'rect' | 'circle' | 'eraser' | 'stamp';

const STAMPS = ['★', '♥', '✿', '☁', '✂', '♪', '⚡', '☺', '☂', '☾'];

// 2. Wrap the component in forwardRef
const DrawingCanvas = forwardRef<CanvasHandle, DrawingCanvasProps>(({ onExport, isPlaying, recommendation, isAnalyzing, onPlayToggle }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mutable Drawing State
  const isDrawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const snapshot = useRef<ImageData | null>(null);

  // UI State
  const [color, setColor] = useState('#08303F'); 
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<ToolType>('pencil');
  const [selectedStamp, setSelectedStamp] = useState(STAMPS[0]);
  
  // History
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const PAPER_COLOR = '#Fdfdfd';

  // 3. Expose the "getVisualData" method to the parent (App.tsx)
  useImperativeHandle(ref, () => ({
    getVisualData: () => {
      if (canvasRef.current) {
        // Return compressed JPEG to save API bandwidth
        return canvasRef.current.toDataURL("image/jpeg", 0.7);
      }
      return "";
    },
    clear: () => {
        clearCanvas();
    }
  }));

  useEffect(() => {
    return () => {
       audioService.stop();
    };
  }, []);

  // Initialize Canvas Size
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        
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
            
            if (tempCanvas) {
                ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
            } else {
                ctx.fillStyle = PAPER_COLOR; 
                ctx.fillRect(0, 0, rect.width, rect.height);
                if (historyStep === -1) {
                    const initialUrl = canvas.toDataURL();
                    setHistory([initialUrl]);
                    setHistoryStep(0);
                }
            }
        }
    };

    const observer = new ResizeObserver(() => {
        requestAnimationFrame(() => resizeCanvas());
    });
    observer.observe(container);
    resizeCanvas(); 

    return () => observer.disconnect();
  }, []); 

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
      
      // ❌ STOP AUTOMATIC EXPORT ❌
      // We commented this out so it doesn't trigger AI on every stroke
      // if (onExport) onExport(dataUrl); 
    }
  };

  const handleUndo = () => {
    audioService.playSFX('paper'); 
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      restoreCanvasState(history[newStep]);
      // Note: We also stop calling onExport here
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
        audioService.playSFX('stamp'); 
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
      // Auto export removed from here!
    }
  };

  const clearCanvas = () => {
    audioService.playSFX('paper'); 
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.fillStyle = PAPER_COLOR;
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      saveToHistory();
    }
  };

  const handleToolClick = (t: ToolType) => {
    audioService.playSFX('switch'); 
    setTool(t);
  };

  const handleColorClick = (c: string) => {
      audioService.playSFX('click'); 
      setColor(c); 
      if(tool==='eraser') setTool('pencil');
  };

  const handleStampSelect = (s: string) => {
      audioService.playSFX('click'); 
      setSelectedStamp(s);
  };

  return (
    <div className="w-full max-w-6xl mx-auto select-none flex flex-col items-center">
      
      {/* STUDIO CONTAINER */}
      <div className="relative bg-[#08303F] p-2 md:p-8 rounded-sm shadow-2xl w-full flex flex-col items-center overflow-hidden border-t border-white/10">
        
        {/* Loading Overlay */}
        {isAnalyzing && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1a1a1a]/95 backdrop-blur-md transition-all duration-500 animate-in fade-in">
                {/* ... Loading Spinner ... */}
                <div className="relative w-48 h-48 md:w-64 md:h-64 mb-8">
                   {/* ... Keep your existing SVG loader code here ... */}
                   <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                        {/* Simplified for brevity - keep your original SVG content */}
                        <circle cx="100" cy="100" r="95" fill="#333" stroke="#444" strokeWidth="2" />
                        <text x="100" y="110" fill="white" textAnchor="middle">LOADING...</text>
                   </svg>
                </div>
                <div className="flex flex-col items-center gap-3">
                    <p className="font-poster text-xl md:text-2xl tracking-[0.3em] text-[#F4D35E] animate-pulse glow-text">PRESSING VINYL...</p>
                </div>
            </div>
        )}

        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#5C7081 1px, transparent 1px), linear-gradient(90deg, #5C7081 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        {/* TOP BAR */}
        <div className="relative z-10 w-full flex flex-col md:flex-row justify-between items-center mb-4 md:mb-8 pb-4 border-b border-white/20 gap-4">
             {/* ... Keep your existing Top Bar code ... */}
             <div className="flex gap-2 md:gap-3">
                 <button onClick={handleUndo} className="px-3 py-1 text-xs md:text-sm font-poster text-white border border-white/30 hover:bg-white/10 uppercase tracking-wider">Undo</button>
                 <button onClick={clearCanvas} className="px-3 py-1 text-xs md:text-sm font-poster text-white border border-white/30 hover:bg-red-500/20 hover:text-red-200 uppercase tracking-wider">Clear</button>
             </div>
        </div>

        {/* TOOLBAR */}
        {/* ... Keep your existing Toolbar code ... */}

        {/* WORKSPACE */}
        <div className="relative z-10 w-full max-w-[800px] md:aspect-[2/1] bg-transparent flex justify-center items-center py-2 md:py-4">
            <div className="flex flex-col md:flex-row w-full h-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden bg-white/5 backdrop-blur-sm border border-white/20">
                
                {/* CANVAS AREA */}
                <div className="w-full md:w-1/2 h-[350px] md:h-full relative bg-transparent border-b md:border-b-0 md:border-r border-white/10 shrink-0">
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
                </div>

                {/* SPINE */}
                <div className="w-full md:w-[12px] h-[12px] md:h-full bg-white/10 border-y md:border-y-0 md:border-x border-white/10 flex md:flex-col flex-row justify-between px-4 md:px-0 py-0 md:py-4 items-center shadow-inner shrink-0">
                      <div className="w-[15px] md:w-[4px] h-[3px] md:h-[15px] bg-black/20 rounded-full"></div>
                      <div className="w-[15px] md:w-[4px] h-[3px] md:h-[15px] bg-black/20 rounded-full"></div>
                </div>

                {/* CD PLAYER AREA */}
                <div className="w-full md:w-1/2 h-[300px] md:h-full relative bg-[#1a1a1a] shrink-0 overflow-hidden">
                      {/* ... Keep your existing CD Player Visuals ... */}
                      <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-[240px] md:w-[85%] aspect-square rounded-full bg-black shadow-2xl relative flex items-center justify-center border-4 border-[#111]">
                             <div 
                                onClick={onPlayToggle}
                                className={`w-[96%] h-[96%] rounded-full shadow-[0_0_15px_rgba(0,0,0,0.8)] relative cursor-pointer group overflow-hidden`}
                                style={{
                                    animation: isPlaying ? 'spin 4s linear infinite' : 'none'
                                }}
                             >
                                 {/* ... CD Visuals ... */}
                                 {/* Center Label */}
                                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[38%] h-[38%] rounded-full bg-gradient-to-br from-[#F4D35E] to-[#C7B299] shadow-inner flex items-center justify-center z-10 border border-[#bfae82]">
                                     {recommendation ? (
                                        <div className="text-center transform rotate-0">
                                            <p className="font-poster text-[6px] md:text-[8px] tracking-widest text-[#08303F] font-bold">HWAEUN RECORDS</p>
                                            <div className="w-8 h-px bg-[#08303F] mx-auto my-0.5 opacity-50"></div>
                                            <p className="font-serif text-[4px] md:text-[6px] text-[#08303F] max-w-[50px] leading-tight mx-auto truncate">{recommendation.suggestedTrack}</p>
                                        </div>
                                     ) : (
                                        <span className="font-poster text-[8px] tracking-widest text-[#08303F]/50">NO DISC</span>
                                     )}
                                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[12%] h-[12%] rounded-full bg-[#eee] shadow-inner border border-gray-400"></div>
                                 </div>
                             </div>
                          </div>
                      </div>
                      
                      {/* Power Light */}
                      <div className="absolute bottom-4 left-4 flex gap-2">
                         <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-500 shadow-[0_0_8px_red] animate-pulse' : 'bg-red-900'}`}></div>
                         <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 shadow-[0_0_8px_green]' : 'bg-green-900'}`}></div>
                      </div>
                </div>

            </div>
        </div>

        {/* PALETTE */}
        {/* ... Keep your existing Palette code ... */}

      </div>
    </div>
  );
});

export default DrawingCanvas;