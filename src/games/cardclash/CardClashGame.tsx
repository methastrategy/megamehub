import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, RotateCcw, Bot, Users, Trophy, Shield, Zap, Flame, Droplets, Leaf } from 'lucide-react';
import { bridge } from '../../sdk/MeGameBridge';

interface CardClashGameProps {
  onBackToHub: () => void;
}

type ElementType = 'fire' | 'water' | 'earth' | 'lightning';

interface Card {
  id: string;
  value: number;
  element: ElementType;
}

const ELEMENT_CONFIG: Record<ElementType, { name: string; icon: React.ReactNode; color: string; bg: string }> = {
  fire: { name: 'ไฟ', icon: <Flame className="w-5 h-5 text-rose-400" />, color: 'text-rose-400', bg: 'from-rose-500/20 to-red-600/30 border-rose-500/40' },
  water: { name: 'น้ำ', icon: <Droplets className="w-5 h-5 text-blue-400" />, color: 'text-blue-400', bg: 'from-blue-500/20 to-cyan-600/30 border-blue-500/40' },
  earth: { name: 'ไม้', icon: <Leaf className="w-5 h-5 text-emerald-400" />, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-teal-600/30 border-emerald-500/40' },
  lightning: { name: 'สายฟ้า', icon: <Zap className="w-5 h-5 text-amber-400" />, color: 'text-amber-400', bg: 'from-amber-500/20 to-yellow-600/30 border-amber-500/40' }
};

function generateDeck(): Card[] {
  const elements: ElementType[] = ['fire', 'water', 'earth', 'lightning'];
  const deck: Card[] = [];
  elements.forEach(elem => {
    for (let val = 2; val <= 8; val += 2) {
      deck.push({
        id: `${elem}_${val}_${Math.random().toString(36).substring(2, 6)}`,
        value: val,
        element: elem
      });
    }
  });
  return deck.sort(() => 0.5 - Math.random()).slice(0, 5);
}

export const CardClashGame: React.FC<CardClashGameProps> = ({ onBackToHub }) => {
  const [mode, setMode] = useState<'ai' | 'pass_play'>('ai');
  const [p1Hand, setP1Hand] = useState<Card[]>(generateDeck);
  const [p2Hand, setP2Hand] = useState<Card[]>(generateDeck);
  const [p1Selected, setP1Selected] = useState<Card | null>(null);
  const [p2Selected, setP2Selected] = useState<Card | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [round, setRound] = useState(1);
  const [gameOver, setGameOver] = useState(false);

  const resetMatch = (newMode = mode) => {
    setMode(newMode);
    setP1Hand(generateDeck());
    setP2Hand(generateDeck());
    setP1Selected(null);
    setP2Selected(null);
    setRevealed(false);
    setRoundWinner(null);
    setP1Score(0);
    setP2Score(0);
    setRound(1);
    setGameOver(false);
    bridge.playSfx('click');
  };

  const handleP1Pick = (card: Card) => {
    if (p1Selected || revealed || gameOver) return;
    bridge.playSfx('click');
    setP1Selected(card);

    if (mode === 'ai') {
      // AI picks automatically
      setTimeout(() => {
        const availableP2 = p2Hand.filter(c => c.id !== p2Selected?.id);
        const aiPick = availableP2[Math.floor(Math.random() * availableP2.length)];
        setP2Selected(aiPick);
        resolveRound(card, aiPick);
      }, 500);
    }
  };

  const handleP2Pick = (card: Card) => {
    if (p2Selected || revealed || gameOver || mode === 'ai') return;
    bridge.playSfx('click');
    setP2Selected(card);

    if (p1Selected) {
      resolveRound(p1Selected, card);
    }
  };

  const resolveRound = (c1: Card, c2: Card) => {
    setRevealed(true);

    // Calculate elemental advantage:
    // Fire > Earth, Earth > Water, Water > Fire
    let c1Bonus = 0;
    let c2Bonus = 0;

    if (c1.element === 'fire' && c2.element === 'earth') c1Bonus = 3;
    else if (c1.element === 'earth' && c2.element === 'water') c1Bonus = 3;
    else if (c1.element === 'water' && c2.element === 'fire') c1Bonus = 3;

    if (c2.element === 'fire' && c1.element === 'earth') c2Bonus = 3;
    else if (c2.element === 'earth' && c1.element === 'water') c2Bonus = 3;
    else if (c2.element === 'water' && c1.element === 'fire') c2Bonus = 3;

    const total1 = c1.value + c1Bonus;
    const total2 = c2.value + c2Bonus;

    let winner = 'draw';
    if (total1 > total2) {
      winner = 'p1';
      setP1Score(s => s + 1);
      bridge.playSfx('correct');
    } else if (total2 > total1) {
      winner = 'p2';
      setP2Score(s => s + 1);
      bridge.playSfx('pass');
    } else {
      bridge.playSfx('tick');
    }
    setRoundWinner(winner);

    // After round resolves
    setTimeout(() => {
      // Remove used cards
      setP1Hand(prev => prev.filter(c => c.id !== c1.id));
      setP2Hand(prev => prev.filter(c => c.id !== c2.id));
      setP1Selected(null);
      setP2Selected(null);
      setRevealed(false);
      setRoundWinner(null);

      if (round >= 5) {
        setGameOver(true);
        bridge.playSfx('victory');
        confetti({ particleCount: 70, spread: 60 });
        bridge.recordGameResult({
          gameId: 'cardclash',
          score: p1Score + (total1 > total2 ? 1 : 0),
          coinsEarned: 25
        });
      } else {
        setRound(r => r + 1);
      }
    }, 2200);
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 max-w-4xl mx-auto select-none">
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
          <span>กลับสู่ Hub</span>
        </button>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => resetMatch('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              mode === 'ai' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>สู้กับ AI</span>
          </button>
          <button
            onClick={() => resetMatch('pass_play')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              mode === 'pass_play' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2 คน (1 เครื่อง)</span>
          </button>
        </div>
      </div>

      {/* Arena Board */}
      <div className="flex-1 flex flex-col justify-between bg-slate-900/60 border border-slate-800 rounded-3xl p-4 md:p-6 relative overflow-hidden">
        {/* Opponent (P2 / AI) Area */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">{mode === 'ai' ? '🤖' : '👤'}</span>
            <span className="font-bold text-sm text-slate-300">
              {mode === 'ai' ? 'MeBot AI' : 'ผู้เล่น 2'}
            </span>
            <div className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-400">
              แต้ม: {p2Score}
            </div>
          </div>

          {/* P2 Cards Hand */}
          <div className="flex gap-2">
            {p2Hand.map(card => (
              <div
                key={card.id}
                onClick={() => mode === 'pass_play' && handleP2Pick(card)}
                className={`w-14 h-20 sm:w-16 sm:h-24 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  mode === 'pass_play' && !p2Selected
                    ? 'bg-slate-800 border-indigo-500/50 hover:-translate-y-1 cursor-pointer'
                    : 'bg-slate-800/80 border-slate-700/60 opacity-80'
                } ${p2Selected?.id === card.id ? 'ring-2 ring-indigo-400 -translate-y-2' : ''}`}
              >
                {mode === 'pass_play' ? (
                  <>
                    <span className="text-lg font-black">{card.value}</span>
                    {ELEMENT_CONFIG[card.element].icon}
                  </>
                ) : (
                  <Shield className="w-6 h-6 text-slate-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Center Clash Stage */}
        <div className="my-6 py-6 border-y border-slate-800/80 flex flex-col items-center justify-center min-h-[160px]">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">
            รอบที่ {round} / 5
          </div>

          <div className="flex items-center justify-center gap-8">
            {/* P2 Revealed Card */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-slate-400 mb-1">{mode === 'ai' ? 'AI' : 'P2'}</span>
              <div className={`w-20 h-28 rounded-2xl border flex flex-col items-center justify-center bg-gradient-to-b ${
                revealed && p2Selected ? ELEMENT_CONFIG[p2Selected.element].bg : 'bg-slate-800 border-slate-700'
              }`}>
                {revealed && p2Selected ? (
                  <>
                    <span className="text-3xl font-black">{p2Selected.value}</span>
                    <div className="mt-1">{ELEMENT_CONFIG[p2Selected.element].icon}</div>
                    <span className="text-xs font-bold text-slate-300">{ELEMENT_CONFIG[p2Selected.element].name}</span>
                  </>
                ) : p2Selected ? (
                  <span className="text-xs text-indigo-400 animate-pulse font-bold">คว่ำการ์ดแล้ว</span>
                ) : (
                  <span className="text-xs text-slate-500">รอเลือก</span>
                )}
              </div>
            </div>

            <div className="text-2xl font-black text-slate-600">VS</div>

            {/* P1 Revealed Card */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-slate-400 mb-1">คุณ (P1)</span>
              <div className={`w-20 h-28 rounded-2xl border flex flex-col items-center justify-center bg-gradient-to-b ${
                revealed && p1Selected ? ELEMENT_CONFIG[p1Selected.element].bg : 'bg-slate-800 border-slate-700'
              }`}>
                {revealed && p1Selected ? (
                  <>
                    <span className="text-3xl font-black">{p1Selected.value}</span>
                    <div className="mt-1">{ELEMENT_CONFIG[p1Selected.element].icon}</div>
                    <span className="text-xs font-bold text-slate-300">{ELEMENT_CONFIG[p1Selected.element].name}</span>
                  </>
                ) : p1Selected ? (
                  <span className="text-xs text-emerald-400 font-bold">พร้อมปะทะ</span>
                ) : (
                  <span className="text-xs text-slate-500">เลือกการ์ด</span>
                )}
              </div>
            </div>
          </div>

          {roundWinner && (
            <div className={`mt-4 px-4 py-1.5 rounded-full text-sm font-bold animate-bounce ${
              roundWinner === 'p1' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              roundWinner === 'p2' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
              'bg-slate-800 text-slate-300'
            }`}>
              {roundWinner === 'p1' ? '🎉 P1 ชนะการปะทะรอบนี้!' :
               roundWinner === 'p2' ? (mode === 'ai' ? '🤖 AI ชนะรอบนี้!' : '🎉 P2 ชนะรอบนี้!') :
               '🤝 เสมอกัน!'}
            </div>
          )}
        </div>

        {/* Player 1 (You) Area */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">😎</span>
            <span className="font-bold text-sm text-slate-200">คุณ (ผู้เล่น 1)</span>
            <div className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-emerald-400">
              แต้ม: {p1Score}
            </div>
          </div>

          {/* P1 Hand */}
          <div className="flex gap-2">
            {p1Hand.map(card => {
              const elem = ELEMENT_CONFIG[card.element];
              const isPicked = p1Selected?.id === card.id;
              return (
                <button
                  key={card.id}
                  disabled={!!p1Selected || revealed || gameOver}
                  onClick={() => handleP1Pick(card)}
                  className={`w-14 h-22 sm:w-18 sm:h-26 rounded-xl border flex flex-col items-center justify-between p-2 transition-all ${
                    isPicked
                      ? 'ring-2 ring-emerald-400 -translate-y-3 bg-emerald-950/40 border-emerald-500'
                      : `bg-gradient-to-b ${elem.bg} hover:-translate-y-2 cursor-pointer shadow-md`
                  }`}
                >
                  <span className="text-base sm:text-lg font-black">{card.value}</span>
                  <div>{elem.icon}</div>
                  <span className="text-[10px] font-bold text-slate-300">{elem.name}</span>
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            ชนะทางธาตุ: ไฟ 🔥 ชนะ ไม้ 🌿 • ไม้ 🌿 ชนะ น้ำ 💧 • น้ำ 💧 ชนะ ไฟ 🔥 (โบนัส +3 แต้ม)
          </div>
        </div>

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <Trophy className="w-16 h-16 text-amber-400 mb-3 animate-bounce" />
            <h2 className="text-3xl font-black text-white mb-2">
              {p1Score > p2Score ? '🎉 ยินดีด้วย คุณชนะเลิศ!' :
               p2Score > p1Score ? (mode === 'ai' ? '🤖 MeBot AI ชนะ!' : '🎉 ผู้เล่น 2 ชนะ!') :
               '🤝 เกมจบลงด้วยผลเสมอ!'}
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              คะแนนสุดท้าย: {p1Score} ต่อ {p2Score}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => resetMatch(mode)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:brightness-110 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>เล่นใหม่อีกรอบ</span>
              </button>
              <button
                onClick={() => {
                  bridge.playSfx('click');
                  onBackToHub();
                }}
                className="px-6 py-3 rounded-xl bg-slate-800 text-slate-200 font-bold hover:bg-slate-700"
              >
                กลับสู่ Hub
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
