import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, Play, Coins } from 'lucide-react';
import type { Card } from '../../engines/card/CardTypes';
import { DeckEngine } from '../../engines/card/Deck';
import { CardVisual } from '../../engines/card/CardVisual';
import { bridge } from '../../sdk/MeGameBridge';

interface BaccaratGameProps {
  onBackToHub: () => void;
}

type BetTarget = 'player' | 'banker' | 'tie';

interface HistoryRecord {
  winner: 'player' | 'banker' | 'tie';
  pScore: number;
  bScore: number;
}

export const BaccaratGame: React.FC<BaccaratGameProps> = ({ onBackToHub }) => {
  const [shoe, setShoe] = useState<Card[]>(() => DeckEngine.createShoe(8));
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [bankerHand, setBankerHand] = useState<Card[]>([]);
  const [selectedBet, setSelectedBet] = useState<BetTarget>('player');
  const [betAmount, setBetAmount] = useState<number>(25);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [playerCoins, setPlayerCoins] = useState<number>(() => bridge.getProfile().coins);

  useEffect(() => {
    return bridge.subscribe(p => setPlayerCoins(p.coins));
  }, []);

  const dealBaccarat = () => {
    if (playerCoins < betAmount) {
      alert('เหรียญไม่พอสำหรับวางเดิมพันนี้ครับ!');
      return;
    }

    setIsPlaying(true);
    setResultMessage('');

    // Deduct bet
    bridge.recordGameResult({
      gameId: 'baccarat',
      score: 0,
      coinsEarned: -betAmount
    });

    let currentShoe = [...shoe];
    if (currentShoe.length < 20) {
      currentShoe = DeckEngine.createShoe(8);
    }

    // Initial 4 cards: P, B, P, B
    const p1 = currentShoe[0];
    const b1 = currentShoe[1];
    const p2 = currentShoe[2];
    const b2 = currentShoe[3];
    currentShoe = currentShoe.slice(4);

    let pHand = [p1, p2];
    let bHand = [b1, b2];

    setPlayerHand(pHand);
    setBankerHand(bHand);
    setShoe(currentShoe);
    bridge.playSfx('click');

    // Simulate dealing sequence
    setTimeout(() => {
      let pScore = DeckEngine.calculateBaccaratScore(pHand);
      let bScore = DeckEngine.calculateBaccaratScore(bHand);

      // Check Natural 8 or 9
      if (pScore >= 8 || bScore >= 8) {
        finishRound(pHand, bHand, pScore, bScore);
        return;
      }

      // Player 3rd card rule (0-5 draws, 6-7 stands)
      let p3rdCard: Card | null = null;
      if (pScore <= 5) {
        p3rdCard = currentShoe[0];
        currentShoe = currentShoe.slice(1);
        pHand = [...pHand, p3rdCard];
        setPlayerHand(pHand);
        pScore = DeckEngine.calculateBaccaratScore(pHand);
      }

      // Banker 3rd card rule (Tableau)
      let bDraws = false;
      const p3Val = p3rdCard ? (['10', 'J', 'Q', 'K'].includes(p3rdCard.rank) ? 0 : p3rdCard.rank === 'A' ? 1 : parseInt(p3rdCard.rank, 10)) : -1;

      if (!p3rdCard) {
        // If Player stood with 6 or 7, Banker draws on 0-5
        if (bScore <= 5) bDraws = true;
      } else {
        if (bScore <= 2) bDraws = true;
        else if (bScore === 3 && p3Val !== 8) bDraws = true;
        else if (bScore === 4 && [2, 3, 4, 5, 6, 7].includes(p3Val)) bDraws = true;
        else if (bScore === 5 && [4, 5, 6, 7].includes(p3Val)) bDraws = true;
        else if (bScore === 6 && [6, 7].includes(p3Val)) bDraws = true;
      }

      if (bDraws) {
        const b3rdCard = currentShoe[0];
        currentShoe = currentShoe.slice(1);
        bHand = [...bHand, b3rdCard];
        setBankerHand(bHand);
        bScore = DeckEngine.calculateBaccaratScore(bHand);
      }

      setShoe(currentShoe);
      setTimeout(() => {
        finishRound(pHand, bHand, pScore, bScore);
      }, 500);
    }, 800);
  };

  const finishRound = (_pHand: Card[], _bHand: Card[], pScore: number, bScore: number) => {
    let winner: 'player' | 'banker' | 'tie';
    if (pScore > bScore) winner = 'player';
    else if (bScore > pScore) winner = 'banker';
    else winner = 'tie';

    setHistory(prev => [{ winner, pScore, bScore }, ...prev.slice(0, 15)]);

    const isUserWin = selectedBet === winner;
    let payout = 0;

    if (isUserWin) {
      if (winner === 'player') {
        payout = betAmount * 2; // 1:1
      } else if (winner === 'banker') {
        payout = Math.floor(betAmount * 1.95); // 0.95:1 (5% commission)
      } else if (winner === 'tie') {
        payout = betAmount * 9; // 8:1
      }

      bridge.playSfx('victory');
      confetti({ particleCount: 70, spread: 60 });
      setResultMessage(`🎉 คุณชนะ! ${winner.toUpperCase()} ชนะ (${pScore} ต่อ ${bScore}) รับ ${payout} เหรียญ`);
    } else {
      bridge.playSfx('gameover');
      setResultMessage(`${winner.toUpperCase()} ชนะ (${pScore} ต่อ ${bScore}) รอบนี้ไม่ถูกรางวัล`);
    }

    if (payout > 0) {
      bridge.recordGameResult({
        gameId: 'baccarat',
        score: pScore,
        coinsEarned: payout
      });
    }

    setIsPlaying(false);
  };

  const pScore = DeckEngine.calculateBaccaratScore(playerHand);
  const bScore = DeckEngine.calculateBaccaratScore(bankerHand);

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
          <span>Hub</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400 font-mono shadow-inner">
          <Coins className="w-4 h-4" />
          <span>{playerCoins} เหรียญ</span>
        </div>
      </div>

      {/* Main Table Arena */}
      <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-2 border-indigo-600/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        {/* Bead Plate Road History */}
        {history.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono mr-1">Road:</span>
            {history.map((rec, idx) => (
              <span
                key={idx}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  rec.winner === 'player'
                    ? 'bg-blue-600 text-white'
                    : rec.winner === 'banker'
                    ? 'bg-rose-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
                title={`P: ${rec.pScore} vs B: ${rec.bScore}`}
              >
                {rec.winner === 'player' ? 'P' : rec.winner === 'banker' ? 'B' : 'T'}
              </span>
            ))}
          </div>
        )}

        {/* Card Stage: Player vs Banker */}
        <div className="grid grid-cols-2 gap-4 my-auto py-4">
          {/* Player Side */}
          <div className="flex flex-col items-center p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm font-black text-blue-400">PLAYER</span>
              {playerHand.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold text-xs">
                  แต้ม: {pScore}
                </span>
              )}
            </div>

            <div className="flex gap-2 min-h-[96px] items-center">
              {playerHand.map(card => (
                <CardVisual key={card.id} card={card} size="md" />
              ))}
            </div>
          </div>

          {/* Banker Side */}
          <div className="flex flex-col items-center p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-sm font-black text-rose-400">BANKER</span>
              {bankerHand.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold text-xs">
                  แต้ม: {bScore}
                </span>
              )}
            </div>

            <div className="flex gap-2 min-h-[96px] items-center">
              {bankerHand.map(card => (
                <CardVisual key={card.id} card={card} size="md" />
              ))}
            </div>
          </div>
        </div>

        {/* Result Message */}
        {resultMessage && (
          <div className="my-2 py-2 px-4 rounded-xl text-center font-bold text-sm bg-slate-800 border border-slate-700 text-amber-300 animate-scale-up">
            {resultMessage}
          </div>
        )}

        {/* Betting Controls */}
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-800">
          <div className="grid grid-cols-3 gap-3">
            <button
              disabled={isPlaying}
              onClick={() => {
                setSelectedBet('player');
                bridge.playSfx('click');
              }}
              className={`py-3.5 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                selectedBet === 'player'
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400 -translate-y-1'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="font-black text-sm">PLAYER (น้ำเงิน)</span>
              <span className="text-[10px] opacity-80">จ่าย 1:1</span>
            </button>

            <button
              disabled={isPlaying}
              onClick={() => {
                setSelectedBet('tie');
                bridge.playSfx('click');
              }}
              className={`py-3.5 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                selectedBet === 'tie'
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400 -translate-y-1'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="font-black text-sm">TIE (เสมอ)</span>
              <span className="text-[10px] opacity-80">จ่าย 8:1</span>
            </button>

            <button
              disabled={isPlaying}
              onClick={() => {
                setSelectedBet('banker');
                bridge.playSfx('click');
              }}
              className={`py-3.5 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                selectedBet === 'banker'
                  ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-400 -translate-y-1'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="font-black text-sm">BANKER (แดง)</span>
              <span className="text-[10px] opacity-80">จ่าย 0.95:1</span>
            </button>
          </div>

          {/* Amount selector and Deal button */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-2xl w-full sm:w-auto justify-center">
              {[10, 25, 50, 100].map(amt => (
                <button
                  key={amt}
                  disabled={isPlaying}
                  onClick={() => {
                    setBetAmount(amt);
                    bridge.playSfx('click');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition ${
                    betAmount === amt
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🪙 {amt}
                </button>
              ))}
            </div>

            <button
              disabled={isPlaying}
              onClick={dealBaccarat}
              className="w-full sm:flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black text-sm hover:brightness-110 active:scale-95 shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isPlaying ? 'กำลังแจกไพ่...' : `วางเดิมพัน (${betAmount} เหรียญ)`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
