import React, { useState, useEffect } from 'react';
import { 
  Crown, Sparkles, Gift, CheckCircle2, Star, Zap, Shield, 
  X, Check, Flame, Trophy, Coins, Diamond
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { bridge, DAILY_BONUS_TIERS } from '../sdk/MeGameBridge';
import type { PlayerProfile } from '../sdk/types';

interface VipModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'vip' | 'daily';
}

export const VipModal: React.FC<VipModalProps> = ({ isOpen, onClose, defaultTab = 'daily' }) => {
  const [activeTab, setActiveTab] = useState<'vip' | 'daily'>(defaultTab);
  const [profile, setProfile] = useState<PlayerProfile>(bridge.getProfile());
  const [claimStatus, setClaimStatus] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  useEffect(() => {
    const unsub = bridge.subscribe(p => setProfile(p));
    return unsub;
  }, []);

  if (!isOpen) return null;

  const canClaim = bridge.canClaimDailyBonus();
  const currentStreak = profile.dailyBonusStreak || 0;

  const handleClaimDaily = () => {
    const result = bridge.claimDailyBonus();
    setClaimStatus(result.message);
    if (result.success) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const handleActivateTier = (tier: 'pro' | 'elite') => {
    const bonus = bridge.activateVip(tier, 30);
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 }
    });
    setClaimStatus(`🎉 ยินดีด้วย! คุณเปิดใช้งานสิทธิ์ VIP ${tier.toUpperCase()} สำเร็จ รับโบนัสต้อนรับ +${bonus.toLocaleString()} 🪙`);
  };

  const handleCancelVip = () => {
    bridge.cancelVip();
    setClaimStatus('เปลี่ยนสถานะเป็น Free Player แล้ว');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-500 p-5 sm:p-6 text-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950/20 backdrop-blur border border-white/20 flex items-center justify-center shadow-inner">
              <Crown className="w-7 h-7 text-yellow-200 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                  VIP Club & Daily Rewards
                </h3>
                {profile.isVip && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-950 text-amber-300 border border-amber-300/40">
                    {profile.vipTier} Member
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-900/80">
                รับเหรียญฟรีทุกวัน และปลดล็อกสิทธิประโยชน์ระดับ High Roller
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              bridge.playSfx('click');
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-2 gap-2">
          <button
            onClick={() => {
              bridge.playSfx('click');
              setActiveTab('daily');
              setClaimStatus(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'daily'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>รางวัลเช็คอินรายวัน</span>
            {canClaim && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => {
              bridge.playSfx('click');
              setActiveTab('vip');
              setClaimStatus(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'vip'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>สมัครสมาชิก VIP Pass</span>
          </button>
        </div>

        {/* Status Toast */}
        {claimStatus && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold text-center animate-in fade-in">
            {claimStatus}
          </div>
        )}

        {/* Tab 1: Daily Login Rewards */}
        {activeTab === 'daily' && (
          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>สถิติเช็คอินต่อเนื่อง: {currentStreak} วัน</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  ล็อกอินเข้า MeGAMEHUB ติดต่อกัน 7 วันเพื่อรับรางวัลแจ็คพอตใหญ่!
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-amber-400 font-mono">
                  เหรียญของคุณ: {profile.coins.toLocaleString()} 🪙
                </span>
              </div>
            </div>

            {/* 7-Day Timeline Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {DAILY_BONUS_TIERS.map((tierReward, idx) => {
                const dayNum = idx + 1;
                const isClaimedPast = currentStreak >= dayNum && !canClaim;
                const isTodayActive = canClaim && currentStreak === dayNum - 1;
                const isJackpot = dayNum === 7;

                // Adjust for VIP multiplier in display
                const multiplier = profile.vipTier === 'elite' ? 2 : profile.vipTier === 'pro' ? 1.5 : 1;
                const displayReward = Math.round(tierReward * multiplier);

                return (
                  <div
                    key={dayNum}
                    className={`relative rounded-2xl p-2.5 flex flex-col items-center justify-between border transition text-center ${
                      isTodayActive
                        ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/20'
                        : isClaimedPast
                        ? 'bg-slate-800/40 border-slate-700/60 opacity-60'
                        : 'bg-slate-800/80 border-slate-700'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-slate-400">
                      Day {dayNum}
                    </span>
                    <div className="my-1.5">
                      {isClaimedPast ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : isJackpot ? (
                        <Trophy className="w-6 h-6 text-yellow-400 mx-auto animate-bounce" />
                      ) : (
                        <Coins className="w-5 h-5 text-amber-400 mx-auto" />
                      )}
                    </div>
                    <span className="text-[11px] font-black text-white font-mono">
                      +{displayReward}
                    </span>
                    {isJackpot && (
                      <span className="text-[9px] text-amber-300 font-bold block mt-0.5">
                        +VIP 24h
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* VIP Booster Banner */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300">
                  สิทธิ์ตัวคูณ VIP: {profile.vipTier === 'elite' ? 'x2.0 (Elite)' : profile.vipTier === 'pro' ? 'x1.5 (Pro)' : 'x1.0 (Free)'}
                </span>
              </div>
              {!profile.isVip && (
                <button
                  onClick={() => {
                    bridge.playSfx('click');
                    setActiveTab('vip');
                  }}
                  className="text-amber-400 hover:text-amber-300 font-bold underline"
                >
                  อัปเกรดเพื่อรับ x2
                </button>
              )}
            </div>

            {/* Claim Action Button */}
            <div>
              {canClaim ? (
                <button
                  onClick={handleClaimDaily}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-slate-950 font-black text-sm hover:brightness-110 shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition"
                >
                  <Gift className="w-5 h-5" />
                  <span>กดรับเหรียญประจำวันทันที</span>
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-3.5 rounded-2xl bg-slate-800 text-slate-500 font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>คุณรับรางวัลของวันนี้ไปแล้ว (กลับมาใหม่พรุ่งนี้)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: VIP Subscription Plans */}
        {activeTab === 'vip' && (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Current VIP Status Card */}
            {profile.isVip ? (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">
                      คุณกำลังใช้งานสิทธิ์ {profile.vipTier?.toUpperCase()}
                    </h5>
                    <p className="text-[11px] text-amber-300/80">
                      {profile.vipExpiresAt 
                        ? `หมดอายุ: ${new Date(profile.vipExpiresAt).toLocaleDateString('th-TH')}`
                        : 'สมาชิกถาวร'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelVip}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  ยกเลิก VIP
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>คุณกำลังเป็น Free Player สามารถทดลองเปิดใช้งานสิทธิ์ VIP Sandbox ด้านล่างได้ทันที</span>
              </div>
            )}

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* VIP PRO Plan */}
              <div className={`p-5 rounded-3xl border flex flex-col justify-between transition ${
                profile.vipTier === 'pro'
                  ? 'bg-amber-950/30 border-amber-400 ring-2 ring-amber-400/30'
                  : 'bg-slate-800/60 border-slate-700 hover:border-amber-500/50'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ยอดนิยม
                    </span>
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </div>
                  <h5 className="text-base font-black text-white">VIP PRO PASS</h5>
                  <div className="mt-1 mb-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-amber-400">฿99</span>
                    <span className="text-xs text-slate-400">/ เดือน</span>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-300 mb-5">
                    <li className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>คูณเหรียญชนะเกม <strong>2x Multiplier</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>ตรามงกุฎทองคำ 👑 ติดหน้าชื่อ</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>โบนัสต้อนรับ <strong>+5,000 🪙</strong> ทันที</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>ปลดล็อก 6 อวตารพิเศษ</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handleActivateTier('pro')}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    profile.vipTier === 'pro'
                      ? 'bg-slate-700 text-slate-300 cursor-default'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 shadow-md shadow-amber-500/20'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{profile.vipTier === 'pro' ? 'ใช้งานอยู่นี้' : 'เปิดใช้งาน VIP PRO (Demo)'}</span>
                </button>
              </div>

              {/* VIP ELITE Plan */}
              <div className={`p-5 rounded-3xl border flex flex-col justify-between transition ${
                profile.vipTier === 'elite'
                  ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-400/30'
                  : 'bg-slate-800/60 border-slate-700 hover:border-cyan-500/50'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      HIGH ROLLER
                    </span>
                    <Diamond className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                  </div>
                  <h5 className="text-base font-black text-white">VIP ELITE PASS</h5>
                  <div className="mt-1 mb-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-cyan-400">฿299</span>
                    <span className="text-xs text-slate-400">/ เดือน</span>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-300 mb-5">
                    <li className="flex items-center gap-2">
                      <Flame className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>คูณเหรียญสูงสุด <strong>5x Multiplier</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Diamond className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>ตรามงกุฎเพชร 💎 แอนิเมชัน</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Coins className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>โบนัสต้อนรับ <strong>+20,000 🪙</strong> ทันที</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>ปลดล็อกทุกโต๊ะคาสิโน VIP Luxury</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handleActivateTier('elite')}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    profile.vipTier === 'elite'
                      ? 'bg-slate-700 text-slate-300 cursor-default'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:brightness-110 shadow-md shadow-cyan-500/20'
                  }`}
                >
                  <Diamond className="w-3.5 h-3.5" />
                  <span>{profile.vipTier === 'elite' ? 'ใช้งานอยู่นี้' : 'เปิดใช้งาน VIP ELITE (Demo)'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 text-center text-[11px] text-slate-500">
          MeGAMEHUB Sandbox Mode • ทดลองใช้งานระบบพาณิชย์และกระเป๋าเหรียญได้ทันที
        </div>
      </div>
    </div>
  );
};
