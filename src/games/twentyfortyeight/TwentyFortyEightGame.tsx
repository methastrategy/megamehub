import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, RotateCcw, Trophy, Sparkles, Undo2 } from 'lucide-react';
import { bridge } from '../../sdk/MeGameBridge';

interface TwentyFortyEightGameProps {
  onBackToHub: () => void;
}

type Board = number[][];
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const BOARD_SIZE = 4;

export const TwentyFortyEightGame: React.FC<TwentyFortyEightGameProps> = ({ onBackToHub }) => {
  const [board, setBoard] = useState<Board>(() => getInitialBoard());
  const [historyBoard, setHistoryBoard] = useState<Board | null>(null);
  const [score, setScore] = useState<number>(0);
  const [prevScore, setPrevScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('megamehub_2048_best') || '0', 10);
  });
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [hasWon, setHasWon] = useState<boolean>(false);
  const [keepPlaying, setKeepPlaying] = useState<boolean>(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  function getEmptyBoard(): Board {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
  }

  function addRandomTile(b: Board): Board {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (b[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return b;

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newBoard = b.map(row => [...row]);
    newBoard[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
    return newBoard;
  }

  function getInitialBoard(): Board {
    let b = getEmptyBoard();
    b = addRandomTile(b);
    b = addRandomTile(b);
    return b;
  }

  const resetGame = () => {
    bridge.playSfx('click');
    const newB = getInitialBoard();
    setBoard(newB);
    setHistoryBoard(null);
    setScore(0);
    setIsGameOver(false);
    setHasWon(false);
    setKeepPlaying(false);
  };

  const handleUndo = () => {
    if (!historyBoard) return;
    bridge.playSfx('tick');
    setBoard(historyBoard);
    setScore(prevScore);
    setHistoryBoard(null);
  };

  // Move Board Logic
  const move = useCallback(
    (dir: Direction) => {
      if (isGameOver) return;

      let moved = false;
      let pointsEarned = 0;
      const newBoard = board.map(row => [...row]);

      const slide = (row: number[]) => {
        const filtered = row.filter(val => val !== 0);
        const result: number[] = [];
        for (let i = 0; i < filtered.length; i++) {
          if (filtered[i] === filtered[i + 1]) {
            const merged = filtered[i] * 2;
            result.push(merged);
            pointsEarned += merged;
            if (merged === 2048 && !hasWon && !keepPlaying) {
              setHasWon(true);
              confetti({ particleCount: 100, spread: 80 });
              bridge.playSfx('victory');
            }
            i++;
          } else {
            result.push(filtered[i]);
          }
        }
        while (result.length < BOARD_SIZE) {
          result.push(0);
        }
        return result;
      };

      if (dir === 'LEFT') {
        for (let r = 0; r < BOARD_SIZE; r++) {
          const oldRow = newBoard[r];
          const newRow = slide(oldRow);
          if (oldRow.join(',') !== newRow.join(',')) moved = true;
          newBoard[r] = newRow;
        }
      } else if (dir === 'RIGHT') {
        for (let r = 0; r < BOARD_SIZE; r++) {
          const oldRow = [...newBoard[r]].reverse();
          const newRow = slide(oldRow).reverse();
          if (newBoard[r].join(',') !== newRow.join(',')) moved = true;
          newBoard[r] = newRow;
        }
      } else if (dir === 'UP') {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const col = [newBoard[0][c], newBoard[1][c], newBoard[2][c], newBoard[3][c]];
          const newCol = slide(col);
          for (let r = 0; r < BOARD_SIZE; r++) {
            if (newBoard[r][c] !== newCol[r]) moved = true;
            newBoard[r][c] = newCol[r];
          }
        }
      } else if (dir === 'DOWN') {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const col = [newBoard[3][c], newBoard[2][c], newBoard[1][c], newBoard[0][c]];
          const newCol = slide(col).reverse();
          for (let r = 0; r < BOARD_SIZE; r++) {
            if (newBoard[r][c] !== newCol[r]) moved = true;
            newBoard[r][c] = newCol[r];
          }
        }
      }

      if (moved) {
        bridge.playSfx('click');
        setHistoryBoard(board);
        setPrevScore(score);

        const boardWithTile = addRandomTile(newBoard);
        setBoard(boardWithTile);

        const newScore = score + pointsEarned;
        setScore(newScore);

        if (newScore > bestScore) {
          setBestScore(newScore);
          localStorage.setItem('megamehub_2048_best', newScore.toString());
        }

        // Check Game Over
        if (checkGameOver(boardWithTile)) {
          setIsGameOver(true);
          bridge.playSfx('gameover');
          bridge.recordGameResult({
            gameId: 'twentyfortyeight',
            score: newScore,
            coinsEarned: Math.floor(newScore / 50)
          });
        }
      }
    },
    [board, isGameOver, score, bestScore, hasWon, keepPlaying]
  );

  const checkGameOver = (b: Board): boolean => {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (b[r][c] === 0) return false;
        if (c < BOARD_SIZE - 1 && b[r][c] === b[r][c + 1]) return false;
        if (r < BOARD_SIZE - 1 && b[r][c] === b[r + 1][c]) return false;
      }
    }
    return true;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        move('UP');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        move('DOWN');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        move('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        move('RIGHT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // Touch controls
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const threshold = 30;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > threshold) move('RIGHT');
      else if (dx < -threshold) move('LEFT');
    } else {
      if (dy > threshold) move('DOWN');
      else if (dy < -threshold) move('UP');
    }
  };

  const getTileStyle = (val: number) => {
    switch (val) {
      case 2:
        return 'bg-amber-100 text-slate-800 shadow-sm';
      case 4:
        return 'bg-amber-200 text-slate-800 shadow-sm';
      case 8:
        return 'bg-orange-400 text-white shadow-md shadow-orange-500/30';
      case 16:
        return 'bg-orange-500 text-white shadow-md shadow-orange-500/40';
      case 32:
        return 'bg-rose-500 text-white shadow-md shadow-rose-500/40';
      case 64:
        return 'bg-red-600 text-white shadow-lg shadow-red-500/50';
      case 128:
        return 'bg-yellow-400 text-slate-900 font-black shadow-lg shadow-yellow-400/50 scale-105';
      case 256:
        return 'bg-yellow-300 text-slate-900 font-black shadow-lg shadow-yellow-300/60 scale-105';
      case 512:
        return 'bg-amber-400 text-slate-900 font-black shadow-xl shadow-amber-400/70 scale-105';
      case 1024:
        return 'bg-emerald-400 text-slate-950 font-black shadow-xl shadow-emerald-400/80 scale-105';
      case 2048:
        return 'bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 text-white font-black shadow-2xl shadow-rose-500/90 ring-4 ring-amber-300 scale-110 animate-pulse';
      default:
        return val > 2048
          ? 'bg-purple-600 text-white font-black ring-2 ring-purple-300'
          : 'bg-slate-800/40 text-transparent';
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 max-w-md mx-auto select-none">
      {/* Top Header */}
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

        <div className="flex items-center gap-2">
          {historyBoard && (
            <button
              onClick={handleUndo}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 transition"
              title="ย้อนกลับ (Undo)"
            >
              <Undo2 className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={resetGame}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="เริ่มเกมใหม่"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Title & Score Board */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            2048 NEON
          </h1>
          <p className="text-xs text-slate-400">ปัดรวมตัวเลขให้ถึง 2048!</p>
        </div>

        <div className="flex gap-2">
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl flex flex-col items-center min-w-[70px]">
            <span className="text-[10px] text-slate-400 uppercase font-bold">SCORE</span>
            <span className="text-sm font-black text-amber-400 font-mono">{score}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl flex flex-col items-center min-w-[70px]">
            <span className="text-[10px] text-slate-400 uppercase font-bold">BEST</span>
            <span className="text-sm font-black text-emerald-400 font-mono">{bestScore}</span>
          </div>
        </div>
      </div>

      {/* Game Board Container */}
      <div
        className="relative bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-3 aspect-square shadow-2xl flex flex-col justify-between touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-4 grid-rows-4 gap-2.5 w-full h-full">
          {board.map((row, rIdx) =>
            row.map((val, cIdx) => (
              <div
                key={`${rIdx}-${cIdx}`}
                className={`rounded-2xl flex items-center justify-center font-bold font-mono transition-all duration-150 ${
                  val >= 1000 ? 'text-lg sm:text-xl' : val >= 100 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
                } ${getTileStyle(val)}`}
              >
                {val > 0 ? val : ''}
              </div>
            ))
          )}
        </div>

        {/* Win Modal Overlay */}
        {hasWon && !keepPlaying && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center z-20 animate-scale-up">
            <Sparkles className="w-16 h-16 text-amber-400 mb-2 animate-bounce" />
            <h2 className="text-2xl font-black text-amber-300 mb-1">ยินดีด้วย! คุณพิชิต 2048!</h2>
            <p className="text-xs text-slate-300 mb-6">คุณบรรลุเป้าหมายสูงสุดแล้ว จะเล่นต่อเพื่อทำลายสถิติไหม?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setKeepPlaying(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-sm shadow-lg hover:brightness-110 active:scale-95"
              >
                เล่นต่อเรื่อยๆ
              </button>
              <button
                onClick={resetGame}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-sm hover:bg-slate-700 active:scale-95"
              >
                เริ่มใหม่
              </button>
            </div>
          </div>
        )}

        {/* Game Over Modal Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center z-20 animate-scale-up">
            <Trophy className="w-16 h-16 text-rose-500 mb-2" />
            <h2 className="text-2xl font-black text-rose-400 mb-1">GAME OVER!</h2>
            <p className="text-xs text-slate-400 mb-1">ไม่มีช่องว่างสำหรับขยับตัวเลขแล้ว</p>
            <p className="text-sm font-bold text-amber-400 mb-6 font-mono">คะแนนที่ทำได้: {score}</p>
            <button
              onClick={resetGame}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-sm shadow-lg hover:brightness-110 active:scale-95"
            >
              เล่นอีกครั้ง
            </button>
          </div>
        )}
      </div>

      {/* Touch / Virtual Arrows for Accessibility */}
      <div className="mt-4 flex flex-col items-center gap-1.5 sm:hidden">
        <button
          onClick={() => move('UP')}
          className="w-14 h-12 rounded-xl bg-slate-900 border border-slate-800 active:bg-slate-800 text-slate-300 font-black shadow flex items-center justify-center text-lg"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => move('LEFT')}
            className="w-14 h-12 rounded-xl bg-slate-900 border border-slate-800 active:bg-slate-800 text-slate-300 font-black shadow flex items-center justify-center text-lg"
          >
            ◀
          </button>
          <button
            onClick={() => move('DOWN')}
            className="w-14 h-12 rounded-xl bg-slate-900 border border-slate-800 active:bg-slate-800 text-slate-300 font-black shadow flex items-center justify-center text-lg"
          >
            ▼
          </button>
          <button
            onClick={() => move('RIGHT')}
            className="w-14 h-12 rounded-xl bg-slate-900 border border-slate-800 active:bg-slate-800 text-slate-300 font-black shadow flex items-center justify-center text-lg"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="mt-auto pt-4 text-center text-[11px] text-slate-500">
        💡 ใช้ปุ่มลูกศร (Arrow Keys / WASD) หรือปัดนิ้วเพื่อรวมตัวเลข
      </div>
    </div>
  );
};
