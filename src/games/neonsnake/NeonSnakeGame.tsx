import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RotateCcw, ArrowUp, ArrowDown, ArrowLeft as LeftIcon, ArrowRight, Trophy } from 'lucide-react';
import { bridge } from '../../sdk/MeGameBridge';

interface NeonSnakeGameProps {
  onBackToHub: () => void;
}

const GRID_SIZE = 16;
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
interface Point {
  x: number;
  y: number;
}

export const NeonSnakeGame: React.FC<NeonSnakeGameProps> = ({ onBackToHub }) => {
  const [snake, setSnake] = useState<Point[]>([
    { x: 8, y: 8 },
    { x: 8, y: 9 },
    { x: 8, y: 10 }
  ]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [dir, setDir] = useState<Direction>('UP');
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isRunning, setIsRunning] = useState(true);

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

  const resetGame = () => {
    const initialSnake: Point[] = [
      { x: 8, y: 8 },
      { x: 8, y: 9 },
      { x: 8, y: 10 }
    ];
    setSnake(initialSnake);
    setFood(spawnFood(initialSnake));
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
      bridge.playSfx('click');
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          changeDirection('RIGHT');
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dir]);

  // Main game loop
  useEffect(() => {
    if (!isRunning || isGameOver) return;

    const interval = setInterval(() => {
      setDir(nextDir.current);
      setSnake(prevSnake => {
        const head = { ...prevSnake[0] };
        switch (nextDir.current) {
          case 'UP': head.y -= 1; break;
          case 'DOWN': head.y += 1; break;
          case 'LEFT': head.x -= 1; break;
          case 'RIGHT': head.x += 1; break;
        }

        // Wall Collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          handleDeath();
          return prevSnake;
        }

        // Self Collision
        if (prevSnake.some(seg => seg.x === head.x && seg.y === head.y)) {
          handleDeath();
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Eat food
        if (head.x === food.x && head.y === food.y) {
          bridge.playSfx('correct');
          setScore(s => s + 10);
          setFood(spawnFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isRunning, isGameOver, food, spawnFood]);

  const handleDeath = () => {
    setIsGameOver(true);
    setIsRunning(false);
    bridge.playSfx('gameover');
    bridge.recordGameResult({
      gameId: 'neonsnake',
      score,
      coinsEarned: Math.floor(score / 2)
    });
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 max-w-xl mx-auto select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
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

        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-xl font-mono text-sm">
          <span className="text-slate-400">คะแนน:</span>
          <span className="text-emerald-400 font-bold text-lg">{score}</span>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="relative aspect-square w-full max-w-[420px] mx-auto bg-slate-900 border-2 border-emerald-500/40 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-500/10 p-2">
        <div 
          className="w-full h-full grid"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
          }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
            const x = idx % GRID_SIZE;
            const y = Math.floor(idx / GRID_SIZE);
            const isHead = snake[0]?.x === x && snake[0]?.y === y;
            const isSnake = snake.some(s => s.x === x && s.y === y);
            const isFood = food.x === x && food.y === y;

            return (
              <div
                key={idx}
                className={`transition-all duration-75 rounded-sm ${
                  isHead
                    ? 'bg-emerald-400 shadow-md shadow-emerald-400'
                    : isSnake
                    ? 'bg-emerald-600/90'
                    : isFood
                    ? 'bg-rose-500 rounded-full animate-ping shadow-lg shadow-rose-500'
                    : 'bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <Trophy className="w-12 h-12 text-rose-400 mb-2" />
            <h3 className="text-2xl font-black text-white mb-1">จบเกม!</h3>
            <p className="text-slate-400 text-sm mb-4">ทำคะแนนได้ {score} แต้ม</p>
            <button
              onClick={resetGame}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:brightness-110 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>เล่นใหม่อีกรอบ</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile D-Pad Controls */}
      <div className="mt-6 flex flex-col items-center gap-2 pb-6">
        <button
          onClick={() => changeDirection('UP')}
          className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 active:bg-emerald-600 flex items-center justify-center text-slate-200"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => changeDirection('LEFT')}
            className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 active:bg-emerald-600 flex items-center justify-center text-slate-200"
          >
            <LeftIcon className="w-6 h-6" />
          </button>
          <button
            onClick={() => changeDirection('DOWN')}
            className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 active:bg-emerald-600 flex items-center justify-center text-slate-200"
          >
            <ArrowDown className="w-6 h-6" />
          </button>
          <button
            onClick={() => changeDirection('RIGHT')}
            className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 active:bg-emerald-600 flex items-center justify-center text-slate-200"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
