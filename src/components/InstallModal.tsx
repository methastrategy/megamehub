import React, { useState } from 'react';
import { X, Apple, Smartphone, ShieldCheck, Terminal } from 'lucide-react';
import { bridge } from '../sdk/MeGameBridge';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'pwa' | 'store'>('pwa');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative my-auto">
        <button
          onClick={() => {
            bridge.playSfx('click');
            onClose();
          }}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <span>📲</span> การติดตั้ง & นำ MeGAMEHUB ขึ้นมือถือ
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          เปรียบเทียบวิธีการติดตั้งบน iPhone, Android และการทำเป็นแอป App Store / .IPA
        </p>

        {/* Tab switch */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-6">
          <button
            onClick={() => setTab('pwa')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              tab === 'pwa'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>1. ติดตั้งแบบ PWA (แนะนำ - ทันที & ฟรี)</span>
          </button>
          <button
            onClick={() => setTab('store')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              tab === 'store'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>2. ทำ .IPA / ลง App Store</span>
          </button>
        </div>

        {tab === 'pwa' ? (
          <div className="space-y-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <h4 className="font-bold text-sm text-orange-400 flex items-center gap-2 mb-2">
                <Apple className="w-4 h-4" /> บน iPhone / iPad (Safari)
              </h4>
              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>เปิดเว็บ MeGAMEHUB ผ่านเบราว์เซอร์ <b>Safari</b></li>
                <li>แตะปุ่ม <b>แชร์ (Share)</b> ที่แถบด้านล่างของหน้าจอ</li>
                <li>เลื่อนลงมาแล้วกด <b>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</b></li>
                <li>จะได้ไอคอน MeGAMEHUB บนหน้าจอ เปิดเล่นได้เต็มจอไร้แถบ URL เสมือนแอปแท้ และเล่นออฟไลน์ได้ 100%</li>
              </ol>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2 mb-2">
                <Smartphone className="w-4 h-4" /> บน Android (Google Chrome)
              </h4>
              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>เปิดเว็บ MeGAMEHUB ผ่าน <b>Chrome</b></li>
                <li>กดปุ่มเมนู 3 จุดที่มุมบนขวา</li>
                <li>เลือก <b>"ติดตั้งแอป" (Install App)</b> หรือ "เพิ่มลงหน้าจอหลัก"</li>
              </ol>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>
                <b>ข้อดีของ PWA:</b> ไม่ต้องจ่ายค่า Developer $99/ปี, ไม่มีวันหมดอายุ, อัปเดตเกมใหม่ลง Hub ได้ทันทีโดยไม่ต้องรอ Apple ตรวจ!
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <h4 className="font-bold text-sm text-indigo-400 flex items-center gap-2 mb-2">
                <Terminal className="w-4 h-4" /> ขั้นตอนการ Wrap เป็น .IPA ด้วย Capacitor
              </h4>
              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                โปรเจกต์นี้เขียนด้วยสถาปัตยกรรม Clean WebKit สามารถแปลงเป็นโปรเจกต์ Xcode สำหรับคอมไพล์เป็นไฟล์ <b>.ipa</b> หรือส่ง App Store ได้ด้วยคำสั่งเดียว:
              </p>
              <div className="bg-black/70 rounded-xl p-3 font-mono text-[11px] text-emerald-400 overflow-x-auto space-y-1">
                <div>npm install @capacitor/core @capacitor/cli @capacitor/ios</div>
                <div>npx cap init "MeGAMEHUB" "com.metha.megamehub"</div>
                <div>npm run build</div>
                <div>npx cap add ios</div>
                <div>npx cap open ios  # เปิดใน Xcode เพื่อ Export .ipa หรือส่ง App Store</div>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
              <h4 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                ⚠️ ความเป็นจริงของไฟล์ .IPA บน iOS
              </h4>
              <p>
                ผู้ใช้ iPhone ไม่สามารถกดโหลด .ipa มาติดตั้งตรงๆ ได้ (ต่างจาก Android ที่ลง .apk ได้เลย) การลง .ipa จำเป็นต้องใช้ <b>AltStore / SideStore / TrollStore</b> และถ้าใช้บัญชีฟรีของ Apple ใบรับรองจะมีอายุเพียง 7 วันเท่านั้น
              </p>
              <p className="text-slate-400">
                👉 ดังนั้นสำหรับการส่งให้เพื่อนเล่นทั่วไป **PWA คือคำตอบที่ดีที่สุด** ส่วนการลง App Store ต้องส่งผ่านบัญชี Developer Program ตามกฎ Guideline 4.7
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              bridge.playSfx('click');
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm"
          >
            รับทราบและปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
