import React from 'react';
import { Play, Wifi, Users, Smartphone, Star } from 'lucide-react';
import type { GameMetadata } from '../sdk/types';
import { bridge } from '../sdk/MeGameBridge';

interface GameCardProps {
  game: GameMetadata;
  onPlay: (gameId: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onPlay }) => {
  return (
    <div 
      onClick={() => {
        bridge.playSfx('click');
        onPlay(game.id);
      }}
      className="group relative bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col justify-between overflow-hidden"
    >
      {/* Background ambient glow */}
      <div className={`absolute top-0 right-0 w-36 h-36 bg-gradient-to-br ${game.gradient} opacity-15 rounded-full blur-3xl group-hover:opacity-25 transition`} />

      <div>
        {/* Top Badges */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-3xl shadow-lg group-hover:scale-105 transition">
            {game.icon}
          </div>
          
          <div className="flex flex-col items-end gap-1.5">
            {game.isOfflineReady && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <Wifi className="w-2.5 h-2.5" /> ออฟไลน์ได้
              </span>
            )}
            {game.hasMotionControls && (
              <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-[10px] font-bold text-orange-400 flex items-center gap-1">
                <Smartphone className="w-2.5 h-2.5" /> เซนเซอร์ไจโร
              </span>
            )}
          </div>
        </div>

        {/* Title & Desc */}
        <h3 className="text-lg font-black text-white group-hover:text-orange-400 transition mb-1">
          {game.title}
        </h3>
        <p className="text-xs font-semibold text-slate-400 mb-2">
          {game.subtitle}
        </p>
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {game.description}
        </p>
      </div>

      {/* Footer Info */}
      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-500" /> {game.players}
          </span>
          <span className="flex items-center gap-1 text-amber-400 font-semibold">
            <Star className="w-3.5 h-3.5 fill-amber-400" /> {game.rating}
          </span>
        </div>

        <button className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold text-xs group-hover:brightness-110 shadow-md shadow-orange-500/20 flex items-center gap-1 transition">
          <span>เล่น</span>
          <Play className="w-3 h-3 fill-slate-950" />
        </button>
      </div>
    </div>
  );
};
