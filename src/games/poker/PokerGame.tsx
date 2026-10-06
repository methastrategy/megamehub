import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, RotateCcw, Coins, Trophy } from 'lucide-react';
import type { Card } from '../../engines/card/CardTypes';
import { DeckEngine } from '../../engines/card/Deck';
import { CardVisual } from '../../engines/card/CardVisual';
import { bridge } from '../../sdk/MeGameBridge';
import { DealerAvatar, type DealerMood } from '../../components/table/DealerAvatar';
import { FirstPersonHands } from '../../components/table/FirstPersonHands';

interface PokerGameProps {
  onBackToHub: () => void;
}

type PokerPhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

interface PokerPlayer {
  id: number;
  name: string;
  avatar: string;
  isBot: boolean;
  chips: number;
  currentBet: number;
  holeCards: Card[];
  folded: boolean;
  handRankName?: string;
}

export const PokerGame: React.FC<PokerGameProps> = ({ onBackToHub }) => {
  const [deck, setDeck] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [players, setPlayers] = useState<PokerPlayer[]>([]);
  const [pot, setPot] = useState<number>(0);
  const [currentBetLevel, setCurrentBetLevel] = useState<number>(20);
  const [phase, setPhase] = useState<PokerPhase>('preflop');
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [winnerMessage, setWinnerMessage] = useState<string>('');
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [dealerMood, setDealerMood] = useState<DealerMood>('idle');
  const [dealerSpeech, setDealerSpeech] = useState<string>('Texas Hold\'em เริ่มต้นแล้วครับ เช็คหรือตามได้เลย');
  const [isDealingAnim, setIsDealingAnim] = useState<boolean>(false);

  const startNewHand = () => {
    const rawDeck = DeckEngine.shuffle(DeckEngine.createStandardDeck());
    const initialPlayers: PokerPlayer[] = [
      { id: 0, name: 'คุณ', avatar: '😎', isBot: false, chips: 500, currentBet: 0, holeCards: [rawDeck[0], rawDeck[1]], folded: false },
      { id: 1, name: 'อเล็กซ์ AI', avatar: '🤖', isBot: true, chips: 500, currentBet: 0, holeCards: [rawDeck[2], rawDeck[3]], folded: false },
      { id: 2, name: 'ซาร่า AI', avatar: '🐱', isBot: true, chips: 500, currentBet: 0, holeCards: [rawDeck[4], rawDeck[5]], folded: false },
      { id: 3, name: 'ทอมมี่ AI', avatar: '🦊', isBot: true, chips: 500, currentBet: 0, holeCards: [rawDeck[6], rawDeck[7]], folded: false },
    ];

    // Blinds: Player 1 = SB (10), Player 2 = BB (20)
    initialPlayers[1].chips -= 10;
    initialPlayers[1].currentBet = 10;
    initialPlayers[2].chips -= 20;
    initialPlayers[2].currentBet = 20;

    const remainingDeck = rawDeck.slice(8);

    setDeck(remainingDeck);
    setCommunityCards([]);
    setPlayers(initialPlayers);
    setPot(30);
    setCurrentBetLevel(20);
    setPhase('preflop');
    setCurrentTurn(0);
    setGameOver(false);
    setWinnerMessage('');
    setStatusMessage('ตาของคุณ: เลือก Check/Call, Raise หรือ Fold');
    bridge.playSfx('click');
  };

  useEffect(() => {
    startNewHand();
  }, []);

  // Simple Hand Evaluator for showdown
  const evaluateBestHand = (cards: Card[]): { score: number; name: string } => {
    const rankCounts: Record<string, number> = {};
    const suitCounts: Record<string, number> = {};

    cards.forEach(c => {
      rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
      suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
    });

    const isFlush = Object.values(suitCounts).some(cnt => cnt >= 5);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    if (counts[0] === 4) return { score: 7, name: 'Four of a Kind (สี่แถว)' };
    if (counts[0] === 3 && counts[1] >= 2) return { score: 6, name: 'Full House (เหย้า)' };
    if (isFlush) return { score: 5, name: 'Flush (ฟลัช/สี)' };
    if (counts[0] === 3) return { score: 3, name: 'Three of a Kind (ตอง)' };
    if (counts[0] === 2 && counts[1] === 2) return { score: 2, name: 'Two Pair (สองคู่)' };
    if (counts[0] === 2) return { score: 1, name: 'One Pair (หนึ่งคู่)' };
    return { score: 0, name: 'High Card (ไพ่สูง)' };
  };

  // Advance Phase (Preflop -> Flop -> Turn -> River -> Showdown)
  const advancePhase = (currentPhase: PokerPhase, currentShoe: Card[], currentComm: Card[]) => {
    let nextPhase: PokerPhase = currentPhase;
    let nextComm = [...currentComm];
    let nextShoe = [...currentShoe];

    if (currentPhase === 'preflop') {
      nextPhase = 'flop';
      nextComm = [nextShoe[0], nextShoe[1], nextShoe[2]];
      nextShoe = nextShoe.slice(3);
    } else if (currentPhase === 'flop') {
      nextPhase = 'turn';
      nextComm = [...currentComm, nextShoe[0]];
      nextShoe = nextShoe.slice(1);
    } else if (currentPhase === 'turn') {
      nextPhase = 'river';
      nextComm = [...currentComm, nextShoe[0]];
      nextShoe = nextShoe.slice(1);
    } else if (currentPhase === 'river') {
      nextPhase = 'showdown';
    }

    setDeck(nextShoe);
    setCommunityCards(nextComm);
    setPhase(nextPhase);
    setCurrentTurn(0);
    bridge.playSfx('tick');

    if (nextPhase === 'showdown') {
      runShowdown(nextComm);
    } else {
      setIsDealingAnim(true);
      setTimeout(() => setIsDealingAnim(false), 400);
      setStatusMessage(`เข้าสู่ช่วง ${nextPhase.toUpperCase()} — ตาของคุณ`);
      setDealerSpeech(`เปิดไพ่กลางช่วง ${nextPhase.toUpperCase()} เรียบร้อยครับ วางแผนตาต่อไปได้เลย`);
    }
  };

  // Run Showdown
  const runShowdown = (commCards: Card[]) => {
    const active = players.filter(p => !p.folded);
    let bestScore = -1;
    let winner: PokerPlayer = active[0];

    const updated = players.map(p => {
      const allCards = [...p.holeCards, ...commCards];
      const evalRes = evaluateBestHand(allCards);
      if (!p.folded && evalRes.score > bestScore) {
        bestScore = evalRes.score;
        winner = p;
      }
      return { ...p, handRankName: evalRes.name };
    });

    setPlayers(updated);
    setGameOver(true);

    if (winner.id === 0) {
      bridge.playSfx('victory');
      confetti({ particleCount: 80, spread: 70 });
      setDealerMood('shocked');
      setDealerSpeech(`โอ้โห! คุณกวาด Pot ${pot} ชิปไปด้วย ${winner.handRankName}! เก่งมากครับ`);
      setWinnerMessage(`🎉 คุณชนะเลิศ! ได้รับ Pot ทั้งหมด ${pot} ชิป (${winner.handRankName})`);
      bridge.recordGameResult({
        gameId: 'poker',
        score: pot,
        coinsEarned: pot
      });
    } else {
      bridge.playSfx('gameover');
      setDealerMood('happy');
      setDealerSpeech(`${winner.name} ชนะ Pot ไปด้วย ${winner.handRankName} ตาหน้าลุยใหม่ครับ!`);
      setWinnerMessage(`${winner.name} ชนะเลิศด้วย ${winner.handRankName} รับ Pot ${pot} ชิป`);
    }

  };

  // Player Actions
  const handlePlayerAction = (action: 'call' | 'raise' | 'fold') => {
    if (currentTurn !== 0 || gameOver) return;

    if (action === 'fold') {
      const updated = players.map(p => p.id === 0 ? { ...p, folded: true } : p);
      setPlayers(updated);
      bridge.playSfx('tick');
      advancePhase(phase, deck, communityCards);
      return;
    }

    const toCall = currentBetLevel - players[0].currentBet;
    let betAmt = toCall;

    if (action === 'raise') {
      betAmt = toCall + 40;
      setCurrentBetLevel(b => b + 40);
    }

    const updated = players.map(p => {
      if (p.id === 0) {
        return {
          ...p,
          chips: p.chips - betAmt,
          currentBet: p.currentBet + betAmt
        };
      }
      return p;
    });

    setPot(p => p + betAmt);
    setPlayers(updated);
    bridge.playSfx('click');

    setTimeout(() => {
      advancePhase(phase, deck, communityCards);
    }, 600);
  };

  const p0 = players[0];

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 max-w-5xl mx-auto select-none">
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
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-black text-white">Poker Texas Hold'em (4 Players)</h2>
        </div>

        <button
          onClick={startNewHand}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          title="แจกมือใหม่"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Poker Table Felt */}
      <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-emerald-950/70 via-slate-900 to-slate-950 border-4 border-amber-600/40 rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-2xl">
        {/* Table Felt Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600/15 via-transparent to-transparent pointer-events-none" />

        {/* Dealer and Opponents Header */}
        <div className="flex flex-col items-center relative z-10">
          <DealerAvatar
            mood={dealerMood}
            speechText={dealerSpeech}
            name="ดีลเลอร์ เจษฎา"
            isDealing={isDealingAnim}
          />

          {/* Opponents Seats (Top Row) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-lg mt-2">
            {players.slice(1).map(bot => (
              <div
                key={bot.id}
                className={`flex flex-col items-center p-2 rounded-xl border transition ${
                  bot.folded
                    ? 'bg-slate-900/40 border-slate-800 opacity-40'
                    : 'bg-slate-900/80 border-amber-500/30 shadow-md'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm">{bot.avatar}</span>
                  <span className="text-[11px] font-bold text-slate-200">{bot.name}</span>
                </div>
                <div className="text-[10px] text-amber-400 font-mono font-bold mb-1">
                  🪙 {bot.chips}
                </div>

                {/* Bot Hole Cards */}
                <div className="flex gap-1">
                  {bot.holeCards.map(c => (
                    <CardVisual
                      key={c.id}
                      card={c}
                      faceDown={phase !== 'showdown'}
                      size="sm"
                    />
                  ))}
                </div>
                {phase === 'showdown' && bot.handRankName && (
                  <span className="text-[9px] text-indigo-300 mt-0.5 font-bold">
                    {bot.handRankName}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Center Community Cards & Pot Stage */}
        <div className="my-auto py-3 flex flex-col items-center justify-center relative z-10">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/70 border border-amber-500/50 text-amber-400 font-black text-sm mb-2 shadow-lg">
            <Coins className="w-4 h-4" />
            <span>POT รวม: {pot} ชิป</span>
          </div>

          {/* 5 Community Cards */}
          <div className="flex gap-2 min-h-[88px] sm:min-h-[96px] items-center p-2.5 rounded-2xl bg-black/50 border border-slate-800 shadow-inner">
            {communityCards.length > 0 ? (
              communityCards.map(c => (
                <CardVisual key={c.id} card={c} size="md" />
              ))
            ) : (
              <span className="text-xs text-slate-500 py-3 px-6">
                รอเปิด Flop (3 ใบแรก)
              </span>
            )}
          </div>

          <div className="text-xs text-amber-300 font-mono mt-2 text-center">
            {statusMessage}
          </div>
        </div>

        {/* Player 0 (You) First-Person POV Area */}
        <FirstPersonHands isBetting={phase !== 'showdown' && !p0?.folded}>
          <div className="flex flex-col items-center w-full">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">ไพ่ในมือของคุณ</span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-slate-900/90 px-2.5 py-0.5 rounded-full border border-amber-500/30 shadow">
                ชิปคงเหลือ: {p0?.chips}
              </span>
            </div>

            {/* Your Hole Cards */}
            <div className="flex gap-2.5 mb-3 p-2 bg-black/40 rounded-2xl border border-white/10 backdrop-blur-sm shadow-xl">
              {p0?.holeCards.map(c => (
                <CardVisual key={c.id} card={c} size="md" />
              ))}
            </div>

            {/* Action Buttons */}
            {!p0?.folded && phase !== 'showdown' ? (
              <div className="flex gap-2.5 w-full max-w-sm justify-center">
                <button
                  onClick={() => handlePlayerAction('fold')}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition active:scale-95 shadow"
                >
                  หมอบ (FOLD)
                </button>
                <button
                  onClick={() => handlePlayerAction('call')}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95"
                >
                  ตาม (CALL)
                </button>
                <button
                  onClick={() => handlePlayerAction('raise')}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition active:scale-95"
                >
                  เกทับ (RAISE)
                </button>
              </div>
            ) : (
              <button
                onClick={startNewHand}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 active:scale-95"
              >
                แจกมือใหม่
              </button>
            )}
          </div>
        </FirstPersonHands>


        {/* Winner Banner */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <Trophy className="w-16 h-16 text-amber-400 mb-2 animate-bounce" />
            <h3 className="text-2xl font-black text-white mb-2">{winnerMessage}</h3>
            <div className="flex gap-3 mt-4">
              <button
                onClick={startNewHand}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-sm hover:brightness-110"
              >
                เล่นต่อรอบใหม่
              </button>
              <button
                onClick={() => {
                  bridge.playSfx('click');
                  onBackToHub();
                }}
                className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold hover:bg-slate-700 text-sm"
              >
                กลับ Hub
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
