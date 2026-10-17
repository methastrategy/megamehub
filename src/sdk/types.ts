export type GameCategory = 'all' | 'party' | 'cards' | 'casino' | '1v1' | 'arcade' | 'puzzle' | 'custom';

export interface GameMetadata {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: GameCategory;
  tags: string[];
  icon: string;
  gradient: string;
  players: string;
  isOfflineReady: boolean;
  hasMotionControls?: boolean;
  rating: number;
  playCount: number;
}

export type VipTier = 'free' | 'pro' | 'elite';

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  coins: number;
  unlockedDecks: string[];
  highScores: Record<string, number>;
  isVip?: boolean;
  vipTier?: VipTier;
  vipExpiresAt?: number | null;
  dailyBonusLastClaimed?: string | null;
  dailyBonusStreak?: number;
}

export interface ChayenDeck {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  words: string[];
  isCustom?: boolean;
}

export interface GameScoreResult {
  gameId: string;
  score: number;
  coinsEarned: number;
  stats?: Record<string, unknown>;
}
