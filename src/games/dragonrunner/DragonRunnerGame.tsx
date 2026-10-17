import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Volume2, VolumeX, Sparkles, Shield } from 'lucide-react';
import { sounds } from '../../utils/soundEffects';

interface DragonRunnerGameProps {
  onBackToHub: () => void;
}

interface Obstacle {
  id: number;
  type: 'tripod' | 'candle' | 'rod' | 'drone';
  x: number;
  y: number;
  w: number;
  h: number;
  flying?: boolean;
}

interface Collectible {
  id: number;
  type: 'coin' | 'chayen';
  x: number;
  y: number;
  w: number;
  h: number;
  collected?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

export const DragonRunnerGame: React.FC<DragonRunnerGameProps> = ({ onBackToHub }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('megamehub_dragon_runner_best') || '0', 10);
  });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);
  const [hasShield, setHasShield] = useState(false);

  // Engine references
  const stateRef = useRef({
    isPlaying: false,
    isGameOver: false,
    score: 0,
    speed: 5.5,
    baseSpeed: 5.5,
    frame: 0,
    groundY: 180,
    dragon: {
      x: 60,
      y: 136,
      w: 42,
      h: 44,
      vy: 0,
      gravity: 0.62,
      jumpPower: -11.8,
      grounded: true,
      ducking: false,
      wingTimer: 0,
      legTimer: 0,
      shieldTime: 0
    },
    obstacles: [] as Obstacle[],
    collectibles: [] as Collectible[],
    particles: [] as Particle[],
    clouds: [] as { x: number; y: number; s: number }[],
    nextSpawn: 70,
    spawnTimer: 0,
    nextCoin: 110,
    coinTimer: 0
  });

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.setEnabled(next);
  };

  const handleGameOver = useCallback(() => {
    stateRef.current.isPlaying = false;
    stateRef.current.isGameOver = true;
    setIsPlaying(false);
    setIsGameOver(true);
    setHasShield(false);
    sounds.playGameOver();

    const currentScore = Math.floor(stateRef.current.score);
    const best = parseInt(localStorage.getItem('megamehub_dragon_runner_best') || '0', 10);
    if (currentScore > best) {
      setHighScore(currentScore);
      localStorage.setItem('megamehub_dragon_runner_best', currentScore.toString());
      sounds.playVictory();
    }
  }, []);

  const jump = useCallback(() => {
    const state = stateRef.current;
    if (!state.isPlaying) {
      if (state.isGameOver) {
        restartGame();
      } else {
        startGame();
      }
      return;
    }

    if (state.dragon.grounded && !state.dragon.ducking) {
      state.dragon.vy = state.dragon.jumpPower;
      state.dragon.grounded = false;
      sounds.playPass();
      // Jump dust particles
      for (let i = 0; i < 6; i++) {
        state.particles.push({
          x: state.dragon.x + 15 + (Math.random() * 10 - 5),
          y: state.groundY,
          vx: -(Math.random() * 3 + 1),
          vy: -(Math.random() * 2),
          color: '#cbd5e1',
          size: Math.random() * 3 + 2,
          alpha: 0.8,
          life: 20
        });
      }
    }
  }, [handleGameOver]);

  const setDuck = useCallback((ducking: boolean) => {
    const state = stateRef.current;
    if (!state.isPlaying) return;
    if (state.dragon.grounded) {
      state.dragon.ducking = ducking;
      state.dragon.h = ducking ? 26 : 44;
      state.dragon.y = state.groundY - state.dragon.h;
    } else if (!ducking) {
      state.dragon.ducking = false;
      state.dragon.h = 44;
    }
  }, []);

  const startGame = () => {
    const state = stateRef.current;
    state.isPlaying = true;
    state.isGameOver = false;
    state.score = 0;
    state.speed = state.baseSpeed;
    state.frame = 0;
    state.obstacles = [];
    state.collectibles = [];
    state.particles = [];
    state.spawnTimer = 0;
    state.nextSpawn = 60;
    state.dragon.y = state.groundY - 44;
    state.dragon.vy = 0;
    state.dragon.grounded = true;
    state.dragon.ducking = false;
    state.dragon.shieldTime = 0;

    state.clouds = [
      { x: 100, y: 35, s: 1 },
      { x: 340, y: 55, s: 0.8 },
      { x: 580, y: 25, s: 1.2 }
    ];

    setScore(0);
    setIsPlaying(true);
    setIsGameOver(false);
    setHasShield(false);
    sounds.playClick();
  };

  const restartGame = () => {
    startGame();
  };

  // Setup loop and event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        jump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        setDuck(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        setDuck(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Initial clouds
    stateRef.current.clouds = [
      { x: 80, y: 30, s: 1 },
      { x: 320, y: 60, s: 0.9 },
      { x: 540, y: 25, s: 1.1 }
    ];

    // Game loop
    const loop = () => {
      const state = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;
      const gy = state.groundY;

      // 1. UPDATE STATE
      if (state.isPlaying) {
        state.frame++;
        state.score += 0.15;
        // Increase speed gradually
        state.speed = state.baseSpeed + Math.min(6, Math.floor(state.score / 150) * 0.5);

        // Update dragon physics
        const d = state.dragon;
        d.vy += d.gravity;
        d.y += d.vy;

        if (d.y >= gy - d.h) {
          d.y = gy - d.h;
          d.vy = 0;
          d.grounded = true;
        } else {
          d.grounded = false;
        }

        d.legTimer += 0.25;
        d.wingTimer += 0.2;

        // Shield countdown
        if (d.shieldTime > 0) {
          d.shieldTime--;
          if (d.shieldTime === 0) {
            setHasShield(false);
          }
        }

        // Clouds scroll
        state.clouds.forEach(c => {
          c.x -= state.speed * 0.25 * c.s;
          if (c.x < -80) {
            c.x = W + 40;
            c.y = 20 + Math.random() * 50;
          }
        });

        // Spawn obstacles
        state.spawnTimer++;
        if (state.spawnTimer >= state.nextSpawn) {
          state.spawnTimer = 0;
          state.nextSpawn = Math.floor(45 + Math.random() * 55 - Math.min(20, state.score / 60));

          const pool: Obstacle['type'][] = ['tripod', 'rod', 'candle'];
          if (state.score > 250) pool.push('drone');
          const type = pool[Math.floor(Math.random() * pool.length)];

          if (type === 'tripod') {
            state.obstacles.push({
              id: Date.now() + Math.random(),
              type: 'tripod',
              x: W + 10,
              y: gy - 38,
              w: 30,
              h: 38
            });
          } else if (type === 'rod') {
            state.obstacles.push({
              id: Date.now() + Math.random(),
              type: 'rod',
              x: W + 10,
              y: gy - 44,
              w: 14,
              h: 44
            });
          } else if (type === 'candle') {
            state.obstacles.push({
              id: Date.now() + Math.random(),
              type: 'candle',
              x: W + 10,
              y: gy - 34,
              w: 22,
              h: 34
            });
          } else if (type === 'drone') {
            const flyLevels = [gy - 65, gy - 85, gy - 45];
            const fy = flyLevels[Math.floor(Math.random() * flyLevels.length)];
            state.obstacles.push({
              id: Date.now() + Math.random(),
              type: 'drone',
              x: W + 10,
              y: fy,
              w: 32,
              h: 22,
              flying: true
            });
          }
        }

        // Spawn collectibles (Coins / Chayen)
        state.coinTimer++;
        if (state.coinTimer >= state.nextCoin) {
          state.coinTimer = 0;
          state.nextCoin = Math.floor(120 + Math.random() * 140);
          const isChayen = Math.random() < 0.25; // 25% chance of Chayen buff
          state.collectibles.push({
            id: Date.now() + Math.random(),
            type: isChayen ? 'chayen' : 'coin',
            x: W + 20,
            y: gy - (isChayen ? 40 : 60 + Math.random() * 30),
            w: 20,
            h: 20
          });
        }

        // Update obstacles
        for (let i = state.obstacles.length - 1; i >= 0; i--) {
          const obs = state.obstacles[i];
          obs.x -= state.speed;

          // Collision detection (AABB with slightly forgiving hitbox)
          const pad = 6;
          if (
            d.x + pad < obs.x + obs.w - pad &&
            d.x + d.w - pad > obs.x + pad &&
            d.y + pad < obs.y + obs.h - pad &&
            d.y + d.h - pad > obs.y + pad
          ) {
            if (d.shieldTime > 0) {
              // Destroy obstacle with shield
              state.obstacles.splice(i, 1);
              sounds.playCorrect();
              for (let p = 0; p < 10; p++) {
                state.particles.push({
                  x: obs.x + obs.w / 2,
                  y: obs.y + obs.h / 2,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  color: '#f59e0b',
                  size: Math.random() * 4 + 2,
                  alpha: 1,
                  life: 25
                });
              }
              continue;
            } else {
              handleGameOver();
              break;
            }
          }

          if (obs.x + obs.w < -20) {
            state.obstacles.splice(i, 1);
          }
        }

        // Update collectibles
        for (let i = state.collectibles.length - 1; i >= 0; i--) {
          const item = state.collectibles[i];
          item.x -= state.speed;

          // Pickup check
          if (
            !item.collected &&
            d.x < item.x + item.w &&
            d.x + d.w > item.x &&
            d.y < item.y + item.h &&
            d.y + d.h > item.y
          ) {
            item.collected = true;
            if (item.type === 'chayen') {
              d.shieldTime = 240; // ~4 seconds of shield
              state.score += 150;
              setHasShield(true);
              sounds.playVictory();
            } else {
              state.score += 50;
              sounds.playCorrect();
            }

            // Particles
            for (let p = 0; p < 8; p++) {
              state.particles.push({
                x: item.x + item.w / 2,
                y: item.y + item.h / 2,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                color: item.type === 'chayen' ? '#f97316' : '#eab308',
                size: Math.random() * 4 + 2,
                alpha: 1,
                life: 30
              });
            }
            state.collectibles.splice(i, 1);
            continue;
          }

          if (item.x + item.w < -20) {
            state.collectibles.splice(i, 1);
          }
        }

        // Update particles
        for (let i = state.particles.length - 1; i >= 0; i--) {
          const p = state.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= 1 / p.life;
          if (p.alpha <= 0) {
            state.particles.splice(i, 1);
          }
        }

        if (state.frame % 4 === 0) {
          setScore(Math.floor(state.score));
        }
      }

      // 2. RENDER STAGE
      ctx.clearRect(0, 0, W, H);

      // Sky gradient (day / dusk cycle)
      const cycle = Math.sin(state.frame * 0.001);
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      if (cycle > 0) {
        skyGrad.addColorStop(0, '#0f172a');
        skyGrad.addColorStop(1, '#1e293b');
      } else {
        skyGrad.addColorStop(0, '#020617');
        skyGrad.addColorStop(1, '#0f172a');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Draw clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      state.clouds.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 16 * c.s, 0, Math.PI * 2);
        ctx.arc(c.x + 14 * c.s, c.y - 6 * c.s, 20 * c.s, 0, Math.PI * 2);
        ctx.arc(c.x + 32 * c.s, c.y, 16 * c.s, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ground Line & Grid
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();

      // Ground running dashes
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      const dashOffset = (state.frame * state.speed) % 36;
      for (let x = -dashOffset; x < W; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, gy + 4);
        ctx.lineTo(x + 12, gy + 4);
        ctx.stroke();
      }

      // Ground underlayer
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, gy + 2, W, H - gy);

      // Collectibles
      state.collectibles.forEach(item => {
        if (item.type === 'chayen') {
          // Iced Thai Tea cup
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(item.x + 4, item.y + 4, 12, 14);
          ctx.fillStyle = '#ffedd5'; // Whipped foam top
          ctx.fillRect(item.x + 2, item.y + 2, 16, 4);
          ctx.fillStyle = '#38bdf8'; // Straw
          ctx.fillRect(item.x + 12, item.y - 4, 2, 8);
        } else {
          // Golden Coin
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(item.x + 9, item.y + 9, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#78350f';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('$', item.x + 6, item.y + 12);
        }
      });

      // Obstacles
      state.obstacles.forEach(obs => {
        if (obs.type === 'tripod') {
          // Surveyor Total Station Tripod
          ctx.strokeStyle = '#eab308'; // Yellow legs
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(obs.x + 5, obs.y + obs.h);
          ctx.lineTo(obs.x + 15, obs.y + 14);
          ctx.lineTo(obs.x + 25, obs.y + obs.h);
          ctx.stroke();

          // Instrument body (Blue)
          ctx.fillStyle = '#2563eb';
          ctx.fillRect(obs.x + 9, obs.y + 4, 12, 12);

          // Optical lens + laser sight
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(obs.x + 3, obs.y + 6, 7, 6);
          ctx.fillStyle = '#ef4444'; // Red dot laser
          ctx.fillRect(obs.x + 1, obs.y + 8, 3, 2);
        } else if (obs.type === 'rod') {
          // Ranging Rod (Red and White alternating bands)
          const bands = 5;
          const bh = obs.h / bands;
          for (let b = 0; b < bands; b++) {
            ctx.fillStyle = b % 2 === 0 ? '#ef4444' : '#f8fafc';
            ctx.fillRect(obs.x + 4, obs.y + b * bh, 6, bh);
          }
          // Tip
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(obs.x + 5, obs.y + obs.h - 4, 4, 4);
        } else if (obs.type === 'candle') {
          // Candlestick Pillar (Trading chart obstacle)
          const isGreen = Math.sin(obs.id) > 0;
          ctx.fillStyle = isGreen ? '#10b981' : '#ef4444';
          ctx.strokeStyle = isGreen ? '#059669' : '#dc2626';
          // Wick
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.w / 2, obs.y);
          ctx.lineTo(obs.x + obs.w / 2, obs.y + obs.h);
          ctx.stroke();
          // Body
          ctx.fillRect(obs.x + 3, obs.y + 6, obs.w - 6, obs.h - 12);
        } else if (obs.type === 'drone') {
          // Aerial Survey Drone
          ctx.fillStyle = '#475569';
          ctx.fillRect(obs.x + 8, obs.y + 6, 16, 8);
          // Rotor arms
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(obs.x + 2, obs.y + 4);
          ctx.lineTo(obs.x + 30, obs.y + 4);
          ctx.stroke();
          // Spinning propellors
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillRect(obs.x, obs.y + 2, 8, 2);
          ctx.fillRect(obs.x + 24, obs.y + 2, 8, 2);
          // Blinking camera LED
          ctx.fillStyle = state.frame % 16 < 8 ? '#10b981' : '#ef4444';
          ctx.fillRect(obs.x + 14, obs.y + 14, 4, 3);
        }
      });

      // DRAGON MASCOT (Green Baby Dragon with Red Beret)
      const d = state.dragon;
      ctx.save();
      ctx.translate(d.x, d.y);

      // Invincibility Shield Aura
      if (d.shieldTime > 0) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
        ctx.beginPath();
        ctx.arc(d.w / 2, d.h / 2, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
      }

      if (d.ducking) {
        // --- DUCKING POSE ---
        // Tail
        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.arc(4, 16, 6, 0, Math.PI * 2);
        ctx.fill();

        // Chubby Body
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.ellipse(22, 16, 18, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Yellow Belly
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.ellipse(22, 20, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(34, 12, 10, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(37, 10, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Red Beret (Tucked low)
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(32, 4, 10, 4, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#991b1b'; // Beret tip
        ctx.fillRect(31, 1, 2, 3);
      } else {
        // --- STANDING / RUNNING POSE ---
        // Tail with cute spikes
        ctx.fillStyle = '#059669';
        const tailWag = Math.sin(d.legTimer) * 3;
        ctx.beginPath();
        ctx.moveTo(8, 28);
        ctx.lineTo(-4, 24 + tailWag);
        ctx.lineTo(8, 36);
        ctx.fill();

        // Chubby Green Dragon Body
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.ellipse(20, 26, 14, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Warm Yellow Belly
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.ellipse(23, 27, 9, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tiny Dragon Wings
        const wingFlap = Math.sin(d.wingTimer) * 5;
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.moveTo(14, 20);
        ctx.lineTo(6, 12 + wingFlap);
        ctx.lineTo(16, 16);
        ctx.fill();

        // Dragon Head
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(28, 14, 12, 0, Math.PI * 2);
        ctx.fill();

        // Snout
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(36, 16, 6, 0, Math.PI * 2);
        ctx.fill();

        // Eye (Happy or Blink)
        ctx.fillStyle = '#0f172a';
        if (state.isGameOver) {
          // X Eye
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(31, 9);
          ctx.lineTo(35, 13);
          ctx.moveTo(35, 9);
          ctx.lineTo(31, 13);
          ctx.stroke();
        } else {
          // Big cute eye
          ctx.beginPath();
          ctx.arc(33, 11, 3, 0, Math.PI * 2);
          ctx.fill();
          // White twinkle
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(34, 10, 1, 0, Math.PI * 2);
          ctx.fill();
        }

        // RED BERET (Signature Item)
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(26, 4, 12, 5, -0.15, 0, Math.PI * 2);
        ctx.fill();
        // Beret stalk / puff
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(25, 0, 3, 3);
        // Beret dark headband brim
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(18, 6, 16, 2);

        // Running Legs
        const leg1 = Math.sin(d.legTimer) * 7;
        const leg2 = Math.sin(d.legTimer + Math.PI) * 7;
        ctx.fillStyle = '#059669';
        // Left Leg
        ctx.fillRect(14 + (d.grounded ? leg1 : -2), 38, 5, 8);
        // Right Leg
        ctx.fillRect(22 + (d.grounded ? leg2 : 4), 38, 5, 8);
      }

      ctx.restore();

      // Particles
      state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [jump, setDuck, handleGameOver]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-3 select-none">
      {/* Top Header Bar */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-3 px-2">
        <button
          onClick={() => {
            sounds.playClick();
            onBackToHub();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>กลับหน้าฮับ</span>
        </button>

        <div className="flex items-center gap-4">
          {hasShield && (
            <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full animate-pulse">
              <Shield className="w-3.5 h-3.5" />
              <span>Chayen Shield!</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            <Trophy className="w-3.5 h-3.5" />
            <span>HI: {highScore}</span>
          </div>

          <button
            onClick={toggleSound}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="เปิด/ปิดเสียง"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Game Screen */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Score Overlay HUD */}
        <div className="absolute top-4 right-5 z-10 flex items-center gap-2">
          <span className="text-2xl font-black tracking-wider text-emerald-400 font-mono drop-shadow">
            {score.toString().padStart(5, '0')}
          </span>
        </div>

        {/* Canvas Area */}
        <canvas
          ref={canvasRef}
          width={700}
          height={240}
          onClick={jump}
          className="w-full h-auto block cursor-pointer bg-slate-950"
        />

        {/* Start / Pause / Game Over Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20">
            {isGameOver ? (
              <div className="animate-in fade-in zoom-in-95 duration-200 flex flex-col items-center">
                <span className="text-4xl mb-2">💥</span>
                <h3 className="text-2xl font-black text-white mb-1">GAME OVER</h3>
                <p className="text-xs text-slate-400 mb-4">
                  คะแนนรอบนี้: <span className="font-bold text-emerald-400 font-mono text-sm">{score}</span>
                </p>

                <button
                  onClick={restartGame}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>เล่นใหม่อีกครั้ง</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/30 mb-3 animate-bounce">
                  🐲
                </div>
                <h2 className="text-xl font-black text-white mb-1">DRAGON RUNNER</h2>
                <p className="text-xs text-slate-400 mb-5 max-w-xs leading-relaxed">
                  พาน้องมังกรเขียวหมวกเบเร่ต์แดง วิ่งกระโดดข้ามกล้องสำรวจ แท่งเทียนเทรด และเก็บแก้วชาเย็นบูสต์เกราะ!
                </p>

                <button
                  onClick={startGame}
                  className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-95 transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>เริ่มวิ่ง (TAP TO START)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Touch Controls Strip */}
      <div className="w-full max-w-2xl mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={jump}
          className="py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-white font-bold text-sm active:bg-emerald-600/30 active:scale-98 transition flex items-center justify-center gap-2 shadow-sm"
        >
          <span>⬆️ กระโดด (JUMP)</span>
        </button>

        <button
          onMouseDown={() => setDuck(true)}
          onMouseUp={() => setDuck(false)}
          onTouchStart={(e) => { e.preventDefault(); setDuck(true); }}
          onTouchEnd={(e) => { e.preventDefault(); setDuck(false); }}
          className="py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-white font-bold text-sm active:bg-amber-600/30 active:scale-98 transition flex items-center justify-center gap-2 shadow-sm"
        >
          <span>⬇️ สไลด์หมอบ (DUCK)</span>
        </button>
      </div>

      {/* Hints */}
      <p className="text-[11px] text-slate-500 mt-2 text-center">
        กด <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Space</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">↑</kbd> เพื่อกระโดด — กดค้าง <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">↓</kbd> เพื่อสไลด์หมอบ
      </p>
    </div>
  );
};
