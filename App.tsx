import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import DrawingCanvas, { CanvasHandle } from './components/DrawingCanvas'; // 👈 保留新版的导入
import Controls from './components/Controls';
import Footer from './components/Footer';
import BackgroundCollage from './components/BackgroundCollage';
import { AppState, AudioSettings, MusicRecommendation } from './types';
import { analyzeDrawing } from './services/geminiService';
import { audioService } from './services/audioService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState<MusicRecommendation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 
  const canvasRef = useRef<CanvasHandle>(null);

  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    volume: 0.5,
    reverb: 0,
    filter: 2000,
    distortion: 0,
    vinylNoise: false,
    rainNoise: false,
    musicStyle: 'calm'
  });

  useEffect(() => {
    audioService.updateSettings(audioSettings);
  }, [audioSettings]);

  //文字识别优化
  const handleExportDrawing = async (base64: string) => {
    setCurrentImage(base64);
    setIsAnalyzing(true);
    setRecommendation(null);
    setIsPlaying(false);
    audioService.stop();

    const result = await analyzeDrawing(base64);
    setRecommendation(result);

    // Update suggested track name if visual text exists
    if (result.visualText) {
        result.suggestedTrack = result.visualText;
    }

    // Auto-select mood based on AI recommendation
    let detectedStyle: 'calm' | 'energetic' | 'melancholic' | 'lofi' = 'calm';
    
    // Combine tags for better detection
    const combinedTags = (result.mood + result.genre + (result.suggestedTrack || "")).toLowerCase();

    if (combinedTags.includes('love') || combinedTags.includes('heart') || combinedTags.includes('romance')) {
        detectedStyle = 'lofi';
    } 
    else if (combinedTags.includes('energetic') || combinedTags.includes('happy') || combinedTags.includes('bright')) {
        detectedStyle = 'energetic';
    } 
    else if (combinedTags.includes('sad') || combinedTags.includes('melancholic') || combinedTags.includes('dark')) {
        detectedStyle = 'melancholic';
    } 
    else if (combinedTags.includes('chill') || combinedTags.includes('lofi') || combinedTags.includes('jazz')) {
        detectedStyle = 'lofi';
    }
    
    setAudioSettings(prev => ({ ...prev, musicStyle: detectedStyle }));
    setIsAnalyzing(false);
  };

  //保留按钮点击处理
  const handleGenerateClick = () => {
      if (canvasRef.current) {
          const base64 = canvasRef.current.getVisualData();
          if (base64 && base64.length > 1000) {
              handleExportDrawing(base64);
          } else {
              alert("Please draw something first!");
          }
      }
  };

  const handlePlayToggle = async () => {
    if (isPlaying) {
      audioService.stop();
      setIsPlaying(false);
    } else {
      await audioService.startMusic(audioSettings.musicStyle);
      setIsPlaying(true);
    }
  };

  const updateSetting = (key: keyof AudioSettings, value: any) => {
    setAudioSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      
      <BackgroundCollage appState={appState} />

      {appState !== AppState.HOME && (
        <Header setAppState={setAppState} currentState={appState} />
      )}

      <main className="flex-1 w-full transition-all duration-500 relative z-10">
        
        {appState === AppState.HOME && (
          <div className="h-screen flex items-center justify-center">
             <Hero 
               onStart={() => setAppState(AppState.DRAWING)} 
               onAbout={() => setAppState(AppState.ABOUT)}
             />
          </div>
        )}

        {/* About 换回旧版详细的代码 */}
        {appState === AppState.ABOUT && (
          <div className="w-full min-h-screen bg-[#f4f6f8]/90 py-20 px-6 md:px-12 backdrop-blur-sm">
            <div className="max-w-5xl mx-auto bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden relative">
                
                {/* Minimalist Watermark */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none select-none">
                   <span className="text-9xl font-korean">화음</span>
                </div>
                
                {/* Realistic Turntable Visual */}
                <div className="absolute top-10 left-10 w-64 h-64 opacity-20 pointer-events-none md:block hidden transform -rotate-12">
                   <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                      <rect x="0" y="0" width="200" height="200" rx="4" fill="#e0e0e0" stroke="#ccc" />
                      <circle cx="100" cy="100" r="90" fill="#222" opacity="0.1" />
                      <g className="animate-spin-slow" style={{transformOrigin: '100px 100px'}}>
                          <circle cx="100" cy="100" r="85" fill="#111" stroke="#333" strokeWidth="2" />
                          <circle cx="100" cy="100" r="80" fill="none" stroke="#444" strokeWidth="1" strokeDasharray="2 4" />
                          <circle cx="100" cy="100" r="75" fill="#1a1a1a" />
                          <circle cx="100" cy="100" r="70" fill="none" stroke="#2a2a2a" strokeWidth="1" />
                          <circle cx="100" cy="100" r="25" fill="#F4D35E" />
                          <circle cx="100" cy="100" r="3" fill="#fff" />
                          <text x="100" y="90" fontSize="6" textAnchor="middle" fill="#08303F" fontFamily="Oswald" fontWeight="bold">HWAEUN</text>
                      </g>
                      <g transform="translate(170, 40) rotate(25)">
                          <rect x="-5" y="-5" width="30" height="30" rx="2" fill="#ccc" stroke="#999" />
                          <circle cx="10" cy="10" r="8" fill="#888" />
                          <path d="M 10 10 L 10 120" stroke="#silver" strokeWidth="4" fill="none" strokeLinecap="round" />
                          <path d="M 8 120 L 12 120 L 15 135 L 5 135 Z" fill="#222" />
                      </g>
                   </svg>
                </div>

                <div className="p-12 md:p-20 relative">
                    
                    {/* Header - SVG Typography */}
                    <div className="text-center mb-16 relative flex justify-center pt-8">
                        <svg viewBox="0 0 500 120" className="w-full max-w-[500px] h-[120px] overflow-visible">
                            <defs>
                                <linearGradient id="aboutGoldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#F4D35E" />
                                    <stop offset="100%" stopColor="#C7B299" />
                                </linearGradient>
                            </defs>
                            <text x="250" y="80" textAnchor="middle" fontFamily="Mrs Saint Delafield" fontSize="100" fill="#000" opacity="0.1" style={{ filter: 'blur(2px)' }}>Hwa-Eum</text>
                            <text x="250" y="80" textAnchor="middle" fontFamily="Mrs Saint Delafield" fontSize="100" fill="url(#aboutGoldGradient)" className="drop-shadow-md">Hwa-Eum</text>
                        </svg>
                    </div>
                    
                    {/* Project Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
                        <div className="md:col-span-4 border-t border-black/20 pt-4">
                            <h3 className="font-korean text-xl tracking-[0.1em] text-gray-400 mb-2 flex items-center gap-2">
                                🎨 Project Overview
                            </h3>
                            <h2 className="font-brush text-3xl text-[#08303F] leading-tight" style={{ filter: 'url(#rough-ink)' }}>
                                Where the Image Becomes a Symphony.
                            </h2>
                        </div>
                        <div className="md:col-span-8 space-y-6 text-gray-600 font-serif leading-loose text-lg">
                            <p>
                                <strong>Hwa-Eum (画音)</strong> is an interactive web experiment that explores the hidden connection between sight and sound.
                            </p>
                            <p>
                                Instead of composing with notes and complex software, we invite you to compose with colors. The system analyzes the visual atmosphere of your drawing—its colors, density, and style—and translates it into a matching musical soundscape. It creates a unique audiovisual experience where your art dictates the mood of the music.
                            </p>
                        </div>
                    </div>

                    {/* Background & Inspiration */}
                    <div className="mb-20 bg-[#f8f9fa] p-8 md:p-12 rounded-sm border border-gray-100">
                          <div className="flex flex-col items-center text-center mb-8">
                            <h3 className="font-brush text-3xl text-[#08303F] mb-4 flex items-center gap-2" style={{ filter: 'url(#rough-ink)' }}>
                                💡 Background & Inspiration
                            </h3>
                            <p className="font-korean text-2xl text-[#08303F]/70 mb-4">"If your drawing had a sound, what would it be?"</p>
                          </div>
                          <div className="columns-1 md:columns-2 gap-12 font-serif text-gray-600 leading-relaxed text-sm md:text-base">
                             <p className="mb-4 font-semibold text-[#08303F]">
                                 Hwa-Eum was developed as a Final Project for <strong>CTP431: Fundamentals of Computer Music</strong> (Fall 2025) at KAIST.
                             </p>
                             <p className="mb-4">
                                 This project is inspired by <strong>Synesthesia</strong>, the perceptual phenomenon where colors evoke sounds. We wanted to bridge the gap between visual art and music production.
                             </p>
                             <p>
                                 Traditional music composition requires learning theory, but drawing is intuitive for everyone. Hwa-Eum uses Web Audio technology to interpret your visual expression, allowing you to generate a personalized soundtrack simply by painting on a digital canvas.
                             </p>
                          </div>
                    </div>

                    {/* How to Play */}
                    <div className="mb-12">
                        <h3 className="font-brush text-3xl text-[#08303F] mb-12 text-center flex items-center justify-center gap-3" style={{ filter: 'url(#rough-ink)' }}>
                            👾 How to Play (User Flow)
                        </h3>
                        
                        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4 px-4">
                             {/* Connector Line (Desktop) */}
                             <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10 transform -translate-y-1/2"></div>

                             {/* Step 1 */}
                             <div className="bg-white p-6 w-full md:w-1/3 rounded shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col items-center text-center relative group hover:-translate-y-2 transition-transform duration-300">
                                 <div className="w-12 h-12 bg-macaron-yellow rounded-full flex items-center justify-center text-[#08303F] font-bold font-poster text-lg mb-4 shadow-sm border-2 border-white">01</div>
                                 <h4 className="font-serif font-bold text-lg mb-2 text-[#08303F]">Draw Your Art</h4>
                                 <p className="text-xs text-gray-500 leading-relaxed">Use the brush to create your artwork on the canvas. You can choose different colors to express your feelings.</p>
                             </div>

                             {/* Step 2 */}
                             <div className="bg-white p-6 w-full md:w-1/3 rounded shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col items-center text-center relative group hover:-translate-y-2 transition-transform duration-300">
                                 <div className="w-12 h-12 bg-macaron-blue rounded-full flex items-center justify-center text-[#08303F] font-bold font-poster text-lg mb-4 shadow-sm border-2 border-white">02</div>
                                 <h4 className="font-serif font-bold text-lg mb-2 text-[#08303F]">Generate Music</h4>
                                 <p className="text-xs text-gray-500 leading-relaxed">Based on the colors and style of your drawing, the system analyzes the visual vibe and automatically recommends a matching background track.</p>
                             </div>

                             {/* Step 3 */}
                             <div className="bg-white p-6 w-full md:w-1/3 rounded shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col items-center text-center relative group hover:-translate-y-2 transition-transform duration-300">
                                 <div className="w-12 h-12 bg-macaron-pink rounded-full flex items-center justify-center text-[#08303F] font-bold font-poster text-lg mb-4 shadow-sm border-2 border-white">03</div>
                                 <h4 className="font-serif font-bold text-lg mb-2 text-[#08303F]">Add & Modify Effects</h4>
                                 <p className="text-xs text-gray-500 leading-relaxed">Layer additional sound effects on top of the music or adjust the settings to customize your personal soundscape.</p>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {appState === AppState.DRAWING && (
          <div className="max-w-6xl mx-auto px-6 py-12 relative flex flex-col gap-12 pb-20">
            
            {/* HEADER FOR HWAEUN */}
            <div className="relative w-full h-[200px] md:h-[250px] flex items-center justify-center z-10">
                <svg viewBox="0 0 600 250" className="w-full h-full max-w-[600px] overflow-visible hover:scale-105 transition-transform duration-500 ease-out cursor-default">
                    <defs>
                         <linearGradient id="drawingTitleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#08303F" />
                            <stop offset="100%" stopColor="#2c4c5b" />
                        </linearGradient>
                         <linearGradient id="drawingGoldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#F4D35E" />
                            <stop offset="100%" stopColor="#C7B299" />
                        </linearGradient>
                    </defs>
                    <text x="305" y="155" textAnchor="middle" fontFamily="Nanum Brush Script" fontSize="280" fill="#000" opacity="0.1" style={{ filter: 'url(#rough-ink)' }}>화음</text>
                    <text x="300" y="150" textAnchor="middle" fontFamily="Nanum Brush Script" fontSize="280" fill="url(#drawingTitleGradient)" style={{ filter: 'url(#rough-ink)' }} className="drop-shadow-sm">화음</text>
                    <g transform="translate(300, 150) scale(1.2, 1)">
                        <text x="0" y="0" textAnchor="middle" fontFamily="Mrs Saint Delafield" fontSize="240" fill="url(#drawingGoldGradient)" className="mix-blend-multiply">Hwaeun</text>
                    </g>
                    <text x="300" y="240" textAnchor="middle" fontSize="28" fontFamily="Nanum Pen Script" fill="#5C7081" letterSpacing="3">그림이 소리가 되는 순간</text>
                </svg>
            </div>
            
            {/* 保留了 Ref 连接 */}
            <div className="z-10">
              <DrawingCanvas 
                  ref={canvasRef} // 
                  onExport={() => {}} 
                  isPlaying={isPlaying}
                  recommendation={recommendation}
                  isAnalyzing={isAnalyzing}
                  onPlayToggle={handlePlayToggle}
              />
            </div>

            {/* Generate 按钮 */}
            <div className="flex justify-center -mt-4 z-20">
                <button 
                  onClick={handleGenerateClick}
                  disabled={isAnalyzing}
                  className={`
                    group relative px-10 py-4 bg-[#08303F] text-[#F4D35E] rounded-full 
                    font-serif text-xl tracking-widest shadow-[0_10px_30px_rgba(8,48,63,0.3)]
                    border border-[#F4D35E]/30 transition-all duration-300
                    disabled:opacity-70 disabled:cursor-not-allowed
                    hover:scale-105 hover:shadow-[0_15px_40px_rgba(244,211,94,0.2)]
                    active:scale-95
                  `}
                >
                    <span className="relative z-10 flex items-center gap-3">
                        {isAnalyzing ? (
                             <>
                                <svg className="animate-spin h-5 w-5 text-[#F4D35E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                LISTENING...
                             </>
                        ) : (
                             <>
                                <span>✦</span>
                                GENERATE HARMONY
                                <span>✦</span>
                             </>
                        )}
                    </span>
                    <div className="absolute inset-0 rounded-full bg-[#F4D35E] opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                </button>
            </div>

            {recommendation && (
              <div className="z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <Controls 
                  settings={audioSettings} 
                  updateSettings={updateSetting} 
                  isPlaying={isPlaying} 
                  onPlayToggle={handlePlayToggle}
                  trackName={recommendation.suggestedTrack}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

    </div>
  );
};

export default App;