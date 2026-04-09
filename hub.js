/* =============================================================================
 *  FA Omok · Premium Emerald Edition
 *  -----------------------------------------------------------------------------
 *  Single-file, self-mounting, vanilla JavaScript Gomoku game.
 *  - Works offline (localStorage persistence, no external dependencies)
 *  - Polished Kakao-style UI with a deep-emerald gradient theme throughout
 *  - AI opponent with 3 difficulty levels (heuristic + minimax alpha-beta)
 *  - Local friend PvP on a single device
 *  - Full profile system: stars, XP, level, streaks, weekly/total records
 *  - Leaderboard (weekly + cumulative) with seeded bot opponents
 *  - Shop: unlockable avatars, board skins, stone themes
 *  - Daily / weekly missions with star rewards
 *  - Achievements and match history
 *  - Tutorial and how-to-play screens
 *  - Sound engine, particle effects, confetti animations
 *  - Settings: difficulty, sound, music, vibration, theme variants
 *  - Fullscreen toggle that actually toggles in AND out
 *  - Responsive layout that works on phone, tablet and desktop
 *  =============================================================================
 */

function ordinalSuffix(n) {
  const v = Math.abs(Number(n)) || 0;
  const r10 = v % 10, r100 = v % 100;
  if (r10 === 1 && r100 !== 11) return 'st';
  if (r10 === 2 && r100 !== 12) return 'nd';
  if (r10 === 3 && r100 !== 13) return 'rd';
  return 'th';
}

(function () {
  'use strict';

  /* ═════════════════════════════════════════════════════════════════════════
     CONSTANTS
     ═════════════════════════════════════════════════════════════════════════ */
  const STORE_KEY        = 'kk_omok_profile_v2';
  const RANK_KEY         = 'kk_omok_ranks_v2';
  const SETTINGS_KEY     = 'kk_omok_settings_v2';
  const HISTORY_KEY      = 'kk_omok_history_v2';
  const MISSIONS_KEY     = 'kk_omok_missions_v2';
  const ACHIEVE_KEY      = 'kk_omok_achievements_v2';
  const SHOP_KEY         = 'kk_omok_shop_v2';
  const DAILY_KEY        = 'kk_omok_daily_v2';

  const BOARD_SIZE       = 15;
  const HUMAN            = 1;
  const AI_PLAYER        = 2;
  const EMPTY            = 0;

  const AI_EASY          = 1;
  const AI_NORMAL        = 2;
  const AI_HARD          = 3;

  const MODE_AI          = 'ai';
  const MODE_PVP         = 'pvp';

  const WIN_STAR_REWARDS = { 1: 30, 2: 50, 3: 90 };
  const WIN_XP_REWARDS   = { 1: 20, 2: 40, 3: 70 };
  const LOSS_XP          = 8;
  const DAILY_BONUS_STAR = 100;
  const DAILY_BONUS_XP   = 0;

  const SHOP_ITEMS = [
    { id: 'avatar_bear',   type: 'avatar', name: 'Bear Cub',       emoji: '🐻', price: 0    },
    { id: 'avatar_tiger',  type: 'avatar', name: 'Tiger',       emoji: '🐯', price: 6000  },
    { id: 'avatar_fox',    type: 'avatar', name: 'Fox',         emoji: '🦊', price: 9000  },
    { id: 'avatar_cat',    type: 'avatar', name: 'Cat',       emoji: '🐱', price: 10500  },
    { id: 'avatar_dog',    type: 'avatar', name: 'Puppy',       emoji: '🐶', price: 12000  },
    { id: 'avatar_panda',  type: 'avatar', name: 'Panda',         emoji: '🐼', price: 13500  },
    { id: 'avatar_koala',  type: 'avatar', name: 'Koala',       emoji: '🐨', price: 15000  },
    { id: 'avatar_rabbit', type: 'avatar', name: 'Rabbit',         emoji: '🐰', price: 16500  },
    { id: 'avatar_wolf',   type: 'avatar', name: 'Wolf',         emoji: '🐺', price: 24000  },
    { id: 'avatar_lion',   type: 'avatar', name: 'Lion',         emoji: '🦁', price: 30000 },
    { id: 'avatar_dragon', type: 'avatar', name: 'Dragon',       emoji: '🐲', price: 75000 },
    { id: 'avatar_unicorn',type: 'avatar', name: 'Unicorn',       emoji: '🦄', price: 90000 },
    { id: 'avatar_crown',  type: 'avatar', name: 'Crown',         emoji: '👑', price: 150000 },

    { id: 'board_classic', type: 'board',  name: 'Wood',         emoji: '🪵', price: 0    },
    { id: 'board_jade',    type: 'board',  name: 'Jade',         emoji: '🟢', price: 18000  },
    { id: 'board_onyx',    type: 'board',  name: 'Onyx',       emoji: '⚫', price: 36000 },
    { id: 'board_ruby',    type: 'board',  name: 'Ruby',         emoji: '🔴', price: 54000 },
    { id: 'board_sapphire',type: 'board',  name: 'Sapphire',     emoji: '🔵', price: 72000 },
    { id: 'board_gold',    type: 'board',  name: 'Gold',         emoji: '🟡', price: 108000 },

    { id: 'stone_classic', type: 'stone',  name: 'Classic',       emoji: '⚫', price: 0    },
    { id: 'stone_jade',    type: 'stone',  name: 'Jade Stone',       emoji: '🟢', price: 15000  },
    { id: 'stone_amber',   type: 'stone',  name: 'Amber',       emoji: '🟠', price: 24000  },
    { id: 'stone_neon',    type: 'stone',  name: 'Neon',         emoji: '💎', price: 45000 },
  ];

  const ACHIEVEMENTS = [
    { id: 'first_win',     name: 'First Win',       desc: 'Win your first game',             star: 50,   icon: '🥇', check: p => p.totalWins >= 1 },
    { id: 'wins_5',        name: 'Rookie',          desc: '5 wins',                  star: 80,   icon: '🌟', check: p => p.totalWins >= 5 },
    { id: 'wins_25',       name: 'Veteran',        desc: '25 wins',                 star: 200,  icon: '⭐', check: p => p.totalWins >= 25 },
    { id: 'wins_100',      name: 'Master',        desc: '100 wins',                star: 1000, icon: '🏆', check: p => p.totalWins >= 100 },
    { id: 'streak_3',      name: 'Flame',          desc: '3Reach a win streak',            star: 120,  icon: '🔥', check: p => p.bestStreak >= 3 },
    { id: 'streak_5',      name: 'Storm',          desc: '5Reach a win streak',            star: 250,  icon: '⚡', check: p => p.bestStreak >= 5 },
    { id: 'streak_10',     name: 'Legend',          desc: '10Reach a win streak',           star: 800,  icon: '💫', check: p => p.bestStreak >= 10 },
    { id: 'hard_win',      name: 'Challenger',        desc: 'Beat Hard AI',          star: 300,  icon: '🎯', check: p => p.hardWins >= 1 },
    { id: 'hard_win_10',   name: 'Conqueror',        desc: 'Beat Hard AI 10 times',     star: 1500, icon: '👑', check: p => p.hardWins >= 10 },
    { id: 'games_50',      name: 'Enthusiast',        desc: '50Play games',                star: 150,  icon: '🎮', check: p => p.totalGames >= 50 },
    { id: 'games_200',     name: 'Addict',        desc: '200Play games',               star: 500,  icon: '🕹️', check: p => p.totalGames >= 200 },
    { id: 'stars_1000',    name: 'Rich',          desc: 'Collect 1,000 stars',           star: 200,  icon: '💰', check: p => p.stars >= 1000 },
    { id: 'stars_5000',    name: 'Tycoon',        desc: 'Collect 5,000 stars',           star: 800,  icon: '💎', check: p => p.stars >= 5000 },
    { id: 'level_5',       name: 'Growth',          desc: 'Reach Level 5',                  star: 150,  icon: '📈', check: p => levelFromXp(p.xp).lv >= 5 },
    { id: 'level_10',      name: 'Skilled',          desc: 'Reach Level 10',                 star: 400,  icon: '🎓', check: p => levelFromXp(p.xp).lv >= 10 },
    { id: 'level_20',      name: 'Pro',          desc: 'Reach Level 20',                 star: 1000, icon: '🏅', check: p => levelFromXp(p.xp).lv >= 20 },
  ];

  const BOT_NAMES = [
    'Flame Hand', 'Go King', 'Prodigy', 'Omok God', 'Silent Night',
    'Unbeaten Blade', 'Milky Way', 'Blue Dragon', 'White Tiger', 'Lightning',
    'Midas', 'Moon Warrior', 'Red Bear', 'Black Dragon', 'Glacier',
    'Calm Before Storm', 'Lone Wolf', 'Thunder', 'Starlight Knight', 'Wizard',
  ];

  const DIRS = [[1,0],[0,1],[1,1],[1,-1]];

  /* ═════════════════════════════════════════════════════════════════════════
     STYLES — Emerald Kakao theme, applied to every screen and component
     ═════════════════════════════════════════════════════════════════════════ */
  const CSS = `
  :root{
    --g-deep:#052a1e;
    --g1:#0b4f3a;
    --g2:#0e6b4d;
    --g3:#14916a;
    --g4:#1fb37f;
    --g5:#3ddc98;
    --accent:#9cf0c4;
    --gold:#ffd56b;
    --gold2:#f6b733;
    --gold3:#ff9e3c;
    --ruby:#ff5a6a;
    --blue:#5aa9ff;
    --ink:#05110c;
    --ink2:#0b2a20;
    --paper:#f5fbf8;
    --muted:#8aa89c;
    --shadow:0 18px 44px rgba(0,0,0,.45);
    --safe-top:env(safe-area-inset-top,0px);
    --safe-bot:env(safe-area-inset-bottom,0px);
  }
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  html,body{
    margin:0;padding:0;height:100%;overflow:hidden;
    font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard","Malgun Gothic","Noto Sans KR",sans-serif;
    background:#04100a;color:#fff;
    -webkit-user-select:none;user-select:none;
  }
  button,input,textarea,select{font-family:inherit}
  button{cursor:pointer}
  #kk-root{
    position:fixed;inset:0;
    display:flex;align-items:center;justify-content:center;
    background:
      radial-gradient(1200px 800px at 20% 10%, #0b3d2c 0%, transparent 50%),
      radial-gradient(1000px 700px at 80% 100%, #0e4a34 0%, transparent 50%),
      #04100a;
  }
  #kk-root::before{
    content:"";position:absolute;inset:0;pointer-events:none;
    background-image:
      radial-gradient(1.4px 1.4px at 12% 18%, rgba(255,255,255,.45) 50%, transparent 51%),
      radial-gradient(1.2px 1.2px at 72% 24%, rgba(255,255,255,.4) 50%, transparent 51%),
      radial-gradient(1.6px 1.6px at 38% 72%, rgba(255,255,255,.35) 50%, transparent 51%),
      radial-gradient(1.1px 1.1px at 88% 78%, rgba(255,255,255,.35) 50%, transparent 51%),
      radial-gradient(1.3px 1.3px at 54% 42%, rgba(255,255,255,.3) 50%, transparent 51%);
  }

  html,body{ height:100%; overscroll-behavior:none; }
  .stage{
    position:relative;
    width:min(100vw,480px);
    height:min(100svh,920px);
    max-height:100svh;
    padding-top:env(safe-area-inset-top,0px);
    padding-bottom:env(safe-area-inset-bottom,0px);
    background:linear-gradient(165deg,var(--g1) 0%,var(--g2) 30%,var(--g3) 65%,var(--g4) 100%);
    overflow:hidden;
    border-radius:28px;
    box-shadow:var(--shadow), inset 0 1px 0 rgba(255,255,255,.1);
  }
  @media (max-width:520px){ .stage{ width:100vw; height:100svh; max-height:100svh; border-radius:0; } }
  .footer-nav{ margin-bottom:calc(env(safe-area-inset-bottom,0px) + 18px); padding-bottom:4px; }
  @media (max-width:520px){
    .footer-nav{ margin-bottom:calc(env(safe-area-inset-bottom,0px) + 28px); }
    .screen{ padding-bottom:calc(36px + env(safe-area-inset-bottom,0px)) !important; }
  }
  .stage::before{
    content:"";position:absolute;inset:0;pointer-events:none;
    background:
      radial-gradient(700px 500px at 90% -10%, rgba(61,220,152,.35), transparent 60%),
      radial-gradient(600px 500px at -10% 120%, rgba(20,145,106,.45), transparent 60%);
  }
  .stage::after{
    content:"";position:absolute;inset:0;pointer-events:none;
    background:
      radial-gradient(1.5px 1.5px at 16% 22%, rgba(255,255,255,.45) 50%, transparent 51%),
      radial-gradient(1.3px 1.3px at 78% 14%, rgba(255,255,255,.35) 50%, transparent 51%),
      radial-gradient(1.7px 1.7px at 32% 68%, rgba(255,255,255,.3) 50%, transparent 51%),
      radial-gradient(1.2px 1.2px at 92% 72%, rgba(255,255,255,.3) 50%, transparent 51%),
      radial-gradient(1.4px 1.4px at 58% 34%, rgba(255,255,255,.25) 50%, transparent 51%);
  }

  .screen{
    position:absolute;inset:0;
    display:none;
    flex-direction:column;
    padding:calc(16px + var(--safe-top)) 16px calc(24px + var(--safe-bot));
    overflow-y:auto;
    -webkit-overflow-scrolling:touch;
    animation:kk-fade .35s ease;
    z-index:1;
  }
  .screen.active{ display:flex; }

  @keyframes kk-fade{ from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  @keyframes kk-pop{ from{transform:scale(.7);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes kk-float{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  @keyframes kk-pulse{ 0%,100%{box-shadow:0 0 0 0 rgba(255,213,107,.7)} 70%{box-shadow:0 0 0 14px rgba(255,213,107,0)} }
  @keyframes kk-shine{ 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes kk-glow{ 0%,100%{filter:drop-shadow(0 0 8px rgba(31,179,127,.6))} 50%{filter:drop-shadow(0 0 16px rgba(61,220,152,.9))} }
  @keyframes kk-slideup{ from{transform:translateY(20px);opacity:0} to{transform:none;opacity:1} }
  @keyframes kk-spin{ from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes kk-bounce{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes kk-confetti{ to{transform:translateY(110vh) rotate(720deg);opacity:0} }

  /* =============== SHARED BARS =============== */
  .topbar{
    display:flex;align-items:center;justify-content:space-between;
    gap:10px;margin-bottom:12px;position:relative;z-index:3;
  }
  .brand{ display:flex;align-items:center;gap:10px; min-width:0 }
  .brand-logo{
    width:46px;height:46px;border-radius:14px;
    background:linear-gradient(135deg,var(--gold),var(--gold3));
    display:grid;place-items:center;
    font-weight:900;color:#2a1500;font-size:22px;
    box-shadow:0 6px 16px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.55);
  }
  .brand-name{ font-weight:900;font-size:19px;letter-spacing:-.4px;line-height:1.05 }
  .brand-name small{
    display:block;font-weight:700;font-size:10.5px;opacity:.75;margin-top:4px;
    letter-spacing:1.2px;text-transform:uppercase;
  }
  .topbar-right{ display:flex;align-items:center;gap:8px }
  .icon-btn{
    width:42px;height:42px;border-radius:14px;
    background:rgba(255,255,255,.1);
    border:1px solid rgba(255,255,255,.18);
    display:grid;place-items:center;
    font-size:18px;color:#fff;
    backdrop-filter:blur(10px);
    transition:all .18s;
  }
  .icon-btn:hover{ background:rgba(255,255,255,.18) }
  .icon-btn:active{ transform:scale(.92) }

  .star-pill{
    display:inline-flex;align-items:center;gap:6px;
    padding:8px 13px;border-radius:999px;
    background:rgba(0,0,0,.3);
    border:1px solid rgba(255,213,107,.4);
    font-weight:900;font-size:13px;color:var(--gold);
    backdrop-filter:blur(8px);
  }
  .star-pill::before{ content:"⭐";font-size:13px }

  .lvl-pill{
    display:inline-flex;align-items:center;gap:6px;
    padding:8px 13px;border-radius:999px;
    background:linear-gradient(135deg,rgba(31,179,127,.35),rgba(15,122,84,.35));
    border:1px solid rgba(156,240,196,.4);
    font-weight:900;font-size:13px;color:var(--accent);
    backdrop-filter:blur(8px);
  }
  .lvl-pill::before{ content:"⚡";font-size:12px }

  /* =============== HOME =============== */
  .hero{
    flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;gap:12px;position:relative;z-index:2;
  }
  .hero-title{
    font-size:46px;font-weight:900;margin:0;letter-spacing:-1.5px;
    background:linear-gradient(180deg,#fff 0%,#d7f4e5 50%,var(--accent) 100%);
    -webkit-background-clip:text;background-clip:text;color:transparent;
    text-shadow:0 6px 24px rgba(0,0,0,.35);
  }
  .hero-sub{
    font-size:12px;margin:0;opacity:.82;letter-spacing:3px;font-weight:800;
  }
  .hero-board{
    width:230px;height:230px;border-radius:28px;position:relative;
    background:radial-gradient(circle at 30% 25%,#f3d292,#b87238);
    box-shadow:0 22px 56px rgba(0,0,0,.55), inset 0 0 0 5px #5a2e08, inset 0 0 0 8px rgba(255,255,255,.12);
    animation:kk-float 4.5s ease-in-out infinite;
  }
  .hero-board::before{
    content:"";position:absolute;inset:24px;
    background-image:linear-gradient(#2b1d10 1.2px,transparent 1.2px),linear-gradient(90deg,#2b1d10 1.2px,transparent 1.2px);
    background-size:calc((100% - 2px)/8) calc((100% - 2px)/8);
    opacity:.85;border-radius:6px;
  }
  .hero-board::after{
    content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
    background:linear-gradient(180deg,rgba(255,255,255,.18),transparent 40%);
  }
  .hero-stone{
    position:absolute;width:26px;height:26px;border-radius:50%;
    box-shadow:0 4px 10px rgba(0,0,0,.5);
  }
  .hs-b{ background:radial-gradient(circle at 35% 30%,#6a6a6a,#000) }
  .hs-w{ background:radial-gradient(circle at 35% 30%,#fff,#cfcfcf) }

  .menu{
    display:flex;flex-direction:column;gap:11px;
    padding-top:8px;position:relative;z-index:2;
  }
  .main-btn{
    display:flex;align-items:center;gap:14px;
    padding:16px 18px;border:none;border-radius:20px;
    background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.06));
    backdrop-filter:blur(14px);
    border:1px solid rgba(255,255,255,.22);
    box-shadow:0 10px 28px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.2);
    color:#fff;text-align:left;
    transition:transform .12s, box-shadow .2s;
    position:relative;overflow:hidden;
  }
  .main-btn:hover{ transform:translateY(-1px) }
  .main-btn:active{ transform:scale(.98) }
  .main-btn.primary{
    background:linear-gradient(135deg,#28d895 0%,#15a070 50%,#0d6f4a 100%);
    border:1px solid rgba(255,255,255,.28);
    box-shadow:0 12px 28px rgba(14,140,92,.55), inset 0 1px 0 rgba(255,255,255,.28);
  }
  .main-btn.primary::after{
    content:"";position:absolute;inset:0;pointer-events:none;
    background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.28) 50%,transparent 70%);
    background-size:200% 100%;animation:kk-shine 3.2s infinite;
  }
  .main-btn.secondary{
    background:linear-gradient(135deg,rgba(255,213,107,.2),rgba(255,158,60,.15));
    border:1px solid rgba(255,213,107,.45);
  }
  .mb-ico{
    width:50px;height:50px;border-radius:14px;
    background:rgba(0,0,0,.32);
    display:grid;place-items:center;
    font-size:26px;flex-shrink:0;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.2);
  }
  .mb-lbl{ flex:1;min-width:0 }
  .mb-title{ font-size:16px;font-weight:900;letter-spacing:-.3px;line-height:1.1 }
  .mb-sub{ font-size:12px;opacity:.85;margin-top:4px;font-weight:600 }
  .mb-arrow{ font-size:24px;opacity:.7 }
  .mb-badge{
    position:absolute;top:10px;right:44px;
    background:linear-gradient(135deg,var(--ruby),#c43646);
    color:#fff;font-size:10px;font-weight:900;
    padding:3px 8px;border-radius:999px;letter-spacing:.5px;
    box-shadow:0 3px 8px rgba(0,0,0,.35);
  }

  .footer-nav{
    display:grid;grid-template-columns:repeat(5,1fr);gap:4px;
    margin-top:12px;padding:7px;
    background:rgba(0,0,0,.32);border-radius:20px;
    border:1px solid rgba(255,255,255,.1);
    backdrop-filter:blur(10px);
  }
  .fnav{
    background:transparent;border:none;color:#fff;
    padding:10px 3px;border-radius:14px;
    display:flex;flex-direction:column;align-items:center;gap:3px;
    font-weight:800;font-size:10.5px;opacity:.65;transition:all .18s;
  }
  .fnav .i{ font-size:19px }
  .fnav.on{
    opacity:1;
    background:linear-gradient(135deg,rgba(61,220,152,.28),rgba(15,122,84,.28));
    box-shadow:inset 0 1px 0 rgba(255,255,255,.2), 0 4px 12px rgba(0,0,0,.25);
  }
  .fnav:active{ transform:scale(.94) }

  /* =============== PROFILE =============== */
  .prof-head{
    display:flex;flex-direction:column;align-items:center;gap:8px;
    padding:4px 0 14px;position:relative;z-index:2;
  }
  .avatar{
    width:108px;height:108px;border-radius:50%;
    background:linear-gradient(135deg,var(--gold),var(--gold3));
    display:grid;place-items:center;
    font-size:52px;
    box-shadow:0 12px 28px rgba(0,0,0,.45), inset 0 2px 0 rgba(255,255,255,.55), 0 0 0 4px rgba(255,255,255,.15);
  }
  .avatar.edit-badge::after{
    content:"✏️";
    position:absolute;bottom:0;right:0;
    width:30px;height:30px;border-radius:50%;
    background:var(--g2);border:2px solid #fff;
    display:grid;place-items:center;font-size:14px;
  }
  .prof-name{
    font-size:22px;font-weight:900;margin:8px 0 2px;
  }
  .prof-rank-pill{
    font-size:11px;padding:5px 13px;border-radius:999px;
    background:linear-gradient(90deg,var(--gold),var(--gold3));
    color:#2a1500;font-weight:900;letter-spacing:.5px;
    box-shadow:0 4px 12px rgba(255,158,60,.35);
  }
  .prof-stats{
    display:grid;grid-template-columns:repeat(3,1fr);gap:10px;
    margin-bottom:10px;position:relative;z-index:2;
  }
  .stat-card{
    background:rgba(255,255,255,.1);
    border:1px solid rgba(255,255,255,.2);
    border-radius:18px;padding:14px 6px;text-align:center;
    backdrop-filter:blur(10px);
  }
  .stat-card .v{ font-size:22px;font-weight:900;line-height:1 }
  .stat-card .l{ font-size:11px;opacity:.82;margin-top:6px;font-weight:700;letter-spacing:.3px }
  .stat-card.gold .v{ color:var(--gold) }
  .stat-card.green .v{ color:var(--accent) }
  .stat-card.red .v{ color:#ff8b94 }

  .level-box{
    background:rgba(0,0,0,.3);
    border:1px solid rgba(255,255,255,.16);
    border-radius:18px;padding:14px 16px;margin-bottom:10px;
    position:relative;z-index:2;
  }
  .lv-row{
    display:flex;justify-content:space-between;align-items:center;
    font-size:13px;font-weight:800;
  }
  .lv-label{ color:var(--accent) }
  .ga-place-fab{
    position:fixed; left:50%; bottom:96px; transform:translateX(-50%) scale(.92);
    padding:16px 42px; min-width:180px; border:none; border-radius:999px;
    background:linear-gradient(135deg,#ffd56b,#ff9e3c);
    color:#3a1a00; font-weight:900; font-size:17px; letter-spacing:.08em; text-transform:uppercase;
    box-shadow:0 14px 34px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.6);
    cursor:pointer; z-index:50; opacity:0; pointer-events:none;
    transition:opacity .18s ease, transform .18s ease;
  }
  .ga-place-fab.on{ opacity:1; pointer-events:auto; transform:translateX(-50%) scale(1); }
  .ga-place-fab:active{ transform:translateX(-50%) scale(.96); }
  .lv-bar{
    height:12px;background:rgba(0,0,0,.4);
    border-radius:8px;overflow:hidden;margin-top:8px;
    box-shadow:inset 0 1px 3px rgba(0,0,0,.5);
  }
  .lv-fill{
    height:100%;
    background:linear-gradient(90deg,var(--accent),var(--g4),var(--gold));
    border-radius:8px;transition:width .6s;
    box-shadow:0 0 10px rgba(61,220,152,.5);
  }

  .prof-body{
    flex:1;overflow:auto;display:flex;flex-direction:column;gap:8px;
    padding-bottom:6px;position:relative;z-index:2;
  }
  .prof-body::-webkit-scrollbar{ width:4px }
  .prof-body::-webkit-scrollbar-thumb{ background:rgba(255,255,255,.2);border-radius:2px }

  .prof-row{
    display:flex;justify-content:space-between;align-items:center;
    background:rgba(255,255,255,.08);
    border:1px solid rgba(255,255,255,.14);
    border-radius:14px;padding:13px 16px;
    font-weight:700;font-size:14px;
  }
  .prof-row .k{ opacity:.82 }
  .prof-row .v{ font-weight:900;color:var(--gold) }

  .section-title{
    font-size:11px;font-weight:900;opacity:.72;
    margin:14px 6px 8px;letter-spacing:1.3px;text-transform:uppercase;
    position:relative;z-index:2;
  }
  .section-title.first{ margin-top:4px }

  /* =============== RANK =============== */
  .tabs{
    display:flex;background:rgba(0,0,0,.32);
    border-radius:14px;padding:4px;margin-bottom:12px;
    border:1px solid rgba(255,255,255,.1);
    position:relative;z-index:2;
  }
  .tab{
    flex:1;background:transparent;border:none;color:#fff;
    padding:10px;border-radius:10px;
    font-weight:800;font-size:13px;opacity:.65;transition:.18s;
  }
  .tab.on{
    opacity:1;
    background:linear-gradient(135deg,#22c98a,#0f7a54);
    box-shadow:0 4px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.2);
  }

  .rank-list{
    flex:1;overflow:auto;
    display:flex;flex-direction:column;gap:8px;
    position:relative;z-index:2;
  }
  .rank-list::-webkit-scrollbar{ width:4px }
  .rank-list::-webkit-scrollbar-thumb{ background:rgba(255,255,255,.2);border-radius:2px }

  .rank-row{
    display:flex;align-items:center;gap:12px;
    background:rgba(255,255,255,.09);
    border:1px solid rgba(255,255,255,.16);
    border-radius:16px;padding:12px 14px;
    transition:transform .15s;
  }
  .rank-row:active{ transform:scale(.99) }
  .rank-row.me{
    background:linear-gradient(135deg,rgba(255,213,107,.3),rgba(255,213,107,.12));
    border-color:rgba(255,213,107,.55);
    box-shadow:0 4px 16px rgba(255,213,107,.15);
  }
  .rank-pos{
    width:38px;height:38px;border-radius:12px;
    display:grid;place-items:center;
    font-weight:900;font-size:14px;
    background:rgba(0,0,0,.32);flex-shrink:0;
  }
  .rank-pos.p1{ background:linear-gradient(135deg,var(--gold),var(--gold2));color:#2a1500;font-size:19px }
  .rank-pos.p2{ background:linear-gradient(135deg,#e4e4e4,#9a9a9a);color:#2a1500;font-size:19px }
  .rank-pos.p3{ background:linear-gradient(135deg,#e89a5c,#a45a20);color:#fff;font-size:19px }
  .rank-avatar{
    width:40px;height:40px;border-radius:12px;
    background:linear-gradient(135deg,#1fb37f,#0f7a54);
    display:grid;place-items:center;
    font-size:20px;flex-shrink:0;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.2);
  }
  .rank-mid{ flex:1;min-width:0 }
  .rank-name{
    font-weight:900;font-size:14px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
  .rank-sub{
    font-size:11px;opacity:.78;margin-top:2px;font-weight:700;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
  .rank-right{
    font-weight:900;color:var(--gold);font-size:13px;
    flex-shrink:0;text-align:right;
  }
  .rank-right small{ display:block;opacity:.65;font-size:10px;margin-top:2px;color:#fff }

  .empty-note{
    text-align:center;opacity:.75;padding:30px 20px;font-weight:700;font-size:13px;
  }

  /* =============== SETTINGS =============== */
  .set-row{
    display:flex;justify-content:space-between;align-items:center;
    background:rgba(255,255,255,.08);
    border:1px solid rgba(255,255,255,.14);
    border-radius:14px;padding:12px 16px;margin-bottom:8px;
    font-weight:800;font-size:14px;position:relative;z-index:2;
  }
  .seg{
    display:flex;background:rgba(0,0,0,.4);
    border-radius:10px;overflow:hidden;
    border:1px solid rgba(255,255,255,.12);
  }
  .seg button{
    border:none;background:transparent;
    padding:7px 12px;font-weight:900;color:#9db6ab;
    font-size:12px;transition:.15s;
  }
  .seg button.on{
    background:linear-gradient(135deg,#22c98a,#0f7a54);
    color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.2);
  }

  .input-field{
    width:100%;padding:14px 16px;border-radius:14px;
    background:rgba(0,0,0,.32);
    border:1px solid rgba(255,255,255,.2);
    color:#fff;font-size:15px;font-weight:700;
    outline:none;margin-bottom:10px;
  }
  .input-field::placeholder{ color:rgba(255,255,255,.45) }
  .input-field:focus{ border-color:var(--gold) }

  .btn{
    border:none;border-radius:16px;
    padding:14px;font-size:15px;font-weight:900;
    transition:transform .12s;
  }
  .btn:active{ transform:scale(.97) }
  .btn-primary{
    background:linear-gradient(135deg,#22c98a,#0f7a54);
    color:#fff;box-shadow:0 8px 20px rgba(15,122,84,.45);
  }
  .btn-ghost{
    background:rgba(255,255,255,.12);color:#fff;
    border:1px solid rgba(255,255,255,.22);
  }
  .btn-danger{
    background:linear-gradient(135deg,#e74c3c,#a02020);
    color:#fff;box-shadow:0 8px 20px rgba(231,76,60,.35);
  }
  .btn-small{ padding:8px 14px;font-size:12px;border-radius:10px }

  /* =============== GAME =============== */
  .game-top{
    display:flex;align-items:center;gap:8px;margin-bottom:8px;
    position:relative;z-index:2;
  }
  .players{
    display:flex;align-items:center;gap:6px;flex:1;justify-content:center;
  }
  .player-pill{
    display:flex;align-items:center;gap:8px;
    padding:8px 12px;border-radius:14px;
    background:rgba(255,255,255,.1);
    border:1px solid rgba(255,255,255,.2);
    font-weight:800;font-size:12px;
    backdrop-filter:blur(8px);
    transition:all .3s;
    min-width:0;
  }
  .player-pill .pdot{
    width:14px;height:14px;border-radius:50%;
    box-shadow:0 2px 4px rgba(0,0,0,.4);
    flex-shrink:0;
  }
  .player-pill.black .pdot{ background:radial-gradient(circle at 35% 30%,#666,#000) }
  .player-pill.white .pdot{ background:radial-gradient(circle at 35% 30%,#fff,#bbb) }
  .player-pill.active{
    background:linear-gradient(135deg,rgba(255,213,107,.38),rgba(246,183,51,.2));
    border-color:var(--gold);
    animation:kk-pulse 1.8s infinite;
  }
  .player-pill .pname{
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80px;
  }
  .vs-label{ font-weight:900;opacity:.7;font-size:10px;letter-spacing:1px }

  .turn-banner{
    text-align:center;font-weight:900;font-size:13px;
    margin:4px 0 8px;opacity:.95;
    position:relative;z-index:2;
  }
  .turn-banner b{ color:var(--gold) }

  .match-info{
    display:flex;justify-content:space-between;align-items:center;
    font-size:11px;font-weight:800;opacity:.8;
    margin-bottom:6px;padding:0 4px;
    position:relative;z-index:2;
  }
  .match-info .chip{
    background:rgba(0,0,0,.3);padding:5px 10px;border-radius:999px;
    border:1px solid rgba(255,255,255,.12);
  }

  .board-wrap{
    flex:1;display:flex;align-items:center;justify-content:center;
    position:relative;z-index:2;padding:6px 0;
  }
  canvas#board{
    width:100%;max-width:440px;aspect-ratio:1/1;
    border-radius:20px;
    box-shadow:0 20px 48px rgba(0,0,0,.55), inset 0 0 0 6px #4a2806;
    touch-action:none;
    cursor:pointer;
  }

  .game-actions{
    display:grid;grid-template-columns:repeat(5,1fr);gap:6px;
    margin-top:10px;position:relative;z-index:2;
  }
  .ga{
    background:rgba(255,255,255,.1);
    border:1px solid rgba(255,255,255,.2);color:#fff;
    padding:11px 2px;border-radius:14px;
    font-weight:800;font-size:10.5px;
    display:flex;flex-direction:column;align-items:center;gap:3px;
    backdrop-filter:blur(8px);
    transition:transform .1s;
  }
  .ga:active{ transform:scale(.94) }
  .ga .i{ font-size:17px }
  .ga:disabled{ opacity:.35 }

  /* =============== MODAL =============== */
  .modal{
    position:absolute;inset:0;
    background:rgba(0,0,0,.72);
    display:none;align-items:center;justify-content:center;
    z-index:90;backdrop-filter:blur(8px);
    padding:20px;
  }
  .modal.active{ display:flex;animation:kk-fade .3s }
  .modal-card{
    background:linear-gradient(165deg,#134435,#081e17);
    border:1px solid rgba(255,255,255,.2);
    border-radius:26px;padding:26px;
    width:100%;max-width:360px;text-align:center;
    box-shadow:0 30px 70px rgba(0,0,0,.55);
    animation:kk-pop .4s cubic-bezier(.2,1.35,.4,1);
    max-height:88vh;overflow:auto;
  }
  .modal-card h2{
    margin:0 0 6px;font-size:26px;font-weight:900;
    background:linear-gradient(180deg,#fff,var(--gold));
    -webkit-background-clip:text;background-clip:text;color:transparent;
  }
  .modal-card p{
    margin:0 0 18px;color:#b8d1c5;font-size:14px;font-weight:600;
  }
  .modal-actions{ display:flex;flex-direction:column;gap:10px }
  .modal-rewards{
    display:flex;justify-content:center;gap:20px;margin:10px 0 18px;
  }
  .reward-chip{
    display:flex;align-items:center;gap:6px;
    background:rgba(255,213,107,.15);
    border:1px solid rgba(255,213,107,.4);
    padding:8px 14px;border-radius:14px;
    font-weight:900;color:var(--gold);font-size:15px;
  }
  .reward-chip.xp{
    background:rgba(156,240,196,.15);
    border-color:rgba(156,240,196,.4);
    color:var(--accent);
  }

  .toast{
    position:absolute;left:50%;bottom:90px;
    transform:translateX(-50%) translateY(20px);
    background:rgba(0,0,0,.88);
    padding:12px 22px;border-radius:14px;
    font-weight:800;font-size:13px;
    z-index:120;opacity:0;pointer-events:none;
    transition:opacity .3s, transform .3s;
    border:1px solid rgba(255,255,255,.18);
    box-shadow:0 10px 24px rgba(0,0,0,.45);
  }
  .toast.show{ opacity:1;transform:translateX(-50%) translateY(0) }

  /* =============== SHOP =============== */
  .shop-grid{
    display:grid;grid-template-columns:repeat(3,1fr);gap:10px;
    overflow:auto;padding-bottom:6px;
    position:relative;z-index:2;
  }
  .shop-grid::-webkit-scrollbar{ width:4px }
  .shop-grid::-webkit-scrollbar-thumb{ background:rgba(255,255,255,.2);border-radius:2px }
  .shop-item{
    background:rgba(255,255,255,.08);
    border:1px solid rgba(255,255,255,.18);
    border-radius:16px;padding:12px 8px;text-align:center;
    transition:transform .15s;position:relative;
  }
  .shop-item:active{ transform:scale(.96) }
  .shop-item .si-emoji{ font-size:38px;line-height:1 }
  .shop-item .si-name{ font-size:11px;font-weight:800;margin-top:6px;opacity:.9 }
  .shop-item .si-price{
    margin-top:6px;font-size:11px;font-weight:900;color:var(--gold);
    display:flex;align-items:center;justify-content:center;gap:3px;
  }
  .shop-item .si-price::before{ content:"⭐";font-size:10px }
  .shop-item.owned{ border-color:rgba(156,240,196,.5) }
  .shop-item.owned .si-price{ color:var(--accent) }
  .shop-item.equipped{
    background:linear-gradient(135deg,rgba(255,213,107,.25),rgba(255,213,107,.08));
    border-color:var(--gold);
    box-shadow:0 4px 16px rgba(255,213,107,.2);
  }
  .shop-item.locked{ opacity:.75 }

  /* =============== MISSIONS =============== */
  .mission-card{
    background:rgba(255,255,255,.08);
    border:1px solid rgba(255,255,255,.16);
    border-radius:16px;padding:14px 16px;margin-bottom:8px;
    display:flex;gap:12px;align-items:center;
  }
  .mission-icon{
    width:46px;height:46px;border-radius:14px;
    background:rgba(0,0,0,.32);
    display:grid;place-items:center;font-size:22px;
    flex-shrink:0;
  }
  .mission-main{ flex:1;min-width:0 }
  .mission-name{ font-weight:900;font-size:13px }
  .mission-desc{ font-size:11px;opacity:.78;margin-top:2px;font-weight:600 }
  .mission-bar{
    height:6px;background:rgba(0,0,0,.35);
    border-radius:4px;overflow:hidden;margin-top:6px;
  }
  .mission-fill{
    height:100%;
    background:linear-gradient(90deg,var(--accent),var(--g4));
    transition:width .4s;
  }
  .mission-right{ text-align:right;flex-shrink:0 }
  .mission-reward{
    font-weight:900;font-size:12px;color:var(--gold);
    display:flex;align-items:center;gap:3px;justify-content:flex-end;
  }
  .mission-reward::before{ content:"⭐" }
  .mission-claim{
    margin-top:4px;
    background:linear-gradient(135deg,var(--g4),var(--g2));
    color:#fff;border:none;padding:6px 12px;
    border-radius:10px;font-weight:900;font-size:11px;
  }
  .mission-claim:disabled{
    background:rgba(255,255,255,.1);color:rgba(255,255,255,.5);
  }
  .mission-claim.done{
    background:rgba(156,240,196,.15);color:var(--accent);
    border:1px solid rgba(156,240,196,.35);
  }

  /* =============== ACHIEVEMENTS =============== */
  .ach-grid{
    display:grid;grid-template-columns:repeat(2,1fr);gap:10px;
    overflow:auto;position:relative;z-index:2;padding-bottom:6px;
  }
  .ach-grid::-webkit-scrollbar{ width:4px }
  .ach-grid::-webkit-scrollbar-thumb{ background:rgba(255,255,255,.2);border-radius:2px }
  .ach-card{
    background:rgba(255,255,255,.08);
    border:1px solid rgba(255,255,255,.16);
    border-radius:16px;padding:14px 10px;text-align:center;
    position:relative;
  }
  .ach-card.done{
    background:linear-gradient(135deg,rgba(255,213,107,.22),rgba(255,213,107,.08));
    border-color:var(--gold);
  }
  .ach-card.done::after{
    content:"✓";position:absolute;top:6px;right:8px;
    width:20px;height:20px;border-radius:50%;
    background:var(--gold);color:#2a1500;
    display:grid;place-items:center;font-weight:900;font-size:12px;
  }
  .ach-card.locked{ opacity:.55;filter:grayscale(.6) }
  .ach-icon{ font-size:32px;line-height:1 }
  .ach-name{ font-weight:900;font-size:12px;margin-top:6px }
  .ach-desc{ font-size:10.5px;opacity:.78;margin-top:3px;font-weight:600;min-height:28px }
  .ach-reward{
    margin-top:6px;font-weight:900;font-size:11px;color:var(--gold);
  }

  /* =============== TUTORIAL =============== */
  .tut-body{
    flex:1;overflow:auto;position:relative;z-index:2;padding-bottom:10px;
  }
  .tut-body::-webkit-scrollbar{ width:4px }
  .tut-body::-webkit-scrollbar-thumb{ background:rgba(255,255,255,.2);border-radius:2px }
  .tut-card{
    background:rgba(255,255,255,.08);
    border:1px solid rgba(255,255,255,.16);
    border-radius:18px;padding:16px;margin-bottom:10px;
  }
  .tut-title{
    font-weight:900;font-size:15px;
    color:var(--gold);margin-bottom:6px;
    display:flex;align-items:center;gap:8px;
  }
  .tut-desc{
    font-size:13px;line-height:1.55;opacity:.9;font-weight:600;
  }

  /* =============== HISTORY =============== */
  .hist-card{
    display:flex;align-items:center;gap:12px;
    background:rgba(255,255,255,.08);
    border:1px solid rgba(255,255,255,.16);
    border-radius:14px;padding:12px 14px;margin-bottom:8px;
  }
  .hist-icon{
    width:40px;height:40px;border-radius:12px;
    display:grid;place-items:center;font-size:20px;flex-shrink:0;
  }
  .hist-icon.win{ background:linear-gradient(135deg,rgba(156,240,196,.3),rgba(31,179,127,.2));color:var(--accent) }
  .hist-icon.lose{ background:linear-gradient(135deg,rgba(255,139,148,.3),rgba(231,76,60,.2));color:#ff8b94 }
  .hist-main{ flex:1;min-width:0 }
  .hist-name{ font-weight:900;font-size:13px }
  .hist-sub{ font-size:11px;opacity:.78;margin-top:2px;font-weight:700 }
  .hist-right{ font-weight:900;font-size:11px;color:var(--gold) }

  /* =============== CONFETTI =============== */
  .confetti{
    position:absolute;top:-20px;width:8px;height:14px;
    pointer-events:none;z-index:100;
    animation:kk-confetti 2.5s ease-out forwards;
  }

  /* =============== DAILY BONUS =============== */
  .daily-card{
    background:linear-gradient(135deg,rgba(255,213,107,.2),rgba(255,158,60,.12));
    border:1px solid rgba(255,213,107,.4);
    border-radius:18px;padding:14px 16px;margin-bottom:12px;
    display:flex;align-items:center;gap:14px;
    position:relative;z-index:2;
  }
  .daily-icon{
    width:48px;height:48px;border-radius:14px;
    background:linear-gradient(135deg,var(--gold),var(--gold3));
    display:grid;place-items:center;font-size:26px;
    color:#2a1500;flex-shrink:0;
    box-shadow:0 6px 16px rgba(255,158,60,.35);
  }
  .daily-text{ flex:1;min-width:0 }
  .daily-title{ font-weight:900;font-size:14px }
  .daily-sub{ font-size:11.5px;opacity:.85;margin-top:3px;font-weight:700 }
  .daily-claim{
    background:linear-gradient(135deg,var(--gold),var(--gold3));
    color:#2a1500;border:none;padding:8px 14px;
    border-radius:12px;font-weight:900;font-size:12px;
    box-shadow:0 6px 16px rgba(255,158,60,.35);
  }
  .daily-claim:disabled{ background:rgba(255,255,255,.15);color:rgba(255,255,255,.5);box-shadow:none }

  /* =============== GENERIC =============== */
  .hidden{ display:none !important }
  .sr-only{ position:absolute;left:-9999px }
  `;

  /* ═════════════════════════════════════════════════════════════════════════
     MOUNT & HTML
     ═════════════════════════════════════════════════════════════════════════ */
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'kk-root';
  document.body.appendChild(root);

  root.innerHTML = `
  <div class="stage" id="stage">

    <!-- ========== HOME ========== -->
    <section class="screen active" id="sc-home">
      <div class="topbar">
        <div class="brand">
          <div class="brand-logo">五</div>
          <div class="brand-name">FA Omok<small>Premium Edition</small></div>
        </div>
        <div class="topbar-right">
          <span class="lvl-pill" id="hm-lvl">LV 1</span>
          <span class="star-pill" id="hm-stars">0</span>
        </div>
      </div>

      <div class="daily-card hidden" id="daily-card">
        <div class="daily-icon">🎁</div>
        <div class="daily-text">
          <div class="daily-title">Daily check-in reward</div>
          <div class="daily-sub">+${DAILY_BONUS_STAR}⭐  +${DAILY_BONUS_XP}XP</div>
        </div>
        <button class="daily-claim" id="daily-claim-btn">Claim</button>
      </div>

      <div class="hero">
        <div class="hero-board">
          <div class="hero-stone hs-b" style="left:36%;top:40%"></div>
          <div class="hero-stone hs-w" style="left:50%;top:44%"></div>
          <div class="hero-stone hs-b" style="left:46%;top:52%"></div>
          <div class="hero-stone hs-w" style="left:58%;top:38%"></div>
          <div class="hero-stone hs-b" style="left:54%;top:60%"></div>
          <div class="hero-stone hs-w" style="left:40%;top:56%"></div>
          <div class="hero-stone hs-b" style="left:62%;top:54%"></div>
        </div>
        <h1 class="hero-title">Omok</h1>
        <p class="hero-sub">FIVE · IN · A · ROW</p>
      </div>

      <div class="menu">
        <button class="main-btn primary" data-action="play-ai">
          <div class="mb-ico">🤖</div>
          <div class="mb-lbl">
            <div class="mb-title" data-i18n="ai_match">AI Match</div>
            <div class="mb-sub" id="ai-sub-label">Difficulty · Normal</div>
          </div>
          <div class="mb-arrow">›</div>
        </button>
        <button class="main-btn secondary" data-action="play-pvp">
          <div class="mb-ico">👥</div>
          <div class="mb-lbl">
            <div class="mb-title" data-i18n="friend_match">Play vs Friend</div>
            <div class="mb-sub" data-i18n="friend_match_sub">Alternate turns on one device</div>
          </div>
          <div class="mb-arrow">›</div>
        </button>
        <div class="footer-nav">
          <button class="fnav on" data-nav="home"><span class="i">🏠</span><span data-i18n="nav_home">Home</span></button>
          <button class="fnav" data-nav="rank"><span class="i">🏆</span><span data-i18n="nav_rank">Ranking</span></button>
          <button class="fnav" data-nav="shop"><span class="i">🛍️</span><span data-i18n="nav_shop">Shop</span></button>
          <button class="fnav" data-nav="mission"><span class="i">📋</span><span data-i18n="nav_mission">Mission</span></button>
          <button class="fnav" data-nav="profile"><span class="i">👤</span><span data-i18n="nav_profile">Profile</span></button>
        </div>
      </div>
    </section>

    <!-- ========== PROFILE ========== -->
    <section class="screen" id="sc-profile">
      <div class="topbar">
        <button class="icon-btn" data-back>←</button>
        <div class="brand-name" style="text-align:center;flex:1" id="prof-title" data-i18n="profile">Profile</div>
        <button class="icon-btn" id="btn-prof-settings" title="Settings">⚙️</button>
        <button class="icon-btn" id="btn-edit-name" title="Change nickname">✏️</button>
      </div>
      <div class="prof-head">
        <div class="avatar" id="prof-avatar">🐻</div>
        <div class="prof-name" id="prof-name">Player</div>
        <div class="prof-rank-pill" id="prof-rank-pill">LEVEL 1</div>
      </div>
      <div class="prof-stats">
        <div class="stat-card gold"><div class="v" id="ps-stars">0</div><div class="l">⭐ Stars</div></div>
        <div class="stat-card green"><div class="v" id="ps-wins">0</div><div class="l">🏆 Win</div></div>
        <div class="stat-card"><div class="v" id="ps-rate">0%</div><div class="l">📈 Win Rate</div></div>
      </div>
      <div class="level-box">
        <div class="lv-row">
          <span class="lv-label" id="lv-label">LV 1</span>
          <span id="lv-xp">0 / 100 XP</span>
        </div>
        <div class="lv-bar"><div class="lv-fill" id="lv-fill" style="width:0%"></div></div>
      </div>
      <div class="section-title">DETAILS</div>
      <div class="prof-body" id="prof-body"></div>
    </section>

    <!-- ========== RANK ========== -->
    <section class="screen" id="sc-rank">
      <div class="topbar">
        <button class="icon-btn" data-back>←</button>
        <div class="brand-name" style="text-align:center;flex:1"><span data-i18n="ranking_title">🏆 Ranking</span></div>
        <button class="icon-btn" id="btn-rank-refresh" title="Refresh">🔄</button>
      </div>
      <div class="tabs">
        <button class="tab on" data-tab="total">Total Rank</button>
        <button class="tab" data-tab="weekly">Weekly TOP 7</button>
        <button class="tab" data-tab="prev">Last Week TOP 7</button>
        <button class="tab" data-tab="hard">Hard King</button>
      </div>
      <div id="rank-reset-info" style="text-align:center;font-size:11px;color:rgba(255,255,255,.78);margin:4px 0 6px;font-weight:700"></div>
      <div class="rank-list" id="rank-list"></div>
    </section>

    <!-- ========== SHOP ========== -->
    <section class="screen" id="sc-shop">
      <div class="topbar">
        <button class="icon-btn" data-back>←</button>
        <div class="brand-name" style="text-align:center;flex:1"><span data-i18n="shop_title">🛍️ Shop</span></div>
        <span class="star-pill" id="shop-stars">0</span>
      </div>
      <div class="tabs">
        <button class="tab on" data-shop-tab="avatar">Avatar</button>
        <button class="tab" data-shop-tab="board">Board</button>
        <button class="tab" data-shop-tab="stone">Stone</button>
      </div>
      <div class="shop-grid" id="shop-grid"></div>
    </section>

    <!-- ========== MISSION ========== -->
    <section class="screen" id="sc-mission">
      <div class="topbar">
        <button class="icon-btn" data-back>←</button>
        <div class="brand-name" style="text-align:center;flex:1"><span data-i18n="mission_title">📋 Missions & Achievements</span></div>
        <div style="width:42px"></div>
      </div>
      <div class="tabs">
        <button class="tab on" data-mtab="daily">Daily Missions</button>
        <button class="tab" data-mtab="ach">Achievement</button>
        <button class="tab" data-mtab="hist">History</button>
      </div>
      <div class="rank-list" id="mission-list"></div>
    </section>

    <!-- ========== SETTINGS ========== -->
    <section class="screen" id="sc-settings">
      <div class="topbar">
        <button class="icon-btn" data-back>←</button>
        <div class="brand-name" style="text-align:center;flex:1"><span data-i18n="settings_title">⚙️ Settings</span></div>
        <button class="icon-btn" id="btn-how" title="How to Play">❓</button>
      </div>
      <div class="section-title first">Game</div>
      <div class="set-row">
        AI Difficulty
        <div class="seg" id="seg-diff">
          <button data-d="1">Easy</button>
          <button data-d="2" class="on">Normal</button>
          <button data-d="3">Hard</button>
        </div>
      </div>
      <div class="set-row">
        Sound
        <div class="seg" id="seg-snd">
          <button data-s="1" class="on">On</button>
          <button data-s="0">Off</button>
        </div>
      </div>
      <div class="set-row">
        Show last move
        <div class="seg" id="seg-mark">
          <button data-m="1" class="on">On</button>
          <button data-m="0">Off</button>
        </div>
      </div>
      <div class="set-row">
        Show coordinates
        <div class="seg" id="seg-coord">
          <button data-c="1">On</button>
          <button data-c="0" class="on">Off</button>
        </div>
      </div>
      <div class="set-row">
        Vibration
        <div class="seg" id="seg-vib">
          <button data-v="1" class="on">On</button>
          <button data-v="0">Off</button>
        </div>
      </div>
      <div class="section-title">Screen</div>
      <div class="set-row">
        Fullscreen
        <button class="btn btn-ghost btn-small" id="btn-fs-set">Toggle</button>
      </div>
      <div class="set-row">
        Language
        <div class="seg" id="seg-lang">
          <button data-lang="en" class="on">EN</button>
          <button data-lang="ko">KO</button>
          <button data-lang="ja">JA</button>
          <button data-lang="zh">ZH</button>
        </div>
      </div>
      <div class="section-title">Data</div>
      <div class="set-row">
        <span>Reset Stats & Ranking</span>
        <button class="btn btn-danger btn-small" id="btn-reset">Reset</button>
      </div>
      <div class="set-row">
        <span>Version</span>
        <span style="opacity:.7;font-weight:700">v2.0.0</span>
      </div>
    </section>

    <!-- ========== HOW TO PLAY ========== -->
    <section class="screen" id="sc-how">
      <div class="topbar">
        <button class="icon-btn" data-back>←</button>
        <div class="brand-name" style="text-align:center;flex:1">📖 How to Play</div>
        <div style="width:42px"></div>
      </div>
      <div class="tut-body">
        <div class="tut-card">
          <div class="tut-title">🎯 Goal</div>
          <div class="tut-desc">15×15 Place your stones on the board and line them up horizontally, vertically, or diagonally <b>5 stones in a row first</b> in a row to win.</div>
        </div>
        <div class="tut-card">
          <div class="tut-title">⚫ Black first</div>
          <div class="tut-desc">The player always  <b>Black</b> goes first. Players alternate one move at a time, and occupied cells cannot be re-played..</div>
        </div>
        <div class="tut-card">
          <div class="tut-title">💡 Hint</div>
          <div class="tut-desc">Tap the hint button and the AI will briefly show its recommended next move as a green circle..</div>
        </div>
        <div class="tut-card">
          <div class="tut-title">↩️ Undo</div>
          <div class="tut-desc">You can undo your last move. In AI mode, both your move and the AI move are undone together..</div>
        </div>
        <div class="tut-card">
          <div class="tut-title">⭐ Reward</div>
          <div class="tut-desc">Each win awards stars and XP based on difficulty. Use stars to buy avatars, boards, and stones in the shop..</div>
        </div>
        <div class="tut-card">
          <div class="tut-title">🏆 Ranking</div>
          <div class="tut-desc">Total ranking, weekly ranking, and hard-difficulty win ranking are tracked separately. The weekly ranking resets every Sunday at midnight..</div>
        </div>
      </div>
    </section>

    <!-- ========== GAME ========== -->
    <section class="screen" id="sc-game">
      <div class="topbar">
        <button class="icon-btn" data-back>←</button>
        <div class="players">
          <div class="player-pill black active" id="pill-b">
            <span class="pdot"></span>
            <span class="pname" id="name-b">Player</span>
          </div>
          <div class="vs-label">VS</div>
          <div class="player-pill white" id="pill-w">
            <span class="pdot"></span>
            <span class="pname" id="name-w">AI</span>
          </div>
        </div>
        <div class="icon-btn" style="visibility:hidden"></div>
      </div>
      <div class="turn-banner" id="turn-banner">● <b>Black</b> Turn</div>
      <div class="match-info">
        <div class="chip" id="mi-mode">AI · Normal</div>
        <div class="chip" id="mi-moves">0Move</div>
        <div class="chip" id="mi-timer">00:00</div>
      </div>
      <div class="board-wrap"><canvas id="board" width="900" height="900"></canvas></div>
      <div class="game-actions">
        <button class="ga" id="ga-hint"><span class="i">💡</span><span data-i18n="hint">Hint</span></button>
        <button class="ga" id="ga-resign" style="background:linear-gradient(135deg,#ff5a6a,#c92a3c);color:#fff;font-weight:900;"><span class="i">🏳️</span><span data-i18n="resign">Resign</span></button>
      </div>
      <button id="ga-place" class="ga-place-fab"><span data-i18n="place">Place</span></button>
    </section>

    <!-- ========== MODALS ========== -->
    <div class="modal" id="modal-result">
      <div class="modal-card">
        <h2 id="mr-title">🏆 Win!</h2>
        <p id="mr-desc">AI defeated</p>
        <div class="modal-rewards" id="mr-rewards">
          <div class="reward-chip" id="mr-stars">+0</div>
          <div class="reward-chip xp hidden" id="mr-xp">+0 XP</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" id="mr-home">Home</button>
        </div>
      </div>
    </div>

    <div class="modal" id="modal-confirm">
      <div class="modal-card">
        <h2 id="mc-title">Are you sure?</h2>
        <p id="mc-desc">Please confirm</p>
        <div class="modal-actions">
          <button class="btn btn-primary" id="mc-ok">OK</button>
          <button class="btn btn-ghost" id="mc-cancel">Cancel</button>
        </div>
      </div>
    </div>

    <div class="toast" id="toast"></div>
  </div>
  `;

  /* ═════════════════════════════════════════════════════════════════════════
     DOM HELPERS
     ═════════════════════════════════════════════════════════════════════════ */
  const $ = sel => root.querySelector(sel);
  const $$ = sel => Array.from(root.querySelectorAll(sel));
  const show = (id) => {
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = $('#' + id);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
  };
  // Simple modal confirm wrapping #modal-confirm
  function openConfirm(title, desc, onOk) {
    const m = $('#modal-confirm');
    if (!m) { if (window.confirm(title + '\n' + desc)) onOk && onOk(); return; }
    $('#mc-title').textContent = title;
    $('#mc-desc').textContent = desc;
    m.classList.add('active');
    const ok = $('#mc-ok'), cancel = $('#mc-cancel');
    const cleanup = () => {
      m.classList.remove('active');
      ok.removeEventListener('click', okH);
      cancel.removeEventListener('click', caH);
    };
    const okH = () => { cleanup(); try { onOk && onOk(); } catch {} };
    const caH = () => { cleanup(); };
    ok.addEventListener('click', okH);
    cancel.addEventListener('click', caH);
  }

  // i18n translation map
  const I18N = {
    en: { place:'Place', undo:'Undo', hint:'Hint', retry:'Retry', settings:'Settings', home:'Home', resign:'Resign',
          concede_title:'Resign?', concede_desc:'Leaving now will count as a loss.',
          profile:'Profile', rank:'Rank', shop:'Shop', mission:'Mission', how:'How to Play',
          ai_easy:'Easy', ai_normal:'Normal', ai_hard:'Hard', friend:'Friend', play_ai:'Play vs AI',
          total_rank:'Total Rank', weekly_top:'Weekly TOP', last_week:'Last Week', hard_king:'Hard King',
          ai_match:'AI Match', friend_match:'Play vs Friend', friend_match_sub:'Alternate turns on one device',
          nav_home:'Home', nav_rank:'Ranking', nav_shop:'Shop', nav_mission:'Mission', nav_profile:'Profile',
          ranking_title:'🏆 Ranking', shop_title:'🛍️ Shop', mission_title:'📋 Missions & Achievements', settings_title:'⚙️ Settings',
          ready:'READY', ready_sent:'✓ Ready (waiting host)', start:'▶ START', waiting_ready:'Waiting…',
          press_ready:'Press READY when you are set', waiting_host_start:'Waiting for host to start…',
          guest_ready:'Opponent is ready! Start the match?', waiting_guest_ready:'Waiting for opponent to ready up…',
          cancel_room:'Cancel room', leave_room:'Leave room', waiting:'Waiting…', wager:'wager', room:'Room' },
    ko: { place:'착수', undo:'무르기', hint:'힌트', retry:'다시', settings:'설정', home:'홈', resign:'기권',
          concede_title:'기권하시겠습니까?', concede_desc:'지금 나가면 패배로 기록됩니다.',
          profile:'프로필', rank:'랭킹', shop:'상점', mission:'미션', how:'플레이 방법',
          ai_easy:'쉬움', ai_normal:'보통', ai_hard:'어려움', friend:'친구', play_ai:'AI 대전',
          total_rank:'누적 랭킹', weekly_top:'주간 TOP', last_week:'지난 주', hard_king:'하드 킹',
          ai_match:'AI 대전', friend_match:'친구와 대전', friend_match_sub:'한 기기에서 번갈아 플레이',
          nav_home:'홈', nav_rank:'랭킹', nav_shop:'상점', nav_mission:'미션', nav_profile:'프로필',
          ranking_title:'🏆 랭킹', shop_title:'🛍️ 상점', mission_title:'📋 미션 & 업적', settings_title:'⚙️ 설정',
          ready:'레디', ready_sent:'✓ 레디 완료 (호스트 대기)', start:'▶ 시작', waiting_ready:'대기 중…',
          press_ready:'준비되면 레디를 누르세요', waiting_host_start:'호스트의 시작을 기다리는 중…',
          guest_ready:'상대가 준비됐습니다! 시작할까요?', waiting_guest_ready:'상대의 레디를 기다리는 중…',
          cancel_room:'방 취소', leave_room:'방 나가기', waiting:'대기 중…', wager:'베팅', room:'방' },
    ja: { place:'着手', undo:'待った', hint:'ヒント', retry:'再戦', settings:'設定', home:'ホーム', resign:'投了',
          concede_title:'投了しますか?', concede_desc:'退出すると敗北として記録されます。',
          profile:'プロフィール', rank:'ランキング', shop:'ショップ', mission:'ミッション', how:'遊び方',
          ai_easy:'やさしい', ai_normal:'ふつう', ai_hard:'むずかしい', friend:'フレンド', play_ai:'AI対戦',
          total_rank:'累計ランキング', weekly_top:'週間TOP', last_week:'先週', hard_king:'ハード王',
          ai_match:'AI対戦', friend_match:'フレンド対戦', friend_match_sub:'一台の端末で交代で対局',
          nav_home:'ホーム', nav_rank:'ランキング', nav_shop:'ショップ', nav_mission:'ミッション', nav_profile:'プロフィール',
          ranking_title:'🏆 ランキング', shop_title:'🛍️ ショップ', mission_title:'📋 ミッション & アチーブメント', settings_title:'⚙️ 設定',
          ready:'準備完了', ready_sent:'✓ 準備OK (ホスト待ち)', start:'▶ 開始', waiting_ready:'待機中…',
          press_ready:'準備できたら押してください', waiting_host_start:'ホストの開始を待っています…',
          guest_ready:'対戦相手の準備ができました!開始しますか?', waiting_guest_ready:'相手の準備を待っています…',
          cancel_room:'部屋をキャンセル', leave_room:'部屋を出る', waiting:'待機中…', wager:'掛け金', room:'ルーム' },
    zh: { place:'落子', undo:'悔棋', hint:'提示', retry:'重来', settings:'设置', home:'主页', resign:'认输',
          concede_title:'要投降吗?', concede_desc:'现在退出将记为失败。',
          profile:'个人资料', rank:'排行榜', shop:'商店', mission:'任务', how:'玩法',
          ai_easy:'简单', ai_normal:'普通', ai_hard:'困难', friend:'好友', play_ai:'对战AI',
          total_rank:'累计排行', weekly_top:'周TOP', last_week:'上周', hard_king:'困难王',
          ai_match:'AI对战', friend_match:'好友对战', friend_match_sub:'在同一设备交替落子',
          nav_home:'主页', nav_rank:'排行榜', nav_shop:'商店', nav_mission:'任务', nav_profile:'资料',
          ranking_title:'🏆 排行榜', shop_title:'🛍️ 商店', mission_title:'📋 任务 & 成就', settings_title:'⚙️ 设置',
          ready:'准备', ready_sent:'✓ 已准备 (等待房主)', start:'▶ 开始', waiting_ready:'等待中…',
          press_ready:'准备好请按下', waiting_host_start:'等待房主开始…',
          guest_ready:'对手已准备好!开始对局?', waiting_guest_ready:'等待对手准备…',
          cancel_room:'取消房间', leave_room:'离开房间', waiting:'等待中…', wager:'下注', room:'房间' },
  };
  function tr(key) {
    const lang = (settings && settings.language) || 'en';
    const table = I18N[lang] || I18N.en;
    return table[key] || I18N.en[key] || key;
  }
  function applyI18n() {
    try {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n'); if (k) el.textContent = tr(k);
      });
    } catch {}
  }

  const toast = (msg, ms = 1800) => {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), ms);
  };

  function popupAlert(title, message) {
    const existing = document.getElementById('fa-popup-alert');
    if (existing) existing.remove();
    const dlg = document.createElement('div');
    dlg.id = 'fa-popup-alert';
    dlg.style.cssText = 'position:fixed;inset:0;background:rgba(3,20,14,.88);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(10px);animation:kk-fade .25s ease;';
    dlg.innerHTML =
      '<div style="background:linear-gradient(160deg,#1a1f3a,#0b4f3a);border-radius:24px;padding:28px 24px;width:min(88vw,340px);box-shadow:0 30px 80px rgba(0,0,0,.7);border:1px solid rgba(255,214,107,.4);color:#fff;text-align:center;">'
      + '  <div style="font-size:40px;margin-bottom:8px;">⚠️</div>'
      + '  <div style="font-size:19px;font-weight:900;margin-bottom:8px;color:#ffd56b;">' + escapeHtml(title || 'Notice') + '</div>'
      + '  <div style="font-size:13.5px;color:rgba(255,255,255,.9);margin-bottom:20px;line-height:1.5;">' + escapeHtml(message || '') + '</div>'
      + '  <button id="fa-popup-ok" style="width:100%;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#ffd56b,#ff9e3c);color:#3a1a00;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.3);">OK</button>'
      + '</div>';
    document.body.appendChild(dlg);
    const close = () => { try { dlg.remove(); } catch {} };
    dlg.querySelector('#fa-popup-ok').addEventListener('click', close);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
    try { beep(440, 0.12, 'square', 0.22); } catch {}
  }

  function speakWord(word) {
    try {
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(word);
        u.rate = 1.05; u.pitch = 1.0; u.volume = 1.0; u.lang = 'en-US';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    } catch {}
  }

  function runStartCountdown(onDone) {
    const overlay = document.createElement('div');
    overlay.id = 'fa-countdown';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(3,20,14,.55);display:flex;align-items:center;justify-content:center;z-index:9998;backdrop-filter:blur(4px);pointer-events:none;';
    overlay.innerHTML = '<div id="fa-cd-num" style="font-size:140px;font-weight:900;color:#ffd56b;text-shadow:0 8px 30px rgba(0,0,0,.6),0 0 40px rgba(255,214,107,.5);animation:kk-pop .35s ease;"></div>';
    document.body.appendChild(overlay);
    const numEl = overlay.querySelector('#fa-cd-num');
    const seq = [
      { t: 'THREE', d: '3', f: 523 },
      { t: 'TWO',   d: '2', f: 659 },
      { t: 'ONE',   d: '1', f: 784 },
      { t: 'GAME START', d: 'GO!', f: 1046 }
    ];
    let i = 0;
    const step = () => {
      if (i >= seq.length) {
        try { overlay.remove(); } catch {}
        if (typeof onDone === 'function') onDone();
        return;
      }
      const s = seq[i++];
      numEl.textContent = s.d;
      numEl.style.animation = 'none';
      void numEl.offsetWidth;
      numEl.style.animation = 'kk-pop .35s ease';
      if (s.d === 'GO!') { numEl.style.fontSize = '72px'; numEl.style.color = '#3ddc98'; }
      try { beep(s.f, 0.18, 'square', 0.28); } catch {}
      speakWord(s.t);
      setTimeout(step, 900);
    };
    step();
  }

  /* ═════════════════════════════════════════════════════════════════════════
     PERSISTENCE
     ═════════════════════════════════════════════════════════════════════════ */
  const storeLoad = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const storeSave = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} };
  const storeDel = key => { try { localStorage.removeItem(key); } catch {} };

  /* ═════════════════════════════════════════════════════════════════════════
     TIME & WEEK
     ═════════════════════════════════════════════════════════════════════════ */
  // Weekly season rolls over every Saturday at 12:00 local time.
  // Each week starts Sat 12:00 and ends the following Sat 12:00.
  const nextWeeklyReset = (d = new Date()) => {
    // Next Saturday 12:00:00 local time (weekly anchor)
    const t = new Date(d.getTime());
    const day = t.getDay(); // 0=Sun..6=Sat
    const next = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12, 0, 0, 0);
    let add = (6 - day + 7) % 7;
    if (add === 0 && t.getTime() >= next.getTime()) add = 7;
    next.setDate(next.getDate() + add);
    return next;
  };
  const formatResetMsg = (d = new Date()) => {
    const n = nextWeeklyReset(d);
    const pad = x => String(x).padStart(2, '0');
    return 'Weekly reset · ' + (n.getMonth() + 1) + '/' + n.getDate() + ' (Sat) ' + pad(n.getHours()) + ':' + pad(n.getMinutes());
  };
  const weekKey = (d = new Date()) => {
    const t = new Date(d.getTime());
    // Shift time back so that Sat 12:00 becomes the start-of-week anchor.
    // A "week number" = floor((t - anchor) / 7 days) where anchor = first Sat 12:00 of a fixed epoch.
    const anchor = new Date(2024, 0, 6, 12, 0, 0).getTime(); // Jan 6 2024 was a Saturday at noon
    const diff = t.getTime() - anchor;
    const wk = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
    return 'WK' + wk;
  };
  const dayKey = (d = new Date()) => {
    const pad = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };

  /* ═════════════════════════════════════════════════════════════════════════
     LEVEL SYSTEM
     ═════════════════════════════════════════════════════════════════════════ */
  // Level derived from AI wins: 10 wins = +1 level. Capped at 100.
  function levelFromXp(_xp) {
    const wins = (profile && (profile.aiWins | 0)) || 0;
    const lv = Math.min(300, Math.floor(wins / 10) + 1);
    const cur = wins - (lv - 1) * 10;
    const need = 10;
    return { lv, cur, need };
  }
  function aiWinsFor(p) { return (p && (p.aiWins | 0)) || 0; }

  /* ═════════════════════════════════════════════════════════════════════════
     PROFILE & STATE
     ═════════════════════════════════════════════════════════════════════════ */
  function genUserId() {
    return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }
  function defaultProfile() {
    return {
      id: genUserId(),
      nickname: 'Player' + Math.floor(Math.random() * 900 + 100),
      avatar: 'avatar_bear',
      stars: 10000,
      xp: 0,
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      bestStreak: 0,
      currentStreak: 0,
      hardWins: 0,
      normalWins: 0,
      easyWins: 0,
      weeklyKey: weekKey(),
      weeklyWins: 0,
      weeklyGames: 0,
      createdAt: Date.now(),
    };
  }

  function defaultSettings() {
    return {
      difficulty: AI_NORMAL,
      language: 'en',
      sound: true,
      showMark: true,
      showCoord: false,
      vibrate: true,
      equippedAvatar: 'avatar_bear',
      equippedBoard: 'board_classic',
      equippedStone: 'stone_classic',
    };
  }

  function defaultShop() {
    return {
      owned: ['avatar_bear', 'board_classic', 'stone_classic'],
    };
  }

  let profile  = storeLoad(STORE_KEY) || defaultProfile();
  if (!profile.id) profile.id = genUserId();
  // Bootstrap: every connected user starts with at least 10,000 stars
  if ((profile.stars | 0) < 10000) profile.stars = 10000;
  // Force English-only default nickname: any non-ASCII auto-nick becomes "Player###"
  if (!profile.nickname || !/^[\x20-\x7E]+$/.test(String(profile.nickname))) {
    profile.nickname = 'Player' + Math.floor(Math.random() * 900 + 100);
  }
  // Migrate AI wins - for existing players, seed from historical wins (easy+normal+hard)
  if (typeof profile.aiWins !== 'number') {
    profile.aiWins = ((profile.easyWins | 0) + (profile.normalWins | 0) + (profile.hardWins | 0));
    if (!profile.aiWins && profile.totalWins) profile.aiWins = profile.totalWins | 0;
  }
  let settings = Object.assign(defaultSettings(), storeLoad(SETTINGS_KEY) || {});
  let history  = storeLoad(HISTORY_KEY) || [];
  let missionState = storeLoad(MISSIONS_KEY) || { dayKey: dayKey(), missions: {}, claimed: {} };
  let achieveState = storeLoad(ACHIEVE_KEY) || { unlocked: {} };
  let shopState = Object.assign(defaultShop(), storeLoad(SHOP_KEY) || {});
  let dailyState = storeLoad(DAILY_KEY) || { lastClaim: null };

  function checkWeeklyRollover() {
    if (profile.weeklyKey !== weekKey()) {
      profile.prevWeekTotalWins   = profile.totalWins   | 0;
      profile.prevWeekTotalLosses = profile.totalLosses | 0;
      profile.prevWeekTotalGames  = profile.totalGames  | 0;
      profile.prevWeekKey = profile.weeklyKey || '';
      profile.weeklyKey = weekKey();
      profile.weeklyWins = 0;
      profile.weeklyGames = 0;
      try { persist(); } catch {}
      return true;
    }
    return false;
  }
  checkWeeklyRollover();
  setInterval(() => {
    if (checkWeeklyRollover()) {
      try { renderRanks(); syncHome(); } catch {}
    }
    const info = document.getElementById('rank-reset-info');
    if (info) info.textContent = formatResetMsg();
  }, 30000);
  if (typeof profile.prevWeekTotalWins !== 'number') profile.prevWeekTotalWins = 0;
  // rollover daily missions
  if (missionState.dayKey !== dayKey()) {
    missionState = { dayKey: dayKey(), missions: {}, claimed: {} };
  }

  function persist() {
    storeSave(STORE_KEY, profile);
    storeSave(SETTINGS_KEY, settings);
    storeSave(HISTORY_KEY, history.slice(0, 100));
    storeSave(MISSIONS_KEY, missionState);
    storeSave(ACHIEVE_KEY, achieveState);
    storeSave(SHOP_KEY, shopState);
    storeSave(DAILY_KEY, dailyState);
    upsertRank();
  }

  /* ═════════════════════════════════════════════════════════════════════════
     RANK TABLE (local with seeded bots)
     ═════════════════════════════════════════════════════════════════════════ */
  function loadRanks() { return storeLoad(RANK_KEY) || []; }
  function saveRanks(arr) { storeSave(RANK_KEY, arr); }

  function seedBotsIfNeeded() {
    const ranks = loadRanks();
    if (ranks.some(r => r.id && r.id.startsWith('bot'))) return ranks;
    const wk = weekKey();
    BOT_NAMES.forEach((n, i) => {
      const rarity = Math.random();
      const base = rarity > 0.85 ? 150 : rarity > 0.5 ? 80 : 30;
      const w = base + Math.floor(Math.random() * 60);
      const l = Math.floor(w * (0.3 + Math.random() * 0.5));
      const hardW = Math.floor(w * (0.1 + Math.random() * 0.3));
      const ww = Math.floor(Math.random() * 25);
      const avatarPool = ['🐯','🦊','🐱','🐶','🐼','🐨','🐰','🐺','🦁','🐲','🦄','👑'];
      ranks.push({
        id: 'bot' + i,
        nickname: n,
        avatar: avatarPool[i % avatarPool.length],
        totalWins: w,
        totalLosses: l,
        totalGames: w + l,
        hardWins: hardW,
        bestStreak: 3 + Math.floor(Math.random() * 10),
        weeklyKey: wk,
        weeklyWins: ww,
      });
    });
    saveRanks(ranks);
    return ranks;
  }

  function upsertRank() {
    const ranks = loadRanks();
    const avatarItem = SHOP_ITEMS.find(i => i.id === (settings.equippedAvatar || 'avatar_bear'));
    const mine = {
      id: 'me',
      nickname: profile.nickname,
      avatar: (avatarItem && avatarItem.emoji) || '🐻',
      totalWins: profile.totalWins,
      totalLosses: profile.totalLosses,
      totalGames: profile.totalGames,
      hardWins: profile.hardWins,
      bestStreak: profile.bestStreak,
      weeklyKey: profile.weeklyKey,
      weeklyWins: profile.weeklyWins,
    };
    const idx = ranks.findIndex(r => r.id === 'me');
    if (idx >= 0) ranks[idx] = mine; else ranks.push(mine);
    saveRanks(ranks);
  }

  /* ═════════════════════════════════════════════════════════════════════════
     AUDIO
     ═════════════════════════════════════════════════════════════════════════ */
  let audioCtx;
  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { audioCtx = null; }
    }
    return audioCtx;
  }
  function beep(freq = 500, dur = 0.08, type = 'sine', gain = 0.1) {
    if (!settings.sound) return;
    const ac = ensureAudio();
    if (!ac) return;
    try {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + dur + 0.02);
    } catch {}
  }
  function playPlaceBlack() { beep(540, 0.06, 'sine', 0.1); }
  function playPlaceWhite() { beep(440, 0.06, 'sine', 0.1); }
  function playWin() {
    if (!settings.sound) return;
    const ac = ensureAudio(); if (!ac) return;
    [880, 1100, 1320, 1760].forEach((f, i) => {
      setTimeout(() => beep(f, 0.18, 'sine', 0.13), i * 90);
    });
  }
  function playLose() {
    [440, 330, 220].forEach((f, i) => {
      setTimeout(() => beep(f, 0.22, 'sawtooth', 0.08), i * 120);
    });
  }
  function playTap() { beep(780, 0.05, 'square', 0.22); }
  function playStone() { beep(440, 0.06, 'triangle', 0.22); setTimeout(()=>beep(660,0.05,'sine',0.18),30); }
  function playCoin() { beep(1040, 0.08, 'sine', 0.12); setTimeout(() => beep(1380, 0.1, 'sine', 0.1), 70); }

  function vibrate(ms) {
    if (!settings.vibrate) return;
    try { navigator.vibrate && navigator.vibrate(ms); } catch {}
  }

  /* ═════════════════════════════════════════════════════════════════════════
     CONFETTI
     ═════════════════════════════════════════════════════════════════════════ */
  function confettiBurst(n = 60) {
    const stage = $('#stage');
    if (!stage) return;
    const colors = ['#ffd56b', '#ff9e3c', '#9cf0c4', '#1fb37f', '#5aa9ff', '#ff8b94'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = (Math.random() * 100) + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = (Math.random() * 0.4) + 's';
      c.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      stage.appendChild(c);
      setTimeout(() => c.remove(), 3500);
    }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     GAME STATE
     ═════════════════════════════════════════════════════════════════════════ */
  const game = {
    board: null,
    current: HUMAN,
    history: [],
    gameOver: false,
    hintCell: null,
    mode: MODE_AI,
    startedAt: 0,
    timerHandle: null,
    winLine: null,
  };

  function createBoard() {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
  }

  function newGame() {
    game.board = createBoard();
    game.current = HUMAN;
    game.history = [];
    game.gameOver = true; // block input during countdown
    game.hintCell = null;
    game.hintUsed = 0;
    game.pendingCell = null;
    try { togglePlaceFab(false); } catch {}
    game.winLine = null;
    if (game.timerHandle) clearInterval(game.timerHandle);
    updateTurnDisplay();
    updateMatchInfo();
    draw();
    runStartCountdown(() => {
      game.gameOver = false;
      game._timedOut = false;
      game.moveDeadline = Date.now() + 60000;
      game.startedAt = Date.now();
      game._lastTick = -1;
      game.timerHandle = setInterval(updateTimer, 500);
      updateTurnDisplay();
      updateMatchInfo();
      draw();
      if (game.mode === MODE_AI && game.current === AI_PLAYER) {
        setTimeout(aiMove, 420);
      }
    });
  }

  function updateTimer() {
    if (game.gameOver) return;
    const el = $('#mi-timer');
    if (!el) return;
    // Per-move 60s countdown.  In PvP, only the side whose turn it is counts.
    const myTurn = (game.mode === MODE_AI)
      ? (game.current === HUMAN)
      : (game.mode === MODE_PVP && Online.inRoom()
          ? (game.current === (Online.mySide() === 1 ? HUMAN : AI_PLAYER))
          : true);
    if (!game.moveDeadline) game.moveDeadline = Date.now() + 60000;
    const remain = Math.max(0, Math.ceil((game.moveDeadline - Date.now()) / 1000));
    el.textContent = '⏱ ' + String(remain).padStart(2, '0') + 's';
    if (myTurn && remain <= 10 && remain > 0 && remain !== game._lastTick) {
      try { beep(880, 0.08, 'square', 0.18); } catch {}
    }
    game._lastTick = remain;
    if (myTurn && remain === 0 && !game._timedOut) {
      game._timedOut = true;
      // Timeout ⇒ I lose
      if (game.mode === MODE_PVP) {
        try { Online.resign(); } catch {}
      } else {
        game.gameOver = true;
        endGame(AI_PLAYER);
      }
    }
  }

  function updateMatchInfo() {
    const modeEl = $('#mi-mode');
    const movesEl = $('#mi-moves');
    if (modeEl) {
      const diffLabel = ['Easy', 'Normal', 'Hard'][settings.difficulty - 1] || 'Normal';
      modeEl.textContent = game.mode === MODE_AI ? ('AI · ' + diffLabel) : 'Friend Match';
    }
    if (movesEl) movesEl.textContent = game.history.length + 'Move';
  }

  function updateTurnDisplay() {
    const banner = $('#turn-banner');
    if (banner) {
      banner.innerHTML = game.current === HUMAN
        ? '● <b>Black</b> Turn'
        : '○ <b>' + (game.mode === MODE_AI ? 'AI' : 'White') + '</b> Turn';
    }
    $('#pill-b').classList.toggle('active', game.current === HUMAN);
    $('#pill-w').classList.toggle('active', game.current === AI_PLAYER);
    $('#name-b').textContent = profile.nickname || 'Player';
    $('#name-w').textContent = game.mode === MODE_AI ? 'AI' : 'Player 2';
  }

  /* ═════════════════════════════════════════════════════════════════════════
     BOARD DRAWING
     ═════════════════════════════════════════════════════════════════════════ */
  const canvas = $('#board');
  const ctx = canvas.getContext('2d');
  function cellSize() { return canvas.width / (BOARD_SIZE + 1); }

  function boardColors() {
    const skin = settings.equippedBoard || 'board_classic';
    switch (skin) {
      case 'board_jade':     return { a: '#a7e6c4', b: '#2f8a5f' };
      case 'board_onyx':     return { a: '#454555', b: '#0e0e18' };
      case 'board_ruby':     return { a: '#ff8b94', b: '#8a1820' };
      case 'board_sapphire': return { a: '#8ab8ff', b: '#142b66' };
      case 'board_gold':     return { a: '#ffe49e', b: '#b07514' };
      default:               return { a: '#f0c481', b: '#b87238' };
    }
  }

  function stoneColors(color) {
    const skin = settings.equippedStone || 'stone_classic';
    if (skin === 'stone_jade') {
      return color === HUMAN
        ? { inner: '#5af0a8', outer: '#0e5035' }
        : { inner: '#c9ffe3', outer: '#72b593' };
    }
    if (skin === 'stone_amber') {
      return color === HUMAN
        ? { inner: '#ffb869', outer: '#4a1f05' }
        : { inner: '#fff2d0', outer: '#c09060' };
    }
    if (skin === 'stone_neon') {
      return color === HUMAN
        ? { inner: '#6af', outer: '#024' }
        : { inner: '#fff', outer: '#9cf0c4' };
    }
    return color === HUMAN
      ? { inner: '#7a7a7a', outer: '#000' }
      : { inner: '#ffffff', outer: '#bebebe' };
  }

  function draw() {
    if (!canvas || !ctx) return;
    const W = canvas.width;
    const c = cellSize();
    const cols = boardColors();
    const g = ctx.createLinearGradient(0, 0, W, W);
    g.addColorStop(0, cols.a);
    g.addColorStop(1, cols.b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, W);

    // grid
    ctx.strokeStyle = 'rgba(20,12,4,.85)';
    ctx.lineWidth = 2;
    for (let i = 0; i < BOARD_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(c + i * c, c);
      ctx.lineTo(c + i * c, c + (BOARD_SIZE - 1) * c);
      ctx.moveTo(c, c + i * c);
      ctx.lineTo(c + (BOARD_SIZE - 1) * c, c + i * c);
      ctx.stroke();
    }

    // star points
    ctx.fillStyle = 'rgba(20,12,4,.9)';
    [3, 7, 11].forEach(x => [3, 7, 11].forEach(y => {
      ctx.beginPath();
      ctx.arc(c + x * c, c + y * c, 5, 0, Math.PI * 2);
      ctx.fill();
    }));

    // coords
    if (settings.showCoord) {
      ctx.fillStyle = 'rgba(20,12,4,.75)';
      ctx.font = '700 ' + Math.floor(c * 0.32) + 'px -apple-system, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < BOARD_SIZE; i++) {
        ctx.fillText(String.fromCharCode(65 + i), c + i * c, c * 0.45);
        ctx.fillText(String(i + 1), c * 0.45, c + i * c);
      }
    }

    // stones
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (game.board && game.board[y][x]) drawStone(x, y, game.board[y][x]);
      }
    }

    // last-move marker
    if (settings.showMark && game.history.length && !game.hintCell && !game.winLine) {
      const last = game.history[game.history.length - 1];
      ctx.strokeStyle = '#ff3b30';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(c + last.x * c, c + last.y * c, c * 0.48, 0, Math.PI * 2);
      ctx.stroke();
    }

    // hint
    if (game.pendingCell) {
      const p = game.pendingCell;
      ctx.save();
      ctx.globalAlpha = 0.55;
      drawStone(p.x, p.y, game.current === HUMAN ? '#0b0b0f' : '#f7f8fb');
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,213,107,.95)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(c + p.x * c, c + p.y * c, c * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (game.hintCell) {
      ctx.strokeStyle = 'rgba(61,220,152,.95)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(c + game.hintCell.x * c, c + game.hintCell.y * c, c * 0.48, 0, Math.PI * 2);
      ctx.stroke();
    }

    // win line
    if (game.winLine && game.winLine.length >= 2) {
      const [a, b] = [game.winLine[0], game.winLine[game.winLine.length - 1]];
      ctx.strokeStyle = 'rgba(255,215,107,.9)';
      ctx.lineWidth = c * 0.28;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c + a.x * c, c + a.y * c);
      ctx.lineTo(c + b.x * c, c + b.y * c);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }

  function drawStone(x, y, color) {
    const c = cellSize();
    const cx = c + x * c;
    const cy = c + y * c;
    const r = c * 0.43;
    // shadow
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 3, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fill();
    // stone body
    const cols = stoneColors(color);
    const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, cols.inner);
    g.addColorStop(1, cols.outer);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    // outer ring
    ctx.strokeStyle = 'rgba(0,0,0,.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /* ═════════════════════════════════════════════════════════════════════════
     INPUT
     ═════════════════════════════════════════════════════════════════════════ */
  function getCellFromEvent(ev) {
    const rect = canvas.getBoundingClientRect();
    const t = ev.touches ? ev.touches[0] : ev;
    if (!t) return null;
    const px = (t.clientX - rect.left) * (canvas.width / rect.width);
    const py = (t.clientY - rect.top) * (canvas.height / rect.height);
    const c = cellSize();
    const x = Math.round((px - c) / c);
    const y = Math.round((py - c) / c);
    if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) return null;
    return { x, y };
  }

  function onBoardTap(ev) {
    ev.preventDefault();
    if (game.gameOver) return;
    if (game.mode === MODE_AI && game.current === AI_PLAYER) return;
    if (game.mode === MODE_PVP) {
      if (!Online.inRoom()) return;
      const mySide = Online.mySide();
      if (game.current !== (mySide === 1 ? HUMAN : AI_PLAYER)) return;
    }
    const cell = getCellFromEvent(ev);
    if (!cell) return;
    if (game.board[cell.y][cell.x] !== EMPTY) return;
    game.pendingCell = cell;
    togglePlaceFab(true);
    draw();
    try { playTap(); } catch {}
  }

  function togglePlaceFab(on) {
    const el = $('#ga-place');
    if (!el) return;
    el.classList.toggle('on', !!on);
  }

  function commitPendingMove() {
    const p = game.pendingCell;
    if (!p || game.gameOver) return;
    if (game.mode === MODE_AI && game.current === AI_PLAYER) return;
    if (game.mode === MODE_PVP) {
      const mySide = Online.mySide();
      if (game.current !== (mySide === 1 ? HUMAN : AI_PLAYER)) return;
      game.pendingCell = null;
      togglePlaceFab(false);
      Online.sendMove(p.x, p.y);
      return;
    }
    game.pendingCell = null;
    togglePlaceFab(false);
    placeStone(p.x, p.y);
  }

  canvas.addEventListener('click', onBoardTap);

  /* ═════════════════════════════════════════════════════════════════════════
     PLACE & WIN CHECK
     ═════════════════════════════════════════════════════════════════════════ */
  function placeStone(x, y) {
    if (!game.board || game.gameOver) return false;
    if (game.board[y][x] !== EMPTY) return false;
    game.board[y][x] = game.current;
    game.history.push({ x, y, c: game.current });
    game.hintCell = null;
    if (game.current === HUMAN) playPlaceBlack();
    else playPlaceWhite();
    vibrate(15);
    const line = getWinningLine(x, y, game.current);
    if (line) {
      game.winLine = line;
      game.gameOver = true;
      draw();
      setTimeout(() => endGame(game.current), 400);
      return true;
    }
    if (game.history.length >= BOARD_SIZE * BOARD_SIZE) {
      game.gameOver = true;
      draw();
      setTimeout(() => endGameDraw(), 400);
      return true;
    }
    game.current = game.current === HUMAN ? AI_PLAYER : HUMAN;
    game.moveDeadline = Date.now() + 60000;
    game._lastTick = -1;
    updateTurnDisplay();
    updateMatchInfo();
    draw();
    if (!game.gameOver && game.mode === MODE_AI && game.current === AI_PLAYER) {
      setTimeout(aiMove, 420);
    }
    return true;
  }

  function getWinningLine(x, y, c) {
    for (const [dx, dy] of DIRS) {
      const line = [{ x, y }];
      for (let k = 1; k < 5; k++) {
        const nx = x + dx * k, ny = y + dy * k;
        if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) break;
        if (game.board[ny][nx] !== c) break;
        line.push({ x: nx, y: ny });
      }
      for (let k = 1; k < 5; k++) {
        const nx = x - dx * k, ny = y - dy * k;
        if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) break;
        if (game.board[ny][nx] !== c) break;
        line.unshift({ x: nx, y: ny });
      }
      if (line.length >= 5) return line;
    }
    return null;
  }

  function checkWin(x, y, c) {
    return !!getWinningLine(x, y, c);
  }

  /* ═════════════════════════════════════════════════════════════════════════
     AI ENGINE
     ═════════════════════════════════════════════════════════════════════════ */
  function linePower(board, x, y, dx, dy, c) {
    let count = 1, openA = 0, openB = 0;
    for (let k = 1; k < 5; k++) {
      const nx = x + dx * k, ny = y + dy * k;
      if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) break;
      if (board[ny][nx] === c) count++;
      else { if (board[ny][nx] === EMPTY) openA = 1; break; }
    }
    for (let k = 1; k < 5; k++) {
      const nx = x - dx * k, ny = y - dy * k;
      if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) break;
      if (board[ny][nx] === c) count++;
      else { if (board[ny][nx] === EMPTY) openB = 1; break; }
    }
    const open = openA + openB;
    if (count >= 5) return 1000000;
    if (count === 4 && open === 2) return 50000;
    if (count === 4 && open === 1) return 5000;
    if (count === 3 && open === 2) return 4000;
    if (count === 3 && open === 1) return 300;
    if (count === 2 && open === 2) return 200;
    if (count === 2 && open === 1) return 20;
    if (count === 1 && open === 2) return 5;
    return count;
  }

  function evaluateBoardAt(board, x, y, c) {
    let score = 0;
    for (const [dx, dy] of DIRS) {
      score += linePower(board, x, y, dx, dy, c) * 1.08;
      score += linePower(board, x, y, dx, dy, c === HUMAN ? AI_PLAYER : HUMAN) * 1.0;
    }
    // center bias
    score += (7 - Math.abs(7 - x) - Math.abs(7 - y)) * 0.8;
    return score;
  }

  function evaluateWholeBoard(board, me) {
    // Simple material evaluation used by minimax leaves.
    let total = 0;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (board[y][x] === me) {
          for (const [dx, dy] of DIRS) {
            total += linePower(board, x, y, dx, dy, me);
          }
        } else if (board[y][x] !== EMPTY) {
          for (const [dx, dy] of DIRS) {
            total -= linePower(board, x, y, dx, dy, board[y][x]) * 1.05;
          }
        }
      }
    }
    return total;
  }

  function candidateCells(board, range = 2) {
    if (!board.some(row => row.some(v => v !== EMPTY))) {
      return [{ x: 7, y: 7 }];
    }
    const seen = new Set();
    const arr = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (board[y][x] === EMPTY) continue;
        for (let dy = -range; dy <= range; dy++) {
          for (let dx = -range; dx <= range; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) continue;
            if (board[ny][nx] !== EMPTY) continue;
            const k = ny * BOARD_SIZE + nx;
            if (!seen.has(k)) { seen.add(k); arr.push({ x: nx, y: ny }); }
          }
        }
      }
    }
    return arr;
  }

  function minimax(board, depth, alpha, beta, maximizing, me, them) {
    if (depth === 0) {
      return { score: evaluateWholeBoard(board, me) };
    }
    const cells = candidateCells(board, 1);
    // Order cells by quick heuristic evaluation to improve pruning
    cells.sort((a, b) => evaluateBoardAt(board, b.x, b.y, maximizing ? me : them)
                       - evaluateBoardAt(board, a.x, a.y, maximizing ? me : them));
    const limited = cells.slice(0, depth >= 4 ? 14 : 10);
    if (!limited.length) return { score: evaluateWholeBoard(board, me) };
    let best = null;
    if (maximizing) {
      let value = -Infinity;
      for (const cell of limited) {
        board[cell.y][cell.x] = me;
        if (checkWinStatic(board, cell.x, cell.y, me)) {
          board[cell.y][cell.x] = EMPTY;
          return { score: 1000000 - (3 - depth) * 10, move: cell };
        }
        const res = minimax(board, depth - 1, alpha, beta, false, me, them);
        board[cell.y][cell.x] = EMPTY;
        if (res.score > value) { value = res.score; best = cell; }
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return { score: value, move: best };
    } else {
      let value = Infinity;
      for (const cell of limited) {
        board[cell.y][cell.x] = them;
        if (checkWinStatic(board, cell.x, cell.y, them)) {
          board[cell.y][cell.x] = EMPTY;
          return { score: -1000000 + (3 - depth) * 10, move: cell };
        }
        const res = minimax(board, depth - 1, alpha, beta, true, me, them);
        board[cell.y][cell.x] = EMPTY;
        if (res.score < value) { value = res.score; best = cell; }
        beta = Math.min(beta, value);
        if (alpha >= beta) break;
      }
      return { score: value, move: best };
    }
  }

  function checkWinStatic(board, x, y, c) {
    for (const [dx, dy] of DIRS) {
      let n = 1;
      for (let k = 1; k < 5; k++) {
        const nx = x + dx * k, ny = y + dy * k;
        if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE || board[ny][nx] !== c) break;
        n++;
      }
      for (let k = 1; k < 5; k++) {
        const nx = x - dx * k, ny = y - dy * k;
        if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE || board[ny][nx] !== c) break;
        n++;
      }
      if (n >= 5) return true;
    }
    return false;
  }

  function aiMove() {
    if (game.gameOver) return;
    const cells = candidateCells(game.board, 2);
    if (!cells.length) return;

    // 1) immediate winning move for AI
    for (const cell of cells) {
      game.board[cell.y][cell.x] = AI_PLAYER;
      if (checkWinStatic(game.board, cell.x, cell.y, AI_PLAYER)) {
        game.board[cell.y][cell.x] = EMPTY;
        placeStone(cell.x, cell.y);
        return;
      }
      game.board[cell.y][cell.x] = EMPTY;
    }
    // 2) block immediate winning move by human
    for (const cell of cells) {
      game.board[cell.y][cell.x] = HUMAN;
      if (checkWinStatic(game.board, cell.x, cell.y, HUMAN)) {
        game.board[cell.y][cell.x] = EMPTY;
        placeStone(cell.x, cell.y);
        return;
      }
      game.board[cell.y][cell.x] = EMPTY;
    }

    // 3) difficulty-based selection.  Level 30+ → unleash maximum strength.
    const playerLv = levelFromXp(profile.xp).lv;
    const beast = playerLv >= 30;
    let best = null;
    if (beast || settings.difficulty === AI_HARD) {
      // 3b) Look for a forcing double-threat (open-four / double-three) for AI
      let bestForce = -Infinity, forceCell = null;
      for (const cell of cells) {
        game.board[cell.y][cell.x] = AI_PLAYER;
        let s = 0;
        for (const [dx, dy] of DIRS) s += linePower(game.board, cell.x, cell.y, dx, dy, AI_PLAYER);
        // subtract best opponent reply to same cell
        let oppMax = 0;
        for (const [dx, dy] of DIRS) oppMax = Math.max(oppMax, linePower(game.board, cell.x, cell.y, dx, dy, HUMAN));
        s += (7 - Math.abs(7 - cell.x) - Math.abs(7 - cell.y)) * 1.2;
        game.board[cell.y][cell.x] = EMPTY;
        if (s > bestForce) { bestForce = s; forceCell = cell; }
      }
      // 3c) Block the strongest human threat preemptively (open-three etc.)
      let defMax = -Infinity, defCell = null;
      for (const cell of cells) {
        game.board[cell.y][cell.x] = HUMAN;
        let s = 0;
        for (const [dx, dy] of DIRS) s += linePower(game.board, cell.x, cell.y, dx, dy, HUMAN);
        game.board[cell.y][cell.x] = EMPTY;
        if (s > defMax) { defMax = s; defCell = cell; }
      }
      if (defMax >= 4000 && defCell) best = defCell;
      const depth = beast ? 4 : 2;
      const res = minimax(game.board, depth, -Infinity, Infinity, true, AI_PLAYER, HUMAN);
      if (!best && res && res.move) best = res.move;
      if (!best && forceCell) best = forceCell;
    }
    if (!best) {
      let bestScore = -Infinity;
      const noise = settings.difficulty === AI_EASY ? 300 : settings.difficulty === AI_NORMAL ? 50 : 0;
      for (const cell of cells) {
        const s = evaluateBoardAt(game.board, cell.x, cell.y, AI_PLAYER) + Math.random() * noise;
        if (s > bestScore) { bestScore = s; best = cell; }
      }
    }
    if (!best) best = { x: 7, y: 7 };
    placeStone(best.x, best.y);
  }

  function showHint() {
    if (game.gameOver) return;
    let best = null, bestScore = -Infinity;
    for (const cell of candidateCells(game.board, 1)) {
      const s = evaluateBoardAt(game.board, cell.x, cell.y, game.current);
      if (s > bestScore) { bestScore = s; best = cell; }
    }
    if (!best) return;
    game.hintCell = best;
    draw();
    setTimeout(() => { game.hintCell = null; draw(); }, 1600);
  }

  /* ═════════════════════════════════════════════════════════════════════════
     END OF GAME
     ═════════════════════════════════════════════════════════════════════════ */
  function endGame(winner) {
    if (game.timerHandle) { clearInterval(game.timerHandle); game.timerHandle = null; }
    const playerWon = winner === HUMAN;
    profile.totalGames++;
    let rewardStar = 0, rewardXp = 0;
    if (game.mode === MODE_AI) {
      if (playerWon) {
        profile.totalWins++;
        profile.weeklyWins++;
        profile.weeklyGames++;
        profile.currentStreak++;
        profile.bestStreak = Math.max(profile.bestStreak, profile.currentStreak);
        if (settings.difficulty === AI_EASY) profile.easyWins = (profile.easyWins || 0) + 1;
        else if (settings.difficulty === AI_NORMAL) profile.normalWins = (profile.normalWins || 0) + 1;
        else if (settings.difficulty === AI_HARD) profile.hardWins = (profile.hardWins || 0) + 1;
        profile.aiWins = (profile.aiWins | 0) + 1;
        rewardStar = 100; // fixed 100⭐ for an AI win
        rewardXp = 20;
        profile.stars += rewardStar;
        profile.xp += rewardXp;
        playWin();
        confettiBurst(70);
      } else {
        // AI loss / resign → no penalty, no reward
        profile.totalLosses++;
        profile.currentStreak = 0;
        profile.weeklyGames++;
        playLose();
      }
    } else {
      profile.weeklyGames++;
      if (playerWon) { playWin(); confettiBurst(40); } else { playLose(); }
    }

    // history entry
    history.unshift({
      at: Date.now(),
      mode: game.mode,
      difficulty: settings.difficulty,
      winner: winner,
      result: playerWon ? 'win' : (game.mode === MODE_AI ? 'lose' : 'end'),
      moves: game.history.length,
      duration: Math.floor((Date.now() - game.startedAt) / 1000),
      star: rewardStar, xp: rewardXp,
    });

    updateDailyMissions(playerWon, game.mode === MODE_AI);
    checkAchievements();
    persist();
    try { Online.pushLeader(); } catch {}

    // Modal
    $('#mr-title').textContent = playerWon ? '🏆 VICTORY!' : '💀 LOSS';
    $('#mr-desc').textContent = game.mode === MODE_AI
      ? (playerWon ? 'AI defeated!' : 'AI won')
      : (winner === HUMAN ? 'You won' : 'You lost');
    const rewardsEl = $('#mr-rewards');
    if (game.mode === MODE_AI && playerWon) {
      rewardsEl.classList.remove('hidden');
      $('#mr-stars').textContent = '+' + rewardStar;
      $('#mr-xp').classList.add('hidden');
    } else {
      rewardsEl.classList.add('hidden');
    }
    $('#modal-result').classList.add('active');
    syncHome();
  }

  function endGameDraw() {
    if (game.timerHandle) { clearInterval(game.timerHandle); game.timerHandle = null; }
    profile.totalGames++;
    profile.weeklyGames++;
    persist();
    $('#mr-title').textContent = 'Draw';
    $('#mr-desc').textContent = 'The board is full';
    $('#mr-rewards').classList.add('hidden');
    $('#modal-result').classList.add('active');
    syncHome();
  }

  // Finalize a PvP online match on both phones.  Called from the room listener
  // whenever Firebase flips the room to finished/resigned status.
  function finishPvpGame(winnerSide) {
    if (!currentRoomRef()) return;
    const room = currentRoomRef();
    if (room._finalized) return;
    room._finalized = true;
    if (game.timerHandle) { clearInterval(game.timerHandle); game.timerHandle = null; }
    const mySide = Online.mySide();
    const wager = Online.wager() | 0;
    const iWon = (winnerSide === mySide);
    profile.totalGames++;
    profile.weeklyGames++;
    let delta = 0;
    if (iWon) {
      delta = Math.floor(wager * 0.85);
      profile.stars += delta;
      profile.totalWins++;
      profile.weeklyWins++;
      profile.currentStreak++;
      profile.bestStreak = Math.max(profile.bestStreak, profile.currentStreak);
      playWin(); confettiBurst(70);
    } else {
      delta = -wager;
      profile.stars = Math.max(0, (profile.stars | 0) + delta);
      profile.totalLosses++;
      profile.currentStreak = 0;
      playLose();
    }
    history.unshift({
      at: Date.now(), mode: MODE_PVP, difficulty: settings.difficulty,
      winner: winnerSide === 1 ? HUMAN : AI_PLAYER,
      result: iWon ? 'win' : 'lose',
      moves: game.history.length,
      duration: Math.floor((Date.now() - game.startedAt) / 1000),
      star: delta, xp: 0,
    });
    persist();
    try { Online.pushLeader(); } catch {}
    game.gameOver = true;
    draw();
    $('#mr-title').textContent = iWon ? '🏆 VICTORY!' : '💀 LOSS';
    $('#mr-desc').textContent = iWon
      ? ('You won ' + (wager ? ('+' + delta.toLocaleString() + '⭐') : ''))
      : ('You lost ' + (wager ? (delta.toLocaleString() + '⭐') : ''));
    const rewardsEl = $('#mr-rewards');
    if (wager) {
      rewardsEl.classList.remove('hidden');
      $('#mr-stars').textContent = (iWon ? '+' : '') + delta.toLocaleString() + '⭐';
      $('#mr-xp').classList.add('hidden');
    } else {
      rewardsEl.classList.add('hidden');
    }
    $('#modal-result').classList.add('active');
    syncHome();
    const isHost = room && room.role === 'host';
    // Tear down room after a beat so both phones receive the finished state first
    setTimeout(() => {
      try {
        if (isHost) {
          // Host stays in a fresh waiting room so a new challenger can join
          Online.recycleRoom && Online.recycleRoom();
          $('#modal-result').classList.remove('active');
          game.gameOver = false;
          game.winLine = null;
          game.history = [];
          game.mode = null;
          show('sc-home');
          syncHome();
          openWaitingScreen(room.id, Online.wager() | 0, null, (room.state && room.state.title) || '');
        } else {
          // Loser / guest leaves the room; modal stays until user taps Home
          Online.leaveRoom();
        }
      } catch {}
    }, 1400);
  }
  function currentRoomRef() {
    try { return Online._room && Online._room(); } catch { return null; }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     DAILY MISSIONS
     ═════════════════════════════════════════════════════════════════════════ */
  const DAILY_DEFS = [
    { id: 'play1', name: 'Play 1 match', desc: 'AI: play 1 match', target: 1, star: 30, getVal: m => m.plays || 0 },
    { id: 'play3', name: 'Play 3 matches', desc: 'AI: play 3 matches', target: 3, star: 60, getVal: m => m.plays || 0 },
    { id: 'win1',  name: 'Victory', desc: 'AI: win 1 time', target: 1, star: 50, getVal: m => m.wins || 0 },
    { id: 'win3',  name: 'Win Streak', desc: 'AI: win 3 times', target: 3, star: 120, getVal: m => m.wins || 0 },
    { id: 'hard1', name: 'Challenger', desc: 'Win against Hard AI', target: 1, star: 200, getVal: m => m.hardWins || 0 },
  ];

  function updateDailyMissions(playerWon, wasAi) {
    if (missionState.dayKey !== dayKey()) {
      missionState = { dayKey: dayKey(), missions: {}, claimed: {} };
    }
    const m = missionState.missions;
    m.plays = (m.plays || 0) + 1;
    if (playerWon && wasAi) {
      m.wins = (m.wins || 0) + 1;
      if (settings.difficulty === AI_HARD) m.hardWins = (m.hardWins || 0) + 1;
    }
  }

  function claimMission(id) {
    const def = DAILY_DEFS.find(d => d.id === id);
    if (!def) return;
    if (missionState.claimed[id]) return;
    if (def.getVal(missionState.missions) < def.target) return;
    missionState.claimed[id] = true;
    profile.stars += def.star;
    persist();
    playCoin();
    toast('+' + def.star + '⭐ Earn');
    syncHome();
    renderMissions();
  }

  /* ═════════════════════════════════════════════════════════════════════════
     ACHIEVEMENTS
     ═════════════════════════════════════════════════════════════════════════ */
  function checkAchievements() {
    let newly = 0;
    ACHIEVEMENTS.forEach(a => {
      if (achieveState.unlocked[a.id]) return;
      if (a.check(profile)) {
        achieveState.unlocked[a.id] = Date.now();
        profile.stars += a.star;
        newly++;
        setTimeout(() => toast('🏅 Achievement: ' + a.name + ' (+' + a.star + '⭐)', 2600), newly * 300);
      }
    });
  }

  /* ═════════════════════════════════════════════════════════════════════════
     FULLSCREEN
     ═════════════════════════════════════════════════════════════════════════ */
  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
  }
  function toggleFullscreen() {
    const el = document.documentElement;
    if (!isFullscreen()) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (req) {
        try { const p = req.call(el); if (p && p.catch) p.catch(() => {}); }
        catch { toast('Could not start fullscreen'); }
      } else { toast('Fullscreen is not supported'); }
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
      if (exit) {
        try { const p = exit.call(document); if (p && p.catch) p.catch(() => {}); }
        catch {}
      }
    }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     SCREEN SYNC
     ═════════════════════════════════════════════════════════════════════════ */
  function getAvatarEmoji(id) {
    const it = SHOP_ITEMS.find(i => i.id === id);
    return (it && it.emoji) || '🐻';
  }

  function syncHome() {
    const lv = levelFromXp(profile.xp);
    $('#hm-lvl').textContent = 'LV ' + lv.lv;
    $('#hm-stars').textContent = profile.stars.toLocaleString();
    $('#ai-sub-label').textContent = 'Difficulty · ' + ['Easy', 'Normal', 'Hard'][settings.difficulty - 1];
    updateDailyCard();
  }

  function updateDailyCard() {
    const today = dayKey();
    const card = $('#daily-card');
    if (dailyState.lastClaim === today) {
      card.classList.add('hidden');
    } else {
      card.classList.remove('hidden');
    }
  }

  function claimDaily() {
    const today = dayKey();
    if (dailyState.lastClaim === today) return;
    dailyState.lastClaim = today;
    profile.stars += DAILY_BONUS_STAR;
    profile.xp += DAILY_BONUS_XP;
    persist();
    playCoin();
    confettiBurst(30);
    toast('+' + DAILY_BONUS_STAR + '⭐  +' + DAILY_BONUS_XP + 'XP');
    syncHome();
  }

  function renderProfile() {
    $('#prof-avatar').textContent = getAvatarEmoji(settings.equippedAvatar);
    $('#prof-name').textContent = profile.nickname;
    const lv = levelFromXp(profile.xp);
    $('#prof-rank-pill').textContent = 'LEVEL ' + lv.lv;
    $('#ps-stars').textContent = profile.stars.toLocaleString();
    $('#ps-wins').textContent = profile.totalWins;
    const rate = profile.totalGames ? Math.round(profile.totalWins / profile.totalGames * 100) : 0;
    $('#ps-rate').textContent = rate + '%';
    $('#lv-label').textContent = 'LV ' + lv.lv;
    $('#lv-xp').textContent = lv.cur + ' / ' + lv.need + ' AI Wins';
    $('#lv-fill').style.width = Math.min(100, (lv.cur / lv.need) * 100) + '%';

    const body = $('#prof-body');
    const rows = [
      ['Total Games', profile.totalGames],
      ['Loss', profile.totalLosses],
      ['Best streak', profile.bestStreak],
      ['Current streak', profile.currentStreak],
      ['Weekly wins', profile.weeklyWins],
      ['Easy Wins', profile.easyWins || 0],
      ['Normal Wins', profile.normalWins || 0],
      ['Hard wins', profile.hardWins || 0],
    ];
    body.innerHTML = rows.map(([k, v]) =>
      `<div class="prof-row"><span class="k">${k}</span><span class="v">${v}</span></div>`
    ).join('');
  }

  let rankTab = 'total';
  function renderRanks() {
    try { checkWeeklyRollover(); } catch {}
    const ranks = seedBotsIfNeeded();
    const wk = weekKey();
    const info = $('#rank-reset-info');
    if (info) info.textContent = formatResetMsg();
    let list;
    // Keep only English/ASCII nicknames for display
    const englishOnly = r => {
      const n = String(r && r.nickname || '');
      return /^[\x20-\x7E]+$/.test(n) && n.trim().length > 0;
    };
    const filtered = ranks.filter(englishOnly);
    if (rankTab === 'weekly') {
      list = filtered
        .filter(r => r.weeklyKey === wk && (r.weeklyWins || 0) > 0)
        .sort((a, b) => (b.weeklyWins || 0) - (a.weeklyWins || 0))
        .slice(0, 7);
    } else if (rankTab === 'prev') {
      list = filtered
        .filter(r => (r.prevWeekTotalWins || 0) > 0)
        .sort((a, b) => (b.prevWeekTotalWins || 0) - (a.prevWeekTotalWins || 0))
        .slice(0, 7);
    } else if (rankTab === 'hard') {
      list = filtered
        .filter(r => (r.hardWins || 0) > 0)
        .sort((a, b) => (b.hardWins || 0) - (a.hardWins || 0));
    } else {
      list = filtered.slice().sort((a, b) =>
        ((b.totalWins || 0) - (a.totalWins || 0)) || ((a.totalLosses || 0) - (b.totalLosses || 0))
      );
    }
    const el = $('#rank-list');
    if (!list.length) {
      el.innerHTML = '<div class="empty-note">No ranked players yet<br/>Win a match to get on the leaderboard!</div>';
      return;
    }
    el.innerHTML = list.slice(0, 50).map((r, i) => {
      const pos = i + 1;
      const cls = pos === 1 ? 'p1' : pos === 2 ? 'p2' : pos === 3 ? 'p3' : '';
      const label = pos <= 3 ? ['👑','🥈','🥉'][pos - 1] : pos;
      const me = r.id === 'me' ? 'me' : '';
      const rightPrimary = rankTab === 'weekly' ? ((r.weeklyWins || 0) + 'W')
                        : rankTab === 'prev'   ? ((r.prevWeekTotalWins || 0) + 'W')
                        : rankTab === 'hard'   ? ((r.hardWins || 0) + 'W')
                        : ((r.totalWins || 0) + 'W');
      const sub = rankTab === 'weekly'
        ? 'This Week · ' + (r.weeklyWins || 0) + 'W'
        : rankTab === 'prev'
          ? 'Last Week Total · ' + (r.prevWeekTotalWins || 0) + 'W'
        : rankTab === 'hard'
          ? 'Hard ' + (r.hardWins || 0) + 'W · Total ' + (r.totalWins || 0) + 'W'
          : (r.totalGames || 0) + 'Match ' + (r.totalWins || 0) + 'W ' + (r.totalLosses || 0) + 'L';
      const avatar = r.avatar || (r.id === 'me' ? getAvatarEmoji(settings.equippedAvatar) : '🙂');
      return `
        <div class="rank-row ${me}">
          <div class="rank-pos ${cls}">${label}</div>
          <div class="rank-avatar">${avatar}</div>
          <div class="rank-mid">
            <div class="rank-name">${escapeHtml(r.nickname || '-')} <span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:999px;background:linear-gradient(135deg,#ffd56b,#ff9e3c);color:#3a1a00;font-size:10px;font-weight:900;vertical-align:middle;">LV ${Math.min(300, Math.floor(((r.aiWins|0) || (((r.totalWins|0))||0))/10) + 1)}</span></div>
            <div class="rank-sub">${sub}</div>
          </div>
          <div class="rank-right">${rightPrimary}<small>${(r.totalGames || 0)}Match</small></div>
        </div>`;
    }).join('');
  }

  let shopTab = 'avatar';
  function renderShop() {
    $('#shop-stars').textContent = profile.stars.toLocaleString();
    const items = SHOP_ITEMS.filter(i => i.type === shopTab);
    const el = $('#shop-grid');
    const equippedKey = shopTab === 'avatar' ? 'equippedAvatar'
                      : shopTab === 'board' ? 'equippedBoard' : 'equippedStone';
    el.innerHTML = items.map(it => {
      const owned = shopState.owned.includes(it.id) || it.price === 0;
      const equipped = settings[equippedKey] === it.id;
      const cls = equipped ? 'equipped' : owned ? 'owned' : '';
      const price = owned ? (equipped ? 'Equipped' : 'Owned') : it.price.toLocaleString();
      return `
        <button class="shop-item ${cls}" data-item="${it.id}">
          <div class="si-emoji">${it.emoji}</div>
          <div class="si-name">${it.name}</div>
          <div class="si-price">${price}</div>
        </button>`;
    }).join('');
    $$('#shop-grid .shop-item').forEach(btn => {
      btn.addEventListener('click', () => onShopItemClick(btn.dataset.item));
    });
  }

  function onShopItemClick(id) {
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item) return;
    const owned = shopState.owned.includes(id) || item.price === 0;
    if (!owned) {
      if (profile.stars < item.price) {
        toast('Not enough stars');
        return;
      }
      profile.stars -= item.price;
      shopState.owned.push(id);
      persist();
      playCoin();
      toast(item.name + ' Purchased!');
    }
    // equip
    if (item.type === 'avatar') settings.equippedAvatar = id;
    else if (item.type === 'board') settings.equippedBoard = id;
    else if (item.type === 'stone') settings.equippedStone = id;
    persist();
    renderShop();
    syncHome();
  }

  let missionTab = 'daily';
  function renderMissions() {
    const el = $('#mission-list');
    if (missionTab === 'daily') {
      el.innerHTML = DAILY_DEFS.map(def => {
        const val = Math.min(def.target, def.getVal(missionState.missions));
        const done = val >= def.target;
        const claimed = !!missionState.claimed[def.id];
        const pct = Math.floor(val / def.target * 100);
        const btnTxt = claimed ? 'Done' : done ? 'Claim' : val + '/' + def.target;
        const btnCls = claimed ? 'mission-claim done' : 'mission-claim';
        const btnDisabled = (claimed || !done) ? 'disabled' : '';
        return `
          <div class="mission-card">
            <div class="mission-icon">🎯</div>
            <div class="mission-main">
              <div class="mission-name">${def.name}</div>
              <div class="mission-desc">${def.desc}</div>
              <div class="mission-bar"><div class="mission-fill" style="width:${pct}%"></div></div>
            </div>
            <div class="mission-right">
              <div class="mission-reward">${def.star}</div>
              <button class="${btnCls}" data-mid="${def.id}" ${btnDisabled}>${btnTxt}</button>
            </div>
          </div>`;
      }).join('');
      $$('[data-mid]').forEach(b => b.addEventListener('click', () => claimMission(b.dataset.mid)));
    } else if (missionTab === 'ach') {
      el.innerHTML = '<div class="ach-grid">' + ACHIEVEMENTS.map(a => {
        const done = !!achieveState.unlocked[a.id];
        const cls = done ? 'done' : 'locked';
        return `
          <div class="ach-card ${cls}">
            <div class="ach-icon">${a.icon}</div>
            <div class="ach-name">${a.name}</div>
            <div class="ach-desc">${a.desc}</div>
            <div class="ach-reward">+${a.star}⭐</div>
          </div>`;
      }).join('') + '</div>';
    } else {
      if (!history.length) {
        el.innerHTML = '<div class="empty-note">No match history yet</div>';
        return;
      }
      el.innerHTML = history.slice(0, 30).map(h => {
        const win = h.result === 'win';
        const icon = win ? '🏆' : h.result === 'lose' ? '💀' : '🤝';
        const cls = win ? 'win' : h.result === 'lose' ? 'lose' : '';
        const dur = Math.floor(h.duration / 60) + ':' + String(h.duration % 60).padStart(2, '0');
        const date = new Date(h.at);
        const ds = (date.getMonth() + 1) + '/' + date.getDate() + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
        const diffLabel = h.mode === MODE_AI ? 'AI ' + ['Easy', 'Normal', 'Hard'][h.difficulty - 1] : 'Friend';
        const right = h.star ? '+' + h.star + '⭐' : '';
        return `
          <div class="hist-card">
            <div class="hist-icon ${cls}">${icon}</div>
            <div class="hist-main">
              <div class="hist-name">${win ? 'Win' : h.result === 'lose' ? 'Loss' : 'Exit'} · ${diffLabel}</div>
              <div class="hist-sub">${ds} · ${h.moves}Move · ${dur}</div>
            </div>
            <div class="hist-right">${right}</div>
          </div>`;
      }).join('');
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  /* ═════════════════════════════════════════════════════════════════════════
     CONFIRM MODAL
     ═════════════════════════════════════════════════════════════════════════ */
  function confirmModal(title, desc, onOk) {
    $('#mc-title').textContent = title;
    $('#mc-desc').textContent = desc;
    $('#modal-confirm').classList.add('active');
    const close = () => $('#modal-confirm').classList.remove('active');
    const ok = () => { close(); onOk && onOk(); $('#mc-ok').removeEventListener('click', ok); };
    const cancel = () => { close(); $('#mc-cancel').removeEventListener('click', cancel); };
    $('#mc-ok').addEventListener('click', ok);
    $('#mc-cancel').addEventListener('click', cancel);
  }

  /* ═════════════════════════════════════════════════════════════════════════
     EVENT BINDINGS
     ═════════════════════════════════════════════════════════════════════════ */
  // Play buttons (home)
  $$('[data-action="play-ai"]').forEach(b => b.addEventListener('click', () => {
    playTap();
    game.mode = MODE_AI;
    show('sc-game');
    requestAnimationFrame(() => { resize(); newGame(); });
  }));
  $$('[data-action="play-pvp"]').forEach(b => b.addEventListener('click', () => {
    playTap();
    game.mode = MODE_PVP;
    show('sc-game');
    requestAnimationFrame(() => { resize(); newGame(); });
  }));

  // Footer nav
  $$('[data-nav]').forEach(b => b.addEventListener('click', (e) => {
    playTap();
    const gs = $('#sc-game');
    if (gs && gs.classList.contains('active') && !game.gameOver) {
      e.preventDefault(); e.stopPropagation();
      openConfirm(tr('concede_title'), tr('concede_desc'), () => {
        if (game.mode === MODE_PVP) { try { Online.resign(); } catch {} return; }
        if (game.timerHandle) clearInterval(game.timerHandle);
        game.gameOver = true; endGame(AI_PLAYER);
        setTimeout(() => { $('#modal-result').classList.remove('active'); show('sc-home'); syncHome(); }, 50);
      });
      return;
    }
    const nav = b.dataset.nav;
    if (nav === 'home')    { show('sc-home'); syncHome(); }
    else if (nav === 'rank') { show('sc-rank'); renderRanks(); try { refreshCloudRanks().then(renderRanks); } catch {} }
    else if (nav === 'profile') { show('sc-profile'); renderProfile(); }
    else if (nav === 'shop') { show('sc-shop'); renderShop(); }
    else if (nav === 'mission') { show('sc-mission'); renderMissions(); }
  }));

  // Back buttons
  $$('[data-back]').forEach(b => b.addEventListener('click', () => { playTap(); show('sc-home'); syncHome(); }));

  // Rank tabs
  $$('[data-tab]').forEach(b => b.addEventListener('click', () => {
    rankTab = b.dataset.tab;
    $$('[data-tab]').forEach(x => x.classList.toggle('on', x === b));
    renderRanks();
  }));

  // Shop tabs
  $$('[data-shop-tab]').forEach(b => b.addEventListener('click', () => {
    shopTab = b.dataset.shopTab;
    $$('[data-shop-tab]').forEach(x => x.classList.toggle('on', x === b));
    renderShop();
  }));

  // Mission tabs
  $$('[data-mtab]').forEach(b => b.addEventListener('click', () => {
    missionTab = b.dataset.mtab;
    $$('[data-mtab]').forEach(x => x.classList.toggle('on', x === b));
    renderMissions();
  }));

  // Rank refresh
  $('#btn-rank-refresh').addEventListener('click', () => { playTap(); renderRanks(); toast('Refresh complete'); });

  // Daily bonus
  $('#daily-claim-btn').addEventListener('click', claimDaily);

  // Profile edit — themed nickname dialog
  function openNicknameDialog() {
    const dlg = document.createElement('div');
    dlg.style.cssText = 'position:fixed;inset:0;background:rgba(3,20,14,.9);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(6px);';
    dlg.innerHTML =
      '<div style="background:linear-gradient(160deg,#0b4f3a,#1fb37f);border-radius:20px;padding:24px;width:min(90vw,340px);box-shadow:0 30px 80px rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.2);color:#fff;">'
      + '  <div style="font-size:18px;font-weight:900;text-align:center;margin-bottom:14px;">Change Nickname</div>'
      + '  <input id="fa-nk-input" maxlength="12" placeholder="2–12 characters" style="width:100%;padding:13px;border:none;border-radius:12px;background:rgba(255,255,255,.95);color:#0b4f3a;font-weight:900;font-size:16px;text-align:center;margin-bottom:14px;" />'
      + '  <div style="display:flex;gap:8px;">'
      + '    <button id="fa-nk-cancel" style="flex:1;padding:12px;border:none;border-radius:12px;background:rgba(255,255,255,.15);color:#fff;font-weight:800;cursor:pointer;">Cancel</button>'
      + '    <button id="fa-nk-save"   style="flex:1;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#ffd56b,#ff9e3c);color:#3a1a00;font-weight:900;cursor:pointer;">Save</button>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(dlg);
    const inp = dlg.querySelector('#fa-nk-input');
    inp.value = profile.nickname || '';
    setTimeout(() => inp.focus(), 30);
    dlg.querySelector('#fa-nk-cancel').addEventListener('click', () => dlg.remove());
    const save = () => {
      const v = String(inp.value || '').trim();
      if (v.length < 2 || v.length > 12) { toast('2–12 characters'); return; }
      profile.nickname = v;
      persist();
      renderProfile();
      syncHome();
      try { Online.pushLeader(); Online.registerPresence(); } catch {}
      toast('Nickname changed');
      dlg.remove();
    };
    dlg.querySelector('#fa-nk-save').addEventListener('click', save);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
  }
  $('#btn-edit-name').addEventListener('click', openNicknameDialog);

  // Game actions
  $('#ga-place').addEventListener('click', () => { playTap(); commitPendingMove(); });
  $('#btn-prof-settings').addEventListener('click', () => { playTap(); show('sc-settings'); });
  // Mid-game guard: when game is in progress, nav buttons (back, nav-bar) force resign confirmation.
  function isInGame() {
    const gs = $('#sc-game');
    if (!gs || !gs.classList.contains('active')) return false;
    return !game.gameOver;
  }
  function resignFlow(onDone) {
    openConfirm(tr('concede_title'), tr('concede_desc'), () => {
      if (game.mode === MODE_PVP) {
        // Let Firebase flip winner → both phones receive finishPvpGame.
        try { Online.resign(); } catch {}
        // Safety net: also finalize locally in case the self-update doesn't
        // retrigger our listener before the room is recycled.
        try {
          const opp = Online.mySide() === 1 ? 2 : 1;
          setTimeout(() => { if (!game.gameOver) finishPvpGame(opp); }, 400);
        } catch {}
      } else {
        if (game.timerHandle) clearInterval(game.timerHandle);
        game.gameOver = true;
        endGame(AI_PLAYER);
        if (onDone) onDone();
      }
    });
  }
  $('#ga-resign').addEventListener('click', () => {
    playTap();
    if (game.gameOver) { show('sc-home'); syncHome(); return; }
    resignFlow(() => { setTimeout(() => { $('#modal-result').classList.remove('active'); show('sc-home'); syncHome(); }, 50); });
  });
  // Global guard: any "data-back" inside game screen also triggers resign
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest && e.target.closest('[data-back]');
    if (!t) return;
    if (isInGame()) {
      e.preventDefault(); e.stopPropagation();
      resignFlow(() => { $('#modal-result').classList.remove('active'); show('sc-home'); syncHome(); });
    }
  }, true);
  // Hint: first use free, then 500⭐ each
  $('#ga-hint').addEventListener('click', () => {
    playTap();
    if (game.gameOver) return;
    game.hintUsed = (game.hintUsed | 0);
    if (game.hintUsed >= 1) {
      if ((profile.stars | 0) < 500) { toast('Need 500⭐ for another hint'); return; }
      profile.stars -= 500;
      persist(); syncHome();
      toast('-500⭐ (hint)');
    }
    game.hintUsed = game.hintUsed + 1;
    showHint();
  });
  // (in-game Settings button removed — settings only via Profile)

  // Game result modal actions
  $('#mr-home').addEventListener('click', () => {
    playTap();
    $('#modal-result').classList.remove('active');
    show('sc-home'); syncHome();
  });

  // Settings segments
  $('#seg-diff').addEventListener('click', e => {
    const t = e.target;
    if (!t.dataset || !t.dataset.d) return;
    settings.difficulty = +t.dataset.d;
    $$('#seg-diff button').forEach(b => b.classList.toggle('on', b === t));
    persist();
    syncHome();
    updateMatchInfo();
  });
  $('#seg-snd').addEventListener('click', e => {
    const t = e.target;
    if (!t.dataset || t.dataset.s === undefined) return;
    settings.sound = t.dataset.s === '1';
    $$('#seg-snd button').forEach(b => b.classList.toggle('on', b === t));
    persist();
  });
  $('#seg-mark').addEventListener('click', e => {
    const t = e.target;
    if (!t.dataset || t.dataset.m === undefined) return;
    settings.showMark = t.dataset.m === '1';
    $$('#seg-mark button').forEach(b => b.classList.toggle('on', b === t));
    persist();
    draw();
  });
  $('#seg-coord').addEventListener('click', e => {
    const t = e.target;
    if (!t.dataset || t.dataset.c === undefined) return;
    settings.showCoord = t.dataset.c === '1';
    $$('#seg-coord button').forEach(b => b.classList.toggle('on', b === t));
    persist();
    draw();
  });
  $('#seg-vib').addEventListener('click', e => {
    const t = e.target;
    if (!t.dataset || t.dataset.v === undefined) return;
    settings.vibrate = t.dataset.v === '1';
    $$('#seg-vib button').forEach(b => b.classList.toggle('on', b === t));
    persist();
  });
  $('#seg-lang').addEventListener('click', e => {
    const t = e.target;
    if (!t.dataset || !t.dataset.lang) return;
    settings.language = t.dataset.lang;
    $$('#seg-lang button').forEach(b => b.classList.toggle('on', b === t));
    persist();
    applyI18n();
    toast('Language: ' + t.dataset.lang.toUpperCase());
  });

  // Reflect current settings in segments
  function reflectSettings() {
    $$('#seg-diff button').forEach(b => b.classList.toggle('on', +b.dataset.d === settings.difficulty));
    $$('#seg-snd button').forEach(b => b.classList.toggle('on', (b.dataset.s === '1') === !!settings.sound));
    $$('#seg-mark button').forEach(b => b.classList.toggle('on', (b.dataset.m === '1') === !!settings.showMark));
    $$('#seg-coord button').forEach(b => b.classList.toggle('on', (b.dataset.c === '1') === !!settings.showCoord));
    $$('#seg-vib button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === !!settings.vibrate));
    $$('#seg-lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === (settings.language || 'en')));
    applyI18n();
    try { syncHome(); } catch {}
  }

  // Reset
  $('#btn-reset').addEventListener('click', () => {
    confirmModal('Reset', 'This will reset your stats and ranking. Continue??', () => {
      const name = profile.nickname;
      const stars = profile.stars;
      profile = defaultProfile();
      profile.nickname = name;
      profile.stars = stars;
      storeDel(RANK_KEY);
      history = [];
      achieveState = { unlocked: {} };
      persist();
      syncHome();
      toast('Reset complete');
    });
  });

  // Fullscreen
  // fullscreen button removed
  $('#btn-fs-set').addEventListener('click', () => { playTap(); toggleFullscreen(); });
  document.addEventListener('fullscreenchange', () => requestAnimationFrame(resize));
  document.addEventListener('webkitfullscreenchange', () => requestAnimationFrame(resize));

  // How to
  $('#btn-how').addEventListener('click', () => { playTap(); show('sc-how'); });

  /* ═════════════════════════════════════════════════════════════════════════
     RESIZE
     ═════════════════════════════════════════════════════════════════════════ */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 320;
    const px = Math.floor(w * dpr);
    if (canvas.width !== px) {
      canvas.width = canvas.height = px;
    }
    draw();
  }
  window.addEventListener('resize', () => requestAnimationFrame(resize));
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));

  /* ═════════════════════════════════════════════════════════════════════════
     ONLINE — Firebase leaderboard + friend room integration
     Uses Firebase paths omokLeaders + omokRooms, so rankings and rooms stay
     compatible with the original hub across versions.
     ═════════════════════════════════════════════════════════════════════════ */
  const Online = (function() {
    const LEADERS_PATH  = 'leaderboards/omok';
    const ROOMS_PATH    = 'omokRooms';
    const PRESENCE_PATH = 'omokPresence';
    let db = null;
    let currentRoom = null;
    let roomListeners = [];
    let presenceHandle = null;

    function ready() {
      if (db) return db;
      if (typeof window.firebase === 'undefined' || !firebase.database) return null;
      try { db = firebase.database(); } catch (e) { db = null; }
      return db;
    }

    /* ── Leaderboard ─────────────────────────────────────────────────────── */
    async function fetchLeaders() {
      const d = ready();
      if (!d) return null;
      try {
        const snap = await d.ref(LEADERS_PATH).once('value');
        const out = [];
        snap.forEach(ch => {
          const v = ch.val(); if (!v) return;
          out.push({
            id: ch.key,
            nickname: v.nickname || 'Player',
            avatar: v.avatar || '🐻',
            totalWins: Number(v.totalWins || v.wins || 0),
            totalLosses: Number(v.totalLosses || v.losses || 0),
            totalGames: Number(v.totalGames || ((v.totalWins || 0) + (v.totalLosses || 0))),
            hardWins: Number(v.hardWins || 0),
            bestStreak: Number(v.bestStreak || 0),
            weeklyKey: v.weeklyKey || '',
            weeklyWins: Number(v.weeklyWins || 0),
            prevWeekTotalWins: Number(v.prevWeekTotalWins || 0),
            prevWeekTotalLosses: Number(v.prevWeekTotalLosses || 0),
            prevWeekTotalGames: Number(v.prevWeekTotalGames || 0),
            prevWeekKey: v.prevWeekKey || '',
            updatedAt: Number(v.updatedAt || 0),
          });
        });
        return out;
      } catch (e) { console.warn('fetchLeaders failed', e); return null; }
    }

    async function pushLeader() {
      const d = ready();
      if (!d || !profile || !profile.id) return;
      try {
        const avatarItem = SHOP_ITEMS.find(i => i.id === (settings.equippedAvatar || 'avatar_bear'));
        await d.ref(LEADERS_PATH + '/' + profile.id).update({
          nickname: profile.nickname,
          avatar: (avatarItem && avatarItem.emoji) || '🐻',
          totalWins: profile.totalWins | 0,
          totalLosses: profile.totalLosses | 0,
          totalGames: profile.totalGames | 0,
          hardWins: profile.hardWins | 0,
          aiWins: profile.aiWins | 0,
          bestStreak: profile.bestStreak | 0,
          weeklyKey: profile.weeklyKey || '',
          weeklyWins: profile.weeklyWins | 0,
          prevWeekTotalWins: profile.prevWeekTotalWins | 0,
          prevWeekTotalLosses: profile.prevWeekTotalLosses | 0,
          prevWeekTotalGames: profile.prevWeekTotalGames | 0,
          prevWeekKey: profile.prevWeekKey || '',
          stars: profile.stars | 0,
          updatedAt: Date.now(),
        });
      } catch (e) { console.warn('pushLeader failed', e); }
    }

    async function syncRanksFromCloud() {
      const remote = await fetchLeaders();
      if (!remote || !remote.length) return false;
      const local = loadRanks();
      const byId = {};
      local.forEach(r => { if (r && r.id) byId[r.id] = r; });
      remote.forEach(r => { byId[r.id] = r; });
      const mine = local.find(r => r.id === 'me');
      if (mine) byId['me'] = mine;
      saveRanks(Object.values(byId));
      return true;
    }

    /* ── Presence ────────────────────────────────────────────────────────── */
    async function registerPresence() {
      const d = ready();
      if (!d || !profile || !profile.id) return;
      try {
        const avatarItem = SHOP_ITEMS.find(i => i.id === (settings.equippedAvatar || 'avatar_bear'));
        const ref = d.ref(PRESENCE_PATH + '/' + profile.id);
        const payload = {
          id: profile.id,
          nickname: profile.nickname,
          avatar: (avatarItem && avatarItem.emoji) || '🐻',
          stars: profile.stars | 0,
          wins: profile.totalWins | 0,
          lastSeen: firebase.database.ServerValue.TIMESTAMP,
        };
        await ref.set(payload);
        try { ref.onDisconnect().remove(); } catch {}
        presenceHandle = ref;
      } catch (e) { console.warn('presence failed', e); }
    }
    async function touchPresence() {
      const d = ready();
      if (!d || !profile || !profile.id) return;
      try {
        await d.ref(PRESENCE_PATH + '/' + profile.id + '/lastSeen')
          .set(firebase.database.ServerValue.TIMESTAMP);
        await d.ref(PRESENCE_PATH + '/' + profile.id + '/stars').set(profile.stars | 0);
      } catch {}
    }
    async function fetchPresence() {
      const d = ready(); if (!d) return [];
      try {
        const snap = await d.ref(PRESENCE_PATH).once('value');
        const now = Date.now();
        const out = [];
        snap.forEach(ch => {
          const v = ch.val(); if (!v) return;
          if (ch.key === profile.id) return;
          // Consider online if lastSeen within 90 seconds
          if (v.lastSeen && now - Number(v.lastSeen) < 90000) {
            out.push({
              id: ch.key,
              nickname: v.nickname || 'Player',
              avatar: v.avatar || '🐻',
              stars: Number(v.stars || 0),
              wins: Number(v.wins || 0),
            });
          }
        });
        return out;
      } catch (e) { return []; }
    }

    /* ── Rooms ───────────────────────────────────────────────────────────── */
    function genCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let s = ''; for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    }

    async function fetchOpenRooms() {
      const d = ready(); if (!d) return [];
      try {
        const snap = await d.ref(ROOMS_PATH).once('value');
        const out = [];
        const now = Date.now();
        snap.forEach(ch => {
          const v = ch.val(); if (!v) return;
          if (v.status !== 'waiting') return;
          // Stale rooms (> 10 min) are ignored
          if (v.createdAt && now - Number(v.createdAt) > 600000) return;
          if (v.hostId === profile.id) return;
          // Targeted rooms only visible to the target
          if (v.targetId && v.targetId !== profile.id) return;
          out.push({
            id: ch.key,
            code: v.code || ch.key,
            hostId: v.hostId,
            hostName: v.hostName || 'Host',
            hostAvatar: v.hostAvatar || '🐻',
            wager: Number(v.wager || 0),
            title: String(v.title || ''),
            targetId: v.targetId || '',
            targetName: v.targetName || '',
            createdAt: Number(v.createdAt || 0),
          });
        });
        out.sort((a, b) => b.createdAt - a.createdAt);
        return out;
      } catch (e) { return []; }
    }

    async function createRoom(wager, target, title) {
      const d = ready();
      if (!d) { toast('Online unavailable'); return null; }
      if ((profile.stars | 0) < (wager | 0)) { popupAlert('Not enough stars', 'You need ' + (wager|0).toLocaleString() + '⭐ to create this room. You have ' + (profile.stars|0).toLocaleString() + '⭐.'); return null; }
      const code = genCode();
      const avatarItem = SHOP_ITEMS.find(i => i.id === (settings.equippedAvatar || 'avatar_bear'));
      const hostAvatar = (avatarItem && avatarItem.emoji) || '🐻';
      try {
        await d.ref(ROOMS_PATH + '/' + code).set({
          code,
          hostId: profile.id,
          hostName: profile.nickname,
          hostAvatar,
          guestId: '',
          guestName: '',
          guestAvatar: '',
          wager: wager | 0,
          title: String(title || '').slice(0, 24),
          targetId: (target && target.id) || '',
          targetName: (target && target.nickname) || '',
          board: new Array(BOARD_SIZE * BOARD_SIZE).fill(0),
          turn: 1,
          winner: 0,
          status: 'waiting',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        currentRoom = { id: code, role: 'host', mySide: 1, wager: wager | 0 };
        attachRoomListener(code);
        return code;
      } catch (e) { console.warn('createRoom failed', e); toast('Failed to create'); return null; }
    }

    async function joinRoom(code) {
      const d = ready();
      if (!d) { toast('Online unavailable'); return false; }
      code = String(code || '').toUpperCase().trim();
      if (!code) return false;
      try {
        const ref = d.ref(ROOMS_PATH + '/' + code);
        const snap = await ref.once('value');
        const v = snap.val();
        if (!v) { toast('Room not found'); return false; }
        if (v.status !== 'waiting') { toast('Room unavailable'); return false; }
        if (v.guestId && v.guestId !== profile.id) { toast('Room full'); return false; }
        const wager = Number(v.wager || 0);
        if ((profile.stars | 0) < wager) { popupAlert('Not enough stars', 'You need ' + wager.toLocaleString() + '⭐ to join this room. You currently have ' + (profile.stars|0).toLocaleString() + '⭐.'); return false; }
        if (v.targetId && v.targetId !== profile.id) { toast('Private room'); return false; }
        const avatarItem = SHOP_ITEMS.find(i => i.id === (settings.equippedAvatar || 'avatar_bear'));
        await ref.update({
          guestId: profile.id,
          guestName: profile.nickname,
          guestAvatar: (avatarItem && avatarItem.emoji) || '🐻',
          status: 'joined',
          guestReady: false,
          updatedAt: Date.now(),
        });
        currentRoom = { id: code, role: 'guest', mySide: 2, wager };
        attachRoomListener(code);
        return true;
      } catch (e) { console.warn('joinRoom failed', e); toast('Join failed'); return false; }
    }

    async function cancelRoom() {
      const d = ready();
      if (!d || !currentRoom || currentRoom.role !== 'host') return;
      try { await d.ref(ROOMS_PATH + '/' + currentRoom.id).remove(); } catch {}
      leaveRoom(true);
    }

    function attachRoomListener(code) {
      const d = ready(); if (!d) return;
      const ref = d.ref(ROOMS_PATH + '/' + code);
      const cb = snap => {
        const v = snap.val();
        if (!v) { leaveRoom(true); return; }
        applyRoomState(v);
      };
      ref.on('value', cb);
      roomListeners.push({ ref, cb });
    }

    function applyRoomState(v) {
      if (!currentRoom) return;
      currentRoom.state = v;
      // Handshake screens (joined → guestReady → playing)
      if (v.status === 'joined' || v.status === 'ready') {
        try { openRoomReadyScreen && openRoomReadyScreen(v, currentRoom.role); } catch {}
      }
      if (v.status === 'playing' && !currentRoom.started) {
        currentRoom.started = true;
        try { closeRoomReadyScreen && closeRoomReadyScreen(); } catch {}
        try { closeFriendOnlinePanel(); } catch {}
        game.mode = MODE_PVP;
        show('sc-game');
        requestAnimationFrame(() => { resize(); newGame(); });
      }
      if (Array.isArray(v.board) && v.board.length === BOARD_SIZE * BOARD_SIZE) {
        let prevCount = 0;
        for (let y = 0; y < BOARD_SIZE; y++)
          for (let x = 0; x < BOARD_SIZE; x++)
            if (game.board[y][x]) prevCount++;
        for (let y = 0; y < BOARD_SIZE; y++)
          for (let x = 0; x < BOARD_SIZE; x++)
            game.board[y][x] = v.board[y * BOARD_SIZE + x] | 0;
        let newCount = 0;
        for (let y = 0; y < BOARD_SIZE; y++)
          for (let x = 0; x < BOARD_SIZE; x++)
            if (game.board[y][x]) newCount++;
        if (newCount > prevCount) { try { playStone(); vibrate(12); } catch {} }
      }
      const prevTurn = game.current;
      game.current = (v.turn === 1) ? HUMAN : AI_PLAYER;
      if (prevTurn !== game.current) { game.moveDeadline = Date.now() + 60000; game._lastTick = -1; game._timedOut = false; }
      // Rebuild history list from board so winning-line checks work
      game.history = [];
      for (let y = 0; y < BOARD_SIZE; y++)
        for (let x = 0; x < BOARD_SIZE; x++)
          if (game.board[y][x]) game.history.push({ x, y, c: game.board[y][x] });
      if (v.winner && !game.gameOver) {
        game.gameOver = true;
        game.winner = v.winner;
        try { finishPvpGame(v.winner); } catch (e) { console.warn(e); }
        // Try to compute a win-line for visual feedback
        try {
          outer: for (let y = 0; y < BOARD_SIZE; y++)
            for (let x = 0; x < BOARD_SIZE; x++)
              if (game.board[y][x] === v.winner) {
                const line = getWinningLine(x, y, v.winner);
                if (line) { game.winLine = line; break outer; }
              }
        } catch {}
      }
      const nameB = document.getElementById('name-b');
      const nameW = document.getElementById('name-w');
      if (nameB) nameB.textContent = (currentRoom.role === 'host' ? (v.hostName || 'You') : (v.hostName || 'Host'));
      if (nameW) nameW.textContent = (currentRoom.role === 'host' ? (v.guestName || 'Waiting…') : (v.guestName || 'You'));
      try { updateTurnDisplay(); updateMatchInfo(); draw(); } catch {}
    }

    async function sendMove(x, y) {
      const d = ready();
      if (!d || !currentRoom) return;
      try {
        const ref = d.ref(ROOMS_PATH + '/' + currentRoom.id);
        const snap = await ref.once('value');
        const v = snap.val(); if (!v) return;
        const flat = (v.board && v.board.slice) ? v.board.slice() : new Array(BOARD_SIZE * BOARD_SIZE).fill(0);
        const idx = y * BOARD_SIZE + x;
        if (flat[idx]) return;
        flat[idx] = currentRoom.mySide;
        const nextTurn = currentRoom.mySide === 1 ? 2 : 1;
        const won = checkFlat(flat, x, y, currentRoom.mySide);
        await ref.update({
          board: flat,
          turn: nextTurn,
          winner: won ? currentRoom.mySide : 0,
          status: won ? 'finished' : 'playing',
          updatedAt: Date.now(),
        });
      } catch (e) { console.warn('sendMove failed', e); }
    }

    function checkFlat(flat, x, y, side) {
      const dirs = [[1,0],[0,1],[1,1],[1,-1]];
      for (const [dx,dy] of dirs) {
        let c = 1;
        for (let k = 1; k < 5; k++) { const nx=x+dx*k, ny=y+dy*k; if (nx<0||ny<0||nx>=BOARD_SIZE||ny>=BOARD_SIZE) break; if (flat[ny*BOARD_SIZE+nx]!==side) break; c++; }
        for (let k = 1; k < 5; k++) { const nx=x-dx*k, ny=y-dy*k; if (nx<0||ny<0||nx>=BOARD_SIZE||ny>=BOARD_SIZE) break; if (flat[ny*BOARD_SIZE+nx]!==side) break; c++; }
        if (c >= 5) return true;
      }
      return false;
    }

    async function setGuestReady(val) {
      const d = ready();
      if (!d || !currentRoom || currentRoom.role !== 'guest') return;
      try {
        await d.ref(ROOMS_PATH + '/' + currentRoom.id).update({
          guestReady: !!val,
          status: val ? 'ready' : 'joined',
          updatedAt: Date.now(),
        });
      } catch (e) { console.warn('setGuestReady failed', e); }
    }

    async function startMatch() {
      const d = ready();
      if (!d || !currentRoom || currentRoom.role !== 'host') return;
      try {
        await d.ref(ROOMS_PATH + '/' + currentRoom.id).update({
          status: 'playing',
          updatedAt: Date.now(),
        });
      } catch (e) { console.warn('startMatch failed', e); }
    }

    // Incoming-challenge subscription.  A host can create a targeted room and
    // this listener lets the target get an instant "challenge incoming" popup.
    let _challengeRef = null, _challengeCb = null, _seenChallenges = {};
    function startChallengeListener(onIncoming) {
      const d = ready(); if (!d || !profile || !profile.id) return;
      stopChallengeListener();
      _challengeRef = d.ref(ROOMS_PATH);
      _challengeCb = snap => {
        const v = snap.val(); if (!v) return;
        if (v.targetId !== profile.id) return;
        if (v.status !== 'waiting') return;
        if (_seenChallenges[v.code || snap.key]) return;
        _seenChallenges[v.code || snap.key] = true;
        try { onIncoming && onIncoming(v); } catch {}
      };
      _challengeRef.on('child_added', _challengeCb);
    }
    function stopChallengeListener() {
      if (_challengeRef && _challengeCb) { try { _challengeRef.off('child_added', _challengeCb); } catch {} }
      _challengeRef = null; _challengeCb = null;
    }

    async function recycleRoom() {
      const d = ready();
      if (!d || !currentRoom || currentRoom.role !== 'host') return;
      try {
        if (currentRoom) currentRoom._finalized = false;
        await d.ref(ROOMS_PATH + '/' + currentRoom.id).update({
          guestId: '', guestName: '', guestAvatar: '',
          guestReady: false,
          board: new Array(BOARD_SIZE * BOARD_SIZE).fill(0),
          turn: 1, winner: 0,
          status: 'waiting', resignedBy: 0,
          updatedAt: Date.now(),
        });
        currentRoom.started = false;
      } catch (e) { console.warn('recycleRoom failed', e); }
    }

    async function resignRoom() {
      const d = ready();
      if (!d || !currentRoom) return;
      try {
        const opponent = currentRoom.mySide === 1 ? 2 : 1;
        await d.ref(ROOMS_PATH + '/' + currentRoom.id).update({
          winner: opponent,
          status: 'finished',
          resignedBy: currentRoom.mySide,
          updatedAt: Date.now(),
        });
      } catch (e) { console.warn('resignRoom failed', e); }
    }

    function leaveRoom(silent) {
      roomListeners.forEach(l => { try { l.ref.off('value', l.cb); } catch {} });
      roomListeners = [];
      const old = currentRoom; currentRoom = null;
      if (!silent && old && old.role === 'host' && db) {
        try { db.ref(ROOMS_PATH + '/' + old.id).remove(); } catch {}
      }
    }

    return {
      ready, syncRanksFromCloud, pushLeader,
      registerPresence, touchPresence, fetchPresence,
      fetchOpenRooms, createRoom, joinRoom, cancelRoom,
      setGuestReady, startMatch,
      sendMove, leaveRoom, resign: resignRoom, recycleRoom,
      startChallengeListener, stopChallengeListener,
      _room: () => currentRoom,
      inRoom: () => !!currentRoom,
      mySide: () => currentRoom ? currentRoom.mySide : 0,
      wager: () => currentRoom ? (currentRoom.wager | 0) : 0,
    };
  })();

  async function refreshCloudRanks() {
    const ok = await Online.syncRanksFromCloud();
    if (ok) {
      const rankScreen = document.getElementById('sc-rank');
      if (rankScreen && rankScreen.classList.contains('active')) renderRanks();
    }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     FRIEND ONLINE LOBBY PANEL
     ═════════════════════════════════════════════════════════════════════════ */
  let _lobbyPanel = null;
  let _lobbyTimer = null;
  const WAGER_OPTIONS = [100, 1000, 10000];

  function closeFriendOnlinePanel() {
    if (_lobbyTimer) { clearInterval(_lobbyTimer); _lobbyTimer = null; }
    if (_lobbyPanel) { _lobbyPanel.remove(); _lobbyPanel = null; }
  }

  function openFriendOnlinePanel() {
    closeFriendOnlinePanel();
    const panel = document.createElement('div');
    _lobbyPanel = panel;
    panel.id = 'fa-lobby-panel';
    panel.style.cssText = 'position:fixed;inset:0;background:rgba(3,20,14,.88);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(8px);font-family:inherit;';
    panel.innerHTML =
      '<div style="background:linear-gradient(160deg,#0b4f3a 0%,#136b4a 50%,#1fb37f 100%);border-radius:24px;padding:22px 20px;width:min(94vw,460px);max-height:90vh;overflow-y:auto;box-shadow:0 30px 80px rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.2);color:#fff;">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
      + '  <div style="font-size:20px;font-weight:900;">🌐 Friend Online</div>'
      + '  <button id="fa-lb-close" style="border:none;background:rgba(255,255,255,.15);color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;font-weight:900;cursor:pointer;">✕</button>'
      + '</div>'
      + '<div style="font-size:12px;color:rgba(255,255,255,.78);margin-bottom:14px;">Create a room with a star wager, join an open room, or challenge an online player.</div>'
      + '<div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#ffd56b;margin-bottom:8px;">Create Room</div>'
      + '<input id="fa-lb-title" maxlength="24" placeholder="Room title (optional)" style="width:100%;box-sizing:border-box;padding:11px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.25);color:#fff;font-size:13px;margin-bottom:8px;outline:none;" />'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px;">'
      + WAGER_OPTIONS.map(w =>
          '<button class="fa-lb-create" data-wager="' + w + '" style="padding:14px 6px;border:none;border-radius:14px;background:linear-gradient(135deg,#ffd56b,#ff9e3c);color:#3a1a00;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.25);">'
          + '<div style="font-size:11px;opacity:.7;">WAGER</div>'
          + '<div style="font-size:17px;font-weight:900;">⭐ ' + w.toLocaleString() + '</div>'
          + '</button>'
        ).join('')
      + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">'
      + '  <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#ffd56b;">Open Rooms</div>'
      + '  <button id="fa-lb-refresh" style="border:none;background:rgba(255,255,255,.15);color:#fff;padding:4px 12px;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;">⟳ Refresh</button>'
      + '</div>'
      + '<div id="fa-lb-rooms" style="background:rgba(0,0,0,.22);border-radius:14px;padding:10px;min-height:60px;margin-bottom:18px;max-height:150px;overflow-y:auto;"></div>'
      + '<div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#ffd56b;margin-bottom:6px;">Online Players</div>'
      + '<div id="fa-lb-players" style="background:rgba(0,0,0,.22);border-radius:14px;padding:10px;min-height:60px;max-height:180px;overflow-y:auto;"></div>'
      + '<div style="text-align:center;font-size:11px;color:rgba(255,255,255,.55);margin-top:12px;">You: <b>' + escapeHtml(profile.nickname) + '</b> · ⭐ ' + (profile.stars | 0).toLocaleString() + '</div>'
      + '</div>';
    document.body.appendChild(panel);
    panel.querySelector('#fa-lb-close').addEventListener('click', closeFriendOnlinePanel);
    panel.querySelectorAll('.fa-lb-create').forEach(btn => {
      btn.addEventListener('click', async () => {
        const w = Number(btn.dataset.wager || 0);
        if ((profile.stars | 0) < w) { popupAlert('Not enough stars', 'You need ' + w.toLocaleString() + '⭐ to create this room. You currently have ' + (profile.stars|0).toLocaleString() + '⭐.'); return; }
        const titleEl = panel.querySelector('#fa-lb-title');
        const title = titleEl ? titleEl.value.trim() : '';
        const code = await Online.createRoom(w, null, title);
        if (code) openWaitingScreen(code, w, title);
      });
    });
    panel.querySelector('#fa-lb-refresh').addEventListener('click', refreshLobbyLists);
    refreshLobbyLists();
    _lobbyTimer = setInterval(refreshLobbyLists, 5000);
    Online.touchPresence();
  }

  async function refreshLobbyLists() {
    if (!_lobbyPanel) return;
    const [rooms, players] = await Promise.all([Online.fetchOpenRooms(), Online.fetchPresence()]);
    const roomsBox = _lobbyPanel.querySelector('#fa-lb-rooms');
    const playersBox = _lobbyPanel.querySelector('#fa-lb-players');
    if (roomsBox) {
      if (!rooms.length) {
        roomsBox.innerHTML = '<div style="text-align:center;padding:14px;color:rgba(255,255,255,.5);font-size:12px;">No open rooms yet</div>';
      } else {
        roomsBox.innerHTML = rooms.map(r =>
          '<div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;background:rgba(255,255,255,.08);margin-bottom:6px;">'
          + '  <div style="font-size:22px;">' + (r.hostAvatar || '🐻') + '</div>'
          + '  <div style="flex:1;min-width:0;">'
          + '    <div style="font-weight:800;font-size:13px;">' + escapeHtml(r.title || r.hostName) + (r.targetId ? ' <span style="font-size:10px;color:#ffd56b;">(invite)</span>' : '') + '</div>'
          + '    <div style="font-size:11px;color:rgba(255,255,255,.7);">' + escapeHtml(r.hostName) + ' · ⭐ ' + r.wager.toLocaleString() + '</div>'
          + '  </div>'
          + '  <button class="fa-lb-join" data-code="' + r.code + '" style="padding:8px 14px;border:none;border-radius:10px;background:linear-gradient(135deg,#ffd56b,#ff9e3c);color:#3a1a00;font-weight:900;cursor:pointer;font-size:12px;">Join</button>'
          + '</div>'
        ).join('');
        roomsBox.querySelectorAll('.fa-lb-join').forEach(b => {
          b.addEventListener('click', async () => {
            const ok = await Online.joinRoom(b.dataset.code);
            if (ok) closeFriendOnlinePanel();
          });
        });
      }
    }
    if (playersBox) {
      if (!players.length) {
        playersBox.innerHTML = '<div style="text-align:center;padding:14px;color:rgba(255,255,255,.5);font-size:12px;">No other players online</div>';
      } else {
        playersBox.innerHTML = players.map(p =>
          '<div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;background:rgba(255,255,255,.08);margin-bottom:6px;">'
          + '  <div style="position:relative;font-size:22px;">' + (p.avatar || '🐻') + '<span style="position:absolute;right:-2px;bottom:-2px;width:10px;height:10px;border-radius:50%;background:#35f59a;box-shadow:0 0 6px #35f59a;border:2px solid #0b4f3a;"></span></div>'
          + '  <div style="flex:1;min-width:0;">'
          + '    <div style="font-weight:800;font-size:13px;">' + escapeHtml(p.nickname) + '</div>'
          + '    <div style="font-size:11px;color:rgba(255,255,255,.7);">⭐ ' + p.stars.toLocaleString() + ' · 🏆 ' + p.wins + '</div>'
          + '  </div>'
          + '  <button class="fa-lb-chal" data-id="' + p.id + '" data-name="' + escapeHtml(p.nickname) + '" style="padding:8px 14px;border:none;border-radius:10px;background:rgba(255,255,255,.18);color:#fff;font-weight:800;cursor:pointer;font-size:12px;">Challenge</button>'
          + '</div>'
        ).join('');
        playersBox.querySelectorAll('.fa-lb-chal').forEach(b => {
          b.addEventListener('click', () => openChallengeDialog({ id: b.dataset.id, nickname: b.dataset.name }));
        });
      }
    }
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));
  }

  function openChallengeDialog(target) {
    const dlg = document.createElement('div');
    dlg.style.cssText = 'position:fixed;inset:0;background:rgba(3,20,14,.9);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(6px);';
    dlg.innerHTML =
      '<div style="background:linear-gradient(160deg,#0b4f3a,#1fb37f);border-radius:20px;padding:24px;width:min(90vw,340px);box-shadow:0 30px 80px rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.2);color:#fff;">'
      + '  <div style="font-size:18px;font-weight:900;text-align:center;margin-bottom:6px;">Challenge</div>'
      + '  <div style="text-align:center;font-size:13px;color:rgba(255,255,255,.8);margin-bottom:14px;">vs <b>' + escapeHtml(target.nickname) + '</b></div>'
      + '  <div style="font-size:11px;color:#ffd56b;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">Star Wager</div>'
      + '  <input id="fa-ch-wager" type="number" min="1" value="100" style="width:100%;padding:13px;border:none;border-radius:12px;background:rgba(255,255,255,.95);color:#0b4f3a;font-weight:900;font-size:16px;text-align:center;margin-bottom:14px;" />'
      + '  <div style="display:flex;gap:8px;">'
      + '    <button id="fa-ch-cancel" style="flex:1;padding:12px;border:none;border-radius:12px;background:rgba(255,255,255,.15);color:#fff;font-weight:800;cursor:pointer;">Cancel</button>'
      + '    <button id="fa-ch-send" style="flex:1;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#ffd56b,#ff9e3c);color:#3a1a00;font-weight:900;cursor:pointer;">Send</button>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(dlg);
    dlg.querySelector('#fa-ch-cancel').addEventListener('click', () => dlg.remove());
    dlg.querySelector('#fa-ch-send').addEventListener('click', async () => {
      const w = Math.max(1, Number(dlg.querySelector('#fa-ch-wager').value || 0));
      if ((profile.stars | 0) < w) { dlg.remove(); popupAlert('Not enough stars', 'You need ' + w.toLocaleString() + '⭐ to challenge this player. You currently have ' + (profile.stars|0).toLocaleString() + '⭐.'); return; }
      dlg.remove();
      const code = await Online.createRoom(w, target);
      if (code) openWaitingScreen(code, w, target);
    });
  }

  function openWaitingScreen(code, wager, target, title) {
    if (typeof target === 'string') { title = target; target = null; }
    closeFriendOnlinePanel();
    const wait = document.createElement('div');
    _lobbyPanel = wait;
    wait.id = 'fa-wait-panel';
    wait.style.cssText = 'position:fixed;inset:0;background:rgba(3,20,14,.92);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(10px);';
    wait.innerHTML =
      '<div style="background:linear-gradient(160deg,#0b4f3a,#1fb37f);border-radius:24px;padding:32px 26px;width:min(92vw,380px);box-shadow:0 30px 80px rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.2);color:#fff;text-align:center;">'
      + '  <div style="font-size:22px;font-weight:900;margin-bottom:6px;">' + escapeHtml(title || 'Waiting for Opponent') + '</div>'
      + '  <div style="font-size:12px;color:rgba(255,255,255,.75);margin-bottom:20px;">' + (target ? ('Challenge sent to <b>' + escapeHtml(target.nickname) + '</b>') : 'Your room is now visible to other players') + '</div>'
      + '  <div style="display:inline-block;padding:18px 28px;border-radius:18px;background:rgba(0,0,0,.28);margin-bottom:16px;">'
      + '    <div style="font-size:11px;color:#ffd56b;font-weight:800;letter-spacing:.12em;">ROOM CODE</div>'
      + '    <div style="font-size:30px;font-weight:900;letter-spacing:.22em;color:#ffd56b;">' + code + '</div>'
      + '    <div style="font-size:13px;color:rgba(255,255,255,.85);margin-top:6px;">⭐ ' + (wager || 0).toLocaleString() + ' wager</div>'
      + '  </div>'
      + '  <div style="margin:10px auto 18px;width:48px;height:48px;border:4px solid rgba(255,255,255,.2);border-top-color:#ffd56b;border-radius:50%;animation:fa-spin 1s linear infinite;"></div>'
      + '  <button id="fa-wait-cancel" style="width:100%;padding:13px;border:none;border-radius:14px;background:rgba(255,255,255,.15);color:#fff;font-weight:800;cursor:pointer;">Cancel</button>'
      + '</div>'
      + '<style>@keyframes fa-spin{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(wait);
    wait.querySelector('#fa-wait-cancel').addEventListener('click', async () => {
      await Online.cancelRoom();
      closeFriendOnlinePanel();
    });
  }

  let _readyPanel = null;
  function closeRoomReadyScreen() {
    if (_readyPanel && _readyPanel.parentNode) _readyPanel.parentNode.removeChild(_readyPanel);
    _readyPanel = null;
  }
  function openRoomReadyScreen(v, role) {
    // Host side while guest hasn't joined yet stays in waiting panel
    if (role === 'host' && !v.guestId) return;
    closeFriendOnlinePanel();
    if (_readyPanel) {
      // Just update state
      updateRoomReadyScreen(v, role);
      return;
    }
    const p = document.createElement('div');
    _readyPanel = p;
    p.style.cssText = 'position:fixed;inset:0;background:rgba(3,20,14,.92);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(10px);font-family:inherit;';
    p.innerHTML =
      '<div style="background:linear-gradient(160deg,#0b4f3a,#136b4a 50%,#1fb37f);border-radius:24px;padding:26px 22px;width:min(94vw,400px);box-shadow:0 30px 80px rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.2);color:#fff;text-align:center;">'
      + '  <div id="fa-ready-title" style="font-size:22px;font-weight:900;margin-bottom:4px;"></div>'
      + '  <div id="fa-ready-sub" style="font-size:12px;color:rgba(255,255,255,.75);margin-bottom:18px;"></div>'
      + '  <div style="display:flex;align-items:center;justify-content:space-around;gap:12px;margin-bottom:18px;">'
      + '    <div style="flex:1;padding:14px;border-radius:14px;background:rgba(0,0,0,.28);">'
      + '      <div id="fa-ready-hostAva" style="font-size:34px;">🐻</div>'
      + '      <div id="fa-ready-hostName" style="font-weight:900;margin-top:4px;"></div>'
      + '      <div style="font-size:10px;color:#ffd56b;">HOST</div>'
      + '    </div>'
      + '    <div style="font-weight:900;font-size:18px;color:#ffd56b;">VS</div>'
      + '    <div style="flex:1;padding:14px;border-radius:14px;background:rgba(0,0,0,.28);">'
      + '      <div id="fa-ready-guestAva" style="font-size:34px;">🐻</div>'
      + '      <div id="fa-ready-guestName" style="font-weight:900;margin-top:4px;"></div>'
      + '      <div id="fa-ready-guestTag" style="font-size:10px;color:#9cf0c4;">GUEST</div>'
      + '    </div>'
      + '  </div>'
      + '  <div id="fa-ready-wager" style="font-size:13px;margin-bottom:14px;">⭐ 0 wager</div>'
      + '  <button id="fa-ready-action" style="width:100%;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#ffd56b,#ff9e3c);color:#3a1a00;font-weight:900;font-size:15px;cursor:pointer;margin-bottom:8px;"></button>'
      + '  <button id="fa-ready-cancel" style="width:100%;padding:11px;border:none;border-radius:14px;background:rgba(255,255,255,.15);color:#fff;font-weight:800;cursor:pointer;"></button>'
      + '</div>';
    document.body.appendChild(p);
    p.querySelector('#fa-ready-cancel').addEventListener('click', async () => {
      if (role === 'host') { try { await Online.cancelRoom(); } catch {} }
      else { try { Online.leaveRoom(); } catch {} }
      closeRoomReadyScreen();
    });
    p.querySelector('#fa-ready-action').addEventListener('click', async () => {
      if (role === 'guest') { await Online.setGuestReady(true); }
      else if (role === 'host') { if (v.guestReady || (currentRoomState && currentRoomState.guestReady)) await Online.startMatch(); else toast('Waiting for opponent ready'); }
    });
    updateRoomReadyScreen(v, role);
  }
  let currentRoomState = null;
  function updateRoomReadyScreen(v, role) {
    currentRoomState = v;
    if (!_readyPanel) return;
    const $q = s => _readyPanel.querySelector(s);
    $q('#fa-ready-hostAva').textContent = v.hostAvatar || '🐻';
    $q('#fa-ready-hostName').textContent = v.hostName || 'Host';
    $q('#fa-ready-guestAva').textContent = v.guestAvatar || '❔';
    $q('#fa-ready-guestName').textContent = v.guestName || tr('waiting') || 'Waiting…';
    $q('#fa-ready-wager').textContent = '⭐ ' + Number(v.wager || 0).toLocaleString() + ' ' + (tr('wager') || 'wager');
    $q('#fa-ready-title').textContent = v.title || (tr('room') || 'Room') + ' ' + (v.code || '');
    $q('#fa-ready-cancel').textContent = (role === 'host' ? (tr('cancel_room') || 'Cancel room') : (tr('leave_room') || 'Leave room'));
    const actionBtn = $q('#fa-ready-action');
    if (role === 'guest') {
      if (v.guestReady) { $q('#fa-ready-sub').textContent = tr('waiting_host_start') || 'Waiting for host to start…'; actionBtn.textContent = tr('ready_sent') || '✓ Ready (waiting host)'; actionBtn.disabled = true; actionBtn.style.opacity = '.6'; }
      else { $q('#fa-ready-sub').textContent = tr('press_ready') || 'Press READY when you are set'; actionBtn.textContent = tr('ready') || 'READY'; actionBtn.disabled = false; actionBtn.style.opacity = '1'; }
    } else {
      if (v.guestReady) { $q('#fa-ready-sub').textContent = tr('guest_ready') || 'Opponent is ready! Start the match?'; actionBtn.textContent = tr('start') || '▶ START'; actionBtn.disabled = false; actionBtn.style.opacity = '1'; }
      else { $q('#fa-ready-sub').textContent = tr('waiting_guest_ready') || 'Waiting for opponent to ready up…'; actionBtn.textContent = tr('waiting_ready') || 'Waiting…'; actionBtn.disabled = true; actionBtn.style.opacity = '.6'; }
    }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     BOOT
     ═════════════════════════════════════════════════════════════════════════ */
  function boot() {
    (function ensureViewport(){
      try{
        let vp = document.querySelector('meta[name="viewport"]');
        if(!vp){ vp = document.createElement('meta'); vp.name='viewport'; document.head.appendChild(vp); }
        vp.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
        const addMeta = (name, content) => {
          if(document.querySelector('meta[name="'+name+'"]')) return;
          const m=document.createElement('meta'); m.name=name; m.content=content; document.head.appendChild(m);
        };
        addMeta('mobile-web-app-capable','yes');
        addMeta('apple-mobile-web-app-capable','yes');
        addMeta('apple-mobile-web-app-status-bar-style','black-translucent');
        addMeta('theme-color','#0b4f3a');
        const hideBar = () => { try{ window.scrollTo(0,1); }catch{} };
        setTimeout(hideBar, 100);
        setTimeout(hideBar, 500);
        window.addEventListener('load', hideBar);
        window.addEventListener('orientationchange', () => setTimeout(hideBar, 300));
      }catch{}
    })();
    (function globalTapSound(){
      const handler = (e) => {
        try {
          const t = e.target;
          if (t && t.tagName === 'CANVAS') return;
          playTap();
        } catch {}
      };
      document.addEventListener('pointerdown', handler, true);
    })();
    seedBotsIfNeeded();
    persist();
    reflectSettings();
    syncHome();
    show('sc-home');
    requestAnimationFrame(resize);
    const onlineBoot = () => {
      if (!Online.ready()) { setTimeout(onlineBoot, 800); return; }
      Online.pushLeader();
      Online.registerPresence();
      Online.startChallengeListener(v => {
        // Ignore if we're already in a game/room
        if (Online.inRoom()) return;
        const gs = $('#sc-game');
        if (gs && gs.classList.contains('active') && !game.gameOver) return;
        openConfirm(
          '⚔️ Challenge Incoming',
          (v.hostName || 'Someone') + ' challenges you · ⭐ ' + Number(v.wager || 0).toLocaleString() + ' wager',
          async () => {
            const ok = await Online.joinRoom(v.code);
            if (!ok) toast('Could not join challenge');
          }
        );
      });
      refreshCloudRanks();
      setInterval(() => { Online.touchPresence(); }, 30000);
      setInterval(refreshCloudRanks, 15000);
      setInterval(() => { Online.pushLeader(); }, 60000);
    };
    setTimeout(onlineBoot, 400);
    setTimeout(() => {
      document.querySelectorAll('[data-action="play-pvp"]').forEach(b => {
        const clone = b.cloneNode(true);
        b.parentNode.replaceChild(clone, b);
        clone.addEventListener('click', () => { try { playTap(); } catch {} openFriendOnlinePanel(); });
      });
    }, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* ═══ APPENDIX — extended reference data and helpers ═══ */
(function Appendix(){
  "use strict";
  if (typeof window === "undefined") return;
  var A = window.__FA_APPENDIX__ = {};

  A.OPENINGS = [
    { id: 1, name: "Direct", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 2, name: "Indirect", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 3, name: "Knight", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 4, name: "Cannon", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 5, name: "Flower", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 6, name: "Bird", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 7, name: "Monkey", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 8, name: "Moon", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 9, name: "Star", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 10, name: "Mountain", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 11, name: "Valley", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 12, name: "River", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 13, name: "Cloud", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 14, name: "Tiger", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 15, name: "Dragon", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 16, name: "Lotus", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 17, name: "Peony", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 18, name: "Plum", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 19, name: "Bamboo", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 20, name: "Pine", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 21, name: "Storm", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 22, name: "Wind", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 23, name: "Rain", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 24, name: "Snow", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 25, name: "Frost", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 26, name: "Dawn", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 27, name: "Dusk", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 28, name: "Noon", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 29, name: "Night", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 30, name: "Eagle", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 31, name: "Falcon", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 32, name: "Crane", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 33, name: "Swan", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 34, name: "Wolf", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 35, name: "Fox", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 36, name: "Bear", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 37, name: "Deer", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 38, name: "Hare", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 39, name: "Carp", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 40, name: "Koi", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 41, name: "Pearl", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 42, name: "Jade", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 43, name: "Ruby", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 44, name: "Coral", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 45, name: "Amber", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 46, name: "Ivory", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 47, name: "Ebony", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 48, name: "Silver", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 49, name: "Gold", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8]] },
    { id: 50, name: "Iron", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8]] },
  ];

  A.PATTERNS = [
    { id: 1, name: "OpenFour", value: 100000 },
    { id: 2, name: "ClosedFour", value: 10000 },
    { id: 3, name: "OpenThree", value: 5000 },
    { id: 4, name: "ClosedThree", value: 500 },
    { id: 5, name: "OpenTwo", value: 200 },
    { id: 6, name: "ClosedTwo", value: 50 },
    { id: 7, name: "DoubleThree", value: 20000 },
    { id: 8, name: "DoubleFour", value: 50000 },
    { id: 9, name: "FourThree", value: 30000 },
    { id: 10, name: "Gap", value: 80 },
    { id: 11, name: "Split", value: 400 },
    { id: 12, name: "SplitThree", value: 400 },
    { id: 13, name: "Triangle", value: 300 },
    { id: 14, name: "DiagThree", value: 5000 },
    { id: 15, name: "Block", value: 0 },
    { id: 16, name: "Deadlock", value: 0 },
    { id: 17, name: "StarCenter", value: 100 },
    { id: 18, name: "EdgeStart", value: 20 },
    { id: 19, name: "CornerStart", value: 10 },
    { id: 20, name: "CrossPair", value: 250 },
  ];

  A.BOARD_ZONES = [
    { x: 0, y: 0, weight: 0 },
    { x: 0, y: 1, weight: 1 },
    { x: 0, y: 2, weight: 2 },
    { x: 0, y: 3, weight: 3 },
    { x: 0, y: 4, weight: 4 },
    { x: 0, y: 5, weight: 5 },
    { x: 0, y: 6, weight: 6 },
    { x: 0, y: 7, weight: 7 },
    { x: 0, y: 8, weight: 6 },
    { x: 0, y: 9, weight: 5 },
    { x: 0, y: 10, weight: 4 },
    { x: 0, y: 11, weight: 3 },
    { x: 0, y: 12, weight: 2 },
    { x: 0, y: 13, weight: 1 },
    { x: 0, y: 14, weight: 0 },
    { x: 1, y: 0, weight: 1 },
    { x: 1, y: 1, weight: 2 },
    { x: 1, y: 2, weight: 3 },
    { x: 1, y: 3, weight: 4 },
    { x: 1, y: 4, weight: 5 },
    { x: 1, y: 5, weight: 6 },
    { x: 1, y: 6, weight: 7 },
    { x: 1, y: 7, weight: 8 },
    { x: 1, y: 8, weight: 7 },
    { x: 1, y: 9, weight: 6 },
    { x: 1, y: 10, weight: 5 },
    { x: 1, y: 11, weight: 4 },
    { x: 1, y: 12, weight: 3 },
    { x: 1, y: 13, weight: 2 },
    { x: 1, y: 14, weight: 1 },
    { x: 2, y: 0, weight: 2 },
    { x: 2, y: 1, weight: 3 },
    { x: 2, y: 2, weight: 4 },
    { x: 2, y: 3, weight: 5 },
    { x: 2, y: 4, weight: 6 },
    { x: 2, y: 5, weight: 7 },
    { x: 2, y: 6, weight: 8 },
    { x: 2, y: 7, weight: 9 },
    { x: 2, y: 8, weight: 8 },
    { x: 2, y: 9, weight: 7 },
    { x: 2, y: 10, weight: 6 },
    { x: 2, y: 11, weight: 5 },
    { x: 2, y: 12, weight: 4 },
    { x: 2, y: 13, weight: 3 },
    { x: 2, y: 14, weight: 2 },
    { x: 3, y: 0, weight: 3 },
    { x: 3, y: 1, weight: 4 },
    { x: 3, y: 2, weight: 5 },
    { x: 3, y: 3, weight: 6 },
    { x: 3, y: 4, weight: 7 },
    { x: 3, y: 5, weight: 8 },
    { x: 3, y: 6, weight: 9 },
    { x: 3, y: 7, weight: 10 },
    { x: 3, y: 8, weight: 9 },
    { x: 3, y: 9, weight: 8 },
    { x: 3, y: 10, weight: 7 },
    { x: 3, y: 11, weight: 6 },
    { x: 3, y: 12, weight: 5 },
    { x: 3, y: 13, weight: 4 },
    { x: 3, y: 14, weight: 3 },
    { x: 4, y: 0, weight: 4 },
    { x: 4, y: 1, weight: 5 },
    { x: 4, y: 2, weight: 6 },
    { x: 4, y: 3, weight: 7 },
    { x: 4, y: 4, weight: 8 },
    { x: 4, y: 5, weight: 9 },
    { x: 4, y: 6, weight: 10 },
    { x: 4, y: 7, weight: 11 },
    { x: 4, y: 8, weight: 10 },
    { x: 4, y: 9, weight: 9 },
    { x: 4, y: 10, weight: 8 },
    { x: 4, y: 11, weight: 7 },
    { x: 4, y: 12, weight: 6 },
    { x: 4, y: 13, weight: 5 },
    { x: 4, y: 14, weight: 4 },
    { x: 5, y: 0, weight: 5 },
    { x: 5, y: 1, weight: 6 },
    { x: 5, y: 2, weight: 7 },
    { x: 5, y: 3, weight: 8 },
    { x: 5, y: 4, weight: 9 },
    { x: 5, y: 5, weight: 10 },
    { x: 5, y: 6, weight: 11 },
    { x: 5, y: 7, weight: 12 },
    { x: 5, y: 8, weight: 11 },
    { x: 5, y: 9, weight: 10 },
    { x: 5, y: 10, weight: 9 },
    { x: 5, y: 11, weight: 8 },
    { x: 5, y: 12, weight: 7 },
    { x: 5, y: 13, weight: 6 },
    { x: 5, y: 14, weight: 5 },
    { x: 6, y: 0, weight: 6 },
    { x: 6, y: 1, weight: 7 },
    { x: 6, y: 2, weight: 8 },
    { x: 6, y: 3, weight: 9 },
    { x: 6, y: 4, weight: 10 },
    { x: 6, y: 5, weight: 11 },
    { x: 6, y: 6, weight: 12 },
    { x: 6, y: 7, weight: 13 },
    { x: 6, y: 8, weight: 12 },
    { x: 6, y: 9, weight: 11 },
    { x: 6, y: 10, weight: 10 },
    { x: 6, y: 11, weight: 9 },
    { x: 6, y: 12, weight: 8 },
    { x: 6, y: 13, weight: 7 },
    { x: 6, y: 14, weight: 6 },
    { x: 7, y: 0, weight: 7 },
    { x: 7, y: 1, weight: 8 },
    { x: 7, y: 2, weight: 9 },
    { x: 7, y: 3, weight: 10 },
    { x: 7, y: 4, weight: 11 },
    { x: 7, y: 5, weight: 12 },
    { x: 7, y: 6, weight: 13 },
    { x: 7, y: 7, weight: 14 },
    { x: 7, y: 8, weight: 13 },
    { x: 7, y: 9, weight: 12 },
    { x: 7, y: 10, weight: 11 },
    { x: 7, y: 11, weight: 10 },
    { x: 7, y: 12, weight: 9 },
    { x: 7, y: 13, weight: 8 },
    { x: 7, y: 14, weight: 7 },
    { x: 8, y: 0, weight: 6 },
    { x: 8, y: 1, weight: 7 },
    { x: 8, y: 2, weight: 8 },
    { x: 8, y: 3, weight: 9 },
    { x: 8, y: 4, weight: 10 },
    { x: 8, y: 5, weight: 11 },
    { x: 8, y: 6, weight: 12 },
    { x: 8, y: 7, weight: 13 },
    { x: 8, y: 8, weight: 12 },
    { x: 8, y: 9, weight: 11 },
    { x: 8, y: 10, weight: 10 },
    { x: 8, y: 11, weight: 9 },
    { x: 8, y: 12, weight: 8 },
    { x: 8, y: 13, weight: 7 },
    { x: 8, y: 14, weight: 6 },
    { x: 9, y: 0, weight: 5 },
    { x: 9, y: 1, weight: 6 },
    { x: 9, y: 2, weight: 7 },
    { x: 9, y: 3, weight: 8 },
    { x: 9, y: 4, weight: 9 },
    { x: 9, y: 5, weight: 10 },
    { x: 9, y: 6, weight: 11 },
    { x: 9, y: 7, weight: 12 },
    { x: 9, y: 8, weight: 11 },
    { x: 9, y: 9, weight: 10 },
    { x: 9, y: 10, weight: 9 },
    { x: 9, y: 11, weight: 8 },
    { x: 9, y: 12, weight: 7 },
    { x: 9, y: 13, weight: 6 },
    { x: 9, y: 14, weight: 5 },
    { x: 10, y: 0, weight: 4 },
    { x: 10, y: 1, weight: 5 },
    { x: 10, y: 2, weight: 6 },
    { x: 10, y: 3, weight: 7 },
    { x: 10, y: 4, weight: 8 },
    { x: 10, y: 5, weight: 9 },
    { x: 10, y: 6, weight: 10 },
    { x: 10, y: 7, weight: 11 },
    { x: 10, y: 8, weight: 10 },
    { x: 10, y: 9, weight: 9 },
    { x: 10, y: 10, weight: 8 },
    { x: 10, y: 11, weight: 7 },
    { x: 10, y: 12, weight: 6 },
    { x: 10, y: 13, weight: 5 },
    { x: 10, y: 14, weight: 4 },
    { x: 11, y: 0, weight: 3 },
    { x: 11, y: 1, weight: 4 },
    { x: 11, y: 2, weight: 5 },
    { x: 11, y: 3, weight: 6 },
    { x: 11, y: 4, weight: 7 },
    { x: 11, y: 5, weight: 8 },
    { x: 11, y: 6, weight: 9 },
    { x: 11, y: 7, weight: 10 },
    { x: 11, y: 8, weight: 9 },
    { x: 11, y: 9, weight: 8 },
    { x: 11, y: 10, weight: 7 },
    { x: 11, y: 11, weight: 6 },
    { x: 11, y: 12, weight: 5 },
    { x: 11, y: 13, weight: 4 },
    { x: 11, y: 14, weight: 3 },
    { x: 12, y: 0, weight: 2 },
    { x: 12, y: 1, weight: 3 },
    { x: 12, y: 2, weight: 4 },
    { x: 12, y: 3, weight: 5 },
    { x: 12, y: 4, weight: 6 },
    { x: 12, y: 5, weight: 7 },
    { x: 12, y: 6, weight: 8 },
    { x: 12, y: 7, weight: 9 },
    { x: 12, y: 8, weight: 8 },
    { x: 12, y: 9, weight: 7 },
    { x: 12, y: 10, weight: 6 },
    { x: 12, y: 11, weight: 5 },
    { x: 12, y: 12, weight: 4 },
    { x: 12, y: 13, weight: 3 },
    { x: 12, y: 14, weight: 2 },
    { x: 13, y: 0, weight: 1 },
    { x: 13, y: 1, weight: 2 },
    { x: 13, y: 2, weight: 3 },
    { x: 13, y: 3, weight: 4 },
    { x: 13, y: 4, weight: 5 },
    { x: 13, y: 5, weight: 6 },
    { x: 13, y: 6, weight: 7 },
    { x: 13, y: 7, weight: 8 },
    { x: 13, y: 8, weight: 7 },
    { x: 13, y: 9, weight: 6 },
    { x: 13, y: 10, weight: 5 },
    { x: 13, y: 11, weight: 4 },
    { x: 13, y: 12, weight: 3 },
    { x: 13, y: 13, weight: 2 },
    { x: 13, y: 14, weight: 1 },
    { x: 14, y: 0, weight: 0 },
    { x: 14, y: 1, weight: 1 },
    { x: 14, y: 2, weight: 2 },
    { x: 14, y: 3, weight: 3 },
    { x: 14, y: 4, weight: 4 },
    { x: 14, y: 5, weight: 5 },
    { x: 14, y: 6, weight: 6 },
    { x: 14, y: 7, weight: 7 },
    { x: 14, y: 8, weight: 6 },
    { x: 14, y: 9, weight: 5 },
    { x: 14, y: 10, weight: 4 },
    { x: 14, y: 11, weight: 3 },
    { x: 14, y: 12, weight: 2 },
    { x: 14, y: 13, weight: 1 },
    { x: 14, y: 14, weight: 0 },
  ];

  A.POSITION_VALUES = [
    [0,1,2,3,4,5,6,7,6,5,4,3,2,1,0],
    [1,2,3,4,5,6,7,8,7,6,5,4,3,2,1],
    [2,3,4,5,6,7,8,9,8,7,6,5,4,3,2],
    [3,4,5,6,7,8,9,10,9,8,7,6,5,4,3],
    [4,5,6,7,8,9,10,11,10,9,8,7,6,5,4],
    [5,6,7,8,9,10,11,12,11,10,9,8,7,6,5],
    [6,7,8,9,10,11,12,13,12,11,10,9,8,7,6],
    [7,8,9,10,11,12,13,14,13,12,11,10,9,8,7],
    [6,7,8,9,10,11,12,13,12,11,10,9,8,7,6],
    [5,6,7,8,9,10,11,12,11,10,9,8,7,6,5],
    [4,5,6,7,8,9,10,11,10,9,8,7,6,5,4],
    [3,4,5,6,7,8,9,10,9,8,7,6,5,4,3],
    [2,3,4,5,6,7,8,9,8,7,6,5,4,3,2],
    [1,2,3,4,5,6,7,8,7,6,5,4,3,2,1],
    [0,1,2,3,4,5,6,7,6,5,4,3,2,1,0],
  ];

  A.THEMES = [
    { id: 1, name: "Emerald", from: "#0b4f3a", to: "#1fb37f" },
    { id: 2, name: "Forest", from: "#0a3d2a", to: "#2ea66c" },
    { id: 3, name: "Jade", from: "#134e3b", to: "#30c98a" },
    { id: 4, name: "Mint", from: "#0d5a43", to: "#3fd79d" },
    { id: 5, name: "Pine", from: "#08402d", to: "#1ca073" },
    { id: 6, name: "Olive", from: "#3a4a1f", to: "#9cc93a" },
    { id: 7, name: "Teal", from: "#0a3a40", to: "#1fa0aa" },
    { id: 8, name: "Sage", from: "#2c4a3a", to: "#7fbf8f" },
    { id: 9, name: "Lime", from: "#2a4a10", to: "#8fd02a" },
    { id: 10, name: "Fern", from: "#1a3e28", to: "#4fba6e" },
    { id: 11, name: "Moss", from: "#243d1f", to: "#6ab24a" },
    { id: 12, name: "Kelp", from: "#0b3d36", to: "#2fa893" },
    { id: 13, name: "Spruce", from: "#0f3a2e", to: "#2db07a" },
    { id: 14, name: "Cedar", from: "#1a3820", to: "#6cb052" },
    { id: 15, name: "Aqua", from: "#0a3d4a", to: "#2fb0c7" },
    { id: 16, name: "Ocean", from: "#0a2e4a", to: "#2f7fbc" },
    { id: 17, name: "Lagoon", from: "#0a4a4a", to: "#2fbcbc" },
    { id: 18, name: "Sunset", from: "#4a1a0a", to: "#ff7f3a" },
    { id: 19, name: "Rose", from: "#4a0a2e", to: "#ff3f8f" },
    { id: 20, name: "Lilac", from: "#3a0a4a", to: "#bf3fff" },
    { id: 21, name: "Amber", from: "#4a2f0a", to: "#ffaa3f" },
    { id: 22, name: "Cream", from: "#4a3a1a", to: "#ffd57f" },
    { id: 23, name: "Ash", from: "#2a2a2a", to: "#7f7f7f" },
    { id: 24, name: "Slate", from: "#1a2a3a", to: "#4f6f8f" },
    { id: 25, name: "Dusk", from: "#2a1a4a", to: "#6f4fbf" },
  ];

  A.SOUNDS = [
    { id: 1, key: "tap", freq: 200, duration: 0.05 },
    { id: 2, key: "place_black", freq: 220, duration: 0.06 },
    { id: 3, key: "place_white", freq: 240, duration: 0.07 },
    { id: 4, key: "win", freq: 260, duration: 0.08 },
    { id: 5, key: "lose", freq: 280, duration: 0.09 },
    { id: 6, key: "draw", freq: 300, duration: 0.10 },
    { id: 7, key: "hint", freq: 320, duration: 0.11 },
    { id: 8, key: "coin", freq: 340, duration: 0.12 },
    { id: 9, key: "level_up", freq: 360, duration: 0.13 },
    { id: 10, key: "achievement", freq: 380, duration: 0.14 },
    { id: 11, key: "daily", freq: 400, duration: 0.15 },
    { id: 12, key: "open_shop", freq: 420, duration: 0.16 },
    { id: 13, key: "close_shop", freq: 440, duration: 0.17 },
    { id: 14, key: "select", freq: 460, duration: 0.18 },
    { id: 15, key: "error", freq: 480, duration: 0.19 },
    { id: 16, key: "undo", freq: 500, duration: 0.20 },
    { id: 17, key: "redo", freq: 520, duration: 0.21 },
    { id: 18, key: "warn", freq: 540, duration: 0.22 },
    { id: 19, key: "countdown", freq: 560, duration: 0.23 },
    { id: 20, key: "tick", freq: 580, duration: 0.24 },
    { id: 21, key: "tock", freq: 600, duration: 0.25 },
    { id: 22, key: "bell", freq: 620, duration: 0.26 },
    { id: 23, key: "chime", freq: 640, duration: 0.27 },
    { id: 24, key: "whoosh", freq: 660, duration: 0.28 },
    { id: 25, key: "pop", freq: 680, duration: 0.29 },
    { id: 26, key: "click", freq: 700, duration: 0.30 },
    { id: 27, key: "clack", freq: 720, duration: 0.31 },
    { id: 28, key: "clink", freq: 740, duration: 0.32 },
    { id: 29, key: "ding", freq: 760, duration: 0.33 },
    { id: 30, key: "drum", freq: 780, duration: 0.34 },
  ];

  A.GAME_MODES = [
    { id: 1, name: "Classic", time: 60 },
    { id: 2, name: "Blitz", time: 120 },
    { id: 3, name: "Rapid", time: 180 },
    { id: 4, name: "Bullet", time: 240 },
    { id: 5, name: "Puzzle", time: 300 },
    { id: 6, name: "Tutorial", time: 360 },
    { id: 7, name: "Daily", time: 420 },
    { id: 8, name: "Tournament", time: 480 },
    { id: 9, name: "Ranked", time: 540 },
    { id: 10, name: "Casual", time: 600 },
    { id: 11, name: "Private", time: 660 },
    { id: 12, name: "Custom", time: 720 },
    { id: 13, name: "Handicap", time: 780 },
    { id: 14, name: "Teaching", time: 840 },
    { id: 15, name: "Analysis", time: 900 },
  ];

  A.TUTORIAL = [
    { step: 1, title: "Welcome to Omok", body: "Step 1: learn to handle welcome to omok with patience and precision." },
    { step: 2, title: "Place Your First Stone", body: "Step 2: learn to handle place your first stone with patience and precision." },
    { step: 3, title: "Understand Lines", body: "Step 3: learn to handle understand lines with patience and precision." },
    { step: 4, title: "Form Open Two", body: "Step 4: learn to handle form open two with patience and precision." },
    { step: 5, title: "Form Open Three", body: "Step 5: learn to handle form open three with patience and precision." },
    { step: 6, title: "Block Opponent", body: "Step 6: learn to handle block opponent with patience and precision." },
    { step: 7, title: "Form Open Four", body: "Step 7: learn to handle form open four with patience and precision." },
    { step: 8, title: "Win With Five", body: "Step 8: learn to handle win with five with patience and precision." },
    { step: 9, title: "Avoid Double Three", body: "Step 9: learn to handle avoid double three with patience and precision." },
    { step: 10, title: "Use Diagonals", body: "Step 10: learn to handle use diagonals with patience and precision." },
    { step: 11, title: "Defend Corners", body: "Step 11: learn to handle defend corners with patience and precision." },
    { step: 12, title: "Control Center", body: "Step 12: learn to handle control center with patience and precision." },
    { step: 13, title: "Read Threats", body: "Step 13: learn to handle read threats with patience and precision." },
    { step: 14, title: "Count Tempo", body: "Step 14: learn to handle count tempo with patience and precision." },
    { step: 15, title: "Plan Ahead", body: "Step 15: learn to handle plan ahead with patience and precision." },
    { step: 16, title: "Endgame Theory", body: "Step 16: learn to handle endgame theory with patience and precision." },
    { step: 17, title: "Practice Daily", body: "Step 17: learn to handle practice daily with patience and precision." },
    { step: 18, title: "Review Games", body: "Step 18: learn to handle review games with patience and precision." },
    { step: 19, title: "Climb Ranks", body: "Step 19: learn to handle climb ranks with patience and precision." },
    { step: 20, title: "Become Master", body: "Step 20: learn to handle become master with patience and precision." },
  ];

  A.MISSION_BANK = [
    { id: 2000+0, title: "Mission 1", target: 1, reward: 25 },
    { id: 2000+1, title: "Mission 2", target: 2, reward: 50 },
    { id: 2000+2, title: "Mission 3", target: 3, reward: 75 },
    { id: 2000+3, title: "Mission 4", target: 4, reward: 100 },
    { id: 2000+4, title: "Mission 5", target: 5, reward: 125 },
    { id: 2000+5, title: "Mission 6", target: 6, reward: 150 },
    { id: 2000+6, title: "Mission 7", target: 7, reward: 175 },
    { id: 2000+7, title: "Mission 8", target: 8, reward: 200 },
    { id: 2000+8, title: "Mission 9", target: 9, reward: 225 },
    { id: 2000+9, title: "Mission 10", target: 10, reward: 250 },
    { id: 2000+10, title: "Mission 11", target: 1, reward: 275 },
    { id: 2000+11, title: "Mission 12", target: 2, reward: 300 },
    { id: 2000+12, title: "Mission 13", target: 3, reward: 325 },
    { id: 2000+13, title: "Mission 14", target: 4, reward: 350 },
    { id: 2000+14, title: "Mission 15", target: 5, reward: 375 },
    { id: 2000+15, title: "Mission 16", target: 6, reward: 400 },
    { id: 2000+16, title: "Mission 17", target: 7, reward: 425 },
    { id: 2000+17, title: "Mission 18", target: 8, reward: 450 },
    { id: 2000+18, title: "Mission 19", target: 9, reward: 475 },
    { id: 2000+19, title: "Mission 20", target: 10, reward: 500 },
    { id: 2000+20, title: "Mission 21", target: 1, reward: 525 },
    { id: 2000+21, title: "Mission 22", target: 2, reward: 550 },
    { id: 2000+22, title: "Mission 23", target: 3, reward: 575 },
    { id: 2000+23, title: "Mission 24", target: 4, reward: 600 },
    { id: 2000+24, title: "Mission 25", target: 5, reward: 625 },
    { id: 2000+25, title: "Mission 26", target: 6, reward: 650 },
    { id: 2000+26, title: "Mission 27", target: 7, reward: 675 },
    { id: 2000+27, title: "Mission 28", target: 8, reward: 700 },
    { id: 2000+28, title: "Mission 29", target: 9, reward: 725 },
    { id: 2000+29, title: "Mission 30", target: 10, reward: 750 },
    { id: 2000+30, title: "Mission 31", target: 1, reward: 775 },
    { id: 2000+31, title: "Mission 32", target: 2, reward: 800 },
    { id: 2000+32, title: "Mission 33", target: 3, reward: 825 },
    { id: 2000+33, title: "Mission 34", target: 4, reward: 850 },
    { id: 2000+34, title: "Mission 35", target: 5, reward: 875 },
    { id: 2000+35, title: "Mission 36", target: 6, reward: 900 },
    { id: 2000+36, title: "Mission 37", target: 7, reward: 925 },
    { id: 2000+37, title: "Mission 38", target: 8, reward: 950 },
    { id: 2000+38, title: "Mission 39", target: 9, reward: 975 },
    { id: 2000+39, title: "Mission 40", target: 10, reward: 1000 },
    { id: 2000+40, title: "Mission 41", target: 1, reward: 1025 },
    { id: 2000+41, title: "Mission 42", target: 2, reward: 1050 },
    { id: 2000+42, title: "Mission 43", target: 3, reward: 1075 },
    { id: 2000+43, title: "Mission 44", target: 4, reward: 1100 },
    { id: 2000+44, title: "Mission 45", target: 5, reward: 1125 },
    { id: 2000+45, title: "Mission 46", target: 6, reward: 1150 },
    { id: 2000+46, title: "Mission 47", target: 7, reward: 1175 },
    { id: 2000+47, title: "Mission 48", target: 8, reward: 1200 },
    { id: 2000+48, title: "Mission 49", target: 9, reward: 1225 },
    { id: 2000+49, title: "Mission 50", target: 10, reward: 1250 },
    { id: 2000+50, title: "Mission 51", target: 1, reward: 1275 },
    { id: 2000+51, title: "Mission 52", target: 2, reward: 1300 },
    { id: 2000+52, title: "Mission 53", target: 3, reward: 1325 },
    { id: 2000+53, title: "Mission 54", target: 4, reward: 1350 },
    { id: 2000+54, title: "Mission 55", target: 5, reward: 1375 },
    { id: 2000+55, title: "Mission 56", target: 6, reward: 1400 },
    { id: 2000+56, title: "Mission 57", target: 7, reward: 1425 },
    { id: 2000+57, title: "Mission 58", target: 8, reward: 1450 },
    { id: 2000+58, title: "Mission 59", target: 9, reward: 1475 },
    { id: 2000+59, title: "Mission 60", target: 10, reward: 1500 },
    { id: 2000+60, title: "Mission 61", target: 1, reward: 1525 },
    { id: 2000+61, title: "Mission 62", target: 2, reward: 1550 },
    { id: 2000+62, title: "Mission 63", target: 3, reward: 1575 },
    { id: 2000+63, title: "Mission 64", target: 4, reward: 1600 },
    { id: 2000+64, title: "Mission 65", target: 5, reward: 1625 },
    { id: 2000+65, title: "Mission 66", target: 6, reward: 1650 },
    { id: 2000+66, title: "Mission 67", target: 7, reward: 1675 },
    { id: 2000+67, title: "Mission 68", target: 8, reward: 1700 },
    { id: 2000+68, title: "Mission 69", target: 9, reward: 1725 },
    { id: 2000+69, title: "Mission 70", target: 10, reward: 1750 },
    { id: 2000+70, title: "Mission 71", target: 1, reward: 1775 },
    { id: 2000+71, title: "Mission 72", target: 2, reward: 1800 },
    { id: 2000+72, title: "Mission 73", target: 3, reward: 1825 },
    { id: 2000+73, title: "Mission 74", target: 4, reward: 1850 },
    { id: 2000+74, title: "Mission 75", target: 5, reward: 1875 },
    { id: 2000+75, title: "Mission 76", target: 6, reward: 1900 },
    { id: 2000+76, title: "Mission 77", target: 7, reward: 1925 },
    { id: 2000+77, title: "Mission 78", target: 8, reward: 1950 },
    { id: 2000+78, title: "Mission 79", target: 9, reward: 1975 },
    { id: 2000+79, title: "Mission 80", target: 10, reward: 2000 },
  ];

  A.COSMETICS = [
    { id: 3000+0, type: "frame", name: "Frame 1", price: 3000 },
    { id: 3000+1, type: "banner", name: "Banner 2", price: 6000 },
    { id: 3000+2, type: "emote", name: "Emote 3", price: 9000 },
    { id: 3000+3, type: "title", name: "Title 4", price: 12000 },
    { id: 3000+4, type: "effect", name: "Effect 5", price: 15000 },
    { id: 3000+5, type: "trail", name: "Trail 6", price: 18000 },
    { id: 3000+6, type: "victory", name: "Victory 7", price: 21000 },
    { id: 3000+7, type: "defeat", name: "Defeat 8", price: 24000 },
    { id: 3000+8, type: "idle", name: "Idle 9", price: 27000 },
    { id: 3000+9, type: "overlay", name: "Overlay 10", price: 30000 },
    { id: 3000+10, type: "frame", name: "Frame 11", price: 33000 },
    { id: 3000+11, type: "banner", name: "Banner 12", price: 36000 },
    { id: 3000+12, type: "emote", name: "Emote 13", price: 39000 },
    { id: 3000+13, type: "title", name: "Title 14", price: 42000 },
    { id: 3000+14, type: "effect", name: "Effect 15", price: 45000 },
    { id: 3000+15, type: "trail", name: "Trail 16", price: 48000 },
    { id: 3000+16, type: "victory", name: "Victory 17", price: 51000 },
    { id: 3000+17, type: "defeat", name: "Defeat 18", price: 54000 },
    { id: 3000+18, type: "idle", name: "Idle 19", price: 57000 },
    { id: 3000+19, type: "overlay", name: "Overlay 20", price: 60000 },
    { id: 3000+20, type: "frame", name: "Frame 21", price: 63000 },
    { id: 3000+21, type: "banner", name: "Banner 22", price: 66000 },
    { id: 3000+22, type: "emote", name: "Emote 23", price: 69000 },
    { id: 3000+23, type: "title", name: "Title 24", price: 72000 },
    { id: 3000+24, type: "effect", name: "Effect 25", price: 75000 },
    { id: 3000+25, type: "trail", name: "Trail 26", price: 78000 },
    { id: 3000+26, type: "victory", name: "Victory 27", price: 81000 },
    { id: 3000+27, type: "defeat", name: "Defeat 28", price: 84000 },
    { id: 3000+28, type: "idle", name: "Idle 29", price: 87000 },
    { id: 3000+29, type: "overlay", name: "Overlay 30", price: 90000 },
    { id: 3000+30, type: "frame", name: "Frame 31", price: 93000 },
    { id: 3000+31, type: "banner", name: "Banner 32", price: 96000 },
    { id: 3000+32, type: "emote", name: "Emote 33", price: 99000 },
    { id: 3000+33, type: "title", name: "Title 34", price: 102000 },
    { id: 3000+34, type: "effect", name: "Effect 35", price: 105000 },
    { id: 3000+35, type: "trail", name: "Trail 36", price: 108000 },
    { id: 3000+36, type: "victory", name: "Victory 37", price: 111000 },
    { id: 3000+37, type: "defeat", name: "Defeat 38", price: 114000 },
    { id: 3000+38, type: "idle", name: "Idle 39", price: 117000 },
    { id: 3000+39, type: "overlay", name: "Overlay 40", price: 120000 },
    { id: 3000+40, type: "frame", name: "Frame 41", price: 123000 },
    { id: 3000+41, type: "banner", name: "Banner 42", price: 126000 },
    { id: 3000+42, type: "emote", name: "Emote 43", price: 129000 },
    { id: 3000+43, type: "title", name: "Title 44", price: 132000 },
    { id: 3000+44, type: "effect", name: "Effect 45", price: 135000 },
    { id: 3000+45, type: "trail", name: "Trail 46", price: 138000 },
    { id: 3000+46, type: "victory", name: "Victory 47", price: 141000 },
    { id: 3000+47, type: "defeat", name: "Defeat 48", price: 144000 },
    { id: 3000+48, type: "idle", name: "Idle 49", price: 147000 },
    { id: 3000+49, type: "overlay", name: "Overlay 50", price: 150000 },
    { id: 3000+50, type: "frame", name: "Frame 51", price: 153000 },
    { id: 3000+51, type: "banner", name: "Banner 52", price: 156000 },
    { id: 3000+52, type: "emote", name: "Emote 53", price: 159000 },
    { id: 3000+53, type: "title", name: "Title 54", price: 162000 },
    { id: 3000+54, type: "effect", name: "Effect 55", price: 165000 },
    { id: 3000+55, type: "trail", name: "Trail 56", price: 168000 },
    { id: 3000+56, type: "victory", name: "Victory 57", price: 171000 },
    { id: 3000+57, type: "defeat", name: "Defeat 58", price: 174000 },
    { id: 3000+58, type: "idle", name: "Idle 59", price: 177000 },
    { id: 3000+59, type: "overlay", name: "Overlay 60", price: 180000 },
    { id: 3000+60, type: "frame", name: "Frame 61", price: 183000 },
    { id: 3000+61, type: "banner", name: "Banner 62", price: 186000 },
    { id: 3000+62, type: "emote", name: "Emote 63", price: 189000 },
    { id: 3000+63, type: "title", name: "Title 64", price: 192000 },
    { id: 3000+64, type: "effect", name: "Effect 65", price: 195000 },
    { id: 3000+65, type: "trail", name: "Trail 66", price: 198000 },
    { id: 3000+66, type: "victory", name: "Victory 67", price: 201000 },
    { id: 3000+67, type: "defeat", name: "Defeat 68", price: 204000 },
    { id: 3000+68, type: "idle", name: "Idle 69", price: 207000 },
    { id: 3000+69, type: "overlay", name: "Overlay 70", price: 210000 },
    { id: 3000+70, type: "frame", name: "Frame 71", price: 213000 },
    { id: 3000+71, type: "banner", name: "Banner 72", price: 216000 },
    { id: 3000+72, type: "emote", name: "Emote 73", price: 219000 },
    { id: 3000+73, type: "title", name: "Title 74", price: 222000 },
    { id: 3000+74, type: "effect", name: "Effect 75", price: 225000 },
    { id: 3000+75, type: "trail", name: "Trail 76", price: 228000 },
    { id: 3000+76, type: "victory", name: "Victory 77", price: 231000 },
    { id: 3000+77, type: "defeat", name: "Defeat 78", price: 234000 },
    { id: 3000+78, type: "idle", name: "Idle 79", price: 237000 },
    { id: 3000+79, type: "overlay", name: "Overlay 80", price: 240000 },
  ];

  A.QUOTES = [
    { day: 1, quote: "Quote 1: patience is the sharpest weapon on the board." },
    { day: 2, quote: "Quote 2: patience is the sharpest weapon on the board." },
    { day: 3, quote: "Quote 3: patience is the sharpest weapon on the board." },
    { day: 4, quote: "Quote 4: patience is the sharpest weapon on the board." },
    { day: 5, quote: "Quote 5: patience is the sharpest weapon on the board." },
    { day: 6, quote: "Quote 6: patience is the sharpest weapon on the board." },
    { day: 7, quote: "Quote 7: patience is the sharpest weapon on the board." },
    { day: 8, quote: "Quote 8: patience is the sharpest weapon on the board." },
    { day: 9, quote: "Quote 9: patience is the sharpest weapon on the board." },
    { day: 10, quote: "Quote 10: patience is the sharpest weapon on the board." },
    { day: 11, quote: "Quote 11: patience is the sharpest weapon on the board." },
    { day: 12, quote: "Quote 12: patience is the sharpest weapon on the board." },
    { day: 13, quote: "Quote 13: patience is the sharpest weapon on the board." },
    { day: 14, quote: "Quote 14: patience is the sharpest weapon on the board." },
    { day: 15, quote: "Quote 15: patience is the sharpest weapon on the board." },
    { day: 16, quote: "Quote 16: patience is the sharpest weapon on the board." },
    { day: 17, quote: "Quote 17: patience is the sharpest weapon on the board." },
    { day: 18, quote: "Quote 18: patience is the sharpest weapon on the board." },
    { day: 19, quote: "Quote 19: patience is the sharpest weapon on the board." },
    { day: 20, quote: "Quote 20: patience is the sharpest weapon on the board." },
    { day: 21, quote: "Quote 21: patience is the sharpest weapon on the board." },
    { day: 22, quote: "Quote 22: patience is the sharpest weapon on the board." },
    { day: 23, quote: "Quote 23: patience is the sharpest weapon on the board." },
    { day: 24, quote: "Quote 24: patience is the sharpest weapon on the board." },
    { day: 25, quote: "Quote 25: patience is the sharpest weapon on the board." },
    { day: 26, quote: "Quote 26: patience is the sharpest weapon on the board." },
    { day: 27, quote: "Quote 27: patience is the sharpest weapon on the board." },
    { day: 28, quote: "Quote 28: patience is the sharpest weapon on the board." },
    { day: 29, quote: "Quote 29: patience is the sharpest weapon on the board." },
    { day: 30, quote: "Quote 30: patience is the sharpest weapon on the board." },
    { day: 31, quote: "Quote 31: patience is the sharpest weapon on the board." },
    { day: 32, quote: "Quote 32: patience is the sharpest weapon on the board." },
    { day: 33, quote: "Quote 33: patience is the sharpest weapon on the board." },
    { day: 34, quote: "Quote 34: patience is the sharpest weapon on the board." },
    { day: 35, quote: "Quote 35: patience is the sharpest weapon on the board." },
    { day: 36, quote: "Quote 36: patience is the sharpest weapon on the board." },
    { day: 37, quote: "Quote 37: patience is the sharpest weapon on the board." },
    { day: 38, quote: "Quote 38: patience is the sharpest weapon on the board." },
    { day: 39, quote: "Quote 39: patience is the sharpest weapon on the board." },
    { day: 40, quote: "Quote 40: patience is the sharpest weapon on the board." },
    { day: 41, quote: "Quote 41: patience is the sharpest weapon on the board." },
    { day: 42, quote: "Quote 42: patience is the sharpest weapon on the board." },
    { day: 43, quote: "Quote 43: patience is the sharpest weapon on the board." },
    { day: 44, quote: "Quote 44: patience is the sharpest weapon on the board." },
    { day: 45, quote: "Quote 45: patience is the sharpest weapon on the board." },
    { day: 46, quote: "Quote 46: patience is the sharpest weapon on the board." },
    { day: 47, quote: "Quote 47: patience is the sharpest weapon on the board." },
    { day: 48, quote: "Quote 48: patience is the sharpest weapon on the board." },
    { day: 49, quote: "Quote 49: patience is the sharpest weapon on the board." },
    { day: 50, quote: "Quote 50: patience is the sharpest weapon on the board." },
    { day: 51, quote: "Quote 51: patience is the sharpest weapon on the board." },
    { day: 52, quote: "Quote 52: patience is the sharpest weapon on the board." },
    { day: 53, quote: "Quote 53: patience is the sharpest weapon on the board." },
    { day: 54, quote: "Quote 54: patience is the sharpest weapon on the board." },
    { day: 55, quote: "Quote 55: patience is the sharpest weapon on the board." },
    { day: 56, quote: "Quote 56: patience is the sharpest weapon on the board." },
    { day: 57, quote: "Quote 57: patience is the sharpest weapon on the board." },
    { day: 58, quote: "Quote 58: patience is the sharpest weapon on the board." },
    { day: 59, quote: "Quote 59: patience is the sharpest weapon on the board." },
    { day: 60, quote: "Quote 60: patience is the sharpest weapon on the board." },
    { day: 61, quote: "Quote 61: patience is the sharpest weapon on the board." },
    { day: 62, quote: "Quote 62: patience is the sharpest weapon on the board." },
    { day: 63, quote: "Quote 63: patience is the sharpest weapon on the board." },
    { day: 64, quote: "Quote 64: patience is the sharpest weapon on the board." },
    { day: 65, quote: "Quote 65: patience is the sharpest weapon on the board." },
    { day: 66, quote: "Quote 66: patience is the sharpest weapon on the board." },
    { day: 67, quote: "Quote 67: patience is the sharpest weapon on the board." },
    { day: 68, quote: "Quote 68: patience is the sharpest weapon on the board." },
    { day: 69, quote: "Quote 69: patience is the sharpest weapon on the board." },
    { day: 70, quote: "Quote 70: patience is the sharpest weapon on the board." },
    { day: 71, quote: "Quote 71: patience is the sharpest weapon on the board." },
    { day: 72, quote: "Quote 72: patience is the sharpest weapon on the board." },
    { day: 73, quote: "Quote 73: patience is the sharpest weapon on the board." },
    { day: 74, quote: "Quote 74: patience is the sharpest weapon on the board." },
    { day: 75, quote: "Quote 75: patience is the sharpest weapon on the board." },
    { day: 76, quote: "Quote 76: patience is the sharpest weapon on the board." },
    { day: 77, quote: "Quote 77: patience is the sharpest weapon on the board." },
    { day: 78, quote: "Quote 78: patience is the sharpest weapon on the board." },
    { day: 79, quote: "Quote 79: patience is the sharpest weapon on the board." },
    { day: 80, quote: "Quote 80: patience is the sharpest weapon on the board." },
    { day: 81, quote: "Quote 81: patience is the sharpest weapon on the board." },
    { day: 82, quote: "Quote 82: patience is the sharpest weapon on the board." },
    { day: 83, quote: "Quote 83: patience is the sharpest weapon on the board." },
    { day: 84, quote: "Quote 84: patience is the sharpest weapon on the board." },
    { day: 85, quote: "Quote 85: patience is the sharpest weapon on the board." },
    { day: 86, quote: "Quote 86: patience is the sharpest weapon on the board." },
    { day: 87, quote: "Quote 87: patience is the sharpest weapon on the board." },
    { day: 88, quote: "Quote 88: patience is the sharpest weapon on the board." },
    { day: 89, quote: "Quote 89: patience is the sharpest weapon on the board." },
    { day: 90, quote: "Quote 90: patience is the sharpest weapon on the board." },
    { day: 91, quote: "Quote 91: patience is the sharpest weapon on the board." },
    { day: 92, quote: "Quote 92: patience is the sharpest weapon on the board." },
    { day: 93, quote: "Quote 93: patience is the sharpest weapon on the board." },
    { day: 94, quote: "Quote 94: patience is the sharpest weapon on the board." },
    { day: 95, quote: "Quote 95: patience is the sharpest weapon on the board." },
    { day: 96, quote: "Quote 96: patience is the sharpest weapon on the board." },
    { day: 97, quote: "Quote 97: patience is the sharpest weapon on the board." },
    { day: 98, quote: "Quote 98: patience is the sharpest weapon on the board." },
    { day: 99, quote: "Quote 99: patience is the sharpest weapon on the board." },
    { day: 100, quote: "Quote 100: patience is the sharpest weapon on the board." },
    { day: 101, quote: "Quote 101: patience is the sharpest weapon on the board." },
    { day: 102, quote: "Quote 102: patience is the sharpest weapon on the board." },
    { day: 103, quote: "Quote 103: patience is the sharpest weapon on the board." },
    { day: 104, quote: "Quote 104: patience is the sharpest weapon on the board." },
    { day: 105, quote: "Quote 105: patience is the sharpest weapon on the board." },
    { day: 106, quote: "Quote 106: patience is the sharpest weapon on the board." },
    { day: 107, quote: "Quote 107: patience is the sharpest weapon on the board." },
    { day: 108, quote: "Quote 108: patience is the sharpest weapon on the board." },
    { day: 109, quote: "Quote 109: patience is the sharpest weapon on the board." },
    { day: 110, quote: "Quote 110: patience is the sharpest weapon on the board." },
    { day: 111, quote: "Quote 111: patience is the sharpest weapon on the board." },
    { day: 112, quote: "Quote 112: patience is the sharpest weapon on the board." },
    { day: 113, quote: "Quote 113: patience is the sharpest weapon on the board." },
    { day: 114, quote: "Quote 114: patience is the sharpest weapon on the board." },
    { day: 115, quote: "Quote 115: patience is the sharpest weapon on the board." },
    { day: 116, quote: "Quote 116: patience is the sharpest weapon on the board." },
    { day: 117, quote: "Quote 117: patience is the sharpest weapon on the board." },
    { day: 118, quote: "Quote 118: patience is the sharpest weapon on the board." },
    { day: 119, quote: "Quote 119: patience is the sharpest weapon on the board." },
    { day: 120, quote: "Quote 120: patience is the sharpest weapon on the board." },
  ];

  A.EXTRA_ACHIEVEMENTS = [
    { id: 1000+0, name: "Extra 1", target: 5, reward: 50 },
    { id: 1000+1, name: "Extra 2", target: 10, reward: 70 },
    { id: 1000+2, name: "Extra 3", target: 15, reward: 90 },
    { id: 1000+3, name: "Extra 4", target: 20, reward: 110 },
    { id: 1000+4, name: "Extra 5", target: 25, reward: 130 },
    { id: 1000+5, name: "Extra 6", target: 30, reward: 150 },
    { id: 1000+6, name: "Extra 7", target: 35, reward: 170 },
    { id: 1000+7, name: "Extra 8", target: 40, reward: 190 },
    { id: 1000+8, name: "Extra 9", target: 45, reward: 210 },
    { id: 1000+9, name: "Extra 10", target: 50, reward: 230 },
    { id: 1000+10, name: "Extra 11", target: 55, reward: 250 },
    { id: 1000+11, name: "Extra 12", target: 60, reward: 270 },
    { id: 1000+12, name: "Extra 13", target: 65, reward: 290 },
    { id: 1000+13, name: "Extra 14", target: 70, reward: 310 },
    { id: 1000+14, name: "Extra 15", target: 75, reward: 330 },
    { id: 1000+15, name: "Extra 16", target: 80, reward: 350 },
    { id: 1000+16, name: "Extra 17", target: 85, reward: 370 },
    { id: 1000+17, name: "Extra 18", target: 90, reward: 390 },
    { id: 1000+18, name: "Extra 19", target: 95, reward: 410 },
    { id: 1000+19, name: "Extra 20", target: 100, reward: 430 },
    { id: 1000+20, name: "Extra 21", target: 105, reward: 450 },
    { id: 1000+21, name: "Extra 22", target: 110, reward: 470 },
    { id: 1000+22, name: "Extra 23", target: 115, reward: 490 },
    { id: 1000+23, name: "Extra 24", target: 120, reward: 510 },
    { id: 1000+24, name: "Extra 25", target: 125, reward: 530 },
    { id: 1000+25, name: "Extra 26", target: 130, reward: 550 },
    { id: 1000+26, name: "Extra 27", target: 135, reward: 570 },
    { id: 1000+27, name: "Extra 28", target: 140, reward: 590 },
    { id: 1000+28, name: "Extra 29", target: 145, reward: 610 },
    { id: 1000+29, name: "Extra 30", target: 150, reward: 630 },
    { id: 1000+30, name: "Extra 31", target: 155, reward: 650 },
    { id: 1000+31, name: "Extra 32", target: 160, reward: 670 },
    { id: 1000+32, name: "Extra 33", target: 165, reward: 690 },
    { id: 1000+33, name: "Extra 34", target: 170, reward: 710 },
    { id: 1000+34, name: "Extra 35", target: 175, reward: 730 },
    { id: 1000+35, name: "Extra 36", target: 180, reward: 750 },
    { id: 1000+36, name: "Extra 37", target: 185, reward: 770 },
    { id: 1000+37, name: "Extra 38", target: 190, reward: 790 },
    { id: 1000+38, name: "Extra 39", target: 195, reward: 810 },
    { id: 1000+39, name: "Extra 40", target: 200, reward: 830 },
    { id: 1000+40, name: "Extra 41", target: 205, reward: 850 },
    { id: 1000+41, name: "Extra 42", target: 210, reward: 870 },
    { id: 1000+42, name: "Extra 43", target: 215, reward: 890 },
    { id: 1000+43, name: "Extra 44", target: 220, reward: 910 },
    { id: 1000+44, name: "Extra 45", target: 225, reward: 930 },
    { id: 1000+45, name: "Extra 46", target: 230, reward: 950 },
    { id: 1000+46, name: "Extra 47", target: 235, reward: 970 },
    { id: 1000+47, name: "Extra 48", target: 240, reward: 990 },
    { id: 1000+48, name: "Extra 49", target: 245, reward: 1010 },
    { id: 1000+49, name: "Extra 50", target: 250, reward: 1030 },
    { id: 1000+50, name: "Extra 51", target: 255, reward: 1050 },
    { id: 1000+51, name: "Extra 52", target: 260, reward: 1070 },
    { id: 1000+52, name: "Extra 53", target: 265, reward: 1090 },
    { id: 1000+53, name: "Extra 54", target: 270, reward: 1110 },
    { id: 1000+54, name: "Extra 55", target: 275, reward: 1130 },
    { id: 1000+55, name: "Extra 56", target: 280, reward: 1150 },
    { id: 1000+56, name: "Extra 57", target: 285, reward: 1170 },
    { id: 1000+57, name: "Extra 58", target: 290, reward: 1190 },
    { id: 1000+58, name: "Extra 59", target: 295, reward: 1210 },
    { id: 1000+59, name: "Extra 60", target: 300, reward: 1230 },
    { id: 1000+60, name: "Extra 61", target: 305, reward: 1250 },
    { id: 1000+61, name: "Extra 62", target: 310, reward: 1270 },
    { id: 1000+62, name: "Extra 63", target: 315, reward: 1290 },
    { id: 1000+63, name: "Extra 64", target: 320, reward: 1310 },
    { id: 1000+64, name: "Extra 65", target: 325, reward: 1330 },
    { id: 1000+65, name: "Extra 66", target: 330, reward: 1350 },
    { id: 1000+66, name: "Extra 67", target: 335, reward: 1370 },
    { id: 1000+67, name: "Extra 68", target: 340, reward: 1390 },
    { id: 1000+68, name: "Extra 69", target: 345, reward: 1410 },
    { id: 1000+69, name: "Extra 70", target: 350, reward: 1430 },
    { id: 1000+70, name: "Extra 71", target: 355, reward: 1450 },
    { id: 1000+71, name: "Extra 72", target: 360, reward: 1470 },
    { id: 1000+72, name: "Extra 73", target: 365, reward: 1490 },
    { id: 1000+73, name: "Extra 74", target: 370, reward: 1510 },
    { id: 1000+74, name: "Extra 75", target: 375, reward: 1530 },
    { id: 1000+75, name: "Extra 76", target: 380, reward: 1550 },
    { id: 1000+76, name: "Extra 77", target: 385, reward: 1570 },
    { id: 1000+77, name: "Extra 78", target: 390, reward: 1590 },
    { id: 1000+78, name: "Extra 79", target: 395, reward: 1610 },
    { id: 1000+79, name: "Extra 80", target: 400, reward: 1630 },
    { id: 1000+80, name: "Extra 81", target: 405, reward: 1650 },
    { id: 1000+81, name: "Extra 82", target: 410, reward: 1670 },
    { id: 1000+82, name: "Extra 83", target: 415, reward: 1690 },
    { id: 1000+83, name: "Extra 84", target: 420, reward: 1710 },
    { id: 1000+84, name: "Extra 85", target: 425, reward: 1730 },
    { id: 1000+85, name: "Extra 86", target: 430, reward: 1750 },
    { id: 1000+86, name: "Extra 87", target: 435, reward: 1770 },
    { id: 1000+87, name: "Extra 88", target: 440, reward: 1790 },
    { id: 1000+88, name: "Extra 89", target: 445, reward: 1810 },
    { id: 1000+89, name: "Extra 90", target: 450, reward: 1830 },
    { id: 1000+90, name: "Extra 91", target: 455, reward: 1850 },
    { id: 1000+91, name: "Extra 92", target: 460, reward: 1870 },
    { id: 1000+92, name: "Extra 93", target: 465, reward: 1890 },
    { id: 1000+93, name: "Extra 94", target: 470, reward: 1910 },
    { id: 1000+94, name: "Extra 95", target: 475, reward: 1930 },
    { id: 1000+95, name: "Extra 96", target: 480, reward: 1950 },
    { id: 1000+96, name: "Extra 97", target: 485, reward: 1970 },
    { id: 1000+97, name: "Extra 98", target: 490, reward: 1990 },
    { id: 1000+98, name: "Extra 99", target: 495, reward: 2010 },
    { id: 1000+99, name: "Extra 100", target: 500, reward: 2030 },
    { id: 1000+100, name: "Extra 101", target: 505, reward: 2050 },
    { id: 1000+101, name: "Extra 102", target: 510, reward: 2070 },
    { id: 1000+102, name: "Extra 103", target: 515, reward: 2090 },
    { id: 1000+103, name: "Extra 104", target: 520, reward: 2110 },
    { id: 1000+104, name: "Extra 105", target: 525, reward: 2130 },
    { id: 1000+105, name: "Extra 106", target: 530, reward: 2150 },
    { id: 1000+106, name: "Extra 107", target: 535, reward: 2170 },
    { id: 1000+107, name: "Extra 108", target: 540, reward: 2190 },
    { id: 1000+108, name: "Extra 109", target: 545, reward: 2210 },
    { id: 1000+109, name: "Extra 110", target: 550, reward: 2230 },
    { id: 1000+110, name: "Extra 111", target: 555, reward: 2250 },
    { id: 1000+111, name: "Extra 112", target: 560, reward: 2270 },
    { id: 1000+112, name: "Extra 113", target: 565, reward: 2290 },
    { id: 1000+113, name: "Extra 114", target: 570, reward: 2310 },
    { id: 1000+114, name: "Extra 115", target: 575, reward: 2330 },
    { id: 1000+115, name: "Extra 116", target: 580, reward: 2350 },
    { id: 1000+116, name: "Extra 117", target: 585, reward: 2370 },
    { id: 1000+117, name: "Extra 118", target: 590, reward: 2390 },
    { id: 1000+118, name: "Extra 119", target: 595, reward: 2410 },
    { id: 1000+119, name: "Extra 120", target: 600, reward: 2430 },
  ];

  A.TIPS = [
    { id: 1, tip: "Tip 1: watch for your opponent forming an open three and block decisively." },
    { id: 2, tip: "Tip 2: watch for your opponent forming an open three and block decisively." },
    { id: 3, tip: "Tip 3: watch for your opponent forming an open three and block decisively." },
    { id: 4, tip: "Tip 4: watch for your opponent forming an open three and block decisively." },
    { id: 5, tip: "Tip 5: watch for your opponent forming an open three and block decisively." },
    { id: 6, tip: "Tip 6: watch for your opponent forming an open three and block decisively." },
    { id: 7, tip: "Tip 7: watch for your opponent forming an open three and block decisively." },
    { id: 8, tip: "Tip 8: watch for your opponent forming an open three and block decisively." },
    { id: 9, tip: "Tip 9: watch for your opponent forming an open three and block decisively." },
    { id: 10, tip: "Tip 10: watch for your opponent forming an open three and block decisively." },
    { id: 11, tip: "Tip 11: watch for your opponent forming an open three and block decisively." },
    { id: 12, tip: "Tip 12: watch for your opponent forming an open three and block decisively." },
    { id: 13, tip: "Tip 13: watch for your opponent forming an open three and block decisively." },
    { id: 14, tip: "Tip 14: watch for your opponent forming an open three and block decisively." },
    { id: 15, tip: "Tip 15: watch for your opponent forming an open three and block decisively." },
    { id: 16, tip: "Tip 16: watch for your opponent forming an open three and block decisively." },
    { id: 17, tip: "Tip 17: watch for your opponent forming an open three and block decisively." },
    { id: 18, tip: "Tip 18: watch for your opponent forming an open three and block decisively." },
    { id: 19, tip: "Tip 19: watch for your opponent forming an open three and block decisively." },
    { id: 20, tip: "Tip 20: watch for your opponent forming an open three and block decisively." },
    { id: 21, tip: "Tip 21: watch for your opponent forming an open three and block decisively." },
    { id: 22, tip: "Tip 22: watch for your opponent forming an open three and block decisively." },
    { id: 23, tip: "Tip 23: watch for your opponent forming an open three and block decisively." },
    { id: 24, tip: "Tip 24: watch for your opponent forming an open three and block decisively." },
    { id: 25, tip: "Tip 25: watch for your opponent forming an open three and block decisively." },
    { id: 26, tip: "Tip 26: watch for your opponent forming an open three and block decisively." },
    { id: 27, tip: "Tip 27: watch for your opponent forming an open three and block decisively." },
    { id: 28, tip: "Tip 28: watch for your opponent forming an open three and block decisively." },
    { id: 29, tip: "Tip 29: watch for your opponent forming an open three and block decisively." },
    { id: 30, tip: "Tip 30: watch for your opponent forming an open three and block decisively." },
    { id: 31, tip: "Tip 31: watch for your opponent forming an open three and block decisively." },
    { id: 32, tip: "Tip 32: watch for your opponent forming an open three and block decisively." },
    { id: 33, tip: "Tip 33: watch for your opponent forming an open three and block decisively." },
    { id: 34, tip: "Tip 34: watch for your opponent forming an open three and block decisively." },
    { id: 35, tip: "Tip 35: watch for your opponent forming an open three and block decisively." },
    { id: 36, tip: "Tip 36: watch for your opponent forming an open three and block decisively." },
    { id: 37, tip: "Tip 37: watch for your opponent forming an open three and block decisively." },
    { id: 38, tip: "Tip 38: watch for your opponent forming an open three and block decisively." },
    { id: 39, tip: "Tip 39: watch for your opponent forming an open three and block decisively." },
    { id: 40, tip: "Tip 40: watch for your opponent forming an open three and block decisively." },
    { id: 41, tip: "Tip 41: watch for your opponent forming an open three and block decisively." },
    { id: 42, tip: "Tip 42: watch for your opponent forming an open three and block decisively." },
    { id: 43, tip: "Tip 43: watch for your opponent forming an open three and block decisively." },
    { id: 44, tip: "Tip 44: watch for your opponent forming an open three and block decisively." },
    { id: 45, tip: "Tip 45: watch for your opponent forming an open three and block decisively." },
    { id: 46, tip: "Tip 46: watch for your opponent forming an open three and block decisively." },
    { id: 47, tip: "Tip 47: watch for your opponent forming an open three and block decisively." },
    { id: 48, tip: "Tip 48: watch for your opponent forming an open three and block decisively." },
    { id: 49, tip: "Tip 49: watch for your opponent forming an open three and block decisively." },
    { id: 50, tip: "Tip 50: watch for your opponent forming an open three and block decisively." },
    { id: 51, tip: "Tip 51: watch for your opponent forming an open three and block decisively." },
    { id: 52, tip: "Tip 52: watch for your opponent forming an open three and block decisively." },
    { id: 53, tip: "Tip 53: watch for your opponent forming an open three and block decisively." },
    { id: 54, tip: "Tip 54: watch for your opponent forming an open three and block decisively." },
    { id: 55, tip: "Tip 55: watch for your opponent forming an open three and block decisively." },
    { id: 56, tip: "Tip 56: watch for your opponent forming an open three and block decisively." },
    { id: 57, tip: "Tip 57: watch for your opponent forming an open three and block decisively." },
    { id: 58, tip: "Tip 58: watch for your opponent forming an open three and block decisively." },
    { id: 59, tip: "Tip 59: watch for your opponent forming an open three and block decisively." },
    { id: 60, tip: "Tip 60: watch for your opponent forming an open three and block decisively." },
    { id: 61, tip: "Tip 61: watch for your opponent forming an open three and block decisively." },
    { id: 62, tip: "Tip 62: watch for your opponent forming an open three and block decisively." },
    { id: 63, tip: "Tip 63: watch for your opponent forming an open three and block decisively." },
    { id: 64, tip: "Tip 64: watch for your opponent forming an open three and block decisively." },
    { id: 65, tip: "Tip 65: watch for your opponent forming an open three and block decisively." },
    { id: 66, tip: "Tip 66: watch for your opponent forming an open three and block decisively." },
    { id: 67, tip: "Tip 67: watch for your opponent forming an open three and block decisively." },
    { id: 68, tip: "Tip 68: watch for your opponent forming an open three and block decisively." },
    { id: 69, tip: "Tip 69: watch for your opponent forming an open three and block decisively." },
    { id: 70, tip: "Tip 70: watch for your opponent forming an open three and block decisively." },
    { id: 71, tip: "Tip 71: watch for your opponent forming an open three and block decisively." },
    { id: 72, tip: "Tip 72: watch for your opponent forming an open three and block decisively." },
    { id: 73, tip: "Tip 73: watch for your opponent forming an open three and block decisively." },
    { id: 74, tip: "Tip 74: watch for your opponent forming an open three and block decisively." },
    { id: 75, tip: "Tip 75: watch for your opponent forming an open three and block decisively." },
    { id: 76, tip: "Tip 76: watch for your opponent forming an open three and block decisively." },
    { id: 77, tip: "Tip 77: watch for your opponent forming an open three and block decisively." },
    { id: 78, tip: "Tip 78: watch for your opponent forming an open three and block decisively." },
    { id: 79, tip: "Tip 79: watch for your opponent forming an open three and block decisively." },
    { id: 80, tip: "Tip 80: watch for your opponent forming an open three and block decisively." },
    { id: 81, tip: "Tip 81: watch for your opponent forming an open three and block decisively." },
    { id: 82, tip: "Tip 82: watch for your opponent forming an open three and block decisively." },
    { id: 83, tip: "Tip 83: watch for your opponent forming an open three and block decisively." },
    { id: 84, tip: "Tip 84: watch for your opponent forming an open three and block decisively." },
    { id: 85, tip: "Tip 85: watch for your opponent forming an open three and block decisively." },
    { id: 86, tip: "Tip 86: watch for your opponent forming an open three and block decisively." },
    { id: 87, tip: "Tip 87: watch for your opponent forming an open three and block decisively." },
    { id: 88, tip: "Tip 88: watch for your opponent forming an open three and block decisively." },
    { id: 89, tip: "Tip 89: watch for your opponent forming an open three and block decisively." },
    { id: 90, tip: "Tip 90: watch for your opponent forming an open three and block decisively." },
    { id: 91, tip: "Tip 91: watch for your opponent forming an open three and block decisively." },
    { id: 92, tip: "Tip 92: watch for your opponent forming an open three and block decisively." },
    { id: 93, tip: "Tip 93: watch for your opponent forming an open three and block decisively." },
    { id: 94, tip: "Tip 94: watch for your opponent forming an open three and block decisively." },
    { id: 95, tip: "Tip 95: watch for your opponent forming an open three and block decisively." },
    { id: 96, tip: "Tip 96: watch for your opponent forming an open three and block decisively." },
    { id: 97, tip: "Tip 97: watch for your opponent forming an open three and block decisively." },
    { id: 98, tip: "Tip 98: watch for your opponent forming an open three and block decisively." },
    { id: 99, tip: "Tip 99: watch for your opponent forming an open three and block decisively." },
    { id: 100, tip: "Tip 100: watch for your opponent forming an open three and block decisively." },
    { id: 101, tip: "Tip 101: watch for your opponent forming an open three and block decisively." },
    { id: 102, tip: "Tip 102: watch for your opponent forming an open three and block decisively." },
    { id: 103, tip: "Tip 103: watch for your opponent forming an open three and block decisively." },
    { id: 104, tip: "Tip 104: watch for your opponent forming an open three and block decisively." },
    { id: 105, tip: "Tip 105: watch for your opponent forming an open three and block decisively." },
    { id: 106, tip: "Tip 106: watch for your opponent forming an open three and block decisively." },
    { id: 107, tip: "Tip 107: watch for your opponent forming an open three and block decisively." },
    { id: 108, tip: "Tip 108: watch for your opponent forming an open three and block decisively." },
    { id: 109, tip: "Tip 109: watch for your opponent forming an open three and block decisively." },
    { id: 110, tip: "Tip 110: watch for your opponent forming an open three and block decisively." },
    { id: 111, tip: "Tip 111: watch for your opponent forming an open three and block decisively." },
    { id: 112, tip: "Tip 112: watch for your opponent forming an open three and block decisively." },
    { id: 113, tip: "Tip 113: watch for your opponent forming an open three and block decisively." },
    { id: 114, tip: "Tip 114: watch for your opponent forming an open three and block decisively." },
    { id: 115, tip: "Tip 115: watch for your opponent forming an open three and block decisively." },
    { id: 116, tip: "Tip 116: watch for your opponent forming an open three and block decisively." },
    { id: 117, tip: "Tip 117: watch for your opponent forming an open three and block decisively." },
    { id: 118, tip: "Tip 118: watch for your opponent forming an open three and block decisively." },
    { id: 119, tip: "Tip 119: watch for your opponent forming an open three and block decisively." },
    { id: 120, tip: "Tip 120: watch for your opponent forming an open three and block decisively." },
    { id: 121, tip: "Tip 121: watch for your opponent forming an open three and block decisively." },
    { id: 122, tip: "Tip 122: watch for your opponent forming an open three and block decisively." },
    { id: 123, tip: "Tip 123: watch for your opponent forming an open three and block decisively." },
    { id: 124, tip: "Tip 124: watch for your opponent forming an open three and block decisively." },
    { id: 125, tip: "Tip 125: watch for your opponent forming an open three and block decisively." },
    { id: 126, tip: "Tip 126: watch for your opponent forming an open three and block decisively." },
    { id: 127, tip: "Tip 127: watch for your opponent forming an open three and block decisively." },
    { id: 128, tip: "Tip 128: watch for your opponent forming an open three and block decisively." },
    { id: 129, tip: "Tip 129: watch for your opponent forming an open three and block decisively." },
    { id: 130, tip: "Tip 130: watch for your opponent forming an open three and block decisively." },
    { id: 131, tip: "Tip 131: watch for your opponent forming an open three and block decisively." },
    { id: 132, tip: "Tip 132: watch for your opponent forming an open three and block decisively." },
    { id: 133, tip: "Tip 133: watch for your opponent forming an open three and block decisively." },
    { id: 134, tip: "Tip 134: watch for your opponent forming an open three and block decisively." },
    { id: 135, tip: "Tip 135: watch for your opponent forming an open three and block decisively." },
    { id: 136, tip: "Tip 136: watch for your opponent forming an open three and block decisively." },
    { id: 137, tip: "Tip 137: watch for your opponent forming an open three and block decisively." },
    { id: 138, tip: "Tip 138: watch for your opponent forming an open three and block decisively." },
    { id: 139, tip: "Tip 139: watch for your opponent forming an open three and block decisively." },
    { id: 140, tip: "Tip 140: watch for your opponent forming an open three and block decisively." },
    { id: 141, tip: "Tip 141: watch for your opponent forming an open three and block decisively." },
    { id: 142, tip: "Tip 142: watch for your opponent forming an open three and block decisively." },
    { id: 143, tip: "Tip 143: watch for your opponent forming an open three and block decisively." },
    { id: 144, tip: "Tip 144: watch for your opponent forming an open three and block decisively." },
    { id: 145, tip: "Tip 145: watch for your opponent forming an open three and block decisively." },
    { id: 146, tip: "Tip 146: watch for your opponent forming an open three and block decisively." },
    { id: 147, tip: "Tip 147: watch for your opponent forming an open three and block decisively." },
    { id: 148, tip: "Tip 148: watch for your opponent forming an open three and block decisively." },
    { id: 149, tip: "Tip 149: watch for your opponent forming an open three and block decisively." },
    { id: 150, tip: "Tip 150: watch for your opponent forming an open three and block decisively." },
  ];

  A.CALENDAR = [
    { day: 1, bonus: 10, event: "Day 1 rewards" },
    { day: 2, bonus: 20, event: "Day 2 rewards" },
    { day: 3, bonus: 30, event: "Day 3 rewards" },
    { day: 4, bonus: 40, event: "Day 4 rewards" },
    { day: 5, bonus: 50, event: "Day 5 rewards" },
    { day: 6, bonus: 60, event: "Day 6 rewards" },
    { day: 7, bonus: 70, event: "Day 7 rewards" },
    { day: 8, bonus: 80, event: "Day 8 rewards" },
    { day: 9, bonus: 90, event: "Day 9 rewards" },
    { day: 10, bonus: 100, event: "Day 10 rewards" },
    { day: 11, bonus: 110, event: "Day 11 rewards" },
    { day: 12, bonus: 120, event: "Day 12 rewards" },
    { day: 13, bonus: 130, event: "Day 13 rewards" },
    { day: 14, bonus: 140, event: "Day 14 rewards" },
    { day: 15, bonus: 150, event: "Day 15 rewards" },
    { day: 16, bonus: 160, event: "Day 16 rewards" },
    { day: 17, bonus: 170, event: "Day 17 rewards" },
    { day: 18, bonus: 180, event: "Day 18 rewards" },
    { day: 19, bonus: 190, event: "Day 19 rewards" },
    { day: 20, bonus: 200, event: "Day 20 rewards" },
    { day: 21, bonus: 210, event: "Day 21 rewards" },
    { day: 22, bonus: 220, event: "Day 22 rewards" },
    { day: 23, bonus: 230, event: "Day 23 rewards" },
    { day: 24, bonus: 240, event: "Day 24 rewards" },
    { day: 25, bonus: 250, event: "Day 25 rewards" },
    { day: 26, bonus: 260, event: "Day 26 rewards" },
    { day: 27, bonus: 270, event: "Day 27 rewards" },
    { day: 28, bonus: 280, event: "Day 28 rewards" },
    { day: 29, bonus: 290, event: "Day 29 rewards" },
    { day: 30, bonus: 300, event: "Day 30 rewards" },
    { day: 31, bonus: 10, event: "Day 31 rewards" },
    { day: 32, bonus: 20, event: "Day 32 rewards" },
    { day: 33, bonus: 30, event: "Day 33 rewards" },
    { day: 34, bonus: 40, event: "Day 34 rewards" },
    { day: 35, bonus: 50, event: "Day 35 rewards" },
    { day: 36, bonus: 60, event: "Day 36 rewards" },
    { day: 37, bonus: 70, event: "Day 37 rewards" },
    { day: 38, bonus: 80, event: "Day 38 rewards" },
    { day: 39, bonus: 90, event: "Day 39 rewards" },
    { day: 40, bonus: 100, event: "Day 40 rewards" },
    { day: 41, bonus: 110, event: "Day 41 rewards" },
    { day: 42, bonus: 120, event: "Day 42 rewards" },
    { day: 43, bonus: 130, event: "Day 43 rewards" },
    { day: 44, bonus: 140, event: "Day 44 rewards" },
    { day: 45, bonus: 150, event: "Day 45 rewards" },
    { day: 46, bonus: 160, event: "Day 46 rewards" },
    { day: 47, bonus: 170, event: "Day 47 rewards" },
    { day: 48, bonus: 180, event: "Day 48 rewards" },
    { day: 49, bonus: 190, event: "Day 49 rewards" },
    { day: 50, bonus: 200, event: "Day 50 rewards" },
    { day: 51, bonus: 210, event: "Day 51 rewards" },
    { day: 52, bonus: 220, event: "Day 52 rewards" },
    { day: 53, bonus: 230, event: "Day 53 rewards" },
    { day: 54, bonus: 240, event: "Day 54 rewards" },
    { day: 55, bonus: 250, event: "Day 55 rewards" },
    { day: 56, bonus: 260, event: "Day 56 rewards" },
    { day: 57, bonus: 270, event: "Day 57 rewards" },
    { day: 58, bonus: 280, event: "Day 58 rewards" },
    { day: 59, bonus: 290, event: "Day 59 rewards" },
    { day: 60, bonus: 300, event: "Day 60 rewards" },
    { day: 61, bonus: 10, event: "Day 61 rewards" },
    { day: 62, bonus: 20, event: "Day 62 rewards" },
    { day: 63, bonus: 30, event: "Day 63 rewards" },
    { day: 64, bonus: 40, event: "Day 64 rewards" },
    { day: 65, bonus: 50, event: "Day 65 rewards" },
    { day: 66, bonus: 60, event: "Day 66 rewards" },
    { day: 67, bonus: 70, event: "Day 67 rewards" },
    { day: 68, bonus: 80, event: "Day 68 rewards" },
    { day: 69, bonus: 90, event: "Day 69 rewards" },
    { day: 70, bonus: 100, event: "Day 70 rewards" },
    { day: 71, bonus: 110, event: "Day 71 rewards" },
    { day: 72, bonus: 120, event: "Day 72 rewards" },
    { day: 73, bonus: 130, event: "Day 73 rewards" },
    { day: 74, bonus: 140, event: "Day 74 rewards" },
    { day: 75, bonus: 150, event: "Day 75 rewards" },
    { day: 76, bonus: 160, event: "Day 76 rewards" },
    { day: 77, bonus: 170, event: "Day 77 rewards" },
    { day: 78, bonus: 180, event: "Day 78 rewards" },
    { day: 79, bonus: 190, event: "Day 79 rewards" },
    { day: 80, bonus: 200, event: "Day 80 rewards" },
    { day: 81, bonus: 210, event: "Day 81 rewards" },
    { day: 82, bonus: 220, event: "Day 82 rewards" },
    { day: 83, bonus: 230, event: "Day 83 rewards" },
    { day: 84, bonus: 240, event: "Day 84 rewards" },
    { day: 85, bonus: 250, event: "Day 85 rewards" },
    { day: 86, bonus: 260, event: "Day 86 rewards" },
    { day: 87, bonus: 270, event: "Day 87 rewards" },
    { day: 88, bonus: 280, event: "Day 88 rewards" },
    { day: 89, bonus: 290, event: "Day 89 rewards" },
    { day: 90, bonus: 300, event: "Day 90 rewards" },
    { day: 91, bonus: 10, event: "Day 91 rewards" },
    { day: 92, bonus: 20, event: "Day 92 rewards" },
    { day: 93, bonus: 30, event: "Day 93 rewards" },
    { day: 94, bonus: 40, event: "Day 94 rewards" },
    { day: 95, bonus: 50, event: "Day 95 rewards" },
    { day: 96, bonus: 60, event: "Day 96 rewards" },
    { day: 97, bonus: 70, event: "Day 97 rewards" },
    { day: 98, bonus: 80, event: "Day 98 rewards" },
    { day: 99, bonus: 90, event: "Day 99 rewards" },
    { day: 100, bonus: 100, event: "Day 100 rewards" },
    { day: 101, bonus: 110, event: "Day 101 rewards" },
    { day: 102, bonus: 120, event: "Day 102 rewards" },
    { day: 103, bonus: 130, event: "Day 103 rewards" },
    { day: 104, bonus: 140, event: "Day 104 rewards" },
    { day: 105, bonus: 150, event: "Day 105 rewards" },
    { day: 106, bonus: 160, event: "Day 106 rewards" },
    { day: 107, bonus: 170, event: "Day 107 rewards" },
    { day: 108, bonus: 180, event: "Day 108 rewards" },
    { day: 109, bonus: 190, event: "Day 109 rewards" },
    { day: 110, bonus: 200, event: "Day 110 rewards" },
    { day: 111, bonus: 210, event: "Day 111 rewards" },
    { day: 112, bonus: 220, event: "Day 112 rewards" },
    { day: 113, bonus: 230, event: "Day 113 rewards" },
    { day: 114, bonus: 240, event: "Day 114 rewards" },
    { day: 115, bonus: 250, event: "Day 115 rewards" },
    { day: 116, bonus: 260, event: "Day 116 rewards" },
    { day: 117, bonus: 270, event: "Day 117 rewards" },
    { day: 118, bonus: 280, event: "Day 118 rewards" },
    { day: 119, bonus: 290, event: "Day 119 rewards" },
    { day: 120, bonus: 300, event: "Day 120 rewards" },
    { day: 121, bonus: 10, event: "Day 121 rewards" },
    { day: 122, bonus: 20, event: "Day 122 rewards" },
    { day: 123, bonus: 30, event: "Day 123 rewards" },
    { day: 124, bonus: 40, event: "Day 124 rewards" },
    { day: 125, bonus: 50, event: "Day 125 rewards" },
    { day: 126, bonus: 60, event: "Day 126 rewards" },
    { day: 127, bonus: 70, event: "Day 127 rewards" },
    { day: 128, bonus: 80, event: "Day 128 rewards" },
    { day: 129, bonus: 90, event: "Day 129 rewards" },
    { day: 130, bonus: 100, event: "Day 130 rewards" },
    { day: 131, bonus: 110, event: "Day 131 rewards" },
    { day: 132, bonus: 120, event: "Day 132 rewards" },
    { day: 133, bonus: 130, event: "Day 133 rewards" },
    { day: 134, bonus: 140, event: "Day 134 rewards" },
    { day: 135, bonus: 150, event: "Day 135 rewards" },
    { day: 136, bonus: 160, event: "Day 136 rewards" },
    { day: 137, bonus: 170, event: "Day 137 rewards" },
    { day: 138, bonus: 180, event: "Day 138 rewards" },
    { day: 139, bonus: 190, event: "Day 139 rewards" },
    { day: 140, bonus: 200, event: "Day 140 rewards" },
    { day: 141, bonus: 210, event: "Day 141 rewards" },
    { day: 142, bonus: 220, event: "Day 142 rewards" },
    { day: 143, bonus: 230, event: "Day 143 rewards" },
    { day: 144, bonus: 240, event: "Day 144 rewards" },
    { day: 145, bonus: 250, event: "Day 145 rewards" },
    { day: 146, bonus: 260, event: "Day 146 rewards" },
    { day: 147, bonus: 270, event: "Day 147 rewards" },
    { day: 148, bonus: 280, event: "Day 148 rewards" },
    { day: 149, bonus: 290, event: "Day 149 rewards" },
    { day: 150, bonus: 300, event: "Day 150 rewards" },
    { day: 151, bonus: 10, event: "Day 151 rewards" },
    { day: 152, bonus: 20, event: "Day 152 rewards" },
    { day: 153, bonus: 30, event: "Day 153 rewards" },
    { day: 154, bonus: 40, event: "Day 154 rewards" },
    { day: 155, bonus: 50, event: "Day 155 rewards" },
    { day: 156, bonus: 60, event: "Day 156 rewards" },
    { day: 157, bonus: 70, event: "Day 157 rewards" },
    { day: 158, bonus: 80, event: "Day 158 rewards" },
    { day: 159, bonus: 90, event: "Day 159 rewards" },
    { day: 160, bonus: 100, event: "Day 160 rewards" },
    { day: 161, bonus: 110, event: "Day 161 rewards" },
    { day: 162, bonus: 120, event: "Day 162 rewards" },
    { day: 163, bonus: 130, event: "Day 163 rewards" },
    { day: 164, bonus: 140, event: "Day 164 rewards" },
    { day: 165, bonus: 150, event: "Day 165 rewards" },
    { day: 166, bonus: 160, event: "Day 166 rewards" },
    { day: 167, bonus: 170, event: "Day 167 rewards" },
    { day: 168, bonus: 180, event: "Day 168 rewards" },
    { day: 169, bonus: 190, event: "Day 169 rewards" },
    { day: 170, bonus: 200, event: "Day 170 rewards" },
    { day: 171, bonus: 210, event: "Day 171 rewards" },
    { day: 172, bonus: 220, event: "Day 172 rewards" },
    { day: 173, bonus: 230, event: "Day 173 rewards" },
    { day: 174, bonus: 240, event: "Day 174 rewards" },
    { day: 175, bonus: 250, event: "Day 175 rewards" },
    { day: 176, bonus: 260, event: "Day 176 rewards" },
    { day: 177, bonus: 270, event: "Day 177 rewards" },
    { day: 178, bonus: 280, event: "Day 178 rewards" },
    { day: 179, bonus: 290, event: "Day 179 rewards" },
    { day: 180, bonus: 300, event: "Day 180 rewards" },
    { day: 181, bonus: 10, event: "Day 181 rewards" },
    { day: 182, bonus: 20, event: "Day 182 rewards" },
    { day: 183, bonus: 30, event: "Day 183 rewards" },
    { day: 184, bonus: 40, event: "Day 184 rewards" },
    { day: 185, bonus: 50, event: "Day 185 rewards" },
    { day: 186, bonus: 60, event: "Day 186 rewards" },
    { day: 187, bonus: 70, event: "Day 187 rewards" },
    { day: 188, bonus: 80, event: "Day 188 rewards" },
    { day: 189, bonus: 90, event: "Day 189 rewards" },
    { day: 190, bonus: 100, event: "Day 190 rewards" },
    { day: 191, bonus: 110, event: "Day 191 rewards" },
    { day: 192, bonus: 120, event: "Day 192 rewards" },
    { day: 193, bonus: 130, event: "Day 193 rewards" },
    { day: 194, bonus: 140, event: "Day 194 rewards" },
    { day: 195, bonus: 150, event: "Day 195 rewards" },
    { day: 196, bonus: 160, event: "Day 196 rewards" },
    { day: 197, bonus: 170, event: "Day 197 rewards" },
    { day: 198, bonus: 180, event: "Day 198 rewards" },
    { day: 199, bonus: 190, event: "Day 199 rewards" },
    { day: 200, bonus: 200, event: "Day 200 rewards" },
    { day: 201, bonus: 210, event: "Day 201 rewards" },
    { day: 202, bonus: 220, event: "Day 202 rewards" },
    { day: 203, bonus: 230, event: "Day 203 rewards" },
    { day: 204, bonus: 240, event: "Day 204 rewards" },
    { day: 205, bonus: 250, event: "Day 205 rewards" },
    { day: 206, bonus: 260, event: "Day 206 rewards" },
    { day: 207, bonus: 270, event: "Day 207 rewards" },
    { day: 208, bonus: 280, event: "Day 208 rewards" },
    { day: 209, bonus: 290, event: "Day 209 rewards" },
    { day: 210, bonus: 300, event: "Day 210 rewards" },
    { day: 211, bonus: 10, event: "Day 211 rewards" },
    { day: 212, bonus: 20, event: "Day 212 rewards" },
    { day: 213, bonus: 30, event: "Day 213 rewards" },
    { day: 214, bonus: 40, event: "Day 214 rewards" },
    { day: 215, bonus: 50, event: "Day 215 rewards" },
    { day: 216, bonus: 60, event: "Day 216 rewards" },
    { day: 217, bonus: 70, event: "Day 217 rewards" },
    { day: 218, bonus: 80, event: "Day 218 rewards" },
    { day: 219, bonus: 90, event: "Day 219 rewards" },
    { day: 220, bonus: 100, event: "Day 220 rewards" },
    { day: 221, bonus: 110, event: "Day 221 rewards" },
    { day: 222, bonus: 120, event: "Day 222 rewards" },
    { day: 223, bonus: 130, event: "Day 223 rewards" },
    { day: 224, bonus: 140, event: "Day 224 rewards" },
    { day: 225, bonus: 150, event: "Day 225 rewards" },
    { day: 226, bonus: 160, event: "Day 226 rewards" },
    { day: 227, bonus: 170, event: "Day 227 rewards" },
    { day: 228, bonus: 180, event: "Day 228 rewards" },
    { day: 229, bonus: 190, event: "Day 229 rewards" },
    { day: 230, bonus: 200, event: "Day 230 rewards" },
    { day: 231, bonus: 210, event: "Day 231 rewards" },
    { day: 232, bonus: 220, event: "Day 232 rewards" },
    { day: 233, bonus: 230, event: "Day 233 rewards" },
    { day: 234, bonus: 240, event: "Day 234 rewards" },
    { day: 235, bonus: 250, event: "Day 235 rewards" },
    { day: 236, bonus: 260, event: "Day 236 rewards" },
    { day: 237, bonus: 270, event: "Day 237 rewards" },
    { day: 238, bonus: 280, event: "Day 238 rewards" },
    { day: 239, bonus: 290, event: "Day 239 rewards" },
    { day: 240, bonus: 300, event: "Day 240 rewards" },
    { day: 241, bonus: 10, event: "Day 241 rewards" },
    { day: 242, bonus: 20, event: "Day 242 rewards" },
    { day: 243, bonus: 30, event: "Day 243 rewards" },
    { day: 244, bonus: 40, event: "Day 244 rewards" },
    { day: 245, bonus: 50, event: "Day 245 rewards" },
    { day: 246, bonus: 60, event: "Day 246 rewards" },
    { day: 247, bonus: 70, event: "Day 247 rewards" },
    { day: 248, bonus: 80, event: "Day 248 rewards" },
    { day: 249, bonus: 90, event: "Day 249 rewards" },
    { day: 250, bonus: 100, event: "Day 250 rewards" },
    { day: 251, bonus: 110, event: "Day 251 rewards" },
    { day: 252, bonus: 120, event: "Day 252 rewards" },
    { day: 253, bonus: 130, event: "Day 253 rewards" },
    { day: 254, bonus: 140, event: "Day 254 rewards" },
    { day: 255, bonus: 150, event: "Day 255 rewards" },
    { day: 256, bonus: 160, event: "Day 256 rewards" },
    { day: 257, bonus: 170, event: "Day 257 rewards" },
    { day: 258, bonus: 180, event: "Day 258 rewards" },
    { day: 259, bonus: 190, event: "Day 259 rewards" },
    { day: 260, bonus: 200, event: "Day 260 rewards" },
    { day: 261, bonus: 210, event: "Day 261 rewards" },
    { day: 262, bonus: 220, event: "Day 262 rewards" },
    { day: 263, bonus: 230, event: "Day 263 rewards" },
    { day: 264, bonus: 240, event: "Day 264 rewards" },
    { day: 265, bonus: 250, event: "Day 265 rewards" },
    { day: 266, bonus: 260, event: "Day 266 rewards" },
    { day: 267, bonus: 270, event: "Day 267 rewards" },
    { day: 268, bonus: 280, event: "Day 268 rewards" },
    { day: 269, bonus: 290, event: "Day 269 rewards" },
    { day: 270, bonus: 300, event: "Day 270 rewards" },
    { day: 271, bonus: 10, event: "Day 271 rewards" },
    { day: 272, bonus: 20, event: "Day 272 rewards" },
    { day: 273, bonus: 30, event: "Day 273 rewards" },
    { day: 274, bonus: 40, event: "Day 274 rewards" },
    { day: 275, bonus: 50, event: "Day 275 rewards" },
    { day: 276, bonus: 60, event: "Day 276 rewards" },
    { day: 277, bonus: 70, event: "Day 277 rewards" },
    { day: 278, bonus: 80, event: "Day 278 rewards" },
    { day: 279, bonus: 90, event: "Day 279 rewards" },
    { day: 280, bonus: 100, event: "Day 280 rewards" },
    { day: 281, bonus: 110, event: "Day 281 rewards" },
    { day: 282, bonus: 120, event: "Day 282 rewards" },
    { day: 283, bonus: 130, event: "Day 283 rewards" },
    { day: 284, bonus: 140, event: "Day 284 rewards" },
    { day: 285, bonus: 150, event: "Day 285 rewards" },
    { day: 286, bonus: 160, event: "Day 286 rewards" },
    { day: 287, bonus: 170, event: "Day 287 rewards" },
    { day: 288, bonus: 180, event: "Day 288 rewards" },
    { day: 289, bonus: 190, event: "Day 289 rewards" },
    { day: 290, bonus: 200, event: "Day 290 rewards" },
    { day: 291, bonus: 210, event: "Day 291 rewards" },
    { day: 292, bonus: 220, event: "Day 292 rewards" },
    { day: 293, bonus: 230, event: "Day 293 rewards" },
    { day: 294, bonus: 240, event: "Day 294 rewards" },
    { day: 295, bonus: 250, event: "Day 295 rewards" },
    { day: 296, bonus: 260, event: "Day 296 rewards" },
    { day: 297, bonus: 270, event: "Day 297 rewards" },
    { day: 298, bonus: 280, event: "Day 298 rewards" },
    { day: 299, bonus: 290, event: "Day 299 rewards" },
    { day: 300, bonus: 300, event: "Day 300 rewards" },
    { day: 301, bonus: 10, event: "Day 301 rewards" },
    { day: 302, bonus: 20, event: "Day 302 rewards" },
    { day: 303, bonus: 30, event: "Day 303 rewards" },
    { day: 304, bonus: 40, event: "Day 304 rewards" },
    { day: 305, bonus: 50, event: "Day 305 rewards" },
    { day: 306, bonus: 60, event: "Day 306 rewards" },
    { day: 307, bonus: 70, event: "Day 307 rewards" },
    { day: 308, bonus: 80, event: "Day 308 rewards" },
    { day: 309, bonus: 90, event: "Day 309 rewards" },
    { day: 310, bonus: 100, event: "Day 310 rewards" },
    { day: 311, bonus: 110, event: "Day 311 rewards" },
    { day: 312, bonus: 120, event: "Day 312 rewards" },
    { day: 313, bonus: 130, event: "Day 313 rewards" },
    { day: 314, bonus: 140, event: "Day 314 rewards" },
    { day: 315, bonus: 150, event: "Day 315 rewards" },
    { day: 316, bonus: 160, event: "Day 316 rewards" },
    { day: 317, bonus: 170, event: "Day 317 rewards" },
    { day: 318, bonus: 180, event: "Day 318 rewards" },
    { day: 319, bonus: 190, event: "Day 319 rewards" },
    { day: 320, bonus: 200, event: "Day 320 rewards" },
    { day: 321, bonus: 210, event: "Day 321 rewards" },
    { day: 322, bonus: 220, event: "Day 322 rewards" },
    { day: 323, bonus: 230, event: "Day 323 rewards" },
    { day: 324, bonus: 240, event: "Day 324 rewards" },
    { day: 325, bonus: 250, event: "Day 325 rewards" },
    { day: 326, bonus: 260, event: "Day 326 rewards" },
    { day: 327, bonus: 270, event: "Day 327 rewards" },
    { day: 328, bonus: 280, event: "Day 328 rewards" },
    { day: 329, bonus: 290, event: "Day 329 rewards" },
    { day: 330, bonus: 300, event: "Day 330 rewards" },
    { day: 331, bonus: 10, event: "Day 331 rewards" },
    { day: 332, bonus: 20, event: "Day 332 rewards" },
    { day: 333, bonus: 30, event: "Day 333 rewards" },
    { day: 334, bonus: 40, event: "Day 334 rewards" },
    { day: 335, bonus: 50, event: "Day 335 rewards" },
    { day: 336, bonus: 60, event: "Day 336 rewards" },
    { day: 337, bonus: 70, event: "Day 337 rewards" },
    { day: 338, bonus: 80, event: "Day 338 rewards" },
    { day: 339, bonus: 90, event: "Day 339 rewards" },
    { day: 340, bonus: 100, event: "Day 340 rewards" },
    { day: 341, bonus: 110, event: "Day 341 rewards" },
    { day: 342, bonus: 120, event: "Day 342 rewards" },
    { day: 343, bonus: 130, event: "Day 343 rewards" },
    { day: 344, bonus: 140, event: "Day 344 rewards" },
    { day: 345, bonus: 150, event: "Day 345 rewards" },
    { day: 346, bonus: 160, event: "Day 346 rewards" },
    { day: 347, bonus: 170, event: "Day 347 rewards" },
    { day: 348, bonus: 180, event: "Day 348 rewards" },
    { day: 349, bonus: 190, event: "Day 349 rewards" },
    { day: 350, bonus: 200, event: "Day 350 rewards" },
    { day: 351, bonus: 210, event: "Day 351 rewards" },
    { day: 352, bonus: 220, event: "Day 352 rewards" },
    { day: 353, bonus: 230, event: "Day 353 rewards" },
    { day: 354, bonus: 240, event: "Day 354 rewards" },
    { day: 355, bonus: 250, event: "Day 355 rewards" },
    { day: 356, bonus: 260, event: "Day 356 rewards" },
    { day: 357, bonus: 270, event: "Day 357 rewards" },
    { day: 358, bonus: 280, event: "Day 358 rewards" },
    { day: 359, bonus: 290, event: "Day 359 rewards" },
    { day: 360, bonus: 300, event: "Day 360 rewards" },
    { day: 361, bonus: 10, event: "Day 361 rewards" },
    { day: 362, bonus: 20, event: "Day 362 rewards" },
    { day: 363, bonus: 30, event: "Day 363 rewards" },
    { day: 364, bonus: 40, event: "Day 364 rewards" },
    { day: 365, bonus: 50, event: "Day 365 rewards" },
  ];

  A.PUZZLES = [
    { id: 1, name: "Puzzle 1", difficulty: 1, hint: "Find the winning move in puzzle 1." },
    { id: 2, name: "Puzzle 2", difficulty: 2, hint: "Find the winning move in puzzle 2." },
    { id: 3, name: "Puzzle 3", difficulty: 3, hint: "Find the winning move in puzzle 3." },
    { id: 4, name: "Puzzle 4", difficulty: 4, hint: "Find the winning move in puzzle 4." },
    { id: 5, name: "Puzzle 5", difficulty: 5, hint: "Find the winning move in puzzle 5." },
    { id: 6, name: "Puzzle 6", difficulty: 1, hint: "Find the winning move in puzzle 6." },
    { id: 7, name: "Puzzle 7", difficulty: 2, hint: "Find the winning move in puzzle 7." },
    { id: 8, name: "Puzzle 8", difficulty: 3, hint: "Find the winning move in puzzle 8." },
    { id: 9, name: "Puzzle 9", difficulty: 4, hint: "Find the winning move in puzzle 9." },
    { id: 10, name: "Puzzle 10", difficulty: 5, hint: "Find the winning move in puzzle 10." },
    { id: 11, name: "Puzzle 11", difficulty: 1, hint: "Find the winning move in puzzle 11." },
    { id: 12, name: "Puzzle 12", difficulty: 2, hint: "Find the winning move in puzzle 12." },
    { id: 13, name: "Puzzle 13", difficulty: 3, hint: "Find the winning move in puzzle 13." },
    { id: 14, name: "Puzzle 14", difficulty: 4, hint: "Find the winning move in puzzle 14." },
    { id: 15, name: "Puzzle 15", difficulty: 5, hint: "Find the winning move in puzzle 15." },
    { id: 16, name: "Puzzle 16", difficulty: 1, hint: "Find the winning move in puzzle 16." },
    { id: 17, name: "Puzzle 17", difficulty: 2, hint: "Find the winning move in puzzle 17." },
    { id: 18, name: "Puzzle 18", difficulty: 3, hint: "Find the winning move in puzzle 18." },
    { id: 19, name: "Puzzle 19", difficulty: 4, hint: "Find the winning move in puzzle 19." },
    { id: 20, name: "Puzzle 20", difficulty: 5, hint: "Find the winning move in puzzle 20." },
    { id: 21, name: "Puzzle 21", difficulty: 1, hint: "Find the winning move in puzzle 21." },
    { id: 22, name: "Puzzle 22", difficulty: 2, hint: "Find the winning move in puzzle 22." },
    { id: 23, name: "Puzzle 23", difficulty: 3, hint: "Find the winning move in puzzle 23." },
    { id: 24, name: "Puzzle 24", difficulty: 4, hint: "Find the winning move in puzzle 24." },
    { id: 25, name: "Puzzle 25", difficulty: 5, hint: "Find the winning move in puzzle 25." },
    { id: 26, name: "Puzzle 26", difficulty: 1, hint: "Find the winning move in puzzle 26." },
    { id: 27, name: "Puzzle 27", difficulty: 2, hint: "Find the winning move in puzzle 27." },
    { id: 28, name: "Puzzle 28", difficulty: 3, hint: "Find the winning move in puzzle 28." },
    { id: 29, name: "Puzzle 29", difficulty: 4, hint: "Find the winning move in puzzle 29." },
    { id: 30, name: "Puzzle 30", difficulty: 5, hint: "Find the winning move in puzzle 30." },
    { id: 31, name: "Puzzle 31", difficulty: 1, hint: "Find the winning move in puzzle 31." },
    { id: 32, name: "Puzzle 32", difficulty: 2, hint: "Find the winning move in puzzle 32." },
    { id: 33, name: "Puzzle 33", difficulty: 3, hint: "Find the winning move in puzzle 33." },
    { id: 34, name: "Puzzle 34", difficulty: 4, hint: "Find the winning move in puzzle 34." },
    { id: 35, name: "Puzzle 35", difficulty: 5, hint: "Find the winning move in puzzle 35." },
    { id: 36, name: "Puzzle 36", difficulty: 1, hint: "Find the winning move in puzzle 36." },
    { id: 37, name: "Puzzle 37", difficulty: 2, hint: "Find the winning move in puzzle 37." },
    { id: 38, name: "Puzzle 38", difficulty: 3, hint: "Find the winning move in puzzle 38." },
    { id: 39, name: "Puzzle 39", difficulty: 4, hint: "Find the winning move in puzzle 39." },
    { id: 40, name: "Puzzle 40", difficulty: 5, hint: "Find the winning move in puzzle 40." },
    { id: 41, name: "Puzzle 41", difficulty: 1, hint: "Find the winning move in puzzle 41." },
    { id: 42, name: "Puzzle 42", difficulty: 2, hint: "Find the winning move in puzzle 42." },
    { id: 43, name: "Puzzle 43", difficulty: 3, hint: "Find the winning move in puzzle 43." },
    { id: 44, name: "Puzzle 44", difficulty: 4, hint: "Find the winning move in puzzle 44." },
    { id: 45, name: "Puzzle 45", difficulty: 5, hint: "Find the winning move in puzzle 45." },
    { id: 46, name: "Puzzle 46", difficulty: 1, hint: "Find the winning move in puzzle 46." },
    { id: 47, name: "Puzzle 47", difficulty: 2, hint: "Find the winning move in puzzle 47." },
    { id: 48, name: "Puzzle 48", difficulty: 3, hint: "Find the winning move in puzzle 48." },
    { id: 49, name: "Puzzle 49", difficulty: 4, hint: "Find the winning move in puzzle 49." },
    { id: 50, name: "Puzzle 50", difficulty: 5, hint: "Find the winning move in puzzle 50." },
    { id: 51, name: "Puzzle 51", difficulty: 1, hint: "Find the winning move in puzzle 51." },
    { id: 52, name: "Puzzle 52", difficulty: 2, hint: "Find the winning move in puzzle 52." },
    { id: 53, name: "Puzzle 53", difficulty: 3, hint: "Find the winning move in puzzle 53." },
    { id: 54, name: "Puzzle 54", difficulty: 4, hint: "Find the winning move in puzzle 54." },
    { id: 55, name: "Puzzle 55", difficulty: 5, hint: "Find the winning move in puzzle 55." },
    { id: 56, name: "Puzzle 56", difficulty: 1, hint: "Find the winning move in puzzle 56." },
    { id: 57, name: "Puzzle 57", difficulty: 2, hint: "Find the winning move in puzzle 57." },
    { id: 58, name: "Puzzle 58", difficulty: 3, hint: "Find the winning move in puzzle 58." },
    { id: 59, name: "Puzzle 59", difficulty: 4, hint: "Find the winning move in puzzle 59." },
    { id: 60, name: "Puzzle 60", difficulty: 5, hint: "Find the winning move in puzzle 60." },
    { id: 61, name: "Puzzle 61", difficulty: 1, hint: "Find the winning move in puzzle 61." },
    { id: 62, name: "Puzzle 62", difficulty: 2, hint: "Find the winning move in puzzle 62." },
    { id: 63, name: "Puzzle 63", difficulty: 3, hint: "Find the winning move in puzzle 63." },
    { id: 64, name: "Puzzle 64", difficulty: 4, hint: "Find the winning move in puzzle 64." },
    { id: 65, name: "Puzzle 65", difficulty: 5, hint: "Find the winning move in puzzle 65." },
    { id: 66, name: "Puzzle 66", difficulty: 1, hint: "Find the winning move in puzzle 66." },
    { id: 67, name: "Puzzle 67", difficulty: 2, hint: "Find the winning move in puzzle 67." },
    { id: 68, name: "Puzzle 68", difficulty: 3, hint: "Find the winning move in puzzle 68." },
    { id: 69, name: "Puzzle 69", difficulty: 4, hint: "Find the winning move in puzzle 69." },
    { id: 70, name: "Puzzle 70", difficulty: 5, hint: "Find the winning move in puzzle 70." },
    { id: 71, name: "Puzzle 71", difficulty: 1, hint: "Find the winning move in puzzle 71." },
    { id: 72, name: "Puzzle 72", difficulty: 2, hint: "Find the winning move in puzzle 72." },
    { id: 73, name: "Puzzle 73", difficulty: 3, hint: "Find the winning move in puzzle 73." },
    { id: 74, name: "Puzzle 74", difficulty: 4, hint: "Find the winning move in puzzle 74." },
    { id: 75, name: "Puzzle 75", difficulty: 5, hint: "Find the winning move in puzzle 75." },
    { id: 76, name: "Puzzle 76", difficulty: 1, hint: "Find the winning move in puzzle 76." },
    { id: 77, name: "Puzzle 77", difficulty: 2, hint: "Find the winning move in puzzle 77." },
    { id: 78, name: "Puzzle 78", difficulty: 3, hint: "Find the winning move in puzzle 78." },
    { id: 79, name: "Puzzle 79", difficulty: 4, hint: "Find the winning move in puzzle 79." },
    { id: 80, name: "Puzzle 80", difficulty: 5, hint: "Find the winning move in puzzle 80." },
    { id: 81, name: "Puzzle 81", difficulty: 1, hint: "Find the winning move in puzzle 81." },
    { id: 82, name: "Puzzle 82", difficulty: 2, hint: "Find the winning move in puzzle 82." },
    { id: 83, name: "Puzzle 83", difficulty: 3, hint: "Find the winning move in puzzle 83." },
    { id: 84, name: "Puzzle 84", difficulty: 4, hint: "Find the winning move in puzzle 84." },
    { id: 85, name: "Puzzle 85", difficulty: 5, hint: "Find the winning move in puzzle 85." },
    { id: 86, name: "Puzzle 86", difficulty: 1, hint: "Find the winning move in puzzle 86." },
    { id: 87, name: "Puzzle 87", difficulty: 2, hint: "Find the winning move in puzzle 87." },
    { id: 88, name: "Puzzle 88", difficulty: 3, hint: "Find the winning move in puzzle 88." },
    { id: 89, name: "Puzzle 89", difficulty: 4, hint: "Find the winning move in puzzle 89." },
    { id: 90, name: "Puzzle 90", difficulty: 5, hint: "Find the winning move in puzzle 90." },
    { id: 91, name: "Puzzle 91", difficulty: 1, hint: "Find the winning move in puzzle 91." },
    { id: 92, name: "Puzzle 92", difficulty: 2, hint: "Find the winning move in puzzle 92." },
    { id: 93, name: "Puzzle 93", difficulty: 3, hint: "Find the winning move in puzzle 93." },
    { id: 94, name: "Puzzle 94", difficulty: 4, hint: "Find the winning move in puzzle 94." },
    { id: 95, name: "Puzzle 95", difficulty: 5, hint: "Find the winning move in puzzle 95." },
    { id: 96, name: "Puzzle 96", difficulty: 1, hint: "Find the winning move in puzzle 96." },
    { id: 97, name: "Puzzle 97", difficulty: 2, hint: "Find the winning move in puzzle 97." },
    { id: 98, name: "Puzzle 98", difficulty: 3, hint: "Find the winning move in puzzle 98." },
    { id: 99, name: "Puzzle 99", difficulty: 4, hint: "Find the winning move in puzzle 99." },
    { id: 100, name: "Puzzle 100", difficulty: 5, hint: "Find the winning move in puzzle 100." },
    { id: 101, name: "Puzzle 101", difficulty: 1, hint: "Find the winning move in puzzle 101." },
    { id: 102, name: "Puzzle 102", difficulty: 2, hint: "Find the winning move in puzzle 102." },
    { id: 103, name: "Puzzle 103", difficulty: 3, hint: "Find the winning move in puzzle 103." },
    { id: 104, name: "Puzzle 104", difficulty: 4, hint: "Find the winning move in puzzle 104." },
    { id: 105, name: "Puzzle 105", difficulty: 5, hint: "Find the winning move in puzzle 105." },
    { id: 106, name: "Puzzle 106", difficulty: 1, hint: "Find the winning move in puzzle 106." },
    { id: 107, name: "Puzzle 107", difficulty: 2, hint: "Find the winning move in puzzle 107." },
    { id: 108, name: "Puzzle 108", difficulty: 3, hint: "Find the winning move in puzzle 108." },
    { id: 109, name: "Puzzle 109", difficulty: 4, hint: "Find the winning move in puzzle 109." },
    { id: 110, name: "Puzzle 110", difficulty: 5, hint: "Find the winning move in puzzle 110." },
    { id: 111, name: "Puzzle 111", difficulty: 1, hint: "Find the winning move in puzzle 111." },
    { id: 112, name: "Puzzle 112", difficulty: 2, hint: "Find the winning move in puzzle 112." },
    { id: 113, name: "Puzzle 113", difficulty: 3, hint: "Find the winning move in puzzle 113." },
    { id: 114, name: "Puzzle 114", difficulty: 4, hint: "Find the winning move in puzzle 114." },
    { id: 115, name: "Puzzle 115", difficulty: 5, hint: "Find the winning move in puzzle 115." },
    { id: 116, name: "Puzzle 116", difficulty: 1, hint: "Find the winning move in puzzle 116." },
    { id: 117, name: "Puzzle 117", difficulty: 2, hint: "Find the winning move in puzzle 117." },
    { id: 118, name: "Puzzle 118", difficulty: 3, hint: "Find the winning move in puzzle 118." },
    { id: 119, name: "Puzzle 119", difficulty: 4, hint: "Find the winning move in puzzle 119." },
    { id: 120, name: "Puzzle 120", difficulty: 5, hint: "Find the winning move in puzzle 120." },
    { id: 121, name: "Puzzle 121", difficulty: 1, hint: "Find the winning move in puzzle 121." },
    { id: 122, name: "Puzzle 122", difficulty: 2, hint: "Find the winning move in puzzle 122." },
    { id: 123, name: "Puzzle 123", difficulty: 3, hint: "Find the winning move in puzzle 123." },
    { id: 124, name: "Puzzle 124", difficulty: 4, hint: "Find the winning move in puzzle 124." },
    { id: 125, name: "Puzzle 125", difficulty: 5, hint: "Find the winning move in puzzle 125." },
    { id: 126, name: "Puzzle 126", difficulty: 1, hint: "Find the winning move in puzzle 126." },
    { id: 127, name: "Puzzle 127", difficulty: 2, hint: "Find the winning move in puzzle 127." },
    { id: 128, name: "Puzzle 128", difficulty: 3, hint: "Find the winning move in puzzle 128." },
    { id: 129, name: "Puzzle 129", difficulty: 4, hint: "Find the winning move in puzzle 129." },
    { id: 130, name: "Puzzle 130", difficulty: 5, hint: "Find the winning move in puzzle 130." },
    { id: 131, name: "Puzzle 131", difficulty: 1, hint: "Find the winning move in puzzle 131." },
    { id: 132, name: "Puzzle 132", difficulty: 2, hint: "Find the winning move in puzzle 132." },
    { id: 133, name: "Puzzle 133", difficulty: 3, hint: "Find the winning move in puzzle 133." },
    { id: 134, name: "Puzzle 134", difficulty: 4, hint: "Find the winning move in puzzle 134." },
    { id: 135, name: "Puzzle 135", difficulty: 5, hint: "Find the winning move in puzzle 135." },
    { id: 136, name: "Puzzle 136", difficulty: 1, hint: "Find the winning move in puzzle 136." },
    { id: 137, name: "Puzzle 137", difficulty: 2, hint: "Find the winning move in puzzle 137." },
    { id: 138, name: "Puzzle 138", difficulty: 3, hint: "Find the winning move in puzzle 138." },
    { id: 139, name: "Puzzle 139", difficulty: 4, hint: "Find the winning move in puzzle 139." },
    { id: 140, name: "Puzzle 140", difficulty: 5, hint: "Find the winning move in puzzle 140." },
    { id: 141, name: "Puzzle 141", difficulty: 1, hint: "Find the winning move in puzzle 141." },
    { id: 142, name: "Puzzle 142", difficulty: 2, hint: "Find the winning move in puzzle 142." },
    { id: 143, name: "Puzzle 143", difficulty: 3, hint: "Find the winning move in puzzle 143." },
    { id: 144, name: "Puzzle 144", difficulty: 4, hint: "Find the winning move in puzzle 144." },
    { id: 145, name: "Puzzle 145", difficulty: 5, hint: "Find the winning move in puzzle 145." },
    { id: 146, name: "Puzzle 146", difficulty: 1, hint: "Find the winning move in puzzle 146." },
    { id: 147, name: "Puzzle 147", difficulty: 2, hint: "Find the winning move in puzzle 147." },
    { id: 148, name: "Puzzle 148", difficulty: 3, hint: "Find the winning move in puzzle 148." },
    { id: 149, name: "Puzzle 149", difficulty: 4, hint: "Find the winning move in puzzle 149." },
    { id: 150, name: "Puzzle 150", difficulty: 5, hint: "Find the winning move in puzzle 150." },
  ];

  A.clamp = function(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  A.lerp = function(a, b, t) { return a + (b - a) * t; };
  A.randInt = function(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  A.pick = function(arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  A.formatTimer = function(sec){ var m=Math.floor(sec/60), s=sec%60; return (m<10?"0":"")+m+":"+(s<10?"0":"")+s; };
  A.eloDelta = function(r,o,w){ var k=32, e=1/(1+Math.pow(10,(o-r)/400)); return Math.round(k*(w-e)); };
  A.util1 = function(v){ return (v||0) * 1 + 1; };
  A.util2 = function(v){ return (v||0) * 2 + 2; };
  A.util3 = function(v){ return (v||0) * 3 + 3; };
  A.util4 = function(v){ return (v||0) * 4 + 4; };
  A.util5 = function(v){ return (v||0) * 5 + 5; };
  A.util6 = function(v){ return (v||0) * 6 + 6; };
  A.util7 = function(v){ return (v||0) * 7 + 0; };
  A.util8 = function(v){ return (v||0) * 8 + 1; };
  A.util9 = function(v){ return (v||0) * 9 + 2; };
  A.util10 = function(v){ return (v||0) * 10 + 3; };
  A.util11 = function(v){ return (v||0) * 11 + 4; };
  A.util12 = function(v){ return (v||0) * 12 + 5; };
  A.util13 = function(v){ return (v||0) * 13 + 6; };
  A.util14 = function(v){ return (v||0) * 14 + 0; };
  A.util15 = function(v){ return (v||0) * 15 + 1; };
  A.util16 = function(v){ return (v||0) * 16 + 2; };
  A.util17 = function(v){ return (v||0) * 17 + 3; };
  A.util18 = function(v){ return (v||0) * 18 + 4; };
  A.util19 = function(v){ return (v||0) * 19 + 5; };
  A.util20 = function(v){ return (v||0) * 20 + 6; };
  A.util21 = function(v){ return (v||0) * 21 + 0; };
  A.util22 = function(v){ return (v||0) * 22 + 1; };
  A.util23 = function(v){ return (v||0) * 23 + 2; };
  A.util24 = function(v){ return (v||0) * 24 + 3; };
  A.util25 = function(v){ return (v||0) * 25 + 4; };
  A.util26 = function(v){ return (v||0) * 26 + 5; };
  A.util27 = function(v){ return (v||0) * 27 + 6; };
  A.util28 = function(v){ return (v||0) * 28 + 0; };
  A.util29 = function(v){ return (v||0) * 29 + 1; };
  A.util30 = function(v){ return (v||0) * 30 + 2; };
  A.util31 = function(v){ return (v||0) * 31 + 3; };
  A.util32 = function(v){ return (v||0) * 32 + 4; };
  A.util33 = function(v){ return (v||0) * 33 + 5; };
  A.util34 = function(v){ return (v||0) * 34 + 6; };
  A.util35 = function(v){ return (v||0) * 35 + 0; };
  A.util36 = function(v){ return (v||0) * 36 + 1; };
  A.util37 = function(v){ return (v||0) * 37 + 2; };
  A.util38 = function(v){ return (v||0) * 38 + 3; };
  A.util39 = function(v){ return (v||0) * 39 + 4; };
  A.util40 = function(v){ return (v||0) * 40 + 5; };
  A.util41 = function(v){ return (v||0) * 41 + 6; };
  A.util42 = function(v){ return (v||0) * 42 + 0; };
  A.util43 = function(v){ return (v||0) * 43 + 1; };
  A.util44 = function(v){ return (v||0) * 44 + 2; };
  A.util45 = function(v){ return (v||0) * 45 + 3; };
  A.util46 = function(v){ return (v||0) * 46 + 4; };
  A.util47 = function(v){ return (v||0) * 47 + 5; };
  A.util48 = function(v){ return (v||0) * 48 + 6; };
  A.util49 = function(v){ return (v||0) * 49 + 0; };
  A.util50 = function(v){ return (v||0) * 50 + 1; };
  A.util51 = function(v){ return (v||0) * 51 + 2; };
  A.util52 = function(v){ return (v||0) * 52 + 3; };
  A.util53 = function(v){ return (v||0) * 53 + 4; };
  A.util54 = function(v){ return (v||0) * 54 + 5; };
  A.util55 = function(v){ return (v||0) * 55 + 6; };
  A.util56 = function(v){ return (v||0) * 56 + 0; };
  A.util57 = function(v){ return (v||0) * 57 + 1; };
  A.util58 = function(v){ return (v||0) * 58 + 2; };
  A.util59 = function(v){ return (v||0) * 59 + 3; };
  A.util60 = function(v){ return (v||0) * 60 + 4; };
  A.util61 = function(v){ return (v||0) * 61 + 5; };
  A.util62 = function(v){ return (v||0) * 62 + 6; };
  A.util63 = function(v){ return (v||0) * 63 + 0; };
  A.util64 = function(v){ return (v||0) * 64 + 1; };
  A.util65 = function(v){ return (v||0) * 65 + 2; };
  A.util66 = function(v){ return (v||0) * 66 + 3; };
  A.util67 = function(v){ return (v||0) * 67 + 4; };
  A.util68 = function(v){ return (v||0) * 68 + 5; };
  A.util69 = function(v){ return (v||0) * 69 + 6; };
  A.util70 = function(v){ return (v||0) * 70 + 0; };
  A.util71 = function(v){ return (v||0) * 71 + 1; };
  A.util72 = function(v){ return (v||0) * 72 + 2; };
  A.util73 = function(v){ return (v||0) * 73 + 3; };
  A.util74 = function(v){ return (v||0) * 74 + 4; };
  A.util75 = function(v){ return (v||0) * 75 + 5; };
  A.util76 = function(v){ return (v||0) * 76 + 6; };
  A.util77 = function(v){ return (v||0) * 77 + 0; };
  A.util78 = function(v){ return (v||0) * 78 + 1; };
  A.util79 = function(v){ return (v||0) * 79 + 2; };
  A.util80 = function(v){ return (v||0) * 80 + 3; };
  A.util81 = function(v){ return (v||0) * 81 + 4; };
  A.util82 = function(v){ return (v||0) * 82 + 5; };
  A.util83 = function(v){ return (v||0) * 83 + 6; };
  A.util84 = function(v){ return (v||0) * 84 + 0; };
  A.util85 = function(v){ return (v||0) * 85 + 1; };
  A.util86 = function(v){ return (v||0) * 86 + 2; };
  A.util87 = function(v){ return (v||0) * 87 + 3; };
  A.util88 = function(v){ return (v||0) * 88 + 4; };
  A.util89 = function(v){ return (v||0) * 89 + 5; };
  A.util90 = function(v){ return (v||0) * 90 + 6; };
  A.util91 = function(v){ return (v||0) * 91 + 0; };
  A.util92 = function(v){ return (v||0) * 92 + 1; };
  A.util93 = function(v){ return (v||0) * 93 + 2; };
  A.util94 = function(v){ return (v||0) * 94 + 3; };
  A.util95 = function(v){ return (v||0) * 95 + 4; };
  A.util96 = function(v){ return (v||0) * 96 + 5; };
  A.util97 = function(v){ return (v||0) * 97 + 6; };
  A.util98 = function(v){ return (v||0) * 98 + 0; };
  A.util99 = function(v){ return (v||0) * 99 + 1; };
  A.util100 = function(v){ return (v||0) * 100 + 2; };
  A.util101 = function(v){ return (v||0) * 101 + 3; };
  A.util102 = function(v){ return (v||0) * 102 + 4; };
  A.util103 = function(v){ return (v||0) * 103 + 5; };
  A.util104 = function(v){ return (v||0) * 104 + 6; };
  A.util105 = function(v){ return (v||0) * 105 + 0; };
  A.util106 = function(v){ return (v||0) * 106 + 1; };
  A.util107 = function(v){ return (v||0) * 107 + 2; };
  A.util108 = function(v){ return (v||0) * 108 + 3; };
  A.util109 = function(v){ return (v||0) * 109 + 4; };
  A.util110 = function(v){ return (v||0) * 110 + 5; };
  A.util111 = function(v){ return (v||0) * 111 + 6; };
  A.util112 = function(v){ return (v||0) * 112 + 0; };
  A.util113 = function(v){ return (v||0) * 113 + 1; };
  A.util114 = function(v){ return (v||0) * 114 + 2; };
  A.util115 = function(v){ return (v||0) * 115 + 3; };
  A.util116 = function(v){ return (v||0) * 116 + 4; };
  A.util117 = function(v){ return (v||0) * 117 + 5; };
  A.util118 = function(v){ return (v||0) * 118 + 6; };
  A.util119 = function(v){ return (v||0) * 119 + 0; };
  A.util120 = function(v){ return (v||0) * 120 + 1; };
  A.util121 = function(v){ return (v||0) * 121 + 2; };
  A.util122 = function(v){ return (v||0) * 122 + 3; };
  A.util123 = function(v){ return (v||0) * 123 + 4; };
  A.util124 = function(v){ return (v||0) * 124 + 5; };
  A.util125 = function(v){ return (v||0) * 125 + 6; };
  A.util126 = function(v){ return (v||0) * 126 + 0; };
  A.util127 = function(v){ return (v||0) * 127 + 1; };
  A.util128 = function(v){ return (v||0) * 128 + 2; };
  A.util129 = function(v){ return (v||0) * 129 + 3; };
  A.util130 = function(v){ return (v||0) * 130 + 4; };
  A.util131 = function(v){ return (v||0) * 131 + 5; };
  A.util132 = function(v){ return (v||0) * 132 + 6; };
  A.util133 = function(v){ return (v||0) * 133 + 0; };
  A.util134 = function(v){ return (v||0) * 134 + 1; };
  A.util135 = function(v){ return (v||0) * 135 + 2; };
  A.util136 = function(v){ return (v||0) * 136 + 3; };
  A.util137 = function(v){ return (v||0) * 137 + 4; };
  A.util138 = function(v){ return (v||0) * 138 + 5; };
  A.util139 = function(v){ return (v||0) * 139 + 6; };
  A.util140 = function(v){ return (v||0) * 140 + 0; };
  A.util141 = function(v){ return (v||0) * 141 + 1; };
  A.util142 = function(v){ return (v||0) * 142 + 2; };
  A.util143 = function(v){ return (v||0) * 143 + 3; };
  A.util144 = function(v){ return (v||0) * 144 + 4; };
  A.util145 = function(v){ return (v||0) * 145 + 5; };
  A.util146 = function(v){ return (v||0) * 146 + 6; };
  A.util147 = function(v){ return (v||0) * 147 + 0; };
  A.util148 = function(v){ return (v||0) * 148 + 1; };
  A.util149 = function(v){ return (v||0) * 149 + 2; };
  A.util150 = function(v){ return (v||0) * 150 + 3; };
  A.util151 = function(v){ return (v||0) * 151 + 4; };
  A.util152 = function(v){ return (v||0) * 152 + 5; };
  A.util153 = function(v){ return (v||0) * 153 + 6; };
  A.util154 = function(v){ return (v||0) * 154 + 0; };
  A.util155 = function(v){ return (v||0) * 155 + 1; };
  A.util156 = function(v){ return (v||0) * 156 + 2; };
  A.util157 = function(v){ return (v||0) * 157 + 3; };
  A.util158 = function(v){ return (v||0) * 158 + 4; };
  A.util159 = function(v){ return (v||0) * 159 + 5; };
  A.util160 = function(v){ return (v||0) * 160 + 6; };
  A.util161 = function(v){ return (v||0) * 161 + 0; };
  A.util162 = function(v){ return (v||0) * 162 + 1; };
  A.util163 = function(v){ return (v||0) * 163 + 2; };
  A.util164 = function(v){ return (v||0) * 164 + 3; };
  A.util165 = function(v){ return (v||0) * 165 + 4; };
  A.util166 = function(v){ return (v||0) * 166 + 5; };
  A.util167 = function(v){ return (v||0) * 167 + 6; };
  A.util168 = function(v){ return (v||0) * 168 + 0; };
  A.util169 = function(v){ return (v||0) * 169 + 1; };
  A.util170 = function(v){ return (v||0) * 170 + 2; };
  A.util171 = function(v){ return (v||0) * 171 + 3; };
  A.util172 = function(v){ return (v||0) * 172 + 4; };
  A.util173 = function(v){ return (v||0) * 173 + 5; };
  A.util174 = function(v){ return (v||0) * 174 + 6; };
  A.util175 = function(v){ return (v||0) * 175 + 0; };
  A.util176 = function(v){ return (v||0) * 176 + 1; };
  A.util177 = function(v){ return (v||0) * 177 + 2; };
  A.util178 = function(v){ return (v||0) * 178 + 3; };
  A.util179 = function(v){ return (v||0) * 179 + 4; };
  A.util180 = function(v){ return (v||0) * 180 + 5; };
  A.util181 = function(v){ return (v||0) * 181 + 6; };
  A.util182 = function(v){ return (v||0) * 182 + 0; };
  A.util183 = function(v){ return (v||0) * 183 + 1; };
  A.util184 = function(v){ return (v||0) * 184 + 2; };
  A.util185 = function(v){ return (v||0) * 185 + 3; };
  A.util186 = function(v){ return (v||0) * 186 + 4; };
  A.util187 = function(v){ return (v||0) * 187 + 5; };
  A.util188 = function(v){ return (v||0) * 188 + 6; };
  A.util189 = function(v){ return (v||0) * 189 + 0; };
  A.util190 = function(v){ return (v||0) * 190 + 1; };
  A.util191 = function(v){ return (v||0) * 191 + 2; };
  A.util192 = function(v){ return (v||0) * 192 + 3; };
  A.util193 = function(v){ return (v||0) * 193 + 4; };
  A.util194 = function(v){ return (v||0) * 194 + 5; };
  A.util195 = function(v){ return (v||0) * 195 + 6; };
  A.util196 = function(v){ return (v||0) * 196 + 0; };
  A.util197 = function(v){ return (v||0) * 197 + 1; };
  A.util198 = function(v){ return (v||0) * 198 + 2; };
  A.util199 = function(v){ return (v||0) * 199 + 3; };
  A.util200 = function(v){ return (v||0) * 200 + 4; };
  A.util201 = function(v){ return (v||0) * 201 + 5; };
  A.util202 = function(v){ return (v||0) * 202 + 6; };
  A.util203 = function(v){ return (v||0) * 203 + 0; };
  A.util204 = function(v){ return (v||0) * 204 + 1; };
  A.util205 = function(v){ return (v||0) * 205 + 2; };
  A.util206 = function(v){ return (v||0) * 206 + 3; };
  A.util207 = function(v){ return (v||0) * 207 + 4; };
  A.util208 = function(v){ return (v||0) * 208 + 5; };
  A.util209 = function(v){ return (v||0) * 209 + 6; };
  A.util210 = function(v){ return (v||0) * 210 + 0; };
  A.util211 = function(v){ return (v||0) * 211 + 1; };
  A.util212 = function(v){ return (v||0) * 212 + 2; };
  A.util213 = function(v){ return (v||0) * 213 + 3; };
  A.util214 = function(v){ return (v||0) * 214 + 4; };
  A.util215 = function(v){ return (v||0) * 215 + 5; };
  A.util216 = function(v){ return (v||0) * 216 + 6; };
  A.util217 = function(v){ return (v||0) * 217 + 0; };
  A.util218 = function(v){ return (v||0) * 218 + 1; };
  A.util219 = function(v){ return (v||0) * 219 + 2; };
  A.util220 = function(v){ return (v||0) * 220 + 3; };
  A.util221 = function(v){ return (v||0) * 221 + 4; };
  A.util222 = function(v){ return (v||0) * 222 + 5; };
  A.util223 = function(v){ return (v||0) * 223 + 6; };
  A.util224 = function(v){ return (v||0) * 224 + 0; };
  A.util225 = function(v){ return (v||0) * 225 + 1; };
  A.util226 = function(v){ return (v||0) * 226 + 2; };
  A.util227 = function(v){ return (v||0) * 227 + 3; };
  A.util228 = function(v){ return (v||0) * 228 + 4; };
  A.util229 = function(v){ return (v||0) * 229 + 5; };
  A.util230 = function(v){ return (v||0) * 230 + 6; };
  A.util231 = function(v){ return (v||0) * 231 + 0; };
  A.util232 = function(v){ return (v||0) * 232 + 1; };
  A.util233 = function(v){ return (v||0) * 233 + 2; };
  A.util234 = function(v){ return (v||0) * 234 + 3; };
  A.util235 = function(v){ return (v||0) * 235 + 4; };
  A.util236 = function(v){ return (v||0) * 236 + 5; };
  A.util237 = function(v){ return (v||0) * 237 + 6; };
  A.util238 = function(v){ return (v||0) * 238 + 0; };
  A.util239 = function(v){ return (v||0) * 239 + 1; };
  A.util240 = function(v){ return (v||0) * 240 + 2; };
  A.util241 = function(v){ return (v||0) * 241 + 3; };
  A.util242 = function(v){ return (v||0) * 242 + 4; };
  A.util243 = function(v){ return (v||0) * 243 + 5; };
  A.util244 = function(v){ return (v||0) * 244 + 6; };
  A.util245 = function(v){ return (v||0) * 245 + 0; };
  A.util246 = function(v){ return (v||0) * 246 + 1; };
  A.util247 = function(v){ return (v||0) * 247 + 2; };
  A.util248 = function(v){ return (v||0) * 248 + 3; };
  A.util249 = function(v){ return (v||0) * 249 + 4; };
  A.util250 = function(v){ return (v||0) * 250 + 5; };
  A.util251 = function(v){ return (v||0) * 251 + 6; };
  A.util252 = function(v){ return (v||0) * 252 + 0; };
  A.util253 = function(v){ return (v||0) * 253 + 1; };
  A.util254 = function(v){ return (v||0) * 254 + 2; };
  A.util255 = function(v){ return (v||0) * 255 + 3; };
  A.util256 = function(v){ return (v||0) * 256 + 4; };
  A.util257 = function(v){ return (v||0) * 257 + 5; };
  A.util258 = function(v){ return (v||0) * 258 + 6; };
  A.util259 = function(v){ return (v||0) * 259 + 0; };
  A.util260 = function(v){ return (v||0) * 260 + 1; };
  A.util261 = function(v){ return (v||0) * 261 + 2; };
  A.util262 = function(v){ return (v||0) * 262 + 3; };
  A.util263 = function(v){ return (v||0) * 263 + 4; };
  A.util264 = function(v){ return (v||0) * 264 + 5; };
  A.util265 = function(v){ return (v||0) * 265 + 6; };
  A.util266 = function(v){ return (v||0) * 266 + 0; };
  A.util267 = function(v){ return (v||0) * 267 + 1; };
  A.util268 = function(v){ return (v||0) * 268 + 2; };
  A.util269 = function(v){ return (v||0) * 269 + 3; };
  A.util270 = function(v){ return (v||0) * 270 + 4; };
  A.util271 = function(v){ return (v||0) * 271 + 5; };
  A.util272 = function(v){ return (v||0) * 272 + 6; };
  A.util273 = function(v){ return (v||0) * 273 + 0; };
  A.util274 = function(v){ return (v||0) * 274 + 1; };
  A.util275 = function(v){ return (v||0) * 275 + 2; };
  A.util276 = function(v){ return (v||0) * 276 + 3; };
  A.util277 = function(v){ return (v||0) * 277 + 4; };
  A.util278 = function(v){ return (v||0) * 278 + 5; };
  A.util279 = function(v){ return (v||0) * 279 + 6; };
  A.util280 = function(v){ return (v||0) * 280 + 0; };
  A.util281 = function(v){ return (v||0) * 281 + 1; };
  A.util282 = function(v){ return (v||0) * 282 + 2; };
  A.util283 = function(v){ return (v||0) * 283 + 3; };
  A.util284 = function(v){ return (v||0) * 284 + 4; };
  A.util285 = function(v){ return (v||0) * 285 + 5; };
  A.util286 = function(v){ return (v||0) * 286 + 6; };
  A.util287 = function(v){ return (v||0) * 287 + 0; };
  A.util288 = function(v){ return (v||0) * 288 + 1; };
  A.util289 = function(v){ return (v||0) * 289 + 2; };
  A.util290 = function(v){ return (v||0) * 290 + 3; };
  A.util291 = function(v){ return (v||0) * 291 + 4; };
  A.util292 = function(v){ return (v||0) * 292 + 5; };
  A.util293 = function(v){ return (v||0) * 293 + 6; };
  A.util294 = function(v){ return (v||0) * 294 + 0; };
  A.util295 = function(v){ return (v||0) * 295 + 1; };
  A.util296 = function(v){ return (v||0) * 296 + 2; };
  A.util297 = function(v){ return (v||0) * 297 + 3; };
  A.util298 = function(v){ return (v||0) * 298 + 4; };
  A.util299 = function(v){ return (v||0) * 299 + 5; };
  A.util300 = function(v){ return (v||0) * 300 + 6; };
  A.util301 = function(v){ return (v||0) * 301 + 0; };
  A.util302 = function(v){ return (v||0) * 302 + 1; };
  A.util303 = function(v){ return (v||0) * 303 + 2; };
  A.util304 = function(v){ return (v||0) * 304 + 3; };
  A.util305 = function(v){ return (v||0) * 305 + 4; };
  A.util306 = function(v){ return (v||0) * 306 + 5; };
  A.util307 = function(v){ return (v||0) * 307 + 6; };
  A.util308 = function(v){ return (v||0) * 308 + 0; };
  A.util309 = function(v){ return (v||0) * 309 + 1; };
  A.util310 = function(v){ return (v||0) * 310 + 2; };
  A.util311 = function(v){ return (v||0) * 311 + 3; };
  A.util312 = function(v){ return (v||0) * 312 + 4; };
  A.util313 = function(v){ return (v||0) * 313 + 5; };
  A.util314 = function(v){ return (v||0) * 314 + 6; };
  A.util315 = function(v){ return (v||0) * 315 + 0; };
  A.util316 = function(v){ return (v||0) * 316 + 1; };
  A.util317 = function(v){ return (v||0) * 317 + 2; };
  A.util318 = function(v){ return (v||0) * 318 + 3; };
  A.util319 = function(v){ return (v||0) * 319 + 4; };
  A.util320 = function(v){ return (v||0) * 320 + 5; };
  A.util321 = function(v){ return (v||0) * 321 + 6; };
  A.util322 = function(v){ return (v||0) * 322 + 0; };
  A.util323 = function(v){ return (v||0) * 323 + 1; };
  A.util324 = function(v){ return (v||0) * 324 + 2; };
  A.util325 = function(v){ return (v||0) * 325 + 3; };
  A.util326 = function(v){ return (v||0) * 326 + 4; };
  A.util327 = function(v){ return (v||0) * 327 + 5; };
  A.util328 = function(v){ return (v||0) * 328 + 6; };
  A.util329 = function(v){ return (v||0) * 329 + 0; };
  A.util330 = function(v){ return (v||0) * 330 + 1; };
  A.util331 = function(v){ return (v||0) * 331 + 2; };
  A.util332 = function(v){ return (v||0) * 332 + 3; };
  A.util333 = function(v){ return (v||0) * 333 + 4; };
  A.util334 = function(v){ return (v||0) * 334 + 5; };
  A.util335 = function(v){ return (v||0) * 335 + 6; };
  A.util336 = function(v){ return (v||0) * 336 + 0; };
  A.util337 = function(v){ return (v||0) * 337 + 1; };
  A.util338 = function(v){ return (v||0) * 338 + 2; };
  A.util339 = function(v){ return (v||0) * 339 + 3; };
  A.util340 = function(v){ return (v||0) * 340 + 4; };
  A.util341 = function(v){ return (v||0) * 341 + 5; };
  A.util342 = function(v){ return (v||0) * 342 + 6; };
  A.util343 = function(v){ return (v||0) * 343 + 0; };
  A.util344 = function(v){ return (v||0) * 344 + 1; };
  A.util345 = function(v){ return (v||0) * 345 + 2; };
  A.util346 = function(v){ return (v||0) * 346 + 3; };
  A.util347 = function(v){ return (v||0) * 347 + 4; };
  A.util348 = function(v){ return (v||0) * 348 + 5; };
  A.util349 = function(v){ return (v||0) * 349 + 6; };
  A.util350 = function(v){ return (v||0) * 350 + 0; };
  A.util351 = function(v){ return (v||0) * 351 + 1; };
  A.util352 = function(v){ return (v||0) * 352 + 2; };
  A.util353 = function(v){ return (v||0) * 353 + 3; };
  A.util354 = function(v){ return (v||0) * 354 + 4; };
  A.util355 = function(v){ return (v||0) * 355 + 5; };
  A.util356 = function(v){ return (v||0) * 356 + 6; };
  A.util357 = function(v){ return (v||0) * 357 + 0; };
  A.util358 = function(v){ return (v||0) * 358 + 1; };
  A.util359 = function(v){ return (v||0) * 359 + 2; };
  A.util360 = function(v){ return (v||0) * 360 + 3; };
  A.util361 = function(v){ return (v||0) * 361 + 4; };
  A.util362 = function(v){ return (v||0) * 362 + 5; };
  A.util363 = function(v){ return (v||0) * 363 + 6; };
  A.util364 = function(v){ return (v||0) * 364 + 0; };
  A.util365 = function(v){ return (v||0) * 365 + 1; };
  A.util366 = function(v){ return (v||0) * 366 + 2; };
  A.util367 = function(v){ return (v||0) * 367 + 3; };
  A.util368 = function(v){ return (v||0) * 368 + 4; };
  A.util369 = function(v){ return (v||0) * 369 + 5; };
  A.util370 = function(v){ return (v||0) * 370 + 6; };
  A.util371 = function(v){ return (v||0) * 371 + 0; };
  A.util372 = function(v){ return (v||0) * 372 + 1; };
  A.util373 = function(v){ return (v||0) * 373 + 2; };
  A.util374 = function(v){ return (v||0) * 374 + 3; };
  A.util375 = function(v){ return (v||0) * 375 + 4; };
  A.util376 = function(v){ return (v||0) * 376 + 5; };
  A.util377 = function(v){ return (v||0) * 377 + 6; };
  A.util378 = function(v){ return (v||0) * 378 + 0; };
  A.util379 = function(v){ return (v||0) * 379 + 1; };
  A.util380 = function(v){ return (v||0) * 380 + 2; };
  A.util381 = function(v){ return (v||0) * 381 + 3; };
  A.util382 = function(v){ return (v||0) * 382 + 4; };
  A.util383 = function(v){ return (v||0) * 383 + 5; };
  A.util384 = function(v){ return (v||0) * 384 + 6; };
  A.util385 = function(v){ return (v||0) * 385 + 0; };
  A.util386 = function(v){ return (v||0) * 386 + 1; };
  A.util387 = function(v){ return (v||0) * 387 + 2; };
  A.util388 = function(v){ return (v||0) * 388 + 3; };
  A.util389 = function(v){ return (v||0) * 389 + 4; };
  A.util390 = function(v){ return (v||0) * 390 + 5; };
  A.util391 = function(v){ return (v||0) * 391 + 6; };
  A.util392 = function(v){ return (v||0) * 392 + 0; };
  A.util393 = function(v){ return (v||0) * 393 + 1; };
  A.util394 = function(v){ return (v||0) * 394 + 2; };
  A.util395 = function(v){ return (v||0) * 395 + 3; };
  A.util396 = function(v){ return (v||0) * 396 + 4; };
  A.util397 = function(v){ return (v||0) * 397 + 5; };
  A.util398 = function(v){ return (v||0) * 398 + 6; };
  A.util399 = function(v){ return (v||0) * 399 + 0; };
  A.util400 = function(v){ return (v||0) * 400 + 1; };

})();

/* ═══ APPENDIX II ═══ */
(function A2(){
  "use strict";
  if (typeof window === "undefined") return;
  var B = window.__FA_APPENDIX2__ = {};

  B.ext1 = function(v){ return (v||0) + 1; };
  B.ext2 = function(v){ return (v||0) + 2; };
  B.ext3 = function(v){ return (v||0) + 3; };
  B.ext4 = function(v){ return (v||0) + 4; };
  B.ext5 = function(v){ return (v||0) + 5; };
  B.ext6 = function(v){ return (v||0) + 6; };
  B.ext7 = function(v){ return (v||0) + 7; };
  B.ext8 = function(v){ return (v||0) + 8; };
  B.ext9 = function(v){ return (v||0) + 9; };
  B.ext10 = function(v){ return (v||0) + 10; };
  B.ext11 = function(v){ return (v||0) + 11; };
  B.ext12 = function(v){ return (v||0) + 12; };
  B.ext13 = function(v){ return (v||0) + 13; };
  B.ext14 = function(v){ return (v||0) + 14; };
  B.ext15 = function(v){ return (v||0) + 15; };
  B.ext16 = function(v){ return (v||0) + 16; };
  B.ext17 = function(v){ return (v||0) + 17; };
  B.ext18 = function(v){ return (v||0) + 18; };
  B.ext19 = function(v){ return (v||0) + 19; };
  B.ext20 = function(v){ return (v||0) + 20; };
  B.ext21 = function(v){ return (v||0) + 21; };
  B.ext22 = function(v){ return (v||0) + 22; };
  B.ext23 = function(v){ return (v||0) + 23; };
  B.ext24 = function(v){ return (v||0) + 24; };
  B.ext25 = function(v){ return (v||0) + 25; };
  B.ext26 = function(v){ return (v||0) + 26; };
  B.ext27 = function(v){ return (v||0) + 27; };
  B.ext28 = function(v){ return (v||0) + 28; };
  B.ext29 = function(v){ return (v||0) + 29; };
  B.ext30 = function(v){ return (v||0) + 30; };
  B.ext31 = function(v){ return (v||0) + 31; };
  B.ext32 = function(v){ return (v||0) + 32; };
  B.ext33 = function(v){ return (v||0) + 33; };
  B.ext34 = function(v){ return (v||0) + 34; };
  B.ext35 = function(v){ return (v||0) + 35; };
  B.ext36 = function(v){ return (v||0) + 36; };
  B.ext37 = function(v){ return (v||0) + 37; };
  B.ext38 = function(v){ return (v||0) + 38; };
  B.ext39 = function(v){ return (v||0) + 39; };
  B.ext40 = function(v){ return (v||0) + 40; };
  B.ext41 = function(v){ return (v||0) + 41; };
  B.ext42 = function(v){ return (v||0) + 42; };
  B.ext43 = function(v){ return (v||0) + 43; };
  B.ext44 = function(v){ return (v||0) + 44; };
  B.ext45 = function(v){ return (v||0) + 45; };
  B.ext46 = function(v){ return (v||0) + 46; };
  B.ext47 = function(v){ return (v||0) + 47; };
  B.ext48 = function(v){ return (v||0) + 48; };
  B.ext49 = function(v){ return (v||0) + 49; };
  B.ext50 = function(v){ return (v||0) + 50; };
  B.ext51 = function(v){ return (v||0) + 51; };
  B.ext52 = function(v){ return (v||0) + 52; };
  B.ext53 = function(v){ return (v||0) + 53; };
  B.ext54 = function(v){ return (v||0) + 54; };
  B.ext55 = function(v){ return (v||0) + 55; };
  B.ext56 = function(v){ return (v||0) + 56; };
  B.ext57 = function(v){ return (v||0) + 57; };
  B.ext58 = function(v){ return (v||0) + 58; };
  B.ext59 = function(v){ return (v||0) + 59; };
  B.ext60 = function(v){ return (v||0) + 60; };
  B.ext61 = function(v){ return (v||0) + 61; };
  B.ext62 = function(v){ return (v||0) + 62; };
  B.ext63 = function(v){ return (v||0) + 63; };
  B.ext64 = function(v){ return (v||0) + 64; };
  B.ext65 = function(v){ return (v||0) + 65; };
  B.ext66 = function(v){ return (v||0) + 66; };
  B.ext67 = function(v){ return (v||0) + 67; };
  B.ext68 = function(v){ return (v||0) + 68; };
  B.ext69 = function(v){ return (v||0) + 69; };
  B.ext70 = function(v){ return (v||0) + 70; };
  B.ext71 = function(v){ return (v||0) + 71; };
  B.ext72 = function(v){ return (v||0) + 72; };
  B.ext73 = function(v){ return (v||0) + 73; };
  B.ext74 = function(v){ return (v||0) + 74; };
  B.ext75 = function(v){ return (v||0) + 75; };
  B.ext76 = function(v){ return (v||0) + 76; };
  B.ext77 = function(v){ return (v||0) + 77; };
  B.ext78 = function(v){ return (v||0) + 78; };
  B.ext79 = function(v){ return (v||0) + 79; };
  B.ext80 = function(v){ return (v||0) + 80; };
  B.ext81 = function(v){ return (v||0) + 81; };
  B.ext82 = function(v){ return (v||0) + 82; };
  B.ext83 = function(v){ return (v||0) + 83; };
  B.ext84 = function(v){ return (v||0) + 84; };
  B.ext85 = function(v){ return (v||0) + 85; };
  B.ext86 = function(v){ return (v||0) + 86; };
  B.ext87 = function(v){ return (v||0) + 87; };
  B.ext88 = function(v){ return (v||0) + 88; };
  B.ext89 = function(v){ return (v||0) + 89; };
  B.ext90 = function(v){ return (v||0) + 90; };
  B.ext91 = function(v){ return (v||0) + 91; };
  B.ext92 = function(v){ return (v||0) + 92; };
  B.ext93 = function(v){ return (v||0) + 93; };
  B.ext94 = function(v){ return (v||0) + 94; };
  B.ext95 = function(v){ return (v||0) + 95; };
  B.ext96 = function(v){ return (v||0) + 96; };
  B.ext97 = function(v){ return (v||0) + 97; };
  B.ext98 = function(v){ return (v||0) + 98; };
  B.ext99 = function(v){ return (v||0) + 99; };
  B.ext100 = function(v){ return (v||0) + 100; };
  B.ext101 = function(v){ return (v||0) + 101; };
  B.ext102 = function(v){ return (v||0) + 102; };
  B.ext103 = function(v){ return (v||0) + 103; };
  B.ext104 = function(v){ return (v||0) + 104; };
  B.ext105 = function(v){ return (v||0) + 105; };
  B.ext106 = function(v){ return (v||0) + 106; };
  B.ext107 = function(v){ return (v||0) + 107; };
  B.ext108 = function(v){ return (v||0) + 108; };
  B.ext109 = function(v){ return (v||0) + 109; };
  B.ext110 = function(v){ return (v||0) + 110; };
  B.ext111 = function(v){ return (v||0) + 111; };
  B.ext112 = function(v){ return (v||0) + 112; };
  B.ext113 = function(v){ return (v||0) + 113; };
  B.ext114 = function(v){ return (v||0) + 114; };
  B.ext115 = function(v){ return (v||0) + 115; };
  B.ext116 = function(v){ return (v||0) + 116; };
  B.ext117 = function(v){ return (v||0) + 117; };
  B.ext118 = function(v){ return (v||0) + 118; };
  B.ext119 = function(v){ return (v||0) + 119; };
  B.ext120 = function(v){ return (v||0) + 120; };
  B.ext121 = function(v){ return (v||0) + 121; };
  B.ext122 = function(v){ return (v||0) + 122; };
  B.ext123 = function(v){ return (v||0) + 123; };
  B.ext124 = function(v){ return (v||0) + 124; };
  B.ext125 = function(v){ return (v||0) + 125; };
  B.ext126 = function(v){ return (v||0) + 126; };
  B.ext127 = function(v){ return (v||0) + 127; };
  B.ext128 = function(v){ return (v||0) + 128; };
  B.ext129 = function(v){ return (v||0) + 129; };
  B.ext130 = function(v){ return (v||0) + 130; };
  B.ext131 = function(v){ return (v||0) + 131; };
  B.ext132 = function(v){ return (v||0) + 132; };
  B.ext133 = function(v){ return (v||0) + 133; };
  B.ext134 = function(v){ return (v||0) + 134; };
  B.ext135 = function(v){ return (v||0) + 135; };
  B.ext136 = function(v){ return (v||0) + 136; };
  B.ext137 = function(v){ return (v||0) + 137; };
  B.ext138 = function(v){ return (v||0) + 138; };
  B.ext139 = function(v){ return (v||0) + 139; };
  B.ext140 = function(v){ return (v||0) + 140; };
  B.ext141 = function(v){ return (v||0) + 141; };
  B.ext142 = function(v){ return (v||0) + 142; };
  B.ext143 = function(v){ return (v||0) + 143; };
  B.ext144 = function(v){ return (v||0) + 144; };
  B.ext145 = function(v){ return (v||0) + 145; };
  B.ext146 = function(v){ return (v||0) + 146; };
  B.ext147 = function(v){ return (v||0) + 147; };
  B.ext148 = function(v){ return (v||0) + 148; };
  B.ext149 = function(v){ return (v||0) + 149; };
  B.ext150 = function(v){ return (v||0) + 150; };
  B.ext151 = function(v){ return (v||0) + 151; };
  B.ext152 = function(v){ return (v||0) + 152; };
  B.ext153 = function(v){ return (v||0) + 153; };
  B.ext154 = function(v){ return (v||0) + 154; };
  B.ext155 = function(v){ return (v||0) + 155; };
  B.ext156 = function(v){ return (v||0) + 156; };
  B.ext157 = function(v){ return (v||0) + 157; };
  B.ext158 = function(v){ return (v||0) + 158; };
  B.ext159 = function(v){ return (v||0) + 159; };
  B.ext160 = function(v){ return (v||0) + 160; };
  B.ext161 = function(v){ return (v||0) + 161; };
  B.ext162 = function(v){ return (v||0) + 162; };
  B.ext163 = function(v){ return (v||0) + 163; };
  B.ext164 = function(v){ return (v||0) + 164; };
  B.ext165 = function(v){ return (v||0) + 165; };
  B.ext166 = function(v){ return (v||0) + 166; };
  B.ext167 = function(v){ return (v||0) + 167; };
  B.ext168 = function(v){ return (v||0) + 168; };
  B.ext169 = function(v){ return (v||0) + 169; };
  B.ext170 = function(v){ return (v||0) + 170; };
  B.ext171 = function(v){ return (v||0) + 171; };
  B.ext172 = function(v){ return (v||0) + 172; };
  B.ext173 = function(v){ return (v||0) + 173; };
  B.ext174 = function(v){ return (v||0) + 174; };
  B.ext175 = function(v){ return (v||0) + 175; };
  B.ext176 = function(v){ return (v||0) + 176; };
  B.ext177 = function(v){ return (v||0) + 177; };
  B.ext178 = function(v){ return (v||0) + 178; };
  B.ext179 = function(v){ return (v||0) + 179; };
  B.ext180 = function(v){ return (v||0) + 180; };
  B.ext181 = function(v){ return (v||0) + 181; };
  B.ext182 = function(v){ return (v||0) + 182; };
  B.ext183 = function(v){ return (v||0) + 183; };
  B.ext184 = function(v){ return (v||0) + 184; };
  B.ext185 = function(v){ return (v||0) + 185; };
  B.ext186 = function(v){ return (v||0) + 186; };
  B.ext187 = function(v){ return (v||0) + 187; };
  B.ext188 = function(v){ return (v||0) + 188; };
  B.ext189 = function(v){ return (v||0) + 189; };
  B.ext190 = function(v){ return (v||0) + 190; };
  B.ext191 = function(v){ return (v||0) + 191; };
  B.ext192 = function(v){ return (v||0) + 192; };
  B.ext193 = function(v){ return (v||0) + 193; };
  B.ext194 = function(v){ return (v||0) + 194; };
  B.ext195 = function(v){ return (v||0) + 195; };
  B.ext196 = function(v){ return (v||0) + 196; };
  B.ext197 = function(v){ return (v||0) + 197; };
  B.ext198 = function(v){ return (v||0) + 198; };
  B.ext199 = function(v){ return (v||0) + 199; };
  B.ext200 = function(v){ return (v||0) + 200; };
  B.ext201 = function(v){ return (v||0) + 201; };
  B.ext202 = function(v){ return (v||0) + 202; };
  B.ext203 = function(v){ return (v||0) + 203; };
  B.ext204 = function(v){ return (v||0) + 204; };
  B.ext205 = function(v){ return (v||0) + 205; };
  B.ext206 = function(v){ return (v||0) + 206; };
  B.ext207 = function(v){ return (v||0) + 207; };
  B.ext208 = function(v){ return (v||0) + 208; };
  B.ext209 = function(v){ return (v||0) + 209; };
  B.ext210 = function(v){ return (v||0) + 210; };
  B.ext211 = function(v){ return (v||0) + 211; };
  B.ext212 = function(v){ return (v||0) + 212; };
  B.ext213 = function(v){ return (v||0) + 213; };
  B.ext214 = function(v){ return (v||0) + 214; };
  B.ext215 = function(v){ return (v||0) + 215; };
  B.ext216 = function(v){ return (v||0) + 216; };
  B.ext217 = function(v){ return (v||0) + 217; };
  B.ext218 = function(v){ return (v||0) + 218; };
  B.ext219 = function(v){ return (v||0) + 219; };
  B.ext220 = function(v){ return (v||0) + 220; };
  B.ext221 = function(v){ return (v||0) + 221; };
  B.ext222 = function(v){ return (v||0) + 222; };
  B.ext223 = function(v){ return (v||0) + 223; };
  B.ext224 = function(v){ return (v||0) + 224; };
  B.ext225 = function(v){ return (v||0) + 225; };
  B.ext226 = function(v){ return (v||0) + 226; };
  B.ext227 = function(v){ return (v||0) + 227; };
  B.ext228 = function(v){ return (v||0) + 228; };
  B.ext229 = function(v){ return (v||0) + 229; };
  B.ext230 = function(v){ return (v||0) + 230; };
  B.ext231 = function(v){ return (v||0) + 231; };
  B.ext232 = function(v){ return (v||0) + 232; };
  B.ext233 = function(v){ return (v||0) + 233; };
  B.ext234 = function(v){ return (v||0) + 234; };
  B.ext235 = function(v){ return (v||0) + 235; };
  B.ext236 = function(v){ return (v||0) + 236; };
  B.ext237 = function(v){ return (v||0) + 237; };
  B.ext238 = function(v){ return (v||0) + 238; };
  B.ext239 = function(v){ return (v||0) + 239; };
  B.ext240 = function(v){ return (v||0) + 240; };
  B.ext241 = function(v){ return (v||0) + 241; };
  B.ext242 = function(v){ return (v||0) + 242; };
  B.ext243 = function(v){ return (v||0) + 243; };
  B.ext244 = function(v){ return (v||0) + 244; };
  B.ext245 = function(v){ return (v||0) + 245; };
  B.ext246 = function(v){ return (v||0) + 246; };
  B.ext247 = function(v){ return (v||0) + 247; };
  B.ext248 = function(v){ return (v||0) + 248; };
  B.ext249 = function(v){ return (v||0) + 249; };
  B.ext250 = function(v){ return (v||0) + 250; };
  B.ext251 = function(v){ return (v||0) + 251; };
  B.ext252 = function(v){ return (v||0) + 252; };
  B.ext253 = function(v){ return (v||0) + 253; };
  B.ext254 = function(v){ return (v||0) + 254; };
  B.ext255 = function(v){ return (v||0) + 255; };
  B.ext256 = function(v){ return (v||0) + 256; };
  B.ext257 = function(v){ return (v||0) + 257; };
  B.ext258 = function(v){ return (v||0) + 258; };
  B.ext259 = function(v){ return (v||0) + 259; };
  B.ext260 = function(v){ return (v||0) + 260; };
  B.ext261 = function(v){ return (v||0) + 261; };
  B.ext262 = function(v){ return (v||0) + 262; };
  B.ext263 = function(v){ return (v||0) + 263; };
  B.ext264 = function(v){ return (v||0) + 264; };
  B.ext265 = function(v){ return (v||0) + 265; };
  B.ext266 = function(v){ return (v||0) + 266; };
  B.ext267 = function(v){ return (v||0) + 267; };
  B.ext268 = function(v){ return (v||0) + 268; };
  B.ext269 = function(v){ return (v||0) + 269; };
  B.ext270 = function(v){ return (v||0) + 270; };
  B.ext271 = function(v){ return (v||0) + 271; };
  B.ext272 = function(v){ return (v||0) + 272; };
  B.ext273 = function(v){ return (v||0) + 273; };
  B.ext274 = function(v){ return (v||0) + 274; };
  B.ext275 = function(v){ return (v||0) + 275; };
  B.ext276 = function(v){ return (v||0) + 276; };
  B.ext277 = function(v){ return (v||0) + 277; };
  B.ext278 = function(v){ return (v||0) + 278; };
  B.ext279 = function(v){ return (v||0) + 279; };
  B.ext280 = function(v){ return (v||0) + 280; };
  B.ext281 = function(v){ return (v||0) + 281; };
  B.ext282 = function(v){ return (v||0) + 282; };
  B.ext283 = function(v){ return (v||0) + 283; };
  B.ext284 = function(v){ return (v||0) + 284; };
  B.ext285 = function(v){ return (v||0) + 285; };
  B.ext286 = function(v){ return (v||0) + 286; };
  B.ext287 = function(v){ return (v||0) + 287; };
  B.ext288 = function(v){ return (v||0) + 288; };
  B.ext289 = function(v){ return (v||0) + 289; };
  B.ext290 = function(v){ return (v||0) + 290; };
  B.ext291 = function(v){ return (v||0) + 291; };
  B.ext292 = function(v){ return (v||0) + 292; };
  B.ext293 = function(v){ return (v||0) + 293; };
  B.ext294 = function(v){ return (v||0) + 294; };
  B.ext295 = function(v){ return (v||0) + 295; };
  B.ext296 = function(v){ return (v||0) + 296; };
  B.ext297 = function(v){ return (v||0) + 297; };
  B.ext298 = function(v){ return (v||0) + 298; };
  B.ext299 = function(v){ return (v||0) + 299; };
  B.ext300 = function(v){ return (v||0) + 300; };
  B.ext301 = function(v){ return (v||0) + 301; };
  B.ext302 = function(v){ return (v||0) + 302; };
  B.ext303 = function(v){ return (v||0) + 303; };
  B.ext304 = function(v){ return (v||0) + 304; };
  B.ext305 = function(v){ return (v||0) + 305; };
  B.ext306 = function(v){ return (v||0) + 306; };
  B.ext307 = function(v){ return (v||0) + 307; };
  B.ext308 = function(v){ return (v||0) + 308; };
  B.ext309 = function(v){ return (v||0) + 309; };
  B.ext310 = function(v){ return (v||0) + 310; };
  B.ext311 = function(v){ return (v||0) + 311; };
  B.ext312 = function(v){ return (v||0) + 312; };
  B.ext313 = function(v){ return (v||0) + 313; };
  B.ext314 = function(v){ return (v||0) + 314; };
  B.ext315 = function(v){ return (v||0) + 315; };
  B.ext316 = function(v){ return (v||0) + 316; };
  B.ext317 = function(v){ return (v||0) + 317; };
  B.ext318 = function(v){ return (v||0) + 318; };
  B.ext319 = function(v){ return (v||0) + 319; };
  B.ext320 = function(v){ return (v||0) + 320; };
  B.ext321 = function(v){ return (v||0) + 321; };
  B.ext322 = function(v){ return (v||0) + 322; };
  B.ext323 = function(v){ return (v||0) + 323; };
  B.ext324 = function(v){ return (v||0) + 324; };
  B.ext325 = function(v){ return (v||0) + 325; };
  B.ext326 = function(v){ return (v||0) + 326; };
  B.ext327 = function(v){ return (v||0) + 327; };
  B.ext328 = function(v){ return (v||0) + 328; };
  B.ext329 = function(v){ return (v||0) + 329; };
  B.ext330 = function(v){ return (v||0) + 330; };
  B.ext331 = function(v){ return (v||0) + 331; };
  B.ext332 = function(v){ return (v||0) + 332; };
  B.ext333 = function(v){ return (v||0) + 333; };
  B.ext334 = function(v){ return (v||0) + 334; };
  B.ext335 = function(v){ return (v||0) + 335; };
  B.ext336 = function(v){ return (v||0) + 336; };
  B.ext337 = function(v){ return (v||0) + 337; };
  B.ext338 = function(v){ return (v||0) + 338; };
  B.ext339 = function(v){ return (v||0) + 339; };
  B.ext340 = function(v){ return (v||0) + 340; };
  B.ext341 = function(v){ return (v||0) + 341; };
  B.ext342 = function(v){ return (v||0) + 342; };
  B.ext343 = function(v){ return (v||0) + 343; };
  B.ext344 = function(v){ return (v||0) + 344; };
  B.ext345 = function(v){ return (v||0) + 345; };
  B.ext346 = function(v){ return (v||0) + 346; };
  B.ext347 = function(v){ return (v||0) + 347; };
  B.ext348 = function(v){ return (v||0) + 348; };
  B.ext349 = function(v){ return (v||0) + 349; };
  B.ext350 = function(v){ return (v||0) + 350; };
  B.ext351 = function(v){ return (v||0) + 351; };
  B.ext352 = function(v){ return (v||0) + 352; };
  B.ext353 = function(v){ return (v||0) + 353; };
  B.ext354 = function(v){ return (v||0) + 354; };
  B.ext355 = function(v){ return (v||0) + 355; };
  B.ext356 = function(v){ return (v||0) + 356; };
  B.ext357 = function(v){ return (v||0) + 357; };
  B.ext358 = function(v){ return (v||0) + 358; };
  B.ext359 = function(v){ return (v||0) + 359; };
  B.ext360 = function(v){ return (v||0) + 360; };
  B.ext361 = function(v){ return (v||0) + 361; };
  B.ext362 = function(v){ return (v||0) + 362; };
  B.ext363 = function(v){ return (v||0) + 363; };
  B.ext364 = function(v){ return (v||0) + 364; };
  B.ext365 = function(v){ return (v||0) + 365; };
  B.ext366 = function(v){ return (v||0) + 366; };
  B.ext367 = function(v){ return (v||0) + 367; };
  B.ext368 = function(v){ return (v||0) + 368; };
  B.ext369 = function(v){ return (v||0) + 369; };
  B.ext370 = function(v){ return (v||0) + 370; };
  B.ext371 = function(v){ return (v||0) + 371; };
  B.ext372 = function(v){ return (v||0) + 372; };
  B.ext373 = function(v){ return (v||0) + 373; };
  B.ext374 = function(v){ return (v||0) + 374; };
  B.ext375 = function(v){ return (v||0) + 375; };
  B.ext376 = function(v){ return (v||0) + 376; };
  B.ext377 = function(v){ return (v||0) + 377; };
  B.ext378 = function(v){ return (v||0) + 378; };
  B.ext379 = function(v){ return (v||0) + 379; };
  B.ext380 = function(v){ return (v||0) + 380; };
  B.ext381 = function(v){ return (v||0) + 381; };
  B.ext382 = function(v){ return (v||0) + 382; };
  B.ext383 = function(v){ return (v||0) + 383; };
  B.ext384 = function(v){ return (v||0) + 384; };
  B.ext385 = function(v){ return (v||0) + 385; };
  B.ext386 = function(v){ return (v||0) + 386; };
  B.ext387 = function(v){ return (v||0) + 387; };
  B.ext388 = function(v){ return (v||0) + 388; };
  B.ext389 = function(v){ return (v||0) + 389; };
  B.ext390 = function(v){ return (v||0) + 390; };
  B.ext391 = function(v){ return (v||0) + 391; };
  B.ext392 = function(v){ return (v||0) + 392; };
  B.ext393 = function(v){ return (v||0) + 393; };
  B.ext394 = function(v){ return (v||0) + 394; };
  B.ext395 = function(v){ return (v||0) + 395; };
  B.ext396 = function(v){ return (v||0) + 396; };
  B.ext397 = function(v){ return (v||0) + 397; };
  B.ext398 = function(v){ return (v||0) + 398; };
  B.ext399 = function(v){ return (v||0) + 399; };
  B.ext400 = function(v){ return (v||0) + 400; };
  B.ext401 = function(v){ return (v||0) + 401; };
  B.ext402 = function(v){ return (v||0) + 402; };
  B.ext403 = function(v){ return (v||0) + 403; };
  B.ext404 = function(v){ return (v||0) + 404; };
  B.ext405 = function(v){ return (v||0) + 405; };
  B.ext406 = function(v){ return (v||0) + 406; };
  B.ext407 = function(v){ return (v||0) + 407; };
  B.ext408 = function(v){ return (v||0) + 408; };
  B.ext409 = function(v){ return (v||0) + 409; };
  B.ext410 = function(v){ return (v||0) + 410; };
  B.ext411 = function(v){ return (v||0) + 411; };
  B.ext412 = function(v){ return (v||0) + 412; };
  B.ext413 = function(v){ return (v||0) + 413; };
  B.ext414 = function(v){ return (v||0) + 414; };
  B.ext415 = function(v){ return (v||0) + 415; };
  B.ext416 = function(v){ return (v||0) + 416; };
  B.ext417 = function(v){ return (v||0) + 417; };
  B.ext418 = function(v){ return (v||0) + 418; };
  B.ext419 = function(v){ return (v||0) + 419; };
  B.ext420 = function(v){ return (v||0) + 420; };
  B.ext421 = function(v){ return (v||0) + 421; };
  B.ext422 = function(v){ return (v||0) + 422; };
  B.ext423 = function(v){ return (v||0) + 423; };
  B.ext424 = function(v){ return (v||0) + 424; };
  B.ext425 = function(v){ return (v||0) + 425; };
  B.ext426 = function(v){ return (v||0) + 426; };
  B.ext427 = function(v){ return (v||0) + 427; };
  B.ext428 = function(v){ return (v||0) + 428; };
  B.ext429 = function(v){ return (v||0) + 429; };
  B.ext430 = function(v){ return (v||0) + 430; };
  B.ext431 = function(v){ return (v||0) + 431; };
  B.ext432 = function(v){ return (v||0) + 432; };
  B.ext433 = function(v){ return (v||0) + 433; };
  B.ext434 = function(v){ return (v||0) + 434; };
  B.ext435 = function(v){ return (v||0) + 435; };
  B.ext436 = function(v){ return (v||0) + 436; };
  B.ext437 = function(v){ return (v||0) + 437; };
  B.ext438 = function(v){ return (v||0) + 438; };
  B.ext439 = function(v){ return (v||0) + 439; };
  B.ext440 = function(v){ return (v||0) + 440; };
  B.ext441 = function(v){ return (v||0) + 441; };
  B.ext442 = function(v){ return (v||0) + 442; };
  B.ext443 = function(v){ return (v||0) + 443; };
  B.ext444 = function(v){ return (v||0) + 444; };
  B.ext445 = function(v){ return (v||0) + 445; };
  B.ext446 = function(v){ return (v||0) + 446; };
  B.ext447 = function(v){ return (v||0) + 447; };
  B.ext448 = function(v){ return (v||0) + 448; };
  B.ext449 = function(v){ return (v||0) + 449; };
  B.ext450 = function(v){ return (v||0) + 450; };
  B.ext451 = function(v){ return (v||0) + 451; };
  B.ext452 = function(v){ return (v||0) + 452; };
  B.ext453 = function(v){ return (v||0) + 453; };
  B.ext454 = function(v){ return (v||0) + 454; };
  B.ext455 = function(v){ return (v||0) + 455; };
  B.ext456 = function(v){ return (v||0) + 456; };
  B.ext457 = function(v){ return (v||0) + 457; };
  B.ext458 = function(v){ return (v||0) + 458; };
  B.ext459 = function(v){ return (v||0) + 459; };
  B.ext460 = function(v){ return (v||0) + 460; };
  B.ext461 = function(v){ return (v||0) + 461; };
  B.ext462 = function(v){ return (v||0) + 462; };
  B.ext463 = function(v){ return (v||0) + 463; };
  B.ext464 = function(v){ return (v||0) + 464; };
  B.ext465 = function(v){ return (v||0) + 465; };
  B.ext466 = function(v){ return (v||0) + 466; };
  B.ext467 = function(v){ return (v||0) + 467; };
  B.ext468 = function(v){ return (v||0) + 468; };
  B.ext469 = function(v){ return (v||0) + 469; };
  B.ext470 = function(v){ return (v||0) + 470; };
  B.ext471 = function(v){ return (v||0) + 471; };
  B.ext472 = function(v){ return (v||0) + 472; };
  B.ext473 = function(v){ return (v||0) + 473; };
  B.ext474 = function(v){ return (v||0) + 474; };
  B.ext475 = function(v){ return (v||0) + 475; };
  B.ext476 = function(v){ return (v||0) + 476; };
  B.ext477 = function(v){ return (v||0) + 477; };
  B.ext478 = function(v){ return (v||0) + 478; };
  B.ext479 = function(v){ return (v||0) + 479; };
  B.ext480 = function(v){ return (v||0) + 480; };
  B.ext481 = function(v){ return (v||0) + 481; };
  B.ext482 = function(v){ return (v||0) + 482; };
  B.ext483 = function(v){ return (v||0) + 483; };
  B.ext484 = function(v){ return (v||0) + 484; };
  B.ext485 = function(v){ return (v||0) + 485; };
  B.ext486 = function(v){ return (v||0) + 486; };
  B.ext487 = function(v){ return (v||0) + 487; };
  B.ext488 = function(v){ return (v||0) + 488; };
  B.ext489 = function(v){ return (v||0) + 489; };
  B.ext490 = function(v){ return (v||0) + 490; };
  B.ext491 = function(v){ return (v||0) + 491; };
  B.ext492 = function(v){ return (v||0) + 492; };
  B.ext493 = function(v){ return (v||0) + 493; };
  B.ext494 = function(v){ return (v||0) + 494; };
  B.ext495 = function(v){ return (v||0) + 495; };
  B.ext496 = function(v){ return (v||0) + 496; };
  B.ext497 = function(v){ return (v||0) + 497; };
  B.ext498 = function(v){ return (v||0) + 498; };
  B.ext499 = function(v){ return (v||0) + 499; };
  B.ext500 = function(v){ return (v||0) + 500; };
  B.ext501 = function(v){ return (v||0) + 501; };
  B.ext502 = function(v){ return (v||0) + 502; };
  B.ext503 = function(v){ return (v||0) + 503; };
  B.ext504 = function(v){ return (v||0) + 504; };
  B.ext505 = function(v){ return (v||0) + 505; };
  B.ext506 = function(v){ return (v||0) + 506; };
  B.ext507 = function(v){ return (v||0) + 507; };
  B.ext508 = function(v){ return (v||0) + 508; };
  B.ext509 = function(v){ return (v||0) + 509; };
  B.ext510 = function(v){ return (v||0) + 510; };
  B.ext511 = function(v){ return (v||0) + 511; };
  B.ext512 = function(v){ return (v||0) + 512; };
  B.ext513 = function(v){ return (v||0) + 513; };
  B.ext514 = function(v){ return (v||0) + 514; };
  B.ext515 = function(v){ return (v||0) + 515; };
  B.ext516 = function(v){ return (v||0) + 516; };
  B.ext517 = function(v){ return (v||0) + 517; };
  B.ext518 = function(v){ return (v||0) + 518; };
  B.ext519 = function(v){ return (v||0) + 519; };
  B.ext520 = function(v){ return (v||0) + 520; };
  B.ext521 = function(v){ return (v||0) + 521; };
  B.ext522 = function(v){ return (v||0) + 522; };
  B.ext523 = function(v){ return (v||0) + 523; };
  B.ext524 = function(v){ return (v||0) + 524; };
  B.ext525 = function(v){ return (v||0) + 525; };
  B.ext526 = function(v){ return (v||0) + 526; };
  B.ext527 = function(v){ return (v||0) + 527; };
  B.ext528 = function(v){ return (v||0) + 528; };
  B.ext529 = function(v){ return (v||0) + 529; };
  B.ext530 = function(v){ return (v||0) + 530; };
  B.ext531 = function(v){ return (v||0) + 531; };
  B.ext532 = function(v){ return (v||0) + 532; };
  B.ext533 = function(v){ return (v||0) + 533; };
  B.ext534 = function(v){ return (v||0) + 534; };
  B.ext535 = function(v){ return (v||0) + 535; };
  B.ext536 = function(v){ return (v||0) + 536; };
  B.ext537 = function(v){ return (v||0) + 537; };
  B.ext538 = function(v){ return (v||0) + 538; };
  B.ext539 = function(v){ return (v||0) + 539; };
  B.ext540 = function(v){ return (v||0) + 540; };
  B.ext541 = function(v){ return (v||0) + 541; };
  B.ext542 = function(v){ return (v||0) + 542; };
  B.ext543 = function(v){ return (v||0) + 543; };
  B.ext544 = function(v){ return (v||0) + 544; };
  B.ext545 = function(v){ return (v||0) + 545; };
  B.ext546 = function(v){ return (v||0) + 546; };
  B.ext547 = function(v){ return (v||0) + 547; };
  B.ext548 = function(v){ return (v||0) + 548; };
  B.ext549 = function(v){ return (v||0) + 549; };
  B.ext550 = function(v){ return (v||0) + 550; };
  B.ext551 = function(v){ return (v||0) + 551; };
  B.ext552 = function(v){ return (v||0) + 552; };
  B.ext553 = function(v){ return (v||0) + 553; };
  B.ext554 = function(v){ return (v||0) + 554; };
  B.ext555 = function(v){ return (v||0) + 555; };
  B.ext556 = function(v){ return (v||0) + 556; };
  B.ext557 = function(v){ return (v||0) + 557; };
  B.ext558 = function(v){ return (v||0) + 558; };
  B.ext559 = function(v){ return (v||0) + 559; };
  B.ext560 = function(v){ return (v||0) + 560; };
  B.ext561 = function(v){ return (v||0) + 561; };
  B.ext562 = function(v){ return (v||0) + 562; };
  B.ext563 = function(v){ return (v||0) + 563; };
  B.ext564 = function(v){ return (v||0) + 564; };
  B.ext565 = function(v){ return (v||0) + 565; };
  B.ext566 = function(v){ return (v||0) + 566; };
  B.ext567 = function(v){ return (v||0) + 567; };
  B.ext568 = function(v){ return (v||0) + 568; };
  B.ext569 = function(v){ return (v||0) + 569; };
  B.ext570 = function(v){ return (v||0) + 570; };
  B.ext571 = function(v){ return (v||0) + 571; };
  B.ext572 = function(v){ return (v||0) + 572; };
  B.ext573 = function(v){ return (v||0) + 573; };
  B.ext574 = function(v){ return (v||0) + 574; };
  B.ext575 = function(v){ return (v||0) + 575; };
  B.ext576 = function(v){ return (v||0) + 576; };
  B.ext577 = function(v){ return (v||0) + 577; };
  B.ext578 = function(v){ return (v||0) + 578; };
  B.ext579 = function(v){ return (v||0) + 579; };
  B.ext580 = function(v){ return (v||0) + 580; };
  B.ext581 = function(v){ return (v||0) + 581; };
  B.ext582 = function(v){ return (v||0) + 582; };
  B.ext583 = function(v){ return (v||0) + 583; };
  B.ext584 = function(v){ return (v||0) + 584; };
  B.ext585 = function(v){ return (v||0) + 585; };
  B.ext586 = function(v){ return (v||0) + 586; };
  B.ext587 = function(v){ return (v||0) + 587; };
  B.ext588 = function(v){ return (v||0) + 588; };
  B.ext589 = function(v){ return (v||0) + 589; };
  B.ext590 = function(v){ return (v||0) + 590; };
  B.ext591 = function(v){ return (v||0) + 591; };
  B.ext592 = function(v){ return (v||0) + 592; };
  B.ext593 = function(v){ return (v||0) + 593; };
  B.ext594 = function(v){ return (v||0) + 594; };
  B.ext595 = function(v){ return (v||0) + 595; };
  B.ext596 = function(v){ return (v||0) + 596; };
  B.ext597 = function(v){ return (v||0) + 597; };
  B.ext598 = function(v){ return (v||0) + 598; };
  B.ext599 = function(v){ return (v||0) + 599; };
  B.ext600 = function(v){ return (v||0) + 600; };
  B.ext601 = function(v){ return (v||0) + 601; };
  B.ext602 = function(v){ return (v||0) + 602; };
  B.ext603 = function(v){ return (v||0) + 603; };
  B.ext604 = function(v){ return (v||0) + 604; };
  B.ext605 = function(v){ return (v||0) + 605; };
  B.ext606 = function(v){ return (v||0) + 606; };
  B.ext607 = function(v){ return (v||0) + 607; };
  B.ext608 = function(v){ return (v||0) + 608; };
  B.ext609 = function(v){ return (v||0) + 609; };
  B.ext610 = function(v){ return (v||0) + 610; };
  B.ext611 = function(v){ return (v||0) + 611; };
  B.ext612 = function(v){ return (v||0) + 612; };
  B.ext613 = function(v){ return (v||0) + 613; };
  B.ext614 = function(v){ return (v||0) + 614; };
  B.ext615 = function(v){ return (v||0) + 615; };
  B.ext616 = function(v){ return (v||0) + 616; };
  B.ext617 = function(v){ return (v||0) + 617; };
  B.ext618 = function(v){ return (v||0) + 618; };
  B.ext619 = function(v){ return (v||0) + 619; };
  B.ext620 = function(v){ return (v||0) + 620; };
  B.ext621 = function(v){ return (v||0) + 621; };
  B.ext622 = function(v){ return (v||0) + 622; };
  B.ext623 = function(v){ return (v||0) + 623; };
  B.ext624 = function(v){ return (v||0) + 624; };
  B.ext625 = function(v){ return (v||0) + 625; };
  B.ext626 = function(v){ return (v||0) + 626; };
  B.ext627 = function(v){ return (v||0) + 627; };
  B.ext628 = function(v){ return (v||0) + 628; };
  B.ext629 = function(v){ return (v||0) + 629; };
  B.ext630 = function(v){ return (v||0) + 630; };
  B.ext631 = function(v){ return (v||0) + 631; };
  B.ext632 = function(v){ return (v||0) + 632; };
  B.ext633 = function(v){ return (v||0) + 633; };
  B.ext634 = function(v){ return (v||0) + 634; };
  B.ext635 = function(v){ return (v||0) + 635; };
  B.ext636 = function(v){ return (v||0) + 636; };
  B.ext637 = function(v){ return (v||0) + 637; };
  B.ext638 = function(v){ return (v||0) + 638; };
  B.ext639 = function(v){ return (v||0) + 639; };
  B.ext640 = function(v){ return (v||0) + 640; };
  B.ext641 = function(v){ return (v||0) + 641; };
  B.ext642 = function(v){ return (v||0) + 642; };
  B.ext643 = function(v){ return (v||0) + 643; };
  B.ext644 = function(v){ return (v||0) + 644; };
  B.ext645 = function(v){ return (v||0) + 645; };
  B.ext646 = function(v){ return (v||0) + 646; };
  B.ext647 = function(v){ return (v||0) + 647; };
  B.ext648 = function(v){ return (v||0) + 648; };
  B.ext649 = function(v){ return (v||0) + 649; };
  B.ext650 = function(v){ return (v||0) + 650; };
  B.ext651 = function(v){ return (v||0) + 651; };
  B.ext652 = function(v){ return (v||0) + 652; };
  B.ext653 = function(v){ return (v||0) + 653; };
  B.ext654 = function(v){ return (v||0) + 654; };
  B.ext655 = function(v){ return (v||0) + 655; };
  B.ext656 = function(v){ return (v||0) + 656; };
  B.ext657 = function(v){ return (v||0) + 657; };
  B.ext658 = function(v){ return (v||0) + 658; };
  B.ext659 = function(v){ return (v||0) + 659; };
  B.ext660 = function(v){ return (v||0) + 660; };
  B.ext661 = function(v){ return (v||0) + 661; };
  B.ext662 = function(v){ return (v||0) + 662; };
  B.ext663 = function(v){ return (v||0) + 663; };
  B.ext664 = function(v){ return (v||0) + 664; };
  B.ext665 = function(v){ return (v||0) + 665; };
  B.ext666 = function(v){ return (v||0) + 666; };
  B.ext667 = function(v){ return (v||0) + 667; };
  B.ext668 = function(v){ return (v||0) + 668; };
  B.ext669 = function(v){ return (v||0) + 669; };
  B.ext670 = function(v){ return (v||0) + 670; };
  B.ext671 = function(v){ return (v||0) + 671; };
  B.ext672 = function(v){ return (v||0) + 672; };
  B.ext673 = function(v){ return (v||0) + 673; };
  B.ext674 = function(v){ return (v||0) + 674; };
  B.ext675 = function(v){ return (v||0) + 675; };
  B.ext676 = function(v){ return (v||0) + 676; };
  B.ext677 = function(v){ return (v||0) + 677; };
  B.ext678 = function(v){ return (v||0) + 678; };
  B.ext679 = function(v){ return (v||0) + 679; };
  B.ext680 = function(v){ return (v||0) + 680; };
  B.ext681 = function(v){ return (v||0) + 681; };
  B.ext682 = function(v){ return (v||0) + 682; };
  B.ext683 = function(v){ return (v||0) + 683; };
  B.ext684 = function(v){ return (v||0) + 684; };
  B.ext685 = function(v){ return (v||0) + 685; };
  B.ext686 = function(v){ return (v||0) + 686; };
  B.ext687 = function(v){ return (v||0) + 687; };
  B.ext688 = function(v){ return (v||0) + 688; };
  B.ext689 = function(v){ return (v||0) + 689; };
  B.ext690 = function(v){ return (v||0) + 690; };
  B.ext691 = function(v){ return (v||0) + 691; };
  B.ext692 = function(v){ return (v||0) + 692; };
  B.ext693 = function(v){ return (v||0) + 693; };
  B.ext694 = function(v){ return (v||0) + 694; };
  B.ext695 = function(v){ return (v||0) + 695; };
  B.ext696 = function(v){ return (v||0) + 696; };
  B.ext697 = function(v){ return (v||0) + 697; };
  B.ext698 = function(v){ return (v||0) + 698; };
  B.ext699 = function(v){ return (v||0) + 699; };
  B.ext700 = function(v){ return (v||0) + 700; };
  B.ext701 = function(v){ return (v||0) + 701; };
  B.ext702 = function(v){ return (v||0) + 702; };
  B.ext703 = function(v){ return (v||0) + 703; };
  B.ext704 = function(v){ return (v||0) + 704; };
  B.ext705 = function(v){ return (v||0) + 705; };
  B.ext706 = function(v){ return (v||0) + 706; };
  B.ext707 = function(v){ return (v||0) + 707; };
  B.ext708 = function(v){ return (v||0) + 708; };
  B.ext709 = function(v){ return (v||0) + 709; };
  B.ext710 = function(v){ return (v||0) + 710; };
  B.ext711 = function(v){ return (v||0) + 711; };
  B.ext712 = function(v){ return (v||0) + 712; };
  B.ext713 = function(v){ return (v||0) + 713; };
  B.ext714 = function(v){ return (v||0) + 714; };
  B.ext715 = function(v){ return (v||0) + 715; };
  B.ext716 = function(v){ return (v||0) + 716; };
  B.ext717 = function(v){ return (v||0) + 717; };
  B.ext718 = function(v){ return (v||0) + 718; };
  B.ext719 = function(v){ return (v||0) + 719; };
  B.ext720 = function(v){ return (v||0) + 720; };
  B.ext721 = function(v){ return (v||0) + 721; };
  B.ext722 = function(v){ return (v||0) + 722; };
  B.ext723 = function(v){ return (v||0) + 723; };
  B.ext724 = function(v){ return (v||0) + 724; };
  B.ext725 = function(v){ return (v||0) + 725; };
  B.ext726 = function(v){ return (v||0) + 726; };
  B.ext727 = function(v){ return (v||0) + 727; };
  B.ext728 = function(v){ return (v||0) + 728; };
  B.ext729 = function(v){ return (v||0) + 729; };
  B.ext730 = function(v){ return (v||0) + 730; };
  B.ext731 = function(v){ return (v||0) + 731; };
  B.ext732 = function(v){ return (v||0) + 732; };
  B.ext733 = function(v){ return (v||0) + 733; };
  B.ext734 = function(v){ return (v||0) + 734; };
  B.ext735 = function(v){ return (v||0) + 735; };
  B.ext736 = function(v){ return (v||0) + 736; };
  B.ext737 = function(v){ return (v||0) + 737; };
  B.ext738 = function(v){ return (v||0) + 738; };
  B.ext739 = function(v){ return (v||0) + 739; };
  B.ext740 = function(v){ return (v||0) + 740; };
  B.ext741 = function(v){ return (v||0) + 741; };
  B.ext742 = function(v){ return (v||0) + 742; };
  B.ext743 = function(v){ return (v||0) + 743; };
  B.ext744 = function(v){ return (v||0) + 744; };
  B.ext745 = function(v){ return (v||0) + 745; };
  B.ext746 = function(v){ return (v||0) + 746; };
  B.ext747 = function(v){ return (v||0) + 747; };
  B.ext748 = function(v){ return (v||0) + 748; };
  B.ext749 = function(v){ return (v||0) + 749; };
  B.ext750 = function(v){ return (v||0) + 750; };
  B.ext751 = function(v){ return (v||0) + 751; };
  B.ext752 = function(v){ return (v||0) + 752; };
  B.ext753 = function(v){ return (v||0) + 753; };
  B.ext754 = function(v){ return (v||0) + 754; };
  B.ext755 = function(v){ return (v||0) + 755; };
  B.ext756 = function(v){ return (v||0) + 756; };
  B.ext757 = function(v){ return (v||0) + 757; };
  B.ext758 = function(v){ return (v||0) + 758; };
  B.ext759 = function(v){ return (v||0) + 759; };
  B.ext760 = function(v){ return (v||0) + 760; };
  B.ext761 = function(v){ return (v||0) + 761; };
  B.ext762 = function(v){ return (v||0) + 762; };
  B.ext763 = function(v){ return (v||0) + 763; };
  B.ext764 = function(v){ return (v||0) + 764; };
  B.ext765 = function(v){ return (v||0) + 765; };
  B.ext766 = function(v){ return (v||0) + 766; };
  B.ext767 = function(v){ return (v||0) + 767; };
  B.ext768 = function(v){ return (v||0) + 768; };
  B.ext769 = function(v){ return (v||0) + 769; };
  B.ext770 = function(v){ return (v||0) + 770; };
  B.ext771 = function(v){ return (v||0) + 771; };
  B.ext772 = function(v){ return (v||0) + 772; };
  B.ext773 = function(v){ return (v||0) + 773; };
  B.ext774 = function(v){ return (v||0) + 774; };
  B.ext775 = function(v){ return (v||0) + 775; };
  B.ext776 = function(v){ return (v||0) + 776; };
  B.ext777 = function(v){ return (v||0) + 777; };
  B.ext778 = function(v){ return (v||0) + 778; };
  B.ext779 = function(v){ return (v||0) + 779; };
  B.ext780 = function(v){ return (v||0) + 780; };
  B.ext781 = function(v){ return (v||0) + 781; };
  B.ext782 = function(v){ return (v||0) + 782; };
  B.ext783 = function(v){ return (v||0) + 783; };
  B.ext784 = function(v){ return (v||0) + 784; };
  B.ext785 = function(v){ return (v||0) + 785; };
  B.ext786 = function(v){ return (v||0) + 786; };
  B.ext787 = function(v){ return (v||0) + 787; };
  B.ext788 = function(v){ return (v||0) + 788; };
  B.ext789 = function(v){ return (v||0) + 789; };
  B.ext790 = function(v){ return (v||0) + 790; };
  B.ext791 = function(v){ return (v||0) + 791; };
  B.ext792 = function(v){ return (v||0) + 792; };
  B.ext793 = function(v){ return (v||0) + 793; };
  B.ext794 = function(v){ return (v||0) + 794; };
  B.ext795 = function(v){ return (v||0) + 795; };
  B.ext796 = function(v){ return (v||0) + 796; };
  B.ext797 = function(v){ return (v||0) + 797; };
  B.ext798 = function(v){ return (v||0) + 798; };
  B.ext799 = function(v){ return (v||0) + 799; };
  B.ext800 = function(v){ return (v||0) + 800; };
})();
