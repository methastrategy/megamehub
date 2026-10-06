import type * as Party from "partykit/server";

interface MemberData {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: number;
}

interface RoomData {
  roomCode: string;
  gameId: string;
  phase: 'waiting' | 'starting' | 'playing' | 'finished';
  hostId: string;
  members: MemberData[];
  maxMembers: number;
  createdAt: number;
}

export default class MeGameRoomServer implements Party.Server {
  private roomState: RoomData;

  constructor(readonly room: Party.Room) {
    this.roomState = {
      roomCode: this.room.id,
      gameId: 'chayen',
      phase: 'waiting',
      hostId: '',
      members: [],
      maxMembers: 8,
      createdAt: Date.now()
    };
  }

  // Handle incoming connection
  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const url = new URL(ctx.request.url);
    const memberId = url.searchParams.get("memberId") || conn.id;
    const name = url.searchParams.get("name") || "Player";
    const avatar = url.searchParams.get("avatar") || "🎮";
    const isHost = url.searchParams.get("isHost") === "true";
    const gameId = url.searchParams.get("gameId") || "chayen";

    if (this.roomState.members.length === 0 || isHost) {
      this.roomState.hostId = memberId;
      this.roomState.gameId = gameId;
    }

    const existingIdx = this.roomState.members.findIndex(m => m.id === memberId);
    const member: MemberData = {
      id: memberId,
      name,
      avatar,
      isHost: this.roomState.hostId === memberId,
      isReady: this.roomState.hostId === memberId,
      joinedAt: Date.now()
    };

    if (existingIdx >= 0) {
      this.roomState.members[existingIdx] = member;
    } else {
      this.roomState.members.push(member);
    }

    // Send current state to newly connected client
    conn.send(JSON.stringify({
      type: "room_state",
      state: this.roomState
    }));

    // Broadcast updated state to all members
    this.room.broadcast(JSON.stringify({
      type: "room_state",
      state: this.roomState
    }), [conn.id]);
  }

  // Handle messages from clients
  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);

      if (data.type === "set_ready") {
        const member = this.roomState.members.find(m => m.id === data.memberId);
        if (member) {
          member.isReady = data.isReady;
          this.room.broadcast(JSON.stringify({
            type: "room_state",
            state: this.roomState
          }));
        }
      } else if (data.type === "start_game") {
        this.roomState.phase = "playing";
        this.room.broadcast(JSON.stringify({
          type: "game_started",
          gameId: this.roomState.gameId
        }));
      } else if (data.type === "game_action") {
        // Broadcast game action to other players
        this.room.broadcast(JSON.stringify({
          type: "game_action_broadcast",
          fromId: data.memberId,
          action: data.action,
          payload: data.payload
        }), [sender.id]);
      } else if (data.type === "reaction") {
        this.room.broadcast(JSON.stringify({
          type: "reaction_broadcast",
          fromId: data.memberId,
          emoji: data.emoji
        }));
      }
    } catch (err) {
      console.error("Error processing message:", err);
    }
  }

  // Handle client disconnect
  onClose(conn: Party.Connection) {
    this.roomState.members = this.roomState.members.filter(m => m.id !== conn.id);
    if (this.roomState.members.length > 0 && this.roomState.hostId === conn.id) {
      // Transfer host to next active member
      this.roomState.hostId = this.roomState.members[0].id;
      this.roomState.members[0].isHost = true;
      this.roomState.members[0].isReady = true;
    }

    this.room.broadcast(JSON.stringify({
      type: "room_state",
      state: this.roomState
    }));
  }
}
