/**
 * GameScope Live — Comprehensive Type Definitions
 * Gaming Livestream & Community Platform
 */

export type StreamState = 'UPCOMING' | 'LIVE' | 'BREAK' | 'STARTING' | 'ENDED';

export type UserGender = 'male' | 'female' | 'unspecified';

export interface UserIdentity {
  id: string;
  username: string;
  avatarSeed: string;
  avatarSvg: string;
  color: string;
  badge?: string;
  isCustom?: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatarSvg: string;
  avatarColor: string;
  text: string;
  timestamp: string;
  timestampMs: number;
  likes: number;
  likedByCurrentUser?: boolean;
  isShoutout?: boolean;
  shoutoutType?: 'arcade' | 'comment' | 'system';
  shoutoutTitle?: string;
  isAdmin?: boolean;
  badge?: string;
  source?: 'gamescope' | 'youtube';
  youtubeMessageId?: string;
}

export interface PinnedComment {
  id: string;
  username: string;
  text: string;
  likes: number;
  avatarSvg: string;
  avatarColor: string;
  isAdminPinned: boolean;
  pinnedAt?: number;
  rotationExpiresAt?: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface LivePoll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId?: string | null;
  status: 'active' | 'closed';
  deadlineTime?: string;
  source?: 'gamescope' | 'youtube';
}

export interface YouTubePollOption {
  id: string;
  text: string;
  votes: number;
}

export interface YouTubeLivePoll {
  id: string;
  question: string;
  options: YouTubePollOption[];
  totalVotes: number;
  status: 'active' | 'closed';
  updatedAt: number;
  source: 'youtube';
}

export interface LeaderboardEntry {
  rank: number;
  id?: string;
  username: string;
  score: number;
  metric: string;
  avatarSvg?: string;
  badge?: string;
}

export interface InactiveScreenConfig {
  enabled: boolean;
  heading: string;
  description: string;
  secondaryMessage?: string;
}

export interface CountdownConfig {
  targetIso: string;
  targetTimestampMs: number;
  timezone: string;
  label: string;
}

export interface PublicEventConfig {
  eventId: string;
  state: StreamState;
  stateUpdatedAt: number;
  expectedDurationMinutes: number;
  youtubeVideoId: string;
  youtubeStreamUrl: string;
  countdown: CountdownConfig;
  inactiveScreen: InactiveScreenConfig;
  version: number;
}

export type SoundEffectType = 
  | 'click' 
  | 'hover' 
  | 'confirm' 
  | 'nav' 
  | 'toggle'
  | 'vote'
  | 'alert';
