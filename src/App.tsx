import { useState, useMemo } from 'react';
import { 
  Search, Sparkles, Flame, Users, Swords, 
  Gamepad2, ArrowRight, ShieldCheck, Heart
} from 'lucide-react';
import type { GameMetadata, GameCategory } from './sdk/types';
import { HubHeader } from './components/HubHeader';
import { GameCard } from './components/GameCard';
import { InstallModal } from './components/InstallModal';
import { ChayenGame } from './games/chayen/ChayenGame';
import { CardClashGame } from './games/cardclash/CardClashGame';
import { NeonSnakeGame } from './games/neonsnake/NeonSnakeGame';
import { bridge } from './sdk/MeGameBridge';

const GAME_CATALOG: GameMetadata[] = [
  {
    id: 'chayen',
    title: 'Chayen ชาเย็น',
    subtitle: 'เกมทายคำปาร์ตี้ติดหน้าผาก',
    description: 'ถือโทรศัพท์แนบหน้าผากให้เพื่อนช่วยใบ้ ก้มหน้าจอเมื่อทายถูก เงยหน้าเพื่อข้าม พร้อม 6 หมวดคำศัพท์ไทยและสร้างสำรับคำของตัวเองได้ไม่จำกัด!',
    category: 'party',
    tags: ['Party', 'Offline', 'Gyroscope', 'Custom Decks'],
    icon: '🧋',
    gradient: 'from-orange-500 via-amber-500 to-yellow-600',
    players: '2 - 20 คน',
    isOfflineReady: true,
    hasMotionControls: true,
    rating: 4.9,
    playCount: 1840
  },
  {
    id: 'cardclash',
    title: 'Card Clash 1v1',
    subtitle: 'ไพ่ประลองไหวพริบ & ธาตุ',
    description: 'ดวลการ์ดพลังตัวเลขและธาตุ (ไฟ น้ำ ไม้ สายฟ้า) รองรับทั้งการเล่น 2 คนบนมือถือเครื่องเดียวกัน (Pass & Play) และสู้กับ MeBot AI',
    category: '1v1',
    tags: ['1v1 Arena', 'Pass & Play', 'Smart AI', 'Card Game'],
    icon: '🃏',
    gradient: 'from-indigo-600 via-purple-600 to-pink-600',
    players: '1 - 2 คน',
    isOfflineReady: true,
    rating: 4.8,
    playCount: 1120
  },
  {
    id: 'neonsnake',
    title: 'Neon Snake Arcade',
    subtitle: 'เกมงูนีออนสไตล์เรโทร Y8',
    description: 'เกมงูคลาสสิกอัปเกรดกราฟิกนีออนและปุ่มสัมผัสเสมือนจริง D-Pad ลื่นไหล สะสมคะแนนแลกเหรียญ Hub',
    category: 'arcade',
    tags: ['Arcade', 'Offline', 'Classic', 'Touch D-Pad'],
    icon: '🐍',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    players: '1 คน',
    isOfflineReady: true,
    rating: 4.7,
    playCount: 950
  }
];

