import React, { useState } from 'react';
import { 
  Volume2, VolumeX, Volume1, Smartphone, X, Sparkles, Check, Play
} from 'lucide-react';
import { sounds } from '../utils/soundEffects';
import { bridge } from '../sdk/MeGameBridge';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ isOpen, onClose }) => {
  const [enabled, setEnabled] = useState<boolean>(sounds.enabled);
  const [volume, setVolume] = useState<number>(Math.round(sounds.volume * 100));
  const [haptics, setHaptics] = useState<boolean>(sounds.hapticsEnabled);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const nextState = !enabled;
    sounds.setEnabled(nextState);
    setEnabled(nextState);
    if (nextState) {
      bridge.playSfx('click');
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    sounds.setVolume(val / 100);
  };

  const handleToggleHaptics = () => {
    const next = !haptics;
    sounds.setHapticsEnabled(next);
    setHaptics(next);
    if (next) {
      bridge.triggerHaptic('success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              {enabled ? (
                volume > 50 ? <Volume2 className="w-5 h-5" /> : <Volume1 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ระบบเสียง & การสั่น</h3>
              <p className="text-[11px] text-slate-400">Audio & Haptic Feedback Controls</p>
            </div>
          </div>
          <button
            onClick={() => {
              bridge.playSfx('click');
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Master Sound Switch */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-xs font-bold text-white block">เปิดเสียงเอฟเฟกต์ (SFX)</span>
              <span className="text-[10px] text-slate-400">Web Audio API สังเคราะห์ 100% ออฟไลน์</span>
            </div>
            <button
              onClick={handleToggleSound}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                enabled ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">ระดับเสียงหลัก (Master Volume)</span>
              <span className="text-emerald-400 font-mono">{volume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              disabled={!enabled}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-40"
            />
          </div>

          {/* Haptics Switch */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">ระบบสั่นสัมผัส (Haptic)</span>
                <span className="text-[10px] text-slate-400">ตอบสนองการแตะบนจอสมาร์ตโฟน</span>
              </div>
            </div>
            <button
              onClick={handleToggleHaptics}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                haptics ? 'bg-orange-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  haptics ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Sound Testing Buttons */}
          <div className="pt-1">
            <span className="text-[11px] font-bold text-slate-400 block mb-2">ทดสอบเสียง:</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => bridge.playSfx('click')}
                className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition flex items-center justify-center gap-1"
              >
                <Play className="w-3 h-3 text-indigo-400" />
                <span>คลิก</span>
              </button>
              <button
                type="button"
                onClick={() => bridge.playSfx('correct')}
                className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>เหรียญ</span>
              </button>
              <button
                type="button"
                onClick={() => bridge.playSfx('victory')}
                className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>ชนะ</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => {
              bridge.playSfx('click');
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Check className="w-4 h-4" />
            <span>เสร็จสิ้น</span>
          </button>
        </div>
      </div>
    </div>
  );
};
