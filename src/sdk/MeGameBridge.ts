import type { PlayerProfile, GameScoreResult } from './types';
import { sounds } from '../utils/soundEffects';

const PROFILE_STORAGE_KEY = 'megamehub_player_profile';

const DEFAULT_PROFILE: PlayerProfile = {
  id: 'player_guest_' + Math.random().toString(36).substring(2, 7),
  name: 'MePlayer',
  avatar: '🎮',
  coins: 150,
  unlockedDecks: ['food', 'animals', 'movies', 'slang', 'places', 'actions'],
  highScores: {
    'chayen': 0,
    'cardclash': 0,
    'neonsnake': 0
  }
};

class MeGameBridge {
  private profile: PlayerProfile;
  private listeners: Array<(profile: PlayerProfile) => void> = [];

  constructor() {
    this.profile = this.loadProfile();
  }

  private loadProfile(): PlayerProfile {
    try {
      const data = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (data) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Failed to load profile from storage:', e);
    }
    return DEFAULT_PROFILE;
  }

  private saveProfile() {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.profile));
      this.notifyListeners();
    } catch (e) {
      console.warn('Failed to save profile:', e);
    }
  }

  public subscribe(listener: (profile: PlayerProfile) => void) {
    this.listeners.push(listener);
    listener(this.profile);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.profile));
  }

  public getProfile(): PlayerProfile {
    return { ...this.profile };
  }

  public updateName(name: string) {
    this.profile.name = name.trim() || 'MePlayer';
    this.saveProfile();
  }

  public updateAvatar(avatar: string) {
    this.profile.avatar = avatar;
    this.saveProfile();
  }

  public recordGameResult(result: GameScoreResult) {
    const currentHigh = this.profile.highScores[result.gameId] || 0;
    if (result.score > currentHigh) {
      this.profile.highScores[result.gameId] = result.score;
    }
    this.profile.coins += result.coinsEarned;
    this.saveProfile();
  }

  public triggerHaptic(type: 'light' | 'success' | 'warning' | 'error' = 'light') {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        switch (type) {
          case 'light':
            navigator.vibrate(20);
            break;
          case 'success':
            navigator.vibrate([30, 40, 50]);
            break;
          case 'warning':
            navigator.vibrate([50, 50, 50]);
            break;
          case 'error':
            navigator.vibrate([80, 50, 80]);
            break;
        }
      } catch (e) {
        // Haptics might fail without user interaction gesture
      }
    }
  }

  public playSfx(type: 'correct' | 'pass' | 'tick' | 'urgent' | 'gameover' | 'click' | 'victory') {
    switch (type) {
      case 'correct':
        sounds.playCorrect();
        this.triggerHaptic('success');
        break;
      case 'pass':
        sounds.playPass();
        this.triggerHaptic('warning');
        break;
      case 'tick':
        sounds.playTick();
        break;
      case 'urgent':
        sounds.playUrgentTick();
        break;
      case 'gameover':
        sounds.playGameOver();
        this.triggerHaptic('error');
        break;
      case 'click':
        sounds.playClick();
        this.triggerHaptic('light');
        break;
      case 'victory':
        sounds.playVictory();
        this.triggerHaptic('success');
        break;
    }
  }
}

export const bridge = new MeGameBridge();
