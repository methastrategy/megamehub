import React, { useState, useEffect } from 'react';
import { 
  X, Users, Copy, Check, Play, LogOut, 
  Radio, ArrowRight
} from 'lucide-react';
import { roomClient, PartyRoomClient } from '../services/multiplayer/PartyRoomClient';
import type { RoomState } from '../services/multiplayer/multiplayerTypes';
import { bridge } from '../sdk/MeGameBridge';

interface MultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchGame: (gameId: string, isMultiplayer: boolean) => void;
}

const SUPPORTED_MULTIPLAYER_GAMES = [
  { id: 'chayen', name: 'Chayen ชาเย็น', icon: '🧋', desc: 'ทายคำข้ามเครื่อง ให้เพื่อนใบ้ผ่านจอ' },
  { id: 'doraemon', name: 'ไพ่โดเรม่อน Party', icon: '🍻', desc: 'เปิดไพ่วงสังสรรค์ ซิงก์ผลลัพธ์พร้อมกัน' },
  { id: 'slave', name: 'ไพ่สลาฟ (President)', icon: '👑', desc: 'ดวลไพ่ 4 คน ชิงเป็น King' },
  { id: 'dummy', name: 'ดัมมี่ (Dummy 2P)', icon: '🎴', desc: 'เกิดไพ่ น็อก ข้ามเครื่อง' },
  { id: 'rps', name: 'เป่ายิ้งฉุบ Tournament', icon: '✊', desc: 'ดวลค้อนกรรไกรกระดาษแบบสด' },
  { id: 'cardclash', name: 'Card Clash 1v1', icon: '🃏', desc: 'ดวลการ์ดธาตุข้ามเครื่อง' },
];

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  onClose,
  onLaunchGame
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [selectedGameId, setSelectedGameId] = useState<string>('chayen');
  const [joinCode, setJoinCode] = useState<string>('');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [floatingReaction, setFloatingReaction] = useState<{ emoji: string; from: string } | null>(null);

  useEffect(() => {
    const unsubState = roomClient.onStateChange(state => {
      setRoomState(state);
    });

    const unsubStart = roomClient.onGameStarted(gameId => {
      bridge.playSfx('victory');
      onClose();
      onLaunchGame(gameId, true);
    });

    const unsubReaction = roomClient.onReaction((fromId, emoji) => {
      const member = roomState?.members.find(m => m.id === fromId);
      setFloatingReaction({ emoji, from: member?.name || 'เพื่อน' });
      bridge.playSfx('click');
      setTimeout(() => setFloatingReaction(null), 2000);
    });

    return () => {
      unsubState();
      unsubStart();
      unsubReaction();
    };
  }, [onClose, onLaunchGame, roomState]);

  if (!isOpen) return null;

  const profile = bridge.getProfile();

  // Create Room
  const handleCreateRoom = () => {
    const code = PartyRoomClient.generateRoomCode();
    roomClient.connect(code, profile, selectedGameId, true);
    bridge.playSfx('click');
  };

  // Join Room
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim();
    if (cleanCode.length !== 4) {
      alert('กรุณากรอกรหัสห้อง 4 หลักให้ถูกต้องครับ');
      return;
    }
    roomClient.connect(cleanCode, profile, 'chayen', false);
    bridge.playSfx('click');
  };

  const handleCopyCode = () => {
    if (!roomState) return;
    navigator.clipboard.writeText(roomState.roomCode);
    setCopied(true);
    bridge.playSfx('click');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = () => {
    roomClient.disconnect();
    setRoomState(null);
    setJoinCode('');
    bridge.playSfx('click');
  };

  const handleSendReaction = (emoji: string) => {
    roomClient.sendReaction(emoji);
    setFloatingReaction({ emoji, from: 'คุณ' });
    bridge.playSfx('click');
    setTimeout(() => setFloatingReaction(null), 2000);
  };

  const isHost = roomClient.isHost();
  const currentMember = roomState?.members.find(m => m.id === profile.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col relative animate-scale-up">
        {/* Floating reaction pop */}
        {floatingReaction && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-800/90 border border-slate-700 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-2xl animate-bounce">
            <span className="text-2xl">{floatingReaction.emoji}</span>
            <span className="text-xs font-bold text-slate-200">{floatingReaction.from} ส่งรีแอ็กชัน</span>
          </div>
        )}

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Realtime Multiplayer</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                  LIVE
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                เล่นข้ามเครื่องด้วยรหัสห้อง 4 หลัก
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (roomState) handleLeaveRoom();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {roomState ? (
            /* Inside Room Lobby */
            <div className="space-y-5">
              {/* Room Code Display */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border-2 border-indigo-500/40 rounded-2xl p-4 text-center relative shadow-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  รหัสห้องสำหรับเพื่อนเข้าร่วม (Room Code)
                </span>
                <div className="flex items-center justify-center gap-3 my-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-amber-400 bg-black/40 px-6 py-2 rounded-2xl border border-amber-500/30">
                    {roomState.roomCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                    title="คัดลอกรหัสห้อง"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <div className="text-[11px] text-slate-400">
                  บอกรหัส 4 หลักนี้ให้เพื่อนกด "เข้าร่วมห้อง"
                </div>
              </div>

              {/* Members List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-orange-400" />
                    <span>ผู้เล่นในห้อง ({roomState.members.length}/{roomState.maxMembers})</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    เกม: <b className="text-slate-300">{SUPPORTED_MULTIPLAYER_GAMES.find(g => g.id === roomState.gameId)?.name || roomState.gameId}</b>
                  </span>
                </div>

                <div className="space-y-2">
                  {roomState.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700/80"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{member.avatar}</span>
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span>{member.name}</span>
                            {member.id === profile.id && (
                              <span className="text-[10px] text-slate-400">(คุณ)</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {member.isHost ? '👑 หัวหน้าห้อง (Host)' : 'ผู้เล่น'}
                          </span>
                        </div>
                      </div>

                      <div>
                        {member.isHost ? (
                          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                            Host
                          </span>
                        ) : member.isReady ? (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                            พร้อมแล้ว
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 bg-slate-700/40 px-2.5 py-1 rounded-lg">
                            รอพร้อม
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Emoji Reaction Bar */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 block mb-2">
                  ส่งรีแอ็กชันทักทายเพื่อนในห้อง:
                </span>
                <div className="flex gap-2 justify-center">
                  {['🔥', '🎉', '👏', '🍻', '😎', '❤️'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleSendReaction(emoji)}
                      className="text-xl p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  onClick={handleLeaveRoom}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ออกจากห้อง</span>
                </button>

                {isHost ? (
                  <button
                    onClick={() => roomClient.startGame()}
                    className="flex-2 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-sm hover:brightness-110 shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>เริ่มเกมทันที ({roomState.members.length} คน)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => roomClient.setReady(!currentMember?.isReady)}
                    className={`flex-2 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
                      currentMember?.isReady
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/30'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{currentMember?.isReady ? 'ยกเลิกพร้อม' : 'กดพร้อมเล่น'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Lobby Selection: Create or Join */
            <div className="space-y-5">
              {/* Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setTab('create')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition ${
                    tab === 'create'
                      ? 'bg-orange-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  สร้างห้องใหม่ (Host)
                </button>
                <button
                  onClick={() => setTab('join')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition ${
                    tab === 'join'
                      ? 'bg-orange-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  เข้าร่วมห้อง (Join)
                </button>
              </div>

              {tab === 'create' ? (
                /* Create Room Form */
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-2">
                      เลือกเกมที่จะเล่นด้วยกัน:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {SUPPORTED_MULTIPLAYER_GAMES.map(game => (
                        <div
                          key={game.id}
                          onClick={() => {
                            setSelectedGameId(game.id);
                            bridge.playSfx('click');
                          }}
                          className={`p-3 rounded-2xl border cursor-pointer transition ${
                            selectedGameId === game.id
                              ? 'bg-orange-500/10 border-orange-500 ring-1 ring-orange-500'
                              : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{game.icon}</span>
                            <div>
                              <div className="text-xs font-bold text-white">{game.name}</div>
                              <div className="text-[10px] text-slate-400 line-clamp-1">{game.desc}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCreateRoom}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-sm hover:brightness-110 shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition"
                  >
                    <span>สร้างห้องและรับรหัส 4 หลัก</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Join Room Form */
                <form onSubmit={handleJoinRoom} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-2">
                      พิมพ์รหัสห้อง 4 หลักที่เพื่อนให้มา:
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="เช่น 7842"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-[0.5em] font-mono text-3xl font-black bg-slate-950 border-2 border-slate-700 rounded-2xl py-3 text-amber-400 placeholder:text-slate-700 focus:border-orange-500 focus:outline-none"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={joinCode.length !== 4}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 disabled:opacity-40 text-white font-black text-sm hover:brightness-110 shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition"
                  >
                    <span>เข้าร่วมห้องทันที</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
