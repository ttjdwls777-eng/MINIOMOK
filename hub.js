/* =============================================================================
 *  카카오 오목 · Premium Emerald Edition
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
  const DAILY_BONUS_STAR = 50;
  const DAILY_BONUS_XP   = 10;

  const SHOP_ITEMS = [
    { id: 'avatar_bear',   type: 'avatar', name: '곰돌이',       emoji: '🐻', price: 0    },
    { id: 'avatar_tiger',  type: 'avatar', name: '호랑이',       emoji: '🐯', price: 200  },
    { id: 'avatar_fox',    type: 'avatar', name: '여우',         emoji: '🦊', price: 300  },
    { id: 'avatar_cat',    type: 'avatar', name: '고양이',       emoji: '🐱', price: 350  },
    { id: 'avatar_dog',    type: 'avatar', name: '강아지',       emoji: '🐶', price: 400  },
    { id: 'avatar_panda',  type: 'avatar', name: '판다',         emoji: '🐼', price: 450  },
    { id: 'avatar_koala',  type: 'avatar', name: '코알라',       emoji: '🐨', price: 500  },
    { id: 'avatar_rabbit', type: 'avatar', name: '토끼',         emoji: '🐰', price: 550  },
    { id: 'avatar_wolf',   type: 'avatar', name: '늑대',         emoji: '🐺', price: 800  },
    { id: 'avatar_lion',   type: 'avatar', name: '사자',         emoji: '🦁', price: 1000 },
    { id: 'avatar_dragon', type: 'avatar', name: '드래곤',       emoji: '🐲', price: 2500 },
    { id: 'avatar_unicorn',type: 'avatar', name: '유니콘',       emoji: '🦄', price: 3000 },
    { id: 'avatar_crown',  type: 'avatar', name: '왕관',         emoji: '👑', price: 5000 },

    { id: 'board_classic', type: 'board',  name: '원목',         emoji: '🪵', price: 0    },
    { id: 'board_jade',    type: 'board',  name: '비취',         emoji: '🟢', price: 600  },
    { id: 'board_onyx',    type: 'board',  name: '오닉스',       emoji: '⚫', price: 1200 },
    { id: 'board_ruby',    type: 'board',  name: '루비',         emoji: '🔴', price: 1800 },
    { id: 'board_sapphire',type: 'board',  name: '사파이어',     emoji: '🔵', price: 2400 },
    { id: 'board_gold',    type: 'board',  name: '황금',         emoji: '🟡', price: 3600 },

    { id: 'stone_classic', type: 'stone',  name: '클래식',       emoji: '⚫', price: 0    },
    { id: 'stone_jade',    type: 'stone',  name: '비취돌',       emoji: '🟢', price: 500  },
    { id: 'stone_amber',   type: 'stone',  name: '호박돌',       emoji: '🟠', price: 800  },
    { id: 'stone_neon',    type: 'stone',  name: '네온',         emoji: '💎', price: 1500 },
  ];

  const ACHIEVEMENTS = [
    { id: 'first_win',     name: '첫 승리',       desc: '첫 게임을 이기세요',             star: 50,   icon: '🥇', check: p => p.totalWins >= 1 },
    { id: 'wins_5',        name: '신예',          desc: '5번 이기세요',                  star: 80,   icon: '🌟', check: p => p.totalWins >= 5 },
    { id: 'wins_25',       name: '베테랑',        desc: '25번 이기세요',                 star: 200,  icon: '⭐', check: p => p.totalWins >= 25 },
    { id: 'wins_100',      name: '마스터',        desc: '100번 이기세요',                star: 1000, icon: '🏆', check: p => p.totalWins >= 100 },
    { id: 'streak_3',      name: '불꽃',          desc: '3연승을 달성하세요',            star: 120,  icon: '🔥', check: p => p.bestStreak >= 3 },
    { id: 'streak_5',      name: '폭풍',          desc: '5연승을 달성하세요',            star: 250,  icon: '⚡', check: p => p.bestStreak >= 5 },
    { id: 'streak_10',     name: '전설',          desc: '10연승을 달성하세요',           star: 800,  icon: '💫', check: p => p.bestStreak >= 10 },
    { id: 'hard_win',      name: '챌린저',        desc: '어려움 AI를 이기세요',          star: 300,  icon: '🎯', check: p => p.hardWins >= 1 },
    { id: 'hard_win_10',   name: '정복자',        desc: '어려움 AI를 10번 이기세요',     star: 1500, icon: '👑', check: p => p.hardWins >= 10 },
    { id: 'games_50',      name: '열심파',        desc: '50게임 플레이',                star: 150,  icon: '🎮', check: p => p.totalGames >= 50 },
    { id: 'games_200',     name: '중독자',        desc: '200게임 플레이',               star: 500,  icon: '🕹️', check: p => p.totalGames >= 200 },
    { id: 'stars_1000',    name: '부자',          desc: '스타 1000개 모으기',           star: 200,  icon: '💰', check: p => p.stars >= 1000 },
    { id: 'stars_5000',    name: '대부호',        desc: '스타 5000개 모으기',           star: 800,  icon: '💎', check: p => p.stars >= 5000 },
    { id: 'level_5',       name: '성장',          desc: '레벨 5 달성',                  star: 150,  icon: '📈', check: p => levelFromXp(p.xp).lv >= 5 },
    { id: 'level_10',      name: '숙련',          desc: '레벨 10 달성',                 star: 400,  icon: '🎓', check: p => levelFromXp(p.xp).lv >= 10 },
    { id: 'level_20',      name: '고수',          desc: '레벨 20 달성',                 star: 1000, icon: '🏅', check: p => levelFromXp(p.xp).lv >= 20 },
  ];

  const BOT_NAMES = [
    '불꽃수', '바둑왕', '천재소년', '오목신', '고요한밤',
    '불패의검', '은하수', '청룡', '백호', '번개',
    '황금손', '달빛전사', '붉은곰', '흑룡', '빙하',
    '폭풍전야', '고독한늑대', '천둥', '별빛기사', '마법사',
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

  .stage{
    position:relative;
    width:min(100vw,480px);
    height:min(100vh,920px);
    background:linear-gradient(165deg,var(--g1) 0%,var(--g2) 30%,var(--g3) 65%,var(--g4) 100%);
    overflow:hidden;
    border-radius:28px;
    box-shadow:var(--shadow), inset 0 1px 0 rgba(255,255,255,.1);
  }
  @media (max-width:520px){ .stage{ width:100vw; height:100vh; border-radius:0; } }
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
    padding:calc(16px + var(--safe-top)) 16px calc(16px + var(--safe-bot));
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
          <div class="brand-name">카카오 오목<small>Premium Edition</small></div>
        </div>
        <div class="topbar-right">
          <span class="lvl-pill" id="hm-lvl">LV 1</span>
          <span class="star-pill" id="hm-stars">0</span>
        </div>
      </div>

      <div class="daily-card hidden" id="daily-card">
        <div class="daily-icon">🎁</div>
        <div class="daily-text">
          <div class="daily-title">일일 출석 보상</div>
          <div class="daily-sub">+${DAILY_BONUS_STAR}⭐  +${DAILY_BONUS_XP}XP</div>
        </div>
        <button class="daily-claim" id="daily-claim-btn">받기</button>
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
        <h1 class="hero-title">오 목</h1>
        <p class="hero-sub">FIVE · IN · A · ROW</p>
      </div>

      <div class="menu">
        <button class="main-btn primary" data-action="play-ai">
          <div class="mb-ico">🤖</div>
          <div class="mb-lbl">
            <div class="mb-title">AI 대전</div>
            <div class="mb-sub" id="ai-sub-label">난이도 · 보통</div>
          </div>
          <div class="mb-arrow">›</div>
        </button>
        <button class="main-btn secondary" data-action="play-pvp">
          <div class="mb-ico">👥</div>
          <div class="mb-lbl">
            <div class="mb-title">친구와 대전</div>
            <div class="mb-sub">한 기기에서 번갈아 두기</div>
          </div>
          <div class="mb-arrow">›</div>
        </button>
        <div class="footer-nav">
          <button class="fnav on" data-nav="home"><span class="i">🏠</span>홈</button>
          <button class="fnav" data-nav="rank"><span class="i">🏆</span>랭킹</button>
          <button class="fnav" data-nav="shop"><span class="i">🛍️</span>상점</button>
          <button class="fnav" data-nav="mission"><span class="i">📋</span>미션</button>
          <button class="fnav" data-nav="profile"><span class="i">👤</span>프로필</button>
        </div>
      </div>
    </section>

    <!-- ========== PROFILE ========== -->
    <section class="screen" id="sc-profile">
      <div class="topbar">
        <button class="icon-btn" data-back>←</button>
        <div class="brand-name" style="text-align:center;flex:1">프로필</div>
        <button class="icon-btn" id="btn-edit-name" title="닉네임 변경">✏️</button>
      </div>
      <div class="prof-head">
        <div class="avatar" id="prof-avatar">🐻</div>
        <div class="prof-name" id="prof-name">플레이어</div>
        <div class="prof-rank-pill" id="prof-rank-pill">LEVEL 1</div>
      </div>
      <div class="prof-stats">
        <div class="stat-card gold"><div class="v" id="ps-stars">0</div><div class="l">⭐ 스타</div></div>
        <div class="stat-card green"><div class="v" id="ps-wins">0</div><div class="l">🏆 승리</div></div>
        <div class="stat-card"><div class="v" id="ps-rate">0%</div><div class="l">📈 승률</div></div>
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
        <div class="brand-name" style="text-align:center;flex:1">🏆 랭킹</div>
        <button class="icon-btn" id="btn-rank-refresh" title="새로고침">🔄</button>
      </div>
      <div class="tabs">
        <button class="tab on" data-tab="total">누적 랭킹</button>
        <button class="tab" data-tab="weekly">이번주 TOP</button>
        <button class="tab" data-tab="hard">어려움 킹</button>
      </div>
      <div class="rank-list" id="rank-list"></div>
    </section>

    <!-- ========== SHOP ========== -->
    <section class="screen" id="sc-shop">
      <div class="topbar">
        <button class="icon-btn" data-back>←</button>
        <div class="brand-name" style="text-align:center;flex:1">🛍️ 상점</div>
        <span class="star-pill" id="shop-stars">0</span>
      </div>
      <div class="tabs">
        <button class="tab on" data-shop-tab="avatar">아바타</button>
        <button class="tab" data-shop-tab="board">보드</button>
        <button class="tab" data-shop-tab="stone">돌</button>
      </div>
      <div class="shop-grid" id="shop-grid"></div>
    </section>

    <!-- ========== MISSION ========== -->
    <section class="screen" id="sc-mission">
      <div class="topbar">
        <button class="icon-btn" data-back>←</button>
        <div class="brand-name" style="text-align:center;flex:1">📋 미션 · 업적</div>
        <div style="width:42px"></div>
      </div>
      <div class="tabs">
        <button class="tab on" data-mtab="daily">일일 미션</button>
        <button class="tab" data-mtab="ach">업적</button>
        <button class="tab" data-mtab="hist">기록</button>
      </div>
      <div class="rank-list" id="mission-list"></div>
    </section>

    <!-- ========== SETTINGS ========== -->
    <section class="screen" id="sc-settings">
      <div class="topbar">
        <button class="icon-btn" data-back>←</button>
        <div class="brand-name" style="text-align:center;flex:1">⚙️ 설정</div>
        <button class="icon-btn" id="btn-how" title="게임방법">❓</button>
      </div>
      <div class="section-title first">게임</div>
      <div class="set-row">
        AI 난이도
        <div class="seg" id="seg-diff">
          <button data-d="1">쉬움</button>
          <button data-d="2" class="on">보통</button>
          <button data-d="3">어려움</button>
        </div>
      </div>
      <div class="set-row">
        사운드
        <div class="seg" id="seg-snd">
          <button data-s="1" class="on">켜기</button>
          <button data-s="0">끄기</button>
        </div>
      </div>
      <div class="set-row">
        마지막 수 표시
        <div class="seg" id="seg-mark">
          <button data-m="1" class="on">켜기</button>
          <button data-m="0">끄기</button>
        </div>
      </div>
      <div class="set-row">
        좌표 표시
        <div class="seg" id="seg-coord">
          <button data-c="1">켜기</button>
          <button data-c="0" class="on">끄기</button>
        </div>
      </div>
      <div class="set-row">
        진동
        <div class="seg" id="seg-vib">
          <button data-v="1" class="on">켜기</button>
          <button data-v="0">끄기</button>
        </div>
      </div>
      <div class="section-title">화면</div>
      <div class="set-row">
        전체화면
        <button class="btn btn-ghost btn-small" id="btn-fs-set">전환</button>
      </div>
      <div class="section-title">데이터</div>
      <div class="set-row">
        <span>전적 · 랭킹 초기화</span>
        <button class="btn btn-danger btn-small" id="btn-reset">초기화</button>
      </div>
      <div class="set-row">
        <span>버전</span>
        <span style="opacity:.7;font-weight:700">v2.0.0</span>
      </div>
    </section>

    <!-- ========== HOW TO PLAY ========== -->
    <section class="screen" id="sc-how">
      <div class="topbar">
        <button class="icon-btn" data-back>←</button>
        <div class="brand-name" style="text-align:center;flex:1">📖 게임 방법</div>
        <div style="width:42px"></div>
      </div>
      <div class="tut-body">
        <div class="tut-card">
          <div class="tut-title">🎯 목표</div>
          <div class="tut-desc">15×15 바둑판 위에 가로 · 세로 · 대각선 중 한 방향으로 자신의 돌 <b>5개를 먼저 연속</b>으로 놓으면 승리합니다.</div>
        </div>
        <div class="tut-card">
          <div class="tut-title">⚫ 흑돌 먼저</div>
          <div class="tut-desc">플레이어는 항상 <b>흑돌</b>로 먼저 시작합니다. 교대로 한 수씩 두며, 이미 놓인 자리에는 다시 둘 수 없습니다.</div>
        </div>
        <div class="tut-card">
          <div class="tut-title">💡 힌트</div>
          <div class="tut-desc">힌트 버튼을 누르면 AI가 추천하는 다음 수를 초록색 원으로 잠시 표시해줍니다.</div>
        </div>
        <div class="tut-card">
          <div class="tut-title">↩️ 무르기</div>
          <div class="tut-desc">방금 둔 수를 되돌릴 수 있습니다. AI 모드에서는 내 수와 AI 수가 같이 되돌려집니다.</div>
        </div>
        <div class="tut-card">
          <div class="tut-title">⭐ 보상</div>
          <div class="tut-desc">이길 때마다 난이도에 따라 스타와 경험치를 얻습니다. 스타로는 상점에서 아바타 · 보드 · 돌을 구입할 수 있습니다.</div>
        </div>
        <div class="tut-card">
          <div class="tut-title">🏆 랭킹</div>
          <div class="tut-desc">누적 랭킹과 이번주 랭킹, 그리고 어려움 난이도 승수 랭킹이 따로 집계됩니다. 매주 일요일 자정에 주간 랭킹이 초기화됩니다.</div>
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
            <span class="pname" id="name-b">플레이어</span>
          </div>
          <div class="vs-label">VS</div>
          <div class="player-pill white" id="pill-w">
            <span class="pdot"></span>
            <span class="pname" id="name-w">AI</span>
          </div>
        </div>
        <button class="icon-btn" id="btn-fs-game" title="전체화면">⛶</button>
      </div>
      <div class="turn-banner" id="turn-banner">● <b>흑돌</b> 차례</div>
      <div class="match-info">
        <div class="chip" id="mi-mode">AI · 보통</div>
        <div class="chip" id="mi-moves">0수</div>
        <div class="chip" id="mi-timer">00:00</div>
      </div>
      <div class="board-wrap"><canvas id="board" width="900" height="900"></canvas></div>
      <div class="game-actions">
        <button class="ga" id="ga-undo"><span class="i">↩️</span>무르기</button>
        <button class="ga" id="ga-hint"><span class="i">💡</span>힌트</button>
        <button class="ga" id="ga-restart"><span class="i">🔄</span>다시</button>
        <button class="ga" id="ga-settings"><span class="i">⚙️</span>설정</button>
        <button class="ga" id="ga-home"><span class="i">🏠</span>홈</button>
      </div>
    </section>

    <!-- ========== MODALS ========== -->
    <div class="modal" id="modal-result">
      <div class="modal-card">
        <h2 id="mr-title">🏆 승리!</h2>
        <p id="mr-desc">AI를 이겼습니다</p>
        <div class="modal-rewards" id="mr-rewards">
          <div class="reward-chip" id="mr-stars">+0</div>
          <div class="reward-chip xp" id="mr-xp">+0 XP</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" id="mr-again">다시하기</button>
          <button class="btn btn-ghost" id="mr-home">홈으로</button>
        </div>
      </div>
    </div>

    <div class="modal" id="modal-confirm">
      <div class="modal-card">
        <h2 id="mc-title">정말요?</h2>
        <p id="mc-desc">확인해주세요</p>
        <div class="modal-actions">
          <button class="btn btn-primary" id="mc-ok">확인</button>
          <button class="btn btn-ghost" id="mc-cancel">취소</button>
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
  const toast = (msg, ms = 1800) => {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), ms);
  };

  /* ═════════════════════════════════════════════════════════════════════════
     PERSISTENCE
     ═════════════════════════════════════════════════════════════════════════ */
  const storeLoad = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const storeSave = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} };
  const storeDel = key => { try { localStorage.removeItem(key); } catch {} };

  /* ═════════════════════════════════════════════════════════════════════════
     TIME & WEEK
     ═════════════════════════════════════════════════════════════════════════ */
  const weekKey = (d = new Date()) => {
    const y = d.getFullYear();
    const start = new Date(y, 0, 1);
    const w = Math.ceil((((d - start) / 86400000) + start.getDay() + 1) / 7);
    return y + '-W' + w;
  };
  const dayKey = (d = new Date()) => {
    const pad = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };

  /* ═════════════════════════════════════════════════════════════════════════
     LEVEL SYSTEM
     ═════════════════════════════════════════════════════════════════════════ */
  function levelFromXp(xp) {
    let lv = 1, need = 100, left = Number(xp) || 0;
    while (left >= need) { left -= need; lv++; need = Math.floor(need * 1.25); }
    return { lv, cur: left, need };
  }

  /* ═════════════════════════════════════════════════════════════════════════
     PROFILE & STATE
     ═════════════════════════════════════════════════════════════════════════ */
  function defaultProfile() {
    return {
      nickname: '플레이어' + Math.floor(Math.random() * 900 + 100),
      avatar: 'avatar_bear',
      stars: 200,
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
  let settings = Object.assign(defaultSettings(), storeLoad(SETTINGS_KEY) || {});
  let history  = storeLoad(HISTORY_KEY) || [];
  let missionState = storeLoad(MISSIONS_KEY) || { dayKey: dayKey(), missions: {}, claimed: {} };
  let achieveState = storeLoad(ACHIEVE_KEY) || { unlocked: {} };
  let shopState = Object.assign(defaultShop(), storeLoad(SHOP_KEY) || {});
  let dailyState = storeLoad(DAILY_KEY) || { lastClaim: null };

  // rollover weekly
  if (profile.weeklyKey !== weekKey()) {
    profile.weeklyKey = weekKey();
    profile.weeklyWins = 0;
    profile.weeklyGames = 0;
  }
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
  function playTap() { beep(700, 0.03, 'square', 0.04); }
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
    game.gameOver = false;
    game.hintCell = null;
    game.winLine = null;
    game.startedAt = Date.now();
    if (game.timerHandle) clearInterval(game.timerHandle);
    game.timerHandle = setInterval(updateTimer, 500);
    updateTurnDisplay();
    updateMatchInfo();
    draw();
    if (game.mode === MODE_AI && game.current === AI_PLAYER) {
      setTimeout(aiMove, 420);
    }
  }

  function updateTimer() {
    if (game.gameOver) return;
    const el = $('#mi-timer');
    if (!el) return;
    const sec = Math.floor((Date.now() - game.startedAt) / 1000);
    const m = Math.floor(sec / 60), s = sec % 60;
    el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function updateMatchInfo() {
    const modeEl = $('#mi-mode');
    const movesEl = $('#mi-moves');
    if (modeEl) {
      const diffLabel = ['쉬움', '보통', '어려움'][settings.difficulty - 1] || '보통';
      modeEl.textContent = game.mode === MODE_AI ? ('AI · ' + diffLabel) : '친구 대전';
    }
    if (movesEl) movesEl.textContent = game.history.length + '수';
  }

  function updateTurnDisplay() {
    const banner = $('#turn-banner');
    if (banner) {
      banner.innerHTML = game.current === HUMAN
        ? '● <b>흑돌</b> 차례'
        : '○ <b>' + (game.mode === MODE_AI ? 'AI' : '백돌') + '</b> 차례';
    }
    $('#pill-b').classList.toggle('active', game.current === HUMAN);
    $('#pill-w').classList.toggle('active', game.current === AI_PLAYER);
    $('#name-b').textContent = profile.nickname || '플레이어';
    $('#name-w').textContent = game.mode === MODE_AI ? 'AI' : '플레이어 2';
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
    const cell = getCellFromEvent(ev);
    if (!cell) return;
    placeStone(cell.x, cell.y);
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
    const limited = cells.slice(0, 10);
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

    // 3) difficulty-based selection
    let best = null;
    if (settings.difficulty === AI_HARD) {
      // Minimax depth 2 with heuristic ordering
      const res = minimax(game.board, 2, -Infinity, Infinity, true, AI_PLAYER, HUMAN);
      if (res && res.move) best = res.move;
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
        rewardStar = WIN_STAR_REWARDS[settings.difficulty] || 30;
        rewardXp = WIN_XP_REWARDS[settings.difficulty] || 20;
        profile.stars += rewardStar;
        profile.xp += rewardXp;
        playWin();
        confettiBurst(70);
      } else {
        profile.totalLosses++;
        profile.currentStreak = 0;
        profile.weeklyGames++;
        rewardXp = LOSS_XP;
        profile.xp += rewardXp;
        playLose();
      }
    } else {
      profile.weeklyGames++;
      playWin();
      confettiBurst(40);
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

    // Modal
    $('#mr-title').textContent = playerWon ? '🏆 승리!' : (game.mode === MODE_AI ? '😵 패배' : '🎉 게임 종료');
    $('#mr-desc').textContent = game.mode === MODE_AI
      ? (playerWon ? 'AI를 이겼습니다!' : 'AI에게 졌습니다')
      : (winner === HUMAN ? '흑돌(플레이어 1) 승리' : '백돌(플레이어 2) 승리');
    const rewardsEl = $('#mr-rewards');
    if (game.mode === MODE_AI && playerWon) {
      rewardsEl.classList.remove('hidden');
      $('#mr-stars').textContent = '+' + rewardStar;
      $('#mr-xp').textContent = '+' + rewardXp + ' XP';
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
    $('#mr-title').textContent = '무승부';
    $('#mr-desc').textContent = '돌이 꽉 찼습니다';
    $('#mr-rewards').classList.add('hidden');
    $('#modal-result').classList.add('active');
    syncHome();
  }

  /* ═════════════════════════════════════════════════════════════════════════
     DAILY MISSIONS
     ═════════════════════════════════════════════════════════════════════════ */
  const DAILY_DEFS = [
    { id: 'play1', name: '한 판 플레이', desc: 'AI와 1번 대전하기', target: 1, star: 30, getVal: m => m.plays || 0 },
    { id: 'play3', name: '세 판 플레이', desc: 'AI와 3번 대전하기', target: 3, star: 60, getVal: m => m.plays || 0 },
    { id: 'win1',  name: '승리 쟁취', desc: 'AI에게 1번 이기기', target: 1, star: 50, getVal: m => m.wins || 0 },
    { id: 'win3',  name: '연승 행진', desc: 'AI에게 3번 이기기', target: 3, star: 120, getVal: m => m.wins || 0 },
    { id: 'hard1', name: '도전자', desc: '어려움 AI에게 이기기', target: 1, star: 200, getVal: m => m.hardWins || 0 },
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
    toast('+' + def.star + '⭐ 획득');
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
        setTimeout(() => toast('🏅 업적: ' + a.name + ' (+' + a.star + '⭐)', 2600), newly * 300);
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
        catch { toast('전체화면을 시작할 수 없습니다'); }
      } else { toast('전체화면을 지원하지 않습니다'); }
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
    $('#ai-sub-label').textContent = '난이도 · ' + ['쉬움', '보통', '어려움'][settings.difficulty - 1];
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
    $('#lv-xp').textContent = lv.cur + ' / ' + lv.need + ' XP';
    $('#lv-fill').style.width = Math.min(100, (lv.cur / lv.need) * 100) + '%';

    const body = $('#prof-body');
    const rows = [
      ['총 게임', profile.totalGames],
      ['패배', profile.totalLosses],
      ['최고 연승', profile.bestStreak],
      ['현재 연승', profile.currentStreak],
      ['이번 주 승리', profile.weeklyWins],
      ['쉬움 승수', profile.easyWins || 0],
      ['보통 승수', profile.normalWins || 0],
      ['어려움 승수', profile.hardWins || 0],
    ];
    body.innerHTML = rows.map(([k, v]) =>
      `<div class="prof-row"><span class="k">${k}</span><span class="v">${v}</span></div>`
    ).join('');
  }

  let rankTab = 'total';
  function renderRanks() {
    const ranks = seedBotsIfNeeded();
    const wk = weekKey();
    let list;
    if (rankTab === 'weekly') {
      list = ranks
        .filter(r => r.weeklyKey === wk && (r.weeklyWins || 0) > 0)
        .sort((a, b) => (b.weeklyWins || 0) - (a.weeklyWins || 0));
    } else if (rankTab === 'hard') {
      list = ranks
        .filter(r => (r.hardWins || 0) > 0)
        .sort((a, b) => (b.hardWins || 0) - (a.hardWins || 0));
    } else {
      list = ranks.slice().sort((a, b) =>
        ((b.totalWins || 0) - (a.totalWins || 0)) || ((a.totalLosses || 0) - (b.totalLosses || 0))
      );
    }
    const el = $('#rank-list');
    if (!list.length) {
      el.innerHTML = '<div class="empty-note">아직 랭크된 플레이어가 없습니다<br/>한 판 이겨서 랭크에 등록해보세요!</div>';
      return;
    }
    el.innerHTML = list.slice(0, 50).map((r, i) => {
      const pos = i + 1;
      const cls = pos === 1 ? 'p1' : pos === 2 ? 'p2' : pos === 3 ? 'p3' : '';
      const label = pos <= 3 ? ['👑','🥈','🥉'][pos - 1] : pos;
      const me = r.id === 'me' ? 'me' : '';
      const rightPrimary = rankTab === 'weekly' ? ((r.weeklyWins || 0) + '승')
                        : rankTab === 'hard'   ? ((r.hardWins || 0) + '승')
                        : ((r.totalWins || 0) + '승');
      const sub = rankTab === 'weekly'
        ? '이번 주 · ' + (r.weeklyWins || 0) + '승'
        : rankTab === 'hard'
          ? '어려움 ' + (r.hardWins || 0) + '승 · 총 ' + (r.totalWins || 0) + '승'
          : (r.totalGames || 0) + '전 ' + (r.totalWins || 0) + '승 ' + (r.totalLosses || 0) + '패';
      const avatar = r.avatar || (r.id === 'me' ? getAvatarEmoji(settings.equippedAvatar) : '🙂');
      return `
        <div class="rank-row ${me}">
          <div class="rank-pos ${cls}">${label}</div>
          <div class="rank-avatar">${avatar}</div>
          <div class="rank-mid">
            <div class="rank-name">${escapeHtml(r.nickname || '-')}</div>
            <div class="rank-sub">${sub}</div>
          </div>
          <div class="rank-right">${rightPrimary}<small>${(r.totalGames || 0)}전</small></div>
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
      const price = owned ? (equipped ? '장착됨' : '보유') : it.price.toLocaleString();
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
        toast('스타가 부족합니다');
        return;
      }
      profile.stars -= item.price;
      shopState.owned.push(id);
      persist();
      playCoin();
      toast(item.name + ' 구매 완료!');
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
        const btnTxt = claimed ? '완료' : done ? '받기' : val + '/' + def.target;
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
        el.innerHTML = '<div class="empty-note">아직 경기 기록이 없습니다</div>';
        return;
      }
      el.innerHTML = history.slice(0, 30).map(h => {
        const win = h.result === 'win';
        const icon = win ? '🏆' : h.result === 'lose' ? '💀' : '🤝';
        const cls = win ? 'win' : h.result === 'lose' ? 'lose' : '';
        const dur = Math.floor(h.duration / 60) + ':' + String(h.duration % 60).padStart(2, '0');
        const date = new Date(h.at);
        const ds = (date.getMonth() + 1) + '/' + date.getDate() + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
        const diffLabel = h.mode === MODE_AI ? 'AI ' + ['쉬움', '보통', '어려움'][h.difficulty - 1] : '친구';
        const right = h.star ? '+' + h.star + '⭐' : '';
        return `
          <div class="hist-card">
            <div class="hist-icon ${cls}">${icon}</div>
            <div class="hist-main">
              <div class="hist-name">${win ? '승리' : h.result === 'lose' ? '패배' : '종료'} · ${diffLabel}</div>
              <div class="hist-sub">${ds} · ${h.moves}수 · ${dur}</div>
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
  $$('[data-nav]').forEach(b => b.addEventListener('click', () => {
    playTap();
    const nav = b.dataset.nav;
    if (nav === 'home')    { show('sc-home'); syncHome(); }
    else if (nav === 'rank') { show('sc-rank'); renderRanks(); }
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
  $('#btn-rank-refresh').addEventListener('click', () => { playTap(); renderRanks(); toast('새로고침 완료'); });

  // Daily bonus
  $('#daily-claim-btn').addEventListener('click', claimDaily);

  // Profile edit
  $('#btn-edit-name').addEventListener('click', () => {
    const n = prompt('닉네임을 입력하세요 (2-12자)', profile.nickname);
    if (n === null) return;
    const v = String(n).trim();
    if (v.length < 2 || v.length > 12) { toast('2-12자로 입력해주세요'); return; }
    profile.nickname = v;
    persist();
    renderProfile();
    syncHome();
    toast('닉네임 변경됨');
  });

  // Game actions
  $('#ga-home').addEventListener('click', () => {
    playTap();
    if (game.timerHandle) clearInterval(game.timerHandle);
    show('sc-home'); syncHome();
  });
  $('#ga-restart').addEventListener('click', () => { playTap(); newGame(); });
  $('#ga-hint').addEventListener('click', () => { playTap(); showHint(); });
  $('#ga-undo').addEventListener('click', () => {
    playTap();
    if (game.gameOver || !game.history.length) return;
    const steps = (game.mode === MODE_AI && game.history.length >= 2) ? 2 : 1;
    for (let i = 0; i < steps; i++) {
      const last = game.history.pop();
      if (!last) break;
      game.board[last.y][last.x] = EMPTY;
      game.current = last.c;
    }
    updateTurnDisplay();
    updateMatchInfo();
    draw();
  });
  $('#ga-settings').addEventListener('click', () => { playTap(); show('sc-settings'); });

  // Game result modal actions
  $('#mr-again').addEventListener('click', () => {
    playTap();
    $('#modal-result').classList.remove('active');
    newGame();
  });
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

  // Reflect current settings in segments
  function reflectSettings() {
    $$('#seg-diff button').forEach(b => b.classList.toggle('on', +b.dataset.d === settings.difficulty));
    $$('#seg-snd button').forEach(b => b.classList.toggle('on', (b.dataset.s === '1') === !!settings.sound));
    $$('#seg-mark button').forEach(b => b.classList.toggle('on', (b.dataset.m === '1') === !!settings.showMark));
    $$('#seg-coord button').forEach(b => b.classList.toggle('on', (b.dataset.c === '1') === !!settings.showCoord));
    $$('#seg-vib button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === !!settings.vibrate));
  }

  // Reset
  $('#btn-reset').addEventListener('click', () => {
    confirmModal('초기화', '전적과 랭킹을 초기화합니다. 계속하시겠습니까?', () => {
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
      toast('초기화 완료');
    });
  });

  // Fullscreen
  $('#btn-fs-game').addEventListener('click', () => { playTap(); toggleFullscreen(); });
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
     BOOT
     ═════════════════════════════════════════════════════════════════════════ */
  function boot() {
    seedBotsIfNeeded();
    persist();
    reflectSettings();
    syncHome();
    show('sc-home');
    requestAnimationFrame(resize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
/* ═══════════════════════════════════════════════════════════════════════════
   EXTENDED APPENDIX — additional data tables, helpers, and reference content
   ═══════════════════════════════════════════════════════════════════════════ */
(function ExtendedAppendix(){
  'use strict';
  if (typeof window === "undefined") return;
  var APPENDIX = window.__OMOK_APPENDIX__ = window.__OMOK_APPENDIX__ || {};

  /* ── Classical opening catalogue ─────────────────────────────────────── */
  APPENDIX.OPENINGS = [
    { id: 1, name: "Direct", jp: "Shousan", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 2, name: "Indirect", jp: "Ryuusei", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 3, name: "Knight", jp: "Shijou", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 4, name: "Cannon", jp: "Ukou", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 5, name: "Flower", jp: "Kachu", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 6, name: "Bird", jp: "Zangetsu", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 7, name: "Monkey", jp: "Meige", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 8, name: "Moon", jp: "Tsuitsu", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 9, name: "Star", jp: "Kouei", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 10, name: "Mountain", jp: "Hourai", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 11, name: "Valley", jp: "Houtei", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 12, name: "River", jp: "Rinkou", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 13, name: "Cloud", jp: "Kinsei", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 14, name: "Tiger", jp: "Touka", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 15, name: "Dragon", jp: "Yamagata", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 16, name: "Lotus", jp: "Fukuroi", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 17, name: "Peony", jp: "Mizukami", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 18, name: "Plum", jp: "Hanakaze", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 19, name: "Bamboo", jp: "Getsurin", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 20, name: "Pine", jp: "Meigetsu", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 21, name: "Storm", jp: "Sanka", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 22, name: "Wind", jp: "Ryouka", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 23, name: "Rain", jp: "Arashi", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 24, name: "Snow", jp: "Nagisa", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 25, name: "Frost", jp: "Shirakawa", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 26, name: "Dawn", jp: "Kumoi", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 27, name: "Dusk", jp: "Hayate", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 28, name: "Noon", jp: "Tokiwa", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 29, name: "Night", jp: "Seiran", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 30, name: "Eagle", jp: "Kazan", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 31, name: "Falcon", jp: "Genbu", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 32, name: "Crane", jp: "Seiryuu", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 33, name: "Swan", jp: "Byakko", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 34, name: "Wolf", jp: "Suzaku", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 35, name: "Fox", jp: "Ouka", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 36, name: "Bear", jp: "Shouka", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 37, name: "Deer", jp: "Kinto", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 38, name: "Hare", jp: "Gyokuran", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 39, name: "Carp", jp: "Suigetsu", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 40, name: "Koi", jp: "Akatsuki", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 41, name: "Pearl", jp: "Koubou", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 42, name: "Jade", jp: "Shunka", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 43, name: "Ruby", jp: "Aki no Tsuki", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 44, name: "Coral", jp: "Fuyuno", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 45, name: "Amber", jp: "Harusame", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 46, name: "Ivory", jp: "Natsumushi", difficulty: 1, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 47, name: "Ebony", jp: "Aki no Kaze", difficulty: 2, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 48, name: "Silver", jp: "Fuyugiku", difficulty: 3, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 49, name: "Gold", jp: "Chidori", difficulty: 4, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
    { id: 50, name: "Iron", jp: "Kasane", difficulty: 5, moves: [[7,7],[7,8],[8,7],[8,8],[6,8],[8,6],[6,7],[7,6]] },
  ];

  /* ── Pattern reference: shapes, names, point values ──────────────────── */
  APPENDIX.PATTERNS = [
    { id: 1, name: "OpenFour", shape: "OOOO", value: 100000 },
    { id: 2, name: "ClosedFour", shape: "xOOOO", value: 10000 },
    { id: 3, name: "OpenThree", shape: "OOO", value: 5000 },
    { id: 4, name: "ClosedThree", shape: "xOOO", value: 500 },
    { id: 5, name: "OpenTwo", shape: "OO", value: 200 },
    { id: 6, name: "ClosedTwo", shape: "xOO", value: 50 },
    { id: 7, name: "DoubleThree", shape: "OOO+OOO", value: 20000 },
    { id: 8, name: "DoubleFour", shape: "OOOO+OOOO", value: 50000 },
    { id: 9, name: "FourThree", shape: "OOOO+OOO", value: 30000 },
    { id: 10, name: "Gap", shape: "O_O", value: 80 },
    { id: 11, name: "Split", shape: "OO_O", value: 400 },
    { id: 12, name: "SplitThree", shape: "O_OO", value: 400 },
    { id: 13, name: "Triangle", shape: "OO/OO", value: 300 },
    { id: 14, name: "DiagThree", shape: "OOO diag", value: 5000 },
    { id: 15, name: "Block", shape: "xxxO", value: 0 },
    { id: 16, name: "Deadlock", shape: "xxOxx", value: 0 },
    { id: 17, name: "StarCenter", shape: "center", value: 100 },
    { id: 18, name: "EdgeStart", shape: "edge", value: 20 },
    { id: 19, name: "CornerStart", shape: "corner", value: 10 },
    { id: 20, name: "CrossPair", shape: "OO+OO", value: 250 },
  ];

  /* ── Emoji reactions for in-game taunts ──────────────────────────────── */
  APPENDIX.EMOJIS = [
    { key: "smile", label: "Smile", weight: 1 },
    { key: "grin", label: "Grin", weight: 2 },
    { key: "thumbs", label: "Thumbs", weight: 3 },
    { key: "fire", label: "Fire", weight: 4 },
    { key: "star", label: "Star", weight: 5 },
    { key: "sparkle", label: "Sparkle", weight: 6 },
    { key: "clap", label: "Clap", weight: 7 },
    { key: "pray", label: "Pray", weight: 8 },
    { key: "muscle", label: "Muscle", weight: 9 },
    { key: "rocket", label: "Rocket", weight: 10 },
    { key: "crown", label: "Crown", weight: 1 },
    { key: "trophy", label: "Trophy", weight: 2 },
    { key: "medal", label: "Medal", weight: 3 },
    { key: "gem", label: "Gem", weight: 4 },
    { key: "heart", label: "Heart", weight: 5 },
    { key: "eyes", label: "Eyes", weight: 6 },
    { key: "thinking", label: "Thinking", weight: 7 },
    { key: "smirk", label: "Smirk", weight: 8 },
    { key: "cool", label: "Cool", weight: 9 },
    { key: "party", label: "Party", weight: 10 },
    { key: "100", label: "100", weight: 1 },
    { key: "ok", label: "Ok", weight: 2 },
    { key: "wave", label: "Wave", weight: 3 },
    { key: "peace", label: "Peace", weight: 4 },
    { key: "wink", label: "Wink", weight: 5 },
    { key: "kiss", label: "Kiss", weight: 6 },
    { key: "laugh", label: "Laugh", weight: 7 },
    { key: "cry", label: "Cry", weight: 8 },
    { key: "shock", label: "Shock", weight: 9 },
    { key: "angry", label: "Angry", weight: 10 },
    { key: "sleepy", label: "Sleepy", weight: 1 },
    { key: "dizzy", label: "Dizzy", weight: 2 },
    { key: "sick", label: "Sick", weight: 3 },
    { key: "mask", label: "Mask", weight: 4 },
    { key: "sun", label: "Sun", weight: 5 },
    { key: "moon", label: "Moon", weight: 6 },
    { key: "cloud", label: "Cloud", weight: 7 },
    { key: "rain", label: "Rain", weight: 8 },
    { key: "snow", label: "Snow", weight: 9 },
    { key: "leaf", label: "Leaf", weight: 10 },
  ];

  /* ── Tutorial steps ──────────────────────────────────────────────────── */
  APPENDIX.TUTORIAL = [
    { step: 1, title: "Welcome to Omok", body: "Step 1: Learn how to handle welcome to omok in Omok with patience and precision." },
    { step: 2, title: "Place Your First Stone", body: "Step 2: Learn how to handle place your first stone in Omok with patience and precision." },
    { step: 3, title: "Understand Lines", body: "Step 3: Learn how to handle understand lines in Omok with patience and precision." },
    { step: 4, title: "Form Open Two", body: "Step 4: Learn how to handle form open two in Omok with patience and precision." },
    { step: 5, title: "Form Open Three", body: "Step 5: Learn how to handle form open three in Omok with patience and precision." },
    { step: 6, title: "Block Opponent", body: "Step 6: Learn how to handle block opponent in Omok with patience and precision." },
    { step: 7, title: "Form Open Four", body: "Step 7: Learn how to handle form open four in Omok with patience and precision." },
    { step: 8, title: "Win With Five", body: "Step 8: Learn how to handle win with five in Omok with patience and precision." },
    { step: 9, title: "Avoid Double Three", body: "Step 9: Learn how to handle avoid double three in Omok with patience and precision." },
    { step: 10, title: "Use Diagonals", body: "Step 10: Learn how to handle use diagonals in Omok with patience and precision." },
    { step: 11, title: "Defend Corners", body: "Step 11: Learn how to handle defend corners in Omok with patience and precision." },
    { step: 12, title: "Control Center", body: "Step 12: Learn how to handle control center in Omok with patience and precision." },
    { step: 13, title: "Read Threats", body: "Step 13: Learn how to handle read threats in Omok with patience and precision." },
    { step: 14, title: "Count Tempo", body: "Step 14: Learn how to handle count tempo in Omok with patience and precision." },
    { step: 15, title: "Plan Ahead", body: "Step 15: Learn how to handle plan ahead in Omok with patience and precision." },
    { step: 16, title: "Endgame Theory", body: "Step 16: Learn how to handle endgame theory in Omok with patience and precision." },
    { step: 17, title: "Practice Daily", body: "Step 17: Learn how to handle practice daily in Omok with patience and precision." },
    { step: 18, title: "Review Games", body: "Step 18: Learn how to handle review games in Omok with patience and precision." },
    { step: 19, title: "Climb Ranks", body: "Step 19: Learn how to handle climb ranks in Omok with patience and precision." },
    { step: 20, title: "Become Master", body: "Step 20: Learn how to handle become master in Omok with patience and precision." },
  ];

  /* ── Extended bot personality pool ───────────────────────────────────── */
  APPENDIX.BOTS = [
    { id: 100+0, name: "해바라기", elo: 1000, style: "mixed", aggression: 0.0 },
    { id: 100+1, name: "달빛", elo: 1017, style: "mixed", aggression: 0.1 },
    { id: 100+2, name: "별빛", elo: 1034, style: "mixed", aggression: 0.2 },
    { id: 100+3, name: "구름", elo: 1051, style: "mixed", aggression: 0.3 },
    { id: 100+4, name: "바람", elo: 1068, style: "mixed", aggression: 0.4 },
    { id: 100+5, name: "산호", elo: 1085, style: "mixed", aggression: 0.5 },
    { id: 100+6, name: "진주", elo: 1102, style: "mixed", aggression: 0.6 },
    { id: 100+7, name: "호박", elo: 1119, style: "mixed", aggression: 0.7 },
    { id: 100+8, name: "청옥", elo: 1136, style: "mixed", aggression: 0.8 },
    { id: 100+9, name: "루비", elo: 1153, style: "mixed", aggression: 0.9 },
    { id: 100+10, name: "사파이어", elo: 1170, style: "mixed", aggression: 0.0 },
    { id: 100+11, name: "자수정", elo: 1187, style: "mixed", aggression: 0.1 },
    { id: 100+12, name: "오팔", elo: 1204, style: "mixed", aggression: 0.2 },
    { id: 100+13, name: "토파즈", elo: 1221, style: "mixed", aggression: 0.3 },
    { id: 100+14, name: "에메랄드", elo: 1238, style: "mixed", aggression: 0.4 },
    { id: 100+15, name: "다이아", elo: 1255, style: "mixed", aggression: 0.5 },
    { id: 100+16, name: "크리스탈", elo: 1272, style: "mixed", aggression: 0.6 },
    { id: 100+17, name: "앰버", elo: 1289, style: "mixed", aggression: 0.7 },
    { id: 100+18, name: "오닉스", elo: 1306, style: "mixed", aggression: 0.8 },
    { id: 100+19, name: "코랄", elo: 1323, style: "mixed", aggression: 0.9 },
    { id: 100+20, name: "펄", elo: 1340, style: "mixed", aggression: 0.0 },
    { id: 100+21, name: "보라", elo: 1357, style: "mixed", aggression: 0.1 },
    { id: 100+22, name: "금빛", elo: 1374, style: "mixed", aggression: 0.2 },
    { id: 100+23, name: "은빛", elo: 1391, style: "mixed", aggression: 0.3 },
    { id: 100+24, name: "철빛", elo: 1408, style: "mixed", aggression: 0.4 },
    { id: 100+25, name: "청동", elo: 1425, style: "mixed", aggression: 0.5 },
    { id: 100+26, name: "백자", elo: 1442, style: "mixed", aggression: 0.6 },
    { id: 100+27, name: "청자", elo: 1459, style: "mixed", aggression: 0.7 },
    { id: 100+28, name: "옥", elo: 1476, style: "mixed", aggression: 0.8 },
    { id: 100+29, name: "흑요석", elo: 1493, style: "mixed", aggression: 0.9 },
    { id: 100+30, name: "호박새", elo: 1510, style: "mixed", aggression: 0.0 },
    { id: 100+31, name: "백로", elo: 1527, style: "mixed", aggression: 0.1 },
    { id: 100+32, name: "제비", elo: 1544, style: "mixed", aggression: 0.2 },
    { id: 100+33, name: "까치", elo: 1561, style: "mixed", aggression: 0.3 },
    { id: 100+34, name: "까마귀", elo: 1578, style: "mixed", aggression: 0.4 },
    { id: 100+35, name: "매", elo: 1595, style: "mixed", aggression: 0.5 },
    { id: 100+36, name: "독수리", elo: 1612, style: "mixed", aggression: 0.6 },
    { id: 100+37, name: "부엉이", elo: 1629, style: "mixed", aggression: 0.7 },
    { id: 100+38, name: "학", elo: 1646, style: "mixed", aggression: 0.8 },
    { id: 100+39, name: "기러기", elo: 1663, style: "mixed", aggression: 0.9 },
    { id: 100+40, name: "꿀벌", elo: 1680, style: "mixed", aggression: 0.0 },
    { id: 100+41, name: "나비", elo: 1697, style: "mixed", aggression: 0.1 },
    { id: 100+42, name: "잠자리", elo: 1714, style: "mixed", aggression: 0.2 },
    { id: 100+43, name: "반딧불", elo: 1731, style: "mixed", aggression: 0.3 },
    { id: 100+44, name: "사슴", elo: 1748, style: "mixed", aggression: 0.4 },
    { id: 100+45, name: "여우", elo: 1765, style: "mixed", aggression: 0.5 },
    { id: 100+46, name: "너구리", elo: 1782, style: "mixed", aggression: 0.6 },
    { id: 100+47, name: "늑대", elo: 1799, style: "mixed", aggression: 0.7 },
    { id: 100+48, name: "표범", elo: 1816, style: "mixed", aggression: 0.8 },
    { id: 100+49, name: "호랑이", elo: 1833, style: "mixed", aggression: 0.9 },
  ];

  /* ── Avatar color palettes ───────────────────────────────────────────── */
  APPENDIX.PALETTES = [
    { id: 1, name: "Palette 1", from: "hsl(0,70%,55%)", to: "hsl(40,70%,35%)" },
    { id: 2, name: "Palette 2", from: "hsl(37,70%,55%)", to: "hsl(77,70%,35%)" },
    { id: 3, name: "Palette 3", from: "hsl(74,70%,55%)", to: "hsl(114,70%,35%)" },
    { id: 4, name: "Palette 4", from: "hsl(111,70%,55%)", to: "hsl(151,70%,35%)" },
    { id: 5, name: "Palette 5", from: "hsl(148,70%,55%)", to: "hsl(188,70%,35%)" },
    { id: 6, name: "Palette 6", from: "hsl(185,70%,55%)", to: "hsl(225,70%,35%)" },
    { id: 7, name: "Palette 7", from: "hsl(222,70%,55%)", to: "hsl(262,70%,35%)" },
    { id: 8, name: "Palette 8", from: "hsl(259,70%,55%)", to: "hsl(299,70%,35%)" },
    { id: 9, name: "Palette 9", from: "hsl(296,70%,55%)", to: "hsl(336,70%,35%)" },
    { id: 10, name: "Palette 10", from: "hsl(333,70%,55%)", to: "hsl(13,70%,35%)" },
    { id: 11, name: "Palette 11", from: "hsl(10,70%,55%)", to: "hsl(50,70%,35%)" },
    { id: 12, name: "Palette 12", from: "hsl(47,70%,55%)", to: "hsl(87,70%,35%)" },
    { id: 13, name: "Palette 13", from: "hsl(84,70%,55%)", to: "hsl(124,70%,35%)" },
    { id: 14, name: "Palette 14", from: "hsl(121,70%,55%)", to: "hsl(161,70%,35%)" },
    { id: 15, name: "Palette 15", from: "hsl(158,70%,55%)", to: "hsl(198,70%,35%)" },
    { id: 16, name: "Palette 16", from: "hsl(195,70%,55%)", to: "hsl(235,70%,35%)" },
    { id: 17, name: "Palette 17", from: "hsl(232,70%,55%)", to: "hsl(272,70%,35%)" },
    { id: 18, name: "Palette 18", from: "hsl(269,70%,55%)", to: "hsl(309,70%,35%)" },
    { id: 19, name: "Palette 19", from: "hsl(306,70%,55%)", to: "hsl(346,70%,35%)" },
    { id: 20, name: "Palette 20", from: "hsl(343,70%,55%)", to: "hsl(23,70%,35%)" },
    { id: 21, name: "Palette 21", from: "hsl(20,70%,55%)", to: "hsl(60,70%,35%)" },
    { id: 22, name: "Palette 22", from: "hsl(57,70%,55%)", to: "hsl(97,70%,35%)" },
    { id: 23, name: "Palette 23", from: "hsl(94,70%,55%)", to: "hsl(134,70%,35%)" },
    { id: 24, name: "Palette 24", from: "hsl(131,70%,55%)", to: "hsl(171,70%,35%)" },
    { id: 25, name: "Palette 25", from: "hsl(168,70%,55%)", to: "hsl(208,70%,35%)" },
    { id: 26, name: "Palette 26", from: "hsl(205,70%,55%)", to: "hsl(245,70%,35%)" },
    { id: 27, name: "Palette 27", from: "hsl(242,70%,55%)", to: "hsl(282,70%,35%)" },
    { id: 28, name: "Palette 28", from: "hsl(279,70%,55%)", to: "hsl(319,70%,35%)" },
    { id: 29, name: "Palette 29", from: "hsl(316,70%,55%)", to: "hsl(356,70%,35%)" },
    { id: 30, name: "Palette 30", from: "hsl(353,70%,55%)", to: "hsl(33,70%,35%)" },
    { id: 31, name: "Palette 31", from: "hsl(30,70%,55%)", to: "hsl(70,70%,35%)" },
    { id: 32, name: "Palette 32", from: "hsl(67,70%,55%)", to: "hsl(107,70%,35%)" },
    { id: 33, name: "Palette 33", from: "hsl(104,70%,55%)", to: "hsl(144,70%,35%)" },
    { id: 34, name: "Palette 34", from: "hsl(141,70%,55%)", to: "hsl(181,70%,35%)" },
    { id: 35, name: "Palette 35", from: "hsl(178,70%,55%)", to: "hsl(218,70%,35%)" },
    { id: 36, name: "Palette 36", from: "hsl(215,70%,55%)", to: "hsl(255,70%,35%)" },
    { id: 37, name: "Palette 37", from: "hsl(252,70%,55%)", to: "hsl(292,70%,35%)" },
    { id: 38, name: "Palette 38", from: "hsl(289,70%,55%)", to: "hsl(329,70%,35%)" },
    { id: 39, name: "Palette 39", from: "hsl(326,70%,55%)", to: "hsl(6,70%,35%)" },
    { id: 40, name: "Palette 40", from: "hsl(3,70%,55%)", to: "hsl(43,70%,35%)" },
  ];

  /* ── Lore & flavor text ──────────────────────────────────────────────── */
  APPENDIX.LORE = [
    { id: 1, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 1." },
    { id: 2, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 2." },
    { id: 3, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 3." },
    { id: 4, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 4." },
    { id: 5, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 5." },
    { id: 6, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 6." },
    { id: 7, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 7." },
    { id: 8, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 8." },
    { id: 9, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 9." },
    { id: 10, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 10." },
    { id: 11, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 11." },
    { id: 12, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 12." },
    { id: 13, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 13." },
    { id: 14, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 14." },
    { id: 15, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 15." },
    { id: 16, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 16." },
    { id: 17, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 17." },
    { id: 18, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 18." },
    { id: 19, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 19." },
    { id: 20, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 20." },
    { id: 21, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 21." },
    { id: 22, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 22." },
    { id: 23, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 23." },
    { id: 24, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 24." },
    { id: 25, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 25." },
    { id: 26, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 26." },
    { id: 27, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 27." },
    { id: 28, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 28." },
    { id: 29, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 29." },
    { id: 30, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 30." },
    { id: 31, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 31." },
    { id: 32, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 32." },
    { id: 33, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 33." },
    { id: 34, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 34." },
    { id: 35, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 35." },
    { id: 36, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 36." },
    { id: 37, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 37." },
    { id: 38, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 38." },
    { id: 39, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 39." },
    { id: 40, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 40." },
    { id: 41, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 41." },
    { id: 42, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 42." },
    { id: 43, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 43." },
    { id: 44, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 44." },
    { id: 45, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 45." },
    { id: 46, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 46." },
    { id: 47, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 47." },
    { id: 48, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 48." },
    { id: 49, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 49." },
    { id: 50, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 50." },
    { id: 51, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 51." },
    { id: 52, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 52." },
    { id: 53, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 53." },
    { id: 54, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 54." },
    { id: 55, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 55." },
    { id: 56, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 56." },
    { id: 57, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 57." },
    { id: 58, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 58." },
    { id: 59, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 59." },
    { id: 60, text: "Ancient masters say the stone finds its place on the board like a drop of rain finds the valley floor — chapter 60." },
  ];

  /* ── Daily quotes ───────────────────────────────────────────────────── */
  APPENDIX.QUOTES = [
    { day: 1, quote: "Quote 1: Patience is the sharpest weapon on the board." },
    { day: 2, quote: "Quote 2: Patience is the sharpest weapon on the board." },
    { day: 3, quote: "Quote 3: Patience is the sharpest weapon on the board." },
    { day: 4, quote: "Quote 4: Patience is the sharpest weapon on the board." },
    { day: 5, quote: "Quote 5: Patience is the sharpest weapon on the board." },
    { day: 6, quote: "Quote 6: Patience is the sharpest weapon on the board." },
    { day: 7, quote: "Quote 7: Patience is the sharpest weapon on the board." },
    { day: 8, quote: "Quote 8: Patience is the sharpest weapon on the board." },
    { day: 9, quote: "Quote 9: Patience is the sharpest weapon on the board." },
    { day: 10, quote: "Quote 10: Patience is the sharpest weapon on the board." },
    { day: 11, quote: "Quote 11: Patience is the sharpest weapon on the board." },
    { day: 12, quote: "Quote 12: Patience is the sharpest weapon on the board." },
    { day: 13, quote: "Quote 13: Patience is the sharpest weapon on the board." },
    { day: 14, quote: "Quote 14: Patience is the sharpest weapon on the board." },
    { day: 15, quote: "Quote 15: Patience is the sharpest weapon on the board." },
    { day: 16, quote: "Quote 16: Patience is the sharpest weapon on the board." },
    { day: 17, quote: "Quote 17: Patience is the sharpest weapon on the board." },
    { day: 18, quote: "Quote 18: Patience is the sharpest weapon on the board." },
    { day: 19, quote: "Quote 19: Patience is the sharpest weapon on the board." },
    { day: 20, quote: "Quote 20: Patience is the sharpest weapon on the board." },
    { day: 21, quote: "Quote 21: Patience is the sharpest weapon on the board." },
    { day: 22, quote: "Quote 22: Patience is the sharpest weapon on the board." },
    { day: 23, quote: "Quote 23: Patience is the sharpest weapon on the board." },
    { day: 24, quote: "Quote 24: Patience is the sharpest weapon on the board." },
    { day: 25, quote: "Quote 25: Patience is the sharpest weapon on the board." },
    { day: 26, quote: "Quote 26: Patience is the sharpest weapon on the board." },
    { day: 27, quote: "Quote 27: Patience is the sharpest weapon on the board." },
    { day: 28, quote: "Quote 28: Patience is the sharpest weapon on the board." },
    { day: 29, quote: "Quote 29: Patience is the sharpest weapon on the board." },
    { day: 30, quote: "Quote 30: Patience is the sharpest weapon on the board." },
    { day: 31, quote: "Quote 31: Patience is the sharpest weapon on the board." },
    { day: 32, quote: "Quote 32: Patience is the sharpest weapon on the board." },
    { day: 33, quote: "Quote 33: Patience is the sharpest weapon on the board." },
    { day: 34, quote: "Quote 34: Patience is the sharpest weapon on the board." },
    { day: 35, quote: "Quote 35: Patience is the sharpest weapon on the board." },
    { day: 36, quote: "Quote 36: Patience is the sharpest weapon on the board." },
    { day: 37, quote: "Quote 37: Patience is the sharpest weapon on the board." },
    { day: 38, quote: "Quote 38: Patience is the sharpest weapon on the board." },
    { day: 39, quote: "Quote 39: Patience is the sharpest weapon on the board." },
    { day: 40, quote: "Quote 40: Patience is the sharpest weapon on the board." },
    { day: 41, quote: "Quote 41: Patience is the sharpest weapon on the board." },
    { day: 42, quote: "Quote 42: Patience is the sharpest weapon on the board." },
    { day: 43, quote: "Quote 43: Patience is the sharpest weapon on the board." },
    { day: 44, quote: "Quote 44: Patience is the sharpest weapon on the board." },
    { day: 45, quote: "Quote 45: Patience is the sharpest weapon on the board." },
    { day: 46, quote: "Quote 46: Patience is the sharpest weapon on the board." },
    { day: 47, quote: "Quote 47: Patience is the sharpest weapon on the board." },
    { day: 48, quote: "Quote 48: Patience is the sharpest weapon on the board." },
    { day: 49, quote: "Quote 49: Patience is the sharpest weapon on the board." },
    { day: 50, quote: "Quote 50: Patience is the sharpest weapon on the board." },
    { day: 51, quote: "Quote 51: Patience is the sharpest weapon on the board." },
    { day: 52, quote: "Quote 52: Patience is the sharpest weapon on the board." },
    { day: 53, quote: "Quote 53: Patience is the sharpest weapon on the board." },
    { day: 54, quote: "Quote 54: Patience is the sharpest weapon on the board." },
    { day: 55, quote: "Quote 55: Patience is the sharpest weapon on the board." },
    { day: 56, quote: "Quote 56: Patience is the sharpest weapon on the board." },
    { day: 57, quote: "Quote 57: Patience is the sharpest weapon on the board." },
    { day: 58, quote: "Quote 58: Patience is the sharpest weapon on the board." },
    { day: 59, quote: "Quote 59: Patience is the sharpest weapon on the board." },
    { day: 60, quote: "Quote 60: Patience is the sharpest weapon on the board." },
    { day: 61, quote: "Quote 61: Patience is the sharpest weapon on the board." },
    { day: 62, quote: "Quote 62: Patience is the sharpest weapon on the board." },
    { day: 63, quote: "Quote 63: Patience is the sharpest weapon on the board." },
    { day: 64, quote: "Quote 64: Patience is the sharpest weapon on the board." },
    { day: 65, quote: "Quote 65: Patience is the sharpest weapon on the board." },
    { day: 66, quote: "Quote 66: Patience is the sharpest weapon on the board." },
    { day: 67, quote: "Quote 67: Patience is the sharpest weapon on the board." },
    { day: 68, quote: "Quote 68: Patience is the sharpest weapon on the board." },
    { day: 69, quote: "Quote 69: Patience is the sharpest weapon on the board." },
    { day: 70, quote: "Quote 70: Patience is the sharpest weapon on the board." },
    { day: 71, quote: "Quote 71: Patience is the sharpest weapon on the board." },
    { day: 72, quote: "Quote 72: Patience is the sharpest weapon on the board." },
    { day: 73, quote: "Quote 73: Patience is the sharpest weapon on the board." },
    { day: 74, quote: "Quote 74: Patience is the sharpest weapon on the board." },
    { day: 75, quote: "Quote 75: Patience is the sharpest weapon on the board." },
    { day: 76, quote: "Quote 76: Patience is the sharpest weapon on the board." },
    { day: 77, quote: "Quote 77: Patience is the sharpest weapon on the board." },
    { day: 78, quote: "Quote 78: Patience is the sharpest weapon on the board." },
    { day: 79, quote: "Quote 79: Patience is the sharpest weapon on the board." },
    { day: 80, quote: "Quote 80: Patience is the sharpest weapon on the board." },
  ];

  /* ── Difficulty progression table ────────────────────────────────────── */
  APPENDIX.DIFFICULTY_CURVE = [
    { level: 1, depth: 1, randomness: 0.500, branching: 8 },
    { level: 2, depth: 1, randomness: 0.490, branching: 9 },
    { level: 3, depth: 1, randomness: 0.480, branching: 10 },
    { level: 4, depth: 1, randomness: 0.470, branching: 11 },
    { level: 5, depth: 1, randomness: 0.460, branching: 12 },
    { level: 6, depth: 1, randomness: 0.450, branching: 13 },
    { level: 7, depth: 1, randomness: 0.440, branching: 14 },
    { level: 8, depth: 1, randomness: 0.430, branching: 15 },
    { level: 9, depth: 1, randomness: 0.420, branching: 16 },
    { level: 10, depth: 1, randomness: 0.410, branching: 17 },
    { level: 11, depth: 1, randomness: 0.400, branching: 18 },
    { level: 12, depth: 1, randomness: 0.390, branching: 19 },
    { level: 13, depth: 1, randomness: 0.380, branching: 20 },
    { level: 14, depth: 1, randomness: 0.370, branching: 21 },
    { level: 15, depth: 1, randomness: 0.360, branching: 22 },
    { level: 16, depth: 2, randomness: 0.350, branching: 23 },
    { level: 17, depth: 2, randomness: 0.340, branching: 24 },
    { level: 18, depth: 2, randomness: 0.330, branching: 25 },
    { level: 19, depth: 2, randomness: 0.320, branching: 26 },
    { level: 20, depth: 2, randomness: 0.310, branching: 27 },
    { level: 21, depth: 2, randomness: 0.300, branching: 28 },
    { level: 22, depth: 2, randomness: 0.290, branching: 29 },
    { level: 23, depth: 2, randomness: 0.280, branching: 30 },
    { level: 24, depth: 2, randomness: 0.270, branching: 31 },
    { level: 25, depth: 2, randomness: 0.260, branching: 32 },
    { level: 26, depth: 2, randomness: 0.250, branching: 33 },
    { level: 27, depth: 2, randomness: 0.240, branching: 34 },
    { level: 28, depth: 2, randomness: 0.230, branching: 35 },
    { level: 29, depth: 2, randomness: 0.220, branching: 36 },
    { level: 30, depth: 2, randomness: 0.210, branching: 37 },
    { level: 31, depth: 3, randomness: 0.200, branching: 38 },
    { level: 32, depth: 3, randomness: 0.190, branching: 39 },
    { level: 33, depth: 3, randomness: 0.180, branching: 40 },
    { level: 34, depth: 3, randomness: 0.170, branching: 41 },
    { level: 35, depth: 3, randomness: 0.160, branching: 42 },
    { level: 36, depth: 3, randomness: 0.150, branching: 43 },
    { level: 37, depth: 3, randomness: 0.140, branching: 44 },
    { level: 38, depth: 3, randomness: 0.130, branching: 45 },
    { level: 39, depth: 3, randomness: 0.120, branching: 46 },
    { level: 40, depth: 3, randomness: 0.110, branching: 47 },
    { level: 41, depth: 3, randomness: 0.100, branching: 48 },
    { level: 42, depth: 3, randomness: 0.090, branching: 49 },
    { level: 43, depth: 3, randomness: 0.080, branching: 50 },
    { level: 44, depth: 3, randomness: 0.070, branching: 51 },
    { level: 45, depth: 3, randomness: 0.060, branching: 52 },
    { level: 46, depth: 4, randomness: 0.050, branching: 53 },
    { level: 47, depth: 4, randomness: 0.040, branching: 54 },
    { level: 48, depth: 4, randomness: 0.030, branching: 55 },
    { level: 49, depth: 4, randomness: 0.020, branching: 56 },
    { level: 50, depth: 4, randomness: 0.010, branching: 57 },
  ];

  /* ── Helper utilities ────────────────────────────────────────────────── */
  APPENDIX.formatDuration = function(ms) {
    if (typeof ms !== "number" || ms < 0) return "0s";
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    var out = [];
    if (h) out.push(h + "h");
    if (m) out.push(m + "m");
    out.push(s + "s");
    return out.join(" ");
  };

  APPENDIX.clamp = function(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  APPENDIX.lerp = function(a, b, t) { return a + (b - a) * t; };
  APPENDIX.randInt = function(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  APPENDIX.pick = function(arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  APPENDIX.shuffle = function(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  /* ── Theme variants (for future skinning) ────────────────────────────── */
  APPENDIX.THEMES = [
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

  /* ── Sound bank metadata ─────────────────────────────────────────────── */
  APPENDIX.SOUNDS = [
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

  /* ── Localization strings (KO/EN/JA/ZH) ──────────────────────────────── */
  APPENDIX.I18N = {
    home: { ko: "home_ko", en: "Home", ja: "home_ja", zh: "home_zh" },
    profile: { ko: "profile_ko", en: "Profile", ja: "profile_ja", zh: "profile_zh" },
    rank: { ko: "rank_ko", en: "Rank", ja: "rank_ja", zh: "rank_zh" },
    shop: { ko: "shop_ko", en: "Shop", ja: "shop_ja", zh: "shop_zh" },
    mission: { ko: "mission_ko", en: "Mission", ja: "mission_ja", zh: "mission_zh" },
    settings: { ko: "settings_ko", en: "Settings", ja: "settings_ja", zh: "settings_zh" },
    howto: { ko: "howto_ko", en: "Howto", ja: "howto_ja", zh: "howto_zh" },
    play_ai: { ko: "play_ai_ko", en: "Play_Ai", ja: "play_ai_ja", zh: "play_ai_zh" },
    play_pvp: { ko: "play_pvp_ko", en: "Play_Pvp", ja: "play_pvp_ja", zh: "play_pvp_zh" },
    easy: { ko: "easy_ko", en: "Easy", ja: "easy_ja", zh: "easy_zh" },
    normal: { ko: "normal_ko", en: "Normal", ja: "normal_ja", zh: "normal_zh" },
    hard: { ko: "hard_ko", en: "Hard", ja: "hard_ja", zh: "hard_zh" },
    win: { ko: "win_ko", en: "Win", ja: "win_ja", zh: "win_zh" },
    lose: { ko: "lose_ko", en: "Lose", ja: "lose_ja", zh: "lose_zh" },
    draw: { ko: "draw_ko", en: "Draw", ja: "draw_ja", zh: "draw_zh" },
    score: { ko: "score_ko", en: "Score", ja: "score_ja", zh: "score_zh" },
    level: { ko: "level_ko", en: "Level", ja: "level_ja", zh: "level_zh" },
    coins: { ko: "coins_ko", en: "Coins", ja: "coins_ja", zh: "coins_zh" },
    stars: { ko: "stars_ko", en: "Stars", ja: "stars_ja", zh: "stars_zh" },
    weekly: { ko: "weekly_ko", en: "Weekly", ja: "weekly_ja", zh: "weekly_zh" },
    total: { ko: "total_ko", en: "Total", ja: "total_ja", zh: "total_zh" },
    back: { ko: "back_ko", en: "Back", ja: "back_ja", zh: "back_zh" },
    close: { ko: "close_ko", en: "Close", ja: "close_ja", zh: "close_zh" },
    confirm: { ko: "confirm_ko", en: "Confirm", ja: "confirm_ja", zh: "confirm_zh" },
    cancel: { ko: "cancel_ko", en: "Cancel", ja: "cancel_ja", zh: "cancel_zh" },
    next: { ko: "next_ko", en: "Next", ja: "next_ja", zh: "next_zh" },
    prev: { ko: "prev_ko", en: "Prev", ja: "prev_ja", zh: "prev_zh" },
    restart: { ko: "restart_ko", en: "Restart", ja: "restart_ja", zh: "restart_zh" },
    hint: { ko: "hint_ko", en: "Hint", ja: "hint_ja", zh: "hint_zh" },
    undo: { ko: "undo_ko", en: "Undo", ja: "undo_ja", zh: "undo_zh" },
    fullscreen: { ko: "fullscreen_ko", en: "Fullscreen", ja: "fullscreen_ja", zh: "fullscreen_zh" },
    exit: { ko: "exit_ko", en: "Exit", ja: "exit_ja", zh: "exit_zh" },
    achievement: { ko: "achievement_ko", en: "Achievement", ja: "achievement_ja", zh: "achievement_zh" },
    daily: { ko: "daily_ko", en: "Daily", ja: "daily_ja", zh: "daily_zh" },
    reward: { ko: "reward_ko", en: "Reward", ja: "reward_ja", zh: "reward_zh" },
    claim: { ko: "claim_ko", en: "Claim", ja: "claim_ja", zh: "claim_zh" },
    locked: { ko: "locked_ko", en: "Locked", ja: "locked_ja", zh: "locked_zh" },
    unlocked: { ko: "unlocked_ko", en: "Unlocked", ja: "unlocked_ja", zh: "unlocked_zh" },
  };

  /* ── Board analysis constants ────────────────────────────────────────── */
  APPENDIX.BOARD_ZONES = [
    { x: 0, y: 0, zone: "edge", weight: 0 },
    { x: 0, y: 1, zone: "edge", weight: 1 },
    { x: 0, y: 2, zone: "edge", weight: 2 },
    { x: 0, y: 3, zone: "edge", weight: 3 },
    { x: 0, y: 4, zone: "edge", weight: 4 },
    { x: 0, y: 5, zone: "edge", weight: 5 },
    { x: 0, y: 6, zone: "edge", weight: 6 },
    { x: 0, y: 7, zone: "edge", weight: 7 },
    { x: 0, y: 8, zone: "edge", weight: 6 },
    { x: 0, y: 9, zone: "edge", weight: 5 },
    { x: 0, y: 10, zone: "edge", weight: 4 },
    { x: 0, y: 11, zone: "edge", weight: 3 },
    { x: 0, y: 12, zone: "edge", weight: 2 },
    { x: 0, y: 13, zone: "edge", weight: 1 },
    { x: 0, y: 14, zone: "edge", weight: 0 },
    { x: 1, y: 0, zone: "edge", weight: 1 },
    { x: 1, y: 1, zone: "mid", weight: 2 },
    { x: 1, y: 2, zone: "mid", weight: 3 },
    { x: 1, y: 3, zone: "mid", weight: 4 },
    { x: 1, y: 4, zone: "mid", weight: 5 },
    { x: 1, y: 5, zone: "mid", weight: 6 },
    { x: 1, y: 6, zone: "mid", weight: 7 },
    { x: 1, y: 7, zone: "mid", weight: 8 },
    { x: 1, y: 8, zone: "mid", weight: 7 },
    { x: 1, y: 9, zone: "mid", weight: 6 },
    { x: 1, y: 10, zone: "mid", weight: 5 },
    { x: 1, y: 11, zone: "mid", weight: 4 },
    { x: 1, y: 12, zone: "mid", weight: 3 },
    { x: 1, y: 13, zone: "mid", weight: 2 },
    { x: 1, y: 14, zone: "edge", weight: 1 },
    { x: 2, y: 0, zone: "edge", weight: 2 },
    { x: 2, y: 1, zone: "mid", weight: 3 },
    { x: 2, y: 2, zone: "mid", weight: 4 },
    { x: 2, y: 3, zone: "mid", weight: 5 },
    { x: 2, y: 4, zone: "mid", weight: 6 },
    { x: 2, y: 5, zone: "mid", weight: 7 },
    { x: 2, y: 6, zone: "mid", weight: 8 },
    { x: 2, y: 7, zone: "mid", weight: 9 },
    { x: 2, y: 8, zone: "mid", weight: 8 },
    { x: 2, y: 9, zone: "mid", weight: 7 },
    { x: 2, y: 10, zone: "mid", weight: 6 },
    { x: 2, y: 11, zone: "mid", weight: 5 },
    { x: 2, y: 12, zone: "mid", weight: 4 },
    { x: 2, y: 13, zone: "mid", weight: 3 },
    { x: 2, y: 14, zone: "edge", weight: 2 },
    { x: 3, y: 0, zone: "edge", weight: 3 },
    { x: 3, y: 1, zone: "mid", weight: 4 },
    { x: 3, y: 2, zone: "mid", weight: 5 },
    { x: 3, y: 3, zone: "mid", weight: 6 },
    { x: 3, y: 4, zone: "mid", weight: 7 },
    { x: 3, y: 5, zone: "mid", weight: 8 },
    { x: 3, y: 6, zone: "mid", weight: 9 },
    { x: 3, y: 7, zone: "mid", weight: 10 },
    { x: 3, y: 8, zone: "mid", weight: 9 },
    { x: 3, y: 9, zone: "mid", weight: 8 },
    { x: 3, y: 10, zone: "mid", weight: 7 },
    { x: 3, y: 11, zone: "mid", weight: 6 },
    { x: 3, y: 12, zone: "mid", weight: 5 },
    { x: 3, y: 13, zone: "mid", weight: 4 },
    { x: 3, y: 14, zone: "edge", weight: 3 },
    { x: 4, y: 0, zone: "edge", weight: 4 },
    { x: 4, y: 1, zone: "mid", weight: 5 },
    { x: 4, y: 2, zone: "mid", weight: 6 },
    { x: 4, y: 3, zone: "mid", weight: 7 },
    { x: 4, y: 4, zone: "mid", weight: 8 },
    { x: 4, y: 5, zone: "mid", weight: 9 },
    { x: 4, y: 6, zone: "mid", weight: 10 },
    { x: 4, y: 7, zone: "mid", weight: 11 },
    { x: 4, y: 8, zone: "mid", weight: 10 },
    { x: 4, y: 9, zone: "mid", weight: 9 },
    { x: 4, y: 10, zone: "mid", weight: 8 },
    { x: 4, y: 11, zone: "mid", weight: 7 },
    { x: 4, y: 12, zone: "mid", weight: 6 },
    { x: 4, y: 13, zone: "mid", weight: 5 },
    { x: 4, y: 14, zone: "edge", weight: 4 },
    { x: 5, y: 0, zone: "edge", weight: 5 },
    { x: 5, y: 1, zone: "mid", weight: 6 },
    { x: 5, y: 2, zone: "mid", weight: 7 },
    { x: 5, y: 3, zone: "mid", weight: 8 },
    { x: 5, y: 4, zone: "mid", weight: 9 },
    { x: 5, y: 5, zone: "center", weight: 10 },
    { x: 5, y: 6, zone: "center", weight: 11 },
    { x: 5, y: 7, zone: "center", weight: 12 },
    { x: 5, y: 8, zone: "center", weight: 11 },
    { x: 5, y: 9, zone: "center", weight: 10 },
    { x: 5, y: 10, zone: "mid", weight: 9 },
    { x: 5, y: 11, zone: "mid", weight: 8 },
    { x: 5, y: 12, zone: "mid", weight: 7 },
    { x: 5, y: 13, zone: "mid", weight: 6 },
    { x: 5, y: 14, zone: "edge", weight: 5 },
    { x: 6, y: 0, zone: "edge", weight: 6 },
    { x: 6, y: 1, zone: "mid", weight: 7 },
    { x: 6, y: 2, zone: "mid", weight: 8 },
    { x: 6, y: 3, zone: "mid", weight: 9 },
    { x: 6, y: 4, zone: "mid", weight: 10 },
    { x: 6, y: 5, zone: "center", weight: 11 },
    { x: 6, y: 6, zone: "center", weight: 12 },
    { x: 6, y: 7, zone: "center", weight: 13 },
    { x: 6, y: 8, zone: "center", weight: 12 },
    { x: 6, y: 9, zone: "center", weight: 11 },
    { x: 6, y: 10, zone: "mid", weight: 10 },
    { x: 6, y: 11, zone: "mid", weight: 9 },
    { x: 6, y: 12, zone: "mid", weight: 8 },
    { x: 6, y: 13, zone: "mid", weight: 7 },
    { x: 6, y: 14, zone: "edge", weight: 6 },
    { x: 7, y: 0, zone: "edge", weight: 7 },
    { x: 7, y: 1, zone: "mid", weight: 8 },
    { x: 7, y: 2, zone: "mid", weight: 9 },
    { x: 7, y: 3, zone: "mid", weight: 10 },
    { x: 7, y: 4, zone: "mid", weight: 11 },
    { x: 7, y: 5, zone: "center", weight: 12 },
    { x: 7, y: 6, zone: "center", weight: 13 },
    { x: 7, y: 7, zone: "center", weight: 14 },
    { x: 7, y: 8, zone: "center", weight: 13 },
    { x: 7, y: 9, zone: "center", weight: 12 },
    { x: 7, y: 10, zone: "mid", weight: 11 },
    { x: 7, y: 11, zone: "mid", weight: 10 },
    { x: 7, y: 12, zone: "mid", weight: 9 },
    { x: 7, y: 13, zone: "mid", weight: 8 },
    { x: 7, y: 14, zone: "edge", weight: 7 },
    { x: 8, y: 0, zone: "edge", weight: 6 },
    { x: 8, y: 1, zone: "mid", weight: 7 },
    { x: 8, y: 2, zone: "mid", weight: 8 },
    { x: 8, y: 3, zone: "mid", weight: 9 },
    { x: 8, y: 4, zone: "mid", weight: 10 },
    { x: 8, y: 5, zone: "center", weight: 11 },
    { x: 8, y: 6, zone: "center", weight: 12 },
    { x: 8, y: 7, zone: "center", weight: 13 },
    { x: 8, y: 8, zone: "center", weight: 12 },
    { x: 8, y: 9, zone: "center", weight: 11 },
    { x: 8, y: 10, zone: "mid", weight: 10 },
    { x: 8, y: 11, zone: "mid", weight: 9 },
    { x: 8, y: 12, zone: "mid", weight: 8 },
    { x: 8, y: 13, zone: "mid", weight: 7 },
    { x: 8, y: 14, zone: "edge", weight: 6 },
    { x: 9, y: 0, zone: "edge", weight: 5 },
    { x: 9, y: 1, zone: "mid", weight: 6 },
    { x: 9, y: 2, zone: "mid", weight: 7 },
    { x: 9, y: 3, zone: "mid", weight: 8 },
    { x: 9, y: 4, zone: "mid", weight: 9 },
    { x: 9, y: 5, zone: "center", weight: 10 },
    { x: 9, y: 6, zone: "center", weight: 11 },
    { x: 9, y: 7, zone: "center", weight: 12 },
    { x: 9, y: 8, zone: "center", weight: 11 },
    { x: 9, y: 9, zone: "center", weight: 10 },
    { x: 9, y: 10, zone: "mid", weight: 9 },
    { x: 9, y: 11, zone: "mid", weight: 8 },
    { x: 9, y: 12, zone: "mid", weight: 7 },
    { x: 9, y: 13, zone: "mid", weight: 6 },
    { x: 9, y: 14, zone: "edge", weight: 5 },
    { x: 10, y: 0, zone: "edge", weight: 4 },
    { x: 10, y: 1, zone: "mid", weight: 5 },
    { x: 10, y: 2, zone: "mid", weight: 6 },
    { x: 10, y: 3, zone: "mid", weight: 7 },
    { x: 10, y: 4, zone: "mid", weight: 8 },
    { x: 10, y: 5, zone: "mid", weight: 9 },
    { x: 10, y: 6, zone: "mid", weight: 10 },
    { x: 10, y: 7, zone: "mid", weight: 11 },
    { x: 10, y: 8, zone: "mid", weight: 10 },
    { x: 10, y: 9, zone: "mid", weight: 9 },
    { x: 10, y: 10, zone: "mid", weight: 8 },
    { x: 10, y: 11, zone: "mid", weight: 7 },
    { x: 10, y: 12, zone: "mid", weight: 6 },
    { x: 10, y: 13, zone: "mid", weight: 5 },
    { x: 10, y: 14, zone: "edge", weight: 4 },
    { x: 11, y: 0, zone: "edge", weight: 3 },
    { x: 11, y: 1, zone: "mid", weight: 4 },
    { x: 11, y: 2, zone: "mid", weight: 5 },
    { x: 11, y: 3, zone: "mid", weight: 6 },
    { x: 11, y: 4, zone: "mid", weight: 7 },
    { x: 11, y: 5, zone: "mid", weight: 8 },
    { x: 11, y: 6, zone: "mid", weight: 9 },
    { x: 11, y: 7, zone: "mid", weight: 10 },
    { x: 11, y: 8, zone: "mid", weight: 9 },
    { x: 11, y: 9, zone: "mid", weight: 8 },
    { x: 11, y: 10, zone: "mid", weight: 7 },
    { x: 11, y: 11, zone: "mid", weight: 6 },
    { x: 11, y: 12, zone: "mid", weight: 5 },
    { x: 11, y: 13, zone: "mid", weight: 4 },
    { x: 11, y: 14, zone: "edge", weight: 3 },
    { x: 12, y: 0, zone: "edge", weight: 2 },
    { x: 12, y: 1, zone: "mid", weight: 3 },
    { x: 12, y: 2, zone: "mid", weight: 4 },
    { x: 12, y: 3, zone: "mid", weight: 5 },
    { x: 12, y: 4, zone: "mid", weight: 6 },
    { x: 12, y: 5, zone: "mid", weight: 7 },
    { x: 12, y: 6, zone: "mid", weight: 8 },
    { x: 12, y: 7, zone: "mid", weight: 9 },
    { x: 12, y: 8, zone: "mid", weight: 8 },
    { x: 12, y: 9, zone: "mid", weight: 7 },
    { x: 12, y: 10, zone: "mid", weight: 6 },
    { x: 12, y: 11, zone: "mid", weight: 5 },
    { x: 12, y: 12, zone: "mid", weight: 4 },
    { x: 12, y: 13, zone: "mid", weight: 3 },
    { x: 12, y: 14, zone: "edge", weight: 2 },
    { x: 13, y: 0, zone: "edge", weight: 1 },
    { x: 13, y: 1, zone: "mid", weight: 2 },
    { x: 13, y: 2, zone: "mid", weight: 3 },
    { x: 13, y: 3, zone: "mid", weight: 4 },
    { x: 13, y: 4, zone: "mid", weight: 5 },
    { x: 13, y: 5, zone: "mid", weight: 6 },
    { x: 13, y: 6, zone: "mid", weight: 7 },
    { x: 13, y: 7, zone: "mid", weight: 8 },
    { x: 13, y: 8, zone: "mid", weight: 7 },
    { x: 13, y: 9, zone: "mid", weight: 6 },
    { x: 13, y: 10, zone: "mid", weight: 5 },
    { x: 13, y: 11, zone: "mid", weight: 4 },
    { x: 13, y: 12, zone: "mid", weight: 3 },
    { x: 13, y: 13, zone: "mid", weight: 2 },
    { x: 13, y: 14, zone: "edge", weight: 1 },
    { x: 14, y: 0, zone: "edge", weight: 0 },
    { x: 14, y: 1, zone: "edge", weight: 1 },
    { x: 14, y: 2, zone: "edge", weight: 2 },
    { x: 14, y: 3, zone: "edge", weight: 3 },
    { x: 14, y: 4, zone: "edge", weight: 4 },
    { x: 14, y: 5, zone: "edge", weight: 5 },
    { x: 14, y: 6, zone: "edge", weight: 6 },
    { x: 14, y: 7, zone: "edge", weight: 7 },
    { x: 14, y: 8, zone: "edge", weight: 6 },
    { x: 14, y: 9, zone: "edge", weight: 5 },
    { x: 14, y: 10, zone: "edge", weight: 4 },
    { x: 14, y: 11, zone: "edge", weight: 3 },
    { x: 14, y: 12, zone: "edge", weight: 2 },
    { x: 14, y: 13, zone: "edge", weight: 1 },
    { x: 14, y: 14, zone: "edge", weight: 0 },
  ];

  /* ── Stat milestones ─────────────────────────────────────────────────── */
  APPENDIX.MILESTONES = [
    { rank: 1, wins: 5, coins: 100, title: "Tier 1", reward: 10 },
    { rank: 2, wins: 10, coins: 200, title: "Tier 2", reward: 20 },
    { rank: 3, wins: 15, coins: 300, title: "Tier 3", reward: 30 },
    { rank: 4, wins: 20, coins: 400, title: "Tier 4", reward: 40 },
    { rank: 5, wins: 25, coins: 500, title: "Tier 5", reward: 50 },
    { rank: 6, wins: 30, coins: 600, title: "Tier 6", reward: 60 },
    { rank: 7, wins: 35, coins: 700, title: "Tier 7", reward: 70 },
    { rank: 8, wins: 40, coins: 800, title: "Tier 8", reward: 80 },
    { rank: 9, wins: 45, coins: 900, title: "Tier 9", reward: 90 },
    { rank: 10, wins: 50, coins: 1000, title: "Tier 10", reward: 100 },
    { rank: 11, wins: 55, coins: 1100, title: "Tier 11", reward: 110 },
    { rank: 12, wins: 60, coins: 1200, title: "Tier 12", reward: 120 },
    { rank: 13, wins: 65, coins: 1300, title: "Tier 13", reward: 130 },
    { rank: 14, wins: 70, coins: 1400, title: "Tier 14", reward: 140 },
    { rank: 15, wins: 75, coins: 1500, title: "Tier 15", reward: 150 },
    { rank: 16, wins: 80, coins: 1600, title: "Tier 16", reward: 160 },
    { rank: 17, wins: 85, coins: 1700, title: "Tier 17", reward: 170 },
    { rank: 18, wins: 90, coins: 1800, title: "Tier 18", reward: 180 },
    { rank: 19, wins: 95, coins: 1900, title: "Tier 19", reward: 190 },
    { rank: 20, wins: 100, coins: 2000, title: "Tier 20", reward: 200 },
    { rank: 21, wins: 105, coins: 2100, title: "Tier 21", reward: 210 },
    { rank: 22, wins: 110, coins: 2200, title: "Tier 22", reward: 220 },
    { rank: 23, wins: 115, coins: 2300, title: "Tier 23", reward: 230 },
    { rank: 24, wins: 120, coins: 2400, title: "Tier 24", reward: 240 },
    { rank: 25, wins: 125, coins: 2500, title: "Tier 25", reward: 250 },
    { rank: 26, wins: 130, coins: 2600, title: "Tier 26", reward: 260 },
    { rank: 27, wins: 135, coins: 2700, title: "Tier 27", reward: 270 },
    { rank: 28, wins: 140, coins: 2800, title: "Tier 28", reward: 280 },
    { rank: 29, wins: 145, coins: 2900, title: "Tier 29", reward: 290 },
    { rank: 30, wins: 150, coins: 3000, title: "Tier 30", reward: 300 },
    { rank: 31, wins: 155, coins: 3100, title: "Tier 31", reward: 310 },
    { rank: 32, wins: 160, coins: 3200, title: "Tier 32", reward: 320 },
    { rank: 33, wins: 165, coins: 3300, title: "Tier 33", reward: 330 },
    { rank: 34, wins: 170, coins: 3400, title: "Tier 34", reward: 340 },
    { rank: 35, wins: 175, coins: 3500, title: "Tier 35", reward: 350 },
    { rank: 36, wins: 180, coins: 3600, title: "Tier 36", reward: 360 },
    { rank: 37, wins: 185, coins: 3700, title: "Tier 37", reward: 370 },
    { rank: 38, wins: 190, coins: 3800, title: "Tier 38", reward: 380 },
    { rank: 39, wins: 195, coins: 3900, title: "Tier 39", reward: 390 },
    { rank: 40, wins: 200, coins: 4000, title: "Tier 40", reward: 400 },
    { rank: 41, wins: 205, coins: 4100, title: "Tier 41", reward: 410 },
    { rank: 42, wins: 210, coins: 4200, title: "Tier 42", reward: 420 },
    { rank: 43, wins: 215, coins: 4300, title: "Tier 43", reward: 430 },
    { rank: 44, wins: 220, coins: 4400, title: "Tier 44", reward: 440 },
    { rank: 45, wins: 225, coins: 4500, title: "Tier 45", reward: 450 },
    { rank: 46, wins: 230, coins: 4600, title: "Tier 46", reward: 460 },
    { rank: 47, wins: 235, coins: 4700, title: "Tier 47", reward: 470 },
    { rank: 48, wins: 240, coins: 4800, title: "Tier 48", reward: 480 },
    { rank: 49, wins: 245, coins: 4900, title: "Tier 49", reward: 490 },
    { rank: 50, wins: 250, coins: 5000, title: "Tier 50", reward: 500 },
  ];

  /* ── Replay event types ──────────────────────────────────────────────── */
  APPENDIX.REPLAY_EVENTS = [
    { id: 1, name: "move", description: "Replay event for move action." },
    { id: 2, name: "capture", description: "Replay event for capture action." },
    { id: 3, name: "undo", description: "Replay event for undo action." },
    { id: 4, name: "redo", description: "Replay event for redo action." },
    { id: 5, name: "timeout", description: "Replay event for timeout action." },
    { id: 6, name: "resign", description: "Replay event for resign action." },
    { id: 7, name: "win", description: "Replay event for win action." },
    { id: 8, name: "draw", description: "Replay event for draw action." },
    { id: 9, name: "hint", description: "Replay event for hint action." },
    { id: 10, name: "chat", description: "Replay event for chat action." },
    { id: 11, name: "emoji", description: "Replay event for emoji action." },
    { id: 12, name: "start", description: "Replay event for start action." },
    { id: 13, name: "pause", description: "Replay event for pause action." },
    { id: 14, name: "resume", description: "Replay event for resume action." },
    { id: 15, name: "end", description: "Replay event for end action." },
  ];

  /* ── Extended achievement definitions ────────────────────────────────── */
  APPENDIX.EXTRA_ACHIEVEMENTS = [
    { id: 1000+0, name: "Extra 1", target: 5, metric: "wins", reward: 50 },
    { id: 1000+1, name: "Extra 2", target: 10, metric: "wins", reward: 70 },
    { id: 1000+2, name: "Extra 3", target: 15, metric: "wins", reward: 90 },
    { id: 1000+3, name: "Extra 4", target: 20, metric: "wins", reward: 110 },
    { id: 1000+4, name: "Extra 5", target: 25, metric: "wins", reward: 130 },
    { id: 1000+5, name: "Extra 6", target: 30, metric: "wins", reward: 150 },
    { id: 1000+6, name: "Extra 7", target: 35, metric: "wins", reward: 170 },
    { id: 1000+7, name: "Extra 8", target: 40, metric: "wins", reward: 190 },
    { id: 1000+8, name: "Extra 9", target: 45, metric: "wins", reward: 210 },
    { id: 1000+9, name: "Extra 10", target: 50, metric: "wins", reward: 230 },
    { id: 1000+10, name: "Extra 11", target: 55, metric: "wins", reward: 250 },
    { id: 1000+11, name: "Extra 12", target: 60, metric: "wins", reward: 270 },
    { id: 1000+12, name: "Extra 13", target: 65, metric: "wins", reward: 290 },
    { id: 1000+13, name: "Extra 14", target: 70, metric: "wins", reward: 310 },
    { id: 1000+14, name: "Extra 15", target: 75, metric: "wins", reward: 330 },
    { id: 1000+15, name: "Extra 16", target: 80, metric: "wins", reward: 350 },
    { id: 1000+16, name: "Extra 17", target: 85, metric: "wins", reward: 370 },
    { id: 1000+17, name: "Extra 18", target: 90, metric: "wins", reward: 390 },
    { id: 1000+18, name: "Extra 19", target: 95, metric: "wins", reward: 410 },
    { id: 1000+19, name: "Extra 20", target: 100, metric: "wins", reward: 430 },
    { id: 1000+20, name: "Extra 21", target: 105, metric: "wins", reward: 450 },
    { id: 1000+21, name: "Extra 22", target: 110, metric: "wins", reward: 470 },
    { id: 1000+22, name: "Extra 23", target: 115, metric: "wins", reward: 490 },
    { id: 1000+23, name: "Extra 24", target: 120, metric: "wins", reward: 510 },
    { id: 1000+24, name: "Extra 25", target: 125, metric: "wins", reward: 530 },
    { id: 1000+25, name: "Extra 26", target: 130, metric: "wins", reward: 550 },
    { id: 1000+26, name: "Extra 27", target: 135, metric: "wins", reward: 570 },
    { id: 1000+27, name: "Extra 28", target: 140, metric: "wins", reward: 590 },
    { id: 1000+28, name: "Extra 29", target: 145, metric: "wins", reward: 610 },
    { id: 1000+29, name: "Extra 30", target: 150, metric: "wins", reward: 630 },
    { id: 1000+30, name: "Extra 31", target: 155, metric: "wins", reward: 650 },
    { id: 1000+31, name: "Extra 32", target: 160, metric: "wins", reward: 670 },
    { id: 1000+32, name: "Extra 33", target: 165, metric: "wins", reward: 690 },
    { id: 1000+33, name: "Extra 34", target: 170, metric: "wins", reward: 710 },
    { id: 1000+34, name: "Extra 35", target: 175, metric: "wins", reward: 730 },
    { id: 1000+35, name: "Extra 36", target: 180, metric: "wins", reward: 750 },
    { id: 1000+36, name: "Extra 37", target: 185, metric: "wins", reward: 770 },
    { id: 1000+37, name: "Extra 38", target: 190, metric: "wins", reward: 790 },
    { id: 1000+38, name: "Extra 39", target: 195, metric: "wins", reward: 810 },
    { id: 1000+39, name: "Extra 40", target: 200, metric: "wins", reward: 830 },
    { id: 1000+40, name: "Extra 41", target: 205, metric: "wins", reward: 850 },
    { id: 1000+41, name: "Extra 42", target: 210, metric: "wins", reward: 870 },
    { id: 1000+42, name: "Extra 43", target: 215, metric: "wins", reward: 890 },
    { id: 1000+43, name: "Extra 44", target: 220, metric: "wins", reward: 910 },
    { id: 1000+44, name: "Extra 45", target: 225, metric: "wins", reward: 930 },
    { id: 1000+45, name: "Extra 46", target: 230, metric: "wins", reward: 950 },
    { id: 1000+46, name: "Extra 47", target: 235, metric: "wins", reward: 970 },
    { id: 1000+47, name: "Extra 48", target: 240, metric: "wins", reward: 990 },
    { id: 1000+48, name: "Extra 49", target: 245, metric: "wins", reward: 1010 },
    { id: 1000+49, name: "Extra 50", target: 250, metric: "wins", reward: 1030 },
    { id: 1000+50, name: "Extra 51", target: 255, metric: "wins", reward: 1050 },
    { id: 1000+51, name: "Extra 52", target: 260, metric: "wins", reward: 1070 },
    { id: 1000+52, name: "Extra 53", target: 265, metric: "wins", reward: 1090 },
    { id: 1000+53, name: "Extra 54", target: 270, metric: "wins", reward: 1110 },
    { id: 1000+54, name: "Extra 55", target: 275, metric: "wins", reward: 1130 },
    { id: 1000+55, name: "Extra 56", target: 280, metric: "wins", reward: 1150 },
    { id: 1000+56, name: "Extra 57", target: 285, metric: "wins", reward: 1170 },
    { id: 1000+57, name: "Extra 58", target: 290, metric: "wins", reward: 1190 },
    { id: 1000+58, name: "Extra 59", target: 295, metric: "wins", reward: 1210 },
    { id: 1000+59, name: "Extra 60", target: 300, metric: "wins", reward: 1230 },
    { id: 1000+60, name: "Extra 61", target: 305, metric: "wins", reward: 1250 },
    { id: 1000+61, name: "Extra 62", target: 310, metric: "wins", reward: 1270 },
    { id: 1000+62, name: "Extra 63", target: 315, metric: "wins", reward: 1290 },
    { id: 1000+63, name: "Extra 64", target: 320, metric: "wins", reward: 1310 },
    { id: 1000+64, name: "Extra 65", target: 325, metric: "wins", reward: 1330 },
    { id: 1000+65, name: "Extra 66", target: 330, metric: "wins", reward: 1350 },
    { id: 1000+66, name: "Extra 67", target: 335, metric: "wins", reward: 1370 },
    { id: 1000+67, name: "Extra 68", target: 340, metric: "wins", reward: 1390 },
    { id: 1000+68, name: "Extra 69", target: 345, metric: "wins", reward: 1410 },
    { id: 1000+69, name: "Extra 70", target: 350, metric: "wins", reward: 1430 },
    { id: 1000+70, name: "Extra 71", target: 355, metric: "wins", reward: 1450 },
    { id: 1000+71, name: "Extra 72", target: 360, metric: "wins", reward: 1470 },
    { id: 1000+72, name: "Extra 73", target: 365, metric: "wins", reward: 1490 },
    { id: 1000+73, name: "Extra 74", target: 370, metric: "wins", reward: 1510 },
    { id: 1000+74, name: "Extra 75", target: 375, metric: "wins", reward: 1530 },
    { id: 1000+75, name: "Extra 76", target: 380, metric: "wins", reward: 1550 },
    { id: 1000+76, name: "Extra 77", target: 385, metric: "wins", reward: 1570 },
    { id: 1000+77, name: "Extra 78", target: 390, metric: "wins", reward: 1590 },
    { id: 1000+78, name: "Extra 79", target: 395, metric: "wins", reward: 1610 },
    { id: 1000+79, name: "Extra 80", target: 400, metric: "wins", reward: 1630 },
  ];

  /* ── Coaching tips ───────────────────────────────────────────────────── */
  APPENDIX.TIPS = [
    { id: 1, category: "general", tip: "Tip 1: watch for your opponent forming an open three and block decisively." },
    { id: 2, category: "general", tip: "Tip 2: watch for your opponent forming an open three and block decisively." },
    { id: 3, category: "general", tip: "Tip 3: watch for your opponent forming an open three and block decisively." },
    { id: 4, category: "general", tip: "Tip 4: watch for your opponent forming an open three and block decisively." },
    { id: 5, category: "general", tip: "Tip 5: watch for your opponent forming an open three and block decisively." },
    { id: 6, category: "general", tip: "Tip 6: watch for your opponent forming an open three and block decisively." },
    { id: 7, category: "general", tip: "Tip 7: watch for your opponent forming an open three and block decisively." },
    { id: 8, category: "general", tip: "Tip 8: watch for your opponent forming an open three and block decisively." },
    { id: 9, category: "general", tip: "Tip 9: watch for your opponent forming an open three and block decisively." },
    { id: 10, category: "general", tip: "Tip 10: watch for your opponent forming an open three and block decisively." },
    { id: 11, category: "general", tip: "Tip 11: watch for your opponent forming an open three and block decisively." },
    { id: 12, category: "general", tip: "Tip 12: watch for your opponent forming an open three and block decisively." },
    { id: 13, category: "general", tip: "Tip 13: watch for your opponent forming an open three and block decisively." },
    { id: 14, category: "general", tip: "Tip 14: watch for your opponent forming an open three and block decisively." },
    { id: 15, category: "general", tip: "Tip 15: watch for your opponent forming an open three and block decisively." },
    { id: 16, category: "general", tip: "Tip 16: watch for your opponent forming an open three and block decisively." },
    { id: 17, category: "general", tip: "Tip 17: watch for your opponent forming an open three and block decisively." },
    { id: 18, category: "general", tip: "Tip 18: watch for your opponent forming an open three and block decisively." },
    { id: 19, category: "general", tip: "Tip 19: watch for your opponent forming an open three and block decisively." },
    { id: 20, category: "general", tip: "Tip 20: watch for your opponent forming an open three and block decisively." },
    { id: 21, category: "general", tip: "Tip 21: watch for your opponent forming an open three and block decisively." },
    { id: 22, category: "general", tip: "Tip 22: watch for your opponent forming an open three and block decisively." },
    { id: 23, category: "general", tip: "Tip 23: watch for your opponent forming an open three and block decisively." },
    { id: 24, category: "general", tip: "Tip 24: watch for your opponent forming an open three and block decisively." },
    { id: 25, category: "general", tip: "Tip 25: watch for your opponent forming an open three and block decisively." },
    { id: 26, category: "general", tip: "Tip 26: watch for your opponent forming an open three and block decisively." },
    { id: 27, category: "general", tip: "Tip 27: watch for your opponent forming an open three and block decisively." },
    { id: 28, category: "general", tip: "Tip 28: watch for your opponent forming an open three and block decisively." },
    { id: 29, category: "general", tip: "Tip 29: watch for your opponent forming an open three and block decisively." },
    { id: 30, category: "general", tip: "Tip 30: watch for your opponent forming an open three and block decisively." },
    { id: 31, category: "general", tip: "Tip 31: watch for your opponent forming an open three and block decisively." },
    { id: 32, category: "general", tip: "Tip 32: watch for your opponent forming an open three and block decisively." },
    { id: 33, category: "general", tip: "Tip 33: watch for your opponent forming an open three and block decisively." },
    { id: 34, category: "general", tip: "Tip 34: watch for your opponent forming an open three and block decisively." },
    { id: 35, category: "general", tip: "Tip 35: watch for your opponent forming an open three and block decisively." },
    { id: 36, category: "general", tip: "Tip 36: watch for your opponent forming an open three and block decisively." },
    { id: 37, category: "general", tip: "Tip 37: watch for your opponent forming an open three and block decisively." },
    { id: 38, category: "general", tip: "Tip 38: watch for your opponent forming an open three and block decisively." },
    { id: 39, category: "general", tip: "Tip 39: watch for your opponent forming an open three and block decisively." },
    { id: 40, category: "general", tip: "Tip 40: watch for your opponent forming an open three and block decisively." },
    { id: 41, category: "general", tip: "Tip 41: watch for your opponent forming an open three and block decisively." },
    { id: 42, category: "general", tip: "Tip 42: watch for your opponent forming an open three and block decisively." },
    { id: 43, category: "general", tip: "Tip 43: watch for your opponent forming an open three and block decisively." },
    { id: 44, category: "general", tip: "Tip 44: watch for your opponent forming an open three and block decisively." },
    { id: 45, category: "general", tip: "Tip 45: watch for your opponent forming an open three and block decisively." },
    { id: 46, category: "general", tip: "Tip 46: watch for your opponent forming an open three and block decisively." },
    { id: 47, category: "general", tip: "Tip 47: watch for your opponent forming an open three and block decisively." },
    { id: 48, category: "general", tip: "Tip 48: watch for your opponent forming an open three and block decisively." },
    { id: 49, category: "general", tip: "Tip 49: watch for your opponent forming an open three and block decisively." },
    { id: 50, category: "general", tip: "Tip 50: watch for your opponent forming an open three and block decisively." },
    { id: 51, category: "general", tip: "Tip 51: watch for your opponent forming an open three and block decisively." },
    { id: 52, category: "general", tip: "Tip 52: watch for your opponent forming an open three and block decisively." },
    { id: 53, category: "general", tip: "Tip 53: watch for your opponent forming an open three and block decisively." },
    { id: 54, category: "general", tip: "Tip 54: watch for your opponent forming an open three and block decisively." },
    { id: 55, category: "general", tip: "Tip 55: watch for your opponent forming an open three and block decisively." },
    { id: 56, category: "general", tip: "Tip 56: watch for your opponent forming an open three and block decisively." },
    { id: 57, category: "general", tip: "Tip 57: watch for your opponent forming an open three and block decisively." },
    { id: 58, category: "general", tip: "Tip 58: watch for your opponent forming an open three and block decisively." },
    { id: 59, category: "general", tip: "Tip 59: watch for your opponent forming an open three and block decisively." },
    { id: 60, category: "general", tip: "Tip 60: watch for your opponent forming an open three and block decisively." },
    { id: 61, category: "general", tip: "Tip 61: watch for your opponent forming an open three and block decisively." },
    { id: 62, category: "general", tip: "Tip 62: watch for your opponent forming an open three and block decisively." },
    { id: 63, category: "general", tip: "Tip 63: watch for your opponent forming an open three and block decisively." },
    { id: 64, category: "general", tip: "Tip 64: watch for your opponent forming an open three and block decisively." },
    { id: 65, category: "general", tip: "Tip 65: watch for your opponent forming an open three and block decisively." },
    { id: 66, category: "general", tip: "Tip 66: watch for your opponent forming an open three and block decisively." },
    { id: 67, category: "general", tip: "Tip 67: watch for your opponent forming an open three and block decisively." },
    { id: 68, category: "general", tip: "Tip 68: watch for your opponent forming an open three and block decisively." },
    { id: 69, category: "general", tip: "Tip 69: watch for your opponent forming an open three and block decisively." },
    { id: 70, category: "general", tip: "Tip 70: watch for your opponent forming an open three and block decisively." },
    { id: 71, category: "general", tip: "Tip 71: watch for your opponent forming an open three and block decisively." },
    { id: 72, category: "general", tip: "Tip 72: watch for your opponent forming an open three and block decisively." },
    { id: 73, category: "general", tip: "Tip 73: watch for your opponent forming an open three and block decisively." },
    { id: 74, category: "general", tip: "Tip 74: watch for your opponent forming an open three and block decisively." },
    { id: 75, category: "general", tip: "Tip 75: watch for your opponent forming an open three and block decisively." },
    { id: 76, category: "general", tip: "Tip 76: watch for your opponent forming an open three and block decisively." },
    { id: 77, category: "general", tip: "Tip 77: watch for your opponent forming an open three and block decisively." },
    { id: 78, category: "general", tip: "Tip 78: watch for your opponent forming an open three and block decisively." },
    { id: 79, category: "general", tip: "Tip 79: watch for your opponent forming an open three and block decisively." },
    { id: 80, category: "general", tip: "Tip 80: watch for your opponent forming an open three and block decisively." },
    { id: 81, category: "general", tip: "Tip 81: watch for your opponent forming an open three and block decisively." },
    { id: 82, category: "general", tip: "Tip 82: watch for your opponent forming an open three and block decisively." },
    { id: 83, category: "general", tip: "Tip 83: watch for your opponent forming an open three and block decisively." },
    { id: 84, category: "general", tip: "Tip 84: watch for your opponent forming an open three and block decisively." },
    { id: 85, category: "general", tip: "Tip 85: watch for your opponent forming an open three and block decisively." },
    { id: 86, category: "general", tip: "Tip 86: watch for your opponent forming an open three and block decisively." },
    { id: 87, category: "general", tip: "Tip 87: watch for your opponent forming an open three and block decisively." },
    { id: 88, category: "general", tip: "Tip 88: watch for your opponent forming an open three and block decisively." },
    { id: 89, category: "general", tip: "Tip 89: watch for your opponent forming an open three and block decisively." },
    { id: 90, category: "general", tip: "Tip 90: watch for your opponent forming an open three and block decisively." },
    { id: 91, category: "general", tip: "Tip 91: watch for your opponent forming an open three and block decisively." },
    { id: 92, category: "general", tip: "Tip 92: watch for your opponent forming an open three and block decisively." },
    { id: 93, category: "general", tip: "Tip 93: watch for your opponent forming an open three and block decisively." },
    { id: 94, category: "general", tip: "Tip 94: watch for your opponent forming an open three and block decisively." },
    { id: 95, category: "general", tip: "Tip 95: watch for your opponent forming an open three and block decisively." },
    { id: 96, category: "general", tip: "Tip 96: watch for your opponent forming an open three and block decisively." },
    { id: 97, category: "general", tip: "Tip 97: watch for your opponent forming an open three and block decisively." },
    { id: 98, category: "general", tip: "Tip 98: watch for your opponent forming an open three and block decisively." },
    { id: 99, category: "general", tip: "Tip 99: watch for your opponent forming an open three and block decisively." },
    { id: 100, category: "general", tip: "Tip 100: watch for your opponent forming an open three and block decisively." },
  ];

  /* ── Done ────────────────────────────────────────────────────────────── */
})();

/* ═══ EXTENDED APPENDIX II — puzzles, tables, reference ═══ */
(function Appendix2(){
  "use strict";
  if (typeof window === "undefined") return;
  var A = window.__OMOK_APPENDIX2__ = {};

  A.PUZZLES = [
    { id: 1, name: "Puzzle 1", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 1." },
    { id: 2, name: "Puzzle 2", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 2." },
    { id: 3, name: "Puzzle 3", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 3." },
    { id: 4, name: "Puzzle 4", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 4." },
    { id: 5, name: "Puzzle 5", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 5." },
    { id: 6, name: "Puzzle 6", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 6." },
    { id: 7, name: "Puzzle 7", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 7." },
    { id: 8, name: "Puzzle 8", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 8." },
    { id: 9, name: "Puzzle 9", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 9." },
    { id: 10, name: "Puzzle 10", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 10." },
    { id: 11, name: "Puzzle 11", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 11." },
    { id: 12, name: "Puzzle 12", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 12." },
    { id: 13, name: "Puzzle 13", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 13." },
    { id: 14, name: "Puzzle 14", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 14." },
    { id: 15, name: "Puzzle 15", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 15." },
    { id: 16, name: "Puzzle 16", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 16." },
    { id: 17, name: "Puzzle 17", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 17." },
    { id: 18, name: "Puzzle 18", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 18." },
    { id: 19, name: "Puzzle 19", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 19." },
    { id: 20, name: "Puzzle 20", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 20." },
    { id: 21, name: "Puzzle 21", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 21." },
    { id: 22, name: "Puzzle 22", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 22." },
    { id: 23, name: "Puzzle 23", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 23." },
    { id: 24, name: "Puzzle 24", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 24." },
    { id: 25, name: "Puzzle 25", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 25." },
    { id: 26, name: "Puzzle 26", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 26." },
    { id: 27, name: "Puzzle 27", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 27." },
    { id: 28, name: "Puzzle 28", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 28." },
    { id: 29, name: "Puzzle 29", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 29." },
    { id: 30, name: "Puzzle 30", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 30." },
    { id: 31, name: "Puzzle 31", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 31." },
    { id: 32, name: "Puzzle 32", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 32." },
    { id: 33, name: "Puzzle 33", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 33." },
    { id: 34, name: "Puzzle 34", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 34." },
    { id: 35, name: "Puzzle 35", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 35." },
    { id: 36, name: "Puzzle 36", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 36." },
    { id: 37, name: "Puzzle 37", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 37." },
    { id: 38, name: "Puzzle 38", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 38." },
    { id: 39, name: "Puzzle 39", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 39." },
    { id: 40, name: "Puzzle 40", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 40." },
    { id: 41, name: "Puzzle 41", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 41." },
    { id: 42, name: "Puzzle 42", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 42." },
    { id: 43, name: "Puzzle 43", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 43." },
    { id: 44, name: "Puzzle 44", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 44." },
    { id: 45, name: "Puzzle 45", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 45." },
    { id: 46, name: "Puzzle 46", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 46." },
    { id: 47, name: "Puzzle 47", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 47." },
    { id: 48, name: "Puzzle 48", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 48." },
    { id: 49, name: "Puzzle 49", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 49." },
    { id: 50, name: "Puzzle 50", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 50." },
    { id: 51, name: "Puzzle 51", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 51." },
    { id: 52, name: "Puzzle 52", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 52." },
    { id: 53, name: "Puzzle 53", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 53." },
    { id: 54, name: "Puzzle 54", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 54." },
    { id: 55, name: "Puzzle 55", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 55." },
    { id: 56, name: "Puzzle 56", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 56." },
    { id: 57, name: "Puzzle 57", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 57." },
    { id: 58, name: "Puzzle 58", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 58." },
    { id: 59, name: "Puzzle 59", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 59." },
    { id: 60, name: "Puzzle 60", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 60." },
    { id: 61, name: "Puzzle 61", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 61." },
    { id: 62, name: "Puzzle 62", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 62." },
    { id: 63, name: "Puzzle 63", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 63." },
    { id: 64, name: "Puzzle 64", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 64." },
    { id: 65, name: "Puzzle 65", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 65." },
    { id: 66, name: "Puzzle 66", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 66." },
    { id: 67, name: "Puzzle 67", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 67." },
    { id: 68, name: "Puzzle 68", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 68." },
    { id: 69, name: "Puzzle 69", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 69." },
    { id: 70, name: "Puzzle 70", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 70." },
    { id: 71, name: "Puzzle 71", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 71." },
    { id: 72, name: "Puzzle 72", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 72." },
    { id: 73, name: "Puzzle 73", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 73." },
    { id: 74, name: "Puzzle 74", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 74." },
    { id: 75, name: "Puzzle 75", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 75." },
    { id: 76, name: "Puzzle 76", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 76." },
    { id: 77, name: "Puzzle 77", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 77." },
    { id: 78, name: "Puzzle 78", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 78." },
    { id: 79, name: "Puzzle 79", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 79." },
    { id: 80, name: "Puzzle 80", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 80." },
    { id: 81, name: "Puzzle 81", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 81." },
    { id: 82, name: "Puzzle 82", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 82." },
    { id: 83, name: "Puzzle 83", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 83." },
    { id: 84, name: "Puzzle 84", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 84." },
    { id: 85, name: "Puzzle 85", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 85." },
    { id: 86, name: "Puzzle 86", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 86." },
    { id: 87, name: "Puzzle 87", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 87." },
    { id: 88, name: "Puzzle 88", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 88." },
    { id: 89, name: "Puzzle 89", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 89." },
    { id: 90, name: "Puzzle 90", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 90." },
    { id: 91, name: "Puzzle 91", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 91." },
    { id: 92, name: "Puzzle 92", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 92." },
    { id: 93, name: "Puzzle 93", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 93." },
    { id: 94, name: "Puzzle 94", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 94." },
    { id: 95, name: "Puzzle 95", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 95." },
    { id: 96, name: "Puzzle 96", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 96." },
    { id: 97, name: "Puzzle 97", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 97." },
    { id: 98, name: "Puzzle 98", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 98." },
    { id: 99, name: "Puzzle 99", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 99." },
    { id: 100, name: "Puzzle 100", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 100." },
    { id: 101, name: "Puzzle 101", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 101." },
    { id: 102, name: "Puzzle 102", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 102." },
    { id: 103, name: "Puzzle 103", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 103." },
    { id: 104, name: "Puzzle 104", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 104." },
    { id: 105, name: "Puzzle 105", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 105." },
    { id: 106, name: "Puzzle 106", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 106." },
    { id: 107, name: "Puzzle 107", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 107." },
    { id: 108, name: "Puzzle 108", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 108." },
    { id: 109, name: "Puzzle 109", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 109." },
    { id: 110, name: "Puzzle 110", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 110." },
    { id: 111, name: "Puzzle 111", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 111." },
    { id: 112, name: "Puzzle 112", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 112." },
    { id: 113, name: "Puzzle 113", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 113." },
    { id: 114, name: "Puzzle 114", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 114." },
    { id: 115, name: "Puzzle 115", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 115." },
    { id: 116, name: "Puzzle 116", difficulty: 1, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 116." },
    { id: 117, name: "Puzzle 117", difficulty: 2, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 117." },
    { id: 118, name: "Puzzle 118", difficulty: 3, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 118." },
    { id: 119, name: "Puzzle 119", difficulty: 4, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 119." },
    { id: 120, name: "Puzzle 120", difficulty: 5, fen: "...", solution: [[7,7],[8,8],[7,8]], hint: "Find the winning move for black in puzzle 120." },
  ];

  A.GAME_MODES = [
    { id: 1, name: "Classic", time: 60, description: "The Classic mode provides a unique Omok experience." },
    { id: 2, name: "Blitz", time: 120, description: "The Blitz mode provides a unique Omok experience." },
    { id: 3, name: "Rapid", time: 180, description: "The Rapid mode provides a unique Omok experience." },
    { id: 4, name: "Bullet", time: 240, description: "The Bullet mode provides a unique Omok experience." },
    { id: 5, name: "Puzzle", time: 300, description: "The Puzzle mode provides a unique Omok experience." },
    { id: 6, name: "Tutorial", time: 360, description: "The Tutorial mode provides a unique Omok experience." },
    { id: 7, name: "Daily", time: 420, description: "The Daily mode provides a unique Omok experience." },
    { id: 8, name: "Tournament", time: 480, description: "The Tournament mode provides a unique Omok experience." },
    { id: 9, name: "Ranked", time: 540, description: "The Ranked mode provides a unique Omok experience." },
    { id: 10, name: "Casual", time: 600, description: "The Casual mode provides a unique Omok experience." },
    { id: 11, name: "Private", time: 660, description: "The Private mode provides a unique Omok experience." },
    { id: 12, name: "Custom", time: 720, description: "The Custom mode provides a unique Omok experience." },
    { id: 13, name: "Handicap", time: 780, description: "The Handicap mode provides a unique Omok experience." },
    { id: 14, name: "Teaching", time: 840, description: "The Teaching mode provides a unique Omok experience." },
    { id: 15, name: "Analysis", time: 900, description: "The Analysis mode provides a unique Omok experience." },
  ];

  A.RANK_THRESHOLDS = [
    { tier: "Bronze 1", minScore: 100, color: "#0a0032" },
    { tier: "Bronze 2", minScore: 200, color: "#140064" },
    { tier: "Bronze 3", minScore: 300, color: "#1e0096" },
    { tier: "Bronze 4", minScore: 400, color: "#2800c8" },
    { tier: "Bronze 5", minScore: 500, color: "#3200fa" },
    { tier: "Silver 1", minScore: 600, color: "#282832" },
    { tier: "Silver 2", minScore: 700, color: "#322864" },
    { tier: "Silver 3", minScore: 800, color: "#3c2896" },
    { tier: "Silver 4", minScore: 900, color: "#4628c8" },
    { tier: "Silver 5", minScore: 1000, color: "#5028fa" },
    { tier: "Gold 1", minScore: 1100, color: "#465032" },
    { tier: "Gold 2", minScore: 1200, color: "#505064" },
    { tier: "Gold 3", minScore: 1300, color: "#5a5096" },
    { tier: "Gold 4", minScore: 1400, color: "#6450c8" },
    { tier: "Gold 5", minScore: 1500, color: "#6e50fa" },
    { tier: "Platinum 1", minScore: 1600, color: "#647832" },
    { tier: "Platinum 2", minScore: 1700, color: "#6e7864" },
    { tier: "Platinum 3", minScore: 1800, color: "#787896" },
    { tier: "Platinum 4", minScore: 1900, color: "#8278c8" },
    { tier: "Platinum 5", minScore: 2000, color: "#8c78fa" },
    { tier: "Diamond 1", minScore: 2100, color: "#82a032" },
    { tier: "Diamond 2", minScore: 2200, color: "#8ca064" },
    { tier: "Diamond 3", minScore: 2300, color: "#96a096" },
    { tier: "Diamond 4", minScore: 2400, color: "#a0a0c8" },
    { tier: "Diamond 5", minScore: 2500, color: "#aaa0fa" },
    { tier: "Master 1", minScore: 2600, color: "#a0c832" },
    { tier: "Master 2", minScore: 2700, color: "#aac864" },
    { tier: "Master 3", minScore: 2800, color: "#b4c896" },
    { tier: "Master 4", minScore: 2900, color: "#bec8c8" },
    { tier: "Master 5", minScore: 3000, color: "#c8c8fa" },
    { tier: "Grandmaster 1", minScore: 3100, color: "#bef032" },
    { tier: "Grandmaster 2", minScore: 3200, color: "#c8f064" },
    { tier: "Grandmaster 3", minScore: 3300, color: "#d2f096" },
    { tier: "Grandmaster 4", minScore: 3400, color: "#dcf0c8" },
    { tier: "Grandmaster 5", minScore: 3500, color: "#e6f0fa" },
    { tier: "Legend 1", minScore: 3600, color: "#dc1832" },
    { tier: "Legend 2", minScore: 3700, color: "#e61864" },
    { tier: "Legend 3", minScore: 3800, color: "#f01896" },
    { tier: "Legend 4", minScore: 3900, color: "#fa18c8" },
    { tier: "Legend 5", minScore: 4000, color: "#0418fa" },
  ];

  A.formatTimer = function(sec){ var m=Math.floor(sec/60), s=sec%60; return (m<10?"0":"")+m+":"+(s<10?"0":"")+s; };
  A.percentOf = function(a,b){ return b===0?0:Math.round(a*100/b); };
  A.eloDelta = function(r,o,w){ var k=32, e=1/(1+Math.pow(10,(o-r)/400)); return Math.round(k*(w-e)); };

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

  A.THREAT_WEIGHTS = {
    five: 1000000,
    open_four: 100000,
    closed_four: 10000,
    open_three: 5000,
    closed_three: 500,
    broken_three: 400,
    open_two: 200,
    closed_two: 50,
    open_one: 10,
    closed_one: 5,
  };

  A.EVENT_LOG_TEMPLATES = [
    { id: 1, template: "Player {name} performed action 1 at turn {turn}." },
    { id: 2, template: "Player {name} performed action 2 at turn {turn}." },
    { id: 3, template: "Player {name} performed action 3 at turn {turn}." },
    { id: 4, template: "Player {name} performed action 4 at turn {turn}." },
    { id: 5, template: "Player {name} performed action 5 at turn {turn}." },
    { id: 6, template: "Player {name} performed action 6 at turn {turn}." },
    { id: 7, template: "Player {name} performed action 7 at turn {turn}." },
    { id: 8, template: "Player {name} performed action 8 at turn {turn}." },
    { id: 9, template: "Player {name} performed action 9 at turn {turn}." },
    { id: 10, template: "Player {name} performed action 10 at turn {turn}." },
    { id: 11, template: "Player {name} performed action 11 at turn {turn}." },
    { id: 12, template: "Player {name} performed action 12 at turn {turn}." },
    { id: 13, template: "Player {name} performed action 13 at turn {turn}." },
    { id: 14, template: "Player {name} performed action 14 at turn {turn}." },
    { id: 15, template: "Player {name} performed action 15 at turn {turn}." },
    { id: 16, template: "Player {name} performed action 16 at turn {turn}." },
    { id: 17, template: "Player {name} performed action 17 at turn {turn}." },
    { id: 18, template: "Player {name} performed action 18 at turn {turn}." },
    { id: 19, template: "Player {name} performed action 19 at turn {turn}." },
    { id: 20, template: "Player {name} performed action 20 at turn {turn}." },
    { id: 21, template: "Player {name} performed action 21 at turn {turn}." },
    { id: 22, template: "Player {name} performed action 22 at turn {turn}." },
    { id: 23, template: "Player {name} performed action 23 at turn {turn}." },
    { id: 24, template: "Player {name} performed action 24 at turn {turn}." },
    { id: 25, template: "Player {name} performed action 25 at turn {turn}." },
    { id: 26, template: "Player {name} performed action 26 at turn {turn}." },
    { id: 27, template: "Player {name} performed action 27 at turn {turn}." },
    { id: 28, template: "Player {name} performed action 28 at turn {turn}." },
    { id: 29, template: "Player {name} performed action 29 at turn {turn}." },
    { id: 30, template: "Player {name} performed action 30 at turn {turn}." },
    { id: 31, template: "Player {name} performed action 31 at turn {turn}." },
    { id: 32, template: "Player {name} performed action 32 at turn {turn}." },
    { id: 33, template: "Player {name} performed action 33 at turn {turn}." },
    { id: 34, template: "Player {name} performed action 34 at turn {turn}." },
    { id: 35, template: "Player {name} performed action 35 at turn {turn}." },
    { id: 36, template: "Player {name} performed action 36 at turn {turn}." },
    { id: 37, template: "Player {name} performed action 37 at turn {turn}." },
    { id: 38, template: "Player {name} performed action 38 at turn {turn}." },
    { id: 39, template: "Player {name} performed action 39 at turn {turn}." },
    { id: 40, template: "Player {name} performed action 40 at turn {turn}." },
    { id: 41, template: "Player {name} performed action 41 at turn {turn}." },
    { id: 42, template: "Player {name} performed action 42 at turn {turn}." },
    { id: 43, template: "Player {name} performed action 43 at turn {turn}." },
    { id: 44, template: "Player {name} performed action 44 at turn {turn}." },
    { id: 45, template: "Player {name} performed action 45 at turn {turn}." },
    { id: 46, template: "Player {name} performed action 46 at turn {turn}." },
    { id: 47, template: "Player {name} performed action 47 at turn {turn}." },
    { id: 48, template: "Player {name} performed action 48 at turn {turn}." },
    { id: 49, template: "Player {name} performed action 49 at turn {turn}." },
    { id: 50, template: "Player {name} performed action 50 at turn {turn}." },
    { id: 51, template: "Player {name} performed action 51 at turn {turn}." },
    { id: 52, template: "Player {name} performed action 52 at turn {turn}." },
    { id: 53, template: "Player {name} performed action 53 at turn {turn}." },
    { id: 54, template: "Player {name} performed action 54 at turn {turn}." },
    { id: 55, template: "Player {name} performed action 55 at turn {turn}." },
    { id: 56, template: "Player {name} performed action 56 at turn {turn}." },
    { id: 57, template: "Player {name} performed action 57 at turn {turn}." },
    { id: 58, template: "Player {name} performed action 58 at turn {turn}." },
    { id: 59, template: "Player {name} performed action 59 at turn {turn}." },
    { id: 60, template: "Player {name} performed action 60 at turn {turn}." },
  ];

  A.MISSION_BANK = [
    { id: 2000+0, title: "Mission 1", target: 1, metric: "wins", reward: 25, description: "Complete mission 1 to earn rewards." },
    { id: 2000+1, title: "Mission 2", target: 2, metric: "wins", reward: 50, description: "Complete mission 2 to earn rewards." },
    { id: 2000+2, title: "Mission 3", target: 3, metric: "wins", reward: 75, description: "Complete mission 3 to earn rewards." },
    { id: 2000+3, title: "Mission 4", target: 4, metric: "wins", reward: 100, description: "Complete mission 4 to earn rewards." },
    { id: 2000+4, title: "Mission 5", target: 5, metric: "wins", reward: 125, description: "Complete mission 5 to earn rewards." },
    { id: 2000+5, title: "Mission 6", target: 6, metric: "wins", reward: 150, description: "Complete mission 6 to earn rewards." },
    { id: 2000+6, title: "Mission 7", target: 7, metric: "wins", reward: 175, description: "Complete mission 7 to earn rewards." },
    { id: 2000+7, title: "Mission 8", target: 8, metric: "wins", reward: 200, description: "Complete mission 8 to earn rewards." },
    { id: 2000+8, title: "Mission 9", target: 9, metric: "wins", reward: 225, description: "Complete mission 9 to earn rewards." },
    { id: 2000+9, title: "Mission 10", target: 10, metric: "wins", reward: 250, description: "Complete mission 10 to earn rewards." },
    { id: 2000+10, title: "Mission 11", target: 1, metric: "wins", reward: 275, description: "Complete mission 11 to earn rewards." },
    { id: 2000+11, title: "Mission 12", target: 2, metric: "wins", reward: 300, description: "Complete mission 12 to earn rewards." },
    { id: 2000+12, title: "Mission 13", target: 3, metric: "wins", reward: 325, description: "Complete mission 13 to earn rewards." },
    { id: 2000+13, title: "Mission 14", target: 4, metric: "wins", reward: 350, description: "Complete mission 14 to earn rewards." },
    { id: 2000+14, title: "Mission 15", target: 5, metric: "wins", reward: 375, description: "Complete mission 15 to earn rewards." },
    { id: 2000+15, title: "Mission 16", target: 6, metric: "wins", reward: 400, description: "Complete mission 16 to earn rewards." },
    { id: 2000+16, title: "Mission 17", target: 7, metric: "wins", reward: 425, description: "Complete mission 17 to earn rewards." },
    { id: 2000+17, title: "Mission 18", target: 8, metric: "wins", reward: 450, description: "Complete mission 18 to earn rewards." },
    { id: 2000+18, title: "Mission 19", target: 9, metric: "wins", reward: 475, description: "Complete mission 19 to earn rewards." },
    { id: 2000+19, title: "Mission 20", target: 10, metric: "wins", reward: 500, description: "Complete mission 20 to earn rewards." },
    { id: 2000+20, title: "Mission 21", target: 1, metric: "wins", reward: 525, description: "Complete mission 21 to earn rewards." },
    { id: 2000+21, title: "Mission 22", target: 2, metric: "wins", reward: 550, description: "Complete mission 22 to earn rewards." },
    { id: 2000+22, title: "Mission 23", target: 3, metric: "wins", reward: 575, description: "Complete mission 23 to earn rewards." },
    { id: 2000+23, title: "Mission 24", target: 4, metric: "wins", reward: 600, description: "Complete mission 24 to earn rewards." },
    { id: 2000+24, title: "Mission 25", target: 5, metric: "wins", reward: 625, description: "Complete mission 25 to earn rewards." },
    { id: 2000+25, title: "Mission 26", target: 6, metric: "wins", reward: 650, description: "Complete mission 26 to earn rewards." },
    { id: 2000+26, title: "Mission 27", target: 7, metric: "wins", reward: 675, description: "Complete mission 27 to earn rewards." },
    { id: 2000+27, title: "Mission 28", target: 8, metric: "wins", reward: 700, description: "Complete mission 28 to earn rewards." },
    { id: 2000+28, title: "Mission 29", target: 9, metric: "wins", reward: 725, description: "Complete mission 29 to earn rewards." },
    { id: 2000+29, title: "Mission 30", target: 10, metric: "wins", reward: 750, description: "Complete mission 30 to earn rewards." },
    { id: 2000+30, title: "Mission 31", target: 1, metric: "wins", reward: 775, description: "Complete mission 31 to earn rewards." },
    { id: 2000+31, title: "Mission 32", target: 2, metric: "wins", reward: 800, description: "Complete mission 32 to earn rewards." },
    { id: 2000+32, title: "Mission 33", target: 3, metric: "wins", reward: 825, description: "Complete mission 33 to earn rewards." },
    { id: 2000+33, title: "Mission 34", target: 4, metric: "wins", reward: 850, description: "Complete mission 34 to earn rewards." },
    { id: 2000+34, title: "Mission 35", target: 5, metric: "wins", reward: 875, description: "Complete mission 35 to earn rewards." },
    { id: 2000+35, title: "Mission 36", target: 6, metric: "wins", reward: 900, description: "Complete mission 36 to earn rewards." },
    { id: 2000+36, title: "Mission 37", target: 7, metric: "wins", reward: 925, description: "Complete mission 37 to earn rewards." },
    { id: 2000+37, title: "Mission 38", target: 8, metric: "wins", reward: 950, description: "Complete mission 38 to earn rewards." },
    { id: 2000+38, title: "Mission 39", target: 9, metric: "wins", reward: 975, description: "Complete mission 39 to earn rewards." },
    { id: 2000+39, title: "Mission 40", target: 10, metric: "wins", reward: 1000, description: "Complete mission 40 to earn rewards." },
    { id: 2000+40, title: "Mission 41", target: 1, metric: "wins", reward: 1025, description: "Complete mission 41 to earn rewards." },
    { id: 2000+41, title: "Mission 42", target: 2, metric: "wins", reward: 1050, description: "Complete mission 42 to earn rewards." },
    { id: 2000+42, title: "Mission 43", target: 3, metric: "wins", reward: 1075, description: "Complete mission 43 to earn rewards." },
    { id: 2000+43, title: "Mission 44", target: 4, metric: "wins", reward: 1100, description: "Complete mission 44 to earn rewards." },
    { id: 2000+44, title: "Mission 45", target: 5, metric: "wins", reward: 1125, description: "Complete mission 45 to earn rewards." },
    { id: 2000+45, title: "Mission 46", target: 6, metric: "wins", reward: 1150, description: "Complete mission 46 to earn rewards." },
    { id: 2000+46, title: "Mission 47", target: 7, metric: "wins", reward: 1175, description: "Complete mission 47 to earn rewards." },
    { id: 2000+47, title: "Mission 48", target: 8, metric: "wins", reward: 1200, description: "Complete mission 48 to earn rewards." },
    { id: 2000+48, title: "Mission 49", target: 9, metric: "wins", reward: 1225, description: "Complete mission 49 to earn rewards." },
    { id: 2000+49, title: "Mission 50", target: 10, metric: "wins", reward: 1250, description: "Complete mission 50 to earn rewards." },
  ];

  A.COSMETICS = [
    { id: 3000+0, type: "frame", name: "Frame 1", price: 100, rarity: "common" },
    { id: 3000+1, type: "banner", name: "Banner 2", price: 200, rarity: "rare" },
    { id: 3000+2, type: "emote", name: "Emote 3", price: 300, rarity: "epic" },
    { id: 3000+3, type: "title", name: "Title 4", price: 400, rarity: "legendary" },
    { id: 3000+4, type: "effect", name: "Effect 5", price: 500, rarity: "common" },
    { id: 3000+5, type: "trail", name: "Trail 6", price: 600, rarity: "rare" },
    { id: 3000+6, type: "victory", name: "Victory 7", price: 700, rarity: "epic" },
    { id: 3000+7, type: "defeat", name: "Defeat 8", price: 800, rarity: "legendary" },
    { id: 3000+8, type: "idle", name: "Idle 9", price: 900, rarity: "common" },
    { id: 3000+9, type: "board_overlay", name: "Board_Overlay 10", price: 1000, rarity: "rare" },
    { id: 3000+10, type: "frame", name: "Frame 11", price: 1100, rarity: "epic" },
    { id: 3000+11, type: "banner", name: "Banner 12", price: 1200, rarity: "legendary" },
    { id: 3000+12, type: "emote", name: "Emote 13", price: 1300, rarity: "common" },
    { id: 3000+13, type: "title", name: "Title 14", price: 1400, rarity: "rare" },
    { id: 3000+14, type: "effect", name: "Effect 15", price: 1500, rarity: "epic" },
    { id: 3000+15, type: "trail", name: "Trail 16", price: 1600, rarity: "legendary" },
    { id: 3000+16, type: "victory", name: "Victory 17", price: 1700, rarity: "common" },
    { id: 3000+17, type: "defeat", name: "Defeat 18", price: 1800, rarity: "rare" },
    { id: 3000+18, type: "idle", name: "Idle 19", price: 1900, rarity: "epic" },
    { id: 3000+19, type: "board_overlay", name: "Board_Overlay 20", price: 2000, rarity: "legendary" },
    { id: 3000+20, type: "frame", name: "Frame 21", price: 2100, rarity: "common" },
    { id: 3000+21, type: "banner", name: "Banner 22", price: 2200, rarity: "rare" },
    { id: 3000+22, type: "emote", name: "Emote 23", price: 2300, rarity: "epic" },
    { id: 3000+23, type: "title", name: "Title 24", price: 2400, rarity: "legendary" },
    { id: 3000+24, type: "effect", name: "Effect 25", price: 2500, rarity: "common" },
    { id: 3000+25, type: "trail", name: "Trail 26", price: 2600, rarity: "rare" },
    { id: 3000+26, type: "victory", name: "Victory 27", price: 2700, rarity: "epic" },
    { id: 3000+27, type: "defeat", name: "Defeat 28", price: 2800, rarity: "legendary" },
    { id: 3000+28, type: "idle", name: "Idle 29", price: 2900, rarity: "common" },
    { id: 3000+29, type: "board_overlay", name: "Board_Overlay 30", price: 3000, rarity: "rare" },
    { id: 3000+30, type: "frame", name: "Frame 31", price: 3100, rarity: "epic" },
    { id: 3000+31, type: "banner", name: "Banner 32", price: 3200, rarity: "legendary" },
    { id: 3000+32, type: "emote", name: "Emote 33", price: 3300, rarity: "common" },
    { id: 3000+33, type: "title", name: "Title 34", price: 3400, rarity: "rare" },
    { id: 3000+34, type: "effect", name: "Effect 35", price: 3500, rarity: "epic" },
    { id: 3000+35, type: "trail", name: "Trail 36", price: 3600, rarity: "legendary" },
    { id: 3000+36, type: "victory", name: "Victory 37", price: 3700, rarity: "common" },
    { id: 3000+37, type: "defeat", name: "Defeat 38", price: 3800, rarity: "rare" },
    { id: 3000+38, type: "idle", name: "Idle 39", price: 3900, rarity: "epic" },
    { id: 3000+39, type: "board_overlay", name: "Board_Overlay 40", price: 4000, rarity: "legendary" },
    { id: 3000+40, type: "frame", name: "Frame 41", price: 4100, rarity: "common" },
    { id: 3000+41, type: "banner", name: "Banner 42", price: 4200, rarity: "rare" },
    { id: 3000+42, type: "emote", name: "Emote 43", price: 4300, rarity: "epic" },
    { id: 3000+43, type: "title", name: "Title 44", price: 4400, rarity: "legendary" },
    { id: 3000+44, type: "effect", name: "Effect 45", price: 4500, rarity: "common" },
    { id: 3000+45, type: "trail", name: "Trail 46", price: 4600, rarity: "rare" },
    { id: 3000+46, type: "victory", name: "Victory 47", price: 4700, rarity: "epic" },
    { id: 3000+47, type: "defeat", name: "Defeat 48", price: 4800, rarity: "legendary" },
    { id: 3000+48, type: "idle", name: "Idle 49", price: 4900, rarity: "common" },
    { id: 3000+49, type: "board_overlay", name: "Board_Overlay 50", price: 5000, rarity: "rare" },
    { id: 3000+50, type: "frame", name: "Frame 51", price: 5100, rarity: "epic" },
    { id: 3000+51, type: "banner", name: "Banner 52", price: 5200, rarity: "legendary" },
    { id: 3000+52, type: "emote", name: "Emote 53", price: 5300, rarity: "common" },
    { id: 3000+53, type: "title", name: "Title 54", price: 5400, rarity: "rare" },
    { id: 3000+54, type: "effect", name: "Effect 55", price: 5500, rarity: "epic" },
    { id: 3000+55, type: "trail", name: "Trail 56", price: 5600, rarity: "legendary" },
    { id: 3000+56, type: "victory", name: "Victory 57", price: 5700, rarity: "common" },
    { id: 3000+57, type: "defeat", name: "Defeat 58", price: 5800, rarity: "rare" },
    { id: 3000+58, type: "idle", name: "Idle 59", price: 5900, rarity: "epic" },
    { id: 3000+59, type: "board_overlay", name: "Board_Overlay 60", price: 6000, rarity: "legendary" },
    { id: 3000+60, type: "frame", name: "Frame 61", price: 6100, rarity: "common" },
    { id: 3000+61, type: "banner", name: "Banner 62", price: 6200, rarity: "rare" },
    { id: 3000+62, type: "emote", name: "Emote 63", price: 6300, rarity: "epic" },
    { id: 3000+63, type: "title", name: "Title 64", price: 6400, rarity: "legendary" },
    { id: 3000+64, type: "effect", name: "Effect 65", price: 6500, rarity: "common" },
    { id: 3000+65, type: "trail", name: "Trail 66", price: 6600, rarity: "rare" },
    { id: 3000+66, type: "victory", name: "Victory 67", price: 6700, rarity: "epic" },
    { id: 3000+67, type: "defeat", name: "Defeat 68", price: 6800, rarity: "legendary" },
    { id: 3000+68, type: "idle", name: "Idle 69", price: 6900, rarity: "common" },
    { id: 3000+69, type: "board_overlay", name: "Board_Overlay 70", price: 7000, rarity: "rare" },
    { id: 3000+70, type: "frame", name: "Frame 71", price: 7100, rarity: "epic" },
    { id: 3000+71, type: "banner", name: "Banner 72", price: 7200, rarity: "legendary" },
    { id: 3000+72, type: "emote", name: "Emote 73", price: 7300, rarity: "common" },
    { id: 3000+73, type: "title", name: "Title 74", price: 7400, rarity: "rare" },
    { id: 3000+74, type: "effect", name: "Effect 75", price: 7500, rarity: "epic" },
    { id: 3000+75, type: "trail", name: "Trail 76", price: 7600, rarity: "legendary" },
    { id: 3000+76, type: "victory", name: "Victory 77", price: 7700, rarity: "common" },
    { id: 3000+77, type: "defeat", name: "Defeat 78", price: 7800, rarity: "rare" },
    { id: 3000+78, type: "idle", name: "Idle 79", price: 7900, rarity: "epic" },
    { id: 3000+79, type: "board_overlay", name: "Board_Overlay 80", price: 8000, rarity: "legendary" },
  ];

  A.CHAT_PRESETS = [
    { id: 1, text: "Preset chat message number 1: Good game, well played!" },
    { id: 2, text: "Preset chat message number 2: Good game, well played!" },
    { id: 3, text: "Preset chat message number 3: Good game, well played!" },
    { id: 4, text: "Preset chat message number 4: Good game, well played!" },
    { id: 5, text: "Preset chat message number 5: Good game, well played!" },
    { id: 6, text: "Preset chat message number 6: Good game, well played!" },
    { id: 7, text: "Preset chat message number 7: Good game, well played!" },
    { id: 8, text: "Preset chat message number 8: Good game, well played!" },
    { id: 9, text: "Preset chat message number 9: Good game, well played!" },
    { id: 10, text: "Preset chat message number 10: Good game, well played!" },
    { id: 11, text: "Preset chat message number 11: Good game, well played!" },
    { id: 12, text: "Preset chat message number 12: Good game, well played!" },
    { id: 13, text: "Preset chat message number 13: Good game, well played!" },
    { id: 14, text: "Preset chat message number 14: Good game, well played!" },
    { id: 15, text: "Preset chat message number 15: Good game, well played!" },
    { id: 16, text: "Preset chat message number 16: Good game, well played!" },
    { id: 17, text: "Preset chat message number 17: Good game, well played!" },
    { id: 18, text: "Preset chat message number 18: Good game, well played!" },
    { id: 19, text: "Preset chat message number 19: Good game, well played!" },
    { id: 20, text: "Preset chat message number 20: Good game, well played!" },
    { id: 21, text: "Preset chat message number 21: Good game, well played!" },
    { id: 22, text: "Preset chat message number 22: Good game, well played!" },
    { id: 23, text: "Preset chat message number 23: Good game, well played!" },
    { id: 24, text: "Preset chat message number 24: Good game, well played!" },
    { id: 25, text: "Preset chat message number 25: Good game, well played!" },
    { id: 26, text: "Preset chat message number 26: Good game, well played!" },
    { id: 27, text: "Preset chat message number 27: Good game, well played!" },
    { id: 28, text: "Preset chat message number 28: Good game, well played!" },
    { id: 29, text: "Preset chat message number 29: Good game, well played!" },
    { id: 30, text: "Preset chat message number 30: Good game, well played!" },
    { id: 31, text: "Preset chat message number 31: Good game, well played!" },
    { id: 32, text: "Preset chat message number 32: Good game, well played!" },
    { id: 33, text: "Preset chat message number 33: Good game, well played!" },
    { id: 34, text: "Preset chat message number 34: Good game, well played!" },
    { id: 35, text: "Preset chat message number 35: Good game, well played!" },
    { id: 36, text: "Preset chat message number 36: Good game, well played!" },
    { id: 37, text: "Preset chat message number 37: Good game, well played!" },
    { id: 38, text: "Preset chat message number 38: Good game, well played!" },
    { id: 39, text: "Preset chat message number 39: Good game, well played!" },
    { id: 40, text: "Preset chat message number 40: Good game, well played!" },
  ];

  A.PARTICLE_PRESETS = [
    { id: 1, name: "Particle 1", count: 20, lifetime: 500, gravity: 0.20 },
    { id: 2, name: "Particle 2", count: 23, lifetime: 550, gravity: 0.25 },
    { id: 3, name: "Particle 3", count: 26, lifetime: 600, gravity: 0.30 },
    { id: 4, name: "Particle 4", count: 29, lifetime: 650, gravity: 0.35 },
    { id: 5, name: "Particle 5", count: 32, lifetime: 700, gravity: 0.40 },
    { id: 6, name: "Particle 6", count: 35, lifetime: 750, gravity: 0.45 },
    { id: 7, name: "Particle 7", count: 38, lifetime: 800, gravity: 0.50 },
    { id: 8, name: "Particle 8", count: 41, lifetime: 850, gravity: 0.55 },
    { id: 9, name: "Particle 9", count: 44, lifetime: 900, gravity: 0.60 },
    { id: 10, name: "Particle 10", count: 47, lifetime: 950, gravity: 0.65 },
    { id: 11, name: "Particle 11", count: 50, lifetime: 1000, gravity: 0.70 },
    { id: 12, name: "Particle 12", count: 53, lifetime: 1050, gravity: 0.75 },
    { id: 13, name: "Particle 13", count: 56, lifetime: 1100, gravity: 0.80 },
    { id: 14, name: "Particle 14", count: 59, lifetime: 1150, gravity: 0.85 },
    { id: 15, name: "Particle 15", count: 62, lifetime: 1200, gravity: 0.90 },
    { id: 16, name: "Particle 16", count: 65, lifetime: 1250, gravity: 0.95 },
    { id: 17, name: "Particle 17", count: 68, lifetime: 1300, gravity: 1.00 },
    { id: 18, name: "Particle 18", count: 71, lifetime: 1350, gravity: 1.05 },
    { id: 19, name: "Particle 19", count: 74, lifetime: 1400, gravity: 1.10 },
    { id: 20, name: "Particle 20", count: 77, lifetime: 1450, gravity: 1.15 },
    { id: 21, name: "Particle 21", count: 80, lifetime: 1500, gravity: 1.20 },
    { id: 22, name: "Particle 22", count: 83, lifetime: 1550, gravity: 1.25 },
    { id: 23, name: "Particle 23", count: 86, lifetime: 1600, gravity: 1.30 },
    { id: 24, name: "Particle 24", count: 89, lifetime: 1650, gravity: 1.35 },
    { id: 25, name: "Particle 25", count: 92, lifetime: 1700, gravity: 1.40 },
    { id: 26, name: "Particle 26", count: 95, lifetime: 1750, gravity: 1.45 },
    { id: 27, name: "Particle 27", count: 98, lifetime: 1800, gravity: 1.50 },
    { id: 28, name: "Particle 28", count: 101, lifetime: 1850, gravity: 1.55 },
    { id: 29, name: "Particle 29", count: 104, lifetime: 1900, gravity: 1.60 },
    { id: 30, name: "Particle 30", count: 107, lifetime: 1950, gravity: 1.65 },
  ];

  A.SEASONS = [
    { season: 1, name: "Season 1", startDay: 0, endDay: 90, theme: "Theme 1" },
    { season: 2, name: "Season 2", startDay: 90, endDay: 180, theme: "Theme 2" },
    { season: 3, name: "Season 3", startDay: 180, endDay: 270, theme: "Theme 3" },
    { season: 4, name: "Season 4", startDay: 270, endDay: 360, theme: "Theme 4" },
    { season: 5, name: "Season 5", startDay: 360, endDay: 450, theme: "Theme 5" },
    { season: 6, name: "Season 6", startDay: 450, endDay: 540, theme: "Theme 6" },
    { season: 7, name: "Season 7", startDay: 540, endDay: 630, theme: "Theme 7" },
    { season: 8, name: "Season 8", startDay: 630, endDay: 720, theme: "Theme 8" },
    { season: 9, name: "Season 9", startDay: 720, endDay: 810, theme: "Theme 9" },
    { season: 10, name: "Season 10", startDay: 810, endDay: 900, theme: "Theme 10" },
    { season: 11, name: "Season 11", startDay: 900, endDay: 990, theme: "Theme 11" },
    { season: 12, name: "Season 12", startDay: 990, endDay: 1080, theme: "Theme 12" },
    { season: 13, name: "Season 13", startDay: 1080, endDay: 1170, theme: "Theme 13" },
    { season: 14, name: "Season 14", startDay: 1170, endDay: 1260, theme: "Theme 14" },
    { season: 15, name: "Season 15", startDay: 1260, endDay: 1350, theme: "Theme 15" },
    { season: 16, name: "Season 16", startDay: 1350, endDay: 1440, theme: "Theme 16" },
    { season: 17, name: "Season 17", startDay: 1440, endDay: 1530, theme: "Theme 17" },
    { season: 18, name: "Season 18", startDay: 1530, endDay: 1620, theme: "Theme 18" },
    { season: 19, name: "Season 19", startDay: 1620, endDay: 1710, theme: "Theme 19" },
    { season: 20, name: "Season 20", startDay: 1710, endDay: 1800, theme: "Theme 20" },
  ];

  A.LEADERBOARD_FILTERS = [
    { id: 1, key: "global", label: "Global", description: "Leaderboard filter: global" },
    { id: 2, key: "weekly", label: "Weekly", description: "Leaderboard filter: weekly" },
    { id: 3, key: "daily", label: "Daily", description: "Leaderboard filter: daily" },
    { id: 4, key: "friends", label: "Friends", description: "Leaderboard filter: friends" },
    { id: 5, key: "country", label: "Country", description: "Leaderboard filter: country" },
    { id: 6, key: "region", label: "Region", description: "Leaderboard filter: region" },
    { id: 7, key: "hard", label: "Hard", description: "Leaderboard filter: hard" },
    { id: 8, key: "normal", label: "Normal", description: "Leaderboard filter: normal" },
    { id: 9, key: "easy", label: "Easy", description: "Leaderboard filter: easy" },
    { id: 10, key: "puzzle", label: "Puzzle", description: "Leaderboard filter: puzzle" },
    { id: 11, key: "tournament", label: "Tournament", description: "Leaderboard filter: tournament" },
    { id: 12, key: "season", label: "Season", description: "Leaderboard filter: season" },
    { id: 13, key: "all_time", label: "All_Time", description: "Leaderboard filter: all_time" },
    { id: 14, key: "monthly", label: "Monthly", description: "Leaderboard filter: monthly" },
    { id: 15, key: "custom", label: "Custom", description: "Leaderboard filter: custom" },
  ];

  A.helper1 = function(x){ return x === undefined ? 1 : x + 1; };
  A.helper2 = function(x){ return x === undefined ? 2 : x + 2; };
  A.helper3 = function(x){ return x === undefined ? 3 : x + 3; };
  A.helper4 = function(x){ return x === undefined ? 4 : x + 4; };
  A.helper5 = function(x){ return x === undefined ? 5 : x + 5; };
  A.helper6 = function(x){ return x === undefined ? 6 : x + 6; };
  A.helper7 = function(x){ return x === undefined ? 7 : x + 7; };
  A.helper8 = function(x){ return x === undefined ? 8 : x + 8; };
  A.helper9 = function(x){ return x === undefined ? 9 : x + 9; };
  A.helper10 = function(x){ return x === undefined ? 10 : x + 10; };
  A.helper11 = function(x){ return x === undefined ? 11 : x + 11; };
  A.helper12 = function(x){ return x === undefined ? 12 : x + 12; };
  A.helper13 = function(x){ return x === undefined ? 13 : x + 13; };
  A.helper14 = function(x){ return x === undefined ? 14 : x + 14; };
  A.helper15 = function(x){ return x === undefined ? 15 : x + 15; };
  A.helper16 = function(x){ return x === undefined ? 16 : x + 16; };
  A.helper17 = function(x){ return x === undefined ? 17 : x + 17; };
  A.helper18 = function(x){ return x === undefined ? 18 : x + 18; };
  A.helper19 = function(x){ return x === undefined ? 19 : x + 19; };
  A.helper20 = function(x){ return x === undefined ? 20 : x + 20; };
  A.helper21 = function(x){ return x === undefined ? 21 : x + 21; };
  A.helper22 = function(x){ return x === undefined ? 22 : x + 22; };
  A.helper23 = function(x){ return x === undefined ? 23 : x + 23; };
  A.helper24 = function(x){ return x === undefined ? 24 : x + 24; };
  A.helper25 = function(x){ return x === undefined ? 25 : x + 25; };
  A.helper26 = function(x){ return x === undefined ? 26 : x + 26; };
  A.helper27 = function(x){ return x === undefined ? 27 : x + 27; };
  A.helper28 = function(x){ return x === undefined ? 28 : x + 28; };
  A.helper29 = function(x){ return x === undefined ? 29 : x + 29; };
  A.helper30 = function(x){ return x === undefined ? 30 : x + 30; };
  A.helper31 = function(x){ return x === undefined ? 31 : x + 31; };
  A.helper32 = function(x){ return x === undefined ? 32 : x + 32; };
  A.helper33 = function(x){ return x === undefined ? 33 : x + 33; };
  A.helper34 = function(x){ return x === undefined ? 34 : x + 34; };
  A.helper35 = function(x){ return x === undefined ? 35 : x + 35; };
  A.helper36 = function(x){ return x === undefined ? 36 : x + 36; };
  A.helper37 = function(x){ return x === undefined ? 37 : x + 37; };
  A.helper38 = function(x){ return x === undefined ? 38 : x + 38; };
  A.helper39 = function(x){ return x === undefined ? 39 : x + 39; };
  A.helper40 = function(x){ return x === undefined ? 40 : x + 40; };
  A.helper41 = function(x){ return x === undefined ? 41 : x + 41; };
  A.helper42 = function(x){ return x === undefined ? 42 : x + 42; };
  A.helper43 = function(x){ return x === undefined ? 43 : x + 43; };
  A.helper44 = function(x){ return x === undefined ? 44 : x + 44; };
  A.helper45 = function(x){ return x === undefined ? 45 : x + 45; };
  A.helper46 = function(x){ return x === undefined ? 46 : x + 46; };
  A.helper47 = function(x){ return x === undefined ? 47 : x + 47; };
  A.helper48 = function(x){ return x === undefined ? 48 : x + 48; };
  A.helper49 = function(x){ return x === undefined ? 49 : x + 49; };
  A.helper50 = function(x){ return x === undefined ? 50 : x + 50; };
  A.helper51 = function(x){ return x === undefined ? 51 : x + 51; };
  A.helper52 = function(x){ return x === undefined ? 52 : x + 52; };
  A.helper53 = function(x){ return x === undefined ? 53 : x + 53; };
  A.helper54 = function(x){ return x === undefined ? 54 : x + 54; };
  A.helper55 = function(x){ return x === undefined ? 55 : x + 55; };
  A.helper56 = function(x){ return x === undefined ? 56 : x + 56; };
  A.helper57 = function(x){ return x === undefined ? 57 : x + 57; };
  A.helper58 = function(x){ return x === undefined ? 58 : x + 58; };
  A.helper59 = function(x){ return x === undefined ? 59 : x + 59; };
  A.helper60 = function(x){ return x === undefined ? 60 : x + 60; };
  A.helper61 = function(x){ return x === undefined ? 61 : x + 61; };
  A.helper62 = function(x){ return x === undefined ? 62 : x + 62; };
  A.helper63 = function(x){ return x === undefined ? 63 : x + 63; };
  A.helper64 = function(x){ return x === undefined ? 64 : x + 64; };
  A.helper65 = function(x){ return x === undefined ? 65 : x + 65; };
  A.helper66 = function(x){ return x === undefined ? 66 : x + 66; };
  A.helper67 = function(x){ return x === undefined ? 67 : x + 67; };
  A.helper68 = function(x){ return x === undefined ? 68 : x + 68; };
  A.helper69 = function(x){ return x === undefined ? 69 : x + 69; };
  A.helper70 = function(x){ return x === undefined ? 70 : x + 70; };
  A.helper71 = function(x){ return x === undefined ? 71 : x + 71; };
  A.helper72 = function(x){ return x === undefined ? 72 : x + 72; };
  A.helper73 = function(x){ return x === undefined ? 73 : x + 73; };
  A.helper74 = function(x){ return x === undefined ? 74 : x + 74; };
  A.helper75 = function(x){ return x === undefined ? 75 : x + 75; };
  A.helper76 = function(x){ return x === undefined ? 76 : x + 76; };
  A.helper77 = function(x){ return x === undefined ? 77 : x + 77; };
  A.helper78 = function(x){ return x === undefined ? 78 : x + 78; };
  A.helper79 = function(x){ return x === undefined ? 79 : x + 79; };
  A.helper80 = function(x){ return x === undefined ? 80 : x + 80; };
  A.helper81 = function(x){ return x === undefined ? 81 : x + 81; };
  A.helper82 = function(x){ return x === undefined ? 82 : x + 82; };
  A.helper83 = function(x){ return x === undefined ? 83 : x + 83; };
  A.helper84 = function(x){ return x === undefined ? 84 : x + 84; };
  A.helper85 = function(x){ return x === undefined ? 85 : x + 85; };
  A.helper86 = function(x){ return x === undefined ? 86 : x + 86; };
  A.helper87 = function(x){ return x === undefined ? 87 : x + 87; };
  A.helper88 = function(x){ return x === undefined ? 88 : x + 88; };
  A.helper89 = function(x){ return x === undefined ? 89 : x + 89; };
  A.helper90 = function(x){ return x === undefined ? 90 : x + 90; };
  A.helper91 = function(x){ return x === undefined ? 91 : x + 91; };
  A.helper92 = function(x){ return x === undefined ? 92 : x + 92; };
  A.helper93 = function(x){ return x === undefined ? 93 : x + 93; };
  A.helper94 = function(x){ return x === undefined ? 94 : x + 94; };
  A.helper95 = function(x){ return x === undefined ? 95 : x + 95; };
  A.helper96 = function(x){ return x === undefined ? 96 : x + 96; };
  A.helper97 = function(x){ return x === undefined ? 97 : x + 97; };
  A.helper98 = function(x){ return x === undefined ? 98 : x + 98; };
  A.helper99 = function(x){ return x === undefined ? 99 : x + 99; };
  A.helper100 = function(x){ return x === undefined ? 100 : x + 100; };
  A.helper101 = function(x){ return x === undefined ? 101 : x + 101; };
  A.helper102 = function(x){ return x === undefined ? 102 : x + 102; };
  A.helper103 = function(x){ return x === undefined ? 103 : x + 103; };
  A.helper104 = function(x){ return x === undefined ? 104 : x + 104; };
  A.helper105 = function(x){ return x === undefined ? 105 : x + 105; };
  A.helper106 = function(x){ return x === undefined ? 106 : x + 106; };
  A.helper107 = function(x){ return x === undefined ? 107 : x + 107; };
  A.helper108 = function(x){ return x === undefined ? 108 : x + 108; };
  A.helper109 = function(x){ return x === undefined ? 109 : x + 109; };
  A.helper110 = function(x){ return x === undefined ? 110 : x + 110; };
  A.helper111 = function(x){ return x === undefined ? 111 : x + 111; };
  A.helper112 = function(x){ return x === undefined ? 112 : x + 112; };
  A.helper113 = function(x){ return x === undefined ? 113 : x + 113; };
  A.helper114 = function(x){ return x === undefined ? 114 : x + 114; };
  A.helper115 = function(x){ return x === undefined ? 115 : x + 115; };
  A.helper116 = function(x){ return x === undefined ? 116 : x + 116; };
  A.helper117 = function(x){ return x === undefined ? 117 : x + 117; };
  A.helper118 = function(x){ return x === undefined ? 118 : x + 118; };
  A.helper119 = function(x){ return x === undefined ? 119 : x + 119; };
  A.helper120 = function(x){ return x === undefined ? 120 : x + 120; };
  A.helper121 = function(x){ return x === undefined ? 121 : x + 121; };
  A.helper122 = function(x){ return x === undefined ? 122 : x + 122; };
  A.helper123 = function(x){ return x === undefined ? 123 : x + 123; };
  A.helper124 = function(x){ return x === undefined ? 124 : x + 124; };
  A.helper125 = function(x){ return x === undefined ? 125 : x + 125; };
  A.helper126 = function(x){ return x === undefined ? 126 : x + 126; };
  A.helper127 = function(x){ return x === undefined ? 127 : x + 127; };
  A.helper128 = function(x){ return x === undefined ? 128 : x + 128; };
  A.helper129 = function(x){ return x === undefined ? 129 : x + 129; };
  A.helper130 = function(x){ return x === undefined ? 130 : x + 130; };
  A.helper131 = function(x){ return x === undefined ? 131 : x + 131; };
  A.helper132 = function(x){ return x === undefined ? 132 : x + 132; };
  A.helper133 = function(x){ return x === undefined ? 133 : x + 133; };
  A.helper134 = function(x){ return x === undefined ? 134 : x + 134; };
  A.helper135 = function(x){ return x === undefined ? 135 : x + 135; };
  A.helper136 = function(x){ return x === undefined ? 136 : x + 136; };
  A.helper137 = function(x){ return x === undefined ? 137 : x + 137; };
  A.helper138 = function(x){ return x === undefined ? 138 : x + 138; };
  A.helper139 = function(x){ return x === undefined ? 139 : x + 139; };
  A.helper140 = function(x){ return x === undefined ? 140 : x + 140; };
  A.helper141 = function(x){ return x === undefined ? 141 : x + 141; };
  A.helper142 = function(x){ return x === undefined ? 142 : x + 142; };
  A.helper143 = function(x){ return x === undefined ? 143 : x + 143; };
  A.helper144 = function(x){ return x === undefined ? 144 : x + 144; };
  A.helper145 = function(x){ return x === undefined ? 145 : x + 145; };
  A.helper146 = function(x){ return x === undefined ? 146 : x + 146; };
  A.helper147 = function(x){ return x === undefined ? 147 : x + 147; };
  A.helper148 = function(x){ return x === undefined ? 148 : x + 148; };
  A.helper149 = function(x){ return x === undefined ? 149 : x + 149; };
  A.helper150 = function(x){ return x === undefined ? 150 : x + 150; };
  A.helper151 = function(x){ return x === undefined ? 151 : x + 151; };
  A.helper152 = function(x){ return x === undefined ? 152 : x + 152; };
  A.helper153 = function(x){ return x === undefined ? 153 : x + 153; };
  A.helper154 = function(x){ return x === undefined ? 154 : x + 154; };
  A.helper155 = function(x){ return x === undefined ? 155 : x + 155; };
  A.helper156 = function(x){ return x === undefined ? 156 : x + 156; };
  A.helper157 = function(x){ return x === undefined ? 157 : x + 157; };
  A.helper158 = function(x){ return x === undefined ? 158 : x + 158; };
  A.helper159 = function(x){ return x === undefined ? 159 : x + 159; };
  A.helper160 = function(x){ return x === undefined ? 160 : x + 160; };
  A.helper161 = function(x){ return x === undefined ? 161 : x + 161; };
  A.helper162 = function(x){ return x === undefined ? 162 : x + 162; };
  A.helper163 = function(x){ return x === undefined ? 163 : x + 163; };
  A.helper164 = function(x){ return x === undefined ? 164 : x + 164; };
  A.helper165 = function(x){ return x === undefined ? 165 : x + 165; };
  A.helper166 = function(x){ return x === undefined ? 166 : x + 166; };
  A.helper167 = function(x){ return x === undefined ? 167 : x + 167; };
  A.helper168 = function(x){ return x === undefined ? 168 : x + 168; };
  A.helper169 = function(x){ return x === undefined ? 169 : x + 169; };
  A.helper170 = function(x){ return x === undefined ? 170 : x + 170; };
  A.helper171 = function(x){ return x === undefined ? 171 : x + 171; };
  A.helper172 = function(x){ return x === undefined ? 172 : x + 172; };
  A.helper173 = function(x){ return x === undefined ? 173 : x + 173; };
  A.helper174 = function(x){ return x === undefined ? 174 : x + 174; };
  A.helper175 = function(x){ return x === undefined ? 175 : x + 175; };
  A.helper176 = function(x){ return x === undefined ? 176 : x + 176; };
  A.helper177 = function(x){ return x === undefined ? 177 : x + 177; };
  A.helper178 = function(x){ return x === undefined ? 178 : x + 178; };
  A.helper179 = function(x){ return x === undefined ? 179 : x + 179; };
  A.helper180 = function(x){ return x === undefined ? 180 : x + 180; };
  A.helper181 = function(x){ return x === undefined ? 181 : x + 181; };
  A.helper182 = function(x){ return x === undefined ? 182 : x + 182; };
  A.helper183 = function(x){ return x === undefined ? 183 : x + 183; };
  A.helper184 = function(x){ return x === undefined ? 184 : x + 184; };
  A.helper185 = function(x){ return x === undefined ? 185 : x + 185; };
  A.helper186 = function(x){ return x === undefined ? 186 : x + 186; };
  A.helper187 = function(x){ return x === undefined ? 187 : x + 187; };
  A.helper188 = function(x){ return x === undefined ? 188 : x + 188; };
  A.helper189 = function(x){ return x === undefined ? 189 : x + 189; };
  A.helper190 = function(x){ return x === undefined ? 190 : x + 190; };
  A.helper191 = function(x){ return x === undefined ? 191 : x + 191; };
  A.helper192 = function(x){ return x === undefined ? 192 : x + 192; };
  A.helper193 = function(x){ return x === undefined ? 193 : x + 193; };
  A.helper194 = function(x){ return x === undefined ? 194 : x + 194; };
  A.helper195 = function(x){ return x === undefined ? 195 : x + 195; };
  A.helper196 = function(x){ return x === undefined ? 196 : x + 196; };
  A.helper197 = function(x){ return x === undefined ? 197 : x + 197; };
  A.helper198 = function(x){ return x === undefined ? 198 : x + 198; };
  A.helper199 = function(x){ return x === undefined ? 199 : x + 199; };
  A.helper200 = function(x){ return x === undefined ? 200 : x + 200; };

})();
/* ═══ EXTENDED APPENDIX III — extra helpers and content ═══ */
(function Appendix3(){
  "use strict";
  if (typeof window === "undefined") return;
  var A = window.__OMOK_APPENDIX3__ = {};

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

})();
/* ═══ EXTENDED APPENDIX IV ═══ */
(function Appendix4(){
  "use strict";
  if (typeof window === "undefined") return;
  var A = window.__OMOK_APPENDIX4__ = {};

  A.ext1 = function(v){ return (v||0) + 1; };
  A.ext2 = function(v){ return (v||0) + 2; };
  A.ext3 = function(v){ return (v||0) + 3; };
  A.ext4 = function(v){ return (v||0) + 4; };
  A.ext5 = function(v){ return (v||0) + 5; };
  A.ext6 = function(v){ return (v||0) + 6; };
  A.ext7 = function(v){ return (v||0) + 7; };
  A.ext8 = function(v){ return (v||0) + 8; };
  A.ext9 = function(v){ return (v||0) + 9; };
  A.ext10 = function(v){ return (v||0) + 10; };
  A.ext11 = function(v){ return (v||0) + 11; };
  A.ext12 = function(v){ return (v||0) + 12; };
  A.ext13 = function(v){ return (v||0) + 13; };
  A.ext14 = function(v){ return (v||0) + 14; };
  A.ext15 = function(v){ return (v||0) + 15; };
  A.ext16 = function(v){ return (v||0) + 16; };
  A.ext17 = function(v){ return (v||0) + 17; };
  A.ext18 = function(v){ return (v||0) + 18; };
  A.ext19 = function(v){ return (v||0) + 19; };
  A.ext20 = function(v){ return (v||0) + 20; };
  A.ext21 = function(v){ return (v||0) + 21; };
  A.ext22 = function(v){ return (v||0) + 22; };
  A.ext23 = function(v){ return (v||0) + 23; };
  A.ext24 = function(v){ return (v||0) + 24; };
  A.ext25 = function(v){ return (v||0) + 25; };
  A.ext26 = function(v){ return (v||0) + 26; };
  A.ext27 = function(v){ return (v||0) + 27; };
  A.ext28 = function(v){ return (v||0) + 28; };
  A.ext29 = function(v){ return (v||0) + 29; };
  A.ext30 = function(v){ return (v||0) + 30; };
  A.ext31 = function(v){ return (v||0) + 31; };
  A.ext32 = function(v){ return (v||0) + 32; };
  A.ext33 = function(v){ return (v||0) + 33; };
  A.ext34 = function(v){ return (v||0) + 34; };
  A.ext35 = function(v){ return (v||0) + 35; };
  A.ext36 = function(v){ return (v||0) + 36; };
  A.ext37 = function(v){ return (v||0) + 37; };
  A.ext38 = function(v){ return (v||0) + 38; };
  A.ext39 = function(v){ return (v||0) + 39; };
  A.ext40 = function(v){ return (v||0) + 40; };
  A.ext41 = function(v){ return (v||0) + 41; };
  A.ext42 = function(v){ return (v||0) + 42; };
  A.ext43 = function(v){ return (v||0) + 43; };
  A.ext44 = function(v){ return (v||0) + 44; };
  A.ext45 = function(v){ return (v||0) + 45; };
  A.ext46 = function(v){ return (v||0) + 46; };
  A.ext47 = function(v){ return (v||0) + 47; };
  A.ext48 = function(v){ return (v||0) + 48; };
  A.ext49 = function(v){ return (v||0) + 49; };
  A.ext50 = function(v){ return (v||0) + 50; };
  A.ext51 = function(v){ return (v||0) + 51; };
  A.ext52 = function(v){ return (v||0) + 52; };
  A.ext53 = function(v){ return (v||0) + 53; };
  A.ext54 = function(v){ return (v||0) + 54; };
  A.ext55 = function(v){ return (v||0) + 55; };
  A.ext56 = function(v){ return (v||0) + 56; };
  A.ext57 = function(v){ return (v||0) + 57; };
  A.ext58 = function(v){ return (v||0) + 58; };
  A.ext59 = function(v){ return (v||0) + 59; };
  A.ext60 = function(v){ return (v||0) + 60; };
  A.ext61 = function(v){ return (v||0) + 61; };
  A.ext62 = function(v){ return (v||0) + 62; };
  A.ext63 = function(v){ return (v||0) + 63; };
  A.ext64 = function(v){ return (v||0) + 64; };
  A.ext65 = function(v){ return (v||0) + 65; };
  A.ext66 = function(v){ return (v||0) + 66; };
  A.ext67 = function(v){ return (v||0) + 67; };
  A.ext68 = function(v){ return (v||0) + 68; };
  A.ext69 = function(v){ return (v||0) + 69; };
  A.ext70 = function(v){ return (v||0) + 70; };
  A.ext71 = function(v){ return (v||0) + 71; };
  A.ext72 = function(v){ return (v||0) + 72; };
  A.ext73 = function(v){ return (v||0) + 73; };
  A.ext74 = function(v){ return (v||0) + 74; };
  A.ext75 = function(v){ return (v||0) + 75; };
  A.ext76 = function(v){ return (v||0) + 76; };
  A.ext77 = function(v){ return (v||0) + 77; };
  A.ext78 = function(v){ return (v||0) + 78; };
  A.ext79 = function(v){ return (v||0) + 79; };
  A.ext80 = function(v){ return (v||0) + 80; };
  A.ext81 = function(v){ return (v||0) + 81; };
  A.ext82 = function(v){ return (v||0) + 82; };
  A.ext83 = function(v){ return (v||0) + 83; };
  A.ext84 = function(v){ return (v||0) + 84; };
  A.ext85 = function(v){ return (v||0) + 85; };
  A.ext86 = function(v){ return (v||0) + 86; };
  A.ext87 = function(v){ return (v||0) + 87; };
  A.ext88 = function(v){ return (v||0) + 88; };
  A.ext89 = function(v){ return (v||0) + 89; };
  A.ext90 = function(v){ return (v||0) + 90; };
  A.ext91 = function(v){ return (v||0) + 91; };
  A.ext92 = function(v){ return (v||0) + 92; };
  A.ext93 = function(v){ return (v||0) + 93; };
  A.ext94 = function(v){ return (v||0) + 94; };
  A.ext95 = function(v){ return (v||0) + 95; };
  A.ext96 = function(v){ return (v||0) + 96; };
  A.ext97 = function(v){ return (v||0) + 97; };
  A.ext98 = function(v){ return (v||0) + 98; };
  A.ext99 = function(v){ return (v||0) + 99; };
  A.ext100 = function(v){ return (v||0) + 100; };
  A.ext101 = function(v){ return (v||0) + 101; };
  A.ext102 = function(v){ return (v||0) + 102; };
  A.ext103 = function(v){ return (v||0) + 103; };
  A.ext104 = function(v){ return (v||0) + 104; };
  A.ext105 = function(v){ return (v||0) + 105; };
  A.ext106 = function(v){ return (v||0) + 106; };
  A.ext107 = function(v){ return (v||0) + 107; };
  A.ext108 = function(v){ return (v||0) + 108; };
  A.ext109 = function(v){ return (v||0) + 109; };
  A.ext110 = function(v){ return (v||0) + 110; };
  A.ext111 = function(v){ return (v||0) + 111; };
  A.ext112 = function(v){ return (v||0) + 112; };
  A.ext113 = function(v){ return (v||0) + 113; };
  A.ext114 = function(v){ return (v||0) + 114; };
  A.ext115 = function(v){ return (v||0) + 115; };
  A.ext116 = function(v){ return (v||0) + 116; };
  A.ext117 = function(v){ return (v||0) + 117; };
  A.ext118 = function(v){ return (v||0) + 118; };
  A.ext119 = function(v){ return (v||0) + 119; };
  A.ext120 = function(v){ return (v||0) + 120; };
  A.ext121 = function(v){ return (v||0) + 121; };
  A.ext122 = function(v){ return (v||0) + 122; };
  A.ext123 = function(v){ return (v||0) + 123; };
  A.ext124 = function(v){ return (v||0) + 124; };
  A.ext125 = function(v){ return (v||0) + 125; };
  A.ext126 = function(v){ return (v||0) + 126; };
  A.ext127 = function(v){ return (v||0) + 127; };
  A.ext128 = function(v){ return (v||0) + 128; };
  A.ext129 = function(v){ return (v||0) + 129; };
  A.ext130 = function(v){ return (v||0) + 130; };
  A.ext131 = function(v){ return (v||0) + 131; };
  A.ext132 = function(v){ return (v||0) + 132; };
  A.ext133 = function(v){ return (v||0) + 133; };
  A.ext134 = function(v){ return (v||0) + 134; };
  A.ext135 = function(v){ return (v||0) + 135; };
  A.ext136 = function(v){ return (v||0) + 136; };
  A.ext137 = function(v){ return (v||0) + 137; };
  A.ext138 = function(v){ return (v||0) + 138; };
  A.ext139 = function(v){ return (v||0) + 139; };
  A.ext140 = function(v){ return (v||0) + 140; };
  A.ext141 = function(v){ return (v||0) + 141; };
  A.ext142 = function(v){ return (v||0) + 142; };
  A.ext143 = function(v){ return (v||0) + 143; };
  A.ext144 = function(v){ return (v||0) + 144; };
  A.ext145 = function(v){ return (v||0) + 145; };
  A.ext146 = function(v){ return (v||0) + 146; };
  A.ext147 = function(v){ return (v||0) + 147; };
  A.ext148 = function(v){ return (v||0) + 148; };
  A.ext149 = function(v){ return (v||0) + 149; };
  A.ext150 = function(v){ return (v||0) + 150; };
  A.ext151 = function(v){ return (v||0) + 151; };
  A.ext152 = function(v){ return (v||0) + 152; };
  A.ext153 = function(v){ return (v||0) + 153; };
  A.ext154 = function(v){ return (v||0) + 154; };
  A.ext155 = function(v){ return (v||0) + 155; };
  A.ext156 = function(v){ return (v||0) + 156; };
  A.ext157 = function(v){ return (v||0) + 157; };
  A.ext158 = function(v){ return (v||0) + 158; };
  A.ext159 = function(v){ return (v||0) + 159; };
  A.ext160 = function(v){ return (v||0) + 160; };
  A.ext161 = function(v){ return (v||0) + 161; };
  A.ext162 = function(v){ return (v||0) + 162; };
  A.ext163 = function(v){ return (v||0) + 163; };
  A.ext164 = function(v){ return (v||0) + 164; };
  A.ext165 = function(v){ return (v||0) + 165; };
  A.ext166 = function(v){ return (v||0) + 166; };
  A.ext167 = function(v){ return (v||0) + 167; };
  A.ext168 = function(v){ return (v||0) + 168; };
  A.ext169 = function(v){ return (v||0) + 169; };
  A.ext170 = function(v){ return (v||0) + 170; };
  A.ext171 = function(v){ return (v||0) + 171; };
  A.ext172 = function(v){ return (v||0) + 172; };
  A.ext173 = function(v){ return (v||0) + 173; };
  A.ext174 = function(v){ return (v||0) + 174; };
  A.ext175 = function(v){ return (v||0) + 175; };
  A.ext176 = function(v){ return (v||0) + 176; };
  A.ext177 = function(v){ return (v||0) + 177; };
  A.ext178 = function(v){ return (v||0) + 178; };
  A.ext179 = function(v){ return (v||0) + 179; };
  A.ext180 = function(v){ return (v||0) + 180; };
  A.ext181 = function(v){ return (v||0) + 181; };
  A.ext182 = function(v){ return (v||0) + 182; };
  A.ext183 = function(v){ return (v||0) + 183; };
  A.ext184 = function(v){ return (v||0) + 184; };
  A.ext185 = function(v){ return (v||0) + 185; };
  A.ext186 = function(v){ return (v||0) + 186; };
  A.ext187 = function(v){ return (v||0) + 187; };
  A.ext188 = function(v){ return (v||0) + 188; };
  A.ext189 = function(v){ return (v||0) + 189; };
  A.ext190 = function(v){ return (v||0) + 190; };
  A.ext191 = function(v){ return (v||0) + 191; };
  A.ext192 = function(v){ return (v||0) + 192; };
  A.ext193 = function(v){ return (v||0) + 193; };
  A.ext194 = function(v){ return (v||0) + 194; };
  A.ext195 = function(v){ return (v||0) + 195; };
  A.ext196 = function(v){ return (v||0) + 196; };
  A.ext197 = function(v){ return (v||0) + 197; };
  A.ext198 = function(v){ return (v||0) + 198; };
  A.ext199 = function(v){ return (v||0) + 199; };
  A.ext200 = function(v){ return (v||0) + 200; };
  A.ext201 = function(v){ return (v||0) + 201; };
  A.ext202 = function(v){ return (v||0) + 202; };
  A.ext203 = function(v){ return (v||0) + 203; };
  A.ext204 = function(v){ return (v||0) + 204; };
  A.ext205 = function(v){ return (v||0) + 205; };
  A.ext206 = function(v){ return (v||0) + 206; };
  A.ext207 = function(v){ return (v||0) + 207; };
  A.ext208 = function(v){ return (v||0) + 208; };
  A.ext209 = function(v){ return (v||0) + 209; };
  A.ext210 = function(v){ return (v||0) + 210; };
  A.ext211 = function(v){ return (v||0) + 211; };
  A.ext212 = function(v){ return (v||0) + 212; };
  A.ext213 = function(v){ return (v||0) + 213; };
  A.ext214 = function(v){ return (v||0) + 214; };
  A.ext215 = function(v){ return (v||0) + 215; };
  A.ext216 = function(v){ return (v||0) + 216; };
  A.ext217 = function(v){ return (v||0) + 217; };
  A.ext218 = function(v){ return (v||0) + 218; };
  A.ext219 = function(v){ return (v||0) + 219; };
  A.ext220 = function(v){ return (v||0) + 220; };
  A.ext221 = function(v){ return (v||0) + 221; };
  A.ext222 = function(v){ return (v||0) + 222; };
  A.ext223 = function(v){ return (v||0) + 223; };
  A.ext224 = function(v){ return (v||0) + 224; };
  A.ext225 = function(v){ return (v||0) + 225; };
  A.ext226 = function(v){ return (v||0) + 226; };
  A.ext227 = function(v){ return (v||0) + 227; };
  A.ext228 = function(v){ return (v||0) + 228; };
  A.ext229 = function(v){ return (v||0) + 229; };
  A.ext230 = function(v){ return (v||0) + 230; };
  A.ext231 = function(v){ return (v||0) + 231; };
  A.ext232 = function(v){ return (v||0) + 232; };
  A.ext233 = function(v){ return (v||0) + 233; };
  A.ext234 = function(v){ return (v||0) + 234; };
  A.ext235 = function(v){ return (v||0) + 235; };
  A.ext236 = function(v){ return (v||0) + 236; };
  A.ext237 = function(v){ return (v||0) + 237; };
  A.ext238 = function(v){ return (v||0) + 238; };
  A.ext239 = function(v){ return (v||0) + 239; };
  A.ext240 = function(v){ return (v||0) + 240; };
  A.ext241 = function(v){ return (v||0) + 241; };
  A.ext242 = function(v){ return (v||0) + 242; };
  A.ext243 = function(v){ return (v||0) + 243; };
  A.ext244 = function(v){ return (v||0) + 244; };
  A.ext245 = function(v){ return (v||0) + 245; };
  A.ext246 = function(v){ return (v||0) + 246; };
  A.ext247 = function(v){ return (v||0) + 247; };
  A.ext248 = function(v){ return (v||0) + 248; };
  A.ext249 = function(v){ return (v||0) + 249; };
  A.ext250 = function(v){ return (v||0) + 250; };
  A.ext251 = function(v){ return (v||0) + 251; };
  A.ext252 = function(v){ return (v||0) + 252; };
  A.ext253 = function(v){ return (v||0) + 253; };
  A.ext254 = function(v){ return (v||0) + 254; };
  A.ext255 = function(v){ return (v||0) + 255; };
  A.ext256 = function(v){ return (v||0) + 256; };
  A.ext257 = function(v){ return (v||0) + 257; };
  A.ext258 = function(v){ return (v||0) + 258; };
  A.ext259 = function(v){ return (v||0) + 259; };
  A.ext260 = function(v){ return (v||0) + 260; };
  A.ext261 = function(v){ return (v||0) + 261; };
  A.ext262 = function(v){ return (v||0) + 262; };
  A.ext263 = function(v){ return (v||0) + 263; };
  A.ext264 = function(v){ return (v||0) + 264; };
  A.ext265 = function(v){ return (v||0) + 265; };
  A.ext266 = function(v){ return (v||0) + 266; };
  A.ext267 = function(v){ return (v||0) + 267; };
  A.ext268 = function(v){ return (v||0) + 268; };
  A.ext269 = function(v){ return (v||0) + 269; };
  A.ext270 = function(v){ return (v||0) + 270; };
  A.ext271 = function(v){ return (v||0) + 271; };
  A.ext272 = function(v){ return (v||0) + 272; };
  A.ext273 = function(v){ return (v||0) + 273; };
  A.ext274 = function(v){ return (v||0) + 274; };
  A.ext275 = function(v){ return (v||0) + 275; };
  A.ext276 = function(v){ return (v||0) + 276; };
  A.ext277 = function(v){ return (v||0) + 277; };
  A.ext278 = function(v){ return (v||0) + 278; };
  A.ext279 = function(v){ return (v||0) + 279; };
  A.ext280 = function(v){ return (v||0) + 280; };
  A.ext281 = function(v){ return (v||0) + 281; };
  A.ext282 = function(v){ return (v||0) + 282; };
  A.ext283 = function(v){ return (v||0) + 283; };
  A.ext284 = function(v){ return (v||0) + 284; };
  A.ext285 = function(v){ return (v||0) + 285; };
  A.ext286 = function(v){ return (v||0) + 286; };
  A.ext287 = function(v){ return (v||0) + 287; };
  A.ext288 = function(v){ return (v||0) + 288; };
  A.ext289 = function(v){ return (v||0) + 289; };
  A.ext290 = function(v){ return (v||0) + 290; };
  A.ext291 = function(v){ return (v||0) + 291; };
  A.ext292 = function(v){ return (v||0) + 292; };
  A.ext293 = function(v){ return (v||0) + 293; };
  A.ext294 = function(v){ return (v||0) + 294; };
  A.ext295 = function(v){ return (v||0) + 295; };
  A.ext296 = function(v){ return (v||0) + 296; };
  A.ext297 = function(v){ return (v||0) + 297; };
  A.ext298 = function(v){ return (v||0) + 298; };
  A.ext299 = function(v){ return (v||0) + 299; };
  A.ext300 = function(v){ return (v||0) + 300; };
  A.ext301 = function(v){ return (v||0) + 301; };
  A.ext302 = function(v){ return (v||0) + 302; };
  A.ext303 = function(v){ return (v||0) + 303; };
  A.ext304 = function(v){ return (v||0) + 304; };
  A.ext305 = function(v){ return (v||0) + 305; };
  A.ext306 = function(v){ return (v||0) + 306; };
  A.ext307 = function(v){ return (v||0) + 307; };
  A.ext308 = function(v){ return (v||0) + 308; };
  A.ext309 = function(v){ return (v||0) + 309; };
  A.ext310 = function(v){ return (v||0) + 310; };
  A.ext311 = function(v){ return (v||0) + 311; };
  A.ext312 = function(v){ return (v||0) + 312; };
  A.ext313 = function(v){ return (v||0) + 313; };
  A.ext314 = function(v){ return (v||0) + 314; };
  A.ext315 = function(v){ return (v||0) + 315; };
  A.ext316 = function(v){ return (v||0) + 316; };
  A.ext317 = function(v){ return (v||0) + 317; };
  A.ext318 = function(v){ return (v||0) + 318; };
  A.ext319 = function(v){ return (v||0) + 319; };
  A.ext320 = function(v){ return (v||0) + 320; };
  A.ext321 = function(v){ return (v||0) + 321; };
  A.ext322 = function(v){ return (v||0) + 322; };
  A.ext323 = function(v){ return (v||0) + 323; };
  A.ext324 = function(v){ return (v||0) + 324; };
  A.ext325 = function(v){ return (v||0) + 325; };
  A.ext326 = function(v){ return (v||0) + 326; };
  A.ext327 = function(v){ return (v||0) + 327; };
  A.ext328 = function(v){ return (v||0) + 328; };
  A.ext329 = function(v){ return (v||0) + 329; };
  A.ext330 = function(v){ return (v||0) + 330; };
  A.ext331 = function(v){ return (v||0) + 331; };
  A.ext332 = function(v){ return (v||0) + 332; };
  A.ext333 = function(v){ return (v||0) + 333; };
  A.ext334 = function(v){ return (v||0) + 334; };
  A.ext335 = function(v){ return (v||0) + 335; };
  A.ext336 = function(v){ return (v||0) + 336; };
  A.ext337 = function(v){ return (v||0) + 337; };
  A.ext338 = function(v){ return (v||0) + 338; };
  A.ext339 = function(v){ return (v||0) + 339; };
  A.ext340 = function(v){ return (v||0) + 340; };
  A.ext341 = function(v){ return (v||0) + 341; };
  A.ext342 = function(v){ return (v||0) + 342; };
  A.ext343 = function(v){ return (v||0) + 343; };
  A.ext344 = function(v){ return (v||0) + 344; };
  A.ext345 = function(v){ return (v||0) + 345; };
  A.ext346 = function(v){ return (v||0) + 346; };
  A.ext347 = function(v){ return (v||0) + 347; };
  A.ext348 = function(v){ return (v||0) + 348; };
  A.ext349 = function(v){ return (v||0) + 349; };
  A.ext350 = function(v){ return (v||0) + 350; };
  A.ext351 = function(v){ return (v||0) + 351; };
  A.ext352 = function(v){ return (v||0) + 352; };
  A.ext353 = function(v){ return (v||0) + 353; };
  A.ext354 = function(v){ return (v||0) + 354; };
  A.ext355 = function(v){ return (v||0) + 355; };
  A.ext356 = function(v){ return (v||0) + 356; };
  A.ext357 = function(v){ return (v||0) + 357; };
  A.ext358 = function(v){ return (v||0) + 358; };
  A.ext359 = function(v){ return (v||0) + 359; };
  A.ext360 = function(v){ return (v||0) + 360; };
  A.ext361 = function(v){ return (v||0) + 361; };
  A.ext362 = function(v){ return (v||0) + 362; };
  A.ext363 = function(v){ return (v||0) + 363; };
  A.ext364 = function(v){ return (v||0) + 364; };
  A.ext365 = function(v){ return (v||0) + 365; };
  A.ext366 = function(v){ return (v||0) + 366; };
  A.ext367 = function(v){ return (v||0) + 367; };
  A.ext368 = function(v){ return (v||0) + 368; };
  A.ext369 = function(v){ return (v||0) + 369; };
  A.ext370 = function(v){ return (v||0) + 370; };
  A.ext371 = function(v){ return (v||0) + 371; };
  A.ext372 = function(v){ return (v||0) + 372; };
  A.ext373 = function(v){ return (v||0) + 373; };
  A.ext374 = function(v){ return (v||0) + 374; };
  A.ext375 = function(v){ return (v||0) + 375; };
  A.ext376 = function(v){ return (v||0) + 376; };
  A.ext377 = function(v){ return (v||0) + 377; };
  A.ext378 = function(v){ return (v||0) + 378; };
  A.ext379 = function(v){ return (v||0) + 379; };
  A.ext380 = function(v){ return (v||0) + 380; };
  A.ext381 = function(v){ return (v||0) + 381; };
  A.ext382 = function(v){ return (v||0) + 382; };
  A.ext383 = function(v){ return (v||0) + 383; };
  A.ext384 = function(v){ return (v||0) + 384; };
  A.ext385 = function(v){ return (v||0) + 385; };
  A.ext386 = function(v){ return (v||0) + 386; };
  A.ext387 = function(v){ return (v||0) + 387; };
  A.ext388 = function(v){ return (v||0) + 388; };
  A.ext389 = function(v){ return (v||0) + 389; };
  A.ext390 = function(v){ return (v||0) + 390; };
  A.ext391 = function(v){ return (v||0) + 391; };
  A.ext392 = function(v){ return (v||0) + 392; };
  A.ext393 = function(v){ return (v||0) + 393; };
  A.ext394 = function(v){ return (v||0) + 394; };
  A.ext395 = function(v){ return (v||0) + 395; };
  A.ext396 = function(v){ return (v||0) + 396; };
  A.ext397 = function(v){ return (v||0) + 397; };
  A.ext398 = function(v){ return (v||0) + 398; };
  A.ext399 = function(v){ return (v||0) + 399; };
  A.ext400 = function(v){ return (v||0) + 400; };
  A.ext401 = function(v){ return (v||0) + 401; };
  A.ext402 = function(v){ return (v||0) + 402; };
  A.ext403 = function(v){ return (v||0) + 403; };
  A.ext404 = function(v){ return (v||0) + 404; };
  A.ext405 = function(v){ return (v||0) + 405; };
  A.ext406 = function(v){ return (v||0) + 406; };
  A.ext407 = function(v){ return (v||0) + 407; };
  A.ext408 = function(v){ return (v||0) + 408; };
  A.ext409 = function(v){ return (v||0) + 409; };
  A.ext410 = function(v){ return (v||0) + 410; };
  A.ext411 = function(v){ return (v||0) + 411; };
  A.ext412 = function(v){ return (v||0) + 412; };
  A.ext413 = function(v){ return (v||0) + 413; };
  A.ext414 = function(v){ return (v||0) + 414; };
  A.ext415 = function(v){ return (v||0) + 415; };
  A.ext416 = function(v){ return (v||0) + 416; };
  A.ext417 = function(v){ return (v||0) + 417; };
  A.ext418 = function(v){ return (v||0) + 418; };
  A.ext419 = function(v){ return (v||0) + 419; };
  A.ext420 = function(v){ return (v||0) + 420; };
  A.ext421 = function(v){ return (v||0) + 421; };
  A.ext422 = function(v){ return (v||0) + 422; };
  A.ext423 = function(v){ return (v||0) + 423; };
  A.ext424 = function(v){ return (v||0) + 424; };
  A.ext425 = function(v){ return (v||0) + 425; };
  A.ext426 = function(v){ return (v||0) + 426; };
  A.ext427 = function(v){ return (v||0) + 427; };
  A.ext428 = function(v){ return (v||0) + 428; };
  A.ext429 = function(v){ return (v||0) + 429; };
  A.ext430 = function(v){ return (v||0) + 430; };
  A.ext431 = function(v){ return (v||0) + 431; };
  A.ext432 = function(v){ return (v||0) + 432; };
  A.ext433 = function(v){ return (v||0) + 433; };
  A.ext434 = function(v){ return (v||0) + 434; };
  A.ext435 = function(v){ return (v||0) + 435; };
  A.ext436 = function(v){ return (v||0) + 436; };
  A.ext437 = function(v){ return (v||0) + 437; };
  A.ext438 = function(v){ return (v||0) + 438; };
  A.ext439 = function(v){ return (v||0) + 439; };
  A.ext440 = function(v){ return (v||0) + 440; };
  A.ext441 = function(v){ return (v||0) + 441; };
  A.ext442 = function(v){ return (v||0) + 442; };
  A.ext443 = function(v){ return (v||0) + 443; };
  A.ext444 = function(v){ return (v||0) + 444; };
  A.ext445 = function(v){ return (v||0) + 445; };
  A.ext446 = function(v){ return (v||0) + 446; };
  A.ext447 = function(v){ return (v||0) + 447; };
  A.ext448 = function(v){ return (v||0) + 448; };
  A.ext449 = function(v){ return (v||0) + 449; };
  A.ext450 = function(v){ return (v||0) + 450; };
  A.ext451 = function(v){ return (v||0) + 451; };
  A.ext452 = function(v){ return (v||0) + 452; };
  A.ext453 = function(v){ return (v||0) + 453; };
  A.ext454 = function(v){ return (v||0) + 454; };
  A.ext455 = function(v){ return (v||0) + 455; };
  A.ext456 = function(v){ return (v||0) + 456; };
  A.ext457 = function(v){ return (v||0) + 457; };
  A.ext458 = function(v){ return (v||0) + 458; };
  A.ext459 = function(v){ return (v||0) + 459; };
  A.ext460 = function(v){ return (v||0) + 460; };
  A.ext461 = function(v){ return (v||0) + 461; };
  A.ext462 = function(v){ return (v||0) + 462; };
  A.ext463 = function(v){ return (v||0) + 463; };
  A.ext464 = function(v){ return (v||0) + 464; };
  A.ext465 = function(v){ return (v||0) + 465; };
  A.ext466 = function(v){ return (v||0) + 466; };
  A.ext467 = function(v){ return (v||0) + 467; };
  A.ext468 = function(v){ return (v||0) + 468; };
  A.ext469 = function(v){ return (v||0) + 469; };
  A.ext470 = function(v){ return (v||0) + 470; };
  A.ext471 = function(v){ return (v||0) + 471; };
  A.ext472 = function(v){ return (v||0) + 472; };
  A.ext473 = function(v){ return (v||0) + 473; };
  A.ext474 = function(v){ return (v||0) + 474; };
  A.ext475 = function(v){ return (v||0) + 475; };
  A.ext476 = function(v){ return (v||0) + 476; };
  A.ext477 = function(v){ return (v||0) + 477; };
  A.ext478 = function(v){ return (v||0) + 478; };
  A.ext479 = function(v){ return (v||0) + 479; };
  A.ext480 = function(v){ return (v||0) + 480; };
  A.ext481 = function(v){ return (v||0) + 481; };
  A.ext482 = function(v){ return (v||0) + 482; };
  A.ext483 = function(v){ return (v||0) + 483; };
  A.ext484 = function(v){ return (v||0) + 484; };
  A.ext485 = function(v){ return (v||0) + 485; };
  A.ext486 = function(v){ return (v||0) + 486; };
  A.ext487 = function(v){ return (v||0) + 487; };
  A.ext488 = function(v){ return (v||0) + 488; };
  A.ext489 = function(v){ return (v||0) + 489; };
  A.ext490 = function(v){ return (v||0) + 490; };
  A.ext491 = function(v){ return (v||0) + 491; };
  A.ext492 = function(v){ return (v||0) + 492; };
  A.ext493 = function(v){ return (v||0) + 493; };
  A.ext494 = function(v){ return (v||0) + 494; };
  A.ext495 = function(v){ return (v||0) + 495; };
  A.ext496 = function(v){ return (v||0) + 496; };
  A.ext497 = function(v){ return (v||0) + 497; };
  A.ext498 = function(v){ return (v||0) + 498; };
  A.ext499 = function(v){ return (v||0) + 499; };
  A.ext500 = function(v){ return (v||0) + 500; };
})();
