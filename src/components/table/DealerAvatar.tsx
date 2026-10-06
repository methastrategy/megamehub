import React from 'react';

export type DealerMood = 'idle' | 'dealing' | 'happy' | 'shocked' | 'cheering';

interface DealerAvatarProps {
  mood?: DealerMood;
  speechText?: string;
  name?: string;
  isDealing?: boolean;
}

export const DealerAvatar: React.FC<DealerAvatarProps> = ({
  mood = 'idle',
  speechText = 'ยินดีต้อนรับสู่โต๊ะครับ! ขอให้โชคดีนะเฮีย',
  name = 'ดีลเลอร์ สมหวัง',
  isDealing = false,
}) => {
  return (
    <div className="flex flex-col items-center select-none relative z-10">
      {/* Speech Bubble */}
      {speechText && (
        <div className="relative mb-2 max-w-xs px-3.5 py-1.5 bg-white/95 backdrop-blur-md text-slate-900 rounded-2xl shadow-xl text-xs font-bold border-2 border-amber-400 animate-bounce duration-1000 text-center">
          <span className="text-amber-600 mr-1">💬</span>
          {speechText}
          <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-amber-400" />
        </div>
      )}

      {/* Dealer Upper Body & Table Presence */}
      <div className="relative w-36 h-32 flex flex-col items-center">
        {/* Name tag floating badge */}
        <div className="absolute -top-3 px-2 py-0.5 bg-slate-900/90 border border-amber-500/60 rounded-full text-[10px] font-bold text-amber-300 tracking-wider uppercase z-20 shadow">
          🤵 {name}
        </div>

        {/* Dealer SVG Cartoon Illustration */}
        <svg
          viewBox="0 0 160 140"
          className="w-full h-full drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)] overflow-visible"
        >
          <defs>
            <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="vestGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#831843" />
              <stop offset="100%" stopColor="#500724" />
            </linearGradient>
            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>
            <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>

          {/* Shoulders & Tuxedo Suit */}
          <path
            d="M 15 140 C 20 95, 45 80, 80 80 C 115 80, 140 95, 145 140 Z"
            fill="url(#suitGrad)"
            stroke="#334155"
            strokeWidth="2"
          />

          {/* Burgundy Velvet Casino Vest */}
          <path
            d="M 45 140 C 50 100, 60 88, 80 88 C 100 88, 110 100, 115 140 Z"
            fill="url(#vestGrad)"
          />

          {/* White Shirt Collar */}
          <polygon points="80,105 66,82 94,82" fill="#f8fafc" />

          {/* Red/Gold Bowtie */}
          <g transform="translate(80, 92)">
            <polygon points="-12,-6 -12,6 0,0" fill="#dc2626" />
            <polygon points="12,-6 12,6 0,0" fill="#dc2626" />
            <circle cx="0" cy="0" r="3.5" fill="#f59e0b" />
          </g>

          {/* Head & Neck */}
          <rect x="70" y="65" width="20" height="20" rx="4" fill="url(#skinGrad)" />
          {/* Head Shape */}
          <ellipse cx="80" cy="52" rx="26" ry="28" fill="url(#skinGrad)" />

          {/* Hair */}
          <path
            d="M 54 48 C 54 22, 106 22, 106 48 C 106 32, 92 26, 80 26 C 68 26, 54 32, 54 48 Z"
            fill="url(#hairGrad)"
          />
          {/* Stylish hair swoosh */}
          <path
            d="M 60 38 Q 80 28 102 36 Q 85 32 60 38 Z"
            fill="#475569"
          />

          {/* Ears */}
          <circle cx="53" cy="53" r="5" fill="url(#skinGrad)" />
          <circle cx="107" cy="53" r="5" fill="url(#skinGrad)" />

          {/* Eyes depending on mood */}
          {mood === 'shocked' ? (
            <g>
              <circle cx="71" cy="49" r="6" fill="#ffffff" />
              <circle cx="71" cy="49" r="2.5" fill="#0f172a" />
              <circle cx="89" cy="49" r="6" fill="#ffffff" />
              <circle cx="89" cy="49" r="2.5" fill="#0f172a" />
              <line x1="65" y1="40" x2="77" y2="42" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
              <line x1="83" y1="42" x2="95" y2="40" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
            </g>
          ) : mood === 'happy' || mood === 'cheering' ? (
            <g>
              {/* Smiling curved eyes */}
              <path d="M 66 50 Q 71 43 76 50" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M 84 50 Q 89 43 94 50" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
              {/* Rosy Cheeks */}
              <circle cx="65" cy="56" r="4" fill="#f43f5e" opacity="0.4" />
              <circle cx="95" cy="56" r="4" fill="#f43f5e" opacity="0.4" />
            </g>
          ) : (
            <g>
              {/* Classic alert, focused dealer eyes */}
              <circle cx="71" cy="49" r="4" fill="#ffffff" />
              <circle cx="72" cy="49" r="2.5" fill="#0f172a" />
              <circle cx="89" cy="49" r="4" fill="#ffffff" />
              <circle cx="90" cy="49" r="2.5" fill="#0f172a" />
              {/* Confident Eyebrows */}
              <line x1="66" y1="43" x2="76" y2="44" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="84" y1="44" x2="94" y2="43" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}

          {/* Nose */}
          <path d="M 80 50 Q 82 56 78 57" stroke="#ea580c" strokeWidth="1.5" fill="none" strokeLinecap="round" />

          {/* Mouth */}
          {mood === 'shocked' ? (
            <ellipse cx="80" cy="65" rx="5" ry="7" fill="#881337" stroke="#fda4af" strokeWidth="1" />
          ) : mood === 'happy' || mood === 'cheering' ? (
            <path d="M 72 61 Q 80 72 88 61 Z" fill="#881337" stroke="#f43f5e" strokeWidth="1.5" />
          ) : (
            <path d="M 73 63 Q 80 67 87 63" stroke="#9a3412" strokeWidth="2" fill="none" strokeLinecap="round" />
          )}

          {/* Dealer Left Hand (Resting or Dealing) */}
          <g
            className={`transition-transform duration-300 origin-[30px_90px] ${
              isDealing ? 'animate-dealer-deal-left' : ''
            }`}
          >
            <path
              d="M 30 100 Q 38 120 48 135"
              stroke="#0f172a"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />
            {/* White dealer glove */}
            <ellipse cx="48" cy="135" rx="9" ry="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
          </g>

          {/* Dealer Right Hand (Dealing Cards out of Shoe) */}
          <g
            className={`transition-transform duration-300 origin-[130px_90px] ${
              isDealing ? 'animate-dealer-deal-right' : ''
            }`}
          >
            <path
              d="M 130 100 Q 120 120 110 135"
              stroke="#0f172a"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />
            {/* White dealer glove with cards */}
            <ellipse cx="110" cy="135" rx="9" ry="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
            {isDealing && (
              <rect
                x="98"
                y="126"
                width="14"
                height="20"
                rx="2"
                fill="#dc2626"
                stroke="#ffffff"
                strokeWidth="1"
                transform="rotate(-20 105 136)"
              />
            )}
          </g>

          {/* Shoe Box (Transparent Acrylic 6-Deck Shoe) */}
          <g transform="translate(118, 105)">
            <rect x="0" y="0" width="28" height="24" rx="4" fill="rgba(30, 41, 59, 0.7)" stroke="#38bdf8" strokeWidth="1.5" />
            {/* Cards inside shoe */}
            <line x1="6" y1="4" x2="6" y2="20" stroke="#f1f5f9" strokeWidth="2" />
            <line x1="10" y1="4" x2="10" y2="20" stroke="#dc2626" strokeWidth="2" />
            <line x1="14" y1="4" x2="14" y2="20" stroke="#f1f5f9" strokeWidth="2" />
            <line x1="18" y1="4" x2="18" y2="20" stroke="#3b82f6" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
};
