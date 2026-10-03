import React from 'react';
import type { Card } from './CardTypes';
import { SUIT_INFO } from './CardTypes';

interface CardVisualProps {
  card?: Card | null;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CardVisual: React.FC<CardVisualProps> = ({
  card,
  faceDown = false,
  selected = false,
  onClick,
  size = 'md',
  className = ''
}) => {
  const isHidden = faceDown || !card || card.faceUp === false;

  const sizeClasses = {
    sm: 'w-10 h-14 text-xs rounded-lg',
    md: 'w-14 h-20 sm:w-16 sm:h-24 text-sm sm:text-base rounded-xl',
    lg: 'w-20 h-28 sm:w-24 sm:h-34 text-lg sm:text-xl rounded-2xl'
  }[size];

  if (isHidden) {
    return (
      <div
        onClick={onClick}
        className={`relative ${sizeClasses} bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 border-2 border-indigo-500/50 shadow-md flex items-center justify-center cursor-pointer select-none transition-all duration-200 ${
          selected ? '-translate-y-2 ring-2 ring-indigo-400' : 'hover:-translate-y-1'
        } ${className}`}
      >
        <div className="w-full h-full rounded-lg border border-indigo-500/30 m-1 flex items-center justify-center">
          <span className="text-indigo-400 font-black opacity-40 text-lg">ME</span>
        </div>
      </div>
    );
  }

  const suitData = SUIT_INFO[card.suit];

  return (
    <div
      onClick={onClick}
      className={`relative ${sizeClasses} bg-slate-900 border-2 ${
        suitData.isRed ? 'border-rose-500/40 text-rose-400' : 'border-slate-700 text-slate-100'
      } shadow-lg flex flex-col justify-between p-1.5 select-none transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:-translate-y-1.5' : ''
      } ${selected ? '-translate-y-3 ring-2 ring-amber-400 shadow-amber-500/30 shadow-xl' : ''} ${className}`}
    >
      {/* Top Left Rank & Suit */}
      <div className="flex flex-col items-start leading-none font-black">
        <span>{card.rank}</span>
        <span className="text-xs">{suitData.symbol}</span>
      </div>

      {/* Center Big Suit Symbol */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-xl sm:text-2xl opacity-80">{suitData.symbol}</span>
      </div>

      {/* Bottom Right Inverted Rank & Suit */}
      <div className="flex flex-col items-end leading-none font-black rotate-180">
        <span>{card.rank}</span>
        <span className="text-xs">{suitData.symbol}</span>
      </div>
    </div>
  );
};
