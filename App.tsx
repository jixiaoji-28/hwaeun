import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import DrawingCanvas, { CanvasHandle } from './components/DrawingCanvas'; // Import CanvasHandle
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
  
  // ✨ NEW: Reference to control the canvas manually
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

  // Update audio engine when settings change
  useEffect(() => {
    audioService.updateSettings(audioSettings);
  }, [audioSettings]);

  // ✨ MAIN LOGIC: Triggers AI Analysis
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

  // ✨ NEW: Button Handler
  const handleGenerateClick = () => {
      if (canvasRef.current) {
          // Manually grab the image from the canvas
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
      
      {/* Background Collage (Z-Index 0) - Controlled by AppState */}
      <BackgroundCollage appState={appState} />

      {/* Unified Header: Hidden on Home Page */}
      {appState !== AppState.HOME && (
        <Header setAppState={setAppState} currentState={appState} />
      )}

      {/* Main Container (Z-Index 10 to float above collage) */}
      <main className="flex-1 w-full transition-all duration-500 relative z-10">
        
        {appState === AppState.HOME && (
          <div className="h-screen flex items-center justify-center">
             <Hero 
               onStart={() => setAppState(AppState.DRAWING)} 
               onAbout={() => setAppState(AppState.ABOUT)}
             />
          </div>
        )}

        {appState === AppState.ABOUT && (
          <div className="w-full min-h-screen bg-[#f4f6f8]/90 py-20 px-6 md:px-12 backdrop-blur-sm">
            <div className="max-w-5xl mx-auto bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden relative">
                
                {/* Minimalist Watermark */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none select-none">
                   <span className="text-9xl font-korean">화음</span>
                </div>
                
                {/* Turntable Visual */}
                <div className="absolute top-10 left-10 w-64 h-64 opacity-20 pointer-events-none md:block hidden transform -rotate-12">
                   <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                      {/* ... Turntable SVG Content ... */}
                      <rect x="0" y="0" width="200" height="200" rx="4" fill="#e0e0e0" stroke="#ccc" />
                      <circle cx="100" cy="100" r="90" fill="#222" opacity="0.1" />
                      <circle cx="100" cy="100" r="25" fill="#F4D35E" />
                   </svg>
                </div>

                <div className="p-12 md:p-20 relative">
                    {/* ... About Content ... */}
                    <div className="text-center mb-16 relative flex justify-center pt-8">
                         <h1 className="font-brush text-6xl text-[#08303F]">Hwa-Eum</h1>
                    </div>
                    {/* ... Rest of About Page ... */}
                    <div className="text-center text-gray-500">
                        <p>Project documentation...</p>
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
                    {/* INK BRUSH TITLE */}
                    <text x="305" y="155" textAnchor="middle" fontFamily="Nanum Brush Script" fontSize="280" fill="#000" opacity="0.1" style={{ filter: 'url(#rough-ink)' }}>화음</text>
                    <text x="300" y="150" textAnchor="middle" fontFamily="Nanum Brush Script" fontSize="280" fill="url(#drawingTitleGradient)" style={{ filter: 'url(#rough-ink)' }} className="drop-shadow-sm">화음</text>
                    {/* FOREGROUND SCRIPT */}
                    <g transform="translate(300, 150) scale(1.2, 1)">
                        <text x="0" y="0" textAnchor="middle" fontFamily="Mrs Saint Delafield" fontSize="240" fill="url(#drawingGoldGradient)" className="mix-blend-multiply">Hwaeun</text>
                    </g>
                    {/* SLOGAN */}
                    <text x="300" y="240" textAnchor="middle" fontSize="28" fontFamily="Nanum Pen Script" fill="#5C7081" letterSpacing="3">그림이 소리가 되는 순간</text>
                </svg>
            </div>
            
            {/* ✨✨✨ THE CANVAS ✨✨✨ */}
            <div className="z-10">
              <DrawingCanvas 
                 ref={canvasRef} // 👈 Connect Ref here
                 onExport={() => {}} // Empty function, we trigger manually now
                 isPlaying={isPlaying}
                 recommendation={recommendation}
                 isAnalyzing={isAnalyzing}
                 onPlayToggle={handlePlayToggle}
              />
            </div>

            {/* ✨✨✨ THE GENERATE BUTTON ✨✨✨ */}
            {/* Only show this button if we haven't generated music yet, or if we want to regenerate */}
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
                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 rounded-full bg-[#F4D35E] opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                </button>
            </div>

            {/* Controls Rack for Fine Tuning */}
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

      {/* GLOBAL FOOTER (Z-Index 10) */}
      <Footer />

    </div>
  );
};

export default App;