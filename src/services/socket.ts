import { io, Socket } from 'socket.io-client';
import { config } from '../config';

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<(data: any) => void>>();
  private isConnecting: boolean = false;

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(): Socket {
    if (this.socket && (this.socket.connected || this.isConnecting)) {
      return this.socket;
    }

    this.isConnecting = true;
    this.socket = io(config.socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      console.log('[Socket] Connected to GameScope Realtime Gateway:', this.socket?.id);
    });

    this.socket.on('connect_error', (err) => {
      this.isConnecting = false;
      console.warn('[Socket] Connection warning:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    // Re-dispatch events to listeners
    const trackedEvents = [
      'event:init_state',
      'event:state_updated',
      'event:countdown_updated',
      'event:stream_updated',
      'event:inactive_updated',
      'event:force_sync',
      'chat:message',
      'chat:message_deleted',
      'chat:message_pinned',
      'chat:like_updated',
      'chat:reaction',
      'poll:created',
      'poll:results',
      'poll:closed',
      'poll:removed',
      'arcade:leaderboard_updated',
      'notification:broadcast'
    ];

    for (const evt of trackedEvents) {
      this.socket.on(evt, (data) => {
        const cbs = this.listeners.get(evt);
        if (cbs) {
          cbs.forEach(cb => cb(data));
        }
      });
    }

    return this.socket;
  }

  public on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  public emit(event: string, data?: any, ack?: (res: any) => void) {
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    this.socket?.emit(event, data, ack);
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socket = SocketService.getInstance();
