import type { PlayerProfile } from '../../sdk/types';

export type RoomPhase = 'waiting' | 'starting' | 'playing' | 'finished';

export interface RoomMember {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: number;
}

export interface RoomState {
  roomCode: string; // 4-digit numeric code like "7842"
  gameId: string;   // e.g. 'chayen', 'doraemon', 'dummy', 'slave', 'rps'
  phase: RoomPhase;
  hostId: string;
  members: RoomMember[];
  maxMembers: number;
  createdAt: number;
  gameData?: Record<string, unknown>;
}

export type ClientToServerMsg =
  | { type: 'join'; roomCode: string; profile: PlayerProfile }
  | { type: 'set_ready'; isReady: boolean }
  | { type: 'start_game' }
  | { type: 'game_action'; action: string; payload: unknown }
  | { type: 'leave' }
  | { type: 'reaction'; emoji: string };

export type ServerToClientMsg =
  | { type: 'room_state'; state: RoomState }
  | { type: 'player_joined'; member: RoomMember }
  | { type: 'player_left'; memberId: string }
  | { type: 'game_started'; gameId: string; initialData?: Record<string, unknown> }
  | { type: 'game_action_broadcast'; fromId: string; action: string; payload: unknown }
  | { type: 'reaction_broadcast'; fromId: string; emoji: string }
  | { type: 'error'; message: string };
