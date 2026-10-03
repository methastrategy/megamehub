import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, RotateCcw, Crown } from 'lucide-react';
import type { Card } from '../../engines/card/CardTypes';
import { DeckEngine } from '../../engines/card/Deck';
import { CardVisual } from '../../engines/card/CardVisual';
import { bridge } from '../../sdk/MeGameBridge';

interface SlaveGameProps {
  onBackToHub: () => void;
}

type SlaveRank = 'king' | 'queen' | 'people' | 'slave';

interface PlayerSeat {
  id: number;
  name: string;
  avatar: string;
  isBot: boolean;
  hand: Card[];
  rankTitle?: SlaveRank;
  finishedPlace?: number;
}

export const SlaveGame: React.FC<SlaveGameProps> = ({ onBackToHub }) => {
  const [players, setPlayers] = useState<PlayerSeat[]>([]);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [currentTrick, setCurrentTrick] = useState<{ playedBy: number; cards: Card[] } | null>(null);
  const [consecutivePasses, setConsecutivePasses] = useState<number>(0);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [rankings, setRankings] = useState<{ playerId: number; name: string; title: SlaveRank }[]>([]);

  // Initialize new match
  const startNewMatch = () => {
    const rawDeck = DeckEngine.shuffle(DeckEngine.createStandardDeck());
    
    // Sort player's hand by Slave rank (3 lowest to 2 highest)
    const sortSlaveHand = (hand: Card[]) => {
      return [...hand].sort((a, b) => {
        const valDiff = DeckEngine.getSlaveValue(a.rank) - DeckEngine.getSlaveValue(b.rank);
        if (valDiff !== 0) return valDiff;
        return DeckEngine.getSuitValue(a.suit) - DeckEngine.getSuitValue(b.suit);
      });
    };

    const p0Hand = sortSlaveHand(rawDeck.slice(0, 13));
    const p1Hand = sortSlaveHand(rawDeck.slice(13, 26));
    const p2Hand = sortSlaveHand(rawDeck.slice(26, 39));
    const p3Hand = sortSlaveHand(rawDeck.slice(39, 52));

    const initialSeats: PlayerSeat[] = [
      { id: 0, name: 'คุณ', avatar: '😎', isBot: false, hand: p0Hand },
      { id: 1, name: 'สมชาย AI', avatar: '🤖', isBot: true, hand: p1Hand },
      { id: 2, name: 'น้ำหวาน AI', avatar: '🐱', isBot: true, hand: p2Hand },
      { id: 3, name: 'พี่บิ๊ก AI', avatar: '🐻', isBot: true, hand: p3Hand },
    ];

    // Find who has 3 of Clubs (3♣)
    let starter = 0;
    initialSeats.forEach(seat => {
      if (seat.hand.some(c => c.rank === '3' && c.suit === 'clubs')) {
        starter = seat.id;
      }
    });

    setPlayers(initialSeats);
    setCurrentTurn(starter);
    setCurrentTrick(null);
    setConsecutivePasses(0);
    setSelectedCards([]);
    setGameOver(false);
    setRankings([]);
    setStatusMessage(`${initialSeats[starter].name} ถือ 3 ดอกจิก (3♣) ได้เริ่มเปิดตาก่อน!`);
    bridge.playSfx('click');
  };

  useEffect(() => {
    startNewMatch();
  }, []);

  // Bot Turn Automation
  useEffect(() => {
    if (gameOver || players.length === 0) return;
    const activePlayer = players[currentTurn];
    if (!activePlayer || !activePlayer.isBot || activePlayer.hand.length === 0) return;

    const timer = setTimeout(() => {
      handleBotMove(activePlayer);
    }, 850);

    return () => clearTimeout(timer);
  }, [currentTurn, players, gameOver, currentTrick]);

  // Evaluate card strength
  const isMoveValid = (cardsToPlay: Card[], trick: { playedBy: number; cards: Card[] } | null): boolean => {
    if (cardsToPlay.length === 0) return false;

    // Check if cards to play have matching rank (for pair/triple)
    const firstRank = cardsToPlay[0].rank;
    const allSameRank = cardsToPlay.every(c => c.rank === firstRank);
    if (!allSameRank) return false;

    if (!trick) return true; // Lead player can play single, pair, triple, quad

    // Count must match current trick
    if (cardsToPlay.length !== trick.cards.length) return false;

    const topTrickCard = trick.cards[trick.cards.length - 1];
    const topPlayCard = cardsToPlay[cardsToPlay.length - 1];

    const trickVal = DeckEngine.getSlaveValue(topTrickCard.rank);
    const playVal = DeckEngine.getSlaveValue(topPlayCard.rank);

    if (playVal > trickVal) return true;
    if (playVal === trickVal) {
      // Tie-breaker by suit
      return DeckEngine.getSuitValue(topPlayCard.suit) > DeckEngine.getSuitValue(topTrickCard.suit);
    }
    return false;
  };

  // Bot AI decision logic
  const handleBotMove = (bot: PlayerSeat) => {
    // If leading (trick is null)
    if (!currentTrick) {
      // Bot plays lowest single card
      const card = bot.hand[0];
      executePlay(bot.id, [card]);
      return;
    }

    // Trying to beat current trick
    const trickCount = currentTrick.cards.length;
    let chosenMove: Card[] | null = null;

    if (trickCount === 1) {
      for (const card of bot.hand) {
        if (isMoveValid([card], currentTrick)) {
          chosenMove = [card];
          break;
        }
      }
    } else if (trickCount === 2) {
      // Find pair
      for (let i = 0; i < bot.hand.length - 1; i++) {
        if (bot.hand[i].rank === bot.hand[i + 1].rank) {
          const pair = [bot.hand[i], bot.hand[i + 1]];
          if (isMoveValid(pair, currentTrick)) {
            chosenMove = pair;
            break;
          }
        }
      }
    }

    if (chosenMove) {
      executePlay(bot.id, chosenMove);
    } else {
      executePass(bot.id);
    }
  };

  // Execute Play
  const executePlay = (playerId: number, cards: Card[]) => {
    const updatedPlayers = players.map(p => {
      if (p.id === playerId) {
        const remaining = p.hand.filter(c => !cards.some(rc => rc.id === c.id));
        return { ...p, hand: remaining };
      }
      return p;
    });

    setCurrentTrick({ playedBy: playerId, cards });
    setConsecutivePasses(0);
    setSelectedCards([]);
    bridge.playSfx('correct');

    const playerNow = updatedPlayers[playerId];
    setStatusMessage(`${playerNow.name} ลง ${cards.map(c => c.rank).join(' ')}`);

    // Check if player finished
    if (playerNow.hand.length === 0 && !playerNow.finishedPlace) {
      const place = rankings.length + 1;
      const rankTitle: SlaveRank = place === 1 ? 'king' : place === 2 ? 'queen' : place === 3 ? 'people' : 'slave';
      const newRankings = [...rankings, { playerId, name: playerNow.name, title: rankTitle }];
      setRankings(newRankings);

      updatedPlayers[playerId].finishedPlace = place;
      updatedPlayers[playerId].rankTitle = rankTitle;

      if (newRankings.length === 3) {
        // Last remaining player is Slave
        const lastPlayer = updatedPlayers.find(p => p.hand.length > 0);
        if (lastPlayer) {
          lastPlayer.finishedPlace = 4;
          lastPlayer.rankTitle = 'slave';
          newRankings.push({ playerId: lastPlayer.id, name: lastPlayer.name, title: 'slave' });
        }
        setRankings(newRankings);
        setPlayers(updatedPlayers);
        setGameOver(true);
        bridge.playSfx('victory');
        confetti({ particleCount: 80, spread: 70 });
        bridge.recordGameResult({
          gameId: 'slave',
          score: place === 1 ? 100 : place === 2 ? 60 : 20,
          coinsEarned: place === 1 ? 50 : 20
        });
        return;
      }
    }

    setPlayers(updatedPlayers);
    advanceTurn(playerId, updatedPlayers);
  };

  // Execute Pass
  const executePass = (playerId: number) => {
    bridge.playSfx('tick');
    const passes = consecutivePasses + 1;
    setConsecutivePasses(passes);
    setStatusMessage(`${players[playerId].name} ขอผ่าน (Pass)`);

    // Active players still with cards
    const activeCount = players.filter(p => p.hand.length > 0).length;

    if (passes >= activeCount - 1 && currentTrick) {
      // Trick Cleared!
      setTimeout(() => {
        setStatusMessage(`กองถูกเคลียร์! ${players[currentTrick.playedBy].name} ได้เริ่มเปิดรอบใหม่`);
        setCurrentTrick(null);
        setConsecutivePasses(0);
        setCurrentTurn(currentTrick.playedBy);
        bridge.playSfx('click');
      }, 700);
      return;
    }

    advanceTurn(playerId, players);
  };

  // Move turn to next active player
  const advanceTurn = (
    fromId: number,
    currentSeats: PlayerSeat[]
  ) => {
    let next = (fromId + 1) % 4;
    let loopGuard = 0;
    while (currentSeats[next].hand.length === 0 && loopGuard < 4) {
      next = (next + 1) % 4;
      loopGuard++;
    }
    setCurrentTurn(next);
  };

  // Card Selection by Player
  const toggleSelectCard = (card: Card) => {
    if (currentTurn !== 0 || gameOver) return;
    bridge.playSfx('click');
    setSelectedCards(prev => {
      const exists = prev.some(c => c.id === card.id);
      if (exists) return prev.filter(c => c.id !== card.id);
      return [...prev, card];
    });
  };

  const handlePlayerPlay = () => {
    if (selectedCards.length === 0) return;
    if (!isMoveValid(selectedCards, currentTrick)) {
      alert('ไพ่ที่เลือกไม่ถูกต้อง หรือแต้มไม่สูงกว่าไพ่บนโต๊ะครับ');
      return;
    }
    executePlay(0, selectedCards);
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
          <Crown className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-black text-white">ไพ่สลาฟ (President)</h2>
        </div>

        <button
          onClick={startNewMatch}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          title="เริ่มเกมใหม่"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Main Table Arena */}
      <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-950 border-2 border-amber-600/30 rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-2xl">
        {/* Opponents Seats (Top, Left, Right) */}
        <div className="flex items-center justify-between w-full">
          {/* Bot 3 (Left) */}
          {players[3] && (
            <div className={`flex flex-col items-center p-2 rounded-2xl border transition ${
              currentTurn === 3 ? 'bg-amber-500/10 border-amber-500' : 'bg-slate-900/60 border-slate-800'
            }`}>
              <span className="text-xl">{players[3].avatar}</span>
              <span className="text-xs font-bold text-slate-300">{players[3].name}</span>
              <span className="text-[10px] text-amber-400">{players[3].hand.length} ใบ</span>
            </div>
          )}

          {/* Bot 2 (Top Center) */}
          {players[2] && (
            <div className={`flex flex-col items-center p-2 rounded-2xl border transition ${
              currentTurn === 2 ? 'bg-amber-500/10 border-amber-500' : 'bg-slate-900/60 border-slate-800'
            }`}>
              <span className="text-xl">{players[2].avatar}</span>
              <span className="text-xs font-bold text-slate-300">{players[2].name}</span>
              <span className="text-[10px] text-amber-400">{players[2].hand.length} ใบ</span>
            </div>
          )}

          {/* Bot 1 (Right) */}
          {players[1] && (
            <div className={`flex flex-col items-center p-2 rounded-2xl border transition ${
              currentTurn === 1 ? 'bg-amber-500/10 border-amber-500' : 'bg-slate-900/60 border-slate-800'
            }`}>
              <span className="text-xl">{players[1].avatar}</span>
              <span className="text-xs font-bold text-slate-300">{players[1].name}</span>
              <span className="text-[10px] text-amber-400">{players[1].hand.length} ใบ</span>
            </div>
          )}
        </div>

        {/* Center Trick Stage */}
        <div className="my-auto py-6 flex flex-col items-center justify-center min-h-[160px]">
          <div className="text-xs text-amber-300/80 mb-3 font-mono">
            {statusMessage}
          </div>

          <div className="flex gap-2 items-center justify-center min-h-[100px] p-4 rounded-3xl bg-black/40 border border-slate-800">
            {currentTrick ? (
              currentTrick.cards.map(card => (
                <CardVisual key={card.id} card={card} size="lg" />
              ))
            ) : (
              <span className="text-xs text-slate-500 py-6 px-10">
                โต๊ะว่าง (คนเปิดลงไพ่เดี่ยว คู่ หรือตองได้อิสระ)
              </span>
            )}
          </div>
        </div>

        {/* Player 0 (You) Hand & Action Bar */}
        <div className="flex flex-col items-center w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">😎</span>
            <span className="text-sm font-bold text-slate-200">ไพ่ของคุณ (เลือกเพื่อลง)</span>
            <span className="text-xs text-slate-400">({p0?.hand.length || 0} ใบ)</span>
          </div>

          {/* Player Hand Cards */}
          <div className="flex flex-wrap gap-1 sm:gap-2 justify-center max-w-full pb-3 max-h-36 overflow-y-auto">
            {p0?.hand.map(card => {
              const isSelected = selectedCards.some(sc => sc.id === card.id);
              return (
                <CardVisual
                  key={card.id}
                  card={card}
                  selected={isSelected}
                  size="md"
                  onClick={() => toggleSelectCard(card)}
                />
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full max-w-sm mt-2">
            <button
              disabled={currentTurn !== 0 || !currentTrick || gameOver}
              onClick={() => executePass(0)}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-bold text-sm transition"
            >
              ผ่าน (PASS)
            </button>
            <button
              disabled={currentTurn !== 0 || selectedCards.length === 0 || gameOver}
              onClick={handlePlayerPlay}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-sm hover:brightness-110 disabled:opacity-40 shadow-lg shadow-amber-500/25 transition"
            >
              ลงไพ่ ({selectedCards.length} ใบ)
            </button>
          </div>
        </div>

        {/* Game Over Leaderboard Modal */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <Crown className="w-16 h-16 text-amber-400 mb-2 animate-bounce" />
            <h2 className="text-3xl font-black text-white mb-1">จบเกมรอบนี้!</h2>
            <p className="text-xs text-slate-400 mb-6">สรุปยศผู้เล่นประจำเกมสลาฟ</p>

            <div className="w-full max-w-xs space-y-2 mb-6 text-left">
              {rankings.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-xl border font-bold text-sm ${
                    r.title === 'king'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : r.title === 'queen'
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                      : r.title === 'people'
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-center">{i + 1}.</span>
                    <span>{r.name}</span>
                  </div>
                  <span className="uppercase text-xs tracking-wider px-2 py-0.5 rounded bg-black/40">
                    {r.title}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={startNewMatch}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold hover:brightness-110 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>เล่นรอบถัดไป</span>
              </button>
              <button
                onClick={() => {
                  bridge.playSfx('click');
                  onBackToHub();
                }}
                className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold hover:bg-slate-700"
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
