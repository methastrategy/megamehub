import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, RotateCcw, Check, Award } from 'lucide-react';
import type { Card } from '../../engines/card/CardTypes';
import { DeckEngine } from '../../engines/card/Deck';
import { CardVisual } from '../../engines/card/CardVisual';
import { bridge } from '../../sdk/MeGameBridge';

interface DummyGameProps {
  onBackToHub: () => void;
}

interface MeldGroup {
  id: string;
  cards: Card[];
  ownerId: number;
}

export const DummyGame: React.FC<DummyGameProps> = ({ onBackToHub }) => {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [botHand, setBotHand] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [tableMelds, setTableMelds] = useState<MeldGroup[]>([]);
  const [currentTurn, setCurrentTurn] = useState<number>(0); // 0 = Player, 1 = Bot
  const [turnPhase, setTurnPhase] = useState<'draw' | 'action' | 'discard'>('draw');
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winnerMessage, setWinnerMessage] = useState<string>('');

  const startNewDummyMatch = () => {
    const rawDeck = DeckEngine.shuffle(DeckEngine.createStandardDeck());
    const pHand = sortDummyHand(rawDeck.slice(0, 11));
    const bHand = sortDummyHand(rawDeck.slice(11, 22));
    const headCard = rawDeck[22];
    const drawPile = rawDeck.slice(23);

    setPlayerHand(pHand);
    setBotHand(bHand);
    setDiscardPile([headCard]);
    setDeck(drawPile);
    setTableMelds([]);
    setCurrentTurn(0);
    setTurnPhase('draw');
    setSelectedCards([]);
    setGameOver(false);
    setWinnerMessage('');
    setStatusMessage('ตาของคุณ: เลือก "จั่วไพ่" หรือ "เก็บไพ่หัว"');
    bridge.playSfx('click');
  };

  const sortDummyHand = (hand: Card[]) => {
    return [...hand].sort((a, b) => {
      if (a.suit !== b.suit) {
        return DeckEngine.getSuitValue(a.suit) - DeckEngine.getSuitValue(b.suit);
      }
      return a.value - b.value;
    });
  };

  useEffect(() => {
    startNewDummyMatch();
  }, []);

  // Check valid meld (Run or Set)
  const isValidMeld = (cards: Card[]): boolean => {
    if (cards.length < 3) return false;

    // Check Set (all same rank)
    const firstRank = cards[0].rank;
    if (cards.every(c => c.rank === firstRank)) return true;

    // Check Run (same suit, sequential rank)
    const firstSuit = cards[0].suit;
    if (!cards.every(c => c.suit === firstSuit)) return false;

    const sortedVals = [...cards].map(c => c.value).sort((a, b) => a - b);
    for (let i = 0; i < sortedVals.length - 1; i++) {
      if (sortedVals[i + 1] !== sortedVals[i] + 1) return false;
    }
    return true;
  };

  // Player Draws from Deck
  const handlePlayerDrawDeck = () => {
    if (currentTurn !== 0 || turnPhase !== 'draw' || deck.length === 0) return;
    const drawn = deck[0];
    const newDeck = deck.slice(1);
    const newHand = sortDummyHand([...playerHand, drawn]);

    setDeck(newDeck);
    setPlayerHand(newHand);
    setTurnPhase('action');
    setStatusMessage('คุณจั่วไพ่สำเร็จ: เกิดชุดไพ่ หรือเลือกทิ้งไพ่ 1 ใบ');
    bridge.playSfx('click');
  };

  // Player Picks from Discard Pile
  const handlePlayerPickDiscard = () => {
    if (currentTurn !== 0 || turnPhase !== 'draw' || discardPile.length === 0) return;
    const topCard = discardPile[discardPile.length - 1];
    const newDiscard = discardPile.slice(0, -1);
    const newHand = sortDummyHand([...playerHand, topCard]);

    setDiscardPile(newDiscard);
    setPlayerHand(newHand);
    setTurnPhase('action');
    setStatusMessage('คุณเก็บไพ่หัวขึ้นมือ: เลือกเกิดไพ่ หรือทิ้งไพ่');
    bridge.playSfx('click');
  };

  // Player Melds (เกิดไพ่)
  const handlePlayerMeld = () => {
    if (currentTurn !== 0 || turnPhase !== 'action' || selectedCards.length < 3) return;

    if (!isValidMeld(selectedCards)) {
      alert('ชุดไพ่ที่เลือกไม่ถูกต้อง (ต้องเป็นตอง หรือเรียงดอกเดียวกัน 3 ใบขึ้นไป)');
      return;
    }

    const newMeld: MeldGroup = {
      id: 'meld_' + Date.now(),
      cards: selectedCards,
      ownerId: 0
    };

    const remainingHand = playerHand.filter(c => !selectedCards.some(sc => sc.id === c.id));
    setTableMelds(prev => [...prev, newMeld]);
    setPlayerHand(remainingHand);
    setSelectedCards([]);
    bridge.playSfx('correct');

    if (remainingHand.length === 0) {
      handleKnock(0, 'คุณน็อก! วางไพ่หมดมือ ชนะเลิศ');
    } else {
      setStatusMessage('คุณเกิดไพ่สำเร็จ! เลือกทิ้งไพ่ 1 ใบเพื่อจบเทิร์น');
    }
  };

  // Player Discards (ทิ้งไพ่)
  const handlePlayerDiscard = () => {
    if (currentTurn !== 0 || turnPhase !== 'action' || selectedCards.length !== 1) {
      alert('กรุณาเลือกไพ่ที่จะทิ้ง 1 ใบครับ');
      return;
    }

    const cardToDiscard = selectedCards[0];
    const remainingHand = playerHand.filter(c => c.id !== cardToDiscard.id);
    const newDiscard = [...discardPile, cardToDiscard];

    setPlayerHand(remainingHand);
    setDiscardPile(newDiscard);
    setSelectedCards([]);
    bridge.playSfx('tick');

    if (remainingHand.length === 0) {
      handleKnock(0, 'คุณน็อก! ทิ้งไพ่ใบสุดท้าย ชนะเลิศ');
      return;
    }

    // Switch to Bot Turn
    setCurrentTurn(1);
    setTurnPhase('draw');
    setStatusMessage('ตาของสมชาย AI กำลังคิด...');
    setTimeout(handleBotTurn, 1000);
  };

  // Bot Turn Automation
  const handleBotTurn = () => {
    // Bot draws from deck
    if (deck.length === 0) {
      handleKnock(0, 'ไพ่หมดกองกลาง! จบเกม');
      return;
    }

    const drawn = deck[0];
    const newDeck = deck.slice(1);
    const updatedBotHand = [...botHand, drawn];

    // Check if bot can meld
    let newMelds = [...tableMelds];
    let finalHand = [...updatedBotHand];

    const rankCounts: Record<string, Card[]> = {};
    updatedBotHand.forEach(c => {
      rankCounts[c.rank] = rankCounts[c.rank] || [];
      rankCounts[c.rank].push(c);
    });

    for (const rank in rankCounts) {
      if (rankCounts[rank].length >= 3) {
        const setCards = rankCounts[rank].slice(0, 3);
        newMelds.push({
          id: 'meld_bot_' + Date.now(),
          cards: setCards,
          ownerId: 1
        });
        finalHand = finalHand.filter(c => !setCards.some(sc => sc.id === c.id));
        bridge.playSfx('click');
        break;
      }
    }

    // Bot discards highest random single
    const discardCard = finalHand[0] || drawn;
    const remainingBot = finalHand.filter(c => c.id !== discardCard.id);

    setDeck(newDeck);
    setTableMelds(newMelds);
    setBotHand(remainingBot);
    setDiscardPile(prev => [...prev, discardCard]);
    bridge.playSfx('tick');

    if (remainingBot.length === 0) {
      handleKnock(1, 'สมชาย AI น็อก! จบเกม');
      return;
    }

    setCurrentTurn(0);
    setTurnPhase('draw');
    setStatusMessage('ตาของคุณ: เลือก "จั่วไพ่" หรือ "เก็บไพ่หัว"');
  };

  const handleKnock = (winnerId: number, msg: string) => {
    setGameOver(true);
    setWinnerMessage(msg);
    if (winnerId === 0) {
      bridge.playSfx('victory');
      confetti({ particleCount: 80, spread: 70 });
      bridge.recordGameResult({
        gameId: 'dummy',
        score: 120,
        coinsEarned: 50
      });
    } else {
      bridge.playSfx('gameover');
    }
  };

  const toggleSelect = (card: Card) => {
    if (currentTurn !== 0 || gameOver) return;
    bridge.playSfx('click');
    setSelectedCards(prev => {
      const exists = prev.some(c => c.id === card.id);
      if (exists) return prev.filter(c => c.id !== card.id);
      return [...prev, card];
    });
  };

  const topDiscard = discardPile[discardPile.length - 1];

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
          <Award className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-black text-white">ดัมมี่ (Dummy 2 Players)</h2>
        </div>

        <button
          onClick={startNewDummyMatch}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          title="เริ่มเกมใหม่"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Main Table Arena */}
      <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-2 border-indigo-600/30 rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-2xl">
        {/* Opponent (Bot) Area */}
        <div className="flex items-center justify-between w-full border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <div>
              <span className="text-xs font-bold text-slate-200">สมชาย AI</span>
              <div className="text-[10px] text-slate-400">ถือไพ่ {botHand.length} ใบ</div>
            </div>
          </div>
          <div className="text-xs font-mono text-amber-400">
            {currentTurn === 1 ? 'กำลังคิด...' : 'รอตาเดิน'}
          </div>
        </div>

        {/* Center Stage: Melds on Table + Draw/Discard Piles */}
        <div className="my-auto py-4 flex flex-col items-center justify-center">
          <div className="text-xs text-indigo-300 mb-3 font-mono text-center">
            {statusMessage}
          </div>

          <div className="grid grid-cols-2 gap-6 items-center mb-6">
            {/* Draw Pile */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 mb-1">กองจั่ว ({deck.length} ใบ)</span>
              <button
                disabled={currentTurn !== 0 || turnPhase !== 'draw'}
                onClick={handlePlayerDrawDeck}
                className="group relative disabled:opacity-50"
              >
                <CardVisual faceDown size="md" />
                {currentTurn === 0 && turnPhase === 'draw' && (
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold whitespace-nowrap animate-bounce">
                    แตะเพื่อจั่ว
                  </span>
                )}
              </button>
            </div>

            {/* Discard Pile (ไพ่หัว) */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 mb-1">ไพ่กองกลาง / หัว</span>
              <button
                disabled={currentTurn !== 0 || turnPhase !== 'draw' || !topDiscard}
                onClick={handlePlayerPickDiscard}
                className="group relative disabled:opacity-50"
              >
                {topDiscard ? (
                  <CardVisual card={topDiscard} size="md" />
                ) : (
                  <div className="w-14 h-20 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-600">
                    ว่าง
                  </div>
                )}
                {currentTurn === 0 && turnPhase === 'draw' && topDiscard && (
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold whitespace-nowrap">
                    แตะเพื่อเก็บ
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Table Melds (ไพ่ที่เกิดแล้ว) */}
          <div className="w-full bg-black/40 border border-slate-800/80 rounded-2xl p-3 min-h-[90px]">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">
              ไพ่ที่เกิดแล้วบนโต๊ะ ({tableMelds.length} ชุด):
            </div>
            {tableMelds.length > 0 ? (
              <div className="flex flex-wrap gap-4 justify-center">
                {tableMelds.map(meld => (
                  <div key={meld.id} className="flex gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-indigo-500/40">
                    {meld.cards.map(c => (
                      <CardVisual key={c.id} card={c} size="sm" />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-slate-600 py-3">
                ยังไม่มีการเกิดไพ่บนโต๊ะ
              </div>
            )}
          </div>
        </div>

        {/* Player 0 (You) Hand & Action Bar */}
        <div className="flex flex-col items-center w-full border-t border-slate-800/80 pt-3">
          <div className="flex items-center justify-between w-full mb-2 px-2">
            <span className="text-xs font-bold text-slate-200">
              ไพ่ในมือของคุณ ({playerHand.length} ใบ)
            </span>
            <span className="text-[10px] text-slate-400">
              เลือก 3 ใบเพื่อเกิด หรือเลือก 1 ใบเพื่อทิ้ง
            </span>
          </div>

          {/* Player Hand */}
          <div className="flex flex-wrap gap-1 sm:gap-2 justify-center max-w-full pb-3 max-h-36 overflow-y-auto">
            {playerHand.map(card => {
              const isSelected = selectedCards.some(sc => sc.id === card.id);
              return (
                <CardVisual
                  key={card.id}
                  card={card}
                  selected={isSelected}
                  size="md"
                  onClick={() => toggleSelect(card)}
                />
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full max-w-sm mt-1">
            <button
              disabled={currentTurn !== 0 || turnPhase !== 'action' || selectedCards.length < 3}
              onClick={handlePlayerMeld}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>เกิดไพ่ ({selectedCards.length})</span>
            </button>
            <button
              disabled={currentTurn !== 0 || turnPhase !== 'action' || selectedCards.length !== 1}
              onClick={handlePlayerDiscard}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition"
            >
              ทิ้งไพ่ (จบเทิร์น)
            </button>
          </div>
        </div>

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <Award className="w-16 h-16 text-indigo-400 mb-2 animate-bounce" />
            <h3 className="text-2xl font-black text-white mb-2">{winnerMessage}</h3>
            <div className="flex gap-3 mt-4">
              <button
                onClick={startNewDummyMatch}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm hover:brightness-110"
              >
                เริ่มเกมใหม่
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
