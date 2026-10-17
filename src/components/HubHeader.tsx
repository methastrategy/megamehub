import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, Volume2, VolumeX, Wifi, WifiOff, Download, User, Check, Edit2, 
  Radio, Gift, Crown, Sliders, Lock
} from 'lucide-react';
import type { PlayerProfile } from '../sdk/types';
import { bridge } from '../sdk/MeGameBridge';
import { sounds } from '../utils/soundEffects';
import { VipModal } from './VipModal';
import { AudioSettingsModal } from './AudioSettingsModal';

interface HubHeaderProps {
  onOpenInstallModal: () => void;
  onOpenMultiplayerModal: () => void;
}

const REGULAR_AVATARS = ['😎', '🎮', '🐱', '🦊', '🚀', '⚡', '🐉', '🎯'];
const VIP_AVATARS = ['👑', '💎', '🦁', '🎩', '🌟', '🦄'];

export const HubHeader: React.FC<HubHeaderProps> = ({ onOpenInstallModal, onOpenMultiplayerModal }) => {
  const [profile, setProfile] = useState<PlayerProfile>(bridge.getProfile());
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sounds.enabled);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showVipModal, setShowVipModal] = useState<boolean>(false);
  const [vipDefaultTab, setVipDefaultTab] = useState<'vip' | 'daily'>('daily');
  const [showAudioModal, setShowAudioModal] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(profile.name);
  const [avatarAlert, setAvatarAlert] = useState<string | null>(null);

  useEffect(() => {
    const unsub = bridge.subscribe(p => {
      setProfile(p);
      setEditName(p.name);
      setSoundEnabled(sounds.enabled);
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

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    bridge.updateName(editName);
    bridge.playSfx('click');
    setShowProfileModal(false);
  };

  const handleSelectAvatar = (emoji: string, isVipOnly: boolean) => {
    if (isVipOnly && !profile.isVip) {
      bridge.playSfx('pass');
      setAvatarAlert('🔒 อวตารนี้สำหรับสมาชิก VIP เท่านั้น! อัปเกรดเพื่อปลดล็อก');
      return;
    }
    setAvatarAlert(null);
    bridge.updateAvatar(emoji);
    bridge.playSfx('click');
  };

  const canClaimDaily = bridge.canClaimDailyBonus();

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
                  v1.2
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
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Daily Bonus Button */}
            <button
              onClick={() => {
                bridge.playSfx('click');
                setVipDefaultTab('daily');
                setShowVipModal(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm relative ${
                canClaimDaily
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/50 text-amber-300 hover:brightness-125'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="รับเหรียญเช็คอินประจำวัน"
            >
              <Gift className={`w-3.5 h-3.5 ${canClaimDaily ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">โบนัสรายวัน</span>
              {canClaimDaily && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute -top-0.5 -right-0.5 animate-ping" />
              )}
            </button>

            {/* VIP Pass Button */}
            <button
              onClick={() => {
                bridge.playSfx('click');
                setVipDefaultTab('vip');
                setShowVipModal(true);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                profile.isVip
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-slate-900 border border-amber-500/30 text-amber-400 hover:bg-slate-800'
              }`}
              title="เปิดดูสิทธิประโยชน์ VIP"
            >
              <Crown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {profile.isVip ? (profile.vipTier === 'elite' ? 'VIP ELITE' : 'VIP PRO') : 'VIP Pass'}
              </span>
            </button>

            {/* Multiplayer Room Button */}
            <button
              onClick={() => {
                bridge.playSfx('click');
                onOpenMultiplayerModal();
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/40 text-xs font-bold text-orange-300 hover:brightness-125 transition shadow-sm"
              title="สร้างหรือเข้าร่วมห้องเล่นด้วยกัน Realtime"
            >
              <Radio className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              <span className="hidden md:inline">ห้องออนไลน์</span>
            </button>

            {/* Install App button */}
            <button
              onClick={() => {
                bridge.playSfx('click');
                onOpenInstallModal();
              }}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition"
              title="วิธีติดตั้งเป็นแอปบนมือถือ / .IPA"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              <span>ติดตั้งแอป</span>
            </button>

            {/* Global Audio Controls Toggle & Settings */}
            <button
              onClick={() => {
                bridge.playSfx('click');
                setShowAudioModal(true);
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1"
              title="ปรับระดับเสียง & ระบบสั่น"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <Sliders className="w-3 h-3 text-slate-400 hidden sm:inline" />
            </button>

            {/* Coins Badge */}
            <div 
              onClick={() => {
                bridge.playSfx('click');
                setVipDefaultTab('daily');
                setShowVipModal(true);
              }}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400 font-mono shadow-inner cursor-pointer hover:border-amber-500/50 transition"
              title="เหรียญคงเหลือ (กดเพื่อรับโบนัส)"
            >
              <span>🪙</span>
              <span>{profile.coins.toLocaleString()}</span>
            </div>

            {/* User Profile Avatar */}
            <button
              onClick={() => {
                bridge.playSfx('click');
                setShowProfileModal(true);
              }}
              className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 hover:border-indigo-500 transition relative"
            >
              <span className="text-lg">{profile.avatar}</span>
              <span className="hidden md:inline text-xs font-bold text-slate-200 max-w-[80px] truncate">
                {profile.name}
              </span>
              {profile.isVip && (
                <span className="absolute -top-1.5 -right-1.5 text-[10px]">
                  {profile.vipTier === 'elite' ? '💎' : '👑'}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              <span>โปรไฟล์ผู้เล่น MeGAMEHUB</span>
            </h3>

            {avatarAlert && (
              <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between">
                <span>{avatarAlert}</span>
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setVipDefaultTab('vip');
                    setShowVipModal(true);
                  }}
                  className="underline text-amber-400 hover:text-white shrink-0 ml-2"
                >
                  ดู VIP
                </button>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">อวตารมาตรฐาน</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {REGULAR_AVATARS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSelectAvatar(emoji, false)}
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

                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    <span>อวตารพิเศษ VIP Club</span>
                  </label>
                  {!profile.isVip && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> ล็อกอยู่
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {VIP_AVATARS.map(emoji => {
                    const isSelected = profile.avatar === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleSelectAvatar(emoji, true)}
                        className={`text-xl p-2 rounded-2xl border transition relative ${
                          isSelected
                            ? 'bg-amber-500/30 border-amber-400 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                            : profile.isVip
                            ? 'bg-slate-800 border-amber-500/40 hover:bg-slate-700'
                            : 'bg-slate-900 border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        {emoji}
                        {!profile.isVip && (
                          <Lock className="w-2.5 h-2.5 text-amber-400 absolute bottom-1 right-1" />
                        )}
                      </button>
                    );
                  })}
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

      {/* VIP & Daily Bonus Modal */}
      <VipModal
        isOpen={showVipModal}
        onClose={() => setShowVipModal(false)}
        defaultTab={vipDefaultTab}
      />

      {/* Audio & Haptics Settings Modal */}
      <AudioSettingsModal
        isOpen={showAudioModal}
        onClose={() => setShowAudioModal(false)}
      />
    </>
  );
};

