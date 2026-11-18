import { config } from '../config';
import { ChatMessage, LivePoll, PublicEventConfig, LeaderboardEntry, PinnedComment } from '../types';

export class ApiService {
  private static instance: ApiService;

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${config.apiUrl}/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {})
      }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }
    return data as T;
  }

  public async getPublicConfig(): Promise<{
    config: PublicEventConfig;
    adminPinnedComment: PinnedComment | null;
    reactions: Record<string, number>;
    activePoll: LivePoll | null;
    activeVisitors: number;
  }> {
    return this.request('/config/public');
  }

  /* ---------------- Chat ---------------- */

  public async getChatMessages(limit: number = 60, before?: number): Promise<{ messages: ChatMessage[] }> {
    const q = before ? `?limit=${limit}&before=${before}` : `?limit=${limit}`;
    return this.request(`/chat/messages${q}`);
  }

  public async postChatMessage(msg: {
    userId: string;
    username: string;
    avatarSvg: string;
    avatarColor: string;
    text: string;
    badge?: string;
  }): Promise<{ success: boolean; message: ChatMessage }> {
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify(msg)
    });
  }

  public async likeChatMessage(messageId: string, userId: string): Promise<{ likes: number; liked: boolean }> {
    return this.request(`/chat/messages/${messageId}/like`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  public async getReactions(): Promise<{ reactions: Record<string, number> }> {
    return this.request('/chat/reactions');
  }

  public async postReaction(type: string): Promise<{ success: boolean; counts: Record<string, number> }> {
    return this.request('/chat/reactions', {
      method: 'POST',
      body: JSON.stringify({ type })
    });
  }

  /* ---------------- Polls ---------------- */

  public async getActivePoll(): Promise<{ poll: LivePoll | null }> {
    return this.request('/polls/active');
  }

  public async votePoll(pollId: string, optionId: string | null, userId: string): Promise<{ success: boolean; poll: LivePoll }> {
    return this.request(`/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId, userId })
    });
  }

  /* ---------------- Arcade ---------------- */

  public async startArcadeSession(playerId: string, playerName: string): Promise<{
    ok: boolean;
    sessionId?: string;
    seed?: number;
    rulesVersion?: number;
    expiresAt?: number;
    code?: string;
  }> {
    return this.request('/arcade/session/start', {
      method: 'POST',
      body: JSON.stringify({ playerId, playerName })
    });
  }

  public async arcadeHeartbeat(sessionId: string): Promise<{ ok: boolean; code?: string }> {
    return this.request('/arcade/session/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    });
  }

  public async submitArcadeRun(sub: any): Promise<{
    ok: boolean;
    finalDistance?: number;
    personalBest?: number;
    rank?: number | null;
    isRecord?: boolean;
    code?: string;
  }> {
    return this.request('/arcade/session/submit', {
      method: 'POST',
      body: JSON.stringify(sub)
    });
  }

  public async getArcadeLeaderboard(limit: number = 10): Promise<{ leaderboard: LeaderboardEntry[] }> {
    return this.request(`/arcade/leaderboard?limit=${limit}`);
  }

  /* ---------------- Push & Email ---------------- */

  public async getPushPublicKey(): Promise<{ publicKey: string }> {
    return this.request('/notifications/push/public-key');
  }

  public async subscribePush(subscription: PushSubscription, userId?: string): Promise<{ success: boolean }> {
    const raw = subscription.toJSON();
    
    // Ensure keys exist even if toJSON() was sparse
    let keys = raw.keys;
    if (!keys || !keys.p256dh || !keys.auth) {
      try {
        const p256dhBuf = subscription.getKey ? subscription.getKey('p256dh') : null;
        const authBuf = subscription.getKey ? subscription.getKey('auth') : null;
        if (p256dhBuf && authBuf) {
          keys = {
            p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dhBuf))))
              .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
            auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(authBuf))))
              .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
          };
        }
      } catch {}
    }

    return this.request('/notifications/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: raw.endpoint || subscription.endpoint,
        keys,
        userId,
        userAgent: navigator.userAgent,
        sendConfirmation: true
      })
    });
  }

  public async subscribeEmail(name: string, email: string, source: string = 'footer'): Promise<{
    success: boolean;
    alreadySubscribed?: boolean;
    subscriber?: any;
  }> {
    return this.request('/subscriptions/email', {
      method: 'POST',
      body: JSON.stringify({ name, email, source })
    });
  }

  /* ---------------- Analytics Heartbeat ---------------- */

  public async sendAnalyticsPing(clientId: string): Promise<{ ok: boolean; activeVisitors: number }> {
    return this.request('/analytics/ping', {
      method: 'POST',
      body: JSON.stringify({ clientId })
    });
  }
}

export const api = ApiService.getInstance();
