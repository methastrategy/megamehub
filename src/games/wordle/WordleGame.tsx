import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, RotateCcw, Delete, Check } from 'lucide-react';
import { WORDLE_DATA } from './wordleData';
import { bridge } from '../../sdk/MeGameBridge';

interface WordleGameProps {
  onBackToHub: () => void;
}

type LangMode = 'en' | 'th';
type CellStatus = 'empty' | 'tbd' | 'correct' | 'present' | 'absent';

export const WordleGame: React.FC<WordleGameProps> = ({ onBackToHub }) => {
  const [lang, setLang] = useState<LangMode>('en');
  const [targetWord, setTargetWord] = useState<string>('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  // Initialize word
  const initGame = useCallback((selectedLang: LangMode) => {
    const list = WORDLE_DATA[selectedLang === 'en' ? 'english' : 'thai'];
    const randomWord = list[Math.floor(Math.random() * list.length)].toUpperCase();
    setTargetWord(randomWord);
    setGuesses([]);
    setCurrentGuess('');
    setIsGameOver(false);
    setMessage('');
    bridge.playSfx('click');
  }, []);

  useEffect(() => {
    initGame(lang);
  }, [lang, initGame]);

  const wordLength = targetWord.length || 5;
  const maxGuesses = 6;

  // Handle letter input
  const handleKeyInput = useCallback((char: string) => {
    if (isGameOver) return;

    if (char === 'ENTER') {
      if (currentGuess.length < wordLength) {
        setMessage(`พิมพ์ให้ครบ ${wordLength} ตัวอักษรก่อนครับ`);
        bridge.playSfx('pass');
        setTimeout(() => setMessage(''), 2000);
        return;
      }

      const newGuesses = [...guesses, currentGuess];
      setGuesses(newGuesses);
      bridge.playSfx('click');

      if (currentGuess === targetWord) {
        setIsGameOver(true);
        bridge.playSfx('victory');
        confetti({ particleCount: 90, spread: 70 });
        const coins = Math.max(10, (7 - newGuesses.length) * 15);
        setMessage(`🎉 ยอดเยี่ยม! ทายถูกในครั้งที่ ${newGuesses.length}`);
        bridge.recordGameResult({
          gameId: 'wordle',
          score: (7 - newGuesses.length) * 100,
          coinsEarned: coins
        });
      } else if (newGuesses.length >= maxGuesses) {
        setIsGameOver(true);
        bridge.playSfx('gameover');
        setMessage(`เฉลยคำตอบคือ: ${targetWord}`);
      }

      setCurrentGuess('');
      return;
    }

    if (char === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
      bridge.playSfx('click');
      return;
    }

    if (currentGuess.length < wordLength) {
      setCurrentGuess(prev => prev + char.toUpperCase());
      bridge.playSfx('click');
    }
  }, [currentGuess, guesses, isGameOver, maxGuesses, targetWord, wordLength]);

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleKeyInput('ENTER');
      } else if (e.key === 'Backspace') {
        handleKeyInput('BACKSPACE');
      } else if (lang === 'en' && /^[a-zA-Z]$/.test(e.key)) {
        handleKeyInput(e.key.toUpperCase());
      } else if (lang === 'th' && /^[\u0E00-\u0E7F]$/.test(e.key)) {
        handleKeyInput(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyInput, lang]);

  // Evaluate status of each cell in a committed row
  const getCellStatus = (guess: string, index: number): CellStatus => {
    const char = guess[index];
    if (!char) return 'empty';
    if (targetWord[index] === char) return 'correct';
    if (targetWord.includes(char)) return 'present';
    return 'absent';
  };

  // Compute key statuses for keyboard coloring
  const getKeyStatuses = (): Record<string, CellStatus> => {
    const statusMap: Record<string, CellStatus> = {};
    guesses.forEach(guess => {
      for (let i = 0; i < guess.length; i++) {
        const char = guess[i];
        const status = getCellStatus(guess, i);
        // Correct takes precedence over present
        if (status === 'correct') {
          statusMap[char] = 'correct';
        } else if (status === 'present' && statusMap[char] !== 'correct') {
          statusMap[char] = 'present';
        } else if (!statusMap[char]) {
          statusMap[char] = 'absent';
        }
      }
    });
    return statusMap;
  };

  const keyStatuses = getKeyStatuses();

  // English QWERTY Layout
  const EN_KEYBOARD = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
  ];

  // Thai Keyboard (Curated frequent keys)
  const TH_KEYBOARD = [
    ['ก', 'ข', 'ค', 'ง', 'จ', 'ช', 'ด', 'ต', 'ถ', 'ท', 'น', 'บ'],
    ['ป', 'ผ', 'พ', 'ฟ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ส', 'ห', 'อ'],
    ['ENTER', 'ะ', 'า', 'ิ', 'ี', 'ึ', 'ื', 'ุ', 'ู', 'เ', 'แ', 'โ', 'ใ', 'ไ', '่', '้', 'BACKSPACE']
  ];

  const currentKeyboard = lang === 'en' ? EN_KEYBOARD : TH_KEYBOARD;

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 max-w-2xl mx-auto select-none">
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

        {/* Language Mode Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => {
              setLang('en');
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              lang === 'en' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🇬🇧 English</span>
          </button>
          <button
            onClick={() => {
              setLang('th');
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              lang === 'th' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🇹🇭 ภาษาไทย</span>
          </button>
        </div>

        <button
          onClick={() => initGame(lang)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          title="สุ่มคำใหม่"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Main Game Container */}
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Title & Notification Message */}
        <div className="text-center min-h-[40px] flex items-center justify-center">
          {message ? (
            <div className="px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs sm:text-sm animate-scale-up">
              {message}
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-medium">
              ทายคำ {wordLength} ตัวอักษร (มีโอกาส 6 ครั้ง)
            </span>
          )}
        </div>

        {/* Wordle Grid */}
        <div className="my-auto flex flex-col gap-1.5 py-4">
          {Array.from({ length: maxGuesses }).map((_, rowIndex) => {
            const isCommitted = rowIndex < guesses.length;
            const isCurrent = rowIndex === guesses.length;
            const rowWord = isCommitted
              ? guesses[rowIndex]
              : isCurrent
              ? currentGuess
              : '';

            return (
              <div key={rowIndex} className="flex gap-1.5 justify-center">
                {Array.from({ length: wordLength }).map((_, colIndex) => {
                  const letter = rowWord[colIndex] || '';
                  const status = isCommitted ? getCellStatus(rowWord, colIndex) : letter ? 'tbd' : 'empty';

                  return (
                    <div
                      key={colIndex}
                      className={`w-11 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-black text-xl sm:text-2xl transition-all duration-300 border-2 select-none ${
                        status === 'correct'
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30 rotate-0'
                          : status === 'present'
                          ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/30'
                          : status === 'absent'
                          ? 'bg-slate-800/80 border-slate-700/60 text-slate-500'
                          : status === 'tbd'
                          ? 'bg-slate-900 border-indigo-500/80 text-white animate-scale-up'
                          : 'bg-slate-900/40 border-slate-800 text-transparent'
                      }`}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Virtual On-screen Keyboard */}
        <div className="w-full flex flex-col gap-1.5 mt-auto pt-4 border-t border-slate-900">
          {currentKeyboard.map((row, rIdx) => (
            <div key={rIdx} className="flex gap-1 justify-center w-full">
              {row.map(key => {
                const status = keyStatuses[key];
                const isSpecial = key === 'ENTER' || key === 'BACKSPACE';

                return (
                  <button
                    key={key}
                    onClick={() => handleKeyInput(key)}
                    className={`h-11 sm:h-12 rounded-lg font-bold flex items-center justify-center select-none transition active:scale-95 text-xs sm:text-sm ${
                      isSpecial
                        ? 'px-2.5 sm:px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : status === 'correct'
                        ? 'bg-emerald-600 text-white'
                        : status === 'present'
                        ? 'bg-amber-600 text-white'
                        : status === 'absent'
                        ? 'bg-slate-900 text-slate-600'
                        : 'bg-slate-850 hover:bg-slate-800 bg-slate-800 text-slate-200'
                    } ${isSpecial ? 'flex-grow-0' : 'flex-1 min-w-[24px] sm:min-w-[32px]'}`}
                  >
                    {key === 'BACKSPACE' ? <Delete className="w-4 h-4" /> : key === 'ENTER' ? <Check className="w-4 h-4" /> : key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
