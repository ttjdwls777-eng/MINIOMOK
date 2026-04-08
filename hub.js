function ordinalSuffix(n) {
    const v = Math.abs(Number(n)) || 0;
    const mod100 = v % 100;
    if (mod100 >= 11 && mod100 <= 13) return 'th';
    switch (v % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

(() => {
  const APP_NAME = 'FA gomoku';
  const STORAGE_KEY = 'fa_omok_state_v2';
  const PROFILE_KEY = 'fa_omok_profile_v2';
  const LEADERBOARD_KEY = 'fa_omok_board_v3';
  const WEEKLY_LEADERBOARD_KEY = 'fa_omok_weekly_board_v1';
  const WEEKLY_RESET_META_KEY = 'fa_omok_weekly_reset_meta_v1';
  const WEEKLY_PREV_LEADERBOARD_KEY = 'fa_omok_weekly_prev_board_v1';
  const WEEKLY_PREV_META_KEY = 'fa_omok_weekly_prev_meta_v1';
  const FIREBASE_WEEKLY_META_PATH = 'leaderboards/omokWeeklyMeta';
  const FIREBASE_WEEKLY_BOARD_ROOT = 'leaderboards/omokWeekly';
  const FIREBASE_WEEKLY_SNAPSHOT_ROOT = 'leaderboards/omokWeeklySnapshot';
  const FRIENDS_KEY = 'fa_omok_friends_v1';
  const BOARD_SIZE = 15;
  const CELL = 44;
  const PADDING = 36;
  const CANVAS_SIZE = PADDING * 2 + CELL * (BOARD_SIZE - 1);
  const HUMAN = 1;
  const AI = 2;
  const EMPTY = 0;
  const STAR_POINTS = [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]];
  const RANKS = Array.from({ length: 50 }, (_, i) => `${i + 1} Grade`);
  const EARLY_GRADE_WIN_STEP = 5;
  const HARD_GRADE_START_INDEX = 5;
  const GRADE_POINT_STEP = 5;
  const MAX_GRADE_SCORE = (RANKS.length - 1) * GRADE_POINT_STEP;
  const DEFAULT_AVATARS = ['🐻','🐼','🦊','🐯','🐨','🐶','🐱','🐹'];
  const TURN_LIMIT_MS = 60 * 1000;
  const ROOM_STALE_MS = 1000 * 60 * 20;
  const ROOM_PRESENCE_TTL_MS = 1000 * 15;
  const ROOM_PRESENCE_PING_MS = 1000 * 5;
  const STAR_BALANCE_DEFAULT = 10000;
  const STAR_WAGER_OPTIONS = [100, 1000, 10000];
  const STAR_WIN_RATE = 0.85;

  const FirebaseLeaderboardAdapter = {
  mode: 'firebase-ready',
  _realtimeRef: null,

  async fetchAll() {
    try {
      const snapshot = await firebase
        .database()
        .ref('leaderboards/omok')
        .once('value');

      const data = snapshot.val();
      if (!data) return [];

      return sanitizeLeaderboardEntries(Object.values(data).filter(Boolean));
    } catch (e) {
      console.error('fetchAll firebase error:', e);
      return getLocalLeaderboard();
    }
  },

  async fetchTop(limit = 50) {
    const list = await this.fetchAll();
    return list.slice(0, limit);
  },

  subscribeRealtime(onChange) {
    try {
      if (!window.firebase || !firebase.database) return null;
      if (this._realtimeRef) {
        try { this._realtimeRef.off(); } catch {}
      }
      const ref = firebase.database().ref('leaderboards/omok');
      ref.on('value', snap => {
        try {
          const data = snap.val() || {};
          const list = sanitizeLeaderboardEntries(Object.values(data).filter(Boolean));
          if (typeof onChange === 'function') onChange(list);
        } catch (err) {
          console.log('leaderboard realtime ignored:', err);
        }
      });
      this._realtimeRef = ref;
      return ref;
    } catch (e) {
      console.error('subscribeRealtime firebase error:', e);
      return null;
    }
  },

  unsubscribeRealtime() {
    if (this._realtimeRef) {
      try { this._realtimeRef.off(); } catch {}
      this._realtimeRef = null;
    }
  },

  async saveEntry(entry) {
    try {
      if (!entry || !entry.id) return false;

      await firebase
        .database()
        .ref('leaderboards/omok/' + entry.id)
        .set(entry);

      const all = await this.fetchAll();
      state.allLeaderboardEntries = all;
      state.leaderboardCache = all.slice(0, 50);
      return true;
    } catch (e) {
      console.error('saveEntry firebase error:', e);
      upsertLocalLeaderboard(entry);
      return true;
    }
  },

  async nameExists(nickname, excludeId) {
    try {
      const snapshot = await firebase
        .database()
        .ref('leaderboards/omok')
        .once('value');

      const data = snapshot.val();
      if (!data) return false;

      const lower = String(nickname || '').trim().toLowerCase();

      return Object.values(data).some(v =>
        String(v?.nickname || '').trim().toLowerCase() === lower &&
        v?.id !== excludeId
      );
    } catch (e) {
      console.error('nameExists firebase error:', e);
      const lower = String(nickname || '').trim().toLowerCase();
      return getLocalLeaderboard().some(v =>
        String(v.nickname || '').trim().toLowerCase() === lower &&
        v.id !== excludeId
      );
    }
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
    gradeScore: 0,
    review: [],
    reviewIndex: 0,
    soundsReady: false,
    started: false,
    paused: false,
    phase: 'intro',
    winningLine: [],
    remoteAdapter: FirebaseLeaderboardAdapter,
    leaderboardCache: [],
    allLeaderboardEntries: [],
    fullscreenRequested: false,
    lastResult: null,
    lobbyConfirmed: false,
    pendingMove: null,
    countdownActive: false,
    voiceEnabled: true,
    voicesLoaded: false,
    cachedVoices: [],
    preferredVoice: null,
    winBurstTimer: null,
    matchMode: 'ai',
    turnTimerHandle: null,
    turnSecondsLeft: 60,
    turnLastAudioSecond: null,
    timeoutClaiming: false,
    leaderboardTab: 'total',
    confirmTimer: null,
    confirmExpireAt: 0,
    online: {
      roomId: '',
      roomCode: '',
      roomTitle: '',
      role: '',
      mySide: HUMAN,
      opponentName: 'Friend',
      opponentRank: '1 Grade',
      status: 'idle',
      unsubscribe: null,
      lastCountdownAt: 0,
      lastFinishedAt: 0,
      hostReady: false,
      guestReady: false,
      turnExpiresAt: 0,
      presenceHandle: null,
      hostId: '',
      guestId: '',
      hostName: '',
      guestName: '',
      lastGuestSeenId: '',
      lastRoomPulseAt: 0,
      panelMode: 'none',
      lastGuestReadySeenAt: 0,
      starWager: 100
    },
    friends: {
      list: [],
      incoming: [],
      profileHandle: null,
      challengeHandle: null,
      lastLoadedAt: 0,
      popupChallengeId: '',
      challengePopupOpen: false,
      dismissedChallengeId: localStorage.getItem('fa_omok_dismissed_challenge_id') || ''
    },
    nextStarter: HUMAN,
    sharedWeeklyLeaderboard: [],
    sharedPreviousWeeklyLeaderboard: [],
    appScreen: 'home',
    lastNonGameScreen: 'home',
    lastButtonSoundAt: 0
  };

  const ui = {};

  function hasActiveRoomSession() {
    return !!(state.online && (state.online.roomId || state.online.roomCode));
  }

  function isRoomNavigationLocked() {
    return hasActiveRoomSession();
  }

  function getOnlineMenuScreen() {
    const panel = state.online?.panelMode || 'none';
    if (panel === 'create') return 'create-room';
    if (panel === 'join') return 'friend-match';
    if (panel === 'friends') return 'friends';
    return 'online';
  }


  function resolveAppScreen() {
    if (state.phase === 'playing' || state.phase === 'paused' || state.phase === 'countdown') return 'game';
    if (hasActiveRoomSession()) return 'room';
    return state.appScreen || 'home';
  }

  function navigateToScreen(screen, options = {}) {
    const target = String(screen || 'home');
    const bypassLock = !!options.bypassLock;
    const locked = isRoomNavigationLocked() && !['room','game','ranking'].includes(target);
    if (locked && !bypassLock) {
      state.appScreen = 'room';
      syncAppScreen();
      scrollViewportToActiveScreen('room');
      return false;
    }
    if (target === 'ranking') {
      state.appScreen = 'ranking';
      state.lastNonGameScreen = 'ranking';
    } else if (target === 'game') {
      state.appScreen = 'game';
    } else {
      state.appScreen = target;
      state.lastNonGameScreen = target;
    }
    syncAppScreen();
    scrollViewportToActiveScreen(target);
    return true;
  }

  function syncAppScreen() {
    const screen = resolveAppScreen();
    const visualScreen = screen === 'online' ? getOnlineMenuScreen() : screen;
    const route = 'fa-route-' + visualScreen;
    document.body.classList.remove(
      'fa-route-home','fa-route-ranking','fa-route-ai','fa-route-online',
      'fa-route-room','fa-route-game','fa-route-create-room','fa-route-friend-match','fa-route-friends'
    );
    document.body.classList.add(route);
    document.body.classList.toggle('fa-needs-profile', !state.profile);

    if (ui.homeScene) ui.homeScene.classList.toggle('hidden', screen !== 'home');
    if (ui.rankingScene) ui.rankingScene.classList.toggle('hidden', screen !== 'ranking');
    if (ui.main) ui.main.classList.toggle('hidden', screen === 'ranking' || (screen === 'home' && !!state.profile));

    if (ui.navHome) ui.navHome.classList.toggle('active', visualScreen === 'home');
    if (ui.navAi) ui.navAi.classList.toggle('active', visualScreen === 'ai');
    if (ui.navCreateRoom) ui.navCreateRoom.classList.toggle('active', visualScreen === 'create-room');
    if (ui.navFriendMatch) ui.navFriendMatch.classList.toggle('active', visualScreen === 'friend-match');
    if (ui.navFriends) ui.navFriends.classList.toggle('active', visualScreen === 'friends');
    if (ui.navRanking) ui.navRanking.classList.toggle('active', visualScreen === 'ranking');

    if (ui.sceneTitle) {
      const labels = {
        home: 'Arcade Home',
        ai: 'Ranked AI Match',
        'create-room': 'Create Online Room',
        'friend-match': 'Friend Match Rooms',
        friends: 'Online Friends',
        room: 'Room Waiting Room',
        game: isOnlineMode() ? 'Live Online Match' : 'Live Ranked Match',
        ranking: 'Ranking Hall'
      };
      ui.sceneTitle.textContent = labels[visualScreen] || 'Arcade Home';
    }
    if (ui.sceneSubtitle) {
      let sub = 'Each tab opens its own full screen like a mobile game app.';
      if (screen === 'room') sub = 'You are inside a room. Leave Room before switching to another session.';
      else if (screen === 'game') sub = 'Live board and in-match actions only.';
      else if (visualScreen === 'create-room') sub = 'Create a room immediately on this dedicated screen.';
      else if (visualScreen === 'friend-match') sub = 'See open friend rooms immediately from this dedicated screen.';
      else if (visualScreen === 'friends') sub = 'See online friends immediately from this dedicated screen.';
      else if (visualScreen === 'ai') sub = 'Start a ranked AI duel from a dedicated match screen.';
      else if (visualScreen === 'ranking') sub = 'Total, weekly, and previous weekly rankings update automatically.';
      ui.sceneSubtitle.textContent = sub;
    }
    updateHomeScene();
    if (!state.profile && state.appScreen === 'home' && ui.sceneTitle) {
      ui.sceneTitle.textContent = 'Create Your Nickname';
      if (ui.sceneSubtitle) ui.sceneSubtitle.textContent = 'Set your nickname first, then enter each game screen like a mobile app.';
    }
  }

  function scrollViewportToActiveScreen(screenHint = '') {
    const screen = screenHint || resolveAppScreen();
    const visualScreen = screen === 'online' ? getOnlineMenuScreen() : screen;
    const target = visualScreen === 'home'
      ? ui.homeScene
      : visualScreen === 'ranking'
        ? ui.rankingScene
        : ui.main;

    const containers = [ui.main, ui.homeScene, ui.rankingScene].filter(Boolean);
    containers.forEach(el => {
      try { el.scrollTop = 0; } catch {}
    });

    requestAnimationFrame(() => {
      try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch { window.scrollTo(0, 0); }
      requestAnimationFrame(() => {
        containers.forEach(el => {
          try { el.scrollTop = 0; } catch {}
        });
        if (!target) return;
        try {
          target.scrollIntoView({ block: 'start', behavior: 'auto' });
        } catch {}
      });
    });
  }

  function updateHomeScene() {
    if (!ui.homeStats) return;
    ui.homeStats.innerHTML = `
      <div class="fa-scene-stat"><span>Wins</span><strong>${state.totalWins}</strong></div>
      <div class="fa-scene-stat"><span>Losses</span><strong>${state.totalLosses}</strong></div>
      <div class="fa-scene-stat"><span>Best Streak</span><strong>${state.bestStreak}</strong></div>
      <div class="fa-scene-stat"><span>Stars</span><strong>★ ${formatNumber(getCurrentStars())}</strong></div>
    `;
    if (ui.homeProfileName) ui.homeProfileName.textContent = state.profile ? state.profile.nickname : 'Guest';
    if (ui.homeProfileRank) ui.homeProfileRank.textContent = getCurrentRankFromState();
    if (ui.homeRoomLock) {
      ui.homeRoomLock.textContent = hasActiveRoomSession()
        ? 'Room active · leave the room before moving to another tab.'
        : 'No active room · each menu opens as its own app-like screen.';
    }
  }



  function createBoard() {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
  }

  function cloneBoard(board) {
    return board.map(row => row.slice());
  }

  function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function normalizeStars(value) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n >= 0 ? n : STAR_BALANCE_DEFAULT;
  }

  function formatNumber(value) {
    try {
      return new Intl.NumberFormat('en-US').format(Math.max(0, Math.floor(Number(value) || 0)));
    } catch {
      return String(Math.max(0, Math.floor(Number(value) || 0)));
    }
  }

  function ensureProfileEconomy(profile) {
    if (!profile) return profile;
    profile.stars = normalizeStars(profile.stars);
    profile.lastStarSettleKey = String(profile.lastStarSettleKey || '');
    return profile;
  }

  function getCurrentStars() {
    return normalizeStars(state.profile?.stars);
  }

  function normalizeStarWager(value, fallback = STAR_WAGER_OPTIONS[0]) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n <= 0) return Math.max(1, Math.floor(Number(fallback) || STAR_WAGER_OPTIONS[0]));
    return Math.min(999999999, n);
  }

  function getSelectedStarWager() {
    return normalizeStarWager(state.online.starWager || STAR_WAGER_OPTIONS[0], STAR_WAGER_OPTIONS[0]);
  }

  function canAffordStars(amount) {
    return getCurrentStars() >= Math.max(0, Number(amount) || 0);
  }

  function getStarSettlementKey(roomId, finishedAt) {
    return `${String(roomId || '')}:${String(finishedAt || '')}`;
  }

  function applyStarSettlementForResult(winner, wager, finishedAt, roomId) {
    if (!state.profile || !isOnlineMode()) return null;
    const safeWager = normalizeStarWager(wager, 0);
    if (!safeWager || !finishedAt) return null;
    ensureProfileEconomy(state.profile);
    const settleKey = getStarSettlementKey(roomId || state.online.roomId || state.online.roomCode, finishedAt);
    if (state.profile.lastStarSettleKey === settleKey) return null;
    const mySide = getMySide();
    const oppSide = getOpponentSide();
    let delta = 0;
    if (winner === mySide) delta = Math.floor(safeWager * STAR_WIN_RATE);
    else if (winner === oppSide) delta = -safeWager;
    else return null;
    state.profile.stars = Math.max(0, normalizeStars(state.profile.stars) + delta);
    state.profile.lastStarSettleKey = settleKey;
    saveState();
    return { delta, wager: safeWager, balance: state.profile.stars };
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
      totalGames: state.totalGames,
      gradeScore: state.gradeScore
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
      if (Number(v.totalWins || 0) <= 0) return false;
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
    if ((b.totalWins || 0) !== (a.totalWins || 0)) return (b.totalWins || 0) - (a.totalWins || 0);
    if ((a.totalLosses || 0) !== (b.totalLosses || 0)) return (a.totalLosses || 0) - (b.totalLosses || 0);
    const ra = rankIndex(a.rank);
    const rb = rankIndex(b.rank);
    if (ra !== rb) return rb - ra;
    if ((b.bestStreak || 0) !== (a.bestStreak || 0)) return (b.bestStreak || 0) - (a.bestStreak || 0);
    if ((b.totalGames || 0) !== (a.totalGames || 0)) return (b.totalGames || 0) - (a.totalGames || 0);
    return String(a.nickname || '').localeCompare(String(b.nickname || ''));
  }

  function rankIndex(rank) {
    const idx = RANKS.indexOf(rank);
    return idx < 0 ? 0 : idx;
  }

  function getLegacyGradeScoreFromWins(wins) {
    const safeWins = Math.max(0, Number(wins) || 0);
    return Math.min(MAX_GRADE_SCORE, safeWins);
  }

  function getRankFromScore(score) {
    const safeScore = Math.max(0, Number(score) || 0);
    const idx = Math.min(RANKS.length - 1, Math.floor(safeScore / GRADE_POINT_STEP));
    return RANKS[idx];
  }

  function getRankFromWins(wins) {
    return getRankFromScore(getLegacyGradeScoreFromWins(wins));
  }

  function getCurrentRankFromState() {
    return getRankFromScore(state.gradeScore);
  }

  function getNextRankProgress(score) {
    const safeScore = Math.max(0, Math.min(MAX_GRADE_SCORE, Number(score) || 0));
    const idx = Math.min(RANKS.length - 1, Math.floor(safeScore / GRADE_POINT_STEP));
    const currentBase = idx * GRADE_POINT_STEP;
    const current = Math.max(0, safeScore - currentBase);
    const need = idx >= RANKS.length - 1 ? 0 : Math.max(0, GRADE_POINT_STEP - current);
    const penaltyActive = idx >= HARD_GRADE_START_INDEX && idx < RANKS.length - 1;
    return { rank: RANKS[idx], current, need, max: GRADE_POINT_STEP, penaltyActive, isMax: idx >= RANKS.length - 1 };
  }

  function applyRankedResult(isWin) {
    const current = Math.max(0, Math.min(MAX_GRADE_SCORE, Number(state.gradeScore) || 0));
    const currentIndex = Math.min(RANKS.length - 1, Math.floor(current / GRADE_POINT_STEP));
    if (currentIndex >= RANKS.length - 1) {
      state.gradeScore = MAX_GRADE_SCORE;
      return;
    }
    if (isWin) {
      state.gradeScore = Math.min(MAX_GRADE_SCORE, current + 1);
      return;
    }
    if (currentIndex >= HARD_GRADE_START_INDEX) {
      const floor = currentIndex * GRADE_POINT_STEP;
      state.gradeScore = Math.max(floor, current - 1);
    }
  }

  function getAvatarBySeed(seed) {
    if (!seed) return DEFAULT_AVATARS[0];
    let n = 0;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) n += s.charCodeAt(i);
    return DEFAULT_AVATARS[n % DEFAULT_AVATARS.length];
  }

  function isRankedAiMatch() {
    return state.matchMode === 'ai' && !isOnlineMode();
  }


  function getWeeklyWindow(now = new Date()) {
    const d = new Date(now);
    const day = d.getDay();
    const diffToSat = (day + 1) % 7;
    const start = new Date(d);
    start.setHours(12,0,0,0);
    start.setDate(d.getDate() - diffToSat);
    if (d < start) start.setDate(start.getDate() - 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end, key: String(start.getTime()) };
  }

  function getPreviousWeeklySnapshot() {
    try {
      const meta = JSON.parse(localStorage.getItem(WEEKLY_PREV_META_KEY) || 'null');
      const board = JSON.parse(localStorage.getItem(WEEKLY_PREV_LEADERBOARD_KEY) || '[]');
      return { meta, board: Array.isArray(board) ? board : [] };
    } catch {
      return { meta: null, board: [] };
    }
  }

  async function syncFirebaseWeeklySeasonMeta(season = getWeeklyWindow()) {
    if (!window.firebase || !firebase.database) return null;
    try {
      const ref = firebase.database().ref(FIREBASE_WEEKLY_META_PATH);
      const snap = await ref.once('value');
      const meta = snap.val() || {};
      const current = meta.current || null;
      if (!current || String(current.key || '') !== String(season.key)) {
        const nextMeta = {
          current: { key: season.key, start: season.start.getTime(), end: season.end.getTime(), updatedAt: Date.now() },
          previous: current && current.key ? { key: current.key, start: current.start || 0, end: current.end || 0, updatedAt: Date.now() } : (meta.previous || null)
        };
        await ref.update(nextMeta);
        return nextMeta;
      }
      return meta;
    } catch (err) {
      console.log('weekly meta sync ignored:', err);
      return null;
    }
  }

  async function fetchFirebaseWeeklyLeaderboardByKey(seasonKey, limit = 7) {
    if (!window.firebase || !firebase.database || !seasonKey) return [];
    try {
      const snap = await firebase.database().ref(FIREBASE_WEEKLY_BOARD_ROOT + '/' + String(seasonKey)).once('value');
      const raw = snap.val() || {};
      const list = Object.values(raw)
        .filter(Boolean)
        .map(v => ({
          ...v,
          totalWins: Number(v.weeklyWins || 0),
          totalLosses: Number(v.weeklyLosses || 0),
          totalGames: Number(v.weeklyGames || 0)
        }));
      return sanitizeLeaderboardEntries(list.filter(v => Number(v.totalWins || 0) > 0)).slice(0, limit);
    } catch (err) {
      console.log('weekly board fetch ignored:', err);
      return [];
    }
  }

  async function fetchFirebaseWeeklyLeaderboards(limit = 7) {
    const season = getWeeklyWindow();
    let meta = await syncFirebaseWeeklySeasonMeta(season);
    if (!meta && window.firebase && firebase.database) {
      try {
        const snap = await firebase.database().ref(FIREBASE_WEEKLY_META_PATH).once('value');
        meta = snap.val() || null;
      } catch (err) {
        console.log('weekly meta fetch ignored:', err);
      }
    }
    const currentKey = String(meta?.current?.key || season.key);
    const previousKey = String(meta?.previous?.key || '');

    let totals = [];
    try {
      const snapshot = await firebase.database().ref('leaderboards/omok').once('value');
      const rawTotals = snapshot.val() || {};
      totals = sanitizeLeaderboardEntries(Object.values(rawTotals).filter(Boolean));
    } catch (err) {
      totals = Array.isArray(state.allLeaderboardEntries) ? sanitizeLeaderboardEntries(state.allLeaderboardEntries) : [];
    }

    let snapshotRaw = {};
    let previousSnapshotRaw = {};
    try {
      const snap = await firebase.database().ref(FIREBASE_WEEKLY_SNAPSHOT_ROOT + '/' + String(currentKey)).once('value');
      snapshotRaw = snap.val() || {};
      if (!Object.keys(snapshotRaw).length && totals.length) {
        const seeded = {};
        totals.forEach(entry => {
          seeded[entry.id] = {
            id: entry.id,
            nickname: entry.nickname || '',
            totalWins: Number(entry.totalWins || 0),
            totalLosses: Number(entry.totalLosses || 0),
            totalGames: Number(entry.totalGames || 0),
            createdAt: Date.now()
          };
        });
        snapshotRaw = seeded;
        try { await firebase.database().ref(FIREBASE_WEEKLY_SNAPSHOT_ROOT + '/' + String(currentKey)).set(seeded); } catch {}
      }
    } catch (err) {
      console.log('weekly snapshot fetch ignored:', err);
    }
    if (previousKey) {
      try {
        const prevSnap = await firebase.database().ref(FIREBASE_WEEKLY_SNAPSHOT_ROOT + '/' + String(previousKey)).once('value');
        previousSnapshotRaw = prevSnap.val() || {};
      } catch (err) {
        console.log('previous weekly snapshot fetch ignored:', err);
      }
    }

    const currentBoardRaw = await fetchFirebaseWeeklyLeaderboardByKey(currentKey, Math.max(limit, 1000));
    const previousBoardRaw = previousKey ? await fetchFirebaseWeeklyLeaderboardByKey(previousKey, Math.max(limit, 1000)) : [];

    const currentBoardMap = new Map((currentBoardRaw || []).map(v => [v.id, v]));
    const previousBoardMap = new Map((previousBoardRaw || []).map(v => [v.id, v]));

    const derivedWeekly = totals.map(entry => {
      const baseline = snapshotRaw?.[entry.id] || null;
      const boardEntry = currentBoardMap.get(entry.id);
      const deltaWins = baseline ? Math.max(0, Number(entry.totalWins || 0) - Number(baseline.totalWins || 0)) : 0;
      const deltaLosses = baseline ? Math.max(0, Number(entry.totalLosses || 0) - Number(baseline.totalLosses || 0)) : 0;
      const deltaGames = baseline ? Math.max(0, Number(entry.totalGames || 0) - Number(baseline.totalGames || 0)) : 0;
      const weeklyWins = Math.max(Number(boardEntry?.totalWins || 0), deltaWins);
      const weeklyLosses = Math.max(Number(boardEntry?.totalLosses || 0), deltaLosses);
      const weeklyGames = Math.max(Number(boardEntry?.totalGames || 0), deltaGames);
      return {
        ...entry,
        totalWins: weeklyWins,
        totalLosses: weeklyLosses,
        totalGames: weeklyGames,
        weeklyWins,
        weeklyLosses,
        weeklyGames,
        weeklyKey: currentKey
      };
    }).filter(v => Number(v.totalWins || 0) > 0);

    let weekly = sanitizeLeaderboardEntries(derivedWeekly).slice(0, limit);
    if (!weekly.length) {
      weekly = totals.slice(0, limit).map(entry => ({
        ...entry,
        totalWins: Number(entry.weeklyWins || entry.totalWins || 0),
        totalLosses: Number(entry.weeklyLosses || entry.totalLosses || 0),
        totalGames: Number(entry.weeklyGames || entry.totalGames || 0),
        weeklyKey: currentKey
      }));
    }

    const derivedPrevious = totals.map(entry => {
      const prevSnap = previousSnapshotRaw?.[entry.id] || null;
      const boardEntry = previousBoardMap.get(entry.id);
      const prevWins = Math.max(Number(boardEntry?.totalWins || 0), prevSnap ? Math.max(0, Number(entry.totalWins || 0) - Number(prevSnap.totalWins || 0)) : 0);
      const prevLosses = Math.max(Number(boardEntry?.totalLosses || 0), prevSnap ? Math.max(0, Number(entry.totalLosses || 0) - Number(prevSnap.totalLosses || 0)) : 0);
      const prevGames = Math.max(Number(boardEntry?.totalGames || 0), prevSnap ? Math.max(0, Number(entry.totalGames || 0) - Number(prevSnap.totalGames || 0)) : 0);
      return {
        ...entry,
        totalWins: prevWins,
        totalLosses: prevLosses,
        totalGames: prevGames,
        weeklyKey: previousKey
      };
    }).filter(v => Number(v.totalWins || 0) > 0);

    const previous = previousKey ? sanitizeLeaderboardEntries(derivedPrevious).slice(0, limit) : [];
    state.sharedWeeklyLeaderboard = weekly;
    state.sharedPreviousWeeklyLeaderboard = previous;
    return { weekly, previous, meta };
  }

  async function saveWeeklyEntryToFirebase(entry) {
    if (!window.firebase || !firebase.database || !entry || !entry.id) return false;
    try {
      const season = getWeeklyWindow();
      await syncFirebaseWeeklySeasonMeta(season);
      await firebase.database().ref(FIREBASE_WEEKLY_BOARD_ROOT + '/' + String(season.key) + '/' + entry.id).set({
        ...entry,
        weeklyKey: season.key,
        updatedAt: Date.now()
      });
      return true;
    } catch (err) {
      console.log('weekly board save ignored:', err);
      return false;
    }
  }

  function ensureWeeklySeason() {
    const season = getWeeklyWindow();
    let meta = null;
    try { meta = JSON.parse(localStorage.getItem(WEEKLY_RESET_META_KEY) || 'null'); } catch {}
    if (!meta || meta.key !== season.key) {
      let prevBoard = [];
      try { prevBoard = JSON.parse(localStorage.getItem(WEEKLY_LEADERBOARD_KEY) || '[]'); } catch {}
      if (Array.isArray(prevBoard) && prevBoard.length && meta?.key) {
        localStorage.setItem(WEEKLY_PREV_LEADERBOARD_KEY, JSON.stringify(prevBoard.slice(0, 500)));
        localStorage.setItem(WEEKLY_PREV_META_KEY, JSON.stringify({ key: meta.key, start: meta.start, end: meta.end, savedAt: Date.now() }));
      }
      localStorage.setItem(WEEKLY_LEADERBOARD_KEY, '[]');
      localStorage.setItem(WEEKLY_RESET_META_KEY, JSON.stringify({ key: season.key, start: season.start.getTime(), end: season.end.getTime() }));
    }
    return season;
  }

  function getWeeklyLeaderboard() {
    ensureWeeklySeason();
    try {
      const parsed = JSON.parse(localStorage.getItem(WEEKLY_LEADERBOARD_KEY) || '[]');
      return Array.isArray(parsed) ? sanitizeLeaderboardEntries(parsed.filter(v => Number(v.weeklyWins || 0) > 0).map(v => ({ ...v, totalWins: Number(v.weeklyWins || 0), totalLosses: Number(v.weeklyLosses || 0), totalGames: Number(v.weeklyGames || 0) }))) : [];
    } catch { return []; }
  }

  function setWeeklyLeaderboard(entries) {
    ensureWeeklySeason();
    localStorage.setItem(WEEKLY_LEADERBOARD_KEY, JSON.stringify((Array.isArray(entries) ? entries : []).slice(0, 500)));
  }

  function upsertWeeklyLeaderboard(entry) {
    ensureWeeklySeason();
    let board = [];
    try { board = JSON.parse(localStorage.getItem(WEEKLY_LEADERBOARD_KEY) || '[]'); } catch {}
    const idx = board.findIndex(v => v.id === entry.id);
    if (idx >= 0) board[idx] = { ...(board[idx] || {}), ...entry };
    else board.push(entry);
    setWeeklyLeaderboard(board);
  }
  function getPreviousWeeklyLeaderboard() {
    const snap = getPreviousWeeklySnapshot();
    const board = Array.isArray(snap.board) ? snap.board : [];
    return sanitizeLeaderboardEntries(board.filter(v => Number(v.weeklyWins || 0) > 0).map(v => ({ ...v, totalWins: Number(v.weeklyWins || 0), totalLosses: Number(v.weeklyLosses || 0), totalGames: Number(v.weeklyGames || 0) })));
  }


  function restore() {
    ensureWeeklySeason();
    const saved = getSavedState();
    const profile = getSavedProfile();
    if (saved) {
      state.streak = saved.streak || 0;
      state.bestStreak = saved.bestStreak || 0;
      state.totalWins = saved.totalWins || 0;
      state.totalLosses = saved.totalLosses || 0;
      state.totalGames = saved.totalGames || 0;
      state.gradeScore = saved.gradeScore != null ? Math.max(0, Math.min(MAX_GRADE_SCORE, Number(saved.gradeScore) || 0)) : getLegacyGradeScoreFromWins(saved.totalWins || 0);
    }
    if (profile && profile.id && profile.nickname) {
      state.profile = ensureProfileEconomy(profile);
      state.profile.rank = getCurrentRankFromState();
      state.profile.avatar = state.profile.avatar || getAvatarBySeed(profile.id);
      const season = ensureWeeklySeason();
      if (state.profile.weeklyKey !== season.key) { state.profile.weeklyKey = season.key; state.profile.weeklyWins = 0; state.profile.weeklyLosses = 0; state.profile.weeklyGames = 0; }
    }
    state.allLeaderboardEntries = getLocalLeaderboard();
    state.leaderboardCache = state.allLeaderboardEntries.slice(0, 50);
  }

  function createShell() {
    document.body.style.margin = '0';
    document.body.style.background = '#2c1d10';
    document.body.style.fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    document.body.style.color = '#fff8ef';
    document.body.innerHTML = '';

    const root = document.createElement('div');
    root.id = 'fa-omok-app';
    root.innerHTML = `
      <div class="fa-wrap">
        <div class="fa-bg"></div>
        <div class="fa-grid"></div>

        <div class="fa-topbar">
          <div class="fa-brand-area">
            <div class="fa-brand">
              <div class="fa-brand-badge">FA</div>
              <div>
                <div class="fa-brand-title">${APP_NAME}</div>
                <div class="fa-brand-sub">Prestige Gomoku Arena</div>
              </div>
            </div>
          </div>
          <div class="fa-top-actions">
            <div class="fa-top-stars" id="fa-top-stars">★ 10,000</div>
          </div>
        </div>

        <div class="fa-scene-nav-wrap">
          <div class="fa-scene-nav">
            <button class="fa-chip active" id="fa-nav-home">Home</button>
            <button class="fa-chip" id="fa-nav-ai">AI Match</button>
            <button class="fa-chip" id="fa-nav-create-room">Create Room</button>
            <button class="fa-chip" id="fa-nav-friend-match">Friend Match</button>
            <button class="fa-chip" id="fa-nav-friends">Friends</button>
            <button class="fa-chip" id="fa-nav-ranking">Ranking</button>
          </div>
          <div class="fa-scene-head">
            <div>
              <div class="fa-scene-title" id="fa-scene-title">Arcade Home</div>
              <div class="fa-scene-subtitle" id="fa-scene-subtitle">Each tab opens its own full screen like a mobile game app.</div>
            </div>
          </div>
        </div>

        <div class="fa-top-wallet-row">
          <div class="fa-home-scene hidden" id="fa-home-scene">
            <div class="fa-home-hero">
              <div class="fa-home-hero-copy">
                <div class="fa-stage-eyebrow">MULTI SCREEN ARCADE</div>
                <div class="fa-stage-title" style="margin-top:8px;">Real lobby, real room, real match flow</div>
                <div class="fa-stage-text" style="margin-top:10px;">Move between Home, AI Match, Online Lobby, Room Waiting Room, Live Match, and Ranking Hall. When you create or join a room, the room is locked to that session until you press Leave Room.</div>
                <div class="fa-stage-actions" style="justify-content:flex-start;">
                  <button class="fa-btn primary" id="fa-home-go-ai">Start AI Match</button>
                  <button class="fa-btn" id="fa-home-go-online">Open Friend Match</button>
                  <button class="fa-btn ghost" id="fa-home-go-ranking">Open Ranking Hall</button>
                </div>
              </div>
              <div class="fa-home-hero-side">
                <div class="fa-home-profile">
                  <div class="fa-avatar self large" id="fa-home-avatar"></div>
                  <div>
                    <div class="fa-name" id="fa-home-profile-name">Guest</div>
                    <div class="fa-rank" id="fa-home-profile-rank">1 Grade</div>
                    <div class="fa-mini-note" id="fa-home-room-lock">No active room.</div>
                  </div>
                </div>
                <div class="fa-home-stats" id="fa-home-stats"></div>
              </div>
            </div>
          </div>

          <div class="fa-ranking-scene hidden" id="fa-ranking-scene">
            <div class="fa-panel" style="padding:18px;">
              <div class="fa-modal-head" style="padding:0 0 16px;border-bottom:1px solid rgba(255,255,255,.08);">
                <div>
                  <div class="fa-modal-title">Leaderboard</div>
                  <div class="fa-modal-sub">A dedicated ranking screen, separate from match flow.</div>
                </div>
              </div>
              <div class="fa-leader-tabs" style="padding:16px 0 0;">
                <button class="fa-chip active" id="fa-ranking-tab-total">Total Ranking</button>
                <button class="fa-chip" id="fa-ranking-tab-weekly">Weekly Ranking Top 7</button>
                <button class="fa-chip" id="fa-ranking-tab-previous">Previous Week Ranking</button>
              </div>
              <div class="fa-modal-body" id="fa-ranking-screen-list" style="padding:16px 0 0;max-height:none;"></div>
            </div>
          </div>
          <div class="fa-panel wallet top-wallet-panel">
            <div class="fa-panel-title">Star Wallet</div>
            <div class="fa-panel-sub">Owned Stars</div>
            <div class="fa-wallet-box">
              <div class="fa-wallet-line">
                <span class="fa-star-icon" aria-hidden="true">★</span>
                <span class="fa-wallet-label">Current Stars</span>
              </div>
              <strong id="fa-current-stars">10,000</strong>
              <div class="fa-wallet-mini" id="fa-current-stake-note">Owned Stars</div>
            </div>
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
                    <div class="fa-rank" id="fa-player-rank">1 Grade</div>
                  </div>
                </div>
                <div class="fa-center-vs">
                  <div class="fa-turn" id="fa-turn-label">Press Start</div>
                  <div class="fa-streak" id="fa-streak-label">Win Streak 0</div>
                  <div class="fa-turn-timer hidden" id="fa-turn-timer">Turn 60</div>
                </div>
                <div class="fa-player-card ai">
                  <div class="fa-player-meta right">
                    <div class="fa-name" id="fa-opponent-name">FA AI</div>
                    <div class="fa-rank" id="fa-ai-rank">Calm</div>
                  </div>
                  <div class="fa-avatar bot"></div>
                </div>
              </div>

              <div class="fa-board-wrap" id="fa-board-wrap">
                <div class="fa-board-playerbar enemy" id="fa-enemy-info">
                  <div class="fa-board-playerbar-name" id="fa-enemy-name">Opponent</div>
                  <div class="fa-board-playerbar-stars" id="fa-enemy-stars">★ 0</div>
                </div>
                <canvas id="fa-board" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"></canvas>
                <div class="fa-board-playerbar self" id="fa-self-info">
                  <div class="fa-board-playerbar-name" id="fa-self-name">You</div>
                  <div class="fa-board-playerbar-stars" id="fa-self-stars">★ 0</div>
                </div>

                <div class="fa-countdown hidden" id="fa-countdown-overlay">
                  <div class="fa-countdown-num" id="fa-countdown-text">3</div>
                </div>

                <div class="fa-place-action hidden" id="fa-place-action">
                  <button class="fa-btn primary big" id="fa-place-btn">Place</button>
                </div>
                <div class="fa-win-burst hidden" id="fa-win-burst" aria-hidden="true"></div>

                <div class="fa-stage fa-intro" id="fa-start-screen">
                  <div class="fa-stage-card lobby">
                    <div class="fa-stage-eyebrow">RANKED MATCH</div>
                    <div class="fa-stage-title">Enter the Arena</div>
                    <div class="fa-stage-text" id="fa-lobby-text">
                      Create your name, step onto the board, and climb the rank ladder.
                    </div>
                    <div class="fa-mode-switch">
                      <button class="fa-chip active" id="fa-mode-ai">AI Match</button>
                      <button class="fa-chip" id="fa-mode-friend">Friend Match</button>
                      <button class="fa-chip" id="fa-mode-friends">Friends</button>
                      <button class="fa-chip hidden" id="fa-mode-create-room">Create Room</button>
                    </div>
                    <div class="fa-friend-panel hidden" id="fa-friend-panel">
                      <div class="fa-friend-top">
                        <div class="fa-room-code" id="fa-room-code-view">Room: ——</div>
                        <div class="fa-room-status" id="fa-room-status">Create or join a room.</div>
                      </div>
                      <div class="fa-room-actions">
                        <input id="fa-room-title-input" maxlength="24" autocomplete="off" spellcheck="false" placeholder="Room title" />
                        <input id="fa-room-code-input" maxlength="8" autocomplete="off" spellcheck="false" placeholder="Enter room code (optional)" />
                        <div class="fa-room-stake-pills" id="fa-room-stake-pills" aria-label="Star stake">
                          <button type="button" class="fa-stake-pill active" data-stake="100">★ 100</button>
                          <button type="button" class="fa-stake-pill" data-stake="1000">★ 1,000</button>
                          <button type="button" class="fa-stake-pill" data-stake="10000">★ 10,000</button>
                        </div>
                        <button class="fa-btn" id="fa-create-room-btn">Create Room</button>
                        <button class="fa-btn" id="fa-join-room-btn">Join Room</button>
                        <button class="fa-btn ghost hidden" id="fa-leave-room-btn">Leave Room</button>
                      </div>
                      <div class="fa-room-presence hidden" id="fa-room-presence">
                        <div class="fa-room-presence-head">
                          <div class="fa-room-presence-badge" id="fa-room-presence-badge">ROOM STANDBY</div>
                          <div class="fa-room-presence-note" id="fa-room-presence-note">Create a room to invite your friend.</div>
                        </div>
                        <div class="fa-room-presence-slots">
                          <div class="fa-room-slot host" id="fa-room-host-slot">
                            <div class="fa-room-slot-avatar" id="fa-room-host-avatar">👑</div>
                            <div class="fa-room-slot-meta">
                              <div class="fa-room-slot-role">Host</div>
                              <div class="fa-room-slot-name" id="fa-room-host-name">Waiting for host</div>
                            </div>
                          </div>
                          <div class="fa-room-slot guest" id="fa-room-guest-slot">
                            <div class="fa-room-slot-avatar" id="fa-room-guest-avatar">✨</div>
                            <div class="fa-room-slot-meta">
                              <div class="fa-room-slot-role">Guest</div>
                              <div class="fa-room-slot-name" id="fa-room-guest-name">Waiting for guest</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="fa-friends-panel hidden" id="fa-friends-panel">
                        <div class="fa-open-rooms-head">
                          <div class="fa-open-rooms-title">Online</div>
                          <button class="fa-btn ghost tiny" id="fa-refresh-friends-btn">Refresh</button>
                        </div>
                        <div class="hidden" id="fa-online-controls"></div>
                        <div class="fa-open-rooms-list" id="fa-friends-list"></div>
                      </div>

                      <div class="fa-open-rooms hidden" id="fa-open-rooms-panel">
                        <div class="fa-open-rooms-head">
                          <div class="fa-open-rooms-title">Open Rooms</div>
                          <button class="fa-btn ghost tiny" id="fa-refresh-rooms-btn">Refresh</button>
                        </div>
                        <div class="fa-open-rooms-list" id="fa-open-rooms-list"></div>
                      </div>
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
                    <div class="fa-overlay-stars hidden" id="fa-overlay-stars">+★ 850</div>
                    <div class="fa-overlay-text" id="fa-overlay-text"></div>
                    <div class="fa-overlay-actions">
                      <button class="fa-btn primary hidden" id="fa-overlay-confirm-btn">Confirm</button>
                      <button class="fa-btn primary" id="fa-rematch-btn">Play Again</button>
                      <button class="fa-btn ghost" id="fa-overlay-lobby-btn">Leave Room</button>
                    </div>
                  </div>
                </div>

                <div class="fa-floating-game-actions hidden" id="fa-floating-game-actions">
                  <button class="fa-btn danger hidden" id="fa-floating-surrender">Surrender</button>
                  <button class="fa-btn ghost" id="fa-floating-fullscreen">Fullscreen</button>
                  <button class="fa-btn ghost hidden" id="fa-floating-exit-fullscreen">Exit Fullscreen</button>
                </div>
              </div>

              <div class="fa-bottom">
                <div class="fa-progress-box">
                  <div class="fa-progress-top">
                    <span id="fa-progress-rank">1 Grade</span>
                    <span id="fa-progress-text">0 / 5 wins</span>
                  </div>
                  <div class="fa-progress-bar"><div id="fa-progress-fill"></div></div>
                </div>
                <div class="fa-actions">
                  <button class="fa-btn" id="fa-newgame-btn">New Match</button>
                  <button class="fa-btn" id="fa-pause-btn">Pause</button>
                  <button class="fa-btn danger hidden" id="fa-surrender-btn">Surrender</button>
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
                <div class="fa-profile-main-meta">
                  <div>
                    <div class="fa-name" id="fa-side-name">Guest</div>
                    <div class="fa-mini-note" id="fa-connection-note">Local ladder mode</div>
                  </div>
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
                <div class="fa-info-line"><span>Mode</span><strong id="fa-mode-line">Player vs AI</strong></div>
                <div class="fa-info-line"><span>Rule</span><strong>Five in a row</strong></div>
                <div class="fa-info-line"><span>Scale</span><strong id="fa-scale-line">Calm</strong></div>
                <div class="fa-info-line"><span>Review</span><strong id="fa-review-line">Ready</strong></div>
                <div class="fa-info-line"><span>Ranking</span><strong>Wins first · fewer losses wins ties</strong></div>
              </div>
            </div>

            <div class="fa-panel lb">
              <div class="fa-panel-title">Top 30</div>
              <div class="fa-panel-sub">Only players with at least 1 win are listed.</div>
              <div class="fa-leader-scroll" id="fa-leader-preview"></div>
            </div>
          </div>
        </div>

        <div class="fa-modal hidden" id="fa-leaderboard-modal">
          <div class="fa-modal-card">
            <div class="fa-modal-head">
              <div>
                <div class="fa-modal-title">Leaderboard</div>
                <div class="fa-modal-sub">Ranked by wins first, then fewer losses</div>
              </div>
              <button class="fa-btn" id="fa-close-leaderboard">Close</button>
            </div>
            <div class="fa-leader-tabs">
              <button class="fa-chip active" id="fa-leader-tab-total">Total Ranking</button>
              <button class="fa-chip" id="fa-leader-tab-weekly">Weekly Ranking Top 7</button>
              <button class="fa-chip" id="fa-leader-tab-previous">Previous Week Ranking</button>
            </div>
            <div class="fa-modal-body" id="fa-leaderboard-list"></div>
          </div>
        </div>

        <div class="fa-modal hidden" id="fa-confirm-modal">
          <div class="fa-confirm-card">
            <div class="fa-confirm-icon">◆</div>
            <div class="fa-confirm-title" id="fa-confirm-title">Reset Career</div>
            <div class="fa-confirm-text" id="fa-confirm-text">Your wins, losses, and streak will be cleared.</div>
            <div class="fa-confirm-progress hidden" id="fa-confirm-progress"><div id="fa-confirm-progress-fill"></div></div>
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
          radial-gradient(circle at 18% 14%, rgba(255,224,165,.24), transparent 24%),
          radial-gradient(circle at 84% 12%, rgba(188,130,58,.18), transparent 24%),
          radial-gradient(circle at 82% 86%, rgba(120,76,32,.18), transparent 22%),
          radial-gradient(circle at 50% -4%, rgba(255,255,255,.06), transparent 24%),
          linear-gradient(180deg, rgba(61,39,19,.18), rgba(61,39,19,.18)),
          repeating-linear-gradient(
            90deg,
            rgba(255,255,255,.018) 0px,
            rgba(255,255,255,.018) 2px,
            rgba(0,0,0,.03) 2px,
            rgba(0,0,0,.03) 6px,
            rgba(255,255,255,.01) 6px,
            rgba(255,255,255,.01) 14px
          ),
          linear-gradient(135deg, #5c3b20 0%, #3f2816 42%, #26170d 100%);
        background-attachment: fixed;
        z-index: 0;
      }
      .fa-grid {
        position: fixed; inset: 0; pointer-events: none;
        background:
          radial-gradient(circle at 20% 18%, rgba(255,248,231,.06), transparent 10%),
          radial-gradient(circle at 80% 22%, rgba(255,240,212,.05), transparent 12%),
          linear-gradient(rgba(255,255,255,.014) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.014) 1px, transparent 1px);
        background-size: auto, auto, 34px 34px, 34px 34px;
        mask-image: radial-gradient(circle at center, rgba(0,0,0,.68), transparent 88%);
        opacity: .7;
        z-index: 0;
      }
      .fa-topbar, .fa-main { position: relative; z-index: 1; }
      .fa-topbar {
        max-width: 1440px; margin: 0 auto; padding: 18px 22px 10px;
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
      }
      .fa-top-wallet-row {
        max-width: 1440px; margin: 0 auto; padding: 0 22px 12px;
      }
      .fa-scene-nav-wrap {
        max-width: 1440px; margin: 0 auto; padding: 0 22px 14px;
        position: relative; z-index: 1;
      }
      .fa-scene-nav {
        display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;
      }
      .fa-scene-head {
        display:flex; align-items:center; justify-content:space-between; gap:14px;
        padding:14px 18px; border-radius:22px;
        background: linear-gradient(180deg, rgba(97,63,31,.28), rgba(52,32,17,.22));
        border:1px solid rgba(255,255,255,.08); box-shadow: var(--shadow);
      }
      .fa-scene-title { font-size: 22px; font-weight: 900; }
      .fa-scene-subtitle { margin-top: 4px; font-size: 13px; color: var(--muted); }
      .fa-home-scene, .fa-ranking-scene { position: relative; z-index:1; }
      .fa-ranking-scene .fa-panel { max-height: none; }
      .fa-ranking-scene .fa-modal-body { overflow:auto; -webkit-overflow-scrolling: touch; }
      .fa-home-hero {
        display:grid; grid-template-columns: minmax(0,1.2fr) minmax(320px,.8fr); gap:18px;
      }
      .fa-home-hero-copy, .fa-home-hero-side {
        padding:22px; border-radius:26px; background: linear-gradient(180deg, rgba(97,63,31,.34), rgba(52,32,17,.28));
        border:1px solid rgba(255,255,255,.08); box-shadow: var(--shadow);
      }
      .fa-home-profile { display:flex; gap:14px; align-items:center; margin-bottom:16px; }
      .fa-home-hero-copy .fa-stage-actions { display:none !important; }
      .fa-home-stats { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
      .fa-scene-stat { padding:16px; border-radius:18px; background: rgba(255,245,232,.05); border:1px solid rgba(255,237,206,.08); }
      .fa-scene-stat span { display:block; font-size:12px; color: var(--muted); }
      .fa-scene-stat strong { display:block; margin-top:8px; font-size:22px; }
      body.fa-route-home .fa-main, body.fa-route-ranking .fa-main { display:none !important; }
      body.fa-route-game .fa-topbar,
      body.fa-route-game .fa-scene-nav-wrap,
      body.fa-route-game .fa-top-wallet-row,
      body.fa-route-game .fa-home-scene,
      body.fa-route-game .fa-ranking-scene,
      body.fa-route-game .fa-right,
      body.fa-route-game .fa-bottom { display:none !important; }
      body.fa-route-game .fa-main {
        display:block !important;
        max-width:100% !important;
        padding: 8px 10px calc(14px + env(safe-area-inset-bottom)) !important;
      }
      body.fa-route-game .fa-left { width:100%; }
      body.fa-route-game .fa-panel.hero {
        padding: 10px;
        border-radius: 0;
        border-left: 0;
        border-right: 0;
      }
      body.fa-route-game .fa-board-wrap {
        min-height: calc(100svh - 120px);
        padding: 8px 0 0;
      }
      body.fa-route-game #fa-board {
        width: min(100%, calc(100svh - 120px), 920px);
      }
      body.fa-needs-profile.fa-route-home .fa-main { display:grid !important; }
      body.fa-needs-profile.fa-route-home .fa-home-scene { display:block !important; }
      body.fa-route-home #fa-home-scene { display:block !important; }
      body.fa-route-ranking #fa-ranking-scene { display:block !important; }
      body.fa-route-ai .fa-right,
      body.fa-route-online .fa-right,
      body.fa-route-create-room .fa-right,
      body.fa-route-friend-match .fa-right,
      body.fa-route-friends .fa-right,
      body.fa-route-room .fa-right { display:none !important; }
      body.fa-route-ai .fa-bottom,
      body.fa-route-online .fa-bottom,
      body.fa-route-create-room .fa-bottom,
      body.fa-route-friend-match .fa-bottom,
      body.fa-route-friends .fa-bottom,
      body.fa-route-room .fa-bottom { display:none !important; }
      body.fa-route-ai #fa-board,
      body.fa-route-online #fa-board,
      body.fa-route-create-room #fa-board,
      body.fa-route-friend-match #fa-board,
      body.fa-route-friends #fa-board,
      body.fa-route-room #fa-board { display:none !important; }
      body.fa-route-ai .fa-board-playerbar,
      body.fa-route-online .fa-board-playerbar,
      body.fa-route-create-room .fa-board-playerbar,
      body.fa-route-friend-match .fa-board-playerbar,
      body.fa-route-friends .fa-board-playerbar,
      body.fa-route-room .fa-board-playerbar { display:none !important; }
      body.fa-route-ai .fa-board-wrap,
      body.fa-route-online .fa-board-wrap,
      body.fa-route-create-room .fa-board-wrap,
      body.fa-route-friend-match .fa-board-wrap,
      body.fa-route-friends .fa-board-wrap,
      body.fa-route-room .fa-board-wrap { min-height: 560px; }
      body.fa-route-ai #fa-start-screen,
      body.fa-route-online #fa-start-screen,
      body.fa-route-create-room #fa-start-screen,
      body.fa-route-friend-match #fa-start-screen,
      body.fa-route-friends #fa-start-screen,
      body.fa-route-room #fa-start-screen { display:grid !important; position:absolute; inset:0; }
      body.fa-route-ai .fa-stage-card.lobby { width:min(100%, 640px); }
      body.fa-route-ai .fa-board-wrap,
      body.fa-route-online .fa-board-wrap,
      body.fa-route-create-room .fa-board-wrap,
      body.fa-route-friend-match .fa-board-wrap,
      body.fa-route-friends .fa-board-wrap,
      body.fa-route-room .fa-board-wrap {
        padding: 0;
        background: transparent;
        box-shadow: none;
        min-height: auto;
      }
      body.fa-route-ai #fa-start-screen,
      body.fa-route-online #fa-start-screen,
      body.fa-route-create-room #fa-start-screen,
      body.fa-route-friend-match #fa-start-screen,
      body.fa-route-friends #fa-start-screen,
      body.fa-route-room #fa-start-screen {
        position: relative;
        inset: auto;
        padding: 0;
        background: transparent;
        display: block !important;
      }
      body.fa-route-ai .fa-stage-card.lobby,
      body.fa-route-online .fa-stage-card.lobby,
      body.fa-route-create-room .fa-stage-card.lobby,
      body.fa-route-friend-match .fa-stage-card.lobby,
      body.fa-route-friends .fa-stage-card.lobby,
      body.fa-route-room .fa-stage-card.lobby {
        width: 100%;
        max-width: 100%;
        min-height: calc(100vh - 240px);
        border-radius: 28px;
        padding: 24px;
      }
      body.fa-route-create-room .fa-stage-card.lobby,
      body.fa-route-friend-match .fa-stage-card.lobby,
      body.fa-route-friends .fa-stage-card.lobby,
      body.fa-route-room .fa-stage-card.lobby {
        text-align: left;
      }
      body.fa-route-create-room .fa-stage-title,
      body.fa-route-friend-match .fa-stage-title,
      body.fa-route-friends .fa-stage-title,
      body.fa-route-room .fa-stage-title {
        font-size: 26px;
      }
      body.fa-route-create-room .fa-stage-actions,
      body.fa-route-friend-match .fa-stage-actions,
      body.fa-route-friends .fa-stage-actions,
      body.fa-route-room .fa-stage-actions {
        justify-content: flex-start;
      }
      body.fa-route-create-room .fa-lobby-text,
      body.fa-route-friend-match .fa-lobby-text,
      body.fa-route-friends .fa-lobby-text,
      body.fa-route-room .fa-lobby-text {
        max-width: 760px;
      }
      body.fa-route-create-room .fa-start-profile,
      body.fa-route-friend-match .fa-start-profile,
      body.fa-route-friends .fa-start-profile,
      body.fa-route-room .fa-start-profile {
        display: none !important;
      }
      body.fa-route-online .fa-stage-card.lobby,
      body.fa-route-create-room .fa-stage-card.lobby,
      body.fa-route-friend-match .fa-stage-card.lobby,
      body.fa-route-friends .fa-stage-card.lobby,
      body.fa-route-room .fa-stage-card.lobby,
      body.fa-route-ai .fa-stage-card.lobby { width:min(100%, 100%); }
      body.fa-route-ai #fa-pause-screen,
      body.fa-route-ai #fa-overlay,
      body.fa-route-online #fa-pause-screen,
      body.fa-route-online #fa-overlay,
      body.fa-route-create-room #fa-pause-screen,
      body.fa-route-create-room #fa-overlay,
      body.fa-route-friend-match #fa-pause-screen,
      body.fa-route-friend-match #fa-overlay,
      body.fa-route-friends #fa-pause-screen,
      body.fa-route-friends #fa-overlay,
      body.fa-route-room #fa-pause-screen,
      body.fa-route-room #fa-overlay { display:none !important; }

      body.fa-route-online .fa-status-row,
      body.fa-route-create-room .fa-status-row,
      body.fa-route-friend-match .fa-status-row,
      body.fa-route-friends .fa-status-row,
      body.fa-route-room .fa-status-row { display:none !important; }

      body.fa-route-online .fa-stage-card.lobby,
      body.fa-route-create-room .fa-stage-card.lobby,
      body.fa-route-friend-match .fa-stage-card.lobby,
      body.fa-route-friends .fa-stage-card.lobby,
      body.fa-route-room .fa-stage-card.lobby { margin-top: 0; }

      body.fa-route-ai .fa-mode-switch,
      body.fa-route-online .fa-mode-switch,
      body.fa-route-create-room .fa-mode-switch,
      body.fa-route-friend-match .fa-mode-switch,
      body.fa-route-friends .fa-mode-switch,
      body.fa-route-room .fa-mode-switch,
      body.fa-route-online .fa-lobby-result,
      body.fa-route-create-room .fa-lobby-result,
      body.fa-route-friend-match .fa-lobby-result,
      body.fa-route-friends .fa-lobby-result,
      body.fa-route-room .fa-lobby-result { display:none !important; }
      @media (max-width: 900px) {
        .fa-home-hero { grid-template-columns: 1fr; }
      }
      .top-wallet-panel { padding: 16px 18px; }
      .fa-brand-area { display:flex; align-items:center; gap:16px; min-width:0; flex-wrap:wrap; }
      .fa-top-actions { display: flex; gap: 10px; align-items:center; }
      .fa-top-stars {
        display:inline-flex; align-items:center; justify-content:center;
        min-height:44px; padding:0 16px; border-radius:16px;
        background: linear-gradient(180deg, rgba(82,53,24,.96), rgba(47,28,12,.96));
        border:1px solid rgba(255,222,150,.24);
        color:#f2cf73; font-weight:900; letter-spacing:.02em;
        box-shadow: 0 10px 24px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05);
        text-shadow: 0 1px 0 rgba(0,0,0,.18);
      }
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
      .fa-mode-switch { display:flex; gap:10px; margin: 14px 0 12px; }
      .fa-chip { border:1px solid rgba(255,238,205,.18); background: rgba(255,248,235,.06); color:#fff6e6; border-radius:999px; padding:10px 14px; font-weight:800; cursor:pointer; }
      .fa-chip.active { background: linear-gradient(180deg, rgba(228,193,126,.28), rgba(177,126,58,.24)); box-shadow: inset 0 0 0 1px rgba(255,228,167,.18); }
      .fa-friend-panel { margin: 4px 0 14px; padding: 14px; border-radius: 18px; border:1px solid rgba(255,236,205,.12); background: rgba(255,246,229,.05); }
      .fa-friend-top { display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom: 10px; flex-wrap:wrap; }
      .fa-room-code { font-weight:900; letter-spacing:.08em; color:#ffe7b4; }
      .fa-room-status { color: var(--muted); font-size: 13px; }
      .fa-room-actions { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,270px) repeat(3, auto); gap:10px; }
      .fa-room-actions input { min-width:0; background: rgba(255,255,255,.06); color:#fff8ef; border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:12px 14px; font-size:14px; }
      .fa-room-actions input::placeholder { color: rgba(255,248,239,.48); }
      .fa-room-stake-pills {
        display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:10px;
        padding: 8px;
        border-radius:18px;
        background: linear-gradient(180deg, rgba(255,248,230,.12), rgba(255,234,193,.04));
        border:1px solid rgba(255,226,154,.18);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 10px 22px rgba(0,0,0,.10);
      }
      .fa-stake-pill {
        appearance:none; border:1px solid rgba(255,255,255,.08); outline:none; cursor:pointer;
        border-radius:14px; padding:12px 10px; min-width:0;
        background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03));
        color:#f6ead1; font-weight:900; letter-spacing:.01em;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
        transition:.18s ease;
      }
      .fa-stake-pill:hover { transform: translateY(-1px); background: linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.04)); }
      .fa-stake-pill.active {
        background: linear-gradient(180deg, rgba(230,194,125,.30), rgba(150,107,47,.22));
        border-color: rgba(255,226,154,.32);
        color:#fff7e1;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.12), 0 10px 20px rgba(0,0,0,.12);
      }
      .fa-room-actions.room-locked { grid-template-columns: 1fr; }
      .fa-room-actions.room-locked .fa-btn { width: 100%; }
      #fa-mode-create-room { display:inline-flex; }
      .fa-room-presence {
        margin-top: 12px; padding: 14px; border-radius: 18px;
        border: 1px solid rgba(255,235,202,.12);
        background:
          linear-gradient(180deg, rgba(255,247,231,.10), rgba(255,247,231,.04)),
          linear-gradient(135deg, rgba(108,68,30,.38), rgba(63,36,17,.28));
        box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 16px 34px rgba(28,13,3,.14);
      }
      .fa-room-presence-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom: 12px; }
      .fa-room-presence-badge {
        display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:999px;
        font-size:12px; font-weight:900; letter-spacing:.10em; text-transform:uppercase;
        color:#fff2cf; background: rgba(255,228,167,.10); border:1px solid rgba(255,228,167,.20);
      }
      .fa-room-presence-note { color: var(--muted); font-size: 12px; }
      .fa-room-presence-slots { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
      .fa-room-slot {
        display:flex; align-items:center; gap:12px; min-width:0; padding:12px; border-radius:18px;
        background: rgba(255,250,242,.05); border:1px solid rgba(255,240,214,.08);
        transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
      }
      .fa-room-slot.filled {
        background: linear-gradient(180deg, rgba(255,248,235,.12), rgba(255,248,235,.05));
        border-color: rgba(255,228,167,.18);
        box-shadow: 0 12px 28px rgba(26,12,3,.14);
      }
      .fa-room-slot.pulse {
        animation: faRoomPulse 1.2s ease;
      }
      .fa-room-slot-avatar {
        width: 44px; height: 44px; border-radius: 14px; display:grid; place-items:center;
        background: linear-gradient(145deg, rgba(244,210,138,.92), rgba(140,99,42,.92));
        color:#18130e; font-size: 20px; font-weight:900; flex:0 0 auto;
        box-shadow: inset 0 1px 2px rgba(255,255,255,.45), 0 10px 24px rgba(0,0,0,.16);
      }
      .fa-room-slot.guest .fa-room-slot-avatar {
        background: linear-gradient(145deg, rgba(209,220,255,.92), rgba(103,116,180,.92));
        color:#151825;
      }
      .fa-room-slot-meta { min-width:0; }
      .fa-room-slot-role { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color: var(--muted); font-weight:800; }
      .fa-room-slot-name { margin-top:4px; font-size:15px; font-weight:900; color:#fff6e6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      @keyframes faRoomPulse {
        0% { transform: scale(.98); box-shadow: 0 0 0 rgba(255,228,167,0); }
        35% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(255,228,167,.08); }
        100% { transform: scale(1); box-shadow: 0 0 0 rgba(255,228,167,0); }
      }
      
      .fa-friends-panel { margin-top:12px; border:1px solid rgba(255,255,255,.10); background: rgba(22,10,2,.22); border-radius:18px; padding:12px; overflow:hidden; }
      #fa-friends-list{
        display:grid;
        grid-template-columns:minmax(0,1fr);
        width:100%;
        max-width:100%;
        overflow-x:hidden;
        justify-items:stretch;
      }
      .fa-friend-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(110px,150px) auto; gap:10px; align-items:center; padding:14px; border-radius:20px; min-width:0; width:100%; max-width:100%; flex:none; background: linear-gradient(180deg, rgba(255,247,231,.11), rgba(255,247,231,.05)), linear-gradient(135deg, rgba(118,72,31,.42), rgba(72,41,20,.34) 55%, rgba(48,28,12,.42)); border:1px solid rgba(255,235,202,.12); box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 18px 34px rgba(28,13,3,.18); }
      .fa-friend-row-meta { min-width:0; }
      .fa-friend-name { font-weight:900; color:#fff4df; font-size:15px; letter-spacing:.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .fa-friend-rank { color:#f1d598; font-size:12px; font-weight:900; margin-left:4px; }
      .fa-friend-sub { color: var(--muted); font-size:12px; margin-top:3px; }
      .fa-friend-stake { width:100%; min-width:0; background: rgba(255,255,255,.06); color:#fff8ef; border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:12px 14px; font-size:14px; }

      .fa-open-rooms { margin-top:12px; border:1px solid rgba(255,255,255,.10); background: rgba(22,10,2,.22); border-radius:18px; padding:12px; overflow:hidden; }
      .fa-open-rooms-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; }
      .fa-open-rooms-title { font-weight:900; color:#ffe7b4; letter-spacing:.04em; }
            .fa-open-rooms-list { display:flex; flex-wrap:wrap; gap:12px; max-height:260px; overflow:auto; align-items:stretch; padding-bottom:2px; overscroll-behavior: contain; }
      .fa-open-rooms-list.single-room { justify-content:center; }
      .fa-open-rooms-list.single-room .fa-room-item { min-width:min(100%, 420px); flex:0 1 420px; }
      .fa-room-item {
        display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; align-items:center; padding:14px;
        border-radius:20px; min-width:280px; flex:1 1 310px;
        background:
          linear-gradient(180deg, rgba(255,247,231,.11), rgba(255,247,231,.05)),
          linear-gradient(135deg, rgba(118,72,31,.42), rgba(72,41,20,.34) 55%, rgba(48,28,12,.42));
        border:1px solid rgba(255,235,202,.12);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 18px 34px rgba(28,13,3,.18);
      }
      .fa-room-item-title { font-weight:900; color:#fff4df; font-size:15px; letter-spacing:.01em; }
      .fa-room-item-meta { color: var(--muted); font-size:12px; margin-top:3px; }
      .fa-room-item-badge { display:inline-flex; align-items:center; gap:6px; margin-top:6px; padding:4px 8px; border-radius:999px; font-size:11px; font-weight:800; letter-spacing:.04em; }
      .fa-room-item-badge.open { background: rgba(60,180,90,.15); color:#b6ffbf; border:1px solid rgba(60,180,90,.25); }
      .fa-room-item-badge.locked { background: rgba(255,197,64,.12); color:#ffe39c; border:1px solid rgba(255,197,64,.25); }
      .fa-room-empty { padding:14px; border-radius:14px; background: rgba(255,255,255,.04); color: var(--muted); text-align:center; }
      .fa-btn.tiny { padding:8px 12px; font-size:12px; min-height:auto; border-radius:12px; }
      .fa-btn.ready-active, .fa-btn[aria-pressed="true"] {
        background: linear-gradient(180deg, rgba(131,96,49,.92), rgba(82,55,25,.95));
        color:#ffeec9;
        border-color: rgba(255,224,167,.28);
        box-shadow: inset 0 2px 10px rgba(0,0,0,.22), 0 0 0 1px rgba(255,234,190,.10);
        transform: translateY(1px);
      }

      .fa-main {
        max-width: 1440px; margin: 0 auto; padding: 8px 22px 28px;
        display: grid; grid-template-columns: minmax(0, 1.15fr) 380px; gap: 22px;
      }
      .fa-panel {
        background: linear-gradient(180deg, rgba(97,63,31,.34), rgba(52,32,17,.28));
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
        background: rgba(255,245,232,.06); border: 1px solid rgba(255,237,206,.10); border-radius: 20px; padding: 12px 14px;
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
      .fa-turn-timer { margin-top:8px; display:inline-flex; align-items:center; justify-content:center; min-width:112px; padding:8px 12px; border-radius:999px; font-size:13px; font-weight:900; letter-spacing:.04em; color:#fff7e6; background:linear-gradient(180deg, rgba(120,73,33,.42), rgba(73,40,17,.34)); border:1px solid rgba(255,228,179,.16); box-shadow: inset 0 1px 0 rgba(255,255,255,.06); }
      .fa-turn-timer.warning { color:#ffe0ae; border-color: rgba(255,189,96,.35); }
      .fa-turn-timer.danger { color:#ffd2c0; border-color: rgba(255,116,78,.45); background:linear-gradient(180deg, rgba(125,46,28,.48), rgba(77,25,12,.42)); }

      .fa-board-wrap {
        position: relative; width: 100%;
        display: flex; justify-content: center; align-items: center;
        padding: 14px 8px 10px; min-height: 720px;
        border-radius: 26px;
        overflow: hidden;
        touch-action: manipulation;
        background:
          linear-gradient(180deg, rgba(255,245,230,.08), rgba(255,245,230,0)),
          radial-gradient(circle at center, rgba(255,233,196,.07), transparent 68%),
          radial-gradient(circle at 14% 12%, rgba(232,188,110,.13), transparent 24%),
          radial-gradient(circle at 86% 18%, rgba(145,96,44,.10), transparent 24%),
          repeating-linear-gradient(
            90deg,
            rgba(255,255,255,.015) 0px,
            rgba(255,255,255,.015) 3px,
            rgba(0,0,0,.022) 3px,
            rgba(0,0,0,.022) 10px
          ),
          linear-gradient(135deg, rgba(120,76,35,.34), rgba(77,48,24,.3) 35%, rgba(49,29,15,.34) 100%);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 30px 90px rgba(28,15,6,.26);
      }
      .fa-board-wrap::before {
        content: '';
        position: absolute; inset: 0;
        background:
          radial-gradient(circle at 20% 15%, rgba(246,204,119,.09), transparent 18%),
          radial-gradient(circle at 80% 20%, rgba(74,112,255,.09), transparent 18%),
          radial-gradient(circle at 75% 85%, rgba(82,214,154,.08), transparent 18%),
          linear-gradient(120deg, rgba(255,255,255,.03), transparent 30%, rgba(255,255,255,.02) 58%, transparent 78%);
        pointer-events: none;
      }
      #fa-board {
        width: min(100%, 820px); height: auto; display: block;
        border-radius: 24px; box-shadow: 0 25px 70px rgba(0,0,0,.4);
        background: #deb978;
        touch-action: manipulation;
      }
      .fa-board-playerbar{
        position:absolute; z-index:4;
        display:flex; flex-direction:column; gap:3px;
        width:auto; min-width:0; max-width:min(26vw, 190px);
        padding:8px 10px; border-radius:14px;
        background:
          linear-gradient(180deg, rgba(74,44,21,.82), rgba(34,20,10,.78)),
          radial-gradient(circle at top, rgba(255,224,163,.10), transparent 55%);
        border:1px solid rgba(255,227,170,.14);
        box-shadow:0 10px 22px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.07);
        backdrop-filter: blur(10px);
        pointer-events:none;
      }
      .fa-board-playerbar.enemy{ left:14px; top:14px; align-items:flex-start; }
      .fa-board-playerbar.self{ right:14px; bottom:14px; text-align:right; align-items:flex-end; }
      .fa-board-playerbar.hidden{ display:none !important; }
      .fa-board-playerbar-name{
        font-size:11px; line-height:1.15; font-weight:900; color:#fff3dd; letter-spacing:.01em;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      }
      .fa-board-playerbar-stars{
        font-size:10px; line-height:1.1; font-weight:800; color:#ffd98a;
      }
      #fa-floating-surrender{
        position:absolute; left:0; top:0;
      }

      .fa-stage, .fa-overlay {
        position: absolute; inset: 0; display: grid; place-items: center;
        background: linear-gradient(180deg, rgba(35,20,8,.28), rgba(26,15,7,.46));
        padding: 18px;
        z-index: 6;
      }
      .fa-stage.hidden, .fa-overlay.hidden, .fa-modal.hidden, .fa-floating-game-actions.hidden { display: none; }
      .fa-stage-card, .fa-overlay-card, .fa-confirm-card {
        width: min(100%, 520px); padding: 24px; border-radius: 28px;
        background: linear-gradient(180deg, rgba(77,49,24,.94), rgba(47,29,15,.96));
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
      .fa-overlay-card.result-pop {
        width: min(100%, 460px);
        padding: 28px 24px 24px;
        background:
          linear-gradient(180deg, rgba(84,53,27,.98), rgba(43,26,13,.98)),
          radial-gradient(circle at top, rgba(255,226,154,.14), transparent 42%);
        border: 1px solid rgba(255,228,179,.18);
        box-shadow: 0 30px 90px rgba(0,0,0,.46), inset 0 1px 0 rgba(255,255,255,.08);
      }
      .fa-overlay-stars {
        margin-top: 14px;
        font-size: 34px;
        line-height: 1.1;
        font-weight: 1000;
        letter-spacing: .01em;
        color: #fff5d6;
        text-shadow: 0 10px 28px rgba(0,0,0,.26);
      }
      .fa-overlay-stars.positive { color: #ffe89b; }
      .fa-overlay-stars.negative { color: #ffb8a5; }
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
        top: 18px;
        z-index: 3;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .fa-floating-game-actions .fa-btn {
        min-width: 152px;
        backdrop-filter: blur(12px);
        background: rgba(66,40,19,.78);
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
        background: rgba(255,255,255,.06); color: #fff8ef; border-radius: 16px; padding: 12px 16px;
        font-weight: 800; cursor: pointer; transition: .2s ease; box-shadow: 0 10px 24px rgba(0,0,0,.18);
      }
      .fa-btn:hover { transform: translateY(-1px); background: rgba(255,255,255,.08); }
      .fa-btn.primary {
        background: linear-gradient(145deg, rgba(214,180,109,.98), rgba(126,98,43,.98));
        color: #121316; border-color: rgba(255,230,181,.36);
      }
      .fa-btn.danger { border-color: rgba(255,132,109,.28); color: #ffd3c8; }
      .fa-btn.ghost { background: rgba(255,248,238,.045); }
      .fa-btn.big { min-width: 180px; padding: 14px 20px; }
      .fa-panel-title { font-weight: 900; font-size: 18px; }
      .fa-panel-sub, .fa-mini-note { font-size: 13px; color: var(--muted); margin-top: 6px; }
      .fa-profile-inline {
        margin-top: 14px; display: flex; align-items: center; gap: 12px; padding: 12px 14px;
        background: rgba(255,245,232,.05); border: 1px solid rgba(255,237,206,.08); border-radius: 18px;
      }
      .fa-profile-main-meta { display:flex; align-items:center; justify-content:space-between; gap:12px; width:100%; min-width:0; }
      .fa-wallet-box {
        margin-top: 14px; padding: 16px; border-radius: 20px;
        background: linear-gradient(180deg, rgba(255,246,222,.12), rgba(255,246,222,.05));
        border: 1px solid rgba(255,227,160,.16);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
      }
      .fa-wallet-line { display:flex; align-items:center; gap:10px; color:#ffe9b2; font-weight:900; letter-spacing:.03em; }
      .fa-star-icon {
        display:inline-grid; place-items:center; width:30px; height:30px; border-radius:10px;
        background: radial-gradient(circle at 30% 30%, rgba(255,249,209,.98), rgba(255,210,87,.96) 48%, rgba(176,114,18,.96) 100%);
        color:#1f160a; font-size:17px; box-shadow: 0 8px 18px rgba(255,205,74,.22), inset 0 1px 1px rgba(255,255,255,.6);
      }
      .fa-star-icon.mini { width:26px; height:26px; border-radius:9px; font-size:15px; }
      #fa-current-stars { display:block; margin-top:10px; font-size:30px; letter-spacing:.02em; color:#fff8e8; }
      .fa-wallet-mini { margin-top:6px; color: var(--muted); font-size: 13px; }
      .fa-stats-grid { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .fa-stat-box, .fa-info-box { background: rgba(255,245,232,.05); border-radius: 18px; border: 1px solid rgba(255,237,206,.08); }
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
      .fa-rank-pos.crown-silver { background: linear-gradient(145deg, rgba(231,237,246,.96), rgba(137,148,167,.86)); color: #131722; box-shadow: 0 10px 24px rgba(159,171,194,.24); }
      .fa-rank-pos.crown-bronze { background: linear-gradient(145deg, rgba(223,174,136,.96), rgba(142,89,58,.9)); color: #1a1715; box-shadow: 0 10px 24px rgba(172,112,74,.24); }
      .fa-rank-pos.rank-four { background: linear-gradient(145deg, rgba(157,232,221,.96), rgba(40,122,111,.88)); color: #10211f; box-shadow: 0 10px 24px rgba(78,176,162,.22); }
      .fa-rank-pos.rank-five { background: linear-gradient(145deg, rgba(204,191,255,.96), rgba(98,82,170,.88)); color: #12111b; box-shadow: 0 10px 24px rgba(121,103,200,.22); }
      .fa-rank-pos.rank-six { background: linear-gradient(145deg, rgba(255,209,231,.96), rgba(170,70,123,.88)); color: #1f1018; box-shadow: 0 10px 24px rgba(207,108,158,.22); }
      .fa-rank-main { min-width: 0; }
      .fa-rank-name { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .fa-rank-sub { color: var(--muted); font-size: 12px; margin-top: 4px; }
      .fa-rank-badge {
        min-width: 68px; text-align: center; padding: 8px 10px; border-radius: 999px;
        background: rgba(213,178,108,.14); color: #f0d79d; font-weight: 800; border: 1px solid rgba(213,178,108,.24);
      }

      .fa-leader-tabs { display:flex; gap:10px; padding: 14px 18px 0; flex-wrap:wrap; }
      .fa-confirm-progress { margin-top: 14px; height: 10px; border-radius: 999px; overflow: hidden; background: rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.08); }
      #fa-confirm-progress-fill { height:100%; width:100%; background: linear-gradient(90deg, #d9c07f, #7bd46a); transition: width .2s linear; }
      .fa-modal {
        position: fixed; inset: 0; background: rgba(26,15,7,.56); display: grid; place-items: center; padding: 22px; z-index: 10;
      }
      .fa-modal-card {
        width: min(100%, 860px); max-height: min(88vh, 940px); border-radius: 28px;
        background: linear-gradient(180deg, rgba(73,47,24,.95), rgba(42,27,14,.96));
        border: 1px solid rgba(255,255,255,.08); box-shadow: var(--shadow); overflow: hidden;
      }
      .fa-modal-head {
        padding: 18px 20px; display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }
      .fa-modal-title { font-weight: 900; font-size: 24px; }
      .fa-modal-sub { font-size: 13px; color: var(--muted); margin-top: 4px; }
      .fa-modal-body { padding: 16px 18px 18px; overflow: auto; max-height: calc(88vh - 92px); }

      .fa-place-action {
        position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 14;
        pointer-events: none;
      }
      .fa-place-action .fa-btn { pointer-events: auto; min-width: 132px; }
      .fa-win-burst {
        position: absolute; inset: 0; z-index: 12; pointer-events: none; overflow: hidden;
      }
      .fa-win-burst.hidden { display: none; }
      .fa-win-spark {
        position: absolute; width: 14px; height: 14px; border-radius: 999px;
        background: radial-gradient(circle at 30% 30%, rgba(255,252,232,.98), rgba(255,207,92,.92) 42%, rgba(168,96,21,.08) 72%, transparent 73%);
        box-shadow: 0 0 18px rgba(255,219,116,.58);
        animation: faWinSpark 980ms cubic-bezier(.18,.78,.24,1) forwards;
      }
      .fa-win-spark.alt {
        background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.96), rgba(158,255,210,.9) 42%, rgba(38,126,87,.08) 72%, transparent 73%);
        box-shadow: 0 0 18px rgba(110,232,168,.52);
      }
      @keyframes faWinSpark {
        0% { transform: translate3d(0,0,0) scale(.2); opacity: 0; }
        14% { opacity: 1; }
        100% { transform: translate3d(var(--dx, 0px), var(--dy, -120px), 0) scale(1.3); opacity: 0; }
      }
      .fa-countdown {
        position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        z-index: 16; background: radial-gradient(circle at center, rgba(57,34,15,.06), rgba(23,13,7,.28));
        backdrop-filter: blur(2px);
      }
      .fa-countdown-num {
        min-width: auto; min-height: auto; border-radius: 0;
        display: flex; align-items: center; justify-content: center;
        padding: 0 18px;
        font-size: clamp(56px, 11vw, 108px); font-weight: 1000; letter-spacing: -.04em;
        color: #fff8e6; text-shadow: 0 8px 30px rgba(0,0,0,.35);
        background: transparent;
        box-shadow: none;
        border: 0;
      }
      .fa-countdown.start .fa-countdown-num {
        color: #ffe47c;
      }
      .fa-board-wrap.locked #fa-board { pointer-events: none; }
      .fa-board-wrap .fa-stage,
      .fa-board-wrap .fa-overlay,
      .fa-board-wrap .fa-countdown { border-radius: 26px; }
      .fa-board-wrap .fa-place-action.hidden,
      .fa-board-wrap .fa-countdown.hidden { display: none; }
      body.fa-roomlist-lock { overflow:hidden !important; overscroll-behavior:none; }
      body.fa-roomlist-lock .fa-open-rooms-list { touch-action: pan-y !important; overflow-x: hidden !important; overflow-y: auto !important; }

      .fa-confirm-card { width: min(100%, 420px); }
      .fa-confirm-icon {
        width: 62px; height: 62px; margin: 0 auto;
        display: grid; place-items: center; border-radius: 20px;
        background: linear-gradient(145deg, rgba(214,180,109,.98), rgba(126,98,43,.98));
        color: #121316; font-size: 26px; font-weight: 900;
      }

      body.fa-mobile-fullscreen .fa-topbar,
      body.fa-mobile-fullscreen .fa-right,
      body.fa-mobile-fullscreen .fa-bottom {
        display: none !important;
      }
      body.fa-mobile-fullscreen .fa-status-row {
        display: block !important;
        position: fixed;
        top: max(10px, env(safe-area-inset-top));
        left: 50%;
        transform: translateX(-50%);
        width: auto;
        margin: 0;
        z-index: 35;
        pointer-events: none;
      }
      body.fa-mobile-fullscreen .fa-status-row .fa-player-card,
      body.fa-mobile-fullscreen .fa-status-row .fa-turn,
      body.fa-mobile-fullscreen .fa-status-row .fa-streak {
        display: none !important;
      }
      body.fa-mobile-fullscreen .fa-status-row .fa-center-vs {
        padding: 0;
      }
      body.fa-mobile-fullscreen .fa-status-row .fa-turn-timer {
        display: inline-flex !important;
        min-width: 132px;
        padding: 10px 14px;
        font-size: 16px;
        box-shadow: 0 10px 28px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.08);
      }
      body.fa-mobile-fullscreen #fa-floating-game-actions{
        display:flex !important;
        right:12px;
        left:12px;
        top:max(12px, env(safe-area-inset-top));
        flex-direction:row;
        justify-content:space-between;
        align-items:flex-start;
      }
      body.fa-mobile-fullscreen #fa-floating-surrender{
        display:inline-flex !important;
        position:relative;
        left:auto; top:auto;
        min-width:132px;
      }
      body.fa-mobile-fullscreen .fa-board-playerbar{
        padding:10px 12px;
        border-radius:16px;
        max-width:min(42vw, 220px);
        box-shadow:0 14px 28px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.08);
      }
      body.fa-mobile-fullscreen .fa-board-playerbar-name{
        font-size:13px;
      }
      body.fa-mobile-fullscreen .fa-board-playerbar-stars{
        font-size:12px;
      }
      body.fa-mobile-fullscreen .fa-board-playerbar.enemy{
        top:86px;
        left:24px;
      }
      body.fa-mobile-fullscreen .fa-board-playerbar.self{
        right:24px;
        bottom:max(32px, env(safe-area-inset-bottom));
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
        background: linear-gradient(180deg, #3c2414 0%, #25160c 100%);
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
      #fa-nav-online { display:none !important; }
      body.fa-needs-profile.fa-route-home #fa-home-scene { display:none !important; }
      body.fa-route-ai .fa-stage-card.lobby,
      body.fa-route-create-room .fa-stage-card.lobby,
      body.fa-route-friend-match .fa-stage-card.lobby,
      body.fa-route-friends .fa-stage-card.lobby,
      body.fa-route-room .fa-stage-card.lobby {
        min-height: calc(100svh - 210px);
        padding: 20px;
      }
      body.fa-route-ai .fa-board-wrap,
      body.fa-route-create-room .fa-board-wrap,
      body.fa-route-friend-match .fa-board-wrap,
      body.fa-route-friends .fa-board-wrap,
      body.fa-route-room .fa-board-wrap {
        min-height: calc(100svh - 210px);
      }
      @media (max-width: 740px) {
        .fa-brand-area { width:auto; justify-content:flex-start; }
        .fa-top-wallet-row { padding: 0 14px 12px; }
        .fa-profile-main-meta { flex-direction:column; align-items:flex-start; }
        .fa-stage, .fa-overlay {
          align-items: start;
          overflow-y: auto;
          padding: max(14px, env(safe-area-inset-top)) 14px max(18px, env(safe-area-inset-bottom));
        }
        .fa-stage-card, .fa-overlay-card, .fa-confirm-card {
          margin: auto 0;
        }
        .fa-floating-game-actions { right: 12px; top: 12px; }
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
        .fa-room-actions { grid-template-columns: 1fr 1fr; }
        .fa-room-stake-pills { grid-column: 1 / -1; grid-template-columns: 1fr; }

        .fa-friend-panel.join-list-open .fa-room-presence,
        .fa-friend-panel.join-list-open .fa-start-profile { display:none !important; }
        .fa-friend-panel.join-list-open .fa-room-actions { grid-template-columns: 1fr; }
        .fa-friend-panel.join-list-open #fa-room-title-input,
        .fa-friend-panel.join-list-open #fa-create-room-btn,
        .fa-friend-panel.join-list-open #fa-leave-room-btn { display:none !important; }
        .fa-friend-panel.join-list-open #fa-room-code-input,
        .fa-friend-panel.join-list-open #fa-join-room-btn { display:none !important; }
        .fa-friend-panel.create-room-open .fa-room-presence,
        .fa-friend-panel.create-room-open .fa-start-profile { display:none !important; }
        .fa-friend-panel.create-room-open #fa-join-room-btn { display:none !important; }
        .fa-friend-row { grid-template-columns: 1fr; }
        .fa-friends-panel .fa-room-actions { grid-template-columns: 1fr; }
        .fa-room-actions input { grid-column: 1 / -1; }
        .fa-room-presence-slots { grid-template-columns: 1fr; }
        .fa-open-rooms { max-height: 46vh; display: flex; flex-direction: column; }
        .fa-open-rooms-list {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          flex-direction: column;
          flex-wrap: nowrap !important;
          gap: 10px;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          max-height: 32vh;
          width: 100%;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 2px;
          justify-content:flex-start;
          align-items: stretch;
          touch-action: pan-y !important;
          overscroll-behavior-y: contain;
          scroll-snap-type: y proximity;
        }
        .fa-open-rooms-list.single-room { overflow-y: auto !important; overflow-x: hidden !important; justify-content: flex-start; }
        .fa-room-item {
          display: grid;
          grid-template-columns: minmax(0,1fr) auto;
          min-width: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          flex: none !important;
          margin: 0;
          scroll-snap-align: start;
        }
        .fa-open-rooms-list.single-room .fa-room-item { min-width: 0 !important; width: 100% !important; max-width: 100% !important; flex: none !important; }
        .fa-board-wrap { min-height: 72vh; }
        .fa-board-playerbar{
          max-width:min(38vw, 180px);
          padding:7px 9px;
        }
        .fa-board-playerbar-name{ font-size:10px; }
        .fa-board-playerbar-stars{ font-size:10px; }
        .fa-top-wallet-row { display:none !important; }
        html, body, #fa-omok-app, .fa-wrap { min-height: 100%; height: auto; overflow-x: hidden; overflow-y: auto; }
        .fa-wrap { display:block; }
        .fa-topbar, .fa-scene-nav-wrap { flex: 0 0 auto; }
        .fa-home-scene, .fa-ranking-scene, .fa-main { min-height: 0; overflow: visible; -webkit-overflow-scrolling: touch; scroll-behavior: auto; }
        body.fa-route-ai .fa-main,
        body.fa-route-create-room .fa-main,
        body.fa-route-friend-match .fa-main,
        body.fa-route-friends .fa-main,
        body.fa-route-room .fa-main { padding-top: 0; }
        .fa-main { padding-bottom: calc(24px + env(safe-area-inset-bottom)); }
        body.fa-route-game .fa-topbar,
        body.fa-route-game .fa-scene-nav-wrap,
        body.fa-route-game .fa-top-wallet-row { display:none !important; }
        body.fa-route-game .fa-wrap { min-height: 100svh; }
        body.fa-route-game .fa-main { padding: 0 0 calc(8px + env(safe-area-inset-bottom)) !important; }
        body.fa-route-game .fa-panel.hero { border-radius: 0; }
        body.fa-route-game .fa-status-row { margin-bottom: 8px; }
        body.fa-route-game .fa-board-wrap { min-height: calc(100svh - 96px); border-radius: 0; }
        body.fa-route-game #fa-board { width: min(100vw - 10px, 100svh - 96px); }
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
    ui.overlayStars = root.querySelector('#fa-overlay-stars');
    ui.overlayText = root.querySelector('#fa-overlay-text');
    ui.turnLabel = root.querySelector('#fa-turn-label');
    ui.streakLabel = root.querySelector('#fa-streak-label');
    ui.turnTimer = root.querySelector('#fa-turn-timer');
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
    ui.startProfile = root.querySelector('.fa-start-profile');
    ui.sideAvatar = root.querySelector('#fa-side-avatar');
    ui.sideName = root.querySelector('#fa-side-name');
    ui.connectionNote = root.querySelector('#fa-connection-note');
    ui.currentStars = root.querySelector('#fa-current-stars');
    ui.currentStakeNote = root.querySelector('#fa-current-stake-note');
    ui.topStars = root.querySelector('#fa-top-stars');
    ui.roomStakePills = Array.from(root.querySelectorAll('.fa-stake-pill'));
    ui.leaderPreview = root.querySelector('#fa-leader-preview');
    ui.leaderModal = root.querySelector('#fa-leaderboard-modal');
    ui.leaderList = root.querySelector('#fa-leaderboard-list');
    ui.leaderTabTotal = root.querySelector('#fa-leader-tab-total');
    ui.leaderTabWeekly = root.querySelector('#fa-leader-tab-weekly');
    ui.leaderTabPrevious = root.querySelector('#fa-leader-tab-previous');
    ui.startScreen = root.querySelector('#fa-start-screen');
    ui.pauseScreen = root.querySelector('#fa-pause-screen');
    ui.pauseTitle = root.querySelector('#fa-pause-title');
    ui.pauseText = root.querySelector('#fa-pause-text');
    ui.confirmModal = root.querySelector('#fa-confirm-modal');
    ui.confirmTitle = root.querySelector('#fa-confirm-title');
    ui.confirmText = root.querySelector('#fa-confirm-text');
    ui.confirmProgress = root.querySelector('#fa-confirm-progress');
    ui.confirmProgressFill = root.querySelector('#fa-confirm-progress-fill');
    ui.lobbyText = root.querySelector('#fa-lobby-text');
    ui.lobbyResult = root.querySelector('#fa-lobby-result');
    ui.lobbyResultTitle = root.querySelector('#fa-lobby-result-title');
    ui.lobbyResultText = root.querySelector('#fa-lobby-result-text');
    ui.lobbyConfirmActions = root.querySelector('#fa-lobby-confirm-actions');
    ui.lobbyStartActions = root.querySelector('#fa-lobby-start-actions');
    ui.confirmProfileBtn = root.querySelector('#fa-confirm-profile-btn');
    ui.saveStart = root.querySelector('#fa-save-start');
    ui.floatingGameActions = root.querySelector('#fa-floating-game-actions');
    ui.floatingFullscreen = root.querySelector('#fa-floating-fullscreen');
    ui.floatingExitFullscreen = root.querySelector('#fa-floating-exit-fullscreen');
    ui.placeAction = root.querySelector('#fa-place-action');
    ui.placeBtn = root.querySelector('#fa-place-btn');
    ui.countdownOverlay = root.querySelector('#fa-countdown-overlay');
    ui.countdownText = root.querySelector('#fa-countdown-text');
    ui.enemyInfo = root.querySelector('#fa-enemy-info');
    ui.enemyName = root.querySelector('#fa-enemy-name');
    ui.enemyStars = root.querySelector('#fa-enemy-stars');
    ui.selfInfo = root.querySelector('#fa-self-info');
    ui.selfName = root.querySelector('#fa-self-name');
    ui.selfStars = root.querySelector('#fa-self-stars');
    ui.opponentName = root.querySelector('#fa-opponent-name');
    ui.modeLine = root.querySelector('#fa-mode-line');
    ui.friendPanel = root.querySelector('#fa-friend-panel');
    ui.modeAi = root.querySelector('#fa-mode-ai');
    ui.modeFriend = root.querySelector('#fa-mode-friend');
    ui.modeFriends = root.querySelector('#fa-mode-friends');
    ui.modeCreateRoom = root.querySelector('#fa-mode-create-room');
    ui.roomTitleInput = root.querySelector('#fa-room-title-input');
    ui.roomCodeInput = root.querySelector('#fa-room-code-input');
    ui.roomCodeView = root.querySelector('#fa-room-code-view');
    ui.roomStatus = root.querySelector('#fa-room-status');
    ui.roomActions = ui.roomTitleInput ? ui.roomTitleInput.parentElement : null;
    ui.createRoomBtn = root.querySelector('#fa-create-room-btn');
    ui.joinRoomBtn = root.querySelector('#fa-join-room-btn');
    ui.leaveRoomBtn = root.querySelector('#fa-leave-room-btn');
    ui.friendsPanel = root.querySelector('#fa-friends-panel');
    ui.addFriendInput = root.querySelector('#fa-add-friend-input');
    ui.addFriendBtn = root.querySelector('#fa-add-friend-btn');
    ui.refreshFriendsBtn = root.querySelector('#fa-refresh-friends-btn');
    ui.friendsList = root.querySelector('#fa-friends-list');
    ui.openRoomsPanel = root.querySelector('#fa-open-rooms-panel');
    ui.openRoomsList = root.querySelector('#fa-open-rooms-list');
    ui.refreshRoomsBtn = root.querySelector('#fa-refresh-rooms-btn');
    ui.roomPresence = root.querySelector('#fa-room-presence');
    ui.roomPresenceBadge = root.querySelector('#fa-room-presence-badge');
    ui.roomPresenceNote = root.querySelector('#fa-room-presence-note');
    ui.roomHostSlot = root.querySelector('#fa-room-host-slot');
    ui.roomGuestSlot = root.querySelector('#fa-room-guest-slot');
    ui.roomHostName = root.querySelector('#fa-room-host-name');
    ui.roomGuestName = root.querySelector('#fa-room-guest-name');
    ui.roomHostAvatar = root.querySelector('#fa-room-host-avatar');
    ui.roomGuestAvatar = root.querySelector('#fa-room-guest-avatar');
    ui.main = root.querySelector('.fa-main');
    ui.homeScene = root.querySelector('#fa-home-scene');
    ui.rankingScene = root.querySelector('#fa-ranking-scene');
    ui.rankingSceneList = root.querySelector('#fa-ranking-screen-list');
    ui.navHome = root.querySelector('#fa-nav-home');
    ui.navAi = root.querySelector('#fa-nav-ai');
    ui.navOnline = null;
    ui.navCreateRoom = root.querySelector('#fa-nav-create-room');
    ui.navFriendMatch = root.querySelector('#fa-nav-friend-match');
    ui.navFriends = root.querySelector('#fa-nav-friends');
    ui.navRanking = root.querySelector('#fa-nav-ranking');
    ui.sceneTitle = root.querySelector('#fa-scene-title');
    ui.sceneSubtitle = root.querySelector('#fa-scene-subtitle');
    ui.homeStats = root.querySelector('#fa-home-stats');
    ui.homeProfileName = root.querySelector('#fa-home-profile-name');
    ui.homeProfileRank = root.querySelector('#fa-home-profile-rank');
    ui.homeRoomLock = root.querySelector('#fa-home-room-lock');
    ui.homeAvatar = root.querySelector('#fa-home-avatar');

    if (ui.navHome) ui.navHome.addEventListener('click', () => navigateToScreen('home'));
    if (ui.navAi) ui.navAi.addEventListener('click', () => {
      if (isRoomNavigationLocked()) { navigateToScreen('room'); return; }
      switchMatchMode('ai');
      openStartScreen();
      navigateToScreen('ai');
    });
    if (ui.navCreateRoom) ui.navCreateRoom.addEventListener('click', () => {
      if (isRoomNavigationLocked()) { navigateToScreen('room'); return; }
      switchMatchMode('friend');
      openCreateRoomComposer();
    });
    if (ui.navFriendMatch) ui.navFriendMatch.addEventListener('click', () => {
      if (isRoomNavigationLocked()) { navigateToScreen('room'); return; }
      switchMatchMode('friend');
      openJoinRoomList();
    });
    if (ui.navFriends) ui.navFriends.addEventListener('click', () => {
      if (isRoomNavigationLocked()) { navigateToScreen('room'); return; }
      switchMatchMode('friend');
      openFriendsPanel();
    });
    if (ui.navRanking) ui.navRanking.addEventListener('click', () => navigateToScreen('ranking', { bypassLock: true }));
    const homeAi = root.querySelector('#fa-home-go-ai');
    const homeOnline = root.querySelector('#fa-home-go-online');
    const homeRanking = root.querySelector('#fa-home-go-ranking');
    if (homeAi) homeAi.addEventListener('click', () => {
      if (isRoomNavigationLocked()) { navigateToScreen('room'); return; }
      switchMatchMode('ai');
      openStartScreen();
      navigateToScreen('ai');
    });
    if (homeOnline) homeOnline.addEventListener('click', () => {
      if (isRoomNavigationLocked()) { navigateToScreen('room'); return; }
      switchMatchMode('friend');
      openJoinRoomList();
    });
    if (homeRanking) homeRanking.addEventListener('click', () => navigateToScreen('ranking', { bypassLock: true }));
    root.querySelector('#fa-close-leaderboard').addEventListener('click', closeLeaderboard);
    if (ui.leaderTabTotal) ui.leaderTabTotal.addEventListener('click', () => switchLeaderboardTab('total'));
    if (ui.leaderTabWeekly) ui.leaderTabWeekly.addEventListener('click', () => switchLeaderboardTab('weekly'));
    if (ui.leaderTabPrevious) ui.leaderTabPrevious.addEventListener('click', () => switchLeaderboardTab('previous'));
    const rankingTabTotal = root.querySelector('#fa-ranking-tab-total');
    const rankingTabWeekly = root.querySelector('#fa-ranking-tab-weekly');
    const rankingTabPrevious = root.querySelector('#fa-ranking-tab-previous');
    if (rankingTabTotal) rankingTabTotal.addEventListener('click', () => switchLeaderboardTab('total'));
    if (rankingTabWeekly) rankingTabWeekly.addEventListener('click', () => switchLeaderboardTab('weekly'));
    if (rankingTabPrevious) rankingTabPrevious.addEventListener('click', () => switchLeaderboardTab('previous'));
    root.querySelector('#fa-save-start').addEventListener('click', startGameFromLobby);
    root.querySelector('#fa-confirm-profile-btn').addEventListener('click', confirmLobbyProfile);
    root.querySelector('#fa-newgame-btn').addEventListener('click', handleNewMatch);
    ui.overlayConfirmBtn = root.querySelector('#fa-overlay-confirm-btn');
    root.querySelector('#fa-rematch-btn').addEventListener('click', () => { closeOverlay(); prepareMatch(); });
    root.querySelector('#fa-overlay-lobby-btn').addEventListener('click', async () => {
      closeOverlay();
      if (isOnlineMode()) await leaveOnlineRoom();
      else backToLobby();
    });
    if (ui.overlayConfirmBtn) ui.overlayConfirmBtn.addEventListener('click', async () => {
      closeOverlay();
      if (isOnlineMode()) await leaveOnlineRoom();
      backToLobby();
    });
    root.querySelector('#fa-reset-score-btn').addEventListener('click', resetCareer);
    root.querySelector('#fa-pause-btn').addEventListener('click', togglePause);
    root.querySelector('#fa-resume-btn').addEventListener('click', resumeGame);
    root.querySelector('#fa-back-lobby-btn').addEventListener('click', backToLobby);
    root.querySelector('#fa-confirm-cancel').addEventListener('click', closeConfirm);
    root.querySelector('#fa-mobile-fullscreen-btn').addEventListener('click', () => { requestMobileFullscreen(true); startGameFromLobby(); });
    root.querySelector('#fa-floating-fullscreen').addEventListener('click', () => requestMobileFullscreen(true));
    root.querySelector('#fa-floating-exit-fullscreen').addEventListener('click', exitMobileFullscreen);
    const floatingSurrenderBtn = root.querySelector('#fa-floating-surrender');
    if (floatingSurrenderBtn) floatingSurrenderBtn.addEventListener('click', surrenderOnlineMatch);
    ui.placeBtn.addEventListener('click', confirmPendingMove);
    ui.modeAi.addEventListener('click', () => switchMatchMode('ai'));
    ui.modeFriend.addEventListener('click', () => switchMatchMode('friend'));
    if (ui.modeFriends) ui.modeFriends.addEventListener('click', openFriendsPanel);
    if (ui.modeCreateRoom) ui.modeCreateRoom.addEventListener('click', openCreateRoomComposer);
    ui.createRoomBtn.addEventListener('click', createOnlineRoom);
    ui.joinRoomBtn.addEventListener('click', openJoinRoomList);
    ui.leaveRoomBtn.addEventListener('click', leaveOnlineRoom);
    if (ui.refreshRoomsBtn) ui.refreshRoomsBtn.addEventListener('click', openJoinRoomList);
    if (ui.addFriendBtn) ui.addFriendBtn.addEventListener('click', addFriendByNickname);
    if (ui.refreshFriendsBtn) ui.refreshFriendsBtn.addEventListener('click', refreshFriendsPanel);
    const surrenderBtn = root.querySelector('#fa-surrender-btn');
    if (surrenderBtn) surrenderBtn.addEventListener('click', surrenderOnlineMatch);

    ui.board.addEventListener('click', onBoardClick);
    ui.board.addEventListener('dblclick', e => e.preventDefault());
    ui.board.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
    ui.nickInput.addEventListener('keydown', e => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter') confirmLobbyProfile();
    });
    if (ui.roomCodeInput) ui.roomCodeInput.addEventListener('input', () => {
      ui.roomCodeInput.value = normalizeRoomCode(ui.roomCodeInput.value);
    });
    if (ui.roomCodeInput) ui.roomCodeInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') joinOnlineRoom();
    });
    if (ui.roomStakePills && ui.roomStakePills.length) ui.roomStakePills.forEach(btn => btn.addEventListener('click', () => {
      const stake = Number(btn.dataset.stake || STAR_WAGER_OPTIONS[0]);
      if (!STAR_WAGER_OPTIONS.includes(stake)) return;
      state.online.starWager = stake;
      syncUI();
    }));
    ui.leaderModal.addEventListener('click', e => {
      if (e.target === ui.leaderModal) closeLeaderboard();
    });
    ui.confirmModal.addEventListener('click', e => {
      if (e.target === ui.confirmModal) closeConfirm();
    });

    const delegatedButtonSound = e => {
      if (e && e.type === 'keydown' && !(e.key === 'Enter' || e.key === ' ' || e.code === 'Space')) return;
      const btn = e.target && e.target.closest ? e.target.closest('button, .fa-btn, .fa-chip, .fa-stake-pill') : null;
      if (!btn) return;
      if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
      const now = Date.now();
      if (now - Number(state.lastButtonSoundAt || 0) < 90) return;
      state.lastButtonSoundAt = now;
      try {
        initAudio();
        playUiTap();
      } catch (err) {}
    };

    root.addEventListener('click', delegatedButtonSound, true);
    root.addEventListener('touchend', delegatedButtonSound, { capture: true, passive: true });
    root.addEventListener('keydown', delegatedButtonSound, true);

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



  const COUNTDOWN_AUDIO_SRC = {
    three: 'data:audio/mpeg;base64,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A0gAAAAAMFVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVQ==',
    two: 'data:audio/mpeg;base64,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V1LF1GaAfoXxuACClmAbMIUDG5YAw5QDJFAxCF8RUA+IMZGi4Fr/83DE6yZK0omnW5gAKH1SLQBoQGxocRRoFIcIlNZXI0DIhSBUViOQtBM1NWXxxha25o5wR4GQHRrQFJMISFk1L5OEGIQ/DQCSIoURKYgiLjLcgQ5yj5DSHESX//mB6mpJFOpm1aP/3Ok0OwihZPv/WxABzRG4wBS5urqNOoyJ5MyNm5Ez/wJ/6owbtLwPwIzarsxRgI1EgIssNFg4IjxU6sNf+VOiV31Hi1VMQU1MQU1FMy4xMP/zgMT6M0L+qxeaoCQwVVVVVUxBTUUzLjEwMFVVVVVMQU1FMy4xMDBVVVVVTEFNRTMuMTAwVVVVVUxBTUUzLjEwMFVVVVVMQU1FMy4xMDBVVVVVTEFNRTMuMTAwVVVVVUxBTUUzLjEwMFVVVVVMQU1FMy4xMDBVVVVVTEFNRTMuMTAwVVVVVUxBTUUzLjEwMFVVVVVMQU1FMy4xMDBVVVVVTEFNRTMuMTAwVVVVVUxBTUUzLjEwMFVVVVVMQU1FMy4xMDBVVVVVTEFNRTMuMTD/8yDE8AhIQnJZwwAAMFVVVVVMQU1FMy4xMDBVVVVVTEFNRTMuMTAwVVVVVUxBTUUzLjEw//MQxPIAAANIAAAAADBVVVVVTEFNRTMuMTD/8xDE8gAAA0gAAAAAMFVVVVVMQU1FMy4xMP/zEMTyAAADSAAAAAAwVVVVVUxBTUUzLjEw//MQxPIAAANIAAAAADBVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVU=',
    one: 'data:audio/mpeg;base64,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',
    gamestart: 'data:audio/mpeg;base64,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yb6kWgs2VLuCqgFZdQCelilRHF2tHeJAM5bMXGWGUtj0viayYlAy0XBaW+sHw9PqALnlVC16cv1r7SYxWg6Ersf6ntyqXb1T15mW0u6rgxH8dcjkpga9qt/eRzGduyp3b0RflkWD7T1LllnWmrms9W9b/WVLdqXIeiM1b5VqTT/RKnlv41tb5jqdoe2Lt7O73eff39mjiOM5Yr1c92frfWx136WarX6u8f3zL8sorSwmJakfJbeyys67Y/Orlj9LLZQ/tij/85DE9T/rnqcfm8AF5qfxmZTOYmkjTOVMQU1FMy4xMExBTUUzLjEwMFVVVVVMQU1FMy4xMDBVVVVVTEFNRTMuMTAwVVVVVUxBTUUzLjEwMFVVVVVMQU1FMy4xMDBVVVVVTEFNRTMuMTAwVVVVVUxBTUUzLjEwMFVVVVVMQU1FMy4xMDBVVVVVTEFNRTMuMTAwVVVVVUxBTUUzLjEwMFVVVVVMQU1FMy4xMDBVVVVVTEFNRTMuMTAwVVVVVUxBTUUzLjEwMFVVVVVMQU1FMy4xMDBVVVVVTEFNRTMuMTAwVVVVVUxBTUUzLjEwMFVVVVVMQU1FMy4xMDBVVVVVTEFNRTMuMTD/8xDE7QAAA/wBwAAAMFVVVVVMQU1FMy4xMP/zEMTyAAADSAAAAAAwVVVVVUxBTUUzLjEw//MQxPIAAANIAAAAADBVVVVVTEFNRTMuMTD/8xDE8gAAA0gAAAAAMFVVVVVMQU1FMy4xMP/zEMTyAAADSAAAAAAwVVVVVUxBTUUzLjEw//MQxPIAAANIAAAAADBVVVVVTEFNRTMuMTD/8xDE8gAAA0gAAAAAMFVVVVVMQU1FMy4xMP/zEMTyAAADSAAAAAAwVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV'
  };

  function getCountdownAudio(key) {
    try {
      if (!COUNTDOWN_AUDIO_SRC[key]) return null;
      if (!state.countdownAudioCache) state.countdownAudioCache = {};
      if (!state.countdownAudioCache[key]) {
        const audio = new Audio(COUNTDOWN_AUDIO_SRC[key]);
        audio.preload = 'auto';
        audio.playsInline = true;
        state.countdownAudioCache[key] = audio;
      }
      const base = state.countdownAudioCache[key];
      const audio = base.cloneNode(true);
      audio.preload = 'auto';
      audio.playsInline = true;
      return audio;
    } catch {
      return null;
    }
  }

  async function playCountdownVoice(key, fallbackText, rate = 0.72, pitch = 1.25) {
    const audio = getCountdownAudio(key);
    if (audio) {
      try {
        audio.currentTime = 0;
        const maybePromise = audio.play();
        if (maybePromise && typeof maybePromise.then === 'function') {
          await maybePromise.catch(() => {});
        }
        return;
      } catch {}
    }
    speakSafe(fallbackText, rate, pitch);
  }

  function isMobileVoiceEnv() {
    try {
      return /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '');
    } catch {
      return false;
    }
  }

  function pickPreferredVoice(voices) {
    if (!voices || !voices.length) return null;
    return voices.find(v => /en-US/i.test(v.lang || '') && /(samantha|ava|victoria|allison|english|google us)/i.test(v.name || ''))
      || voices.find(v => /en-US/i.test(v.lang || ''))
      || voices.find(v => /^en(-|_)/i.test(v.lang || '') && /(female|woman|google|samantha|ava|victoria|allison)/i.test(v.name || ''))
      || voices.find(v => /^en(-|_)/i.test(v.lang || '') || /english/i.test(v.name || ''))
      || voices[0]
      || null;
  }

  function cacheVoices() {
    try {
      if (!window.speechSynthesis) return [];
      const synth = window.speechSynthesis;
      const voices = synth.getVoices ? synth.getVoices() : [];
      if (voices && voices.length) {
        state.cachedVoices = voices;
        state.preferredVoice = pickPreferredVoice(voices);
        state.voicesLoaded = true;
      }
      return state.cachedVoices || [];
    } catch {
      return state.cachedVoices || [];
    }
  }

  async function ensureSpeechReady() {
    try {
      if (!state.voiceEnabled || !window.speechSynthesis) return;
      const synth = window.speechSynthesis;
      const nowVoices = cacheVoices();
      if (nowVoices.length) return;

      await new Promise(resolve => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          try { synth.removeEventListener('voiceschanged', onVoices); } catch {}
          resolve();
        };
        const onVoices = () => { cacheVoices(); finish(); };
        try { synth.addEventListener('voiceschanged', onVoices); } catch {}
        try { synth.getVoices(); } catch {}
        setTimeout(finish, isMobileVoiceEnv() ? 1400 : 600);
      });

      cacheVoices();
    } catch {}
  }

  function speakSafe(text, rate = 0.72, pitch = 1.25) {
    try {
      if (!state.voiceEnabled || !window.speechSynthesis || !text) return;
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(String(text));
      utter.lang = 'en-US';
      utter.rate = rate;
      utter.pitch = pitch;
      utter.volume = 1;

      if (!state.cachedVoices || !state.cachedVoices.length) cacheVoices();
      if (state.preferredVoice) utter.voice = state.preferredVoice;

      const mobile = isMobileVoiceEnv();
      if (mobile) {
        utter.rate = Math.max(0.6, Math.min(rate, 0.78));
        utter.pitch = Math.max(1.0, pitch);
      }

      synth.cancel();
      const runSpeak = () => {
        try { synth.speak(utter); } catch (e) { console.log('voice error ignored:', e); }
      };
      if (mobile) setTimeout(runSpeak, 120);
      else runSpeak();
    } catch (e) {
      console.log('voice error ignored:', e);
    }
  }

  function setCountdownVisible(show, text = '3', startTone = false) {
    if (!ui.countdownOverlay || !ui.countdownText) return;
    ui.countdownText.textContent = text;
    ui.countdownOverlay.classList.toggle('hidden', !show);
    ui.countdownOverlay.classList.toggle('start', !!startTone);
  }

  function showPendingMoveAction(show) {
    if (!ui.placeAction) return;
    ui.placeAction.classList.toggle('hidden', !show);
    ui.boardWrap.classList.toggle('locked', !!state.countdownActive);
  }

  function clearPendingMove() {
    state.pendingMove = null;
    showPendingMoveAction(false);
    renderBoard();
  }

  function triggerHaptic(kind = 'tap') {
    try {
      if (!navigator.vibrate) return;
      const pattern = kind === 'win'
        ? [18, 40, 24, 44, 34]
        : kind === 'loss'
          ? [34, 60, 18]
          : kind === 'place'
            ? [12]
            : [8];
      navigator.vibrate(pattern);
    } catch {}
  }

  function playUiTap() {
    if (!state.audio) return;
    const ctx = state.audio;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(330, now + 0.06);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  function playRoomEventChime(type = 'join') {
    if (!state.audio) return;
    const ctx = state.audio;
    const now = ctx.currentTime;
    const notes = type === 'create' ? [392, 523.25, 659.25] : [659.25, 830.61, 987.77];
    notes.forEach((freq, index) => {
      const start = now + index * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type === 'create' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(type === 'create' ? 0.06 : 0.09, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  function getAvatarSymbol(seed, fallback = '✨') {
    return seed ? getAvatarBySeed(seed) : fallback;
  }

  function pulseRoomSlot(slot) {
    if (!slot) return;
    slot.classList.remove('pulse');
    void slot.offsetWidth;
    slot.classList.add('pulse');
    setTimeout(() => slot.classList.remove('pulse'), 1200);
  }


  function getProfilePath(userId) {
    return 'omokProfiles/' + String(userId || '');
  }

  function isUserOnline(profile) {
    return Date.now() - Number(profile?.lastSeenAt || 0) <= ROOM_PRESENCE_TTL_MS * 2;
  }

  async function publishMyProfile(extra = {}) {
    if (!window.firebase || !firebase.database || !state.profile?.id) return;
    try {
      const payload = {
        id: state.profile.id,
        nickname: state.profile.nickname || 'Player',
        nicknameLower: String(state.profile.nickname || '').trim().toLowerCase(),
        avatar: state.profile.avatar || getAvatarBySeed(state.profile.id),
        rank: getCurrentRankFromState(),
        gradeScore: state.gradeScore,
        stars: getCurrentStars(),
        friends: (state.profile && state.profile.friends) || {},
        lastSeenAt: Date.now(),
        ...extra
      };
      await firebase.database().ref(getProfilePath(state.profile.id)).update(payload);
    } catch (e) {
      console.log('profile publish ignored:', e);
    }
  }

  async function loadFriendsFromRemote() {
    if (!window.firebase || !firebase.database) return [];
    try {
      const snap = await firebase.database().ref('omokProfiles').once('value');
      const raw = snap.val() || {};
      const list = Object.values(raw)
        .filter(Boolean)
        .filter(v => v.id && v.id !== state.profile?.id)
        .filter(v => isUserOnline(v))
        .sort((a,b) => Number(b.lastSeenAt||0)-Number(a.lastSeenAt||0));
      state.friends.list = list;
      return list;
    } catch (e) {
      console.log('load online list ignored:', e);
      return [];
    }
  }

  async function refreshFriendsPanel() {
    await loadFriendsFromRemote();
    renderFriendsPanel();
  }

  function openFriendsPanel() {
    if (!isOnlineMode()) switchMatchMode('friend');
    state.started = false;
    state.paused = false;
    state.phase = 'intro';
    state.online.panelMode = 'friends';
    closeOverlay();
    closePauseScreen();
    clearPendingMove();
    openStartScreen();
    navigateToScreen(hasActiveRoomSession() ? 'room' : 'friends', { bypassLock: true });
    if (ui.openRoomsPanel) {
      ui.openRoomsPanel.classList.add('hidden');
      ui.openRoomsPanel.dataset.open = '';
    }
    setRoomListLocked(false);
    syncUI();
    refreshFriendsPanel();
  }

  function renderFriendsPanel() {
    if (!ui.friendsList) return;
    const list = Array.isArray(state.friends.list) ? state.friends.list : [];
    if (!list.length) {
      ui.friendsList.innerHTML = '<div class="fa-room-empty">No users are currently online.</div>';
      return;
    }
    ui.friendsList.innerHTML = list.map(friend => {
      const online = isUserOnline(friend);
      const stake = normalizeStarWager(state.online.starWager || STAR_BALANCE_DEFAULT, STAR_WAGER_OPTIONS[0]);
      const rank = escapeHtml(friend.rank || '1 Grade');
      return `<div class="fa-friend-row">
        <div class="fa-friend-row-meta">
          <div class="fa-friend-name">${escapeHtml(friend.nickname || 'Friend')} <span class="fa-friend-rank">[${rank}]</span></div>
          <div class="fa-friend-sub">${online ? 'Online now' : 'Offline'} · ★ ${formatNumber(friend.stars || 0)}</div>
        </div>
        <input class="fa-friend-stake" data-friend-stake="${escapeHtml(friend.id || '')}" type="number" min="1" step="1" value="${stake}" placeholder="Stake" />
        <button class="fa-btn" data-challenge-friend="${escapeHtml(friend.id || '')}" ${online ? '' : 'disabled'}>${online ? 'Challenge' : 'Offline'}</button>
      </div>`;
    }).join('');
    Array.from(ui.friendsList.querySelectorAll('[data-challenge-friend]')).forEach(btn => btn.addEventListener('click', () => {
      const friendId = btn.getAttribute('data-challenge-friend');
      const input = ui.friendsList.querySelector(`[data-friend-stake="${CSS.escape(friendId)}"]`);
      const stake = normalizeStarWager(input?.value || STAR_WAGER_OPTIONS[0], STAR_WAGER_OPTIONS[0]);
      sendFriendChallenge(friendId, stake);
    }));
  }

  async function addFriendByNickname() {
    return refreshFriendsPanel();
  }

  async function sendFriendChallenge(friendId, stake) {
    if (!window.firebase || !firebase.database || !state.profile?.id || !friendId) return;
    const wager = normalizeStarWager(stake, STAR_WAGER_OPTIONS[0]);
    if (!canAffordStars(wager)) {
      if (ui.roomStatus) ui.roomStatus.textContent = `Not enough stars. Need ★ ${formatNumber(wager)}.`;
      openNoticePopup('Not Enough Stars', `You need ★ ${formatNumber(wager)} to start this challenge.`, 'Confirm');
      return;
    }
    const friend = (state.friends.list || []).find(v => v.id === friendId);
    initAudio();
    try { playRoomEventChime('join'); } catch (e) {}
    openConfirm({
      title: 'Send Challenge?',
      text: `${friend?.nickname || 'Friend'} [${friend?.rank || '1 Grade'}] · ★ ${formatNumber(friend?.stars || 0)}\n\nDo you want to send a ★ ${formatNumber(wager)} challenge?`,
      confirmLabel: 'Confirm',
      onConfirm: async () => {
        try {
          const ref = firebase.database().ref('omokFriendChallenges/' + friendId).push();
          await ref.set({
            id: ref.key,
            challengerId: state.profile.id,
            challengerNickname: state.profile.nickname,
            challengerRank: getCurrentRankFromState(),
            targetId: friendId,
            targetNickname: friend?.nickname || 'Friend',
            targetRank: friend?.rank || '1 Grade',
            stake: wager,
            status: 'pending',
            createdAt: Date.now(),
            expiresAt: Date.now() + (1000 * 120)
          });
          if (ui.roomStatus) ui.roomStatus.textContent = `${friend?.nickname || 'Friend'} challenge sent for ★ ${formatNumber(wager)}.`;
        } catch (e) {
          console.log('send challenge ignored:', e);
        }
      }
    });
  }

  function showIncomingChallengePopup(challenge) {
    if (!challenge || !challenge.id) return;
    state.friends.popupChallengeId = challenge.id;
    state.friends.challengePopupOpen = true;
    initAudio();
    try { playRoomEventChime('join'); } catch (e) {}
    openConfirm({
      title: 'Challenge Request',
      text: `${challenge.challengerNickname || 'Friend'} [${challenge.challengerRank || '1 Grade'}]\nStake ★ ${formatNumber(challenge.stake || 0)}\n\nAccept this duel request?`,
      confirmLabel: 'Accept',
      onConfirm: async () => {
        state.friends.challengePopupOpen = false;
        await acceptFriendChallenge(challenge.id, true);
      },
      onCancel: async () => {
        state.friends.challengePopupOpen = false;
        state.friends.popupChallengeId = '';
        state.friends.dismissedChallengeId = challenge.id;
        try { localStorage.setItem('fa_omok_dismissed_challenge_id', challenge.id); } catch (e) {}
        try {
          if (challenge && challenge.id && state.profile?.id && window.firebase && firebase.database) {
            const ref = firebase.database().ref('omokFriendChallenges/' + state.profile.id + '/' + challenge.id);
            await ref.update({ status: 'declined', declinedAt: Date.now() });
          }
        } catch(e) {}
      },
      timeoutMs: Math.max(0, Number(challenge.expiresAt || 0) - Date.now())
    });
    const cancel = ui.root.querySelector('#fa-confirm-cancel');
    if (cancel) cancel.textContent = 'Later';
  }

  async function subscribeFriendChallenges() {
    if (!window.firebase || !firebase.database || !state.profile?.id) return;
    try {
      if (state.friends.challengeHandle) {
        try { state.friends.challengeHandle.off(); } catch {}
      }
      const ref = firebase.database().ref('omokFriendChallenges/' + state.profile.id);
      ref.on('value', snap => {
        const raw = snap.val() || {};
        const now = Date.now();
        const pending = Object.values(raw)
          .filter(v => v && v.status === 'pending' && (!v.expiresAt || Number(v.expiresAt) > now))
          .sort((a,b) => Number(b.createdAt||0)-Number(a.createdAt||0));
        const popupId = state.friends.popupChallengeId || '';
        const dismissedId = state.friends.dismissedChallengeId || '';
        const popupStillExists = popupId && pending.some(v => v.id === popupId);
        const dismissedStillExists = dismissedId && pending.some(v => v.id === dismissedId);
        if (popupId && !popupStillExists) {
          const wasOpen = !!state.friends.challengePopupOpen;
          state.friends.popupChallengeId = '';
          state.friends.challengePopupOpen = false;
          if (wasOpen) {
            closeConfirm();
            openNoticePopup('Challenge Removed', 'Challenge request has expired or was removed.', 'Confirm');
          }
        }
        if (dismissedId && !dismissedStillExists) {
          state.friends.dismissedChallengeId = '';
          try { localStorage.removeItem('fa_omok_dismissed_challenge_id'); } catch (e) {}
        }
        state.friends.incoming = pending;
        renderIncomingChallenges();
        if (!state.friends.challengePopupOpen && pending.length) {
          const nextChallenge = popupStillExists
            ? pending.find(v => v.id === popupId)
            : pending.find(v => v.id !== dismissedId);
          if (nextChallenge) showIncomingChallengePopup(nextChallenge);
        }
      });
      state.friends.challengeHandle = ref;
    } catch (e) {
      console.log('challenge sub ignored:', e);
    }
  }

  function renderIncomingChallenges() {
    if (!ui.friendsList || state.online.panelMode !== 'friends') return;
    const incoming = Array.isArray(state.friends.incoming) ? state.friends.incoming : [];
    const existing = ui.friendsList.innerHTML;
    if (!incoming.length) return;
    const top = incoming.map(ch => `<div class="fa-friend-row">
      <div class="fa-friend-row-meta">
        <div class="fa-friend-name">${escapeHtml(ch.challengerNickname || 'Friend')} <span class="fa-friend-rank">[${escapeHtml(ch.challengerRank || '1 Grade')}]</span> challenged you</div>
        <div class="fa-friend-sub">Stake ★ ${formatNumber(ch.stake || 0)}</div>
      </div>
      <div class="fa-friend-sub">Incoming duel</div>
      <button class="fa-btn primary" data-accept-challenge="${escapeHtml(ch.id || '')}">Accept</button>
    </div>`).join('');
    ui.friendsList.innerHTML = top + existing;
    Array.from(ui.friendsList.querySelectorAll('[data-accept-challenge]')).forEach(btn => btn.addEventListener('click', () => acceptFriendChallenge(btn.getAttribute('data-accept-challenge'))));
  }

  async function acceptFriendChallenge(challengeId, fromPopup = false) {
    const challenge = (state.friends.incoming || []).find(v => v.id === challengeId);
    if (!window.firebase || !firebase.database || !state.profile?.id) return;
    const challengeRef = firebase.database().ref('omokFriendChallenges/' + state.profile.id + '/' + challengeId);
    try {
      const snap = await challengeRef.once('value');
      const live = snap.val();
      if (!live || live.status !== 'pending' || (live.expiresAt && Number(live.expiresAt) <= Date.now())) {
        state.friends.popupChallengeId = '';
        state.friends.challengePopupOpen = false;
        state.friends.dismissedChallengeId = '';
        try { localStorage.removeItem('fa_omok_dismissed_challenge_id'); } catch (e) {}
        openNoticePopup('Challenge Removed', 'Challenge request has expired or was removed.', 'Confirm');
        return;
      }
      const wager = normalizeStarWager(live.stake, STAR_WAGER_OPTIONS[0]);
      if (!canAffordStars(wager)) {
        if (ui.roomStatus) ui.roomStatus.textContent = `Not enough stars. Need ★ ${formatNumber(wager)}.`;
        openNoticePopup('Not Enough Stars', `You need ★ ${formatNumber(wager)} to accept this challenge.`, 'Confirm');
        return;
      }
      await challengeRef.update({ status: 'accepted', acceptedAt: Date.now() });
      state.friends.popupChallengeId = '';
      state.friends.dismissedChallengeId = '';
      state.friends.challengePopupOpen = false;
      try { localStorage.removeItem('fa_omok_dismissed_challenge_id'); } catch (e) {}
      switchMatchMode('friend');
      state.online.starWager = wager;
      if (ui.roomTitleInput) ui.roomTitleInput.value = `${live.challengerNickname || 'Friend'} Duel`;
      await createOnlineRoom(null, { roomTitle: `${live.challengerNickname || 'Friend'} Duel`, roomCode: '', starWager: wager, autoStart: false, inviteOnly: false });
      const code = state.online.roomCode || '';
      await firebase.database().ref('omokFriendChallenges/' + live.challengerId).push().set({
        id: uid(),
        challengerId: state.profile.id,
        challengerNickname: state.profile.nickname,
        targetId: live.challengerId,
        targetNickname: live.challengerNickname,
        stake: wager,
        status: 'room_ready',
        roomId: state.online.roomId,
        roomCode: code,
        createdAt: Date.now()
      });
      if (ui.roomStatus) ui.roomStatus.textContent = `Challenge accepted. Room created for ★ ${formatNumber(wager)}.`;
    } catch (e) {
      console.log('accept challenge ignored:', e);
      if (fromPopup) openNoticePopup('Challenge Removed', 'Challenge request has expired or was removed.', 'Confirm');
    }
  }

  async function subscribeProfileInvites() {
    if (!window.firebase || !firebase.database || !state.profile?.id) return;
    try {
      if (state.friends.profileHandle) {
        try { state.friends.profileHandle.off(); } catch {}
      }
      const ref = firebase.database().ref('omokFriendChallenges/' + state.profile.id);
      ref.on('child_added', async snap => {
        const item = snap.val();
        if (!item || item.status !== 'room_ready' || item.targetId !== state.profile.id) return;
        if (item.consumedByTarget) return;
        try {
          await snap.ref.update({ consumedByTarget: true, consumedAt: Date.now() });
        } catch (e) {}
        if (ui.roomStatus) ui.roomStatus.textContent = `${item.targetNickname || 'Friend'} accepted. Joining challenge room...`;
        joinOnlineRoom(item.roomCode || '', item.roomId || '');
      });
      state.friends.profileHandle = ref;
    } catch (e) {
      console.log('profile invite ignored:', e);
    }
  }

  async function maybeKickInsufficientPlayer(room, winner) {
    if (!window.firebase || !firebase.database || !room) return false;
    const wager = normalizeStarWager(room.starWager, STAR_WAGER_OPTIONS[0]);
    const hostStars = Number(room.hostStars || 0);
    const guestStars = Number(room.guestStars || 0);
    const updates = {};
    let changed = false;
    if (room.hostId && hostStars < wager) {
      updates.hostId = null; updates.hostNickname = null; updates.hostReady = false; changed = true;
    }
    if (room.guestId && guestStars < wager) {
      updates.guestId = null; updates.guestNickname = null; updates.guestReady = false; changed = true;
    }
    if (!changed) return false;
    updates.status = (updates.hostId === null || !room.hostId || updates.guestId === null || !room.guestId) ? 'waiting' : 'ready';
    updates.updatedAt = Date.now();
    await firebase.database().ref(getRoomPath(room.id || room._key || state.online.roomId || state.online.roomCode)).update(updates);
    return true;
  }

  async function surrenderOnlineMatch() {
    if (!isOnlineMode() || !state.started || state.gameOver || state.phase !== 'playing') return;
    const winner = getOpponentSide();
    state.gameOver = true;
    state.winner = winner;
    state.winningLine = [];
    await finishGame(winner, [], false, 'surrender');
  }


  function renderOnlinePresence(room) {
    if (!ui.roomPresence) return;
    const active = isOnlineMode();
    ui.roomPresence.classList.toggle('hidden', !active);
    if (!active) return;

    const source = room || {
      id: state.online.roomId,
      title: state.online.roomTitle,
      accessCode: state.online.roomCode,
      hostId: state.online.hostId,
      guestId: state.online.guestId,
      hostNickname: state.online.hostName,
      guestNickname: state.online.guestName,
      status: state.online.status,
      hostReady: state.online.hostReady,
      guestReady: state.online.guestReady
    };
    const hasRoom = !!(source.id || source.accessCode || source.title);
    const hostName = source.hostNickname || (state.online.role === 'host' && state.profile ? state.profile.nickname : 'Waiting for host');
    const guestName = source.guestNickname || 'Waiting for guest';
    const status = source.status || 'idle';
    let badge = 'ROOM STANDBY';
    let note = 'Create a room to invite your friend.';
    if (hasRoom) {
      if (status === 'waiting') {
        badge = state.online.role === 'host' ? 'ROOM CREATED' : 'ROOM JOINED';
        note = source.accessCode ? `Private room ${source.accessCode} ready.` : 'Open room ready. Waiting for a guest.';
      } else if (status === 'ready') {
        badge = 'ROOM READY';
        note = (source.hostReady && source.guestReady) ? 'Both players are ready.' : (source.guestReady ? 'Guest is ready. Host can start.' : 'Guest joined. Waiting for ready.');
      } else if (status === 'countdown') {
        badge = 'MATCH STARTING';
        note = 'Countdown in progress.';
      } else if (status === 'playing') {
        badge = 'MATCH LIVE';
        note = 'Friendly duel in progress.';
      } else if (status === 'finished') {
        badge = 'MATCH FINISHED';
        note = 'Room stays open. Press Ready for an immediate rematch.';
      } else {
        badge = 'ROOM SYNCED';
        note = 'Room state is connected.';
      }
    }
    if (ui.roomPresenceBadge) ui.roomPresenceBadge.textContent = badge;
    if (ui.roomPresenceNote) ui.roomPresenceNote.textContent = note;
    if (ui.roomHostName) ui.roomHostName.textContent = hostName;
    if (ui.roomGuestName) ui.roomGuestName.textContent = guestName;
    if (ui.roomHostAvatar) ui.roomHostAvatar.textContent = hostName === 'Waiting for host' ? '👑' : getAvatarSymbol(source.hostId || hostName, '👑');
    if (ui.roomGuestAvatar) ui.roomGuestAvatar.textContent = guestName === 'Waiting for guest' ? '✨' : getAvatarSymbol(source.guestId || guestName, '✨');
    if (ui.roomHostSlot) ui.roomHostSlot.classList.toggle('filled', !!source.hostId);
    if (ui.roomGuestSlot) ui.roomGuestSlot.classList.toggle('filled', !!source.guestId);
  }

  function triggerWinBurst(type = 'win') {
    if (!ui.winBurst) return;
    ui.winBurst.innerHTML = '';
    ui.winBurst.classList.remove('hidden');
    const count = type === 'win' ? 22 : 12;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('span');
      dot.className = 'fa-win-spark' + ((type === 'win' && i % 3 === 0) || (type !== 'win' && i % 2 === 0) ? ' alt' : '');
      const x = 14 + Math.random() * 72;
      const y = 22 + Math.random() * 46;
      const dx = (Math.random() * 240 - 120).toFixed(0) + 'px';
      const dy = (-70 - Math.random() * 180).toFixed(0) + 'px';
      const delay = (Math.random() * 180).toFixed(0) + 'ms';
      const dur = (780 + Math.random() * 340).toFixed(0) + 'ms';
      dot.style.left = x + '%';
      dot.style.top = y + '%';
      dot.style.setProperty('--dx', dx);
      dot.style.setProperty('--dy', dy);
      dot.style.animationDelay = delay;
      dot.style.animationDuration = dur;
      ui.winBurst.appendChild(dot);
    }
    clearTimeout(state.winBurstTimer);
    state.winBurstTimer = setTimeout(() => {
      if (!ui.winBurst) return;
      ui.winBurst.classList.add('hidden');
      ui.winBurst.innerHTML = '';
    }, 1400);
  }

  async function startCountdownAndBeginMatch(skipPrepare = false) {
    if (state.countdownActive) return;
    state.countdownActive = true;
    showPendingMoveAction(false);
    setCountdownVisible(true, '3', false);
    syncUI();

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const steps = [
      { label: '3', say: 'three', audioKey: 'three', rate: 0.68, pitch: 1.18, wait: 980 },
      { label: '2', say: 'two', audioKey: 'two', rate: 0.68, pitch: 1.18, wait: 980 },
      { label: '1', say: 'one', audioKey: 'one', rate: 0.68, pitch: 1.18, wait: 980 },
      { label: 'START!', say: 'game start!', audioKey: 'gamestart', rate: 0.9, pitch: 1.5, wait: 900, startTone: true }
    ];

    try {
      initAudio();
      await ensureSpeechReady();
      for (const step of steps) {
        setCountdownVisible(true, step.label, !!step.startTone);
        speakSafe(step.say, step.rate, step.pitch);
        if (state.audio) {
          try { hitSound(step.startTone ? 'win' : 'stone'); } catch {}
        }
        await delay(step.wait);
      }
    } finally {
      setCountdownVisible(false, '', false);
      state.countdownActive = false;
      if (!skipPrepare) prepareMatch();
      if (skipPrepare && isOnlineMode() && state.online.role === 'host') await beginOnlinePlayingState();
      syncUI();
    }
  }

  function hitSound(type = 'stone') {
    if (!state.audio) return;
    const ctx = state.audio;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = type === 'stone' ? 0.32 : type === 'tick' ? 0.42 : type === 'ui' ? 0.3 : 0.22;
    master.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = type === 'tick' ? 'square' : 'triangle';
    osc1.frequency.setValueAtTime(type === 'stone' ? 190 : type === 'tick' ? 880 : 360, now);
    osc1.frequency.exponentialRampToValueAtTime(type === 'stone' ? 98 : type === 'tick' ? 620 : 180, now + 0.08);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(type === 'stone' ? 0.9 : type === 'tick' ? 0.75 : 0.45, now + 0.008);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + (type === 'tick' ? 0.18 : 0.11));
    osc1.connect(gain1).connect(master);
    osc1.start(now);
    osc1.stop(now + (type === 'tick' ? 0.18 : 0.12));

    const noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length * 8);
    noise.buffer = noiseBuffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = type === 'stone' ? 850 : type === 'tick' ? 1600 : 1200;
    band.Q.value = 1.1;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.001, now);
    ng.gain.exponentialRampToValueAtTime(type === 'stone' ? 0.33 : type === 'tick' ? 0.26 : 0.18, now + 0.005);
    ng.gain.exponentialRampToValueAtTime(0.001, now + (type === 'tick' ? 0.08 : 0.05));
    noise.connect(band).connect(ng).connect(master);
    noise.start(now);
    noise.stop(now + (type === 'tick' ? 0.08 : 0.055));
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
    const hasRoom = !!(state.online.roomId || state.online.roomCode);
    const compactFriendRoom = isOnlineMode() && hasRoom;
    if (ui.startProfile) ui.startProfile.classList.toggle('hidden', compactFriendRoom);
    if (ui.nicknameEditor) ui.nicknameEditor.classList.toggle('hidden', locked || compactFriendRoom);
    if (ui.fixedProfile) ui.fixedProfile.classList.toggle('hidden', !locked || compactFriendRoom);
    if (ui.fixedName) ui.fixedName.textContent = locked ? state.profile.nickname : 'Player';
    if (compactFriendRoom) {
      state.lobbyConfirmed = true;
      if (ui.nickNote) ui.nickNote.textContent = 'Room ready. Host and guest are shown above.';
    } else if (locked) {
      state.lobbyConfirmed = true;
      if (ui.nickNote) ui.nickNote.textContent = 'Nickname is locked. You can start immediately.';
    } else if (ui.nickNote) {
      ui.nickNote.textContent = 'This nickname will be used for ranking and future Firebase sync.';
    }
  }

  async function confirmLobbyProfile() {
    const hadProfileBefore = !!(state.profile && state.profile.nickname);
    const previousNickname = state.profile?.nickname || '';
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
      state.profile = ensureProfileEconomy({
        id,
        nickname,
        avatar: getAvatarBySeed(id),
        rank: getCurrentRankFromState(),
        gradeScore: state.gradeScore,
        provider: 'local',
        stars: STAR_BALANCE_DEFAULT,
        lastStarSettleKey: '',
        friends: {}
      });
    } else {
      state.profile.nickname = nickname;
      state.profile.avatar = state.profile.avatar || getAvatarBySeed(state.profile.id);
      ensureProfileEconomy(state.profile);
    }

    const duplicated = await state.remoteAdapter.nameExists(state.profile.nickname, state.profile.id);
    if (duplicated) {
      ui.nickNote.textContent = 'Nickname already exists on the ladder.';
      state.lobbyConfirmed = false;
      syncLobbyActions();
      return false;
    }

    state.lobbyConfirmed = true;
    const weeklySeason = ensureWeeklySeason();
    if (state.profile && state.profile.weeklyKey !== weeklySeason.key) {
      state.profile.weeklyKey = weeklySeason.key;
      state.profile.weeklyWins = 0;
      state.profile.weeklyLosses = 0;
      state.profile.weeklyGames = 0;
    }
    saveState();
    publishMyProfile();
    loadFriendsFromRemote();
    subscribeFriendChallenges();
    subscribeProfileInvites();
    renderLobbyStatus();
    updateAvatars();
    updateLobbyProfileUI();
    syncLobbyActions();
    updateFullscreenButtons();
    syncUI();
    if (ui.nickNote) ui.nickNote.textContent = 'Nickname saved. Press Game Start, or use Play Fullscreen on mobile.';
    if (!hadProfileBefore || previousNickname !== nickname) {
      try {
        initAudio();
        playRoomEventChime('create');
        triggerHaptic('tap');
      } catch (e) {}
      openNoticePopup('Nickname Created', `${nickname} is ready. You can now enter matches.`, 'OK');
    }
    return true;
  }

  async function startGameFromLobby() {
    if (state.countdownActive) return;
    if (!state.lobbyConfirmed) {
      const ok = await confirmLobbyProfile();
      if (!ok) return;
    }
    if (isOnlineMode()) {
      await startOnlineRoomMatch();
      return;
    }
    state.nextStarter = HUMAN;
    state.started = true;
    state.phase = 'countdown';
    state.appScreen = 'game';
    state.paused = false;
    renderLobbyStatus();
    updateAvatars();
    updateLobbyProfileUI();
    syncLobbyActions();
    updateFullscreenButtons();
    closeStartScreen();
    requestMobileFullscreen(state.fullscreenRequested);
    syncUI();
    await startCountdownAndBeginMatch();
  }

  function syncLobbyActions() {
    if (!ui.lobbyConfirmActions || !ui.lobbyStartActions) return;
    ui.lobbyConfirmActions.classList.toggle('hidden', !!state.lobbyConfirmed);
    ui.lobbyStartActions.classList.toggle('hidden', !state.lobbyConfirmed);
  }


  function updateTurnTimerLabel() {
    if (!ui.turnTimer) return;
    const visible = state.phase === 'playing' && state.started && !state.gameOver;
    ui.turnTimer.classList.toggle('hidden', !visible);
    if (!visible) return;
    const secs = Math.max(0, Number(state.turnSecondsLeft || 0));
    const owner = isOnlineMode()
      ? (state.turn === getMySide() ? 'My Turn' : 'Enemy Turn')
      : (state.turn === HUMAN ? 'My Turn' : 'AI Turn');
    ui.turnTimer.textContent = `${owner} ${secs}`;
    ui.turnTimer.classList.toggle('warning', secs <= 15 && secs > 5);
    ui.turnTimer.classList.toggle('danger', secs <= 5);
  }

  function stopTurnTimer() {
    if (state.turnTimerHandle) {
      clearInterval(state.turnTimerHandle);
      state.turnTimerHandle = null;
    }
    state.turnSecondsLeft = 60;
    state.turnLastAudioSecond = null;
    updateTurnTimerLabel();
  }

  function isTimedTurnLoserOnTimeout() {
    if (isOnlineMode()) return state.turn;
    return state.turn === HUMAN ? HUMAN : 0;
  }

  async function claimOnlineTimeoutLoss() {
    if (!isOnlineMode() || !(state.online.roomId || state.online.roomCode) || state.timeoutClaiming || !window.firebase || !firebase.database) return;
    state.timeoutClaiming = true;
    try {
      const path = getRoomPath(state.online.roomId || state.online.roomCode);
      const ref = firebase.database().ref(path);
      const snap = await ref.once('value');
      const room = snap.val();
      if (!room || room.status !== 'playing') return;
      const expiresAt = Number(room.turnExpiresAt || 0);
      if (expiresAt && Date.now() < expiresAt) return;
      const loserSide = Number(room.turn || HUMAN);
      const winnerSide = loserSide === HUMAN ? AI : HUMAN;
      await ref.update({
        status: 'finished',
        winner: winnerSide,
        winningLine: [],
        timeoutReason: 'clock',
        finishedAt: Date.now(),
        updatedAt: Date.now(),
        turnExpiresAt: 0
      });
    } catch (err) {
      console.log('timeout claim ignored:', err);
    } finally {
      state.timeoutClaiming = false;
    }
  }

  function startTurnTimer() {
    stopTurnTimer();
    if (state.phase !== 'playing' || state.gameOver || !state.started) return;
    if (!isOnlineMode() && state.turn !== HUMAN) {
      state.turnSecondsLeft = 60;
      updateTurnTimerLabel();
      return;
    }
    const localExpiresAt = Date.now() + TURN_LIMIT_MS;
    const tick = () => {
      const expiresAt = isOnlineMode()
        ? Number(state.online.turnExpiresAt || 0)
        : localExpiresAt;
      const secs = expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)) : 60;
      state.turnSecondsLeft = secs;
      updateTurnTimerLabel();
      if (secs <= 10 && secs > 0 && state.turnLastAudioSecond !== secs) {
        state.turnLastAudioSecond = secs;
        try {
          initAudio();
          hitSound('tick');
          speakSafe(String(secs), 0.78, 1.18);
        } catch {}
      }
      if (secs <= 0) {
        stopTurnTimer();
        if (isOnlineMode()) {
          claimOnlineTimeoutLoss();
        } else if (state.phase === 'playing' && state.started && !state.gameOver && state.turn === HUMAN) {
          state.gameOver = true;
          state.winner = AI;
          state.winningLine = [];
          finishGame(AI, [], false, 'clock');
        }
      }
      if (ui.roomStatus && isOnlineMode() && state.online.status === 'playing') {
        const turnLabel = state.turn === getMySide() ? 'Your turn' : 'Friend turn';
        ui.roomStatus.textContent = `${turnLabel} · ${secs}s`;
      }
    };
    tick();
    state.turnTimerHandle = setInterval(tick, 250);
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
    state.started = false;
    state.paused = false;
    state.phase = 'intro';
    clearPendingMove();
    stopTurnTimer();
    closePauseScreen();
    closeOverlay();
    openStartScreen();
    refreshFriendsPanel();
    syncUI();
  }

  function prepareMatch() {
    state.board = createBoard();
    state.turn = state.nextStarter || HUMAN;
    stopTurnTimer();
    state.gameOver = false;
    state.winner = 0;
    state.lastMove = null;
    state.pendingLock = false;
    stopTurnTimer();
    state.pendingMove = null;
    state.moveCount = 0;
    state.review = [];
    state.reviewIndex = 0;
    state.winningLine = [];
    state.paused = false;
    state.started = true;
    state.phase = 'playing';
    state.appScreen = 'game';
    closePauseScreen();
    closeOverlay();
    setCountdownVisible(false, '', false);
    showPendingMoveAction(false);
    startTurnTimer();
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
    state.appScreen = 'game';
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
    state.appScreen = 'game';
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
    clearPendingMove();
    setCountdownVisible(false, '', false);
    closePauseScreen();
    closeOverlay();
    exitMobileFullscreen();
    openStartScreen();
    navigateToScreen(hasActiveRoomSession() ? 'room' : (isOnlineMode() ? 'online' : 'ai'), { bypassLock: true });
    renderLeaderboard();
    syncUI();
  }

  function openStartScreen() {
    ui.startScreen.classList.remove('hidden');
    state.phase = 'intro';
    state.started = false;
    clearPendingMove();
    setCountdownVisible(false, '', false);
    state.lobbyConfirmed = !!(state.profile && state.profile.nickname);
    updateLobbyProfileUI();
    renderLobbyStatus();
    syncLobbyActions();
    syncUI();
    publishMyProfile();
  }

  function closeStartScreen() {
    ui.startScreen.classList.add('hidden');
  }

  function closePauseScreen() {
    ui.pauseScreen.classList.add('hidden');
  }

  function closeOverlay() {
    ui.overlay.classList.add('hidden');
    ui.overlay.classList.remove('result-pop');
    if (ui.overlayStars) {
      ui.overlayStars.textContent = '';
      ui.overlayStars.classList.add('hidden');
      ui.overlayStars.classList.remove('positive', 'negative');
    }
    if (ui.overlayConfirmBtn) ui.overlayConfirmBtn.classList.add('hidden');
    const rematchBtn = document.getElementById('fa-rematch-btn');
    const lobbyBtn = document.getElementById('fa-overlay-lobby-btn');
    if (rematchBtn) rematchBtn.classList.remove('hidden');
    if (lobbyBtn) lobbyBtn.classList.remove('hidden');
  }

  function showOverlay(title, text, options = {}) {
    const { starsText = '', starsTone = '', confirmOnly = false } = options || {};
    ui.overlayTitle.textContent = title;
    ui.overlayText.textContent = text;
    ui.overlay.classList.toggle('result-pop', !!confirmOnly);
    if (ui.overlayStars) {
      ui.overlayStars.textContent = starsText || '';
      ui.overlayStars.classList.toggle('hidden', !starsText);
      ui.overlayStars.classList.toggle('positive', starsTone === 'positive');
      ui.overlayStars.classList.toggle('negative', starsTone === 'negative');
    }
    const rematchBtn = document.getElementById('fa-rematch-btn');
    const lobbyBtn = document.getElementById('fa-overlay-lobby-btn');
    if (ui.overlayConfirmBtn) ui.overlayConfirmBtn.classList.toggle('hidden', !confirmOnly);
    if (rematchBtn) rematchBtn.classList.toggle('hidden', !!confirmOnly);
    if (lobbyBtn) lobbyBtn.classList.toggle('hidden', !!confirmOnly);
    ui.overlay.classList.remove('hidden');
  }


  function isOnlineMode() {
    return state.matchMode === 'friend';
  }

  function normalizeRoomCode(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  }

  function getRoomPath(roomIdOrCode) {
    return 'omokRooms/' + String(roomIdOrCode || '');
  }

  async function removeMyOtherRooms() {
    if (!window.firebase || !firebase.database || !state.profile?.id) return;
    try {
      const snap = await firebase.database().ref('omokRooms').once('value');
      const raw = snap.val() || {};
      const tasks = [];
      Object.entries(raw).forEach(([key, room]) => {
        if (!room) return;
        if (room.hostId === state.profile.id && key !== state.online.roomId) {
          tasks.push(firebase.database().ref(getRoomPath(key)).remove());
        }
      });
      if (tasks.length) await Promise.allSettled(tasks);
    } catch (err) {
      console.log('removeMyOtherRooms ignored:', err);
    }
  }

  function getMySide() {
    return isOnlineMode() ? (state.online.mySide || HUMAN) : HUMAN;
  }

  function getOpponentSide() {
    return getMySide() === HUMAN ? AI : HUMAN;
  }

  function boardHash(board) {
    try { return JSON.stringify(board || []); } catch { return ''; }
  }

  function switchMatchMode(mode) {
    if (isRoomNavigationLocked() && mode !== 'friend') {
      navigateToScreen('room');
      return false;
    }
    state.matchMode = mode === 'friend' ? 'friend' : 'ai';
    if (state.matchMode === 'ai') {
      state.online.status = 'idle';
      state.online.panelMode = 'none';
      if (!hasActiveRoomSession()) state.appScreen = 'ai';
    } else if (!(state.online.roomId || state.online.roomCode)) {
      state.online.panelMode = 'none';
      state.appScreen = 'online';
    }
    setRoomListLocked(false);
    syncUI();
    renderLobbyStatus();
    return true;
  }

  function openCreateRoomComposer() {
    if (!isOnlineMode()) switchMatchMode('friend');
    state.started = false;
    state.paused = false;
    state.phase = 'intro';
    state.online.panelMode = 'create';
    closeOverlay();
    closePauseScreen();
    clearPendingMove();
    openStartScreen();
    navigateToScreen('create-room', { bypassLock: true });
    if (ui.openRoomsPanel) {
      ui.openRoomsPanel.classList.add('hidden');
      ui.openRoomsPanel.dataset.open = '';
    }
    setRoomListLocked(false);
    syncUI();
    if (ui.roomTitleInput) setTimeout(() => ui.roomTitleInput.focus(), 0);
  }

  function showHostStartRequest(room) {
    if (!room || state.online.role !== 'host' || !room.guestId || !room.guestReady) return;
    const seenKey = String(room.updatedAt || room.guestPingAt || Date.now());
    if (state.online.lastGuestReadySeenAt === seenKey) return;
    state.online.lastGuestReadySeenAt = seenKey;
    playRoomEventChime('join');
    openConfirm({
      title: 'Start Match?',
      text: `${room.guestNickname || 'Guest'} is ready. Accept and start the match?`,
      confirmLabel: 'Accept',
      timeoutMs: 60000,
      onConfirm: async () => {
        if (!window.firebase || !firebase.database) return;
        playRoomEventChime('join');
        await firebase.database().ref(getRoomPath(state.online.roomId || state.online.roomCode)).update({
          hostReady: true,
          hostPingAt: Date.now(),
          status: 'countdown',
          countdownAt: Date.now(),
          winner: 0,
          winningLine: [],
          board: createBoard(),
          turn: state.nextStarter || HUMAN,
          nextStarter: state.nextStarter || HUMAN,
          turnExpiresAt: 0,
          moveCount: 0,
          lastMove: null,
          updatedAt: Date.now()
        });
        ui.roomStatus.textContent = 'Starting duel...';
      },
      onCancel: async () => {
        ui.roomStatus.textContent = 'Start request expired. Waiting for guest ready.';
      }
    });
  }

  async function leaveOnlineRoom() {
    try {
      if (!(state.online.roomId || state.online.roomCode) || !window.firebase || !firebase.database) {
        stopOnlinePresence();
        state.online = { roomId: '', roomCode: '', roomTitle: '', role: '', mySide: HUMAN, opponentName: 'Friend', opponentRank: '1 Grade', status: 'idle', unsubscribe: null, lastCountdownAt: 0, lastFinishedAt: 0, hostReady: false, guestReady: false, turnExpiresAt: 0, presenceHandle: null, hostId: '', guestId: '', hostName: '', guestName: '', lastGuestSeenId: '', lastRoomPulseAt: 0, panelMode: 'none', lastGuestReadySeenAt: 0, starWager: STAR_WAGER_OPTIONS[0] };
        if (ui.openRoomsPanel) ui.openRoomsPanel.dataset.open = '';
        syncUI();
        return;
      }
      const code = state.online.roomId || state.online.roomCode;
      if (state.online.unsubscribe) {
        try { state.online.unsubscribe.off(); } catch {}
      }
      const ref = firebase.database().ref(getRoomPath(code));
      const snap = await ref.once('value');
      const room = snap.val() || {};
      const updates = {};
      const leavingHost = room.hostId === state.profile?.id;
      const leavingGuest = room.guestId === state.profile?.id;
      if (leavingHost) {
        if (room.guestId) {
          updates.hostId = room.guestId;
          updates.hostNickname = room.guestNickname || 'Host';
          updates.hostReady = false;
          updates.hostStars = Number(room.guestStars || 0);
          updates.guestId = null;
          updates.guestNickname = null;
          updates.guestReady = false;
          updates.guestStars = 0;
        } else {
          updates.hostId = null;
          updates.hostNickname = null;
          updates.hostReady = false;
          updates.hostStars = 0;
        }
      }
      if (leavingGuest) {
        updates.guestId = null;
        updates.guestNickname = null;
        updates.guestReady = false;
        updates.guestStars = 0;
      }
      const next = { ...room, ...updates };
      if (!next.hostId && !next.guestId) await ref.remove();
      else if ((room.status === 'playing' || room.status === 'countdown') && next.hostId && next.guestId) {
        const winnerSide = leavingHost ? AI : HUMAN;
        await ref.update({
          status: 'finished',
          winner: winnerSide,
          winningLine: [],
          finishedAt: Date.now(),
          timeoutReason: 'leave',
          updatedAt: Date.now()
        });
      } else {
        next.status = next.hostId && next.guestId ? 'ready' : 'waiting';
        next.updatedAt = Date.now();
        await ref.set(next);
      }
    } catch (e) {
      console.log('leave room error ignored:', e);
    }
    stopOnlinePresence();
        state.online = { roomId: '', roomCode: '', roomTitle: '', role: '', mySide: HUMAN, opponentName: 'Friend', opponentRank: '1 Grade', status: 'idle', unsubscribe: null, lastCountdownAt: 0, lastFinishedAt: 0, hostReady: false, guestReady: false, turnExpiresAt: 0, presenceHandle: null, hostId: '', guestId: '', hostName: '', guestName: '', lastGuestSeenId: '', lastRoomPulseAt: 0, panelMode: 'none', lastGuestReadySeenAt: 0, starWager: STAR_WAGER_OPTIONS[0] };
    if (ui.openRoomsPanel) { ui.openRoomsPanel.classList.add('hidden'); ui.openRoomsPanel.dataset.open = ''; }
    setRoomListLocked(false);
    syncUI();
    renderLobbyStatus();
  }

  function attachOnlineRoom(roomId) {
    if (!window.firebase || !firebase.database || !roomId) return;
    if (state.online.unsubscribe) {
      try { state.online.unsubscribe.off(); } catch {}
    }
    const ref = firebase.database().ref(getRoomPath(roomId));
    ref.on('value', snap => {
      const room = snap.val();
      if (!room) return;
      applyOnlineRoomState(room);
    });
    state.online.unsubscribe = ref;
    startOnlinePresence();
  }

  function applyOnlineRoomState(room) {
    if (!room) return;
    const me = state.profile?.id;
    const isHost = room.hostId && me && room.hostId === me;
    const isGuest = room.guestId && me && room.guestId === me;
    state.online.roomId = room.id || room._key || state.online.roomId;
    state.online.roomCode = room.accessCode || room.code || '';
    state.online.roomTitle = room.title || state.online.roomTitle || '';
    state.online.role = isHost ? 'host' : isGuest ? 'guest' : state.online.role;
    state.online.mySide = isHost ? HUMAN : isGuest ? AI : state.online.mySide;
    const prevGuestId = state.online.guestId || '';
    const prevStatus = state.online.status || '';
    const prevGuestReady = !!state.online.guestReady;
    state.online.opponentName = isHost ? (room.guestNickname || 'Waiting...') : (room.hostNickname || 'Host');
    state.online.status = room.status || (room.guestId ? 'ready' : 'waiting');
    state.online.hostReady = !!room.hostReady;
    state.online.guestReady = !!room.guestReady;
    state.nextStarter = Number(room.nextStarter || HUMAN) || HUMAN;
    state.online.turnExpiresAt = Number(room.turnExpiresAt || 0);
    state.online.hostId = room.hostId || '';
    state.online.guestId = room.guestId || '';
    state.online.hostName = room.hostNickname || '';
    state.online.guestName = room.guestNickname || '';
    state.online.starWager = normalizeStarWager(room.starWager, STAR_WAGER_OPTIONS[0]);
    state.online.opponentStars = isHost ? Number(room.guestStars || 0) : isGuest ? Number(room.hostStars || 0) : 0;
    const hostAlive = isRoomRoleAlive(room, 'host');
    const guestAlive = isRoomRoleAlive(room, 'guest');
    if (!hostAlive && state.online.role === 'guest') {
      state.online.status = 'waiting';
      state.online.hostReady = false;
    }
    if (!guestAlive && state.online.role === 'host') {
      state.online.status = 'waiting';
      state.online.guestReady = false;
      state.online.opponentName = 'Waiting...';
      state.online.opponentStars = 0;
    }
    if (room.hostId && me && room.hostId === me && state.online.role !== 'host') {
      state.online.role = 'host';
      state.online.mySide = HUMAN;
      state.online.opponentName = room.guestNickname || 'Waiting...';
      state.online.opponentStars = Number(room.guestStars || 0);
    }

    if (state.online.role === 'host' && room.guestId && room.guestId !== prevGuestId) {
      playRoomEventChime('join');
      pulseRoomSlot(ui.roomGuestSlot);
      triggerHaptic('tap');
      if (ui.roomStatus && prevGuestId !== room.guestId && prevStatus === 'waiting') {
        ui.roomStatus.textContent = `${room.guestNickname || 'Your friend'} joined the room.`;
      }
    }

    if (room.status === 'countdown' && room.countdownAt && state.online.lastCountdownAt !== room.countdownAt) {
      state.online.lastCountdownAt = room.countdownAt;
      startCountdownAndBeginMatch(true);
    }

    if (room.status === 'playing') {
      state.started = true;
      state.phase = 'playing';
      state.gameOver = false;
      state.winner = 0;
      state.board = Array.isArray(room.board) ? room.board : createBoard();
      state.lastMove = room.lastMove || null;
      state.turn = room.turn || HUMAN;
      state.moveCount = Number(room.moveCount || 0);
      state.winningLine = Array.isArray(room.winningLine) ? room.winningLine : [];
      clearPendingMove();
      closeStartScreen();
      closePauseScreen();
      closeOverlay();
      renderBoard();
      startTurnTimer();
    } else if (room.status === 'ready' || room.status === 'waiting') {
      stopTurnTimer();
      state.started = false;
      state.phase = 'intro';
      openStartScreen();
      navigateToScreen('room', { bypassLock: true });
    } else if (room.status === 'countdown') {
      stopTurnTimer();
      openStartScreen();
    }

    if (room.status === 'finished' && room.finishedAt && state.online.lastFinishedAt !== room.finishedAt) {
      stopTurnTimer();
      state.online.lastFinishedAt = room.finishedAt;
      state.board = Array.isArray(room.board) ? room.board : state.board;
      state.lastMove = room.lastMove || state.lastMove;
      state.turn = room.turn || state.turn;
      state.moveCount = Number(room.moveCount || state.moveCount || 0);
      state.winningLine = Array.isArray(room.winningLine) ? room.winningLine : [];
      renderBoard(undefined, undefined, state.winningLine);
      if (!state.gameOver) finishGame(room.winner || 0, state.winningLine, true);
    }
    renderOnlinePresence(room);
    if (state.online.role === 'host' && room.status === 'ready' && room.guestReady && !prevGuestReady) {
      showHostStartRequest(room);
    }
    if (room.status !== 'waiting') setRoomListLocked(false);
    syncUI();
    renderLobbyStatus();
  }


  function sanitizeRoomTitle(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 24);
  }


  function setRoomListLocked(locked) {
    document.body.classList.toggle('fa-roomlist-lock', !!locked);
  }

  function stopOnlinePresence() {
    if (state.online.presenceHandle) {
      clearInterval(state.online.presenceHandle);
      state.online.presenceHandle = null;
    }
  }

  async function pingOnlinePresence() {
    try {
      if (!(state.online.roomId || state.online.roomCode) || !window.firebase || !firebase.database || !state.profile) return;
      const key = state.online.role === 'guest' ? 'guestPingAt' : 'hostPingAt';
      const starsKey = state.online.role === 'guest' ? 'guestStars' : 'hostStars';
      await firebase.database().ref(getRoomPath(state.online.roomId || state.online.roomCode)).update({ [key]: Date.now(), [starsKey]: getCurrentStars(), updatedAt: Date.now() });
      publishMyProfile();
    } catch (e) {
      console.log('presence ping ignored:', e);
    }
  }

  function startOnlinePresence() {
    stopOnlinePresence();
    if (!(state.online.roomId || state.online.roomCode) || !state.online.role) return;
    pingOnlinePresence();
    state.online.presenceHandle = setInterval(pingOnlinePresence, ROOM_PRESENCE_PING_MS);
  }

  function isRoomRoleAlive(room, role) {
    const stamp = Number(role === 'guest' ? room?.guestPingAt : room?.hostPingAt || 0);
    return !!stamp && (Date.now() - stamp) <= ROOM_PRESENCE_TTL_MS;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderOpenRooms(rooms) {
    if (!ui.openRoomsPanel || !ui.openRoomsList) return;
    ui.openRoomsPanel.classList.remove('hidden');
    setRoomListLocked(false);
    ui.openRoomsList.classList.toggle('single-room', rooms.length === 1);
    if (!rooms.length) {
      ui.openRoomsList.innerHTML = '<div class="fa-room-empty">No open rooms right now.</div>';
      return;
    }
    ui.openRoomsList.innerHTML = rooms.map(room => {
      const title = escapeHtml(room.title || 'Friendly Match');
      const host = escapeHtml(room.hostNickname || 'Host');
      const accessCode = escapeHtml(room.accessCode || room.code || '');
      const roomId = escapeHtml(room.id || room._key || '');
      const locked = !!(room.accessCode || room.code);
      const stake = STAR_WAGER_OPTIONS.includes(Number(room.starWager)) ? Number(room.starWager) : STAR_WAGER_OPTIONS[0];
      const badge = locked
        ? `<div class="fa-room-item-badge locked">Private room · ★ ${formatNumber(stake)}</div>`
        : `<div class="fa-room-item-badge open">Open room · ★ ${formatNumber(stake)}</div>`;
      const isMine = !!(state.profile && room.hostId === state.profile.id);
      const action = isMine
        ? `<button class="fa-btn ghost tiny" disabled>My Room</button>`
        : locked
          ? `<button class="fa-btn ghost tiny" data-room-locked="${roomId}">Use Code</button>`
          : `<button class="fa-btn tiny" data-room-id="${roomId}">Join</button>`;
      return `<div class="fa-room-item"><div><div class="fa-room-item-title">${title}</div><div class="fa-room-item-meta">Host ${host}${locked ? ' · Private' : ' · Open'} · Stake ★ ${formatNumber(stake)}</div>${badge}</div>${action}</div>`;
    }).join('');
    ui.openRoomsList.querySelectorAll('[data-room-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const roomId = btn.getAttribute('data-room-id');
        if (ui.roomStatus) ui.roomStatus.textContent = 'Joining room...';
        await joinOnlineRoom('', roomId);
      });
    });
    ui.openRoomsList.querySelectorAll('[data-room-locked]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (ui.roomStatus) ui.roomStatus.textContent = 'This room is private. Enter its code to join.';
        if (ui.roomCodeInput) ui.roomCodeInput.focus();
      });
    });
  }

  async function openJoinRoomList() {
    state.started = false;
    state.paused = false;
    state.phase = 'intro';
    state.online.panelMode = 'join';
    closeOverlay();
    closePauseScreen();
    clearPendingMove();
    openStartScreen();
    navigateToScreen('friend-match', { bypassLock: true });
    if (!window.firebase || !firebase.database) {
      ui.roomStatus.textContent = 'Firebase room sync is not available.';
      return;
    }
    if (ui.openRoomsPanel) ui.openRoomsPanel.dataset.open = '1';
    updateFriendRoomPanelVisibility();
    ui.roomStatus.textContent = 'Loading open rooms...';
    if (ui.openRoomsPanel) ui.openRoomsPanel.classList.remove('hidden');
    if (ui.openRoomsList) ui.openRoomsList.innerHTML = '<div class="fa-room-empty">Loading…</div>';
    const collectRooms = async (path) => {
      try {
        const snap = await firebase.database().ref(path).once('value');
        const raw = snap.val() || {};
        const now = Date.now();
        const rooms = [];
        const newestByHost = new Map();
        for (const [key, room] of Object.entries(raw)) {
          const item = { ...(room || {}), _key: key, id: room?.id || key };
          if (!item || !item.hostId) {
            try { await firebase.database().ref(path + '/' + key).remove(); } catch {}
            continue;
          }
          const age = now - Number(item.updatedAt || item.createdAt || 0);
          if (item.status === 'playing' || item.status === 'finished' || item.status === 'ended' || age > ROOM_STALE_MS) {
            if (age > ROOM_STALE_MS) {
              try { await firebase.database().ref(path + '/' + key).remove(); } catch {}
            }
            continue;
          }
          if (item.guestId) continue;
          const hostKey = String(item.hostId);
          const prev = newestByHost.get(hostKey);
          const stamp = Number(item.updatedAt || item.createdAt || 0);
          if (!prev || stamp > Number(prev.updatedAt || prev.createdAt || 0)) {
            newestByHost.set(hostKey, item);
          }
        }
        newestByHost.forEach(item => rooms.push(item));
        return rooms.sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
      } catch (err) {
        return [];
      }
    };
    let rooms = await collectRooms('omokRooms');
    if (!rooms.length) {
      const fallbackRooms = await collectRooms('rooms');
      if (fallbackRooms.length) rooms = fallbackRooms;
    }
    renderOpenRooms(rooms);
    ui.roomStatus.textContent = rooms.length ? 'Choose an open room or enter a private code.' : 'No open rooms right now. Pull refresh or tap Refresh.';
  }

  async function createOnlineRoom(_evt = null, options = null) {
    if (!state.profile) {
      const ok = await confirmLobbyProfile();
      if (!ok) return;
    }
    if (!window.firebase || !firebase.database) {
      ui.nickNote.textContent = 'Firebase room sync is not available.';
      return;
    }
    await removeMyOtherRooms();
    const starWager = normalizeStarWager(options?.starWager ?? getSelectedStarWager(), STAR_WAGER_OPTIONS[0]);
    if (!canAffordStars(starWager)) {
      if (ui.roomStatus) ui.roomStatus.textContent = `Not enough stars. You need ★ ${formatNumber(starWager)}.`;
      openNoticePopup('Not Enough Stars', `You need ★ ${formatNumber(starWager)} to create this room.`, 'Confirm');
      syncUI();
      return;
    }
    const accessCode = normalizeRoomCode(ui.roomCodeInput?.value);
    const roomTitle = sanitizeRoomTitle(ui.roomTitleInput?.value) || `${state.profile.nickname}'s Room`;
    const roomRef = firebase.database().ref('omokRooms').push();
    const roomId = roomRef.key;
    const now = Date.now();
    const payload = {
      id: roomId,
      accessCode: accessCode || '',
      code: accessCode || '',
      title: roomTitle,
      hostId: state.profile.id,
      hostNickname: state.profile.nickname,
      hostRank: getCurrentRankFromState(),
      guestId: null,
      guestNickname: null,
      status: 'waiting',
      hostReady: false,
      guestReady: false,
      board: createBoard(),
      turn: HUMAN,
      nextStarter: HUMAN,
      turnExpiresAt: 0,
      winner: 0,
      winningLine: [],
      moveCount: 0,
      starWager,
      hostStars: getCurrentStars(),
      guestStars: 0,
      starRewardRate: STAR_WIN_RATE,
      createdAt: now,
      hostPingAt: now,
      guestPingAt: 0,
      updatedAt: now
    };
    await roomRef.set(payload);
    state.online.roomId = roomId;
    state.online.roomCode = accessCode || '';
    state.online.roomTitle = roomTitle;
    state.online.panelMode = 'create';
    state.online.role = 'host';
    state.online.mySide = HUMAN;
    state.online.opponentName = 'Waiting...';
    state.online.opponentRank = '1 Grade';
    state.online.status = 'waiting';
    state.online.hostId = state.profile.id;
    state.online.guestId = '';
    state.online.hostName = state.profile.nickname;
    state.online.guestName = '';
    state.online.lastGuestSeenId = '';
    state.online.starWager = starWager;
    state.appScreen = 'room';
    playRoomEventChime('create');
    if (ui.roomStatus) ui.roomStatus.textContent = accessCode ? `Private room created. Share the room title and code. Stake ★ ${formatNumber(starWager)}.` : `Open room created. Your friend can join from the room list. Stake ★ ${formatNumber(starWager)}.`;
    if (ui.openRoomsPanel) { ui.openRoomsPanel.classList.add('hidden'); ui.openRoomsPanel.dataset.open = ''; }
    setRoomListLocked(false);
    attachOnlineRoom(roomId);
    publishMyProfile();
    publishMyProfile();
    syncUI();
  }

  async function joinOnlineRoom(codeOverride, roomIdOverride) {
    if (!state.profile) {
      const ok = await confirmLobbyProfile();
      if (!ok) return;
    }
    if (!window.firebase || !firebase.database) {
      ui.nickNote.textContent = 'Firebase room sync is not available.';
      return;
    }

    let roomId = roomIdOverride || '';
    let room = null;
    let ref = null;

    if (roomId) {
      ref = firebase.database().ref(getRoomPath(roomId));
      const snap = await ref.once('value');
      room = snap.val();
    } else {
      const code = normalizeRoomCode(codeOverride || ui.roomCodeInput?.value);
      if (!code) {
        ui.roomStatus.textContent = 'Enter the private room code or choose an open room.';
        return;
      }
      const snap = await firebase.database().ref('omokRooms').once('value');
      const raw = snap.val() || {};
      const found = Object.entries(raw).find(([key, item]) => {
        const candidate = item || {};
        return (candidate.accessCode || candidate.code || '').toUpperCase() === code;
      });
      if (!found) {
        ui.roomStatus.textContent = 'Private room code not found.';
        return;
      }
      roomId = found[0];
      room = found[1];
      ref = firebase.database().ref(getRoomPath(roomId));
    }

    if (!room) {
      ui.roomStatus.textContent = 'Room not found.';
      return;
    }
    if (room.hostId && state.profile && room.hostId === state.profile.id && state.online.role !== 'host') {
      ui.roomStatus.textContent = 'You cannot join your own room from another session. Leave that room first.';
      openNoticePopup('Own Room Locked', 'You cannot enter a room you created from another session. Press Leave Room in the original room first.', 'Confirm');
      return;
    }
    if (room.accessCode && !roomIdOverride) {
      const typed = normalizeRoomCode(codeOverride || ui.roomCodeInput?.value);
      if (typed !== normalizeRoomCode(room.accessCode)) {
        ui.roomStatus.textContent = 'Wrong room code.';
        return;
      }
    }
    if (room.guestId && room.guestId !== state.profile.id && room.hostId !== state.profile.id) {
      ui.roomStatus.textContent = 'This room is already full.';
      return;
    }
    const roomWager = normalizeStarWager(room.starWager, STAR_WAGER_OPTIONS[0]);
    if (!canAffordStars(roomWager)) {
      ui.roomStatus.textContent = `Not enough stars for this room. Need ★ ${formatNumber(roomWager)}.`;
      openNoticePopup('Not Enough Stars', `You need ★ ${formatNumber(roomWager)} to join this room.`, 'Confirm');
      return;
    }
    room.guestId = room.guestId || state.profile.id;
    room.guestNickname = room.guestNickname || state.profile.nickname;
    room.guestRank = room.guestRank || getCurrentRankFromState();
    room.hostReady = !!room.hostReady;
    room.guestReady = !!room.guestReady;
    room.status = room.hostId && room.guestId ? 'ready' : 'waiting';
    room.updatedAt = Date.now();
    room.guestPingAt = Date.now();
    room.guestStars = getCurrentStars();
    await ref.set({ ...room, id: room.id || roomId, code: room.accessCode || room.code || '' });
    state.online.roomId = roomId;
    state.online.roomCode = room.accessCode || room.code || '';
    state.online.roomTitle = room.title || '';
    state.online.panelMode = room.hostId === state.profile.id ? 'create' : 'friend-match';
    state.online.role = room.hostId === state.profile.id ? 'host' : 'guest';
    state.online.mySide = state.online.role === 'host' ? HUMAN : AI;
    state.online.opponentName = state.online.role === 'host' ? (room.guestNickname || 'Waiting...') : (room.hostNickname || 'Host');
    state.online.opponentRank = state.online.role === 'host' ? (room.guestRank || '1 Grade') : (room.hostRank || '1 Grade');
    state.online.status = room.status;
    state.online.hostId = room.hostId || '';
    state.online.guestId = room.guestId || '';
    state.online.hostName = room.hostNickname || '';
    state.online.guestName = room.guestNickname || '';
    state.online.starWager = roomWager;
    state.appScreen = 'room';
    if (state.online.role === 'guest') playRoomEventChime('join');
    attachOnlineRoom(roomId);
    publishMyProfile();
    if (ui.openRoomsPanel) { ui.openRoomsPanel.classList.add('hidden'); ui.openRoomsPanel.dataset.open = ''; }
    setRoomListLocked(false);
    if (ui.openRoomsPanel) { ui.openRoomsPanel.classList.add('hidden'); ui.openRoomsPanel.dataset.open = ''; }
    if (ui.roomStatus) ui.roomStatus.textContent = `Joined ${room.title || 'room'} · Stake ★ ${formatNumber(roomWager)} · Press Ready to enter the duel.`;
    openStartScreen();
    navigateToScreen('room', { bypassLock: true });
    refreshFriendsPanel();
    syncUI();
  }

  async function startOnlineRoomMatch() {
    if (!(state.online.roomId || state.online.roomCode) || !window.firebase || !firebase.database) {
      openStartScreen();
      navigateToScreen('room', { bypassLock: true });
      state.started = false;
      state.phase = 'intro';
      syncUI();
      return;
    }
    const ref = firebase.database().ref(getRoomPath(state.online.roomId || state.online.roomCode));
    const snap = await ref.once('value');
    const room = snap.val();
    if (!room || !room.hostId || !room.guestId) {
      ui.roomStatus.textContent = 'Wait until your friend joins the room.';
      openStartScreen();
      state.started = false;
      state.phase = 'intro';
      syncUI();
      return;
    }

    const roomWager = normalizeStarWager(room.starWager, STAR_WAGER_OPTIONS[0]);
    if (!canAffordStars(roomWager)) {
      ui.roomStatus.textContent = `Not enough stars for this room. Need ★ ${formatNumber(roomWager)}.`;
      openNoticePopup('Not Enough Stars', `You need ★ ${formatNumber(roomWager)} to continue this match.`, 'Confirm');
      openStartScreen();
      syncUI();
      await leaveOnlineRoom();
      return;
    }

    const amHost = state.online.role === 'host';
    const amGuest = state.online.role === 'guest';
    const hostAlive = isRoomRoleAlive(room, 'host');
    const guestAlive = isRoomRoleAlive(room, 'guest');
    if (amGuest) {
      if (!hostAlive) {
        ui.roomStatus.textContent = 'The host is no longer in the room.';
        openStartScreen();
        syncUI();
        return;
      }
      if (room.guestReady) {
        ui.roomStatus.textContent = 'Ready locked. Waiting for the host to start.';
        openStartScreen();
        syncUI();
        return;
      }
      await ref.update({
        guestReady: true,
        guestPingAt: Date.now(),
        hostReady: !!room.hostReady,
        status: 'ready',
        updatedAt: Date.now()
      });
      ui.roomStatus.textContent = 'Ready locked. Waiting for the host to start.';
      openStartScreen();
      syncUI();
      return;
    }

    if (amHost) {
      if (!room.guestId || !guestAlive) {
        await ref.update({
          guestId: null,
          guestNickname: null,
          guestReady: false,
          status: 'waiting',
          updatedAt: Date.now()
        });
        ui.roomStatus.textContent = 'Your friend is no longer in the room.';
        openStartScreen();
        syncUI();
        return;
      }
      if (!room.guestReady) {
        ui.roomStatus.textContent = 'Your friend must press Ready first.';
        openStartScreen();
        syncUI();
        return;
      }
      showHostStartRequest(room);
      return;
    }
  }

  async function beginOnlinePlayingState() {
    if (!(state.online.roomId || state.online.roomCode) || state.online.role !== 'host' || !window.firebase || !firebase.database) return;
    await firebase.database().ref(getRoomPath(state.online.roomId || state.online.roomCode)).update({
      status: 'playing',
      board: createBoard(),
      turn: state.nextStarter || HUMAN,
      nextStarter: state.nextStarter || HUMAN,
      turnExpiresAt: Date.now() + TURN_LIMIT_MS,
      winner: 0,
      winningLine: [],
      moveCount: 0,
      lastMove: null,
      updatedAt: Date.now()
    });
  }

  async function pushOnlineMove() {
    if (!(state.online.roomId || state.online.roomCode) || !window.firebase || !firebase.database) return;
    const finishedAt = state.gameOver ? (state.online.lastFinishedAt || Date.now()) : null;
    if (state.gameOver) state.online.lastFinishedAt = finishedAt;
    await firebase.database().ref(getRoomPath(state.online.roomId || state.online.roomCode)).update({
      status: state.gameOver ? 'finished' : 'playing',
      board: state.board,
      turn: state.turn,
      nextStarter: state.nextStarter || HUMAN,
      turnExpiresAt: state.gameOver ? 0 : Date.now() + TURN_LIMIT_MS,
      winner: state.winner || 0,
      winningLine: state.winningLine || [],
      moveCount: state.moveCount || 0,
      lastMove: state.lastMove || null,
      finishedAt,
      updatedAt: Date.now()
    });
  }

  function renderLobbyStatus() {
    if (!ui.lobbyResult) return;
    const result = state.lastResult;
    const summary = `Record ${state.totalWins}W · ${state.totalLosses}L · Best Streak ${state.bestStreak}`;
    if (isOnlineMode()) {
      if (!(state.online.roomId || state.online.roomCode)) ui.lobbyText.textContent = 'Create your room title, choose a star stake, or open the room list, then start your online friendly match.';
      else if (state.online.status === 'waiting') ui.lobbyText.textContent = `${state.online.roomTitle || 'Room'}${state.online.roomCode ? ' (' + state.online.roomCode + ')' : ''} is ready with ★ ${formatNumber(state.online.starWager || STAR_WAGER_OPTIONS[0])}. ${state.online.roomCode ? 'Share the code and wait for your friend.' : 'Your friend can join from the room list.'}`;
      else if (state.online.status === 'ready') ui.lobbyText.textContent = state.online.role === 'host' ? `${state.online.guestReady ? `Guest ready. Accept to begin the duel for ★ ${formatNumber(state.online.starWager || STAR_WAGER_OPTIONS[0])}.` : `Waiting for your friend to press Ready for ★ ${formatNumber(state.online.starWager || STAR_WAGER_OPTIONS[0])}.`}` : `${state.online.guestReady ? `Ready locked. Waiting for the host to start ★ ${formatNumber(state.online.starWager || STAR_WAGER_OPTIONS[0])}.` : `Press Ready to join the duel for ★ ${formatNumber(state.online.starWager || STAR_WAGER_OPTIONS[0])}.`}`;
      else ui.lobbyText.textContent = `Online room ${state.online.roomTitle || (state.online.roomCode || 'Open Room')} synced · ★ ${formatNumber(state.online.starWager || STAR_WAGER_OPTIONS[0])}.`;
    } else {
      ui.lobbyText.textContent = state.profile ? 'Press the center button to begin your next ranked match.' : 'Create your name, then begin your climb on the ladder.';
    }
    if (!result) {
      ui.lobbyResult.classList.add('hidden');
      return;
    }
    ui.lobbyResult.classList.remove('hidden');
    ui.lobbyResultTitle.textContent = result.title;
    ui.lobbyResultText.textContent = `${result.text} · ${summary}`;
  }

  function openConfirm({ title, text, onConfirm, onCancel, confirmLabel = 'Confirm', timeoutMs = 0 }) {
    ui.confirmTitle.textContent = title;
    ui.confirmText.textContent = text;
    ui.confirmModal.classList.remove('hidden');
    const ok = ui.root.querySelector('#fa-confirm-ok');
    const cancel = ui.root.querySelector('#fa-confirm-cancel');
    ok.textContent = confirmLabel;
    if (state.confirmTimer) clearInterval(state.confirmTimer);
    state.confirmTimer = null;
    state.confirmExpireAt = 0;
    if (ui.confirmProgress) ui.confirmProgress.classList.toggle('hidden', !timeoutMs);
    if (ui.confirmProgressFill) ui.confirmProgressFill.style.width = '100%';
    cancel.onclick = () => {
      const cb = onCancel;
      closeConfirm();
      if (typeof cb === 'function') cb();
    };
    ok.onclick = () => {
      closeConfirm();
      if (typeof onConfirm === 'function') onConfirm();
    };
    if (timeoutMs && ui.confirmProgressFill) {
      state.confirmExpireAt = Date.now() + timeoutMs;
      state.confirmTimer = setInterval(() => {
        const left = Math.max(0, state.confirmExpireAt - Date.now());
        ui.confirmProgressFill.style.width = ((left / timeoutMs) * 100).toFixed(2) + '%';
        if (left <= 0) {
          const cb = onCancel;
          closeConfirm();
          if (typeof cb === 'function') cb();
        }
      }, 200);
    }
  }

  function closeConfirm() {
    ui.confirmModal.classList.add('hidden');
    if (state.confirmTimer) clearInterval(state.confirmTimer);
    state.confirmTimer = null;
    state.confirmExpireAt = 0;
    if (ui.confirmProgress) ui.confirmProgress.classList.add('hidden');
    if (ui.confirmProgressFill) ui.confirmProgressFill.style.width = '100%';
    const ok = ui.root.querySelector('#fa-confirm-ok');
    const cancel = ui.root.querySelector('#fa-confirm-cancel');
    if (ok) ok.textContent = 'Confirm';
    if (cancel) {
      cancel.textContent = 'Cancel';
      cancel.classList.remove('hidden');
    }
  }

  function openNoticePopup(title, text, confirmLabel = 'Confirm') {
    initAudio();
    try { playRoomEventChime('join'); } catch (e) {}
    ui.confirmTitle.textContent = title;
    ui.confirmText.textContent = text;
    ui.confirmModal.classList.remove('hidden');
    const ok = ui.root.querySelector('#fa-confirm-ok');
    const cancel = ui.root.querySelector('#fa-confirm-cancel');
    if (ok) {
      ok.textContent = confirmLabel;
      ok.onclick = () => closeConfirm();
    }
    if (cancel) {
      cancel.classList.add('hidden');
      cancel.onclick = () => closeConfirm();
    }
    if (state.confirmTimer) clearInterval(state.confirmTimer);
    state.confirmTimer = null;
    state.confirmExpireAt = 0;
    if (ui.confirmProgress) ui.confirmProgress.classList.add('hidden');
    if (ui.confirmProgressFill) ui.confirmProgressFill.style.width = '100%';
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
        state.gradeScore = 0;
        if (state.profile) {
          state.profile.rank = getCurrentRankFromState();
          const weeklySeason = ensureWeeklySeason();
          state.profile.weeklyKey = weeklySeason.key;
          state.profile.weeklyWins = 0;
          state.profile.weeklyLosses = 0;
          state.profile.weeklyGames = 0;
        }
        saveState();
        syncProfileToLeaderboard();
        syncUI();
        renderLeaderboard();
        prepareMatch();
      }
    });
  }

  function updateFriendRoomPanelVisibility() {
    const hasRoom = !!(state.online.roomId || state.online.roomCode);
    const inFriendMode = isOnlineMode();
    const panelMode = state.online.panelMode || 'none';
    const screen = resolveAppScreen();
    const visualScreen = screen === 'online' ? getOnlineMenuScreen() : screen;

    const dedicatedCreate = visualScreen === 'create-room';
    const dedicatedJoin = visualScreen === 'friend-match' || visualScreen === 'online';
    const dedicatedFriends = visualScreen === 'friends';
    const dedicatedRoom = visualScreen === 'room';

    const showCreateComposer = inFriendMode && !hasRoom && dedicatedCreate;
    const showJoinList = inFriendMode && !hasRoom && dedicatedJoin;
    const showFriendsList = inFriendMode && dedicatedFriends;
    const showRoomPresence = inFriendMode && hasRoom && dedicatedRoom;

    if (ui.modeAi) ui.modeAi.classList.add('hidden');
    if (ui.modeFriend) ui.modeFriend.classList.add('hidden');
    if (ui.modeFriends) ui.modeFriends.classList.add('hidden');
    if (ui.modeCreateRoom) ui.modeCreateRoom.classList.add('hidden');

    if (ui.roomTitleInput) ui.roomTitleInput.classList.toggle('hidden', !showCreateComposer);
    if (ui.roomCodeInput) ui.roomCodeInput.classList.toggle('hidden', !showCreateComposer);
    if (ui.roomStakePills && ui.roomStakePills.length) {
      ui.roomStakePills.forEach(btn => btn.classList.toggle('hidden', !showCreateComposer));
      const pillsWrap = ui.roomStakePills[0].parentElement;
      if (pillsWrap) pillsWrap.classList.toggle('hidden', !showCreateComposer);
    }

    if (ui.createRoomBtn) ui.createRoomBtn.classList.toggle('hidden', !showCreateComposer);
    if (ui.joinRoomBtn) ui.joinRoomBtn.classList.add('hidden');
    if (ui.leaveRoomBtn) ui.leaveRoomBtn.classList.toggle('hidden', !showRoomPresence);
    if (ui.openRoomsPanel) ui.openRoomsPanel.classList.toggle('hidden', !showJoinList);
    if (ui.friendsPanel) ui.friendsPanel.classList.toggle('hidden', !showFriendsList);
    if (ui.roomPresence) ui.roomPresence.classList.toggle('hidden', !showRoomPresence);
    if (ui.startProfile) ui.startProfile.classList.toggle('hidden', showCreateComposer || showJoinList || showFriendsList || showRoomPresence);
    if (ui.roomActions) ui.roomActions.classList.toggle('room-locked', showRoomPresence);

    if (ui.friendPanel) {
      ui.friendPanel.classList.toggle('join-list-open', showJoinList);
      ui.friendPanel.classList.toggle('create-room-open', showCreateComposer);
    }
  }

  function syncUI() {
    const rank = getCurrentRankFromState();
    if (state.profile) state.profile.rank = rank;

    ui.playerName.textContent = state.profile ? state.profile.nickname : 'Guest';
    ui.playerRank.textContent = rank;
    ui.sideName.textContent = state.profile ? state.profile.nickname : 'Guest';
    ui.aiRank.textContent = isOnlineMode() ? 'Online Friendly' : getAiTitle();
    ui.streakLabel.textContent = 'Win Streak ' + state.streak;

    let turnText = 'Press Start';
    if (state.phase === 'intro') turnText = 'Press Start';
    else if (state.phase === 'paused') turnText = 'Paused';
    else if (state.gameOver) {
      turnText = state.winner === HUMAN ? 'Victory' : state.winner === AI ? 'Defeat' : 'Draw';
    } else {
      if (isOnlineMode()) turnText = state.turn === getMySide() ? 'Your Move' : 'Friend Turn';
      else turnText = state.turn === HUMAN ? 'Your Move' : 'AI Thinking';
    }
    ui.turnLabel.textContent = turnText;

    const progress = getNextRankProgress(state.gradeScore);
    ui.progressRank.textContent = progress.rank;
    ui.progressText.textContent = progress.need === 0 ? 'Max grade reached' : `${progress.current} / ${progress.max} points`;
    ui.progressFill.style.width = `${progress.need === 0 ? 100 : (progress.current / progress.max) * 100}%`;

    ui.totalWins.textContent = String(state.totalWins);
    ui.totalLosses.textContent = String(state.totalLosses);
    ui.totalGames.textContent = String(state.totalGames);
    ui.bestTier.textContent = String(state.bestStreak);
    const walletStars = getCurrentStars();
    const activeStake = isOnlineMode() ? (state.online.starWager || STAR_WAGER_OPTIONS[0]) : getSelectedStarWager();
    const opponentStars = isOnlineMode() ? Number(state.online.opponentStars || 0) : 0;
    if (ui.enemyName) ui.enemyName.textContent = isOnlineMode() ? `${state.online.opponentName || 'Opponent'} [${state.online.opponentRank || '1 Grade'}]` : 'FA AI';
    if (ui.enemyStars) ui.enemyStars.textContent = isOnlineMode() ? `★ ${formatNumber(opponentStars)}` : '';
    if (ui.selfName) ui.selfName.textContent = `${state.profile ? state.profile.nickname : 'Guest'} [${getCurrentRankFromState()}]`;
    if (ui.selfStars) ui.selfStars.textContent = `★ ${formatNumber(walletStars)}`;
    if (ui.enemyInfo) ui.enemyInfo.classList.toggle('hidden', !isOnlineMode());
    if (ui.selfInfo) ui.selfInfo.classList.toggle('hidden', !isOnlineMode());
    if (ui.currentStars) ui.currentStars.textContent = formatNumber(walletStars);
    if (ui.currentStakeNote) ui.currentStakeNote.textContent = `Owned Stars · ★ ${formatNumber(walletStars)}`;
    if (ui.topStars) ui.topStars.textContent = `★ ${formatNumber(walletStars)}`;
    if (ui.roomStakePills && ui.roomStakePills.length) {
      ui.roomStakePills.forEach(btn => {
        const stake = Number(btn.dataset.stake || 0);
        btn.classList.toggle('active', stake === activeStake);
      });
    }
    ui.scaleLine.textContent = isOnlineMode() ? ((state.online.roomId || state.online.roomCode) ? `${state.online.roomTitle || 'Room'}${state.online.roomCode ? ' · ' + state.online.roomCode : ' · Open'}` : 'Friend Match') : getAiTitle();
    ui.reviewLine.textContent = state.review.length ? `${state.reviewIndex + 1} / ${state.review.length}` : 'Ready';
    if (ui.opponentName) ui.opponentName.textContent = isOnlineMode() ? (state.online.opponentName || 'Friend') : 'FA AI';
    if (ui.modeLine) ui.modeLine.textContent = isOnlineMode() ? 'Friend Match Online' : 'Player vs AI';
    if (ui.friendPanel) ui.friendPanel.classList.toggle('hidden', !isOnlineMode());
    if (ui.friendsPanel) ui.friendsPanel.classList.toggle('hidden', !(isOnlineMode() && state.online.panelMode === 'friends'));
    if (ui.modeAi) ui.modeAi.classList.toggle('active', !isOnlineMode());
    if (ui.modeFriend) ui.modeFriend.classList.toggle('active', isOnlineMode() && state.online.panelMode !== 'friends');
    if (ui.modeFriends) ui.modeFriends.classList.toggle('active', isOnlineMode() && state.online.panelMode === 'friends');
    if (ui.roomCodeView) ui.roomCodeView.textContent = (state.online.roomId || state.online.roomCode) ? `${state.online.roomTitle || 'Room'}${state.online.roomCode ? ' · ' + state.online.roomCode : ' · Open'} · ★ ${formatNumber(state.online.starWager || STAR_WAGER_OPTIONS[0])}` : 'Room: ——';
    if (ui.roomStatus) ui.roomStatus.textContent = isOnlineMode() ? (state.online.status === 'ready' ? (state.online.role === 'host' ? (state.online.guestReady ? `Guest ready · accept to start · ★ ${formatNumber(state.online.starWager || STAR_WAGER_OPTIONS[0])}.` : `Waiting for your friend to press Ready · ★ ${formatNumber(state.online.starWager || STAR_WAGER_OPTIONS[0])}.`) : (state.online.guestReady ? `Ready locked · waiting for host start · ★ ${formatNumber(state.online.starWager || STAR_WAGER_OPTIONS[0])}.` : `Press Ready to enter the duel · ★ ${formatNumber(state.online.starWager || STAR_WAGER_OPTIONS[0])}.`)) : state.online.status === 'waiting' ? `Waiting for friend to join · ★ ${formatNumber(state.online.starWager || STAR_WAGER_OPTIONS[0])}.` : state.online.status === 'playing' ? `${state.turn === getMySide() ? 'Your turn' : 'Friend turn'} · ${Math.max(0, state.turnSecondsLeft)}s · ★ ${formatNumber(state.online.starWager || STAR_WAGER_OPTIONS[0])}` : state.online.status === 'countdown' ? `Starting now... · ★ ${formatNumber(state.online.starWager || STAR_WAGER_OPTIONS[0])}` : ((state.online.panelMode || 'none') === 'join' ? 'Choose an open room to join.' : (state.online.panelMode === 'create' ? 'Enter a room title, optional code, and star stake.' : 'Choose Create Room or Join Room.'))) : 'Create or join a room.';
    const surrenderBtn = ui.root.querySelector('#fa-surrender-btn');
    const floatingSurrenderBtn = ui.root.querySelector('#fa-floating-surrender');
    const newGameBtn = ui.root.querySelector('#fa-newgame-btn');
    const pauseBtn = ui.root.querySelector('#fa-pause-btn');
    const resetCareerBtn = ui.root.querySelector('#fa-reset-score-btn');
    const onlinePlayingOnlySurrender = !!(isOnlineMode() && state.phase === 'playing' && state.started && !state.gameOver);
    if (surrenderBtn) surrenderBtn.classList.toggle('hidden', !onlinePlayingOnlySurrender);
    if (floatingSurrenderBtn) floatingSurrenderBtn.classList.toggle('hidden', !onlinePlayingOnlySurrender);
    if (newGameBtn) newGameBtn.classList.toggle('hidden', onlinePlayingOnlySurrender);
    if (pauseBtn) pauseBtn.classList.toggle('hidden', onlinePlayingOnlySurrender);
    if (resetCareerBtn) resetCareerBtn.classList.toggle('hidden', onlinePlayingOnlySurrender);
    renderOnlinePresence();
    updateFriendRoomPanelVisibility();
    ui.connectionNote.textContent = isOnlineMode() ? ((state.online.roomId || state.online.roomCode) ? `Online room ${state.online.roomTitle || (state.online.roomCode || 'Open')}` : 'Firebase online friendly ready') : (state.remoteAdapter.mode === 'local-ready' ? 'Local ladder mode · Firebase ready' : 'Firebase connected');

    if (ui.saveStart) {
      let label = 'Game Start';
      let disabled = false;
      let active = false;
      if (isOnlineMode()) {
        if (!(state.online.roomId || state.online.roomCode)) {
          label = 'Game Start';
        } else if (state.online.status === 'waiting') {
          if (state.online.role === 'host') {
            label = 'Waiting for Join';
            disabled = true;
          } else {
            label = 'Ready';
          }
        } else if (state.online.status === 'ready') {
          if (state.online.role === 'guest') {
            label = state.online.guestReady ? 'Ready ✓' : 'Ready';
            active = !!state.online.guestReady;
          } else {
            label = state.online.guestReady ? 'Start' : 'Wait for Ready';
            disabled = !state.online.guestReady;
          }
        } else if (state.online.status === 'countdown') {
          label = 'Starting...';
          disabled = true;
        } else if (state.online.status === 'playing') {
          label = 'In Match';
          disabled = true;
        }
      }
      ui.saveStart.textContent = label;
      ui.saveStart.disabled = !!disabled;
      ui.saveStart.classList.toggle('ready-active', !!active);
      ui.saveStart.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    syncLobbyActions();
    updateFullscreenButtons();
    updateTurnTimerLabel();

    if (state.profile) {
      ui.nickInput.value = state.profile.nickname || '';
      ui.nickNote.textContent = state.lobbyConfirmed
        ? 'Nickname saved. Ready for ranked play and Firebase sync.'
        : 'Ready for ranked play and Firebase sync.';
    } else {
      ui.nickInput.value = '';
    }

    renderLobbyStatus();
    updateAvatars();
    updateLobbyProfileUI();
    syncLobbyActions();
    updateFullscreenButtons();
    syncAppScreen();
  }

  function updateAvatars() {
    const avatar = state.profile ? (state.profile.avatar || getAvatarBySeed(state.profile.id)) : '🐻';
    [ui.selfAvatar, ui.startAvatar, ui.sideAvatar, ui.homeAvatar].forEach(el => {
      if (!el) return;
      el.setAttribute('data-avatar', avatar);
    });
    const bot = ui.root.querySelector('.fa-avatar.bot');
    if (bot) bot.setAttribute('data-avatar', '🤖');
  }

  async function syncProfileToLeaderboard() {
    if (!state.profile || state.totalGames <= 0 || !isRankedAiMatch()) return;
    const season = ensureWeeklySeason();
    const entry = {
      id: state.profile.id,
      nickname: state.profile.nickname,
      avatar: state.profile.avatar,
      totalWins: state.totalWins,
      totalLosses: state.totalLosses,
      totalGames: state.totalGames,
      rank: getCurrentRankFromState(),
      gradeScore: state.gradeScore,
      streak: state.streak,
      bestStreak: state.bestStreak,
      weeklyWins: Number((state.profile && state.profile.weeklyWins) || 0),
      weeklyLosses: Number((state.profile && state.profile.weeklyLosses) || 0),
      weeklyGames: Number((state.profile && state.profile.weeklyGames) || 0),
      weeklyKey: season.key,
      stars: getCurrentStars()
    };
    await state.remoteAdapter.saveEntry(entry);
    upsertWeeklyLeaderboard(entry);
    await saveWeeklyEntryToFirebase(entry);
    state.leaderboardCache = await state.remoteAdapter.fetchTop(50);
    await fetchFirebaseWeeklyLeaderboards(7);
  }

  async function openLeaderboard() {
    await renderLeaderboard(true);
    navigateToScreen('ranking', { bypassLock: true });
  }

  function closeLeaderboard() {
    ui.leaderModal.classList.add('hidden');
    navigateToScreen(hasActiveRoomSession() ? 'room' : (state.lastNonGameScreen || 'home'), { bypassLock: true });
  }

  function formatDateTimeEnglish(dateLike) {
    const d = new Date(dateLike);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const month = months[d.getMonth()] || '';
    const day = d.getDate();
    let hour = d.getHours();
    const minute = String(d.getMinutes()).padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${month} ${day}, ${hour}:${minute} ${ampm}`;
  }

  function switchLeaderboardTab(tab) {
    state.leaderboardTab = tab === 'weekly' ? 'weekly' : tab === 'previous' ? 'previous' : 'total';
    if (ui.leaderTabTotal) ui.leaderTabTotal.classList.toggle('active', state.leaderboardTab === 'total');
    if (ui.leaderTabWeekly) ui.leaderTabWeekly.classList.toggle('active', state.leaderboardTab === 'weekly');
    if (ui.leaderTabPrevious) ui.leaderTabPrevious.classList.toggle('active', state.leaderboardTab === 'previous');
    const rankingTotal = document.getElementById('fa-ranking-tab-total');
    const rankingWeekly = document.getElementById('fa-ranking-tab-weekly');
    const rankingPrevious = document.getElementById('fa-ranking-tab-previous');
    if (rankingTotal) rankingTotal.classList.toggle('active', state.leaderboardTab === 'total');
    if (rankingWeekly) rankingWeekly.classList.toggle('active', state.leaderboardTab === 'weekly');
    if (rankingPrevious) rankingPrevious.classList.toggle('active', state.leaderboardTab === 'previous');
    renderLeaderboard(true);
  }

  async function renderLeaderboard(full = false) {
    let allBoard = Array.isArray(state.allLeaderboardEntries) && state.allLeaderboardEntries.length
      ? state.allLeaderboardEntries.slice()
      : [];
    if (!allBoard.length) {
      try { allBoard = await state.remoteAdapter.fetchAll(); } catch { allBoard = getLocalLeaderboard(); }
    }
    allBoard = Array.isArray(allBoard) ? sanitizeLeaderboardEntries(allBoard) : [];
    const totalBoard = allBoard.slice(0, 50);
    state.allLeaderboardEntries = allBoard;
    state.leaderboardCache = totalBoard;

    const weeklySeason = ensureWeeklySeason();
    let weeklyBoard = allBoard
      .filter(p => String(p.weeklyKey || '') === String(weeklySeason.key) && Number(p.weeklyWins || 0) > 0)
      .map(p => ({
        ...p,
        totalWins: Number(p.weeklyWins || 0),
        totalLosses: Number(p.weeklyLosses || 0),
        totalGames: Number(p.weeklyGames || 0)
      }))
      .sort(compareLeaderboard)
      .slice(0, 7);

    let sharedWeeklyMeta = null;
    try {
      const sharedWeekly = await fetchFirebaseWeeklyLeaderboards(7);
      sharedWeeklyMeta = sharedWeekly?.meta || null;
      if (sharedWeekly?.weekly?.length) weeklyBoard = sharedWeekly.weekly.slice(0, 7);
    } catch (err) {
      console.log('shared weekly refresh ignored:', err);
    }

    if (!weeklyBoard.length) weeklyBoard = getWeeklyLeaderboard().slice(0, 7);

    const rankMark = i => {
      if (i === 0) return { cls: 'crown-top', label: '👑' };
      if (i === 1) return { cls: 'crown-silver', label: '♕' };
      if (i === 2) return { cls: 'crown-bronze', label: '♔' };
      if (i === 3) return { cls: 'rank-four', label: '◆' };
      if (i === 4) return { cls: 'rank-five', label: '★' };
      if (i === 5) return { cls: 'rank-six', label: '✦' };
      return { cls: '', label: `${i + 1}${ordinalSuffix(i + 1)}` };
    };

    const buildRow = (p, i, weekly = false) => {
      const mark = rankMark(i);
      return `
      <div class="fa-rank-row">
        <div class="fa-rank-pos ${mark.cls}">${mark.label}</div>
        <div class="fa-rank-main">
          <div class="fa-rank-name">${escapeHtml(p.nickname)}</div>
          <div class="fa-rank-sub">${p.totalGames || 0} games · ${p.totalWins || 0} wins · ${p.totalLosses || 0} losses${weekly ? ' · resets Sat 12:00 PM · realtime' : ' · best streak ' + (p.bestStreak || 0)}</div>
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
          <div class="fa-rank-sub">Only players with at least 1 win appear here.</div>
        </div>
        <div class="fa-rank-badge">Waiting</div>
      </div>
    `;

    ui.leaderPreview.innerHTML = totalBoard.length ? totalBoard.slice(0,30).map((p,i)=>buildRow(p,i,false)).join('') : empty;
    if (full) {
      const prevSnap = getPreviousWeeklySnapshot();
      const previousBoard = (state.sharedPreviousWeeklyLeaderboard && state.sharedPreviousWeeklyLeaderboard.length ? state.sharedPreviousWeeklyLeaderboard : getPreviousWeeklyLeaderboard()).slice(0, 7);
      const activeBoard = state.leaderboardTab === 'weekly' ? weeklyBoard : state.leaderboardTab === 'previous' ? previousBoard : totalBoard;
      const weeklyHead = state.leaderboardTab === 'weekly'
        ? `<div class="fa-mini-note" style="margin:0 0 12px 0;">Weekly season: ${formatDateTimeEnglish(sharedWeeklyMeta?.current?.start || weeklySeason.start)} ~ ${formatDateTimeEnglish(sharedWeeklyMeta?.current?.end || weeklySeason.end)} · Top 7 · Auto realtime update</div>`
        : state.leaderboardTab === 'previous'
        ? `<div class="fa-mini-note" style="margin:0 0 12px 0;">Previous season: ${((sharedWeeklyMeta?.previous?.start) || prevSnap.meta?.start) ? formatDateTimeEnglish((sharedWeeklyMeta?.previous?.start) || prevSnap.meta?.start) : 'No data'} ~ ${((sharedWeeklyMeta?.previous?.end) || prevSnap.meta?.end) ? formatDateTimeEnglish((sharedWeeklyMeta?.previous?.end) || prevSnap.meta?.end) : 'No data'} · Finalized snapshot</div>`
        : '';
      const displayLimit = state.leaderboardTab === 'weekly' || state.leaderboardTab === 'previous' ? 7 : 30;
      const html = weeklyHead + (activeBoard.length ? activeBoard.slice(0, displayLimit).map((p,i)=>buildRow(p,i,state.leaderboardTab !== 'total')).join('') : empty);
      ui.leaderList.innerHTML = html;
      if (ui.rankingSceneList) ui.rankingSceneList.innerHTML = html;
    }
    if (ui.rankingSceneList && !full) {
      ui.rankingSceneList.innerHTML = ui.leaderPreview.innerHTML;
    }
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
    const active = document.activeElement;
    const typing = !!(
      e.isComposing ||
      e.keyCode === 229 ||
      (active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable
      ))
    );
    if (typing) return;

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
    if (!state.started || state.phase !== 'playing' || state.turn !== getMySide() || state.gameOver || state.pendingLock || state.paused || state.countdownActive) return;

    const rect = ui.board.getBoundingClientRect();
    const scaleX = ui.board.width / rect.width;
    const scaleY = ui.board.height / rect.height;
    const pos = nearestPoint((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    if (!pos) return;
    if (state.board[pos.y][pos.x] !== EMPTY) return;

    state.pendingMove = { x: pos.x, y: pos.y, side: HUMAN };
    showPendingMoveAction(true);
    renderBoard();
    syncUI();
  }

  function confirmPendingMove() {
    const pos = state.pendingMove;
    if (!pos) return;
    if (!state.started || state.phase !== 'playing' || state.turn !== getMySide() || state.gameOver || state.pendingLock || state.paused || state.countdownActive) return;
    if (state.board[pos.y][pos.x] !== EMPTY) {
      clearPendingMove();
      return;
    }

    showPendingMoveAction(false);
    initAudio();
    playUiTap();
    triggerHaptic('place');
    placeMove(pos.x, pos.y, getMySide());
    state.pendingMove = null;
    if (isOnlineMode()) {
      pushOnlineMove();
      return;
    }
    if (state.gameOver) return;

    state.turn = AI;
    startTurnTimer();
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
    startTurnTimer();
    syncUI();
  }

  async function finishGame(winner, line, fromRemote = false, finishReason = '') {
    state.pendingLock = false;
    const rankedAi = isRankedAiMatch();
    if (rankedAi) state.totalGames += 1;
    let title = 'Draw';
    let text = 'No winner this round.';
    const mySide = getMySide();
    const oppSide = getOpponentSide();
    let starResult = null;
    if (isOnlineMode()) {
      if (!fromRemote) state.online.lastFinishedAt = Date.now();
      starResult = applyStarSettlementForResult(
        winner,
        state.online.starWager || STAR_WAGER_OPTIONS[0],
        state.online.lastFinishedAt,
        state.online.roomId || state.online.roomCode
      );
    }
    if (winner === mySide) {
      state.nextStarter = oppSide;
      if (rankedAi) {
        state.totalWins += 1;
        applyRankedResult(true);
        state.streak += 1;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
      }
      title = 'Victory!';
      text = rankedAi
        ? `Elegant finish. ${getCurrentRankFromState()} · Streak ${state.streak}`
        : (starResult ? `You won the match. Stars have been added to your wallet.` : `You won the match.`);
      triggerWinBurst('win');
      triggerHaptic('win');
      fanfare(true);
    } else if (winner === oppSide) {
      state.nextStarter = mySide;
      if (rankedAi) {
        state.totalLosses += 1;
        applyRankedResult(false);
        state.streak = 0;
      }
      title = 'Defeat!';
      text = rankedAi
        ? `The AI held the line. ${getCurrentRankFromState()} · Challenge ${getAiTitle()}`
        : (starResult ? `You lost the match. Stars have been deducted from your wallet.` : `You lost the match.`);
      triggerWinBurst('loss');
      triggerHaptic('loss');
      fanfare(false);
    } else if (!rankedAi && isOnlineMode()) {
      state.nextStarter = HUMAN;
      text = `Draw match. No stars changed.`;
    } else {
      state.nextStarter = HUMAN;
    }
    const weeklySeason = ensureWeeklySeason();
    if (rankedAi && state.profile) {
      if (state.profile.weeklyKey !== weeklySeason.key) { state.profile.weeklyKey = weeklySeason.key; state.profile.weeklyWins = 0; state.profile.weeklyLosses = 0; state.profile.weeklyGames = 0; }
      state.profile.weeklyGames = Number(state.profile.weeklyGames || 0) + 1;
      if (winner === mySide) state.profile.weeklyWins = Number(state.profile.weeklyWins || 0) + 1;
      else if (winner === oppSide) state.profile.weeklyLosses = Number(state.profile.weeklyLosses || 0) + 1;
    }
    saveState();
    if (isOnlineMode() && !fromRemote) await pushOnlineMove();
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
    if (isOnlineMode()) {
      let starsText = '';
      let starsTone = '';
      if (starResult && starResult.delta > 0) {
        starsText = `+★ ${formatNumber(starResult.delta)}`;
        starsTone = 'positive';
      } else if (starResult && starResult.delta < 0) {
        starsText = `-★ ${formatNumber(Math.abs(starResult.delta))}`;
        starsTone = 'negative';
      } else if (!rankedAi) {
        starsText = '★ 0';
      }
      try {
        if (!fromRemote && window.firebase && firebase.database && (state.online.roomId || state.online.roomCode)) {
          const ref = firebase.database().ref(getRoomPath(state.online.roomId || state.online.roomCode));
          const snap = await ref.once('value');
          const room = snap.val() || {};
          room.id = room.id || state.online.roomId || state.online.roomCode;
          const kicked = await maybeKickInsufficientPlayer(room, winner);
          if (!kicked) {
            await ref.update({
              status: 'ready',
              hostReady: false,
              guestReady: false,
              winner: winner || 0,
              winningLine: [],
              board: createBoard(),
              turn: state.nextStarter || HUMAN,
              nextStarter: state.nextStarter || HUMAN,
              turnExpiresAt: 0,
              moveCount: 0,
              lastMove: null,
              timeoutReason: finishReason || room.timeoutReason || '',
              hostStars: room.hostId ? Number(room.hostStars || 0) : 0,
              guestStars: room.guestId ? Number(room.guestStars || 0) : 0,
              updatedAt: Date.now()
            });
          }
        }
      } catch (e) {
        console.log('post-finish room reset ignored:', e);
      }

      const popupTitle = winner === mySide ? 'VICTORY' : winner === oppSide ? 'LOSS' : 'DRAW';
      const popupTextParts = [
        winner === mySide ? '승리했습니다.' : winner === oppSide ? '패배했습니다.' : '무승부입니다.'
      ];
      if (starsText) popupTextParts.push(starsText);
      if (getCurrentStars() < normalizeStarWager(state.online.starWager, STAR_WAGER_OPTIONS[0])) {
        popupTextParts.push('보유 스타가 부족해서 재대국 전에 방을 나가야 합니다.');
      } else {
        popupTextParts.push('방에 남아 Ready를 누르면 바로 재대국할 수 있습니다.');
      }
      try {
        initAudio();
        playRoomEventChime(winner === mySide ? 'create' : 'join');
      } catch (e) {}
      openNoticePopup(popupTitle, popupTextParts.join(' '), '확인');
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        openStartScreen();
        syncUI();
      });
    });
  }

  function isFull(board) {
    for (let y = 0; y < BOARD_SIZE; y++) for (let x = 0; x < BOARD_SIZE; x++) if (board[y][x] === EMPTY) return false;
    return true;
  }

  function getAiTitle() {
    const idx = rankIndex(getCurrentRankFromState());
    if (idx >= 39) return 'Apex Nemesis';
    if (idx >= 29) return 'Omega';
    if (idx >= 19) return 'Transcendent';
    if (idx >= 14) return 'Mythic';
    if (idx >= 9) return 'Overlord';
    if (idx >= 5) return 'Elite';
    if (idx >= 2) return 'Advanced';
    return 'Calm';
  }

  function getAiProfile() {
    const idx = rankIndex(getCurrentRankFromState());
    if (idx >= 9) {
      return {
        randomness: idx >= 19 ? 0 : 0.01,
        searchTop: 2,
        aggressive: 1.36 + Math.min(0.26, (idx - 9) * 0.01),
        ultra: true,
        deep: true
      };
    }
    const s = Math.max(state.streak, idx);
    return {
      randomness: s <= 0 ? 0.34 : s === 1 ? 0.2 : s === 2 ? 0.11 : s === 3 ? 0.05 : s === 4 ? 0.02 : 0,
      searchTop: s <= 0 ? 8 : s === 1 ? 7 : s === 2 ? 6 : s === 3 ? 5 : s === 4 ? 4 : 3,
      aggressive: s >= 3 ? 1.18 : 1,
      ultra: s >= 5,
      deep: s >= 7 || idx >= 7
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
    wood.addColorStop(0, '#f2d7a0');
    wood.addColorStop(.18, '#e6c384');
    wood.addColorStop(.52, '#d8ac65');
    wood.addColorStop(1, '#bf8746');
    ctx.fillStyle = wood;
    roundRect(ctx, 0, 0, w, h, 24);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 180; i++) {
      const y = (i / 180) * h;
      const wave = Math.sin(i * 0.32) * 8 + Math.cos(i * 0.14) * 4;
      ctx.fillStyle = i % 4 === 0 ? '#7c5627' : i % 3 === 0 ? '#996731' : '#ad7a3b';
      ctx.fillRect(0, y, w, 0.7 + ((i % 6) * 0.22));
      ctx.fillRect(Math.max(0, wave), y, Math.max(0, w - Math.abs(wave)), 0.6);
    }
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 24; i++) {
      const knotX = ((i * 47) % w);
      const knotY = 20 + ((i * 83) % (h - 40));
      ctx.beginPath();
      ctx.fillStyle = i % 2 ? '#7b4d20' : '#5d3818';
      ctx.ellipse(knotX, knotY, 18 + (i % 5) * 3, 8 + (i % 4) * 2, (i % 7) * 0.26, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0, 'rgba(255,244,216,.22)');
    sheen.addColorStop(.35, 'rgba(255,255,255,.06)');
    sheen.addColorStop(1, 'rgba(90,49,16,.08)');
    ctx.fillStyle = sheen;
    roundRect(ctx, 0, 0, w, h, 24);
    ctx.fill();
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

    if (!overrideBoard && state.pendingMove && !state.gameOver && state.phase === 'playing') {
      const px = boardCoord(state.pendingMove.x);
      const py = boardCoord(state.pendingMove.y);
      const gap = 12;
      const len = 10;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,58,38,.96)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px - gap - len, py - gap - len); ctx.lineTo(px - gap, py - gap);
      ctx.moveTo(px + gap + len, py - gap - len); ctx.lineTo(px + gap, py - gap);
      ctx.moveTo(px - gap - len, py + gap + len); ctx.lineTo(px - gap, py + gap);
      ctx.moveTo(px + gap + len, py + gap + len); ctx.lineTo(px + gap, py + gap);
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
    try {
      state.allLeaderboardEntries = await state.remoteAdapter.fetchAll();
      state.leaderboardCache = state.allLeaderboardEntries.slice(0, 50);
      await fetchFirebaseWeeklyLeaderboards(7);
      if (state.remoteAdapter.subscribeRealtime) {
        state.remoteAdapter.subscribeRealtime(list => {
          state.allLeaderboardEntries = Array.isArray(list) ? list : [];
          state.leaderboardCache = state.allLeaderboardEntries.slice(0, 50);
          renderLeaderboard(!ui.leaderModal.classList.contains('hidden') || resolveAppScreen() === 'ranking');
        });
      }
    } catch (e) {}
    syncUI();
    await renderLeaderboard();
    renderBoard();
    if (state.profile) {
      publishMyProfile();
      loadFriendsFromRemote();
      subscribeFriendChallenges();
      subscribeProfileInvites();
      openStartScreen();
      ui.nickInput.value = state.profile.nickname || '';
      ui.nickNote.textContent = 'Update nickname before starting, or continue as is.';
    } else {
      state.matchMode = 'ai';
      openStartScreen();
      ui.nickNote.textContent = 'Set your nickname first on the home screen to enter the arena.';
    }
    state.appScreen = 'home';
    syncAppScreen();
    updateMobileMode();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
