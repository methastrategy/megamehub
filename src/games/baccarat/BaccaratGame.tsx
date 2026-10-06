import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, Play, Coins } from 'lucide-react';
import type { Card } from '../../engines/card/CardTypes';
import { DeckEngine } from '../../engines/card/Deck';
import { CardVisual } from '../../engines/card/CardVisual';
import { bridge } from '../../sdk/MeGameBridge';
import { DealerAvatar, type DealerMood } from '../../components/table/DealerAvatar';
import { FirstPersonHands } from '../../components/table/FirstPersonHands';

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
  const [dealerMood, setDealerMood] = useState<DealerMood>('idle');
  const [dealerSpeech, setDealerSpeech] = useState<string>('เลือกเดิมพัน Player, Banker หรือ Tie ได้เลยครับ');
  const [isDealingAnim, setIsDealingAnim] = useState<boolean>(false);

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
    setIsDealingAnim(true);
    setDealerMood('dealing');
    setDealerSpeech('แจกไพ่บาคาร่าครับ! Player ปะทะ Banker ลุ้น 8-9 ป๊อก!');

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

    setTimeout(() => {
      setIsDealingAnim(false);
      setDealerMood('idle');
      setPlayerHand(pHand);
      setBankerHand(bHand);
      setShoe(currentShoe);
      bridge.playSfx('click');

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
    }, 600);
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
      setDealerMood('shocked');
      setDealerSpeech(`ยินดีด้วยครับเฮีย! แทงฝั่ง ${winner.toUpperCase()} กินเต็มเหนี่ยว!`);
      setResultMessage(`🎉 คุณชนะ! ${winner.toUpperCase()} ชนะ (${pScore} ต่อ ${bScore}) รับ ${payout} เหรียญ`);
    } else {
      bridge.playSfx('gameover');
      setDealerMood('happy');
      setDealerSpeech(`ฝั่ง ${winner.toUpperCase()} เข้าป้าย (${pScore} ต่อ ${bScore}) สู้ใหม่ตาหน้าครับ!`);
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
      <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-indigo-950/70 via-slate-900 to-slate-950 border-2 border-indigo-500/40 rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-2xl">
        {/* Table Radial Felt Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-600/20 via-transparent to-transparent pointer-events-none" />

        {/* Dealer Area Top */}
        <div className="flex flex-col items-center relative z-10">
          <DealerAvatar
            mood={dealerMood}
            speechText={dealerSpeech}
            name="ดีลเลอร์ หลินฮุ่ย"
            isDealing={isDealingAnim}
          />

          {/* Bead Plate Road History */}
          {history.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs sm:max-w-md py-1 px-3 bg-black/40 rounded-full border border-white/10 mt-2 scrollbar-none shadow-inner">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono mr-1">Road:</span>
              {history.map((rec, idx) => (
                <span
                  key={idx}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 shadow ${
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
        </div>

        {/* Card Stage: Player vs Banker Table Felt */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 my-2 relative z-10">
          {/* Player Side */}
          <div className="flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-blue-950/40 border border-blue-500/40 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-black text-blue-300">PLAYER</span>
              {playerHand.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 font-mono font-bold text-xs">
                  แต้ม: {pScore}
                </span>
              )}
            </div>

            <div className="flex gap-2 min-h-[96px] items-center justify-center">
              {playerHand.length === 0 ? (
                <div className="text-xs text-blue-400/40 italic">รอแจกไพ่</div>
              ) : (
                playerHand.map(card => (
                  <CardVisual key={card.id} card={card} size="md" />
                ))
              )}
            </div>
          </div>

          {/* Banker Side */}
          <div className="flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-black text-rose-300">BANKER</span>
              {bankerHand.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 font-mono font-bold text-xs">
                  แต้ม: {bScore}
                </span>
              )}
            </div>

            <div className="flex gap-2 min-h-[96px] items-center justify-center">
              {bankerHand.length === 0 ? (
                <div className="text-xs text-rose-400/40 italic">รอแจกไพ่</div>
              ) : (
                bankerHand.map(card => (
                  <CardVisual key={card.id} card={card} size="md" />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Result Message */}
        {resultMessage && (
          <div className="my-1 py-2 px-4 rounded-xl text-center font-bold text-sm bg-slate-900/90 border border-amber-500/40 text-amber-300 animate-scale-up shadow-xl relative z-10">
            {resultMessage}
          </div>
        )}

        {/* First-Person POV Controls & Hands */}
        <FirstPersonHands isBetting={isPlaying}>
          <div className="flex flex-col gap-2.5 w-full max-w-md">
            {/* Bet Target Selectors */}
            <div className="grid grid-cols-3 gap-2">
              <button
                disabled={isPlaying}
                onClick={() => {
                  setSelectedBet('player');
                  bridge.playSfx('click');
                }}
                className={`py-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  selectedBet === 'player'
                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/40 ring-2 ring-blue-400 -translate-y-1'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="font-black text-xs sm:text-sm">PLAYER (น้ำเงิน)</span>
                <span className="text-[10px] opacity-80">1 : 1</span>
              </button>

              <button
                disabled={isPlaying}
                onClick={() => {
                  setSelectedBet('tie');
                  bridge.playSfx('click');
                }}
                className={`py-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  selectedBet === 'tie'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-400 -translate-y-1'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="font-black text-xs sm:text-sm">TIE (เสมอ)</span>
                <span className="text-[10px] opacity-80">8 : 1</span>
              </button>

              <button
                disabled={isPlaying}
                onClick={() => {
                  setSelectedBet('banker');
                  bridge.playSfx('click');
                }}
                className={`py-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  selectedBet === 'banker'
                    ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-500/40 ring-2 ring-rose-400 -translate-y-1'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="font-black text-xs sm:text-sm">BANKER (แดง)</span>
                <span className="text-[10px] opacity-80">0.95 : 1</span>
              </button>
            </div>

            {/* Amount selector and Deal button */}
            <div className="flex flex-col sm:flex-row items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl w-full sm:w-auto justify-center">
                {[10, 25, 50, 100].map(amt => (
                  <button
                    key={amt}
                    disabled={isPlaying}
                    onClick={() => {
                      setBetAmount(amt);
                      bridge.playSfx('click');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                      betAmount === amt
                        ? 'bg-amber-500 text-slate-950 shadow scale-105'
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
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black text-sm hover:brightness-110 active:scale-95 shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isPlaying ? 'กำลังเปิดไพ่...' : `วางเดิมพัน (${betAmount} เหรียญ)`}</span>
              </button>
            </div>
          </div>
        </FirstPersonHands>

      </div>
    </div>
  );
};
