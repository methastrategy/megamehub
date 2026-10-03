import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, RotateCcw, Plus, Trash2, Smartphone, 
  CheckCircle2, XCircle, Sparkles, AlertCircle, Play
} from 'lucide-react';
import type { ChayenDeck } from '../../sdk/types';
import { loadAllDecks, saveCustomDeck, deleteCustomDeck } from './chayenData';
import { bridge } from '../../sdk/MeGameBridge';

interface ChayenGameProps {
  onBackToHub: () => void;
}

type GamePhase = 'select_deck' | 'create_deck' | 'ready' | 'playing' | 'round_feedback' | 'summary';

interface WordResult {
  word: string;
  isCorrect: boolean;
}

export const ChayenGame: React.FC<ChayenGameProps> = ({ onBackToHub }) => {
  const [decks, setDecks] = useState<ChayenDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<ChayenDeck | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>('select_deck');
  const [roundDuration, setRoundDuration] = useState<number>(60);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [countdown, setCountdown] = useState<number>(3);
  const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
  
  // Game session words
  const [remainingWords, setRemainingWords] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [results, setResults] = useState<WordResult[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'pass' | null>(null);

  // Sensor state
  const [sensorStatus, setSensorStatus] = useState<'unsupported' | 'needs_permission' | 'ready'>('ready');
  const lastActionTime = useRef<number>(0);
  const isNeutral = useRef<boolean>(true);

  // Custom Deck Form
  const [customName, setCustomName] = useState('');
  const [customEmoji, setCustomEmoji] = useState('🌟');
  const [customDesc, setCustomDesc] = useState('');
  const [customWordsText, setCustomWordsText] = useState('');

  // Load decks
  const refreshDecks = useCallback(() => {
    const all = loadAllDecks();
    setDecks(all);
    if (!selectedDeck && all.length > 0) {
      setSelectedDeck(all[0]);
    }
  }, [selectedDeck]);

  useEffect(() => {
    refreshDecks();
  }, [refreshDecks]);

  // Request Sensor permission for iOS 13+
  const requestSensorPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      // @ts-expect-error iOS specific requestPermission
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        // @ts-expect-error iOS specific requestPermission
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          setSensorStatus('ready');
          bridge.playSfx('click');
        } else {
          setSensorStatus('needs_permission');
        }
      } catch (err) {
        console.warn('Orientation permission error:', err);
      }
    }
  };

  // Start round preparation
  const handleSelectDeckToPlay = (deck: ChayenDeck) => {
    setSelectedDeck(deck);
    setGamePhase('ready');
    setIsCountingDown(false);
    setCountdown(3);
    bridge.playSfx('click');
  };

  // Start actual game countdown
  const startCountdown = () => {
    bridge.playSfx('click');
    setIsCountingDown(true);
    let count = 3;
    setCountdown(3);
    bridge.playSfx('tick');

    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        bridge.playSfx('tick');
      } else if (count === 0) {
        setCountdown(0);
        bridge.playSfx('tick');
      } else {
        clearInterval(timer);
        setIsCountingDown(false);
        beginPlaying();
      }
    }, 1000);
  };

  // Setup words and start game timer
  const beginPlaying = () => {
    if (!selectedDeck) return;
    const shuffled = [...selectedDeck.words].sort(() => 0.5 - Math.random());
    const firstWord = shuffled[0] || 'หมดคำแล้ว!';
    setRemainingWords(shuffled.slice(1));
    setCurrentWord(firstWord);
    setResults([]);
    setTimeLeft(roundDuration);
    setFeedback(null);
    setGamePhase('playing');
    bridge.playSfx('click');
  };

  // Handle Answer Action (Correct / Pass)
  const handleAnswer = useCallback((isCorrect: boolean) => {
    if (gamePhase !== 'playing') return;
    const now = Date.now();
    if (now - lastActionTime.current < 450) return; // Debounce
    lastActionTime.current = now;

    const recorded: WordResult = {
      word: currentWord,
      isCorrect
    };
    setResults(prev => [recorded, ...prev]);

    if (isCorrect) {
      bridge.playSfx('correct');
      setFeedback('correct');
    } else {
      bridge.playSfx('pass');
      setFeedback('pass');
    }

    setTimeout(() => {
      setFeedback(null);
    }, 350);

    // Pick next word
    if (remainingWords.length > 0) {
      const next = remainingWords[0];
      setRemainingWords(prev => prev.slice(1));
      setCurrentWord(next);
    } else {
      // Loop or finish
      const allShuffled = [...(selectedDeck?.words || [])].sort(() => 0.5 - Math.random());
      setRemainingWords(allShuffled.slice(1));
      setCurrentWord(allShuffled[0] || 'สุดยอดมาก!');
    }
  }, [gamePhase, currentWord, remainingWords, selectedDeck]);

  // Motion Sensor Listener for Head Tilts
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const { beta, gamma } = e;
      if (beta === null || gamma === null) return;

      if (isNeutral.current) {
        if (beta > 50 && beta < 130) {
          // Tilted forward (Correct)
          isNeutral.current = false;
          handleAnswer(true);
        } else if (beta < -20 || beta > 160) {
          // Tilted upward (Pass)
          isNeutral.current = false;
          handleAnswer(false);
        }
      } else {
        // Return to neutral zone (holding vertically against forehead)
        if (beta >= 0 && beta <= 40) {
          isNeutral.current = true;
        }
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [gamePhase, handleAnswer]);

  // Game countdown timer loop
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishGame();
          return 0;
        }
        if (prev <= 6) {
          bridge.playSfx('urgent');
        } else if (prev <= 10) {
          bridge.playSfx('tick');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase]);

  // Finish round & calculate scores
  const finishGame = () => {
    setGamePhase('summary');
    bridge.playSfx('gameover');

    // Confetti effect
    setTimeout(() => {
      bridge.playSfx('victory');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 400);

    // Save score to bridge
    const score = results.filter(r => r.isCorrect).length;
    bridge.recordGameResult({
      gameId: 'chayen',
      score,
      coinsEarned: score * 5
    });
  };

  // Custom Deck Submission
  const handleCreateCustomDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const words = customWordsText
      .split('\n')
      .map(w => w.trim())
      .filter(w => w.length > 0);

    if (words.length < 3) {
      alert('กรุณาใส่คำศัพท์อย่างน้อย 3 คำครับ');
      return;
    }

    const newDeck: ChayenDeck = {
      id: 'custom_' + Date.now(),
      name: customName.trim(),
      emoji: customEmoji || '🌟',
      description: customDesc.trim() || 'หมวดคำศัพท์ที่สร้างขึ้นเอง',
      color: 'from-fuchsia-600 to-pink-600',
      words,
      isCustom: true
    };

    saveCustomDeck(newDeck);
    refreshDecks();
    setSelectedDeck(newDeck);
    setGamePhase('select_deck');
    bridge.playSfx('click');

    // Reset form
    setCustomName('');
    setCustomDesc('');
    setCustomWordsText('');
  };

  const handleDeleteDeck = (deckId: string) => {
    if (confirm('คุณต้องการลบสำรับคำศัพท์นี้ใช่หรือไม่?')) {
      deleteCustomDeck(deckId);
      refreshDecks();
      bridge.playSfx('click');
    }
  };

  const correctCount = results.filter(r => r.isCorrect).length;
  const passCount = results.filter(r => !r.isCorrect).length;

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 1. SELECT DECK SCREEN */}
      {gamePhase === 'select_deck' && (
        <div className="flex-1 flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                bridge.playSfx('click');
                onBackToHub();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>กลับสู่ Hub</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">🧋</span>
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                Chayen ชาเย็น
              </h1>
            </div>
            <button
              onClick={() => {
                bridge.playSfx('click');
                setGamePhase('create_deck');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold text-sm hover:brightness-110 shadow-lg shadow-orange-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างหมวดเอง</span>
            </button>
          </div>

          {/* Quick Round Duration Selector */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Smartphone className="w-4 h-4 text-orange-400" />
              <span>เวลาต่อรอบ:</span>
            </div>
            <div className="flex items-center gap-2">
              {[60, 90, 120].map(sec => (
                <button
                  key={sec}
                  onClick={() => {
                    bridge.playSfx('click');
                    setRoundDuration(sec);
                  }}
                  className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition ${
                    roundDuration === sec
                      ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec} วินาที
                </button>
              ))}
            </div>
          </div>

          {/* Category Decks Grid */}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-400" />
              เลือกสำรับคำศัพท์ที่ต้องการเล่น ({decks.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-12">
              {decks.map(deck => (
                <div
                  key={deck.id}
                  onClick={() => handleSelectDeckToPlay(deck)}
                  className="group relative bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10 flex flex-col justify-between overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${deck.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition`} />
                  
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-4xl p-2 bg-slate-800/80 rounded-2xl border border-slate-700/50 shadow-inner">
                        {deck.emoji}
                      </span>
                      {deck.isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDeck(deck.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                          title="ลบสำรับนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition">
                      {deck.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {deck.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>{deck.words.length} คำ</span>
                    <span className="text-orange-400 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-1">
                      แตะเพื่อเล่น <Play className="w-3 h-3 fill-orange-400" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. CREATE CUSTOM DECK SCREEN */}
      {gamePhase === 'create_deck' && (
        <div className="flex-1 flex flex-col p-4 md:p-6 max-w-xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                bridge.playSfx('click');
                setGamePhase('select_deck');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>ย้อนกลับ</span>
            </button>
            <h2 className="text-lg font-bold text-white">สร้างหมวดคำศัพท์ใหม่</h2>
            <div className="w-10" />
          </div>

          <form onSubmit={handleCreateCustomDeck} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">อิโมจิ & ชื่อหมวด</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={2}
                  value={customEmoji}
                  onChange={e => setCustomEmoji(e.target.value)}
                  className="w-14 text-center text-xl bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white"
                  title="ใส่อิโมจิ"
                />
                <input
                  type="text"
                  placeholder="เช่น เพื่อนสนิท ม.ปลาย, ของในออฟฟิศ"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">คำอธิบายสั้นๆ (ไม่บังคับ)</label>
              <input
                type="text"
                placeholder="เช่น รวมเรื่องตลกที่เราเท่านั้นที่รู้"
                value={customDesc}
                onChange={e => setCustomDesc(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                รายการคำศัพท์ (พิมพ์ 1 คำต่อ 1 บรรทัด)
              </label>
              <textarea
                rows={8}
                placeholder="สมชายชอบนอนหลับ&#10;กาแฟป้าแก้ว&#10;ประชุม 5 โมงเย็น&#10;ส่งงานล่าช้า"
                value={customWordsText}
                onChange={e => setCustomWordsText(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm font-mono focus:border-orange-500 focus:outline-none leading-relaxed"
                required
              />
              <p className="text-xs text-slate-500 mt-1">แนะนำให้ใส่ 15-30 คำขึ้นไปเพื่อความสนุก</p>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold text-base hover:brightness-110 shadow-lg shadow-orange-500/20 transition mt-4"
            >
              บันทึกและพร้อมเล่นทันที
            </button>
          </form>
        </div>
      )}

      {/* 3. READY / HOW TO PLAY SCREEN */}
      {gamePhase === 'ready' && selectedDeck && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto w-full">
          {isCountingDown ? (
            <div className="flex flex-col items-center justify-center animate-pulse">
              <div className="text-8xl sm:text-9xl font-black text-orange-400 mb-4">
                {countdown === 0 ? 'GO!' : countdown}
              </div>
              <p className="text-xl text-slate-300 font-bold">ยกโทรศัพท์แนบหน้าผากเลย!</p>
            </div>
          ) : (
            <>
              <div className="text-6xl mb-4 animate-bounce">{selectedDeck.emoji}</div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
                หมวด: {selectedDeck.name}
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                มีทั้งหมด {selectedDeck.words.length} คำ • เวลา {roundDuration} วินาที
              </p>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8 text-left space-y-3 w-full">
                <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider">วิธีถือเล่นแบบ Chayen:</h3>
                <div className="flex items-center gap-3 text-sm text-slate-200">
                  <span className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0">1</span>
                  <span>ถือโทรศัพท์แนวนอน แนบไว้ที่<b>หน้าผาก</b> หันหน้าจอหาเพื่อน</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-200">
                  <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">2</span>
                  <span><b>ก้มหน้าลง:</b> เมื่อทายถูก (ถูกต้อง! +1 คะแนน)</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-200">
                  <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">3</span>
                  <span><b>เงยหน้าขึ้น:</b> เมื่อต้องการข้ามไปคำถัดไป</span>
                </div>
                <div className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                  *(หรือสามารถแตะปุ่มเขียว/ส้มบนหน้าจอเพื่อกดแทนได้)*
                </div>
              </div>

              {sensorStatus === 'needs_permission' && (
                <button
                  onClick={requestSensorPermission}
                  className="mb-4 flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-sm font-semibold"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>แตะเพื่อเปิดใช้งานเซนเซอร์เอียงหน้าจอ (iOS)</span>
                </button>
              )}

              <div className="flex items-center gap-4 w-full">
                <button
                  onClick={() => {
                    bridge.playSfx('click');
                    setGamePhase('select_deck');
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold hover:bg-slate-800 transition"
                >
                  เปลี่ยนหมวด
                </button>
                <button
                  onClick={startCountdown}
                  className="flex-2 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-lg hover:brightness-110 shadow-xl shadow-orange-500/30 transition flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-slate-950" />
                  <span>พร้อมแล้ว เริ่มเลย!</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 4. PLAYING SCREEN (FOREHEAD EXPERIENCE) */}
      {gamePhase === 'playing' && (
        <div 
          className={`flex-1 relative flex flex-col justify-between p-4 md:p-8 transition-colors duration-200 select-none ${
            feedback === 'correct'
              ? 'bg-emerald-600'
              : feedback === 'pass'
              ? 'bg-amber-600'
              : 'bg-slate-950'
          }`}
        >
          {/* Top Status Bar */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur px-4 py-2 rounded-full border border-white/10">
              <span className="text-xs uppercase tracking-wider font-bold text-white/70">หมวด</span>
              <span className="text-sm font-bold text-white">{selectedDeck?.name}</span>
            </div>

            {/* Timer */}
            <div className={`px-5 py-2 rounded-full font-black text-xl flex items-center gap-2 backdrop-blur shadow-lg ${
              timeLeft <= 10 
                ? 'bg-rose-500 text-white animate-pulse' 
                : 'bg-black/50 text-orange-400 border border-orange-500/30'
            }`}>
              <span>⏱️</span>
              <span>{timeLeft}s</span>
            </div>

            {/* Score */}
            <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black px-4 py-2 rounded-full text-sm">
              ถูกแล้ว {results.filter(r => r.isCorrect).length} คำ
            </div>
          </div>

          {/* Center Word Display (Huge font for forehead visibility) */}
          <div className="flex-1 flex flex-col items-center justify-center text-center my-auto py-8">
            {feedback === 'correct' ? (
              <div className="animate-scale-up flex flex-col items-center">
                <CheckCircle2 className="w-24 h-24 text-white mb-2" />
                <span className="text-4xl md:text-6xl font-black text-white">ถูกต้อง! +1</span>
              </div>
            ) : feedback === 'pass' ? (
              <div className="animate-scale-up flex flex-col items-center">
                <XCircle className="w-24 h-24 text-white mb-2" />
                <span className="text-4xl md:text-6xl font-black text-white">ข้าม!</span>
              </div>
            ) : (
              <div className="w-full px-4">
                <div className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white drop-shadow-2xl max-w-5xl mx-auto break-words leading-tight">
                  {currentWord}
                </div>
                <div className="text-xs md:text-sm text-slate-400 mt-6 tracking-widest uppercase">
                  (ก้มหน้า = ถูก • เงยหน้า = ข้าม)
                </div>
              </div>
            )}
          </div>

          {/* Fallback On-Screen Buttons (Left: Pass, Right: Correct) */}
          <div className="grid grid-cols-2 gap-4 pt-4 z-10">
            <button
              onClick={() => handleAnswer(false)}
              className="py-6 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 active:scale-95 font-black text-xl flex items-center justify-center gap-2 transition"
            >
              <XCircle className="w-7 h-7" />
              <span>ข้าม (PASS)</span>
            </button>
            <button
              onClick={() => handleAnswer(true)}
              className="py-6 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 active:scale-95 font-black text-xl flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-7 h-7" />
              <span>ถูกต้อง (+1)</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. SUMMARY / RESULT SCREEN */}
      {gamePhase === 'summary' && (
        <div className="flex-1 flex flex-col p-4 md:p-6 max-w-2xl mx-auto w-full">
          {/* Header */}
          <div className="text-center my-6">
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-3xl font-black text-white mb-1">หมดเวลาแล้ว!</h2>
            <p className="text-slate-400 text-sm">สรุปผลการเล่นหมวด {selectedDeck?.name}</p>
          </div>

          {/* Big Score Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl mb-6">
            <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">ทายถูกทั้งหมด</div>
            <div className="text-7xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent mb-3">
              {correctCount}
            </div>
            <div className="flex items-center justify-center gap-6 text-sm">
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> ถูก {correctCount} คำ
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                <XCircle className="w-4 h-4" /> ข้าม {passCount} คำ
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-yellow-400 font-semibold flex items-center gap-1.5">
                🪙 +{correctCount * 5} เหรียญ
              </span>
            </div>
          </div>

          {/* Word Breakdown List */}
          <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 mb-6 overflow-y-auto max-h-72">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              รายละเอียดคำศัพท์ทั้งหมด ({results.length} คำ):
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium ${
                    r.isCorrect
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                  }`}
                >
                  <span className="truncate">{r.word}</span>
                  {r.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                  ) : (
                    <span className="text-xs text-amber-400 shrink-0 ml-2">ข้าม</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 pb-6">
            <button
              onClick={() => {
                bridge.playSfx('click');
                setGamePhase('select_deck');
              }}
              className="py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 font-bold hover:bg-slate-800 transition"
            >
              เลือกหมวดอื่น
            </button>
            <button
              onClick={() => {
                bridge.playSfx('click');
                startCountdown();
              }}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-base hover:brightness-110 shadow-lg shadow-orange-500/30 transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>เล่นหมวดนี้อีกรอบ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
