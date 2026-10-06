import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RotateCcw, Play, Pause, Trophy } from 'lucide-react';
import { bridge } from '../../sdk/MeGameBridge';

interface TetrisGameProps {
  onBackToHub: () => void;
}

const COLS = 10;
const ROWS = 20;

type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

interface Piece {
  type: TetrominoType;
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

const TETROMINOES: Record<TetrominoType, { shape: number[][]; color: string }> = {
  I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: '#06b6d4' },
  J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: '#3b82f6' },
  L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: '#f97316' },
  O: { shape: [[1, 1], [1, 1]], color: '#eab308' },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: '#10b981' },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: '#a855f7' },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: '#ef4444' }
};

export const TetrisGame: React.FC<TetrisGameProps> = ({ onBackToHub }) => {
  const [grid, setGrid] = useState<string[][]>(() => createEmptyGrid());
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPieceType, setNextPieceType] = useState<TetrominoType>(() => getRandomTetromino());
  const [holdPieceType, setHoldPieceType] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState<boolean>(true);
  const [score, setScore] = useState<number>(0);
  const [lines, setLines] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [bestScore, setBestScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('megamehub_tetris_best') || '0', 10);
  });

  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const dropCounterRef = useRef<number>(0);

  function createEmptyGrid(): string[][] {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(''));
  }

  function getRandomTetromino(): TetrominoType {
    const types: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    return types[Math.floor(Math.random() * types.length)];
  }

  function spawnPiece(type: TetrominoType): Piece {
    const proto = TETROMINOES[type];
    return {
      type,
      shape: proto.shape.map(row => [...row]),
      color: proto.color,
      x: Math.floor(COLS / 2) - Math.floor(proto.shape[0].length / 2),
      y: 0
    };
  }

  const resetGame = () => {
    bridge.playSfx('click');
    setGrid(createEmptyGrid());
    const firstType = getRandomTetromino();
    const nextType = getRandomTetromino();
    setCurrentPiece(spawnPiece(firstType));
    setNextPieceType(nextType);
    setHoldPieceType(null);
    setCanHold(true);
    setScore(0);
    setLines(0);
    setLevel(1);
    setIsPaused(false);
    setIsGameOver(false);
  };

  // Check collision
  const checkCollision = (piece: Piece, testGrid: string[][], offsetX = 0, offsetY = 0): boolean => {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] !== 0) {
          const newX = piece.x + c + offsetX;
          const newY = piece.y + r + offsetY;

          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true;
          }
          if (newY >= 0 && testGrid[newY][newX] !== '') {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Lock Piece into Grid and clear lines
  const lockPiece = useCallback((piece: Piece) => {
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
          if (piece.shape[r][c] !== 0) {
            const gy = piece.y + r;
            const gx = piece.x + c;
            if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
              newGrid[gy][gx] = piece.color;
            }
          }
        }
      }

      // Clear full lines
      let cleared = 0;
      const filteredGrid: string[][] = [];
      for (let r = 0; r < ROWS; r++) {
        if (newGrid[r].every(cell => cell !== '')) {
          cleared++;
        } else {
          filteredGrid.push(newGrid[r]);
        }
      }

      while (filteredGrid.length < ROWS) {
        filteredGrid.unshift(Array(COLS).fill(''));
      }

      if (cleared > 0) {
        bridge.playSfx('correct');
        const linePoints = [0, 100, 300, 500, 800];
        setScore(prev => {
          const nextScore = prev + (linePoints[cleared] || 100) * level;
          if (nextScore > bestScore) {
            setBestScore(nextScore);
            localStorage.setItem('megamehub_tetris_best', nextScore.toString());
          }
          return nextScore;
        });
        setLines(prev => {
          const nextLines = prev + cleared;
          setLevel(Math.floor(nextLines / 10) + 1);
          return nextLines;
        });
      } else {
        bridge.playSfx('tick');
      }

      // Spawn next piece
      const nextP = spawnPiece(nextPieceType);
      if (checkCollision(nextP, filteredGrid)) {
        setIsGameOver(true);
        bridge.playSfx('gameover');
        bridge.recordGameResult({
          gameId: 'tetris',
          score,
          coinsEarned: Math.floor(score / 40)
        });
      } else {
        setCurrentPiece(nextP);
        setNextPieceType(getRandomTetromino());
        setCanHold(true);
      }

      return filteredGrid;
    });
  }, [nextPieceType, level, bestScore, score]);

  // Drop piece 1 step down
  const drop = useCallback(() => {
    if (!currentPiece || isPaused || isGameOver) return;
    if (!checkCollision(currentPiece, grid, 0, 1)) {
      setCurrentPiece(prev => prev ? { ...prev, y: prev.y + 1 } : null);
    } else {
      lockPiece(currentPiece);
    }
  }, [currentPiece, grid, isPaused, isGameOver, lockPiece]);

  // Hard Drop
  const hardDrop = () => {
    if (!currentPiece || isPaused || isGameOver) return;
    let offset = 0;
    while (!checkCollision(currentPiece, grid, 0, offset + 1)) {
      offset++;
    }
    const finalPiece = { ...currentPiece, y: currentPiece.y + offset };
    bridge.playSfx('click');
    lockPiece(finalPiece);
  };

  // Move Horizontally
  const moveHoriz = (dir: -1 | 1) => {
    if (!currentPiece || isPaused || isGameOver) return;
    if (!checkCollision(currentPiece, grid, dir, 0)) {
      setCurrentPiece(prev => prev ? { ...prev, x: prev.x + dir } : null);
      bridge.playSfx('click');
    }
  };

  // Rotate Piece
  const rotatePiece = () => {
    if (!currentPiece || isPaused || isGameOver) return;
    const oldShape = currentPiece.shape;
    const rotated = oldShape[0].map((_, index) =>
      oldShape.map(row => row[index]).reverse()
    );


    const testPiece = { ...currentPiece, shape: rotated };
    // Basic wall kicks
    if (!checkCollision(testPiece, grid)) {
      setCurrentPiece(testPiece);
      bridge.playSfx('tick');
    } else if (!checkCollision(testPiece, grid, -1, 0)) {
      setCurrentPiece({ ...testPiece, x: testPiece.x - 1 });
      bridge.playSfx('tick');
    } else if (!checkCollision(testPiece, grid, 1, 0)) {
      setCurrentPiece({ ...testPiece, x: testPiece.x + 1 });
      bridge.playSfx('tick');
    }
  };

  // Hold Piece
  const handleHold = () => {
    if (!currentPiece || !canHold || isPaused || isGameOver) return;
    bridge.playSfx('click');
    const currentType = currentPiece.type;
    if (holdPieceType === null) {
      setHoldPieceType(currentType);
      setCurrentPiece(spawnPiece(nextPieceType));
      setNextPieceType(getRandomTetromino());
    } else {
      const prevHold = holdPieceType;
      setHoldPieceType(currentType);
      setCurrentPiece(spawnPiece(prevHold));
    }
    setCanHold(false);
  };

  // Initial piece spawn
  useEffect(() => {
    if (!currentPiece && !isGameOver) {
      setCurrentPiece(spawnPiece(getRandomTetromino()));
    }
  }, [currentPiece, isGameOver]);

  // Game Loop
  useEffect(() => {
    if (isPaused || isGameOver) return;

    const speed = Math.max(120, 800 - (level - 1) * 70);

    const update = (time: number) => {
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;
      dropCounterRef.current += deltaTime;

      if (dropCounterRef.current > speed) {
        drop();
        dropCounterRef.current = 0;
      }
      requestRef.current = requestAnimationFrame(update);
    };

    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(update);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [drop, level, isPaused, isGameOver]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        moveHoriz(-1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        moveHoriz(1);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        drop();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        rotatePiece();
      } else if (e.code === 'Space') {
        e.preventDefault();
        hardDrop();
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        handleHold();
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        setIsPaused(p => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveHoriz, drop, rotatePiece, hardDrop, handleHold, isGameOver]);

  // Compute ghost piece position
  const getGhostPieceY = (): number => {
    if (!currentPiece) return 0;
    let offset = 0;
    while (!checkCollision(currentPiece, grid, 0, offset + 1)) {
      offset++;
    }
    return currentPiece.y + offset;
  };

  const ghostY = getGhostPieceY();

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
          <button
            onClick={() => setIsPaused(p => !p)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title={isPaused ? 'เล่นต่อ' : 'หยุดชั่วคราว'}
          >
            {isPaused ? <Play className="w-5 h-5 text-emerald-400" /> : <Pause className="w-5 h-5" />}
          </button>
          <button
            onClick={resetGame}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="เริ่มใหม่"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Play Area */}
      <div className="flex gap-3 justify-center items-start mb-3">
        {/* Left Side: Hold & Level */}
        <div className="flex flex-col gap-3 w-16">
          <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-2xl flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase mb-1">HOLD</span>
            <div className="w-12 h-12 flex items-center justify-center bg-black/40 rounded-xl">
              {holdPieceType && (
                <div
                  className="w-8 h-8 rounded-md"
                  style={{ backgroundColor: TETROMINOES[holdPieceType].color }}
                />
              )}
            </div>
            <span className="text-[9px] text-slate-500 mt-1">[C]</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-2xl flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase">LV</span>
            <span className="text-base font-black text-amber-400 font-mono">{level}</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-2xl flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase">LINES</span>
            <span className="text-sm font-black text-emerald-400 font-mono">{lines}</span>
          </div>
        </div>

        {/* Center: Tetris 10x20 Grid */}
        <div className="relative bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-1.5 shadow-2xl overflow-hidden aspect-[10/20] w-[210px] sm:w-[240px]">
          <div className="grid grid-cols-10 grid-rows-20 gap-[1px] w-full h-full bg-black/60 rounded-xl p-[2px]">
            {grid.map((row, rIdx) =>
              row.map((cellColor, cIdx) => {
                // Check if current active piece
                let isCurrent = false;
                let activeColor = '';
                if (currentPiece) {
                  const pr = rIdx - currentPiece.y;
                  const pc = cIdx - currentPiece.x;
                  if (
                    pr >= 0 &&
                    pr < currentPiece.shape.length &&
                    pc >= 0 &&
                    pc < currentPiece.shape[pr].length &&
                    currentPiece.shape[pr][pc] !== 0
                  ) {
                    isCurrent = true;
                    activeColor = currentPiece.color;
                  }
                }

                // Check Ghost Piece
                let isGhost = false;
                if (!isCurrent && currentPiece) {
                  const gpr = rIdx - ghostY;
                  const gpc = cIdx - currentPiece.x;
                  if (
                    gpr >= 0 &&
                    gpr < currentPiece.shape.length &&
                    gpc >= 0 &&
                    gpc < currentPiece.shape[gpr].length &&
                    currentPiece.shape[gpr][gpc] !== 0
                  ) {
                    isGhost = true;
                  }
                }

                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    className={`rounded-[2px] transition-all ${
                      isCurrent
                        ? 'shadow-sm shadow-white/30'
                        : isGhost
                        ? 'border border-dashed border-white/30 bg-white/5'
                        : cellColor
                        ? 'shadow-sm'
                        : 'bg-slate-900/40'
                    }`}
                    style={{
                      backgroundColor: isCurrent ? activeColor : cellColor ? cellColor : undefined
                    }}
                  />
                );
              })
            )}
          </div>

          {/* Game Over Overlay */}
          {isGameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 text-center z-20">
              <Trophy className="w-12 h-12 text-rose-500 mb-1" />
              <h3 className="text-xl font-black text-rose-400 mb-1">GAME OVER</h3>
              <p className="text-xs text-slate-400 mb-1">แต้มที่ทำได้: {score}</p>
              <button
                onClick={resetGame}
                className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-xs shadow hover:brightness-110 active:scale-95"
              >
                เล่นใหม่
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Next & Score */}
        <div className="flex flex-col gap-3 w-16">
          <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-2xl flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase mb-1">NEXT</span>
            <div className="w-12 h-12 flex items-center justify-center bg-black/40 rounded-xl">
              <div
                className="w-8 h-8 rounded-md"
                style={{ backgroundColor: TETROMINOES[nextPieceType].color }}
              />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-2xl flex flex-col items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase">SCORE</span>
            <span className="text-xs font-black text-amber-400 font-mono">{score}</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-2xl flex flex-col items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase">BEST</span>
            <span className="text-xs font-black text-emerald-400 font-mono">{bestScore}</span>
          </div>
        </div>
      </div>

      {/* On-Screen Mobile Controls */}
      <div className="mt-auto flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => moveHoriz(-1)}
            className="w-14 h-12 rounded-2xl bg-slate-900 border border-slate-800 active:bg-slate-800 text-slate-300 font-black text-lg flex items-center justify-center shadow"
          >
            ◀
          </button>
          <button
            onClick={rotatePiece}
            className="w-14 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-indigo-600/30 active:scale-95"
          >
            ↻
          </button>
          <button
            onClick={() => moveHoriz(1)}
            className="w-14 h-12 rounded-2xl bg-slate-900 border border-slate-800 active:bg-slate-800 text-slate-300 font-black text-lg flex items-center justify-center shadow"
          >
            ▶
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleHold}
            className="px-4 h-11 rounded-xl bg-slate-900 border border-slate-800 active:bg-slate-800 text-xs font-bold text-slate-400"
          >
            HOLD
          </button>
          <button
            onClick={drop}
            className="w-14 h-11 rounded-xl bg-slate-800 active:bg-slate-700 text-slate-200 font-black text-base flex items-center justify-center shadow"
          >
            ▼
          </button>
          <button
            onClick={hardDrop}
            className="px-4 h-11 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 active:scale-95"
          >
            DROP ⚡
          </button>
        </div>
      </div>
    </div>
  );
};
