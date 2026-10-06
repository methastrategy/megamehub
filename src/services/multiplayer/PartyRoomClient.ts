import PartySocket from 'partysocket';
import type { 
  RoomState, 
  RoomMember, 
  ClientToServerMsg, 
  ServerToClientMsg 
} from './multiplayerTypes';
import type { PlayerProfile } from '../../sdk/types';

// Default PartyKit host can be overridden via Vite env VITE_PARTYKIT_HOST
const DEFAULT_PARTYKIT_HOST = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'localhost:1999'
  : 'megamehub-party.metha.partykit.dev';

export class PartyRoomClient {
  private socket: PartySocket | null = null;
  private localChannel: BroadcastChannel | null = null;
  private roomState: RoomState | null = null;
  private currentMemberId: string = '';
  private stateListeners: Array<(state: RoomState) => void> = [];
  private gameStartListeners: Array<(gameId: string, initialData?: Record<string, unknown>) => void> = [];
  private actionListeners: Array<(fromId: string, action: string, payload: unknown) => void> = [];
  private reactionListeners: Array<(fromId: string, emoji: string) => void> = [];

  // Generate 4-digit room code
  public static generateRoomCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  public getRoomState(): RoomState | null {
    return this.roomState;
  }

  public getCurrentMemberId(): string {
    return this.currentMemberId;
  }

  // Connect to room (Host creates or Guest joins)
  public connect(
    roomCode: string,
    profile: PlayerProfile,
    gameId: string = 'chayen',
    isHost: boolean = false
  ) {
    this.disconnect();
    this.currentMemberId = profile.id;

    const host = import.meta.env.VITE_PARTYKIT_HOST || DEFAULT_PARTYKIT_HOST;

    // Initialize initial state
    const initialMember: RoomMember = {
      id: profile.id,
      name: profile.name,
      avatar: profile.avatar,
      isHost,
      isReady: isHost, // Host is always ready
      joinedAt: Date.now()
    };

    this.roomState = {
      roomCode,
      gameId,
      phase: 'waiting',
      hostId: isHost ? profile.id : '',
      members: [initialMember],
      maxMembers: 8,
      createdAt: Date.now()
    };

    // Setup BroadcastChannel for offline / zero-server local testing
    try {
      this.localChannel = new BroadcastChannel(`megamehub_room_${roomCode}`);
      this.localChannel.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    } catch {
      // BroadcastChannel not available
    }

    // Connect via PartySocket (WebSocket)
    try {
      this.socket = new PartySocket({
        host,
        room: roomCode,
        query: {
          memberId: profile.id,
          name: profile.name,
          avatar: profile.avatar,
          isHost: String(isHost),
          gameId
        }
      });

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch {
          // invalid json ignore
        }
      };

      this.socket.onopen = () => {
        const joinMsg: ClientToServerMsg = {
          type: 'join',
          roomCode,
          profile
        };
        this.send(joinMsg);
      };
    } catch {
      // In purely offline environments, localChannel acts as fallback
    }

    // Broadcast self-join on local channel
    this.broadcastLocal({
      type: 'player_joined',
      member: initialMember
    });

    this.notifyState();
  }

  private handleMessage(msg: ServerToClientMsg | (ClientToServerMsg & { fromMember?: RoomMember })) {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'room_state') {
      this.roomState = msg.state;
      this.notifyState();
    } else if (msg.type === 'player_joined') {
      if (!this.roomState) return;
      const exists = this.roomState.members.some(m => m.id === msg.member.id);
      if (!exists) {
        this.roomState = {
          ...this.roomState,
          members: [...this.roomState.members, msg.member]
        };
        this.notifyState();
        // If I am host, sync state to new player
        if (this.isHost()) {
          this.broadcastLocal({ type: 'room_state', state: this.roomState });
        }
      }
    } else if (msg.type === 'player_left') {
      if (!this.roomState) return;
      this.roomState = {
        ...this.roomState,
        members: this.roomState.members.filter(m => m.id !== msg.memberId)
      };
      this.notifyState();
    } else if (msg.type === 'game_started') {
      if (this.roomState) {
        this.roomState = { ...this.roomState, phase: 'playing' };
        this.notifyState();
      }
      this.gameStartListeners.forEach(l => l(msg.gameId, msg.initialData));
    } else if (msg.type === 'game_action_broadcast') {
      this.actionListeners.forEach(l => l(msg.fromId, msg.action, msg.payload));
    } else if (msg.type === 'reaction_broadcast') {
      this.reactionListeners.forEach(l => l(msg.fromId, msg.emoji));
    }
  }

  public isHost(): boolean {
    if (!this.roomState) return false;
    return this.roomState.hostId === this.currentMemberId || (this.roomState.members[0]?.id === this.currentMemberId && this.roomState.members[0]?.isHost);
  }

  public setReady(isReady: boolean) {
    if (!this.roomState) return;
    this.roomState = {
      ...this.roomState,
      members: this.roomState.members.map(m => m.id === this.currentMemberId ? { ...m, isReady } : m)
    };
    this.notifyState();
    this.send({ type: 'set_ready', isReady });
    this.broadcastLocal({ type: 'room_state', state: this.roomState });
  }

  public startGame() {
    if (!this.roomState || !this.isHost()) return;
    this.roomState = { ...this.roomState, phase: 'playing' };
    this.notifyState();

    const startMsg: ServerToClientMsg = {
      type: 'game_started',
      gameId: this.roomState.gameId
    };
    this.send({ type: 'start_game' });
    this.broadcastLocal(startMsg);
    this.gameStartListeners.forEach(l => l(this.roomState?.gameId || 'chayen'));
  }

  public sendGameAction(action: string, payload: unknown) {
    this.send({ type: 'game_action', action, payload });
    this.broadcastLocal({
      type: 'game_action_broadcast',
      fromId: this.currentMemberId,
      action,
      payload
    });
  }

  public sendReaction(emoji: string) {
    this.send({ type: 'reaction', emoji });
    this.broadcastLocal({
      type: 'reaction_broadcast',
      fromId: this.currentMemberId,
      emoji
    });
  }

  private send(msg: ClientToServerMsg) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(msg));
      } catch {
        // fallback
      }
    }
  }

  private broadcastLocal(msg: unknown) {
    if (this.localChannel) {
      try {
        this.localChannel.postMessage(msg);
      } catch {
        // ignore
      }
    }
  }

  public disconnect() {
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // ignore
      }
      this.socket = null;
    }
    if (this.localChannel) {
      try {
        this.localChannel.close();
      } catch {
        // ignore
      }
      this.localChannel = null;
    }
    this.roomState = null;
  }

  public onStateChange(listener: (state: RoomState) => void) {
    this.stateListeners.push(listener);
    if (this.roomState) listener(this.roomState);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  public onGameStarted(listener: (gameId: string, initialData?: Record<string, unknown>) => void) {
    this.gameStartListeners.push(listener);
    return () => {
      this.gameStartListeners = this.gameStartListeners.filter(l => l !== listener);
    };
  }

  public onGameAction(listener: (fromId: string, action: string, payload: unknown) => void) {
    this.actionListeners.push(listener);
    return () => {
      this.actionListeners = this.actionListeners.filter(l => l !== listener);
    };
  }

  public onReaction(listener: (fromId: string, emoji: string) => void) {
    this.reactionListeners.push(listener);
    return () => {
      this.reactionListeners = this.reactionListeners.filter(l => l !== listener);
    };
  }

  private notifyState() {
    if (this.roomState) {
      this.stateListeners.forEach(l => l({ ...this.roomState! }));
    }
  }
}

export const roomClient = new PartyRoomClient();
