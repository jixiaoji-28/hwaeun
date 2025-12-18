
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full py-8 text-center bg-[#f4f6f8] border-t border-[#08303F]/10 mt-auto">
      <div className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
        <p className="font-poster text-[10px] md:text-xs tracking-[0.3em] text-[#08303F] uppercase">
          CTP431_2025 Fundamental of Computer Music Final Project
        </p>
        <div className="w-8 h-px bg-[#08303F] my-1"></div>
        <p className="font-serif italic text-xs md:text-sm text-[#5C7081] flex items-center gap-2">
          Producers: Gyu Huh & Jiaxian Ji
          <a href="https://github.com/jixiaoji-28/hwaeun" className="inline-block">
            <img src="./github_icon.png" alt="GitHub Logo" className="w-10 h-6 hover:opacity-70 transition-opacity" />
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
