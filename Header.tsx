
import React from 'react';
import { AppState } from '../types';

interface HeaderProps {
  setAppState: (state: AppState) => void;
  currentState: AppState;
}

const Header: React.FC<HeaderProps> = ({ setAppState, currentState }) => {
  return (
    <header className="w-full h-20 md:h-24 relative z-50 shadow-sm bg-[#08303F] border-b border-white/10 transition-all duration-300">
      
      {/* Studio Grid Texture Overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

      <nav className="relative z-30 flex items-center justify-between h-full px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        
        {/* LEFT GROUP: Navigation */}
        <div className="flex gap-4 md:gap-12 items-center">
            
            {/* HOME */}
            <button 
              onClick={() => setAppState(AppState.HOME)}
              className={`font-serif text-[10px] md:text-sm tracking-[0.1em] md:tracking-[0.25em] uppercase transition-all duration-500 ${currentState === AppState.HOME ? 'text-white border-b border-white/50' : 'text-white/60 hover:text-white hover:tracking-[0.15em] md:hover:tracking-[0.3em]'}`}
            >
              Home
            </button>

            {/* ABOUT */}
            <button 
              onClick={() => setAppState(AppState.ABOUT)}
              className={`font-serif text-[10px] md:text-sm tracking-[0.1em] md:tracking-[0.25em] uppercase transition-all duration-500 ${currentState === AppState.ABOUT ? 'text-white border-b border-white/50' : 'text-white/60 hover:text-white hover:tracking-[0.15em] md:hover:tracking-[0.3em]'}`}
            >
              About
            </button>

            {/* HWAEUN (Studio Label) */}
            <button 
              onClick={() => setAppState(AppState.DRAWING)}
              className={`font-serif text-[10px] md:text-sm tracking-[0.1em] md:tracking-[0.25em] uppercase transition-colors duration-300 flex items-center gap-2 ${currentState === AppState.DRAWING ? 'text-macaron-yellow' : 'text-white hover:text-macaron-yellow'}`}
            >
               <span>Hwaeun</span>
               {currentState === AppState.DRAWING && (
                 <div className="w-1.5 h-1.5 bg-macaron-yellow rounded-full shadow-[0_0_8px_#F4D35E] hidden md:block"></div>
               )}
            </button>
        </div>

        {/* RIGHT GROUP: Studio Status */}
        <div className="flex items-center gap-4">
           {/* "REC" Indicator */}
           <div className="flex items-center gap-2 border border-white/10 px-2 py-1 md:px-3 rounded-full bg-black/20">
              <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-serif text-[8px] md:text-[10px] uppercase text-white/60 tracking-[0.1em] md:tracking-[0.2em]">Studio Gyu & Jia</span>
           </div>
        </div>

      </nav>
      
    </header>
  );
};

export default Header;
