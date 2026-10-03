import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, RotateCcw, Sparkles, Beer, Dumbbell, Crown } from 'lucide-react';
import type { Card } from '../../engines/card/CardTypes';
import { DeckEngine } from '../../engines/card/Deck';
import { CardVisual } from '../../engines/card/CardVisual';
import { bridge } from '../../sdk/MeGameBridge';

interface DoraemonPartyGameProps {
  onBackToHub: () => void;
}

type PartyMode = 'party_drink' | 'healthy_dare';

interface CardRuleInfo {
  title: string;
  tag: string;
  description: string;
  actionDrink: string;
  actionHealthy: string;
}

const DORAEMON_RULES: Record<string, CardRuleInfo> = {
  'A': {
    title: 'คนเปิดโดนเต็มๆ!',
    tag: 'คนเดียว',
    description: 'ดวงมาเต็ม คนที่เปิดไพ่ใบนี้ต้องรับบทลงโทษทันที',
    actionDrink: 'ดื่ม 1 ช็อต / 1 อึก',
    actionHealthy: 'สควอท 10 ครั้ง หรือ วิดพื้น 5 ครั้ง'
  },
  '2': {
    title: 'เลือกคู่หู (ดูโอ้)',
    tag: 'เลือกเพื่อน',
    description: 'เลือกเพื่อนในวง 1 คน มารับบทลงโทษด้วยกัน',
    actionDrink: 'ดื่มคู่กับเพื่อน 1 คน',
    actionHealthy: 'จับคู่ไฮไฟว์ แล้วกระโดดตบคนละ 10 ครั้ง'
  },
  '3': {
    title: 'สามช่า (ตรีโอ้)',
    tag: '3 คน',
    description: 'เลือกเพื่อนร่วมชะตากรรมอีก 2 คน โดนรวมเป็น 3 คน',
    actionDrink: 'ชนแก้วและดื่มพร้อมกัน 3 คน',
    actionHealthy: 'ทั้ง 3 คนร้องเพลงท่อนฮุกพร้อมเต้น'
  },
  '4': {
    title: 'คนซ้ายรับเคราะห์',
    tag: 'คนทางซ้าย',
    description: 'เพื่อนที่นั่งอยู่ทางซ้ายมือของคนเปิด ต้องรับบทลงโทษ',
    actionDrink: 'คนทางซ้ายดื่ม 1 อึก',
    actionHealthy: 'คนทางซ้ายทำท่าสะพานโค้ง หรือ ยืนขาเดียว 15 วินาที'
  },
  '5': {
    title: '5G เฮฮาทั้งวง!',
    tag: 'ทุกคน',
    description: 'ไพ่แห่งความสามัคคี ทุกคนในวงต้องทำพร้อมกัน',
    actionDrink: 'ทุกคนชนแก้ว ดื่มพร้อมกัน!',
    actionHealthy: 'ทุกคนลุกขึ้นยืนแล้วตะโกน "ไชโย!" พร้อมกัน'
  },
  '6': {
    title: 'คนขวารับกรรม',
    tag: 'คนทางขวา',
    description: 'เพื่อนที่นั่งอยู่ทางขวามือของคนเปิด ต้องรับบทลงโทษ',
    actionDrink: 'คนทางขวาดื่ม 1 อึก',
    actionHealthy: 'คนทางขวาต้องทำหน้าตลกให้เพื่อนในวงขำ'
  },
  '7': {
    title: 'เกมนับเลข 7 มรณะ',
    tag: 'มินิเกม',
    description: 'วนนับเลข 1, 2, 3... ห้ามพูดเลข 7 หรือเลขที่หารด้วย 7 ลงตัว (ให้พูด "ข้าม" หรือตบมือ) ใครพลาดรับบทลงโทษ',
    actionDrink: 'คนที่นับพลาดดื่ม 1 อึก',
    actionHealthy: 'คนที่นับพลาดต้องพูดสุนทรพจน์ 30 วินาที'
  },
  '8': {
    title: 'การ์ดชุบชีวิต / พักเบรก',
    tag: 'สิทธิ์พิเศษ',
    description: 'เก็บไพ่ใบนี้ไว้กับตัว สามารถใช้ยกเว้นบทลงโทษได้ 1 ครั้ง หรือใช้ขออนุญาตไปเข้าห้องน้ำ',
    actionDrink: 'การ์ดรอดชีวิต 1 ครั้ง (เก็บไว้ใช้ได้)',
    actionHealthy: 'การ์ดพักเหนื่อย 1 ครั้ง'
  },
  '9': {
    title: 'ตั้งหมวดหมู่วัดกึ๋น',
    tag: 'มินิเกม',
    description: 'คนเปิดตั้งหมวด (เช่น ยี่ห้อรถ, ชื่อดารา, ร้านสะดวกซื้อ) แล้ววนตอบทีละคน ห้ามตอบซ้ำ ห้ามคิดเกิน 3 วิ',
    actionDrink: 'คนตอบไม่ได้หรือตอบซ้ำ ดื่ม 1 อึก',
    actionHealthy: 'คนตอบไม่ได้ต้องทำเสียงเลียนแบบสัตว์ที่เพื่อนสั่ง'
  },
  '10': {
    title: 'เลอะแป้ง / แดนซ์กระจาย',
    tag: 'ท่าฮา',
    description: 'บทลงโทษสายขำ ถ้ามีแป้งต้องโดนโปะหน้า หรือเต้นตามที่เพื่อนสั่ง 1 ท่า',
    actionDrink: 'โดนแป้งโปะหน้า หรือดื่มครึ่งแก้ว',
    actionHealthy: 'เต้นเพลงไก่ย่างถูกเผา หรือสเต็ปแดนซ์ 20 วินาที'
  },
  'J': {
    title: 'เกมจับหน้า (Jack)',
    tag: 'วัดปฏิกิริยา',
    description: 'คนเปิดเอามือแตะหน้าผากหรือหูตัวเอง ทุกคนในวงต้องทำตามทันที ใครทำช้าที่สุดรับบทลงโทษ!',
    actionDrink: 'คนทำช้าสุดดื่ม 1 อึก',
    actionHealthy: 'คนทำช้าสุดสควอท 10 ครั้ง'
  },
  'Q': {
    title: 'เพื่อนไม่คบ (Queen)',
    tag: 'ห้ามคุย',
    description: 'จนกว่าจะมีคนเปิดได้ Q ใบถัดไป ห้ามใครพูดหรือตอบคำถามของคนเปิดใบนี้ ใครเผลอตอบรับบทลงโทษ!',
    actionDrink: 'ใครเผลอคุยด้วย ดื่ม 1 อึก',
    actionHealthy: 'ใครเผลอคุยด้วย โดนดีดมะกอก 1 ที'
  },
  'K': {
    title: 'ราชาตั้งกฎเหล็ก (King)',
    tag: 'ตั้งกฎใหม่',
    description: 'คนเปิดได้สถาปนาเป็นราชา ตั้งกฎ 1 ข้อ (เช่น ห้ามชี้นิ้ว, ห้ามสบตา, ห้ามพูดคำหยาบ) ใครฝ่าฝืนโดนลงโทษจนจบเกม!',
    actionDrink: 'ใครทำผิดกฎ ดื่มทันที',
    actionHealthy: 'ใครทำผิดกฎ ทำท่าแพลงก์ 20 วินาที'
  }
};

