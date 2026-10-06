import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, Play, Coins } from 'lucide-react';
import type { Card } from '../../engines/card/CardTypes';
import { DeckEngine } from '../../engines/card/Deck';
import { CardVisual } from '../../engines/card/CardVisual';
import { bridge } from '../../sdk/MeGameBridge';
import { DealerAvatar, type DealerMood } from '../../components/table/DealerAvatar';
import { FirstPersonHands } from '../../components/table/FirstPersonHands';

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
  const [dealerMood, setDealerMood] = useState<DealerMood>('idle');
  const [dealerSpeech, setDealerSpeech] = useState<string>('วางเดิมพันแล้วเริ่มแจกไพ่เลยครับ!');
  const [isDealingAnim, setIsDealingAnim] = useState<boolean>(false);

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

    setIsDealingAnim(true);
    setDealerMood('dealing');
    setDealerSpeech('แจกไพ่ครับ! ขอให้เปิดมาปังๆ');

    setTimeout(() => {
      setIsDealingAnim(false);
      setDealerMood('idle');
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
      setDealerSpeech('ถึงตาคุณแล้วครับ จะ Hit หรือ Stand ดี?');
      bridge.playSfx('click');
    }, 500);
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
      setDealerMood('shocked');
      setDealerSpeech('อูยยย! แบล็คแจ็คเต็มคาราเบลเลย ยินดีด้วยครับ!');
    } else if (type === 'win') {
      payout = currentBet * 2;
      bridge.playSfx('correct');
      confetti({ particleCount: 50, spread: 50 });
      setDealerMood('shocked');
      setDealerSpeech('สุดยอดครับ! รอบนี้คุณกินเต็ม');
    } else if (type === 'push') {
      payout = currentBet;
      bridge.playSfx('tick');
      setDealerMood('idle');
      setDealerSpeech('แต้มเสมอกัน คืนชิปเดิมพันให้ครับ');
    } else {
      bridge.playSfx('gameover');
      setDealerMood('happy');
      setDealerSpeech('รอบนี้โต๊ะขอนะครับเฮีย สู้ใหม่ตาหน้า!');
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
      <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-emerald-950/70 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-2xl">
        {/* Table Felt Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-600/20 via-transparent to-transparent pointer-events-none" />

        {/* Dealer POV Area */}
        <div className="flex flex-col items-center relative z-10">
          <DealerAvatar
            mood={dealerMood}
            speechText={dealerSpeech}
            name="ดีลเลอร์ สมหวัง"
            isDealing={isDealingAnim}
          />

          <div className="flex items-center gap-2 mt-2 mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">โต๊ะไพ่เจ้ามือ</span>
            {dealerHand.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-mono font-bold text-amber-400 shadow">
                แต้ม: {status === 'player_turn' ? `${dScore.score} + ?` : dScore.score}
              </span>
            )}
          </div>

          <div className="flex gap-2.5 min-h-[96px] sm:min-h-[112px] items-center justify-center p-2 bg-emerald-950/30 rounded-2xl border border-emerald-500/20 shadow-inner">
            {dealerHand.length === 0 ? (
              <div className="text-xs text-emerald-300/40 italic">ไพ่เจ้ามือจะถูกแจกที่นี่</div>
            ) : (
              dealerHand.map(card => (
                <CardVisual key={card.id} card={card} faceDown={card.faceUp === false} size="md" />
              ))
            )}
          </div>
        </div>

        {/* Center Banner / Result Message */}
        <div className="my-3 py-2 border-y border-emerald-600/20 flex flex-col items-center justify-center min-h-[70px] relative z-10">
          {resultMessage ? (
            <div className={`px-6 py-2.5 rounded-2xl text-center font-black text-base sm:text-lg animate-scale-up shadow-xl ${
              resultType === 'win' || resultType === 'blackjack'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                : resultType === 'loss'
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
            }`}>
              {resultMessage}
            </div>
          ) : status === 'player_turn' ? (
            <div className="text-xs uppercase tracking-widest text-emerald-400 font-bold animate-pulse">
              ตาของคุณ: เลือก Hit เพื่อขอไพ่เพิ่ม หรือ Stand เพื่อหยุด
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              เลือกชิปเดิมพันแล้วกด "แจกไพ่" เพื่อเริ่มเกม
            </div>
          )}
        </div>

        {/* First Person Player POV Area */}
        <FirstPersonHands isBetting={status === 'betting'} isInspecting={status === 'player_turn'}>
          <div className="flex flex-col items-center w-full">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">ไพ่ในมือของคุณ</span>
              {playerHand.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-emerald-400 shadow">
                  แต้ม: {pScore.score} {pScore.isBust ? '(เกิน!)' : ''}
                </span>
              )}
            </div>

            {/* Cards in Hand */}
            <div className="flex gap-2.5 min-h-[96px] sm:min-h-[112px] items-center mb-4 p-2 bg-black/40 rounded-2xl border border-white/10 backdrop-blur-sm shadow-xl">
              {playerHand.length === 0 ? (
                <div className="text-xs text-slate-500 italic">รอรับการ์ดจากดีลเลอร์</div>
              ) : (
                playerHand.map(card => (
                  <CardVisual key={card.id} card={card} size="md" />
                ))
              )}
            </div>

            {/* Action Buttons */}
            {status === 'player_turn' ? (
              <div className="flex gap-2.5 w-full max-w-sm justify-center">
                <button
                  onClick={handleHit}
                  className="flex-1 py-3 px-3 rounded-xl bg-indigo-600 text-white font-bold text-xs sm:text-sm hover:bg-indigo-500 active:scale-95 shadow-lg shadow-indigo-600/30 transition"
                >
                  จั่วไพ่ (HIT)
                </button>
                <button
                  onClick={handleStand}
                  className="flex-1 py-3 px-3 rounded-xl bg-amber-600 text-white font-bold text-xs sm:text-sm hover:bg-amber-500 active:scale-95 shadow-lg shadow-amber-600/30 transition"
                >
                  พอแค่นี้ (STAND)
                </button>
                {playerHand.length === 2 && (
                  <button
                    onClick={handleDoubleDown}
                    className="flex-1 py-3 px-3 rounded-xl bg-rose-600 text-white font-bold text-xs sm:text-sm hover:bg-rose-500 active:scale-95 shadow-lg shadow-rose-600/30 transition"
                  >
                    เบิ้ล x2
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center">
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
                          ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🪙 {amt}
                    </button>
                  ))}
                </div>

                <button
                  onClick={dealRound}
                  className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm hover:brightness-110 active:scale-95 shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>แจกไพ่ (เดิมพัน {currentBet})</span>
                </button>
              </div>
            )}
          </div>
        </FirstPersonHands>

      </div>
    </div>
  );
};
