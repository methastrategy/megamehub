import React from 'react';

interface FirstPersonHandsProps {
  isBetting?: boolean;
  isInspecting?: boolean;
  onChipPush?: () => void;
  children?: React.ReactNode;
}

export const FirstPersonHands: React.FC<FirstPersonHandsProps> = ({
  isBetting = false,
  isInspecting = false,
  children,
}) => {
  return (
    <div className="relative w-full pointer-events-none select-none overflow-hidden flex flex-col items-center justify-end">
      {/* Cards or Controls held in player's hands */}
      <div className="pointer-events-auto relative z-20 mb-2 sm:mb-4 flex items-center justify-center">
        {children}
      </div>

      {/* First-person arms & hands SVG overlay anchored at the screen bottom */}
      <div className="relative w-full max-w-2xl h-24 sm:h-32 pointer-events-none">
        <svg
          viewBox="0 0 600 160"
          className="w-full h-full overflow-visible drop-shadow-[0_-8px_16px_rgba(0,0,0,0.6)]"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Player Arm Skin Gradient */}
            <linearGradient id="armSkin" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fde68a" />
            </linearGradient>

            {/* Wristwatch Strap */}
            <linearGradient id="leatherStrap" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Suit / Shirt Sleeve */}
            <linearGradient id="playerSleeve" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>

          {/* ================= LEFT ARM & HAND ================= */}
          <g
            className={`transition-transform duration-300 origin-[100px_160px] ${
              isBetting ? '-translate-y-4 translate-x-6' : isInspecting ? 'rotate-3' : ''
            }`}
          >
            {/* Forearm & Sleeve */}
            <path
              d="M 60 160 L 120 70 L 165 85 L 120 160 Z"
              fill="url(#playerSleeve)"
            />
            {/* White shirt cuff peeking */}
            <polygon points="118,74 138,62 158,74 138,86" fill="#f8fafc" opacity="0.9" />

            {/* Left Wrist & Hand */}
            <path
              d="M 125 70 C 135 50, 155 35, 175 42 C 185 45, 190 60, 182 72 C 172 85, 150 90, 135 80 Z"
              fill="url(#armSkin)"
            />
            {/* Fingers holding cards / resting on felt */}
            <path
              d="M 165 42 C 180 32, 200 35, 205 45 C 205 52, 195 60, 180 58"
              fill="url(#armSkin)"
              stroke="#b45309"
              strokeWidth="1"
            />
            <path
              d="M 172 52 C 190 42, 210 46, 212 56 C 212 62, 200 68, 185 66"
              fill="url(#armSkin)"
              stroke="#b45309"
              strokeWidth="1"
            />
            {/* Luxury Sports Watch on Left Wrist */}
            <rect
              x="122"
              y="66"
              width="24"
              height="10"
              rx="2"
              fill="url(#leatherStrap)"
              transform="rotate(-30 134 71)"
            />
            <circle
              cx="134"
              cy="71"
              r="7"
              fill="#0284c7"
              stroke="#f59e0b"
              strokeWidth="2"
            />
            <circle cx="134" cy="71" r="2" fill="#f8fafc" />
          </g>

          {/* ================= RIGHT ARM & HAND ================= */}
          <g
            className={`transition-transform duration-300 origin-[500px_160px] ${
              isBetting ? '-translate-y-6 -translate-x-8' : isInspecting ? '-rotate-3' : ''
            }`}
          >
            {/* Forearm & Sleeve */}
            <path
              d="M 540 160 L 480 70 L 435 85 L 480 160 Z"
              fill="url(#playerSleeve)"
            />
            {/* White shirt cuff */}
            <polygon points="482,74 462,62 442,74 462,86" fill="#f8fafc" opacity="0.9" />

            {/* Right Wrist & Hand */}
            <path
              d="M 475 70 C 465 50, 445 35, 425 42 C 415 45, 410 60, 418 72 C 428 85, 450 90, 465 80 Z"
              fill="url(#armSkin)"
            />
            {/* Fingers pointing or placing chips */}
            <path
              d="M 435 42 C 420 32, 400 35, 395 45 C 395 52, 405 60, 420 58"
              fill="url(#armSkin)"
              stroke="#b45309"
              strokeWidth="1"
            />
            <path
              d="M 428 52 C 410 42, 390 46, 388 56 C 388 62, 400 68, 415 66"
              fill="url(#armSkin)"
              stroke="#b45309"
              strokeWidth="1"
            />
            {/* Gold Ring on Finger */}
            <ellipse cx="410" cy="48" rx="3" ry="5" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
          </g>
        </svg>
      </div>
    </div>
  );
};
