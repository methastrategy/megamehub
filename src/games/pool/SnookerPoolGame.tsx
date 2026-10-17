import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import confetti from 'canvas-confetti';
import { bridge } from '../../sdk/MeGameBridge';

interface SnookerPoolGameProps {
  onBackToHub: () => void;
}

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isCue?: boolean;
  isEight?: boolean;
  isStriped?: boolean;
  number?: number;
  pocketed: boolean;
}

const TABLE_WIDTH = 700;
const TABLE_HEIGHT = 380;
const BALL_RADIUS = 10;
const FRICTION = 0.985;
const POCKET_RADIUS = 20;

const POCKETS = [
  { x: 26, y: 26 },
  { x: TABLE_WIDTH / 2, y: 20 },
  { x: TABLE_WIDTH - 26, y: 26 },
  { x: 26, y: TABLE_HEIGHT - 26 },
  { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - 20 },
  { x: TABLE_WIDTH - 26, y: TABLE_HEIGHT - 26 },
];

export const SnookerPoolGame: React.FC<SnookerPoolGameProps> = ({ onBackToHub }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [balls, setBalls] = useState<Ball[]>([]);
  const [aimAngle, setAimAngle] = useState<number>(0);
  const [power, setPower] = useState<number>(30);
  const [isAiming, setIsAiming] = useState<boolean>(true);
  const [ballsMoving, setBallsMoving] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [pocketsCount, setPocketsCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [gameMode, setGameMode] = useState<'8ball' | 'snooker'>('8ball');
  const [statusText, setStatusText] = useState<string>('ลากเล็งมุม แล้วดึงไม้คิวปล่อยเพื่อยิง');

  // Initialize Balls
  const initBalls = useCallback((mode: '8ball' | 'snooker') => {
    const list: Ball[] = [];

    // White Cue Ball
    list.push({
      id: 0,
      x: 180,
      y: TABLE_HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      color: '#ffffff',
      isCue: true,
      pocketed: false,
    });

    if (mode === '8ball') {
      // 8-Ball Triangle Rack
      const colors = [
        '#facc15', '#3b82f6', '#ef4444', '#a855f7', '#f97316', '#10b981', '#991b1b',
        '#000000', // 8-Ball
        '#fde047', '#60a5fa', '#f87171', '#c084fc', '#fb923c', '#34d399', '#fca5a5'
      ];

      const startX = 480;
      const startY = TABLE_HEIGHT / 2;
      let count = 0;

      for (let row = 0; row < 5; row++) {
        for (let col = 0; col <= row; col++) {
          const ballX = startX + row * (BALL_RADIUS * 1.75);
          const ballY = startY + (col - row / 2) * (BALL_RADIUS * 2.05);

          const isEight = count === 4; // center ball
          const isCue = false;
          list.push({
            id: count + 1,
            x: ballX,
            y: ballY,
            vx: 0,
            vy: 0,
            radius: BALL_RADIUS,
            color: isEight ? '#090d16' : colors[count % colors.length],
            isCue,
            isEight,
            number: count + 1,
            pocketed: false
          });
          count++;
        }
      }
    } else {
      // Snooker Red Pack
      const startX = 480;
      const startY = TABLE_HEIGHT / 2;
      let count = 0;

      for (let row = 0; row < 4; row++) {
        for (let col = 0; col <= row; col++) {
          const ballX = startX + row * (BALL_RADIUS * 1.75);
          const ballY = startY + (col - row / 2) * (BALL_RADIUS * 2.05);
          list.push({
            id: count + 1,
            x: ballX,
            y: ballY,
            vx: 0,
            vy: 0,
            radius: BALL_RADIUS,
            color: '#dc2626',
            number: count + 1,
            pocketed: false
          });
          count++;
        }
      }
    }

    setBalls(list);
    setScore(0);
    setPocketsCount(0);
    setIsAiming(true);
    setBallsMoving(false);
    setStatusText('โต๊ะเซ็ตพร้อมแล้ว! เล็งไม้คิวแล้วยิงได้เลย');
  }, []);

  useEffect(() => {
    initBalls(gameMode);
  }, [initBalls, gameMode]);

  // Shoot Cue Ball
  const shoot = () => {
    if (ballsMoving) return;
    const cueBall = balls.find(b => b.isCue && !b.pocketed);
    if (!cueBall) return;

    if (soundEnabled) bridge.playSfx('click');

    const shotPower = (power / 100) * 22;
    cueBall.vx = Math.cos(aimAngle) * shotPower;
    cueBall.vy = Math.sin(aimAngle) * shotPower;

    setBalls([...balls]);
    setIsAiming(false);
    setBallsMoving(true);
    setStatusText('ลูกกำลังกลิ้ง...');
  };

  // Main 2D Physics Loop
  useEffect(() => {
    let animationId: number;

    const updatePhysics = () => {
      let isMoving = false;

      // Update positions & friction
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (b.pocketed) continue;

        b.x += b.vx;
        b.y += b.vy;
        b.vx *= FRICTION;
        b.vy *= FRICTION;

        if (Math.abs(b.vx) < 0.05) b.vx = 0;
        if (Math.abs(b.vy) < 0.05) b.vy = 0;

        if (b.vx !== 0 || b.vy !== 0) {
          isMoving = true;
        }

        // Cushion Bounces (Cushion boundary inside table)
        const leftBound = 36 + b.radius;
        const rightBound = TABLE_WIDTH - 36 - b.radius;
        const topBound = 36 + b.radius;
        const bottomBound = TABLE_HEIGHT - 36 - b.radius;

        if (b.x < leftBound) {
          b.x = leftBound;
          b.vx = -b.vx * 0.9;
        } else if (b.x > rightBound) {
          b.x = rightBound;
          b.vx = -b.vx * 0.9;
        }

        if (b.y < topBound) {
          b.y = topBound;
          b.vy = -b.vy * 0.9;
        } else if (b.y > bottomBound) {
          b.y = bottomBound;
          b.vy = -b.vy * 0.9;
        }

        // Pocket Detection
        for (const pocket of POCKETS) {
          const pdx = b.x - pocket.x;
          const pdy = b.y - pocket.y;
          const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

          if (pdist < POCKET_RADIUS) {
            b.pocketed = true;
            b.vx = 0;
            b.vy = 0;

            if (b.isCue) {
              // Scratch! Cue ball pocketed
              setStatusText('❌ ฟาวล์! ลูกขาวลงหลุม');
              setTimeout(() => {
                b.pocketed = false;
                b.x = 180;
                b.y = TABLE_HEIGHT / 2;
                b.vx = 0;
                b.vy = 0;
                setBalls([...balls]);
              }, 600);
            } else {
              if (soundEnabled) bridge.playSfx('correct');
              setPocketsCount(c => c + 1);
              setScore(s => s + 100);
              setStatusText(`🎯 ลูกหมายเลข ${b.number || ''} ลงหลุม! +100 แต้ม`);
              if (b.isEight) {
                confetti({ particleCount: 100, spread: 80 });
                setStatusText('🏆 ชนะเลิศ! คุณลงลูกดำ 8 สำเร็จ!');
              }
            }
          }
        }
      }

      // Ball-to-Ball Elastic Collisions
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const b1 = balls[i];
          const b2 = balls[j];

          if (b1.pocketed || b2.pocketed) continue;

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < b1.radius + b2.radius) {
            // Overlap correction
            const overlap = (b1.radius + b2.radius - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;

            b1.x -= nx * overlap;
            b1.y -= ny * overlap;
            b2.x += nx * overlap;
            b2.y += ny * overlap;

            // Elastic normal momentum transfer
            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const p = 2 * (nx * kx + ny * ky) / 2;

            b1.vx -= p * nx;
            b1.vy -= p * ny;
            b2.vx += p * nx;
            b2.vy += p * ny;
          }
        }
      }

      setBallsMoving(isMoving);
      if (!isMoving && !isAiming) {
        setIsAiming(true);
      }

      drawCanvas();
      animationId = requestAnimationFrame(updatePhysics);
    };

    animationId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationId);
  }, [balls, isAiming, soundEnabled]);

  // Canvas Rendering
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // Wood Rail Outer
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.roundRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT, 24);
    ctx.fill();

    // Gold Rail Accent Line
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Green Felt Bed
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.roundRect(26, 26, TABLE_WIDTH - 52, TABLE_HEIGHT - 52, 16);
    ctx.fill();

    // Baulk Line & "D" for Snooker / Pool
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(180, 36);
    ctx.lineTo(180, TABLE_HEIGHT - 36);
    ctx.stroke();

    // 6 Pockets
    for (const pocket of POCKETS) {
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Pocket Brass Rim
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Cue Ball Aiming Guideline
    const cueBall = balls.find(b => b.isCue && !b.pocketed);
    if (cueBall && isAiming && !ballsMoving) {
      const lineLen = 140;
      const targetX = cueBall.x + Math.cos(aimAngle) * lineLen;
      const targetY = cueBall.y + Math.sin(aimAngle) * lineLen;

      // Laser Guide Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cueBall.x, cueBall.y);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cue Stick Drawing behind Cue Ball
      const stickDist = 30 + (power / 100) * 40;
      const cueStartX = cueBall.x - Math.cos(aimAngle) * stickDist;
      const cueStartY = cueBall.y - Math.sin(aimAngle) * stickDist;
      const cueEndX = cueBall.x - Math.cos(aimAngle) * (stickDist + 180);
      const cueEndY = cueBall.y - Math.sin(aimAngle) * (stickDist + 180);

      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cueStartX, cueStartY);
      ctx.lineTo(cueEndX, cueEndY);
      ctx.stroke();

      // Cue Tip White Chalk
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cueStartX, cueStartY);
      ctx.lineTo(
        cueStartX - Math.cos(aimAngle) * 8,
        cueStartY - Math.sin(aimAngle) * 8
      );
      ctx.stroke();
    }

    // Draw Balls
    for (const b of balls) {
      if (b.pocketed) continue;

      ctx.save();
      // Drop shadow
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Specular highlight reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(b.x - 3, b.y - 3, b.radius / 3, 0, Math.PI * 2);
      ctx.fill();

      // Number badge for 8-ball
      if (b.number && !b.isCue) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius / 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.number.toString(), b.x, b.y);
      }
    }
  };

  // Canvas Mouse Aiming
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (ballsMoving) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = TABLE_WIDTH / rect.width;
    const scaleY = TABLE_HEIGHT / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const cueBall = balls.find(b => b.isCue && !b.pocketed);
    if (cueBall) {
      const angle = Math.atan2(mouseY - cueBall.y, mouseX - cueBall.x);
      setAimAngle(angle);
    }
  };

  // Canvas Mobile Touch Aiming
  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (ballsMoving) return;
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = TABLE_WIDTH / rect.width;
    const scaleY = TABLE_HEIGHT / rect.height;
    const touchX = (touch.clientX - rect.left) * scaleX;
    const touchY = (touch.clientY - rect.top) * scaleY;

    const cueBall = balls.find(b => b.isCue && !b.pocketed);
    if (cueBall) {
      const angle = Math.atan2(touchY - cueBall.y, touchX - cueBall.x);
      setAimAngle(angle);
    }
  };


  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 max-w-4xl mx-auto select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => {
            bridge.playSfx('click');
            onBackToHub();
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Hub</span>
        </button>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => setGameMode('8ball')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              gameMode === '8ball' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
            }`}
          >
            🎱 8-Ball Pool
          </button>
          <button
            onClick={() => setGameMode('snooker')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              gameMode === 'snooker' ? 'bg-rose-600 text-white shadow' : 'text-slate-400'
            }`}
          >
            🔴 สนุ๊กเกอร์ (Snooker)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(s => !s)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={() => initBalls(gameMode)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            title="รีเซ็ตโต๊ะ"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Info & Score Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-2xl mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-400 font-bold">{statusText}</span>
        </div>
        <div className="flex items-center gap-3 font-mono font-bold text-xs">
          <span className="text-slate-400">ลงหลุม: <b className="text-white">{pocketsCount}</b></span>
          <span className="text-amber-400">คะแนน: {score}</span>
        </div>
      </div>

      {/* Canvas Table Arena */}
      <div className="relative w-full aspect-[700/380] bg-slate-900/50 rounded-3xl p-2 border-2 border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={TABLE_WIDTH}
          height={TABLE_HEIGHT}
          onMouseMove={handleCanvasMouseMove}
          onTouchMove={handleCanvasTouchMove}
          onTouchStart={handleCanvasTouchMove}
          onClick={shoot}
          className="w-full h-full rounded-2xl cursor-crosshair touch-none"
        />

      </div>

      {/* Bottom Cue Power Slider & Controls */}
      <div className="mt-4 p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Angle Adjuster (Buttons for Mobile touch precision) */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-400 mr-1">มุมเล็ง:</span>
          <button
            onClick={() => setAimAngle(a => a - 0.05)}
            className="flex-1 sm:flex-none px-3 py-2 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-white active:scale-95"
          >
            ↺ -5°
          </button>
          <button
            onClick={() => setAimAngle(a => a + 0.05)}
            className="flex-1 sm:flex-none px-3 py-2 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-white active:scale-95"
          >
            ↻ +5°
          </button>
        </div>

        {/* Power Slider */}
        <div className="flex items-center gap-3 w-full sm:w-72">
          <span className="text-xs font-bold text-amber-400 whitespace-nowrap">แรงแทง: {power}%</span>
          <input
            type="range"
            min="10"
            max="100"
            value={power}
            onChange={e => setPower(parseInt(e.target.value, 10))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Shoot Button */}
        <button
          disabled={ballsMoving}
          onClick={shoot}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
            ballsMoving
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 shadow-amber-500/25'
          }`}
        >
          <span>🎯 แทงลูก (SHOOT)</span>
        </button>
      </div>
    </div>
  );
};
