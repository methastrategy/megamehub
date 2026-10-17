import type { PlayerProfile, GameScoreResult } from './types';
import { sounds } from '../utils/soundEffects';

const PROFILE_STORAGE_KEY = 'megamehub_player_profile';

const DEFAULT_PROFILE: PlayerProfile = {
  id: 'player_guest_' + Math.random().toString(36).substring(2, 7),
  name: 'MePlayer',
  avatar: '🎮',
  coins: 500,
  unlockedDecks: ['food', 'animals', 'movies', 'slang', 'places', 'actions'],
  highScores: {
    'chayen': 0,
    'cardclash': 0,
    'neonsnake': 0
  },
  isVip: false,
  vipTier: 'free',
  vipExpiresAt: null,
  dailyBonusLastClaimed: null,
  dailyBonusStreak: 0
};

export const DAILY_BONUS_TIERS = [100, 200, 350, 500, 750, 1000, 2500];

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
        const loaded: PlayerProfile = { ...DEFAULT_PROFILE, ...JSON.parse(data) };
        // Check VIP expiration
        if (loaded.isVip && loaded.vipExpiresAt && Date.now() > loaded.vipExpiresAt) {
          loaded.isVip = false;
          loaded.vipTier = 'free';
          loaded.vipExpiresAt = null;
        }
        return loaded;
      }
    } catch (e) {
      console.warn('Failed to load profile from storage:', e);
    }
    return { ...DEFAULT_PROFILE };
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

  public addCoins(amount: number) {
    this.profile.coins = Math.max(0, this.profile.coins + amount);
    this.saveProfile();
  }

  public activateVip(tier: 'pro' | 'elite', durationDays: number = 30): number {
    this.profile.isVip = true;
    this.profile.vipTier = tier;
    this.profile.vipExpiresAt = Date.now() + durationDays * 86400000;
    const bonusCoins = tier === 'elite' ? 20000 : 5000;
    this.profile.coins += bonusCoins;
    this.saveProfile();
    this.playSfx('victory');
    return bonusCoins;
  }

  public cancelVip() {
    this.profile.isVip = false;
    this.profile.vipTier = 'free';
    this.profile.vipExpiresAt = null;
    this.saveProfile();
    this.playSfx('click');
  }

  public canClaimDailyBonus(): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return this.profile.dailyBonusLastClaimed !== today;
  }

  public getDailyStreak(): number {
    return this.profile.dailyBonusStreak || 0;
  }

  public claimDailyBonus(): { success: boolean; amount: number; streak: number; message: string } {
    const today = new Date().toISOString().slice(0, 10);
    if (this.profile.dailyBonusLastClaimed === today) {
      return {
        success: false,
        amount: 0,
        streak: this.profile.dailyBonusStreak || 1,
        message: 'คุณได้รับโบนัสประจำวันของวันนี้ไปแล้ว กลับมาใหม่ในวันพรุ่งนี้นะครับ!'
      };
    }

    // Check if yesterday was claimed to keep streak alive
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let newStreak = 1;
    if (this.profile.dailyBonusLastClaimed === yesterday) {
      newStreak = ((this.profile.dailyBonusStreak || 0) % 7) + 1;
    }

    const baseReward = DAILY_BONUS_TIERS[newStreak - 1] || 100;
    // VIP Booster: Pro = 1.5x, Elite = 2.0x
    const vipMultiplier = this.profile.vipTier === 'elite' ? 2.0 : this.profile.vipTier === 'pro' ? 1.5 : 1.0;
    const finalReward = Math.round(baseReward * vipMultiplier);

    this.profile.dailyBonusLastClaimed = today;
    this.profile.dailyBonusStreak = newStreak;
    this.profile.coins += finalReward;

    // Special Day 7 reward: If free user reaches day 7, grant 24-hr VIP Pro trial!
    if (newStreak === 7 && !this.profile.isVip) {
      this.profile.isVip = true;
      this.profile.vipTier = 'pro';
      this.profile.vipExpiresAt = Date.now() + 86400000;
    }

    this.saveProfile();
    this.playSfx('victory');

    return {
      success: true,
      amount: finalReward,
      streak: newStreak,
      message: `รับสำเร็จ! +${finalReward.toLocaleString()} เหรียญ (เช็คอินต่อเนื่องวันที่ ${newStreak}/7)`
    };
  }

  public recordGameResult(result: GameScoreResult) {
    const currentHigh = this.profile.highScores[result.gameId] || 0;
    if (result.score > currentHigh) {
      this.profile.highScores[result.gameId] = result.score;
    }
    // VIP Coin Multipliers: Elite = 5x, Pro = 2x, Free = 1x
    const multiplier = this.profile.vipTier === 'elite' ? 5 : this.profile.vipTier === 'pro' ? 2 : 1;
    const earned = result.coinsEarned * multiplier;
    this.profile.coins += earned;
    this.saveProfile();
  }

  public triggerHaptic(type: 'light' | 'success' | 'warning' | 'error' = 'light') {
    if (!sounds.hapticsEnabled) return;
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
