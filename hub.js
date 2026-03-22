
(() => {
  const APP_NAME = 'FA OMOK';
  const STORAGE_KEY = 'fa_omok_state_v2';
  const PROFILE_KEY = 'fa_omok_profile_v2';
  const LEADERBOARD_KEY = 'fa_omok_board_v3';
  const BOARD_SIZE = 15;
  const CELL = 44;
  const PADDING = 36;
  const CANVAS_SIZE = PADDING * 2 + CELL * (BOARD_SIZE - 1);
  const HUMAN = 1;
  const AI = 2;
  const EMPTY = 0;
  const STAR_POINTS = [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]];
  const RANKS = ['10k','9k','8k','7k','6k','5k','4k','3k','2k','1k','1d','2d','3d','4d','5d','6d','7d','8d','9d'];
  const DEFAULT_AVATARS = ['🐻','🐼','🦊','🐯','🐨','🐶','🐱','🐹'];

  const FirebaseLeaderboardAdapter = {
    mode: 'local-ready',
    async fetchTop(limit = 50) {
      return getLocalLeaderboard().slice(0, limit);
    },
    async saveEntry(entry) {
      upsertLocalLeaderboard(entry);
      return true;
    },
    async nameExists(nickname, excludeId) {
      const lower = String(nickname || '').trim().toLowerCase();
      return getLocalLeaderboard().some(v => String(v.nickname || '').trim().toLowerCase() === lower && v.id !== excludeId);
    }
  };

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
    bestStreak: 0,
    totalWins: 0,
    totalLosses: 0,
    totalGames: 0,
    review: [],
    reviewIndex: 0,
    soundsReady: false,
    started: false,
    paused: false,
    phase: 'intro',
    winningLine: [],
    remoteAdapter: FirebaseLeaderboardAdapter,
    leaderboardCache: [],
    fullscreenRequested: false,
    lastResult: null,
    lobbyConfirmed: false
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

  function getSavedProfile() {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function saveState() {
    const payload = {
      streak: state.streak,
      bestStreak: state.bestStreak,
      totalWins: state.totalWins,
      totalLosses: state.totalLosses,
      totalGames: state.totalGames
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    if (state.profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile));
  }

  function ensureViewportLock() {
    let meta = document.querySelector('meta[name=viewport]');
    const content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }

  function sanitizeLeaderboardEntries(entries) {
    const seen = new Set();
    return (Array.isArray(entries) ? entries : []).filter(v => {
      if (!v || !v.id || !v.nickname) return false;
      if (Number(v.totalGames || 0) <= 0) return false;
      const name = String(v.nickname || '').trim();
      if (!name) return false;
      if (/^player\s*\d+$/i.test(name)) return false;
      if (/^(bot|ai|cpu|guest)$/i.test(name)) return false;
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    }).sort(compareLeaderboard);
  }

  function getLocalLeaderboard() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
      if (Array.isArray(parsed)) {
        const cleaned = sanitizeLeaderboardEntries(parsed);
        if (cleaned.length !== parsed.length) setLocalLeaderboard(cleaned);
        return cleaned;
      }
    } catch {}
    return [];
  }

  function setLocalLeaderboard(entries) {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sanitizeLeaderboardEntries(entries).slice(0, 500)));
  }

  function upsertLocalLeaderboard(entry) {
    const board = getLocalLeaderboard();
    const idx = board.findIndex(v => v.id === entry.id);
    if (idx >= 0) board[idx] = entry;
    else board.push(entry);
    board.sort(compareLeaderboard);
    setLocalLeaderboard(board);
    state.leaderboardCache = board.slice(0, 50);
  }

  function compareLeaderboard(a, b) {
    const ra = rankIndex(a.rank);
    const rb = rankIndex(b.rank);
    if (ra !== rb) return rb - ra;
    if ((b.totalWins || 0) !== (a.totalWins || 0)) return (b.totalWins || 0) - (a.totalWins || 0);
    if ((b.bestStreak || 0) !== (a.bestStreak || 0)) return (b.bestStreak || 0) - (a.bestStreak || 0);
    if ((b.totalGames || 0) !== (a.totalGames || 0)) return (b.totalGames || 0) - (a.totalGames || 0);
    return String(a.nickname || '').localeCompare(String(b.nickname || ''));
  }

  function rankIndex(rank) {
    const idx = RANKS.indexOf(rank);
    return idx < 0 ? 0 : idx;
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
    return { rank, current, need, max: 5 };
  }

  function getAvatarBySeed(seed) {
    if (!seed) return DEFAULT_AVATARS[0];
    let n = 0;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) n += s.charCodeAt(i);
    return DEFAULT_AVATARS[n % DEFAULT_AVATARS.length];
  }

  function restore() {
    const saved = getSavedState();
    const profile = getSavedProfile();
    if (saved) {
      state.streak = saved.streak || 0;
      state.bestStreak = saved.bestStreak || 0;
      state.totalWins = saved.totalWins || 0;
      state.totalLosses = saved.totalLosses || 0;
      state.totalGames = saved.totalGames || 0;
    }
    if (profile && profile.id && profile.nickname) {
      state.profile = profile;
      state.profile.rank = getRankFromWins(state.totalWins);
      state.profile.avatar = state.profile.avatar || getAvatarBySeed(profile.id);
    }
    state.leaderboardCache = getLocalLeaderboard().slice(0, 50);
  }

  function createShell() {
    document.body.style.margin = '0';
    document.body.style.background = '#05070c';
    document.body.style.fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    document.body.style.color = '#eef3ff';
    document.body.innerHTML = '';

    const root = document.createElement('div');
    root.id = 'fa-omok-app';
    root.innerHTML = `
      <div class="fa-wrap">
        <div class="fa-bg"></div>
        <div class="fa-grid"></div>

        <div class="fa-topbar">
          <div class="fa-brand">
            <div class="fa-brand-badge">FA</div>
            <div>
              <div class="fa-brand-title">${APP_NAME}</div>
              <div class="fa-brand-sub">Prestige Gomoku Arena</div>
            </div>
          </div>
          <div class="fa-top-actions">
            <button class="fa-btn ghost" id="fa-open-leaderboard">Leaderboard</button>
            <button class="fa-btn ghost" id="fa-pause-top-btn">Pause</button>
          </div>
        </div>

        <div class="fa-main">
          <div class="fa-left">
            <div class="fa-panel hero">
              <div class="fa-status-row">
                <div class="fa-player-card">
                  <div class="fa-avatar self" id="fa-self-avatar"></div>
                  <div class="fa-player-meta">
                    <div class="fa-name" id="fa-player-name">Guest</div>
                    <div class="fa-rank" id="fa-player-rank">10k</div>
                  </div>
                </div>
                <div class="fa-center-vs">
                  <div class="fa-turn" id="fa-turn-label">Press Start</div>
                  <div class="fa-streak" id="fa-streak-label">Win Streak 0</div>
                </div>
                <div class="fa-player-card ai">
                  <div class="fa-player-meta right">
                    <div class="fa-name">FA AI</div>
                    <div class="fa-rank" id="fa-ai-rank">Calm</div>
                  </div>
                  <div class="fa-avatar bot"></div>
                </div>
              </div>

              <div class="fa-board-wrap" id="fa-board-wrap">
                <canvas id="fa-board" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"></canvas>

                <div class="fa-stage fa-intro" id="fa-start-screen">
                  <div class="fa-stage-card lobby">
                    <div class="fa-stage-eyebrow">RANKED MATCH</div>
                    <div class="fa-stage-title">Enter the Arena</div>
                    <div class="fa-stage-text" id="fa-lobby-text">
                      Create your name, step onto the board, and climb the rank ladder.
                    </div>
                    <div class="fa-lobby-result hidden" id="fa-lobby-result">
                      <div class="fa-lobby-result-title" id="fa-lobby-result-title">Last Match</div>
                      <div class="fa-lobby-result-text" id="fa-lobby-result-text">Ready for your next duel.</div>
                    </div>
                    <div class="fa-start-profile">
                      <div class="fa-avatar self large" id="fa-start-avatar"></div>
                      <div class="fa-start-fields">
                        <div id="fa-nickname-editor">
                          <label class="fa-input-label">Nickname</label>
                          <input id="fa-nickname" maxlength="18" autocomplete="off" spellcheck="false" placeholder="Enter nickname" />
                        </div>
                        <div class="fa-fixed-profile hidden" id="fa-fixed-profile">
                          <div class="fa-input-label">Nickname Locked</div>
                          <div class="fa-fixed-name" id="fa-fixed-name">Player</div>
                        </div>
                        <div class="fa-mini-note" id="fa-nick-note">This nickname will be used for ranking and future Firebase sync.</div>
                      </div>
                    </div>
                    <div class="fa-stage-actions" id="fa-lobby-confirm-actions">
                      <button class="fa-btn primary big" id="fa-confirm-profile-btn">Confirm</button>
                    </div>
                    <div class="fa-stage-actions hidden" id="fa-lobby-start-actions">
                      <button class="fa-btn primary big" id="fa-save-start">Game Start</button>
                      <button class="fa-btn ghost big mobile-only" id="fa-mobile-fullscreen-btn">Play Fullscreen</button>
                    </div>
                  </div>
                </div>

                <div class="fa-stage hidden" id="fa-pause-screen">
                  <div class="fa-stage-card compact">
                    <div class="fa-stage-eyebrow">MATCH PAUSED</div>
                    <div class="fa-stage-title" id="fa-pause-title">Game Paused</div>
                    <div class="fa-stage-text" id="fa-pause-text">Return to the board whenever you are ready.</div>
                    <div class="fa-stage-actions split">
                      <button class="fa-btn primary" id="fa-resume-btn">Resume</button>
                      <button class="fa-btn" id="fa-back-lobby-btn">Back to Lobby</button>
                    </div>
                  </div>
                </div>

                <div class="fa-overlay hidden" id="fa-overlay">
                  <div class="fa-overlay-card">
                    <div class="fa-overlay-title" id="fa-overlay-title">Victory</div>
                    <div class="fa-overlay-text" id="fa-overlay-text"></div>
                    <div class="fa-overlay-actions">
                      <button class="fa-btn primary" id="fa-rematch-btn">Play Again</button>
                      <button class="fa-btn" id="fa-review-btn">Review</button>
                      <button class="fa-btn ghost" id="fa-overlay-lobby-btn">Lobby</button>
                    </div>
                  </div>
                </div>

                <div class="fa-floating-game-actions hidden" id="fa-floating-game-actions">
                  <button class="fa-btn ghost" id="fa-floating-fullscreen">Fullscreen</button>
                  <button class="fa-btn ghost hidden" id="fa-floating-exit-fullscreen">Exit Fullscreen</button>
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
                  <button class="fa-btn" id="fa-newgame-btn">New Match</button>
                  <button class="fa-btn" id="fa-pause-btn">Pause</button>
                  <button class="fa-btn danger" id="fa-reset-score-btn">Reset Career</button>
                </div>
              </div>
            </div>
          </div>

          <div class="fa-right">
            <div class="fa-panel setup">
              <div class="fa-panel-title">Profile</div>
              <div class="fa-panel-sub">Leaderboard-ready profile for local play and Firebase sync.</div>
              <div class="fa-profile-inline">
                <div class="fa-avatar self" id="fa-side-avatar"></div>
                <div>
                  <div class="fa-name" id="fa-side-name">Guest</div>
                  <div class="fa-mini-note" id="fa-connection-note">Local ladder mode</div>
                </div>
              </div>
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
                <div class="fa-info-line"><span>Ranking</span><strong>Top 50 actual players</strong></div>
              </div>
            </div>

            <div class="fa-panel lb">
              <div class="fa-panel-title">Top 50</div>
              <div class="fa-panel-sub">Only profiles that actually played are listed.</div>
              <div class="fa-leader-scroll" id="fa-leader-preview"></div>
            </div>
          </div>
        </div>

        <div class="fa-modal hidden" id="fa-leaderboard-modal">
          <div class="fa-modal-card">
            <div class="fa-modal-head">
              <div>
                <div class="fa-modal-title">Leaderboard</div>
                <div class="fa-modal-sub">Ranked by grade, wins, and best streak</div>
              </div>
              <button class="fa-btn" id="fa-close-leaderboard">Close</button>
            </div>
            <div class="fa-modal-body" id="fa-leaderboard-list"></div>
          </div>
        </div>

        <div class="fa-modal hidden" id="fa-confirm-modal">
          <div class="fa-confirm-card">
            <div class="fa-confirm-icon">◆</div>
            <div class="fa-confirm-title" id="fa-confirm-title">Reset Career</div>
            <div class="fa-confirm-text" id="fa-confirm-text">Your wins, losses, and streak will be cleared.</div>
            <div class="fa-confirm-actions">
              <button class="fa-btn" id="fa-confirm-cancel">Cancel</button>
              <button class="fa-btn primary" id="fa-confirm-ok">Confirm</button>
            </div>
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
        --danger: #ff846d;
        --shadow: 0 24px 70px rgba(0,0,0,.46);
      }
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      .hidden { display: none !important; }
      html, body { min-height: 100%; }
      .fa-wrap { min-height: 100vh; position: relative; overflow: hidden; }
      .fa-bg {
        position: fixed; inset: 0;
        background:
          radial-gradient(circle at 12% 14%, rgba(246,204,119,.22), transparent 24%),
          radial-gradient(circle at 84% 12%, rgba(96,124,255,.18), transparent 26%),
          radial-gradient(circle at 74% 84%, rgba(82,214,154,.11), transparent 24%),
          radial-gradient(circle at 50% 50%, rgba(255,255,255,.03), transparent 48%),
          linear-gradient(180deg, #0a1018 0%, #090d14 36%, #05070c 100%);
        z-index: 0;
      }
      .fa-grid {
        position: fixed; inset: 0; pointer-events: none;
        background-image:
          linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
        background-size: 34px 34px;
        mask-image: radial-gradient(circle at center, rgba(0,0,0,.7), transparent 85%);
        z-index: 0;
      }
      .fa-topbar, .fa-main { position: relative; z-index: 1; }
      .fa-topbar {
        max-width: 1440px; margin: 0 auto; padding: 18px 22px;
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
      }
      .fa-top-actions { display: flex; gap: 10px; }
      .fa-brand { display: flex; align-items: center; gap: 14px; }
      .fa-brand-badge {
        width: 52px; height: 52px; border-radius: 16px;
        display: grid; place-items: center;
        background: linear-gradient(145deg, rgba(244,210,138,.95), rgba(166,128,59,.95));
        color: #101114; font-weight: 900; letter-spacing: .06em;
        box-shadow: 0 12px 28px rgba(213,178,108,.35), inset 0 1px 2px rgba(255,255,255,.55);
      }
      .fa-brand-title { font-size: 22px; font-weight: 900; letter-spacing: .05em; }
      .fa-brand-sub { font-size: 12px; color: var(--muted); letter-spacing: .18em; text-transform: uppercase; }
      .fa-main {
        max-width: 1440px; margin: 0 auto; padding: 8px 22px 28px;
        display: grid; grid-template-columns: minmax(0, 1.15fr) 380px; gap: 22px;
      }
      .fa-panel {
        background: linear-gradient(180deg, rgba(255,255,255,.085), rgba(255,255,255,.04));
        border: 1px solid var(--line);
        box-shadow: var(--shadow);
        border-radius: 26px;
        backdrop-filter: blur(18px);
      }
      .hero { padding: 18px; }
      .setup, .stats, .info, .lb { padding: 18px; }
      .fa-status-row {
        display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center; margin-bottom: 16px;
      }
      .fa-player-card {
        display: flex; align-items: center; gap: 12px;
        background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); border-radius: 20px; padding: 12px 14px;
      }
      .fa-player-card.ai { justify-content: flex-end; }
      .fa-player-meta.right { text-align: right; }
      .fa-avatar {
        width: 54px; height: 54px; border-radius: 17px;
        background: linear-gradient(145deg, rgba(255,255,255,.22), rgba(255,255,255,.05));
        border: 1px solid rgba(255,255,255,.12);
        position: relative;
        display: grid;
        place-items: center;
        overflow: hidden;
        color: #101318;
        font-weight: 900;
        font-size: 22px;
      }
      .fa-avatar.large { width: 72px; height: 72px; font-size: 30px; }
      .fa-avatar.self::before, .fa-avatar.bot::before {
        content: '';
        position: absolute; inset: 0;
        background:
          radial-gradient(circle at 35% 30%, rgba(255,255,255,.92), rgba(255,255,255,.18) 26%, transparent 27%),
          linear-gradient(145deg, rgba(236,221,187,.95), rgba(157,174,214,.28));
      }
      .fa-avatar.bot::before {
        background:
          radial-gradient(circle at 35% 30%, rgba(255,255,255,.68), rgba(255,255,255,.12) 26%, transparent 27%),
          linear-gradient(145deg, rgba(38,42,65,.95), rgba(164,176,206,.52));
      }
      .fa-avatar::after {
        content: attr(data-avatar);
        position: relative;
        z-index: 1;
        filter: drop-shadow(0 6px 10px rgba(0,0,0,.22));
      }
      .fa-avatar.self::after, .fa-avatar.bot::after { font-size: 24px; }
      .fa-avatar.large::after { font-size: 34px; }
      .fa-name { font-size: 16px; font-weight: 800; }
      .fa-rank { font-size: 13px; color: var(--gold2); margin-top: 2px; }
      .fa-center-vs { text-align: center; padding: 0 8px; }
      .fa-turn { font-weight: 900; font-size: 18px; letter-spacing: .02em; }
      .fa-streak { font-size: 13px; color: var(--muted); margin-top: 4px; }

      .fa-board-wrap {
        position: relative; width: 100%;
        display: flex; justify-content: center; align-items: center;
        padding: 14px 8px 10px; min-height: 720px;
        border-radius: 26px;
        overflow: hidden;
        touch-action: manipulation;
        background:
          linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,0)),
          radial-gradient(circle at center, rgba(255,255,255,.05), transparent 68%),
          linear-gradient(135deg, rgba(213,178,108,.06), rgba(255,255,255,0) 35%, rgba(88,109,255,.05) 100%);
      }
      .fa-board-wrap::before {
        content: '';
        position: absolute; inset: 0;
        background:
          radial-gradient(circle at 20% 15%, rgba(246,204,119,.08), transparent 18%),
          radial-gradient(circle at 80% 20%, rgba(74,112,255,.08), transparent 18%),
          radial-gradient(circle at 75% 85%, rgba(82,214,154,.08), transparent 18%);
        pointer-events: none;
      }
      #fa-board {
        width: min(100%, 820px); height: auto; display: block;
        border-radius: 24px; box-shadow: 0 25px 70px rgba(0,0,0,.4);
        background: #d8bc80;
        touch-action: manipulation;
      }

      .fa-stage, .fa-overlay {
        position: absolute; inset: 0; display: grid; place-items: center;
        background: linear-gradient(180deg, rgba(6,10,18,.35), rgba(4,7,12,.56));
        padding: 18px;
      }
      .fa-stage.hidden, .fa-overlay.hidden, .fa-modal.hidden, .fa-floating-game-actions.hidden { display: none; }
      .fa-stage-card, .fa-overlay-card, .fa-confirm-card {
        width: min(100%, 520px); padding: 24px; border-radius: 28px;
        background: linear-gradient(180deg, rgba(16,20,30,.92), rgba(9,12,19,.96));
        border: 1px solid rgba(255,255,255,.09); box-shadow: var(--shadow);
        text-align: center;
      }
      .fa-stage-card.compact { width: min(100%, 420px); }
      .fa-stage-card.lobby { width: min(100%, 560px); }
      .fa-lobby-result {
        margin-top: 16px; padding: 14px 16px; border-radius: 20px;
        border: 1px solid rgba(255,255,255,.09); background: rgba(255,255,255,.05);
      }
      .fa-lobby-result.hidden { display: none; }
      .fa-lobby-result-title { font-size: 12px; letter-spacing: .18em; text-transform: uppercase; color: var(--gold2); font-weight: 900; }
      .fa-lobby-result-text { margin-top: 8px; color: #f1f4fb; font-size: 14px; line-height: 1.5; }
      .mobile-only { display: none; }
      .fa-stage-eyebrow {
        color: var(--gold2); font-size: 12px; font-weight: 800; letter-spacing: .22em; text-transform: uppercase;
      }
      .fa-stage-title, .fa-overlay-title, .fa-confirm-title {
        font-size: 30px; font-weight: 900; letter-spacing: .03em; margin-top: 10px;
      }
      .fa-stage-text, .fa-overlay-text, .fa-confirm-text {
        font-size: 14px; color: var(--muted); margin-top: 12px; line-height: 1.6;
      }
      .fa-start-profile {
        margin-top: 18px; display: flex; align-items: center; gap: 16px;
        padding: 16px; border-radius: 22px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.04);
        text-align: left;
      }
      .fa-start-fields { flex: 1; min-width: 0; }
      .fa-input-label {
        display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .16em;
        color: var(--muted); margin-bottom: 8px;
      }
      #fa-nickname {
        width: 100%; height: 52px; border-radius: 16px; padding: 0 16px;
        border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.045); color: #f4f7ff;
        font-size: 15px; outline: none;
      }
      .fa-fixed-profile.hidden { display: none; }
      .fa-fixed-profile {
        padding: 12px 14px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.05);
      }
      .fa-fixed-name {
        margin-top: 2px;
        font-size: 18px;
        font-weight: 900;
        color: #f4f7ff;
        letter-spacing: .02em;
      }
      .fa-stage-actions, .fa-overlay-actions, .fa-confirm-actions {
        display: flex; justify-content: center; gap: 12px; margin-top: 20px; flex-wrap: wrap;
      }
      .fa-stage-actions.split .fa-btn { min-width: 140px; }

      .fa-floating-game-actions {
        position: absolute;
        right: 18px;
        bottom: 18px;
        z-index: 3;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .fa-floating-game-actions .fa-btn {
        min-width: 152px;
        backdrop-filter: blur(12px);
        background: rgba(11,15,24,.66);
      }

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
      .fa-actions { display: flex; gap: 10px; flex-wrap: wrap; }
      .fa-btn {
        appearance: none; border: 1px solid rgba(255,255,255,.12); outline: none;
        background: rgba(255,255,255,.06); color: #ecf2ff; border-radius: 16px; padding: 12px 16px;
        font-weight: 800; cursor: pointer; transition: .2s ease; box-shadow: 0 10px 24px rgba(0,0,0,.18);
      }
      .fa-btn:hover { transform: translateY(-1px); background: rgba(255,255,255,.08); }
      .fa-btn.primary {
        background: linear-gradient(145deg, rgba(214,180,109,.98), rgba(126,98,43,.98));
        color: #121316; border-color: rgba(255,230,181,.36);
      }
      .fa-btn.danger { border-color: rgba(255,132,109,.28); color: #ffd3c8; }
      .fa-btn.ghost { background: rgba(255,255,255,.03); }
      .fa-btn.big { min-width: 180px; padding: 14px 20px; }
      .fa-panel-title { font-weight: 900; font-size: 18px; }
      .fa-panel-sub, .fa-mini-note { font-size: 13px; color: var(--muted); margin-top: 6px; }
      .fa-profile-inline {
        margin-top: 14px; display: flex; align-items: center; gap: 12px; padding: 12px 14px;
        background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 18px;
      }
      .fa-stats-grid { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
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
      .fa-leader-scroll::-webkit-scrollbar-thumb, .fa-modal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.14); border-radius: 999px; }
      .fa-rank-row {
        display: grid; grid-template-columns: 48px 1fr auto; gap: 10px; align-items: center;
        padding: 12px 12px; border-radius: 18px; margin-bottom: 10px; background: rgba(255,255,255,.04);
        border: 1px solid rgba(255,255,255,.07);
      }
      .fa-rank-pos {
        width: 38px; height: 38px; border-radius: 14px; display: grid; place-items: center;
        background: linear-gradient(145deg, rgba(255,255,255,.15), rgba(255,255,255,.04)); font-weight: 900;
      }
      .fa-rank-pos.crown-top { background: linear-gradient(145deg, rgba(245,214,135,.96), rgba(160,121,42,.92)); color: #16181d; box-shadow: 0 10px 24px rgba(213,178,108,.28); }
      .fa-rank-pos.crown-sub { background: linear-gradient(145deg, rgba(224,233,255,.92), rgba(125,141,182,.74)); color: #131722; box-shadow: 0 10px 24px rgba(120,138,188,.22); }
      .fa-rank-main { min-width: 0; }
      .fa-rank-name { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .fa-rank-sub { color: var(--muted); font-size: 12px; margin-top: 4px; }
      .fa-rank-badge {
        min-width: 68px; text-align: center; padding: 8px 10px; border-radius: 999px;
        background: rgba(213,178,108,.14); color: #f0d79d; font-weight: 800; border: 1px solid rgba(213,178,108,.24);
      }
      .fa-modal {
        position: fixed; inset: 0; background: rgba(3,6,12,.64); display: grid; place-items: center; padding: 22px; z-index: 10;
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
      .fa-confirm-card { width: min(100%, 420px); }
      .fa-confirm-icon {
        width: 62px; height: 62px; margin: 0 auto;
        display: grid; place-items: center; border-radius: 20px;
        background: linear-gradient(145deg, rgba(214,180,109,.98), rgba(126,98,43,.98));
        color: #121316; font-size: 26px; font-weight: 900;
      }

      body.fa-mobile-fullscreen .fa-topbar,
      body.fa-mobile-fullscreen .fa-right,
      body.fa-mobile-fullscreen .fa-bottom,
      body.fa-mobile-fullscreen .fa-status-row {
        display: none !important;
      }
      body.fa-mobile-fullscreen .fa-main {
        display: block;
        max-width: 100%;
        padding: 0;
      }
      body.fa-mobile-fullscreen .fa-panel.hero {
        padding: 0;
        border-radius: 0;
        border: 0;
        min-height: 100vh;
        background: #05070c;
      }
      body.fa-mobile-fullscreen .fa-board-wrap {
        min-height: 100vh;
        border-radius: 0;
        padding: 10px;
      }
      body.fa-mobile-fullscreen #fa-board {
        width: min(100vw - 20px, 100vh - 20px);
      }

      @media (max-width: 1120px) {
        .fa-main { grid-template-columns: 1fr; }
      }
      @media (max-width: 740px) {
        .fa-floating-game-actions { right: 12px; bottom: 12px; }
        .fa-floating-game-actions .fa-btn { min-width: 138px; padding: 11px 14px; }
        .mobile-only { display: inline-flex; }
        .fa-topbar { padding: 14px; }
        .fa-main { padding: 6px 14px 18px; gap: 14px; }
        .hero, .setup, .stats, .info, .lb { padding: 14px; border-radius: 22px; }
        .fa-status-row { grid-template-columns: 1fr; }
        .fa-center-vs { order: -1; }
        .fa-bottom { flex-direction: column; align-items: stretch; }
        .fa-actions { width: 100%; }
        .fa-actions .fa-btn { flex: 1; }
        .fa-brand-title { font-size: 18px; }
        .fa-modal { padding: 14px; }
        .fa-modal-head { padding: 14px; }
        .fa-modal-body { padding: 14px; }
        .fa-rank-row { grid-template-columns: 42px 1fr auto; padding: 11px; }
        .fa-start-profile { flex-direction: column; text-align: center; }
        .fa-start-fields { width: 100%; text-align: left; }
        .fa-board-wrap { min-height: 72vh; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(root);

    ui.root = root;
    ui.boardWrap = root.querySelector('#fa-board-wrap');
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
    ui.nicknameEditor = root.querySelector('#fa-nickname-editor');
    ui.fixedProfile = root.querySelector('#fa-fixed-profile');
    ui.fixedName = root.querySelector('#fa-fixed-name');
    ui.selfAvatar = root.querySelector('#fa-self-avatar');
    ui.startAvatar = root.querySelector('#fa-start-avatar');
    ui.sideAvatar = root.querySelector('#fa-side-avatar');
    ui.sideName = root.querySelector('#fa-side-name');
    ui.connectionNote = root.querySelector('#fa-connection-note');
    ui.leaderPreview = root.querySelector('#fa-leader-preview');
    ui.leaderModal = root.querySelector('#fa-leaderboard-modal');
    ui.leaderList = root.querySelector('#fa-leaderboard-list');
    ui.startScreen = root.querySelector('#fa-start-screen');
    ui.pauseScreen = root.querySelector('#fa-pause-screen');
    ui.pauseTitle = root.querySelector('#fa-pause-title');
    ui.pauseText = root.querySelector('#fa-pause-text');
    ui.confirmModal = root.querySelector('#fa-confirm-modal');
    ui.confirmTitle = root.querySelector('#fa-confirm-title');
    ui.confirmText = root.querySelector('#fa-confirm-text');
    ui.lobbyText = root.querySelector('#fa-lobby-text');
    ui.lobbyResult = root.querySelector('#fa-lobby-result');
    ui.lobbyResultTitle = root.querySelector('#fa-lobby-result-title');
    ui.lobbyResultText = root.querySelector('#fa-lobby-result-text');
    ui.lobbyConfirmActions = root.querySelector('#fa-lobby-confirm-actions');
    ui.lobbyStartActions = root.querySelector('#fa-lobby-start-actions');
    ui.confirmProfileBtn = root.querySelector('#fa-confirm-profile-btn');
    ui.floatingGameActions = root.querySelector('#fa-floating-game-actions');
    ui.floatingFullscreen = root.querySelector('#fa-floating-fullscreen');
    ui.floatingExitFullscreen = root.querySelector('#fa-floating-exit-fullscreen');

    root.querySelector('#fa-open-leaderboard').addEventListener('click', openLeaderboard);
    root.querySelector('#fa-close-leaderboard').addEventListener('click', closeLeaderboard);
    root.querySelector('#fa-save-start').addEventListener('click', startGameFromLobby);
    root.querySelector('#fa-confirm-profile-btn').addEventListener('click', confirmLobbyProfile);
    root.querySelector('#fa-newgame-btn').addEventListener('click', handleNewMatch);
    root.querySelector('#fa-rematch-btn').addEventListener('click', () => { closeOverlay(); prepareMatch(); });
    root.querySelector('#fa-overlay-lobby-btn').addEventListener('click', backToLobby);
    root.querySelector('#fa-review-btn').addEventListener('click', startReview);
    root.querySelector('#fa-reset-score-btn').addEventListener('click', resetCareer);
    root.querySelector('#fa-pause-btn').addEventListener('click', togglePause);
    root.querySelector('#fa-pause-top-btn').addEventListener('click', togglePause);
    root.querySelector('#fa-resume-btn').addEventListener('click', resumeGame);
    root.querySelector('#fa-back-lobby-btn').addEventListener('click', backToLobby);
    root.querySelector('#fa-confirm-cancel').addEventListener('click', closeConfirm);
    root.querySelector('#fa-mobile-fullscreen-btn').addEventListener('click', () => { requestMobileFullscreen(true); startGameFromLobby(); });
    root.querySelector('#fa-floating-fullscreen').addEventListener('click', () => requestMobileFullscreen(true));
    root.querySelector('#fa-floating-exit-fullscreen').addEventListener('click', exitMobileFullscreen);

    ui.board.addEventListener('click', onBoardClick);
    ui.board.addEventListener('dblclick', e => e.preventDefault());
    ui.board.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
    ui.nickInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') confirmLobbyProfile();
    });
    ui.leaderModal.addEventListener('click', e => {
      if (e.target === ui.leaderModal) closeLeaderboard();
    });
    ui.confirmModal.addEventListener('click', e => {
      if (e.target === ui.confirmModal) closeConfirm();
    });
    window.addEventListener('keydown', onGlobalKey);
    window.addEventListener('resize', () => {
      updateMobileMode();
      renderBoard();
    });
    document.addEventListener('fullscreenchange', updateFullscreenButtons);
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

  function updateLobbyProfileUI() {
    const locked = !!(state.profile && state.profile.nickname);
    if (ui.nicknameEditor) ui.nicknameEditor.classList.toggle('hidden', locked);
    if (ui.fixedProfile) ui.fixedProfile.classList.toggle('hidden', !locked);
    if (ui.fixedName) ui.fixedName.textContent = locked ? state.profile.nickname : 'Player';
    if (locked) {
      state.lobbyConfirmed = true;
      if (ui.nickNote) ui.nickNote.textContent = 'Nickname is locked. You can start immediately.';
    } else if (ui.nickNote) {
      ui.nickNote.textContent = 'This nickname will be used for ranking and future Firebase sync.';
    }
  }

  async function confirmLobbyProfile() {
    const nickname = (ui.nickInput.value || '').trim();
    if (!/^[A-Za-z0-9 _.-]{2,18}$/.test(nickname)) {
      ui.nickNote.textContent = 'Use 2 to 18 letters or numbers.';
      state.lobbyConfirmed = false;
      syncLobbyActions();
      return false;
    }

    const existingProfile = state.profile;
    if (existingProfile && existingProfile.nickname && existingProfile.nickname !== nickname) {
      state.profile.nickname = nickname;
      state.profile.avatar = state.profile.avatar || getAvatarBySeed(state.profile.id);
    }

    if (!state.profile) {
      const id = uid();
      state.profile = {
        id,
        nickname,
        avatar: getAvatarBySeed(id),
        rank: getRankFromWins(state.totalWins),
        provider: 'local'
      };
    } else {
      state.profile.nickname = nickname;
      state.profile.avatar = state.profile.avatar || getAvatarBySeed(state.profile.id);
    }

    const duplicated = await state.remoteAdapter.nameExists(state.profile.nickname, state.profile.id);
    if (duplicated) {
      ui.nickNote.textContent = 'Nickname already exists on the ladder.';
      state.lobbyConfirmed = false;
      syncLobbyActions();
      return false;
    }

    state.lobbyConfirmed = true;
    saveState();
    renderLobbyStatus();
    updateAvatars();
    updateLobbyProfileUI();
    syncLobbyActions();
    updateFullscreenButtons();
    ui.nickNote.textContent = 'Nickname locked. Press Game Start, or use Play Fullscreen on mobile.';
    syncLobbyActions();
    syncUI();
    return true;
  }

  async function startGameFromLobby() {
    if (!state.lobbyConfirmed) {
      const ok = await confirmLobbyProfile();
      if (!ok) return;
    }
    state.started = true;
    state.phase = 'playing';
    state.paused = false;
    renderLobbyStatus();
    updateAvatars();
    updateLobbyProfileUI();
    syncLobbyActions();
    updateFullscreenButtons();
    closeStartScreen();
    prepareMatch();
    requestMobileFullscreen(state.fullscreenRequested);
    syncUI();
  }

  function syncLobbyActions() {
    if (!ui.lobbyConfirmActions || !ui.lobbyStartActions) return;
    ui.lobbyConfirmActions.classList.toggle('hidden', !!state.lobbyConfirmed);
    ui.lobbyStartActions.classList.toggle('hidden', !state.lobbyConfirmed);
  }

  function updateFullscreenButtons() {
    if (!ui.floatingGameActions) return;
    const showFloating = state.phase === 'playing' && !state.gameOver && state.started;
    ui.floatingGameActions.classList.toggle('hidden', !showFloating);
    const isFs = !!document.fullscreenElement || document.body.classList.contains('fa-mobile-fullscreen');
    ui.floatingFullscreen.classList.toggle('hidden', isFs);
    ui.floatingExitFullscreen.classList.toggle('hidden', !isFs);
  }

  function handleNewMatch() {
    if (!state.profile) {
      openStartScreen();
      return;
    }
    if (!state.started || state.phase === 'intro') {
      closeStartScreen();
    }
    prepareMatch();
  }

  function prepareMatch() {
    state.board = createBoard();
    state.turn = HUMAN;
    state.gameOver = false;
    state.winner = 0;
    state.lastMove = null;
    state.pendingLock = false;
    state.moveCount = 0;
    state.review = [];
    state.reviewIndex = 0;
    state.winningLine = [];
    state.paused = false;
    state.started = true;
    state.phase = 'playing';
    closePauseScreen();
    closeOverlay();
    updateMobileMode();
    syncUI();
    renderBoard();
  }

  function togglePause() {
    if (!state.started || state.gameOver || state.phase === 'intro') return;
    if (state.paused) resumeGame();
    else pauseGame('Game Paused', 'Your match is safely on hold.');
  }

  function pauseGame(title, text) {
    state.paused = true;
    state.phase = 'paused';
    ui.pauseTitle.textContent = title;
    ui.pauseText.textContent = text;
    ui.pauseScreen.classList.remove('hidden');
    updateMobileMode();
    syncUI();
  }

  function resumeGame() {
    if (!state.started) return;
    state.paused = false;
    state.phase = 'playing';
    closePauseScreen();
    updateMobileMode();
    syncUI();
    renderBoard();
  }

  function backToLobby() {
    state.lobbyConfirmed = !!(state.profile && state.profile.nickname);
    state.paused = false;
    state.started = false;
    state.phase = 'intro';
    closePauseScreen();
    closeOverlay();
    exitMobileFullscreen();
    openStartScreen();
    renderLeaderboard();
    syncUI();
  }

  function openStartScreen() {
    ui.startScreen.classList.remove('hidden');
    state.phase = 'intro';
    state.started = false;
    state.lobbyConfirmed = !!(state.profile && state.profile.nickname);
    updateLobbyProfileUI();
    renderLobbyStatus();
    syncLobbyActions();
    syncUI();
  }

  function closeStartScreen() {
    ui.startScreen.classList.add('hidden');
  }

  function closePauseScreen() {
    ui.pauseScreen.classList.add('hidden');
  }

  function closeOverlay() {
    ui.overlay.classList.add('hidden');
  }

  function showOverlay(title, text) {
    ui.overlayTitle.textContent = title;
    ui.overlayText.textContent = text;
    ui.overlay.classList.remove('hidden');
  }

  function renderLobbyStatus() {
    if (!ui.lobbyResult) return;
    const result = state.lastResult;
    const summary = `Record ${state.totalWins}W · ${state.totalLosses}L · Best Streak ${state.bestStreak}`;
    ui.lobbyText.textContent = state.profile ? 'Press the center button to begin your next ranked match.' : 'Create your name, then begin your climb on the ladder.';
    if (!result) {
      ui.lobbyResult.classList.add('hidden');
      return;
    }
    ui.lobbyResult.classList.remove('hidden');
    ui.lobbyResultTitle.textContent = result.title;
    ui.lobbyResultText.textContent = `${result.text} · ${summary}`;
  }

  function openConfirm({ title, text, onConfirm }) {
    ui.confirmTitle.textContent = title;
    ui.confirmText.textContent = text;
    ui.confirmModal.classList.remove('hidden');
    const ok = ui.root.querySelector('#fa-confirm-ok');
    ok.onclick = () => {
      closeConfirm();
      if (typeof onConfirm === 'function') onConfirm();
    };
  }

  function closeConfirm() {
    ui.confirmModal.classList.add('hidden');
  }

  function resetCareer() {
    openConfirm({
      title: 'Reset Career',
      text: 'Wins, losses, games, and streak will be erased. Your nickname will stay.',
      onConfirm: () => {
        state.streak = 0;
        state.bestStreak = 0;
        state.totalWins = 0;
        state.totalLosses = 0;
        state.totalGames = 0;
        if (state.profile) state.profile.rank = getRankFromWins(0);
        saveState();
        syncProfileToLeaderboard();
        syncUI();
        renderLeaderboard();
        prepareMatch();
      }
    });
  }

  function syncUI() {
    const rank = getRankFromWins(state.totalWins);
    if (state.profile) state.profile.rank = rank;

    ui.playerName.textContent = state.profile ? state.profile.nickname : 'Guest';
    ui.playerRank.textContent = rank;
    ui.sideName.textContent = state.profile ? state.profile.nickname : 'Guest';
    ui.aiRank.textContent = getAiTitle();
    ui.streakLabel.textContent = 'Win Streak ' + state.streak;

    let turnText = 'Press Start';
    if (state.phase === 'intro') turnText = 'Press Start';
    else if (state.phase === 'paused') turnText = 'Paused';
    else if (state.gameOver) {
      turnText = state.winner === HUMAN ? 'Victory' : state.winner === AI ? 'Defeat' : 'Draw';
    } else {
      turnText = state.turn === HUMAN ? 'Your Move' : 'AI Thinking';
    }
    ui.turnLabel.textContent = turnText;

    const progress = getNextRankProgress(state.totalWins);
    ui.progressRank.textContent = progress.rank;
    ui.progressText.textContent = progress.need === 0 ? 'Max rank reached' : `${progress.current} / ${progress.max} wins`;
    ui.progressFill.style.width = `${progress.need === 0 ? 100 : (progress.current / progress.max) * 100}%`;

    ui.totalWins.textContent = String(state.totalWins);
    ui.totalLosses.textContent = String(state.totalLosses);
    ui.totalGames.textContent = String(state.totalGames);
    ui.bestTier.textContent = String(state.bestStreak);
    ui.scaleLine.textContent = getAiTitle();
    ui.reviewLine.textContent = state.review.length ? `${state.reviewIndex + 1} / ${state.review.length}` : 'Ready';
    ui.connectionNote.textContent = state.remoteAdapter.mode === 'local-ready' ? 'Local ladder mode · Firebase ready' : 'Firebase connected';
    syncLobbyActions();
    updateFullscreenButtons();

    if (state.profile) {
      ui.nickInput.value = state.profile.nickname || '';
      ui.nickNote.textContent = 'Ready for local ranking and future Firebase sync.';
    } else {
      ui.nickInput.value = '';
    }

    renderLobbyStatus();
    updateAvatars();
    updateLobbyProfileUI();
    syncLobbyActions();
    updateFullscreenButtons();
  }

  function updateAvatars() {
    const avatar = state.profile ? (state.profile.avatar || getAvatarBySeed(state.profile.id)) : '🐻';
    [ui.selfAvatar, ui.startAvatar, ui.sideAvatar].forEach(el => {
      if (!el) return;
      el.setAttribute('data-avatar', avatar);
    });
    const bot = ui.root.querySelector('.fa-avatar.bot');
    if (bot) bot.setAttribute('data-avatar', '🤖');
  }

  async function syncProfileToLeaderboard() {
    if (!state.profile || state.totalGames <= 0) return;
    const entry = {
      id: state.profile.id,
      nickname: state.profile.nickname,
      avatar: state.profile.avatar,
      totalWins: state.totalWins,
      totalLosses: state.totalLosses,
      totalGames: state.totalGames,
      rank: getRankFromWins(state.totalWins),
      streak: state.streak,
      bestStreak: state.bestStreak
    };
    await state.remoteAdapter.saveEntry(entry);
    state.leaderboardCache = await state.remoteAdapter.fetchTop(50);
  }

  async function openLeaderboard() {
    await renderLeaderboard(true);
    ui.leaderModal.classList.remove('hidden');
  }

  function closeLeaderboard() {
    ui.leaderModal.classList.add('hidden');
  }

  async function renderLeaderboard(full = false) {
    let board = [];
    try {
      board = await state.remoteAdapter.fetchTop(50);
    } catch {
      board = getLocalLeaderboard().slice(0, 50);
    }
    state.leaderboardCache = board;

    const rankMark = i => {
      if (i < 3) return { cls: 'crown-top', label: '👑' };
      if (i < 6) return { cls: 'crown-sub', label: '♕' };
      return { cls: '', label: String(i + 1) };
    };

    const buildRow = (p, i) => {
      const mark = rankMark(i);
      return `
      <div class="fa-rank-row">
        <div class="fa-rank-pos ${mark.cls}">${mark.label}</div>
        <div class="fa-rank-main">
          <div class="fa-rank-name">${escapeHtml(p.nickname)}</div>
          <div class="fa-rank-sub">${p.totalGames || 0} games · ${p.totalWins || 0} wins · best streak ${p.bestStreak || 0}</div>
        </div>
        <div class="fa-rank-badge">${escapeHtml(p.rank || '10k')}</div>
      </div>
    `;
    };

    const empty = `
      <div class="fa-rank-row">
        <div class="fa-rank-pos">—</div>
        <div class="fa-rank-main">
          <div class="fa-rank-name">No ranked players yet</div>
          <div class="fa-rank-sub">Only players who actually play a match appear here.</div>
        </div>
        <div class="fa-rank-badge">Waiting</div>
      </div>
    `;

    ui.leaderPreview.innerHTML = board.length ? board.map(buildRow).join('') : empty;
    if (full) ui.leaderList.innerHTML = board.length ? board.map(buildRow).join('') : empty;
  }

  function escapeHtml(v) {
    return String(v).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  let lastTouchEndTime = 0;

  function preventDoubleTapZoom(e) {
    const now = Date.now();
    if (now - lastTouchEndTime <= 320) e.preventDefault();
    lastTouchEndTime = now;
  }

  function onGlobalKey(e) {
    if (e.key.toLowerCase() === 'l') {
      if (ui.leaderModal.classList.contains('hidden')) openLeaderboard();
      else closeLeaderboard();
    }
    if (e.key.toLowerCase() === 'n') handleNewMatch();
    if (e.key.toLowerCase() === 'p') togglePause();

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
    if (!state.profile) {
      openStartScreen();
      return;
    }
    if (!state.started || state.phase !== 'playing' || state.turn !== HUMAN || state.gameOver || state.pendingLock || state.paused) return;

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
      state.winningLine = result.line;
      finishGame(side, result.line);
      return;
    }
    if (isFull(state.board)) {
      state.gameOver = true;
      state.winner = 0;
      state.winningLine = [];
      finishGame(0, []);
      return;
    }
    state.turn = side === HUMAN ? AI : HUMAN;
    syncUI();
  }

  async function finishGame(winner, line) {
    state.pendingLock = false;
    state.totalGames += 1;
    let title = 'Draw';
    let text = 'No winner this round.';
    if (winner === HUMAN) {
      state.totalWins += 1;
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      title = 'Victory!';
      text = `Elegant finish. Rank ${getRankFromWins(state.totalWins)} · Streak ${state.streak}`;
      fanfare(true);
    } else if (winner === AI) {
      state.totalLosses += 1;
      state.streak = 0;
      title = 'Defeat!';
      text = `The AI held the line. Rank ${getRankFromWins(state.totalWins)} · Challenge ${getAiTitle()}`;
      fanfare(false);
    }
    saveState();
    await syncProfileToLeaderboard();
    state.lastResult = { title, text };
    state.paused = false;
    state.phase = 'intro';
    state.started = false;
    closePauseScreen();
    closeOverlay();
    syncUI();
    await renderLeaderboard();
    renderBoard(undefined, undefined, line);
    exitMobileFullscreen();
    openStartScreen();
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
    if (state.gameOver || state.phase !== 'playing') return;
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
      total += patternScore(info.count, info.openEnds, info.gap);
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

    return { count, openEnds, gap };
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
      ctx.fillRect(0, y, w, 1 + ((i % 5) * 0.4));
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
      const ordered = winningLine.slice().sort((a, b) => a.x + a.y - (b.x + b.y));
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

  function requestMobileFullscreen(force = false) {
    if (window.innerWidth > 740) return;
    if (!force && !state.fullscreenRequested) return;
    document.body.classList.add('fa-mobile-fullscreen');
    state.fullscreenRequested = !!force || state.fullscreenRequested;
    const elem = document.documentElement;
    if (elem && elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }
    updateFullscreenButtons();
  }

  function exitMobileFullscreen() {
    document.body.classList.remove('fa-mobile-fullscreen');
    state.fullscreenRequested = false;
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    updateFullscreenButtons();
  }

  function updateMobileMode() {
    const should = window.innerWidth <= 740 && state.started && state.phase !== 'intro' && state.fullscreenRequested;
    if (should) document.body.classList.add('fa-mobile-fullscreen');
    else document.body.classList.remove('fa-mobile-fullscreen');
    updateFullscreenButtons();
  }

  async function boot() {
    ensureViewportLock();
    restore();
    createShell();
    syncUI();
    await renderLeaderboard();
    renderBoard();
    if (state.profile) {
      openStartScreen();
      ui.nickInput.value = state.profile.nickname || '';
      ui.nickNote.textContent = 'Update nickname before starting, or continue as is.';
    } else {
      openStartScreen();
    }
    updateMobileMode();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