export const DoraemonPartyGame: React.FC<DoraemonPartyGameProps> = ({ onBackToHub }) => {
  const [deck, setDeck] = useState<Card[]>(() => DeckEngine.shuffle(DeckEngine.createStandardDeck()));
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [drawnCards, setDrawnCards] = useState<Card[]>([]);
  const [mode, setMode] = useState<PartyMode>('party_drink');
  const [kingRules, setKingRules] = useState<string[]>([]);
  const [newRuleInput, setNewRuleInput] = useState('');
  const [showKingRuleModal, setShowKingRuleModal] = useState(false);

  // Draw card from deck
  const handleDrawCard = () => {
    if (deck.length === 0) {
      bridge.playSfx('victory');
      confetti({ particleCount: 100, spread: 80 });
      return;
    }

    const nextCard = deck[0];
    setDeck(prev => prev.slice(1));
    setCurrentCard(nextCard);
    setDrawnCards(prev => [nextCard, ...prev]);

    if (nextCard.rank === 'K') {
      bridge.playSfx('victory');
      setShowKingRuleModal(true);
    } else if (nextCard.rank === 'A' || nextCard.rank === '5') {
      bridge.playSfx('urgent');
    } else {
      bridge.playSfx('click');
    }

    bridge.triggerHaptic('success');
  };

  const resetGame = () => {
    setDeck(DeckEngine.shuffle(DeckEngine.createStandardDeck()));
    setCurrentCard(null);
    setDrawnCards([]);
    setKingRules([]);
    bridge.playSfx('click');
  };

  const handleAddKingRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleInput.trim()) return;
    setKingRules(prev => [...prev, newRuleInput.trim()]);
    setNewRuleInput('');
    setShowKingRuleModal(false);
    bridge.playSfx('correct');
  };

  const currentRule = currentCard ? DORAEMON_RULES[currentCard.rank] : null;

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 max-w-4xl mx-auto select-none">
      {/* Header Bar */}
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

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => {
              setMode('party_drink');
              bridge.playSfx('click');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              mode === 'party_drink' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Beer className="w-3.5 h-3.5" />
            <span>โหมดวงสังสรรค์</span>
          </button>
          <button
            onClick={() => {
              setMode('healthy_dare');
              bridge.playSfx('click');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              mode === 'healthy_dare' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>โหมดสายฟิต & แกล้งฮา</span>
          </button>
        </div>

        <button
          onClick={resetGame}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          title="สับไพ่ใหม่"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* King's Rules Active Banner */}
      {kingRules.length > 0 && (
        <div className="mb-4 bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-slate-900 border border-amber-500/40 rounded-2xl p-3 flex items-center gap-3">
          <Crown className="w-6 h-6 text-amber-400 shrink-0 animate-bounce" />
          <div className="flex-1 overflow-x-auto text-xs text-amber-200">
            <span className="font-bold text-amber-400 mr-2">👑 กฎเหล็กของ King:</span>
            {kingRules.map((rule, idx) => (
              <span key={idx} className="mr-3 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">
                #{idx + 1} {rule}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Arena */}
      <div className="flex-1 flex flex-col items-center justify-between bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
        {/* Top Status */}
        <div className="flex items-center justify-between w-full text-xs text-slate-400 font-mono">
          <span>ไพ่เหลือในกอง: <b className="text-amber-400 text-sm">{deck.length}</b> / 52</span>
          <span>เปิดแล้ว: <b className="text-slate-200 text-sm">{drawnCards.length}</b> ใบ</span>
        </div>

        {/* Center Stage: Card Reveal & Action */}
        <div className="my-auto flex flex-col items-center justify-center text-center py-6 w-full max-w-lg">
          {currentCard && currentRule ? (
            <div className="flex flex-col items-center animate-scale-up w-full">
              <div className="mb-4 transform hover:scale-105 transition duration-300">
                <CardVisual card={currentCard} size="lg" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{currentRule.tag}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                {currentCard.rank} — {currentRule.title}
              </h2>

              <p className="text-sm text-slate-300 mb-4 max-w-md leading-relaxed">
                {currentRule.description}
              </p>

              {/* Action Box */}
              <div className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
                <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                  บทลงโทษประจำการ์ด:
                </div>
                <div className="text-base sm:text-lg font-bold text-amber-300">
                  {mode === 'party_drink' ? currentRule.actionDrink : currentRule.actionHealthy}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4 animate-bounce">🎴</div>
              <h3 className="text-2xl font-black text-white mb-2">
                ไพ่โดเรม่อน / Ohana Party
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xs text-center leading-relaxed">
                สลับกันแตะกองไพ่ด้านล่างทีละคนเพื่อสุ่มเปิดการ์ดคำสั่งและบทลงโทษฮาๆ ในวงเพื่อน
              </p>
            </div>
          )}
        </div>

        {/* Draw Button / Deck */}
        <div className="w-full pt-4 border-t border-slate-800/80 flex flex-col items-center">
          {deck.length > 0 ? (
            <button
              onClick={handleDrawCard}
              className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-slate-950 font-black text-lg hover:brightness-110 active:scale-95 shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-3"
            >
              <span>แตะเพื่อเปิดไพ่ใบถัดไป</span>
              <span className="bg-slate-950/20 px-2.5 py-0.5 rounded-lg text-sm">
                เหลือ {deck.length} ใบ
              </span>
            </button>
          ) : (
            <div className="text-center py-3">
              <span className="text-emerald-400 font-bold text-lg block mb-2">🎉 ครบ 52 ใบแล้ว จบเกม!</span>
              <button
                onClick={resetGame}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
              >
                สับไพ่เริ่มรอบใหม่
              </button>
            </div>
          )}
        </div>
      </div>

      {/* King Rule Input Modal */}
      {showKingRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-lg mb-2">
              <Crown className="w-6 h-6 animate-bounce" />
              <span>คุณได้เป็น King!</span>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              พิมพ์ตั้งกฎเหล็ก 1 ข้อที่ทุกคนในวงต้องปฏิบัติตาม ใครฝ่าฝืนโดนลงโทษทันที:
            </p>
            <form onSubmit={handleAddKingRule} className="space-y-4">
              <input
                type="text"
                autoFocus
                placeholder="เช่น ห้ามชี้นิ้ว, ห้ามเรียกชื่อจริง"
                value={newRuleInput}
                onChange={e => setNewRuleInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                required
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-sm hover:brightness-110"
              >
                ประกาศใช้กฎนี้ทันที
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
