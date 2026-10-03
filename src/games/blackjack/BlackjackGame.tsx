import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, Play, Coins } from 'lucide-react';
import type { Card } from '../../engines/card/CardTypes';
import { DeckEngine } from '../../engines/card/Deck';
import { CardVisual } from '../../engines/card/CardVisual';
import { bridge } from '../../sdk/MeGameBridge';

interface BlackjackGameProps {
  onBackToHub: () => void;
}

type RoundStatus = 'betting' | 'player_turn' | 'dealer_turn' | 'resolved';

export const BlackjackGame: React.FC<BlackjackGameProps> = ({ onBackToHub }) => {
  const [shoe, setShoe] = useState<Card[]>(() => DeckEngine.createShoe(4));
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [currentBet, setCurrentBet] = useState<number>(25);
  const [status, setStatus] = useState<RoundStatus>('betting');
  const [resultMessage, setResultMessage] = useState<string>('');
  const [resultType, setResultType] = useState<'win' | 'loss' | 'push' | 'blackjack' | null>(null);
  const [playerCoins, setPlayerCoins] = useState<number>(() => bridge.getProfile().coins);

  // Sync profile coins
  useEffect(() => {
    return bridge.subscribe(p => setPlayerCoins(p.coins));
  }, []);

  // Start new round
  const dealRound = () => {
    if (playerCoins < currentBet) {
      alert('เหรียญไม่พอสำหรับการวางเดิมพันนี้ครับ!');
      return;
    }

    let currentShoe = [...shoe];
    if (currentShoe.length < 20) {
      currentShoe = DeckEngine.createShoe(4);
    }

    // Deduct bet from profile
    bridge.recordGameResult({
      gameId: 'blackjack',
      score: 0,
      coinsEarned: -currentBet
    });

    // Deal: Player, Dealer, Player, Dealer(faceDown)
    const p1 = currentShoe[0];
    const d1 = currentShoe[1];
    const p2 = currentShoe[2];
    const d2: Card = { ...currentShoe[3], faceUp: false };

    const newShoe = currentShoe.slice(4);
    const initialPlayer = [p1, p2];
    const initialDealer = [d1, d2];

    setShoe(newShoe);
    setPlayerHand(initialPlayer);
    setDealerHand(initialDealer);
    setResultMessage('');
    setResultType(null);

    // Check Natural Blackjack
    const pScore = DeckEngine.calculateBlackjackScore(initialPlayer);
    if (pScore.isBlackjack) {
      // Reveal dealer
      const revealedDealer: Card[] = [d1, { ...d2, faceUp: true }];
      setDealerHand(revealedDealer);
      const dScore = DeckEngine.calculateBlackjackScore(revealedDealer);

      if (dScore.isBlackjack) {
        resolveRound(initialPlayer, revealedDealer, 'push', 'เสมอ! ทั้งคู่ได้ Natural Blackjack');
      } else {
        resolveRound(initialPlayer, revealedDealer, 'blackjack', '🎉 BLACKJACK! ชนะรางวัล 3 ต่อ 2');
      }
      return;
    }

    setStatus('player_turn');
    bridge.playSfx('click');
  };

  // Player Hits
  const handleHit = () => {
    if (status !== 'player_turn' || shoe.length === 0) return;

    const nextCard = shoe[0];
    const newShoe = shoe.slice(1);
    const newHand = [...playerHand, nextCard];

    setShoe(newShoe);
    setPlayerHand(newHand);
    bridge.playSfx('click');

    const score = DeckEngine.calculateBlackjackScore(newHand);
    if (score.isBust) {
      const revealedDealer: Card[] = dealerHand.map(c => ({ ...c, faceUp: true }));
      setDealerHand(revealedDealer);
      resolveRound(newHand, revealedDealer, 'loss', '💥 แต้มเกิน 21 (Bust)! แพ้รอบนี้');
    }
  };

  // Player Stands
  const handleStand = () => {
    if (status !== 'player_turn') return;
    setStatus('dealer_turn');
    bridge.playSfx('click');
    runDealerTurn(playerHand, dealerHand, shoe);
  };

  // Player Double Down
  const handleDoubleDown = () => {
    if (status !== 'player_turn' || playerHand.length !== 2) return;
    if (playerCoins < currentBet) {
      alert('เหรียญไม่พอสำหรับการ Double Down ครับ');
      return;
    }

    bridge.recordGameResult({
      gameId: 'blackjack',
      score: 0,
      coinsEarned: -currentBet
    });
    setCurrentBet(b => b * 2);

    const nextCard = shoe[0];
    const newShoe = shoe.slice(1);
    const newHand = [...playerHand, nextCard];
    setShoe(newShoe);
    setPlayerHand(newHand);
    bridge.playSfx('click');

    const score = DeckEngine.calculateBlackjackScore(newHand);
    if (score.isBust) {
      const revealedDealer: Card[] = dealerHand.map(c => ({ ...c, faceUp: true }));
      setDealerHand(revealedDealer);
      resolveRound(newHand, revealedDealer, 'loss', '💥 แต้มเกิน 21 (Bust)! แพ้รอบนี้');
    } else {
      setStatus('dealer_turn');
      runDealerTurn(newHand, dealerHand, newShoe);
    }
  };

  // Dealer Turn Engine (Hit until >= 17)
  const runDealerTurn = (pHand: Card[], dHand: Card[], currentShoe: Card[]) => {
    let activeDealer: Card[] = dHand.map(c => ({ ...c, faceUp: true }));
    let activeShoe: Card[] = [...currentShoe];

    const step = () => {
      const dScore = DeckEngine.calculateBlackjackScore(activeDealer);
      if (dScore.score < 17 && !dScore.isBust && activeShoe.length > 0) {
        const next = activeShoe[0];
        activeShoe = activeShoe.slice(1);
        activeDealer = [...activeDealer, next];
        setDealerHand([...activeDealer]);
        setShoe([...activeShoe]);
        bridge.playSfx('tick');
        setTimeout(step, 650);
      } else {
        // Evaluate Winner
        const finalPScore = DeckEngine.calculateBlackjackScore(pHand);
        const finalDScore = DeckEngine.calculateBlackjackScore(activeDealer);

        if (finalDScore.isBust) {
          resolveRound(pHand, activeDealer, 'win', '🎉 เจ้ามือแต้มเกิน (Bust)! คุณชนะ');
        } else if (finalPScore.score > finalDScore.score) {
          resolveRound(pHand, activeDealer, 'win', `🎉 คุณชนะด้วยแต้ม ${finalPScore.score} ต่อ ${finalDScore.score}!`);
        } else if (finalDScore.score > finalPScore.score) {
          resolveRound(pHand, activeDealer, 'loss', `เจ้ามือชนะด้วยแต้ม ${finalDScore.score} ต่อ ${finalPScore.score}`);
        } else {
          resolveRound(pHand, activeDealer, 'push', `🤝 เสมอกันที่แต้ม ${finalPScore.score}`);
        }
      }
    };

    setTimeout(step, 400);
  };

  const resolveRound = (
    pHand: Card[],
    _dHand: Card[],
    type: 'win' | 'loss' | 'push' | 'blackjack',
    msg: string
  ) => {
    setStatus('resolved');
    setResultType(type);
    setResultMessage(msg);

    let payout = 0;
    if (type === 'blackjack') {
      payout = Math.floor(currentBet * 2.5);
      bridge.playSfx('victory');
      confetti({ particleCount: 80, spread: 70 });
    } else if (type === 'win') {
      payout = currentBet * 2;
      bridge.playSfx('correct');
      confetti({ particleCount: 50, spread: 50 });
    } else if (type === 'push') {
      payout = currentBet;
      bridge.playSfx('tick');
    } else {
      bridge.playSfx('gameover');
    }

    if (payout > 0) {
      bridge.recordGameResult({
        gameId: 'blackjack',
        score: pHand.length,
        coinsEarned: payout
      });
    }
  };

  const pScore = DeckEngine.calculateBlackjackScore(playerHand);
  const dScore = DeckEngine.calculateBlackjackScore(dealerHand.filter(c => c.faceUp !== false));

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

      {/* Felt Casino Table */}
      <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-600/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        {/* Dealer Area */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🤵</span>
            <span className="text-sm font-bold text-slate-300">เจ้ามือ (Dealer)</span>
            {dealerHand.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-400">
                แต้ม: {status === 'player_turn' ? `${dScore.score} + ?` : dScore.score}
              </span>
            )}
          </div>

          <div className="flex gap-2.5 min-h-[96px] sm:min-h-[112px] items-center">
            {dealerHand.map(card => (
              <CardVisual key={card.id} card={card} faceDown={card.faceUp === false} size="md" />
            ))}
          </div>
        </div>

        {/* Center Banner / Result Message */}
        <div className="my-4 py-4 border-y border-slate-800/80 flex flex-col items-center justify-center min-h-[90px]">
          {resultMessage ? (
            <div className={`px-6 py-2.5 rounded-2xl text-center font-black text-lg animate-scale-up shadow-xl ${
              resultType === 'win' || resultType === 'blackjack'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                : resultType === 'loss'
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
            }`}>
              {resultMessage}
            </div>
          ) : status === 'player_turn' ? (
            <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">
              ตาของคุณ: เลือก Hit หรือ Stand
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              วางเงินเดิมพันแล้วกด "แจกไพ่" เพื่อเริ่มเกม
            </div>
          )}
        </div>

        {/* Player Area */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">😎</span>
            <span className="text-sm font-bold text-slate-200">คุณ (Player)</span>
            {playerHand.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-emerald-400">
                แต้ม: {pScore.score} {pScore.isBust ? '(เกิน)' : ''}
              </span>
            )}
          </div>

          <div className="flex gap-2.5 min-h-[96px] sm:min-h-[112px] items-center mb-4">
            {playerHand.map(card => (
              <CardVisual key={card.id} card={card} size="md" />
            ))}
          </div>

          {/* Action Buttons */}
          {status === 'player_turn' ? (
            <div className="flex gap-3 w-full max-w-sm">
              <button
                onClick={handleHit}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 active:scale-95 shadow-lg shadow-indigo-600/30 transition"
              >
                จั่วไพ่ (HIT)
              </button>
              <button
                onClick={handleStand}
                className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-500 active:scale-95 shadow-lg shadow-amber-600/30 transition"
              >
                พอแค่นี้ (STAND)
              </button>
              {playerHand.length === 2 && (
                <button
                  onClick={handleDoubleDown}
                  className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-500 active:scale-95 shadow-lg shadow-rose-600/30 transition"
                >
                  เบิ้ล 2 เท่า (DOUBLE)
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
              {/* Bet Amount Selector */}
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-2xl w-full sm:w-auto justify-center">
                {[10, 25, 50, 100].map(amt => (
                  <button
                    key={amt}
                    disabled={status !== 'betting'}
                    onClick={() => {
                      setCurrentBet(amt);
                      bridge.playSfx('click');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition ${
                      currentBet === amt
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🪙 {amt}
                  </button>
                ))}
              </div>

              <button
                onClick={dealRound}
                className="w-full sm:flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm hover:brightness-110 active:scale-95 shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>แจกไพ่ (เดิมพัน {currentBet})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