export function App() {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Filter games
  const filteredGames = useMemo(() => {
    return GAME_CATALOG.filter(game => {
      const matchCategory = selectedCategory === 'all' || game.category === selectedCategory;
      const matchSearch = 
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Handle Return to Lobby
  const handleBackToHub = () => {
    setActiveGameId(null);
  };

  // Render Active Game if chosen
  if (activeGameId === 'chayen') {
    return <ChayenGame onBackToHub={handleBackToHub} />;
  }
  if (activeGameId === 'cardclash') {
    return <CardClashGame onBackToHub={handleBackToHub} />;
  }
  if (activeGameId === 'neonsnake') {
    return <NeonSnakeGame onBackToHub={handleBackToHub} />;
  }

  // Render Hub Lobby
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <HubHeader onOpenInstallModal={() => setIsInstallModalOpen(true)} />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 md:py-8 flex flex-col gap-8">
        {/* Hero Spotlight: Chayen & Hub Launch */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-950/40 via-slate-900 to-indigo-950/50 border border-slate-800 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>แนะนำเกมปาร์ตี้แห่งปี</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
              เปิดเล่น <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">Chayen ชาเย็น</span> ใน Hub ได้ทันที
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
              เกมทายคำติดหน้าผาก พร้อมเซนเซอร์ก้ม-เงย (Gyroscope), 6 สำรับคำศัพท์ไทยยอดฮิต และระบบสร้างชุดคำศัพท์ของตัวเอง เล่นได้ทันทีโดยไม่ต้องโหลดแอปแยก
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  bridge.playSfx('click');
                  setActiveGameId('chayen');
                }}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-sm hover:brightness-110 shadow-lg shadow-orange-500/25 flex items-center gap-2 transition"
              >
                <span>เริ่มเล่น Chayen เลย</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  bridge.playSfx('click');
                  setIsInstallModalOpen(true);
                }}
                className="px-5 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-sm hover:bg-slate-800 transition"
              >
                วิธีลง iPhone / .IPA
              </button>
            </div>
          </div>

          <div className="relative z-10 shrink-0">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-gradient-to-br from-orange-500/20 to-amber-600/30 border border-orange-500/40 flex flex-col items-center justify-center p-4 shadow-2xl backdrop-blur transform hover:rotate-2 transition">
              <span className="text-6xl sm:text-7xl mb-1">🧋</span>
              <span className="text-xs font-black text-orange-400 tracking-wider">CHAYEN PARTY</span>
            </div>
          </div>
        </div>

        {/* Search & Category Filter Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'ทั้งหมด', icon: <Gamepad2 className="w-4 h-4" /> },
              { id: 'party', label: 'ปาร์ตี้ / ทายคำ', icon: <Users className="w-4 h-4" /> },
              { id: '1v1', label: '1v1 ประลอง', icon: <Swords className="w-4 h-4" /> },
              { id: 'arcade', label: 'อาร์เคด', icon: <Flame className="w-4 h-4" /> }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  bridge.playSfx('click');
                  setSelectedCategory(cat.id as GameCategory);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-md shadow-orange-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="ค้นหาเกมใน Hub..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition"
            />
          </div>
        </div>

        {/* Game Catalog Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>คลังเกมทั้งหมด</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {filteredGames.length} เกม
              </span>
            </h2>
            <span className="text-xs text-slate-500">
              รองรับทั้งออฟไลน์และเล่นหลายคน
            </span>
          </div>

          {filteredGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGames.map(game => (
                <GameCard
                  key={game.id}
                  game={game}
                  onPlay={id => setActiveGameId(id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center">
              <span className="text-4xl block mb-2">🔍</span>
              <h3 className="text-base font-bold text-white mb-1">ไม่พบเกมที่ค้นหา</h3>
              <p className="text-xs text-slate-400">
                ลองค้นหาด้วยคำค้นอื่น หรือเลือกหมวดหมู่อื่นดูนะครับ
              </p>
            </div>
          )}
        </section>

        {/* Architecture & Offline Ready Feature Strip */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">เล่นออฟไลน์ได้ 100%</h4>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                ระบบแคชเกมด้วย PWA Service Worker อยู่บนเครื่องบินหรือไม่มีเน็ตก็เปิดเล่น Chayen และเกมอื่นๆ ได้
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Party & 1v1 Arena</h4>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                รองรับการเล่นเป็นกลุ่มทั้งปาร์ตี้ทายคำ และการดวลกัน 2 คนบนมือถือเครื่องเดียวกัน (Pass & Play)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">App Store & .IPA Ready</h4>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                โครงสร้างรันตาม Apple Guideline 4.7 สามารถ Wrap ด้วย Capacitor เป็น .ipa หรือส่งตรวจขึ้น App Store ได้
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-4 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
        <div className="flex items-center gap-1 text-slate-400">
          <span>MeGAMEHUB</span>
          <span>•</span>
          <span>พัฒนาด้วย Clean Architecture & HTML5 WebKit</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-600">
          <span>สำหรับเล่นกับเพื่อนและครอบครัว</span>
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
        </div>
      </footer>

      {/* Install Modal */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
}

export default App;
