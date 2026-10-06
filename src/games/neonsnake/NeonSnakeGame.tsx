import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RotateCcw, ArrowUp, ArrowDown, ArrowLeft as LeftIcon, ArrowRight, Trophy } from 'lucide-react';
import { bridge } from '../../sdk/MeGameBridge';

interface NeonSnakeGameProps {
  onBackToHub: () => void;
}

const GRID_SIZE = 18;
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Point {
  x: number;
  y: number;
}

type PowerUpType = 'speed' | 'slow' | 'diamond' | null;

interface PowerUpItem {
  type: PowerUpType;
  x: number;
  y: number;
  expiresAt: number;
}

export const NeonSnakeGame: React.FC<NeonSnakeGameProps> = ({ onBackToHub }) => {
  const [snake, setSnake] = useState<Point[]>([
    { x: 9, y: 9 },
    { x: 9, y: 10 },
    { x: 9, y: 11 }
  ]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [powerUp, setPowerUp] = useState<PowerUpItem | null>(null);
  const [activeBuff, setActiveBuff] = useState<PowerUpType>(null);
  const [buffTimeLeft, setBuffTimeLeft] = useState<number>(0);
  const [dir, setDir] = useState<Direction>('UP');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('megamehub_snake_best') || '0', 10);
  });
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  const nextDir = useRef<Direction>('UP');

  const spawnFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      const onSnake = currentSnake.some(s => s.x === newFood.x && s.y === newFood.y);
      if (!onSnake) break;
    }
    return newFood;
  }, []);

  const spawnPowerUp = useCallback((currentSnake: Point[]): PowerUpItem | null => {
    if (Math.random() > 0.4) return null; // 40% chance to spawn when food eaten
    const types: PowerUpType[] = ['speed', 'slow', 'diamond'];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    let p: Point;
    while (true) {
      p = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      if (!currentSnake.some(s => s.x === p.x && s.y === p.y)) break;
    }

    return {
      type: chosenType,
      x: p.x,
      y: p.y,
      expiresAt: Date.now() + 8000
    };
  }, []);

  const resetGame = () => {
    const initialSnake: Point[] = [
      { x: 9, y: 9 },
      { x: 9, y: 10 },
      { x: 9, y: 11 }
    ];
    setSnake(initialSnake);
    setFood(spawnFood(initialSnake));
    setPowerUp(null);
    setActiveBuff(null);
    setBuffTimeLeft(0);
    setDir('UP');
    nextDir.current = 'UP';
    setScore(0);
    setIsGameOver(false);
    setIsRunning(true);
    bridge.playSfx('click');
  };

  const changeDirection = (newDir: Direction) => {
    if (
      (newDir === 'UP' && dir !== 'DOWN') ||
      (newDir === 'DOWN' && dir !== 'UP') ||
      (newDir === 'LEFT' && dir !== 'RIGHT') ||
      (newDir === 'RIGHT' && dir !== 'LEFT')
    ) {
      nextDir.current = newDir;
      bridge.playSfx('tick');
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          changeDirection('RIGHT');
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dir]);

  // Buff countdown timer
  useEffect(() => {
    if (!activeBuff) return;
    const timer = setInterval(() => {
      setBuffTimeLeft(t => {
        if (t <= 1) {
          setActiveBuff(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeBuff]);

  // Main Snake Game Loop
  useEffect(() => {
    if (!isRunning || isGameOver) return;

    let baseSpeed = 130 - Math.min(Math.floor(score / 50) * 8, 70);
    if (activeBuff === 'speed') baseSpeed = 70;
    if (activeBuff === 'slow') baseSpeed = 190;

    const interval = setInterval(() => {
      setSnake(prevSnake => {
        const head = { ...prevSnake[0] };
        const currentMovingDir = nextDir.current;
        setDir(currentMovingDir);

        switch (currentMovingDir) {
          case 'UP':
            head.y -= 1;
            break;
          case 'DOWN':
            head.y += 1;
            break;
          case 'LEFT':
            head.x -= 1;
            break;
          case 'RIGHT':
            head.x += 1;
            break;
        }

        // Wall Collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setIsGameOver(true);
          bridge.playSfx('gameover');
          bridge.recordGameResult({
            gameId: 'neonsnake',
            score,
            coinsEarned: Math.floor(score / 20)
          });
          return prevSnake;
        }

        // Self Body Collision
        if (prevSnake.some(seg => seg.x === head.x && seg.y === head.y)) {
          setIsGameOver(true);
          bridge.playSfx('gameover');
          bridge.recordGameResult({
            gameId: 'neonsnake',
            score,
            coinsEarned: Math.floor(score / 20)
          });
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Eat Food
        if (head.x === food.x && head.y === food.y) {
          bridge.playSfx('correct');
          const multiplier = activeBuff === 'speed' ? 2 : 1;
          const points = 10 * multiplier;
          const nextScore = score + points;
          setScore(nextScore);

          if (nextScore > highScore) {
            setHighScore(nextScore);
            localStorage.setItem('megamehub_snake_best', nextScore.toString());
          }

          setFood(spawnFood(newSnake));

          // Maybe spawn power-up
          if (!powerUp) {
            const nextP = spawnPowerUp(newSnake);
            if (nextP) setPowerUp(nextP);
          }
        } else if (powerUp && head.x === powerUp.x && head.y === powerUp.y) {
          // Eat Power Up!
          bridge.playSfx('victory');
          if (powerUp.type === 'diamond') {
            setScore(s => s + 50);
          } else {
            setActiveBuff(powerUp.type);
            setBuffTimeLeft(5);
          }
          setPowerUp(null);
          newSnake.pop();
        } else {
          newSnake.pop();
        }

        // Check powerup expiration
        if (powerUp && Date.now() > powerUp.expiresAt) {
          setPowerUp(null);
        }

        return newSnake;
      });
    }, baseSpeed);

    return () => clearInterval(interval);
  }, [isRunning, isGameOver, food, score, powerUp, activeBuff, highScore, spawnFood, spawnPowerUp]);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 max-w-md mx-auto select-none">
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

        <div className="flex items-center gap-2">
          {activeBuff && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-bold animate-pulse">
              {activeBuff === 'speed' ? '⚡ Turbo x2' : '🐢 Slow Motion'} ({buffTimeLeft}s)
            </div>
          )}
          <button
            onClick={resetGame}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            title="เริ่มเกมใหม่"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Title & Score Bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            NEON SNAKE 2.0
          </h1>
          <p className="text-[11px] text-slate-400">เก็บแอปเปิ้ล & บัฟไอเทมพิเศษ</p>
        </div>

        <div className="flex gap-2">
          <div className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl flex flex-col items-center min-w-[64px]">
            <span className="text-[9px] text-slate-400 uppercase font-bold">SCORE</span>
            <span className="text-sm font-black text-emerald-400 font-mono">{score}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl flex flex-col items-center min-w-[64px]">
            <span className="text-[9px] text-slate-400 uppercase font-bold">BEST</span>
            <span className="text-sm font-black text-amber-400 font-mono">{highScore}</span>
          </div>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="relative bg-slate-900/90 border-2 border-emerald-500/30 rounded-3xl p-2 aspect-square shadow-2xl flex flex-col justify-between overflow-hidden shadow-emerald-500/10">
        <div className="grid grid-cols-18 grid-rows-18 gap-[2px] w-full h-full bg-black/60 rounded-2xl p-1">
          {Array.from({ length: GRID_SIZE }).map((_, y) =>
            Array.from({ length: GRID_SIZE }).map((_, x) => {
              const isHead = snake[0].x === x && snake[0].y === y;
              const isBody = snake.slice(1).some(s => s.x === x && s.y === y);
              const isFood = food.x === x && food.y === y;
              const isPower = powerUp && powerUp.x === x && powerUp.y === y;

              return (
                <div
                  key={`${x}-${y}`}
                  className={`rounded-[3px] transition-all duration-75 flex items-center justify-center ${
                    isHead
                      ? 'bg-emerald-400 shadow-[0_0_12px_#34d399] z-10 scale-105'
                      : isBody
                      ? 'bg-emerald-500/80 shadow-[0_0_6px_#059669]'
                      : isFood
                      ? 'bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-bounce scale-110'
                      : isPower
                      ? powerUp.type === 'speed'
                        ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b] animate-pulse'
                        : powerUp.type === 'slow'
                        ? 'bg-cyan-400 shadow-[0_0_12px_#06b6d4] animate-pulse'
                        : 'bg-purple-400 shadow-[0_0_12px_#c084fc] animate-pulse'
                      : 'bg-slate-900/40'
                  }`}
                >
                  {isFood && <span className="text-[9px]">🍎</span>}
                  {isPower && (
                    <span className="text-[9px]">
                      {powerUp.type === 'speed' ? '⚡' : powerUp.type === 'slow' ? '🐢' : '💎'}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Game Over Modal */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center z-20 animate-scale-up">
            <Trophy className="w-14 h-14 text-rose-500 mb-2" />
            <h2 className="text-2xl font-black text-rose-400 mb-1">GAME OVER!</h2>
            <p className="text-xs text-slate-400 mb-1">ชนขอบหรือหางตัวเอง</p>
            <p className="text-sm font-bold text-emerald-400 mb-6 font-mono">คะแนนที่ทำได้: {score}</p>
            <button
              onClick={resetGame}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm shadow-lg hover:brightness-110 active:scale-95"
            >
              เล่นอีกครั้ง
            </button>
          </div>
        )}
      </div>

      {/* D-Pad Controller */}
      <div className="mt-auto pt-3 flex flex-col items-center gap-1.5">
        <button
          onClick={() => changeDirection('UP')}
          className="w-14 h-12 rounded-2xl bg-slate-900 border border-slate-800 active:bg-slate-800 text-slate-300 font-black shadow flex items-center justify-center text-lg active:scale-95"
        >
          <ArrowUp className="w-5 h-5 text-emerald-400" />
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => changeDirection('LEFT')}
            className="w-14 h-12 rounded-2xl bg-slate-900 border border-slate-800 active:bg-slate-800 text-slate-300 font-black shadow flex items-center justify-center text-lg active:scale-95"
          >
            <LeftIcon className="w-5 h-5 text-emerald-400" />
          </button>
          <button
            onClick={() => changeDirection('DOWN')}
            className="w-14 h-12 rounded-2xl bg-slate-900 border border-slate-800 active:bg-slate-800 text-slate-300 font-black shadow flex items-center justify-center text-lg active:scale-95"
          >
            <ArrowDown className="w-5 h-5 text-emerald-400" />
          </button>
          <button
            onClick={() => changeDirection('RIGHT')}
            className="w-14 h-12 rounded-2xl bg-slate-900 border border-slate-800 active:bg-slate-800 text-slate-300 font-black shadow flex items-center justify-center text-lg active:scale-95"
          >
            <ArrowRight className="w-5 h-5 text-emerald-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
