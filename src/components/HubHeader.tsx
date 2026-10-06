import React, { useState, useEffect } from 'react';
import { Gamepad2, Volume2, VolumeX, Wifi, WifiOff, Download, User, Check, Edit2, Radio } from 'lucide-react';
import type { PlayerProfile } from '../sdk/types';
import { bridge } from '../sdk/MeGameBridge';
import { sounds } from '../utils/soundEffects';

interface HubHeaderProps {
  onOpenInstallModal: () => void;
  onOpenMultiplayerModal: () => void;
}

const AVATAR_OPTIONS = ['😎', '🎮', '🐱', '🦊', '🚀', '👑', '⚡', '🐉'];

export const HubHeader: React.FC<HubHeaderProps> = ({ onOpenInstallModal, onOpenMultiplayerModal }) => {
  const [profile, setProfile] = useState<PlayerProfile>(bridge.getProfile());
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sounds.enabled);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(profile.name);

  useEffect(() => {
    const unsub = bridge.subscribe(p => {
      setProfile(p);
      setEditName(p.name);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(sounds.enabled);
    if (sounds.enabled) {
      bridge.playSfx('click');
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    bridge.updateName(editName);
    bridge.playSfx('click');
    setShowProfileModal(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight bg-gradient-to-r from-orange-400 via-rose-400 to-indigo-400 bg-clip-text text-transparent">
                  MeGAMEHUB
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v1.0
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Wifi className="w-3 h-3" /> ออนไลน์
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400">
                    <WifiOff className="w-3 h-3" /> โหมดออฟไลน์
                  </span>
                )}
                <span>• All-in-One Hub</span>
              </div>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Multiplayer Room Button */}
            <button
              onClick={() => {
                bridge.playSfx('click');
                onOpenMultiplayerModal();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/40 text-xs font-bold text-orange-300 hover:brightness-125 transition shadow-sm"
              title="สร้างหรือเข้าร่วมห้องเล่นด้วยกัน Realtime"
            >
              <Radio className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              <span>ห้องออนไลน์</span>
            </button>

            {/* Install App button */}
            <button
              onClick={() => {
                bridge.playSfx('click');
                onOpenInstallModal();
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition"
              title="วิธีติดตั้งเป็นแอปบนมือถือ / .IPA"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              <span>ติดตั้งแอป</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Coins Badge */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400 font-mono shadow-inner">
              <span>🪙</span>
              <span>{profile.coins}</span>
            </div>

            {/* User Profile Avatar */}
            <button
              onClick={() => {
                bridge.playSfx('click');
                setShowProfileModal(true);
              }}
              className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 hover:border-indigo-500 transition"
            >
              <span className="text-lg">{profile.avatar}</span>
              <span className="hidden md:inline text-xs font-bold text-slate-200 max-w-[80px] truncate">
                {profile.name}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              โปรไฟล์ผู้เล่น MeGAMEHUB
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">เลือกอวตารของคุณ</label>
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        bridge.updateAvatar(emoji);
                        bridge.playSfx('click');
                      }}
                      className={`text-2xl p-2 rounded-2xl border transition ${
                        profile.avatar === emoji
                          ? 'bg-indigo-600/30 border-indigo-500 shadow-md shadow-indigo-500/20'
                          : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">ชื่อในเกม</label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={15}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    required
                  />
                  <Edit2 className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึก</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
