
(() => {
  const APP_NAME = 'FA OMOK';
  const STORAGE_KEY = 'fa_omok_state_v1';
  const LEADERBOARD_KEY = 'fa_omok_board_v1';
  const BOARD_SIZE = 15;
  const CELL = 44;
  const PADDING = 36;
  const CANVAS_SIZE = PADDING * 2 + CELL * (BOARD_SIZE - 1);
  const HUMAN = 1;
  const AI = 2;
  const EMPTY = 0;
  const STAR_POINTS = [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]];
  const RANKS = ['10k','9k','8k','7k','6k','5k','4k','3k','2k','1k','1d','2d','3d','4d','5d','6d','7d','8d','9d'];

  const state = {
    profile: null,
    board: createBoard(),
    turn: HUMAN,
    gameOver: false,
    winner: 0,
    lastMove: null,
    pendingLock: false,
    moveCount: 0,
    streak: 0,
    totalWins: 0,
    totalLosses: 0,
    totalGames: 0,
    review: [],
    reviewIndex: 0,
    nicknameLocked: false,
    soundsReady: false
  };

  const ui = {};

  function createBoard() {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
  }

  function cloneBoard(board) {
    return board.map(row => row.slice());
  }

  function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function getSavedState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function saveState() {
    const payload = {
      profile: state.profile,
      streak: state.streak,
      totalWins: state.totalWins,
      totalLosses: state.totalLosses,
      totalGames: state.totalGames,
      nicknameLocked: state.nicknameLocked
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function seededLeaderboard() {
    const names = [
      'Rook','Helix','Vanta','Nova','Aster','Luma','Orbit','Iris','Rune','Axis',
      'Nexus','Pike','Sora','Riven','Haze','Kairo','Vega','Nyx','Aero','Lynx',
      'Blaze','Cipher','Onyx','Drift','Flare','Zen','Miro','Arden','Echo','Frost',
      'Slate','Lux','Halo','Quill','Dune','Volt','Aqua','Jett','Noir','Kite',
      'Zeta','Prism','Sol','Bram','Theo','Moss','Crow','Axiom','Pulse','Ivory'
    ];
    const board = [];
    for (let i = 0; i < 50; i++) {
      const totalWins = Math.max(0, 88 - i * 2 + (i % 3));
      board.push({
        id: uid(),
        nickname: names[i] || ('Player ' + (i + 1)),
        totalWins,
        totalLosses: Math.max(0, Math.floor(totalWins * 0.42)),
        totalGames: totalWins + Math.max(0, Math.floor(totalWins * 0.42)),
        rank: getRankFromWins(totalWins),
        streak: Math.max(0, Math.floor(totalWins / 5) % 7)
      });
    }
    return board;
  }

  function getLeaderboard() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || 'null');
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {}
    const seed = seededLeaderboard();
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(seed));
    return seed;
  }

  function setLeaderboard(entries) {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  }

  function upsertProfileToLeaderboard() {
    if (!state.profile) return;
    const board = getLeaderboard();
    const idx = board.findIndex(v => v.id === state.profile.id);
    const entry = {
      id: state.profile.id,
      nickname: state.profile.nickname,
      totalWins: state.totalWins,
      totalLosses: state.totalLosses,
      totalGames: state.totalGames,
      rank: getRankFromWins(state.totalWins),
      streak: state.streak
    };
    if (idx >= 0) board[idx] = entry;
    else board.push(entry);
    board.sort(compareLeaderboard);
    setLeaderboard(board.slice(0, 300));
  }

  function compareLeaderboard(a, b) {
    const ra = rankIndex(a.rank);
    const rb = rankIndex(b.rank);
    if (ra !== rb) return rb - ra;
    if ((b.totalWins || 0) !== (a.totalWins || 0)) return (b.totalWins || 0) - (a.totalWins || 0);
    if ((b.streak || 0) !== (a.streak || 0)) return (b.streak || 0) - (a.streak || 0);
    return String(a.nickname).localeCompare(String(b.nickname));
  }

  function rankIndex(rank) {
    return RANKS.indexOf(rank);
  }

  function getRankFromWins(wins) {
    const idx = Math.min(RANKS.length - 1, Math.floor(Math.max(0, wins) / 5));
    return RANKS[idx];
  }

  function getNextRankProgress(wins) {
    const rank = getRankFromWins(wins);
    const idx = rankIndex(rank);
    const currentBase = idx * 5;
    const nextBase = Math.min((idx + 1) * 5, (RANKS.length - 1) * 5);
    const current = wins - currentBase;
    const need = idx >= RANKS.length - 1 ? 0 : Math.max(0, nextBase - wins);
    return { rank, current, need, max: idx >= RANKS.length - 1 ? 5 : 5 };
  }

  function restore() {
    const saved = getSavedState();
    if (saved) {
      state.profile = saved.profile || null;
      state.streak = saved.streak || 0;
      state.totalWins = saved.totalWins || 0;
      state.totalLosses = saved.totalLosses || 0;
      state.totalGames = saved.totalGames || 0;
      state.nicknameLocked = !!saved.nicknameLocked;
    }
    if (state.profile) {
      state.profile.rank = getRankFromWins(state.totalWins);
      upsertProfileToLeaderboard();
    }
  }

  function createShell() {
    document.body.style.margin = '0';
    document.body.style.background = '#06090f';
    document.body.style.fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    document.body.style.color = '#e8edf7';

    const root = document.createElement('div');
    root.id = 'fa-omok-app';
    root.innerHTML = `
      <div class="fa-wrap">
        <div class="fa-bg"></div>
        <div class="fa-topbar">
          <div class="fa-brand">
            <div class="fa-brand-badge">FA</div>
            <div>
              <div class="fa-brand-title">${APP_NAME}</div>
              <div class="fa-brand-sub">Ranked AI Arena</div>
            </div>
          </div>
          <button class="fa-btn ghost" id="fa-open-leaderboard">Leaderboard</button>
        </div>
        <div class="fa-main">
          <div class="fa-left">
            <div class="fa-panel hero">
              <div class="fa-status-row">
                <div class="fa-player-card">
                  <div class="fa-avatar self"></div>
                  <div class="fa-player-meta">
                    <div class="fa-name" id="fa-player-name">Guest</div>
                    <div class="fa-rank" id="fa-player-rank">10k</div>
                  </div>
                </div>
                <div class="fa-center-vs">
                  <div class="fa-turn" id="fa-turn-label">Your Move</div>
                  <div class="fa-streak" id="fa-streak-label">Win Streak 0</div>
                </div>
                <div class="fa-player-card ai">
                  <div class="fa-player-meta right">
                    <div class="fa-name">FA AI</div>
                    <div class="fa-rank" id="fa-ai-rank">Adaptive</div>
                  </div>
                  <div class="fa-avatar bot"></div>
                </div>
              </div>
              <div class="fa-board-wrap">
                <canvas id="fa-board" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"></canvas>
                <div class="fa-overlay hidden" id="fa-overlay">
                  <div class="fa-overlay-card">
                    <div class="fa-overlay-title" id="fa-overlay-title">Victory</div>
                    <div class="fa-overlay-text" id="fa-overlay-text"></div>
                    <div class="fa-overlay-actions">
                      <button class="fa-btn primary" id="fa-rematch-btn">Rematch</button>
                      <button class="fa-btn" id="fa-review-btn">Review</button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="fa-bottom">
                <div class="fa-progress-box">
                  <div class="fa-progress-top">
                    <span id="fa-progress-rank">10k</span>
                    <span id="fa-progress-text">0 / 5 wins</span>
                  </div>
                  <div class="fa-progress-bar"><div id="fa-progress-fill"></div></div>
                </div>
                <div class="fa-actions">
                  <button class="fa-btn" id="fa-newgame-btn">New Game</button>
                  <button class="fa-btn" id="fa-reset-score-btn">Reset Score</button>
                </div>
              </div>
            </div>
          </div>
          <div class="fa-right">
            <div class="fa-panel setup" id="fa-profile-panel">
              <div class="fa-panel-title">Player ID</div>
              <div class="fa-panel-sub">Set once and lock forever</div>
              <div class="fa-input-wrap">
                <input id="fa-nickname" maxlength="18" autocomplete="off" spellcheck="false" placeholder="Enter nickname" />
                <button class="fa-btn primary" id="fa-save-nick">Lock</button>
              </div>
              <div class="fa-mini-note" id="fa-nick-note">Nickname can only be set once</div>
            </div>
            <div class="fa-panel stats">
              <div class="fa-panel-title">Career</div>
              <div class="fa-stats-grid">
                <div class="fa-stat-box"><span>Wins</span><strong id="fa-total-wins">0</strong></div>
                <div class="fa-stat-box"><span>Losses</span><strong id="fa-total-losses">0</strong></div>
                <div class="fa-stat-box"><span>Games</span><strong id="fa-total-games">0</strong></div>
                <div class="fa-stat-box"><span>Best Streak</span><strong id="fa-best-tier">0</strong></div>
              </div>
            </div>
            <div class="fa-panel info">
              <div class="fa-panel-title">Arena</div>
              <div class="fa-info-box">
                <div class="fa-info-line"><span>Mode</span><strong>Player vs AI</strong></div>
                <div class="fa-info-line"><span>Rule</span><strong>Five in a row</strong></div>
                <div class="fa-info-line"><span>Scale</span><strong id="fa-scale-line">Calm</strong></div>
                <div class="fa-info-line"><span>Review</span><strong id="fa-review-line">Ready</strong></div>
              </div>
            </div>
            <div class="fa-panel lb">
              <div class="fa-panel-title">Top 50</div>
              <div class="fa-leader-scroll" id="fa-leader-preview"></div>
            </div>
          </div>
        </div>
        <div class="fa-modal hidden" id="fa-leaderboard-modal">
          <div class="fa-modal-card">
            <div class="fa-modal-head">
              <div>
                <div class="fa-modal-title">Leaderboard</div>
                <div class="fa-modal-sub">Top 50 ranked players</div>
              </div>
              <button class="fa-btn" id="fa-close-leaderboard">Close</button>
            </div>
            <div class="fa-modal-body" id="fa-leaderboard-list"></div>
          </div>
        </div>
      </div>
    `;
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --glass: rgba(255,255,255,.06);
        --line: rgba(255,255,255,.1);
        --muted: rgba(233,239,249,.68);
        --gold: #d5b26c;
        --gold2: #f1d598;
        --green: #8dcf65;
        --shadow: 0 20px 60px rgba(0,0,0,.45);
      }
      * { box-sizing: border-box; }
      .fa-wrap { min-height: 100vh; position: relative; overflow: hidden; }
      .fa-bg {
        position: fixed; inset: 0;
        background:
          radial-gradient(circle at 20% 20%, rgba(219,171,89,.17), transparent 28%),
          radial-gradient(circle at 80% 0%, rgba(75,110,255,.18), transparent 24%),
          radial-gradient(circle at 80% 70%, rgba(61,170,128,.16), transparent 28%),
          linear-gradient(180deg, #0a1018 0%, #0b1220 45%, #091019 100%);
        z-index: 0;
      }
      .fa-topbar, .fa-main { position: relative; z-index: 1; }
      .fa-topbar {
        max-width: 1400px; margin: 0 auto; padding: 18px 22px;
        display: flex; align-items: center; justify-content: space-between;
      }
      .fa-brand { display: flex; align-items: center; gap: 14px; }
      .fa-brand-badge {
        width: 48px; height: 48px; border-radius: 14px;
        display: grid; place-items: center;
        background: linear-gradient(145deg, rgba(244,210,138,.95), rgba(166,128,59,.95));
        color: #101114; font-weight: 900; letter-spacing: .06em;
        box-shadow: 0 10px 28px rgba(213,178,108,.35), inset 0 1px 2px rgba(255,255,255,.55);
      }
      .fa-brand-title { font-size: 20px; font-weight: 800; letter-spacing: .04em; }
      .fa-brand-sub { font-size: 12px; color: var(--muted); letter-spacing: .14em; text-transform: uppercase; }
      .fa-main {
        max-width: 1400px; margin: 0 auto; padding: 8px 22px 28px;
        display: grid; grid-template-columns: 1.1fr 380px; gap: 22px;
      }
      .fa-panel {
        background: linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.04));
        border: 1px solid var(--line);
        box-shadow: var(--shadow);
        border-radius: 24px;
        backdrop-filter: blur(18px);
      }
      .hero { padding: 18px; }
      .setup, .stats, .info, .lb { padding: 18px; }
      .fa-status-row {
        display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center; margin-bottom: 16px;
      }
      .fa-player-card {
        display: flex; align-items: center; gap: 12px;
        background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); border-radius: 18px; padding: 12px 14px;
      }
      .fa-player-card.ai { justify-content: flex-end; }
      .fa-player-meta.right { text-align: right; }
      .fa-avatar {
        width: 52px; height: 52px; border-radius: 16px;
        background: linear-gradient(145deg, rgba(255,255,255,.22), rgba(255,255,255,.05));
        border: 1px solid rgba(255,255,255,.12);
        position: relative;
      }
      .fa-avatar.self::before, .fa-avatar.bot::before {
        content: '';
        position: absolute; inset: 8px; border-radius: 12px;
        background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.92), rgba(255,255,255,.22) 30%, transparent 31%),
                    linear-gradient(145deg, rgba(227,233,245,.9), rgba(117,145,196,.4));
      }
      .fa-avatar.bot::before {
        background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.65), rgba(255,255,255,.18) 28%, transparent 29%),
                    linear-gradient(145deg, rgba(36,40,62,.9), rgba(164,176,206,.5));
      }
      .fa-name { font-size: 16px; font-weight: 700; }
      .fa-rank { font-size: 13px; color: var(--gold2); margin-top: 2px; }
      .fa-center-vs { text-align: center; padding: 0 8px; }
      .fa-turn { font-weight: 800; font-size: 18px; }
      .fa-streak { font-size: 13px; color: var(--muted); margin-top: 4px; }
      .fa-board-wrap {
        position: relative; width: 100%;
        display: flex; justify-content: center; align-items: center;
        padding: 14px 8px 10px;
      }
      #fa-board {
        width: min(100%, 820px); height: auto; display: block;
        border-radius: 24px; box-shadow: 0 25px 70px rgba(0,0,0,.4);
        background: #d8bc80;
      }
      .fa-overlay {
        position: absolute; inset: 0; display: grid; place-items: center;
        background: rgba(4,7,12,.18);
      }
      .fa-overlay.hidden, .fa-modal.hidden { display: none; }
      .fa-overlay-card {
        width: min(92%, 420px); padding: 22px; border-radius: 24px;
        background: linear-gradient(180deg, rgba(17,20,28,.9), rgba(12,14,20,.94));
        border: 1px solid rgba(255,255,255,.08); box-shadow: var(--shadow); text-align: center;
      }
      .fa-overlay-title { font-size: 28px; font-weight: 900; letter-spacing: .04em; }
      .fa-overlay-text { font-size: 14px; color: var(--muted); margin-top: 10px; line-height: 1.55; }
      .fa-overlay-actions { display: flex; justify-content: center; gap: 12px; margin-top: 18px; }
      .fa-bottom {
        display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 14px 8px 2px;
      }
      .fa-progress-box { flex: 1; }
      .fa-progress-top { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; color: var(--muted); }
      .fa-progress-bar {
        height: 12px; border-radius: 999px; overflow: hidden; background: rgba(255,255,255,.09); border: 1px solid rgba(255,255,255,.08);
      }
      #fa-progress-fill {
        height: 100%; width: 0%;
        background: linear-gradient(90deg, #7bd46a, #d9c07f);
        border-radius: 999px;
        transition: width .35s ease;
      }
      .fa-actions { display: flex; gap: 10px; }
      .fa-btn {
        appearance: none; border: 1px solid rgba(255,255,255,.12); outline: none;
        background: rgba(255,255,255,.06); color: #ecf2ff; border-radius: 16px; padding: 12px 16px;
        font-weight: 700; cursor: pointer; transition: .2s ease; box-shadow: 0 10px 24px rgba(0,0,0,.18);
      }
      .fa-btn:hover { transform: translateY(-1px); background: rgba(255,255,255,.08); }
      .fa-btn.primary {
        background: linear-gradient(145deg, rgba(214,180,109,.98), rgba(126,98,43,.98));
        color: #121316; border-color: rgba(255,230,181,.36);
      }
      .fa-btn.ghost { background: rgba(255,255,255,.03); }
      .fa-panel-title { font-weight: 800; font-size: 18px; }
      .fa-panel-sub, .fa-mini-note { font-size: 13px; color: var(--muted); margin-top: 6px; }
      .fa-input-wrap { display: flex; gap: 10px; margin-top: 16px; }
      #fa-nickname {
        flex: 1; min-width: 0; height: 50px; border-radius: 16px; padding: 0 16px;
        border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.045); color: #f4f7ff;
        font-size: 15px; outline: none;
      }
      #fa-nickname:disabled { opacity: .55; }
      .fa-stats-grid {
        margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
      }
      .fa-stat-box, .fa-info-box { background: rgba(255,255,255,.04); border-radius: 18px; border: 1px solid rgba(255,255,255,.07); }
      .fa-stat-box { padding: 14px; }
      .fa-stat-box span { display: block; color: var(--muted); font-size: 13px; }
      .fa-stat-box strong { display: block; margin-top: 8px; font-size: 24px; letter-spacing: .02em; }
      .fa-info-box { padding: 12px 14px; margin-top: 12px; }
      .fa-info-line { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,.06); gap: 12px; }
      .fa-info-line:last-child { border-bottom: 0; }
      .fa-info-line span { color: var(--muted); font-size: 13px; }
      .fa-info-line strong { font-size: 14px; }
      .fa-leader-scroll {
        margin-top: 12px; max-height: 484px; overflow: auto; padding-right: 4px;
      }
      .fa-leader-scroll::-webkit-scrollbar, .fa-modal-body::-webkit-scrollbar { width: 10px; }
      .fa-leader-scroll::-webkit-scrollbar-thumb, .fa-modal-body::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,.14); border-radius: 999px;
      }
      .fa-rank-row {
        display: grid; grid-template-columns: 48px 1fr auto; gap: 10px; align-items: center;
        padding: 12px 12px; border-radius: 18px; margin-bottom: 10px; background: rgba(255,255,255,.04);
        border: 1px solid rgba(255,255,255,.07);
      }
      .fa-rank-pos {
        width: 38px; height: 38px; border-radius: 14px; display: grid; place-items: center;
        background: linear-gradient(145deg, rgba(255,255,255,.15), rgba(255,255,255,.04)); font-weight: 900;
      }
      .fa-rank-main { min-width: 0; }
      .fa-rank-name { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .fa-rank-sub { color: var(--muted); font-size: 12px; margin-top: 4px; }
      .fa-rank-badge {
        min-width: 68px; text-align: center; padding: 8px 10px; border-radius: 999px;
        background: rgba(213,178,108,.14); color: #f0d79d; font-weight: 800; border: 1px solid rgba(213,178,108,.24);
      }
      .fa-modal {
        position: fixed; inset: 0; background: rgba(3,6,12,.56); display: grid; place-items: center; padding: 22px; z-index: 4;
      }
      .fa-modal-card {
        width: min(100%, 860px); max-height: min(88vh, 940px); border-radius: 28px;
        background: linear-gradient(180deg, rgba(15,19,28,.95), rgba(11,14,21,.96));
        border: 1px solid rgba(255,255,255,.08); box-shadow: var(--shadow); overflow: hidden;
      }
      .fa-modal-head {
        padding: 18px 20px; display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }
      .fa-modal-title { font-weight: 900; font-size: 24px; }
      .fa-modal-sub { font-size: 13px; color: var(--muted); margin-top: 4px; }
      .fa-modal-body { padding: 16px 18px 18px; overflow: auto; max-height: calc(88vh - 92px); }
      @media (max-width: 1120px) {
        .fa-main { grid-template-columns: 1fr; }
      }
      @media (max-width: 740px) {
        .fa-topbar { padding: 14px; }
        .fa-main { padding: 6px 14px 18px; gap: 14px; }
        .hero, .setup, .stats, .info, .lb { padding: 14px; border-radius: 20px; }
        .fa-status-row { grid-template-columns: 1fr; }
        .fa-center-vs { order: -1; }
        .fa-bottom { flex-direction: column; align-items: stretch; }
        .fa-actions { width: 100%; }
        .fa-actions .fa-btn { flex: 1; }
        .fa-input-wrap { flex-direction: column; }
        .fa-brand-title { font-size: 18px; }
        .fa-modal { padding: 14px; }
        .fa-modal-head { padding: 14px; }
        .fa-modal-body { padding: 14px; }
        .fa-rank-row { grid-template-columns: 42px 1fr auto; padding: 11px; }
      }
    `;
    document.head.appendChild(style);
    document.body.innerHTML = '';
    document.body.appendChild(root);

    ui.board = root.querySelector('#fa-board');
    ui.ctx = ui.board.getContext('2d');
    ui.overlay = root.querySelector('#fa-overlay');
    ui.overlayTitle = root.querySelector('#fa-overlay-title');
    ui.overlayText = root.querySelector('#fa-overlay-text');
    ui.turnLabel = root.querySelector('#fa-turn-label');
    ui.streakLabel = root.querySelector('#fa-streak-label');
    ui.playerName = root.querySelector('#fa-player-name');
    ui.playerRank = root.querySelector('#fa-player-rank');
    ui.aiRank = root.querySelector('#fa-ai-rank');
    ui.progressRank = root.querySelector('#fa-progress-rank');
    ui.progressText = root.querySelector('#fa-progress-text');
    ui.progressFill = root.querySelector('#fa-progress-fill');
    ui.totalWins = root.querySelector('#fa-total-wins');
    ui.totalLosses = root.querySelector('#fa-total-losses');
    ui.totalGames = root.querySelector('#fa-total-games');
    ui.bestTier = root.querySelector('#fa-best-tier');
    ui.scaleLine = root.querySelector('#fa-scale-line');
    ui.reviewLine = root.querySelector('#fa-review-line');
    ui.nickInput = root.querySelector('#fa-nickname');
    ui.nickNote = root.querySelector('#fa-nick-note');
    ui.profilePanel = root.querySelector('#fa-profile-panel');
    ui.leaderPreview = root.querySelector('#fa-leader-preview');
    ui.leaderModal = root.querySelector('#fa-leaderboard-modal');
    ui.leaderList = root.querySelector('#fa-leaderboard-list');

    root.querySelector('#fa-open-leaderboard').addEventListener('click', openLeaderboard);
    root.querySelector('#fa-close-leaderboard').addEventListener('click', closeLeaderboard);
    root.querySelector('#fa-save-nick').addEventListener('click', lockNickname);
    root.querySelector('#fa-newgame-btn').addEventListener('click', newGame);
    root.querySelector('#fa-rematch-btn').addEventListener('click', () => { closeOverlay(); newGame(); });
    root.querySelector('#fa-review-btn').addEventListener('click', startReview);
    root.querySelector('#fa-reset-score-btn').addEventListener('click', resetCareer);

    ui.board.addEventListener('click', onBoardClick);
    ui.nickInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') lockNickname();
    });
    ui.leaderModal.addEventListener('click', e => {
      if (e.target === ui.leaderModal) closeLeaderboard();
    });
    window.addEventListener('keydown', onGlobalKey);
    window.addEventListener('resize', renderBoard);
    document.addEventListener('pointerdown', initAudio, { once: true });
  }

  function initAudio() {
    if (state.soundsReady) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      state.audio = new AC();
      state.soundsReady = true;
    } catch {}
  }

  function hitSound(type = 'stone') {
    if (!state.audio) return;
    const ctx = state.audio;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = type === 'stone' ? 0.32 : 0.22;
    master.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(type === 'stone' ? 190 : 360, now);
    osc1.frequency.exponentialRampToValueAtTime(type === 'stone' ? 98 : 180, now + 0.08);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(type === 'stone' ? 0.9 : 0.45, now + 0.008);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc1.connect(gain1).connect(master);
    osc1.start(now);
    osc1.stop(now + 0.12);

    const noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length * 8);
    noise.buffer = noiseBuffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = type === 'stone' ? 850 : 1200;
    band.Q.value = 1.1;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.001, now);
    ng.gain.exponentialRampToValueAtTime(type === 'stone' ? 0.33 : 0.18, now + 0.005);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    noise.connect(band).connect(ng).connect(master);
    noise.start(now);
    noise.stop(now + 0.055);
  }

  function fanfare(win) {
    if (!state.audio) return;
    const ctx = state.audio;
    const now = ctx.currentTime;
    [0, 0.12, 0.24].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = win ? [523, 659, 784][i] : [262, 220, 196][i];
      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.08, now + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.21);
    });
  }

  function lockNickname() {
    if (state.nicknameLocked) return;
    const value = (ui.nickInput.value || '').trim();
    if (!/^[A-Za-z0-9 _.-]{2,18}$/.test(value)) {
      ui.nickNote.textContent = 'Use 2 to 18 letters or numbers';
      return;
    }
    state.profile = { id: uid(), nickname: value, rank: getRankFromWins(state.totalWins) };
    state.nicknameLocked = true;
    saveState();
    upsertProfileToLeaderboard();
    syncUI();
    renderLeaderboard();
  }

  function resetCareer() {
    if (!confirm('Reset your record?')) return;
    state.streak = 0;
    state.totalWins = 0;
    state.totalLosses = 0;
    state.totalGames = 0;
    if (state.profile) state.profile.rank = getRankFromWins(0);
    saveState();
    upsertProfileToLeaderboard();
    syncUI();
    renderLeaderboard();
    newGame();
  }

  function newGame() {
    state.board = createBoard();
    state.turn = HUMAN;
    state.gameOver = false;
    state.winner = 0;
    state.lastMove = null;
    state.pendingLock = false;
    state.moveCount = 0;
    state.review = [];
    state.reviewIndex = 0;
    closeOverlay();
    syncUI();
    renderBoard();
  }

  function closeOverlay() {
    ui.overlay.classList.add('hidden');
  }

  function showOverlay(title, text) {
    ui.overlayTitle.textContent = title;
    ui.overlayText.textContent = text;
    ui.overlay.classList.remove('hidden');
  }

  function syncUI() {
    const rank = getRankFromWins(state.totalWins);
    if (state.profile) state.profile.rank = rank;
    ui.playerName.textContent = state.profile ? state.profile.nickname : 'Guest';
    ui.playerRank.textContent = rank;
    ui.aiRank.textContent = getAiTitle();
    ui.turnLabel.textContent = state.gameOver ? (state.winner === HUMAN ? 'Victory' : state.winner === AI ? 'Defeat' : 'Finished') : (state.turn === HUMAN ? 'Your Move' : 'AI Thinking');
    ui.streakLabel.textContent = 'Win Streak ' + state.streak;
    const progress = getNextRankProgress(state.totalWins);
    ui.progressRank.textContent = progress.rank;
    ui.progressText.textContent = progress.need === 0 ? 'Max rank reached' : `${progress.current} / ${progress.max} wins`;
    ui.progressFill.style.width = `${progress.need === 0 ? 100 : (progress.current / progress.max) * 100}%`;
    ui.totalWins.textContent = String(state.totalWins);
    ui.totalLosses.textContent = String(state.totalLosses);
    ui.totalGames.textContent = String(state.totalGames);
    ui.bestTier.textContent = String(state.streak);
    ui.scaleLine.textContent = getAiTitle();
    ui.reviewLine.textContent = state.review.length ? `${state.reviewIndex + 1} / ${state.review.length}` : 'Ready';

    if (state.nicknameLocked && state.profile) {
      ui.nickInput.value = state.profile.nickname;
      ui.nickInput.disabled = true;
      ui.nickNote.textContent = 'Locked';
      ui.profilePanel.querySelector('.fa-btn.primary').disabled = true;
      ui.profilePanel.querySelector('.fa-btn.primary').textContent = 'Locked';
    }
  }

  function openLeaderboard() {
    renderLeaderboard(true);
    ui.leaderModal.classList.remove('hidden');
  }

  function closeLeaderboard() {
    ui.leaderModal.classList.add('hidden');
  }

  function renderLeaderboard(full = false) {
    const board = getLeaderboard().sort(compareLeaderboard).slice(0, 50);
    const buildRow = (p, i) => `
      <div class="fa-rank-row">
        <div class="fa-rank-pos">${i + 1}</div>
        <div class="fa-rank-main">
          <div class="fa-rank-name">${escapeHtml(p.nickname)}</div>
          <div class="fa-rank-sub">${p.totalWins || 0} wins · ${p.totalLosses || 0} losses · streak ${p.streak || 0}</div>
        </div>
        <div class="fa-rank-badge">${p.rank}</div>
      </div>
    `;
    ui.leaderPreview.innerHTML = board.map(buildRow).join('');
    if (full) ui.leaderList.innerHTML = board.map(buildRow).join('');
  }

  function escapeHtml(v) {
    return String(v).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  function onGlobalKey(e) {
    if (e.key.toLowerCase() === 'l') {
      if (ui.leaderModal.classList.contains('hidden')) openLeaderboard();
      else closeLeaderboard();
    }
    if (e.key.toLowerCase() === 'n') newGame();
    if (state.review.length && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      if (e.key === 'ArrowLeft') state.reviewIndex = Math.max(0, state.reviewIndex - 1);
      else state.reviewIndex = Math.min(state.review.length - 1, state.reviewIndex + 1);
      renderBoard(state.review[state.reviewIndex].board, state.review[state.reviewIndex].lastMove);
      syncUI();
    }
  }

  function boardCoord(index) {
    return PADDING + index * CELL;
  }

  function nearestPoint(px, py) {
    const x = Math.round((px - PADDING) / CELL);
    const y = Math.round((py - PADDING) / CELL);
    if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) return null;
    const gx = boardCoord(x);
    const gy = boardCoord(y);
    const dist = Math.hypot(px - gx, py - gy);
    return dist <= CELL * 0.45 ? { x, y } : null;
  }

  function onBoardClick(e) {
    if (!state.nicknameLocked) {
      ui.nickNote.textContent = 'Lock nickname first';
      return;
    }
    if (state.turn !== HUMAN || state.gameOver || state.pendingLock) return;
    const rect = ui.board.getBoundingClientRect();
    const scaleX = ui.board.width / rect.width;
    const scaleY = ui.board.height / rect.height;
    const pos = nearestPoint((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    if (!pos) return;
    if (state.board[pos.y][pos.x] !== EMPTY) return;
    placeMove(pos.x, pos.y, HUMAN);
    if (state.gameOver) return;
    state.turn = AI;
    syncUI();
    state.pendingLock = true;
    setTimeout(aiTurn, 150 + Math.min(350, state.streak * 35));
  }

  function placeMove(x, y, side) {
    state.board[y][x] = side;
    state.lastMove = { x, y, side };
    state.moveCount += 1;
    state.review.push({ board: cloneBoard(state.board), lastMove: { x, y, side } });
    state.reviewIndex = state.review.length - 1;
    hitSound('stone');
    renderBoard();

    const result = checkWinner(state.board, x, y, side);
    if (result.win) {
      state.gameOver = true;
      state.winner = side;
      finishGame(side, result.line);
      return;
    }
    if (isFull(state.board)) {
      state.gameOver = true;
      state.winner = 0;
      finishGame(0, []);
      return;
    }
    state.turn = side === HUMAN ? AI : HUMAN;
    syncUI();
  }

  function finishGame(winner, line) {
    state.pendingLock = false;
    state.totalGames += 1;
    let title = 'Finished';
    let text = 'No winner this round.';
    if (winner === HUMAN) {
      state.totalWins += 1;
      state.streak += 1;
      title = 'Victory';
      text = `Rank ${getRankFromWins(state.totalWins)} · Streak ${state.streak}`;
      fanfare(true);
    } else if (winner === AI) {
      state.totalLosses += 1;
      state.streak = 0;
      title = 'Defeat';
      text = `AI scale ${getAiTitle()} · Rank ${getRankFromWins(state.totalWins)}`;
      fanfare(false);
    }
    saveState();
    upsertProfileToLeaderboard();
    syncUI();
    renderLeaderboard();
    showOverlay(title, text);
    renderBoard(undefined, undefined, line);
  }

  function isFull(board) {
    for (let y = 0; y < BOARD_SIZE; y++) for (let x = 0; x < BOARD_SIZE; x++) if (board[y][x] === EMPTY) return false;
    return true;
  }

  function getAiTitle() {
    if (state.streak >= 15) return 'Infinity';
    if (state.streak >= 10) return 'Transcendent';
    if (state.streak >= 7) return 'Mythic';
    if (state.streak >= 5) return 'Godlike';
    if (state.streak >= 4) return 'Elite';
    if (state.streak >= 3) return 'Expert';
    if (state.streak >= 2) return 'Advanced';
    if (state.streak >= 1) return 'Focused';
    return 'Calm';
  }

  function getAiProfile() {
    const s = state.streak;
    return {
      randomness: s <= 0 ? 0.34 : s === 1 ? 0.2 : s === 2 ? 0.11 : s === 3 ? 0.05 : s === 4 ? 0.02 : 0,
      searchTop: s <= 0 ? 8 : s === 1 ? 7 : s === 2 ? 6 : s === 3 ? 5 : s === 4 ? 4 : 3,
      aggressive: s >= 3 ? 1.18 : 1,
      ultra: s >= 5,
      deep: s >= 7
    };
  }

  function aiTurn() {
    if (state.gameOver) return;
    const profile = getAiProfile();
    const move = chooseAiMove(state.board, profile);
    state.pendingLock = false;
    if (!move) return;
    placeMove(move.x, move.y, AI);
  }

  function chooseAiMove(board, profile) {
    if (state.moveCount === 0) return { x: 7, y: 7 };
    const immediateWin = findImmediate(board, AI);
    if (immediateWin) return immediateWin;
    const immediateBlock = findImmediate(board, HUMAN);
    if (immediateBlock) return immediateBlock;

    if (profile.ultra) {
      const force = findDoubleThreat(board, AI) || findCounterDoubleThreat(board, HUMAN);
      if (force) return force;
    }

    const candidates = generateCandidates(board);
    if (!candidates.length) return { x: 7, y: 7 };

    const scored = candidates.map(move => {
      const score = evaluateMove(board, move.x, move.y, AI, profile) + defenseUrgency(board, move.x, move.y, profile);
      const future = profile.deep ? shallowLookahead(board, move.x, move.y, profile) : 0;
      return { ...move, score: score + future };
    }).sort((a, b) => b.score - a.score);

    const top = scored.slice(0, profile.searchTop);
    if (!top.length) return scored[0];
    if (!profile.randomness) return top[0];
    if (Math.random() < profile.randomness) {
      return top[Math.floor(Math.random() * top.length)];
    }
    return top[0];
  }

  function shallowLookahead(board, x, y, profile) {
    const temp = cloneBoard(board);
    temp[y][x] = AI;
    const humanWin = findImmediate(temp, HUMAN);
    if (humanWin) return 22000;
    const oppCandidates = generateCandidates(temp).slice(0, 8);
    let oppBest = -Infinity;
    for (const c of oppCandidates) {
      const v = evaluateMove(temp, c.x, c.y, HUMAN, profile);
      if (v > oppBest) oppBest = v;
    }
    const aiCandidates = generateCandidates(temp).slice(0, 8);
    let aiBest = -Infinity;
    for (const c of aiCandidates) {
      const v = evaluateMove(temp, c.x, c.y, AI, profile);
      if (v > aiBest) aiBest = v;
    }
    return aiBest * 0.28 - oppBest * 0.34;
  }

  function findCounterDoubleThreat(board, player) {
    const candidates = generateCandidates(board);
    for (const c of candidates) {
      const temp = cloneBoard(board);
      temp[c.y][c.x] = player;
      const threats = countThreats(temp, player, c.x, c.y);
      if (threats.openFour >= 1 || threats.openThree >= 2) return c;
    }
    return null;
  }

  function findDoubleThreat(board, player) {
    const candidates = generateCandidates(board);
    let best = null;
    let bestScore = -Infinity;
    for (const c of candidates) {
      const temp = cloneBoard(board);
      temp[c.y][c.x] = player;
      const threats = countThreats(temp, player, c.x, c.y);
      const score = threats.openFour * 200000 + threats.openThree * 50000 + threats.closedFour * 35000;
      if (score > bestScore && (threats.openFour >= 1 || threats.openThree >= 2)) {
        best = c;
        bestScore = score;
      }
    }
    return best;
  }

  function defenseUrgency(board, x, y, profile) {
    const temp = cloneBoard(board);
    temp[y][x] = AI;
    const oppImmediate = findImmediate(temp, HUMAN);
    let score = oppImmediate ? 30000 : 0;
    const oppThreats = countThreats(board, HUMAN, x, y);
    score += oppThreats.openFour * 100000;
    score += oppThreats.closedFour * 30000;
    score += oppThreats.openThree * 18000;
    if (profile.ultra) score *= 1.12;
    return score;
  }

  function findImmediate(board, side) {
    const candidates = generateCandidates(board);
    for (const c of candidates) {
      if (board[c.y][c.x] !== EMPTY) continue;
      board[c.y][c.x] = side;
      const win = checkWinner(board, c.x, c.y, side).win;
      board[c.y][c.x] = EMPTY;
      if (win) return c;
    }
    return null;
  }

  function generateCandidates(board) {
    const set = new Map();
    let hasStone = false;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (board[y][x] !== EMPTY) {
          hasStone = true;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) continue;
              if (board[ny][nx] !== EMPTY) continue;
              const key = nx + ',' + ny;
              const dist = Math.abs(dx) + Math.abs(dy);
              const prev = set.get(key) || 0;
              set.set(key, Math.max(prev, 8 - dist));
            }
          }
        }
      }
    }
    if (!hasStone) return [{ x: 7, y: 7, halo: 0 }];
    return [...set.entries()]
      .map(([key, halo]) => {
        const [x, y] = key.split(',').map(Number);
        return { x, y, halo };
      })
      .sort((a, b) => b.halo - a.halo);
  }

  function evaluateMove(board, x, y, side, profile) {
    const opp = side === AI ? HUMAN : AI;
    if (board[y][x] !== EMPTY) return -Infinity;

    board[y][x] = side;
    const self = totalLineScore(board, x, y, side);
    const selfThreats = countThreats(board, side, x, y);
    board[y][x] = EMPTY;

    board[y][x] = opp;
    const enemy = totalLineScore(board, x, y, opp);
    const enemyThreats = countThreats(board, opp, x, y);
    board[y][x] = EMPTY;

    let score = self * (profile.aggressive || 1);
    score += enemy * 0.93;
    score += selfThreats.openFour * 180000;
    score += selfThreats.closedFour * 54000;
    score += selfThreats.openThree * 21000;
    score += selfThreats.closedThree * 6000;
    score += selfThreats.openTwo * 1400;
    score += enemyThreats.openFour * 170000;
    score += enemyThreats.closedFour * 60000;
    score += enemyThreats.openThree * 26000;
    score += enemyThreats.closedThree * 7000;
    score += centerBonus(x, y);
    return score;
  }

  function centerBonus(x, y) {
    const cx = 7;
    const cy = 7;
    return 30 - (Math.abs(x - cx) + Math.abs(y - cy)) * 2.2;
  }

  function totalLineScore(board, x, y, side) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let total = 0;
    for (const [dx, dy] of dirs) {
      const info = analyzeDirection(board, x, y, side, dx, dy);
      total += patternScore(info.count, info.openEnds, info.gap, info.chainLengths);
    }
    return total;
  }

  function countThreats(board, side, x, y) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    const out = { openFour: 0, closedFour: 0, openThree: 0, closedThree: 0, openTwo: 0 };
    for (const [dx, dy] of dirs) {
      const info = analyzeDirection(board, x, y, side, dx, dy);
      const c = info.count;
      const oe = info.openEnds;
      if (c >= 5) out.openFour += 10;
      else if (c === 4 && oe === 2) out.openFour += 1;
      else if (c === 4 && oe === 1) out.closedFour += 1;
      else if (c === 3 && oe === 2) out.openThree += 1;
      else if (c === 3 && oe === 1) out.closedThree += 1;
      else if (c === 2 && oe === 2) out.openTwo += 1;

      if (info.gap >= 0) {
        if (c === 4 && oe >= 1) out.closedFour += 1;
        if (c === 3 && oe === 2) out.openThree += 1;
      }
    }
    return out;
  }

  function analyzeDirection(board, x, y, side, dx, dy) {
    let count = 1;
    let openEnds = 0;
    let gap = -1;
    const chainLengths = [];

    let n = 1;
    let seg = 0;
    while (true) {
      const nx = x + dx * n;
      const ny = y + dy * n;
      if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) break;
      const val = board[ny][nx];
      if (val === side) {
        count++;
        seg++;
      } else if (val === EMPTY) {
        const nx2 = nx + dx;
        const ny2 = ny + dy;
        if (gap === -1 && nx2 >= 0 && ny2 >= 0 && nx2 < BOARD_SIZE && ny2 < BOARD_SIZE && board[ny2][nx2] === side) {
          gap = seg;
          let m = 2;
          while (true) {
            const gx = nx + dx * (m - 1);
            const gy = ny + dy * (m - 1);
            if (gx < 0 || gy < 0 || gx >= BOARD_SIZE || gy >= BOARD_SIZE) break;
            if (board[gy][gx] === side) {
              count++;
              m++;
            } else break;
          }
        } else openEnds++;
        break;
      } else break;
      n++;
    }
    chainLengths.push(seg);

    n = 1;
    seg = 0;
    while (true) {
      const nx = x - dx * n;
      const ny = y - dy * n;
      if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) break;
      const val = board[ny][nx];
      if (val === side) {
        count++;
        seg++;
      } else if (val === EMPTY) {
        const nx2 = nx - dx;
        const ny2 = ny - dy;
        if (gap === -1 && nx2 >= 0 && ny2 >= 0 && nx2 < BOARD_SIZE && ny2 < BOARD_SIZE && board[ny2][nx2] === side) {
          gap = seg;
          let m = 2;
          while (true) {
            const gx = nx - dx * (m - 1);
            const gy = ny - dy * (m - 1);
            if (gx < 0 || gy < 0 || gx >= BOARD_SIZE || gy >= BOARD_SIZE) break;
            if (board[gy][gx] === side) {
              count++;
              m++;
            } else break;
          }
        } else openEnds++;
        break;
      } else break;
      n++;
    }
    chainLengths.push(seg);

    return { count, openEnds, gap, chainLengths };
  }

  function patternScore(count, openEnds, gap) {
    if (count >= 5) return 1000000;
    if (count === 4 && openEnds === 2) return 180000;
    if (count === 4 && openEnds === 1) return 50000;
    if (count === 3 && openEnds === 2) return 18000;
    if (count === 3 && openEnds === 1) return 4500;
    if (count === 2 && openEnds === 2) return 1100;
    if (count === 2 && openEnds === 1) return 300;
    if (gap >= 0 && count >= 4) return 38000;
    if (gap >= 0 && count === 3) return 6500;
    return 30;
  }

  function checkWinner(board, x, y, side) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (const [dx, dy] of dirs) {
      const line = [{ x, y }];
      let c = 1;
      let i = 1;
      while (true) {
        const nx = x + dx * i;
        const ny = y + dy * i;
        if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE || board[ny][nx] !== side) break;
        line.push({ x: nx, y: ny });
        c++;
        i++;
      }
      i = 1;
      while (true) {
        const nx = x - dx * i;
        const ny = y - dy * i;
        if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE || board[ny][nx] !== side) break;
        line.push({ x: nx, y: ny });
        c++;
        i++;
      }
      if (c >= 5) return { win: true, line };
    }
    return { win: false, line: [] };
  }

  function renderBoard(overrideBoard, overrideLastMove, winningLine = []) {
    const board = overrideBoard || state.board;
    const last = overrideLastMove === undefined ? state.lastMove : overrideLastMove;
    const ctx = ui.ctx;
    const w = ui.board.width;
    const h = ui.board.height;
    ctx.clearRect(0, 0, w, h);

    const wood = ctx.createLinearGradient(0, 0, 0, h);
    wood.addColorStop(0, '#ead098');
    wood.addColorStop(.48, '#dcb874');
    wood.addColorStop(1, '#cba25b');
    ctx.fillStyle = wood;
    roundRect(ctx, 0, 0, w, h, 24);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.085;
    for (let i = 0; i < 140; i++) {
      const y = (i / 140) * h;
      ctx.fillStyle = i % 3 === 0 ? '#6b4f1f' : '#8c6a31';
      ctx.fillRect(0, y, w, 1 + Math.random() * 2);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(67,46,20,.75)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const p = boardCoord(i);
      ctx.beginPath();
      ctx.moveTo(boardCoord(0), p);
      ctx.lineTo(boardCoord(BOARD_SIZE - 1), p);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p, boardCoord(0));
      ctx.lineTo(p, boardCoord(BOARD_SIZE - 1));
      ctx.stroke();
    }
    ctx.restore();

    STAR_POINTS.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(76,48,17,.85)';
      ctx.arc(boardCoord(x), boardCoord(y), 4.2, 0, Math.PI * 2);
      ctx.fill();
    });

    if (winningLine.length) {
      ctx.save();
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(83,229,160,.88)';
      ctx.shadowColor = 'rgba(83,229,160,.44)';
      ctx.shadowBlur = 18;
      const ordered = winningLine.sort((a, b) => a.x + a.y - (b.x + b.y));
      ctx.beginPath();
      ctx.moveTo(boardCoord(ordered[0].x), boardCoord(ordered[0].y));
      ctx.lineTo(boardCoord(ordered[ordered.length - 1].x), boardCoord(ordered[ordered.length - 1].y));
      ctx.stroke();
      ctx.restore();
    }

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (board[y][x] === EMPTY) continue;
        drawStone(ctx, boardCoord(x), boardCoord(y), board[y][x] === HUMAN ? 'black' : 'white');
      }
    }

    if (last) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = last.side === HUMAN ? 'rgba(255,187,77,.98)' : 'rgba(75,212,137,.98)';
      ctx.lineWidth = 3.5;
      ctx.arc(boardCoord(last.x), boardCoord(last.y), 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawStone(ctx, x, y, type) {
    const r = 19.5;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.28)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.2, x, y, r);
    if (type === 'black') {
      grad.addColorStop(0, '#4f5661');
      grad.addColorStop(0.35, '#1d232d');
      grad.addColorStop(1, '#06090f');
    } else {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.45, '#f2f2f2');
      grad.addColorStop(1, '#cfd3d9');
    }
    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.strokeStyle = type === 'black' ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.12)';
    ctx.lineWidth = 1.2;
    ctx.arc(x, y, r - 0.4, 0, Math.PI * 2);
    ctx.stroke();

    const shine = ctx.createRadialGradient(x - 7, y - 8, 1, x - 7, y - 8, 12);
    shine.addColorStop(0, type === 'black' ? 'rgba(255,255,255,.24)' : 'rgba(255,255,255,.92)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.fillStyle = shine;
    ctx.arc(x - 5, y - 6, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function startReview() {
    if (!state.review.length) return;
    state.reviewIndex = 0;
    renderBoard(state.review[0].board, state.review[0].lastMove);
    syncUI();
  }

  function boot() {
    restore();
    createShell();
    syncUI();
    renderLeaderboard();
    newGame();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
