// src/components/DrawingCanvas.tsx

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { MusicRecommendation } from '../types';
import { audioService } from '../services/audioService';

// 1. 定义暴露给父组件的方法
export interface CanvasHandle {
  getVisualData: () => string;
  clear: () => void;
}

interface DrawingCanvasProps {
  onExport?: (base64: string) => void; 
  isPlaying: boolean;
  recommendation?: MusicRecommendation | null;
  isAnalyzing?: boolean;
  onPlayToggle?: () => void;
}

type ToolType = 'pencil' | 'line' | 'rect' | 'circle' | 'eraser' | 'stamp';

const STAMPS = ['★', '♥', '✿', '☁', '✂', '♪', '⚡', '☺', '☂', '☾'];

// 2. 使用 forwardRef 包裹组件
const DrawingCanvas = forwardRef<CanvasHandle, DrawingCanvasProps>(({ onExport, isPlaying, recommendation, isAnalyzing, onPlayToggle }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mutable Drawing State
  const isDrawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const snapshot = useRef<ImageData | null>(null);

  // UI State
  const [color, setColor] = useState('#FFFFFF'); 
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<ToolType>('pencil');
  const [selectedStamp, setSelectedStamp] = useState(STAMPS[0]);
  
  // History
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const PAPER_COLOR = '#000000';

  // 3. ✨ 关键：暴露 getVisualData 给 App.tsx 调用 ✨
  useImperativeHandle(ref, () => ({
    getVisualData: () => {
      if (canvasRef.current) {
        // 返回 JPEG 格式以减小 Base64 体积，加快 API 传输
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

  // Initialize Canvas
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

            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);



            ctx.scale(dpr, dpr);
            // ✨ 像素风：方形笔触
            ctx.strokeStyle = '#FFFFFF'; 
            ctx.lineWidth = 30;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'miter';
            
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
    }
  };

  const handleUndo = () => {
    audioService.playSFX('paper'); 
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      restoreCanvasState(history[newStep]);
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
    
    // ✨ 像素风：方形笔触，无圆润效果
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';

    if (tool === 'eraser') {
        ctx.strokeStyle = PAPER_COLOR;
        ctx.fillStyle = PAPER_COLOR;
        ctx.shadowBlur = 0;
    } 
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault();
    if (isAnalyzing) return; // 禁止在分析时绘图

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
                {/* SVG Loader */}
                <div className="relative w-48 h-48 md:w-64 md:h-64 mb-8">
                   <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible animate-spin-slow">
                        <circle cx="100" cy="100" r="95" fill="#111" stroke="#333" strokeWidth="2" />
                        <circle cx="100" cy="100" r="30" fill="#F4D35E" />
                        <text x="100" y="160" fill="white" fontSize="10" textAnchor="middle" letterSpacing="2">PROCESSING</text>
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
             {/* Title / Logo Area */}
             <div className="flex items-center gap-4">
                 <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                 <span className="font-poster text-white/50 tracking-widest text-sm">REC MODE</span>
             </div>

             <div className="flex gap-2 md:gap-3">
                 <button onClick={handleUndo} className="px-3 py-1 text-xs md:text-sm font-poster text-white border border-white/30 hover:bg-white/10 uppercase tracking-wider transition-colors">Undo</button>
                 <button onClick={clearCanvas} className="px-3 py-1 text-xs md:text-sm font-poster text-white border border-white/30 hover:bg-red-500/20 hover:text-red-200 uppercase tracking-wider transition-colors">Clear</button>
             </div>
        </div>

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
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #333 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                      
                      <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-[240px] md:w-[85%] aspect-square rounded-full bg-black shadow-2xl relative flex items-center justify-center border-4 border-[#111]">
                             <div 
                                onClick={onPlayToggle}
                                className={`w-[96%] h-[96%] rounded-full shadow-[0_0_15px_rgba(0,0,0,0.8)] relative cursor-pointer group overflow-hidden`}
                                style={{
                                    animation: isPlaying ? 'spin 4s linear infinite' : 'none'
                                }}
                             >
                                 <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,#222_180deg,transparent_360deg)] opacity-40"></div>
                                 <div className="absolute inset-0 rounded-full border-[10px] border-[#151515]"></div>
                                 
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

        {/* PALETTE - 像素艺术调色板 */}
        <div className="relative z-10 flex flex-wrap justify-center gap-2 mt-4 max-w-3xl">
             {/* Colors - 更多颜色 */}
             <div className="flex flex-wrap gap-1 p-2 bg-white/10 rounded-sm backdrop-blur-sm">
                 {[
                     '#FFFFFF', // 白色
                     '#FF0000', // 红色
                     '#00FF00', // 绿色
                     '#0000FF', // 蓝色
                     '#FFFF00', // 黄色
                     '#FF00FF', // 品红
                     '#00FFFF', // 青色
                     '#FF6600', // 橙色
                     '#9900FF', // 紫色
                     '#00FF99', // 青绿
                     '#FF0099', // 粉红
                     '#663300', // 棕色
                     '#999999', // 灰色
                     '#FFB6C1', // 浅粉
                     '#87CEEB', // 天蓝
                     '#F4D35E', // 金黄
                     '#DA4167', // 深红
                     '#06D6A0', // 薄荷绿
                     '#118AB2', // 深蓝
                 ].map(c => (
                     <button 
                       key={c}
                       onClick={() => handleColorClick(c)}
                       className={`w-6 h-6 md:w-7 md:h-7 border-2 transition-transform hover:scale-110 ${color === c ? 'border-white scale-110 shadow-lg' : 'border-gray-600/50'}`}
                       style={{ backgroundColor: c }}
                       title={c}
                     />
                 ))}
             </div>
             
             {/* Tools */}
             <div className="flex gap-1 p-2 bg-white/10 rounded-sm backdrop-blur-sm">
                 {(['pencil', 'line', 'rect', 'circle', 'eraser'] as ToolType[]).map(t => (
                    <button
                        key={t}
                        onClick={() => handleToolClick(t)}
                        className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-white transition-all ${tool === t ? 'bg-white text-[#08303F] scale-105' : 'hover:bg-white/20'}`}
                    >
                        {/* Simple Icons */}
                        {t === 'pencil' && '✎'}
                        {t === 'line' && '/'}
                        {t === 'rect' && '□'}
                        {t === 'circle' && '○'}
                        {t === 'eraser' && '⌫'}
                    </button>
                 ))}
             </div>

              {/* Stamps */}
              <div className="flex gap-1 p-2 bg-white/10 rounded-sm backdrop-blur-sm">
                 <button onClick={() => handleToolClick('stamp')} className={`px-3 py-1 text-white ${tool === 'stamp' ? 'bg-white text-[#08303F]' : ''}`}>Stamp:</button>
                 {STAMPS.slice(0, 5).map(s => (
                    <button
                        key={s}
                        onClick={() => { handleStampSelect(s); handleToolClick('stamp'); }}
                        className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-white hover:scale-125 transition-transform ${selectedStamp === s && tool === 'stamp' ? 'text-[#F4D35E] scale-125' : ''}`}
                    >
                        {s}
                    </button>
                 ))}
             </div>
        </div>

      </div>
    </div>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;