import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, RotateCcw, Trophy, Swords, Sparkles } from 'lucide-react';
import { bridge } from '../../sdk/MeGameBridge';

interface RPSTournamentGameProps {
  onBackToHub: () => void;
}

type RPSChoice = 'rock' | 'paper' | 'scissors';

interface RPSParticipant {
  id: number;
  name: string;
  avatar: string;
  isBot: boolean;
}

interface MatchNode {
  id: string;
  roundName: string;
  p1: RPSParticipant;
  p2: RPSParticipant;
  p1Wins: number;
  p2Wins: number;
  winner?: RPSParticipant;
  targetWins: number;
}

const RPS_INFO: Record<RPSChoice, { emoji: string; nameTh: string; beats: RPSChoice }> = {
  rock: { emoji: '✊', nameTh: 'ค้อน', beats: 'scissors' },
  scissors: { emoji: '✌️', nameTh: 'กรรไกร', beats: 'paper' },
  paper: { emoji: '✋', nameTh: 'กระดาษ', beats: 'rock' }
};

export const RPSTournamentGame: React.FC<RPSTournamentGameProps> = ({ onBackToHub }) => {
  const [participants, setParticipants] = useState<RPSParticipant[]>([
    { id: 0, name: 'คุณ', avatar: '😎', isBot: false },
    { id: 1, name: 'ต้น AI', avatar: '🤖', isBot: true },
    { id: 2, name: 'กิ๊ก AI', avatar: '🐱', isBot: true },
    { id: 3, name: 'บอมบ์ AI', avatar: '🦁', isBot: true },
  ]);

  const [currentMatch, setCurrentMatch] = useState<MatchNode | null>(null);
  const [champion, setChampion] = useState<RPSParticipant | null>(null);
  const [p1Choice, setP1Choice] = useState<RPSChoice | null>(null);
  const [p2Choice, setP2Choice] = useState<RPSChoice | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [roundResult, setRoundResult] = useState<string>('');

  // Start Tournament
  const startTournament = () => {
    const p = [
      { id: 0, name: 'คุณ', avatar: '😎', isBot: false },
      { id: 1, name: 'ต้น AI', avatar: '🤖', isBot: true },
      { id: 2, name: 'กิ๊ก AI', avatar: '🐱', isBot: true },
      { id: 3, name: 'บอมบ์ AI', avatar: '🦁', isBot: true },
    ];
    setParticipants(p);
    setChampion(null);
    setP1Choice(null);
    setP2Choice(null);
    setRoundResult('');

    // Setup Match 1: Semi-final 1 (p[0] vs p[1])
    setCurrentMatch({
      id: 'semi_1',
      roundName: 'รอบรองชนะเลิศ คู่ที่ 1',
      p1: p[0],
      p2: p[1],
      p1Wins: 0,
      p2Wins: 0,
      targetWins: 2
    });
    bridge.playSfx('click');
  };

  React.useEffect(() => {
    startTournament();
  }, []);

  // Player Chooses
  const handlePlayerChoice = (choice: RPSChoice) => {
    if (!currentMatch || countdown !== null || p1Choice !== null) return;
    setP1Choice(choice);
    bridge.playSfx('click');

    // Bot picks random
    const choices: RPSChoice[] = ['rock', 'paper', 'scissors'];
    const botPick = choices[Math.floor(Math.random() * choices.length)];

    // 3-2-1 Countdown Animation
    setCountdown(3);
    bridge.playSfx('tick');

    setTimeout(() => {
      setCountdown(2);
      bridge.playSfx('tick');
      setTimeout(() => {
        setCountdown(1);
        bridge.playSfx('urgent');
        setTimeout(() => {
          setCountdown(null);
          setP2Choice(botPick);
          resolveRoundDuel(choice, botPick);
        }, 500);
      }, 500);
    }, 500);
  };

  // Resolve Duel
  const resolveRoundDuel = (c1: RPSChoice, c2: RPSChoice) => {
    if (!currentMatch) return;

    let matchWinner: 'p1' | 'p2' | 'draw';
    if (c1 === c2) {
      matchWinner = 'draw';
      setRoundResult('🤝 เสมอกัน! ออกอาวุธซ้ำ');
      bridge.playSfx('tick');
    } else if (RPS_INFO[c1].beats === c2) {
      matchWinner = 'p1';
      setRoundResult(`🎉 ${currentMatch.p1.name} ได้แต้ม! (${RPS_INFO[c1].nameTh} ชนะ ${RPS_INFO[c2].nameTh})`);
      bridge.playSfx('correct');
    } else {
      matchWinner = 'p2';
      setRoundResult(`💥 ${currentMatch.p2.name} ได้แต้ม! (${RPS_INFO[c2].nameTh} ชนะ ${RPS_INFO[c1].nameTh})`);
      bridge.playSfx('pass');
    }

    const nextP1Wins = matchWinner === 'p1' ? currentMatch.p1Wins + 1 : currentMatch.p1Wins;
    const nextP2Wins = matchWinner === 'p2' ? currentMatch.p2Wins + 1 : currentMatch.p2Wins;

    const updatedMatch: MatchNode = {
      ...currentMatch,
      p1Wins: nextP1Wins,
      p2Wins: nextP2Wins
    };

    // Check if match won
    if (nextP1Wins >= currentMatch.targetWins || nextP2Wins >= currentMatch.targetWins) {
      const winner = nextP1Wins >= currentMatch.targetWins ? currentMatch.p1 : currentMatch.p2;
      updatedMatch.winner = winner;
      setCurrentMatch(updatedMatch);

      setTimeout(() => {
        advanceTournament(winner, updatedMatch.id);
      }, 1500);
    } else {
      setCurrentMatch(updatedMatch);
      setTimeout(() => {
        setP1Choice(null);
        setP2Choice(null);
        setRoundResult('');
      }, 1200);
    }
  };

  // Advance Tournament Tree
  const advanceTournament = (winner: RPSParticipant, matchId: string) => {
    setP1Choice(null);
    setP2Choice(null);
    setRoundResult('');

    if (matchId === 'semi_1') {
      // Match 2: Semi-final 2 (p[2] vs p[3])
      // Auto-simulate or setup Semi 2
      const botWinner = Math.random() > 0.5 ? participants[2] : participants[3];

      // Move directly to Final!
      setCurrentMatch({
        id: 'final',
        roundName: '👑 รอบชิงชนะเลิศ (Grand Final)',
        p1: winner,
        p2: botWinner,
        p1Wins: 0,
        p2Wins: 0,
        targetWins: 3
      });
      bridge.playSfx('click');
    } else if (matchId === 'final') {
      setChampion(winner);
      setCurrentMatch(null);
      bridge.playSfx('victory');
      confetti({ particleCount: 120, spread: 80 });

      if (winner.id === 0) {
        bridge.recordGameResult({
          gameId: 'rps',
          score: 300,
          coinsEarned: 80
        });
      }
    }
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
          <span>Hub</span>
        </button>

        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-black text-white">เป่ายิ้งฉุบ Tournament</h2>
        </div>

        <button
          onClick={startTournament}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          title="เริ่มทัวร์นาเมนต์ใหม่"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Main Tournament Arena */}
      <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-2 border-orange-500/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        {/* Tournament Stage Banner */}
        <div className="flex items-center justify-between w-full border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-orange-400" />
            <span className="text-sm font-bold text-slate-200">
              {currentMatch?.roundName || 'ทัวร์นาเมนต์สิ้นสุด'}
            </span>
          </div>
          {currentMatch && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-amber-400 font-mono font-bold">
              ใครได้ {currentMatch.targetWins} แต้มก่อนชนะ
            </span>
          )}
        </div>

        {/* Duel Area */}
        {currentMatch && (
          <div className="my-auto py-6 flex flex-col items-center justify-center">
            {/* Duel Scoreboard */}
            <div className="grid grid-cols-3 items-center gap-4 w-full max-w-md mb-6">
              {/* P1 */}
              <div className="flex flex-col items-center p-3 rounded-2xl bg-blue-950/30 border border-blue-500/30">
                <span className="text-2xl mb-1">{currentMatch.p1.avatar}</span>
                <span className="text-xs font-bold text-slate-200">{currentMatch.p1.name}</span>
                <span className="text-2xl font-black text-blue-400 font-mono mt-1">
                  {currentMatch.p1Wins}
                </span>
              </div>

              {/* VS & Countdown */}
              <div className="flex flex-col items-center justify-center">
                {countdown !== null ? (
                  <span className="text-5xl font-black text-amber-400 animate-ping">
                    {countdown}
                  </span>
                ) : (
                  <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                    VS
                  </span>
                )}
              </div>

              {/* P2 */}
              <div className="flex flex-col items-center p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30">
                <span className="text-2xl mb-1">{currentMatch.p2.avatar}</span>
                <span className="text-xs font-bold text-slate-200">{currentMatch.p2.name}</span>
                <span className="text-2xl font-black text-rose-400 font-mono mt-1">
                  {currentMatch.p2Wins}
                </span>
              </div>
            </div>

            {/* Duel Reveal Hands */}
            <div className="flex items-center justify-center gap-8 min-h-[110px] mb-4">
              <div className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-blue-500/50 flex items-center justify-center text-5xl shadow-xl">
                {p1Choice ? RPS_INFO[p1Choice].emoji : '❓'}
              </div>
              <div className="text-2xl font-black text-slate-600">⚡</div>
              <div className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-rose-500/50 flex items-center justify-center text-5xl shadow-xl">
                {p2Choice ? RPS_INFO[p2Choice].emoji : '❓'}
              </div>
            </div>

            {/* Status Feedback */}
            {roundResult && (
              <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-amber-300 font-bold text-sm animate-scale-up">
                {roundResult}
              </div>
            )}
          </div>
        )}

        {/* Action Controls for Player */}
        {currentMatch && currentMatch.p1.id === 0 && (
          <div className="flex flex-col items-center w-full border-t border-slate-800 pt-4">
            <span className="text-xs font-bold text-slate-300 mb-3">
              เลือกอาวุธเป่ายิ้งฉุบของคุณ:
            </span>
            <div className="grid grid-cols-3 gap-3 w-full max-w-md">
              {(['rock', 'scissors', 'paper'] as RPSChoice[]).map(choice => (
                <button
                  key={choice}
                  disabled={countdown !== null || p1Choice !== null}
                  onClick={() => handlePlayerChoice(choice)}
                  className="py-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-orange-500 hover:bg-orange-500/10 active:scale-95 disabled:opacity-40 transition flex flex-col items-center justify-center gap-1 shadow-lg"
                >
                  <span className="text-4xl">{RPS_INFO[choice].emoji}</span>
                  <span className="text-xs font-black text-slate-200 mt-1">
                    {RPS_INFO[choice].nameTh}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Champion Ceremony Modal */}
        {champion && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <Trophy className="w-20 h-20 text-amber-400 mb-3 animate-bounce" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>แชมเปียนประจำทัวร์นาเมนต์</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-1">
              {champion.avatar} {champion.name}
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              คว้าชัยชนะในการแข่งขันเป่ายิ้งฉุบ Tournament!
            </p>
            <div className="flex gap-3">
              <button
                onClick={startTournament}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold text-sm hover:brightness-110 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>แข่งใหม่อีกครั้ง</span>
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
