import { timingSafeEqual } from "crypto";
import { loadQuestionsFromDisk, type PoolQuestion } from "@/lib/questions-pool";
import { normalizeLobbyCode, randomHostSecret, randomLobbyCode } from "@/lib/lobby-code";

const MAX_PLAYERS = 12;

type Phase =
  | "lobby"
  | "loading_question"
  | "play"
  | "ranking"
  | "game_over";

export type GamePlayer = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

type GameModel = {
  phase: Phase;
  players: Record<string, GamePlayer>;
  hostId: string | null;
  maxRounds: number;
  currentRound: number;
  scores: Record<string, number>;
  questionText: string | null;
  questionImage: string | null;
  correctAnswer: number | null;
  turnOrder: string[];
  turnIndex: number;
  lastGuess: number | null;
  lastGuessUserId: string | null;
  resolveLines: string[];
  pointWinnerIds: string[];
};

type RoomEntry = {
  hostSecret: string;
  game: GameModel;
  usedQuestionIds: Set<string>;
};

const g = globalThis as unknown as { __nfwGameRooms?: Map<string, RoomEntry> };
function rooms(): Map<string, RoomEntry> {
  if (!g.__nfwGameRooms) g.__nfwGameRooms = new Map();
  return g.__nfwGameRooms;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Mantém a ordem de turnos; quem começa a nova rodada é o jogador depois do que estava na vez ao terminar a anterior. */
function advanceStarterForNextRound(game: GameModel, playerIds: string[]) {
  const currentAtEnd =
    game.turnOrder.length > 0
      ? game.turnOrder[game.turnIndex % game.turnOrder.length]!
      : null;
  const reordered: string[] = [];
  for (const id of game.turnOrder) {
    if (playerIds.includes(id)) reordered.push(id);
  }
  for (const id of playerIds) {
    if (!reordered.includes(id)) reordered.push(id);
  }
  game.turnOrder = reordered;
  const n = game.turnOrder.length;
  if (n === 0) {
    game.turnIndex = 0;
    return;
  }
  if (currentAtEnd && reordered.includes(currentAtEnd)) {
    const idx = reordered.indexOf(currentAtEnd);
    game.turnIndex = (idx + 1) % n;
  } else {
    game.turnIndex = 0;
  }
}

function initialGame(): GameModel {
  return {
    phase: "lobby",
    players: {},
    hostId: null,
    maxRounds: 5,
    currentRound: 0,
    scores: {},
    questionText: null,
    questionImage: null,
    correctAnswer: null,
    turnOrder: [],
    turnIndex: 0,
    lastGuess: null,
    lastGuessUserId: null,
    resolveLines: [],
    pointWinnerIds: [],
  };
}

const FALLBACK_Q = {
  questionText:
    "Quantos lados tem um dado de RPG tradicional (cubos com números 1–6)?",
  correctAnswer: 6,
  questionImage: null as string | null,
};

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function pickNextQuestion(entry: RoomEntry): {
  questionText: string;
  correctAnswer: number;
  questionImage: string | null;
} {
  let pool: PoolQuestion[];
  try {
    pool = loadQuestionsFromDisk();
  } catch {
    return FALLBACK_Q;
  }
  let available = pool.filter((q) => !entry.usedQuestionIds.has(q.id));
  if (available.length === 0) {
    entry.usedQuestionIds.clear();
    available = [...pool];
  }
  if (available.length === 0) return FALLBACK_Q;
  const chosen = pickRandom(available);
  entry.usedQuestionIds.add(chosen.id);
  return {
    questionText: chosen.questionText,
    correctAnswer: chosen.correctAnswer,
    questionImage:
      typeof chosen.image === "string" && chosen.image.length > 0
        ? chosen.image
        : null,
  };
}

function secretsMatch(stored: string, provided: string): boolean {
  const a = Buffer.from(stored, "utf8");
  const b = Buffer.from(provided, "utf8");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function displayNameOf(p: GamePlayer): string {
  return p.displayName || "Jogador";
}

export function publicState(g: GameModel): Record<string, unknown> {
  const currentUserId =
    g.phase === "play" && g.turnOrder.length
      ? g.turnOrder[g.turnIndex % g.turnOrder.length]
      : null;

  const base: Record<string, unknown> = {
    phase: g.phase,
    players: Object.values(g.players),
    hostId: g.hostId,
    maxRounds: g.maxRounds,
    currentRound: g.currentRound,
    scores: g.scores,
    questionText: g.questionText,
    questionImage: g.questionImage,
    turnOrder: g.turnOrder,
    turnIndex: g.turnIndex,
    currentUserId,
    lastGuess: g.lastGuess,
    lastGuessUserId: g.lastGuessUserId,
    resolveLines: g.resolveLines,
    pointWinnerIds: g.pointWinnerIds,
  };

  if (g.phase === "ranking" || g.phase === "game_over") {
    base.correctAnswer = g.correctAnswer;
  } else {
    base.correctAnswer = null;
  }

  return base;
}

export function createLobby(): { code: string; hostSecret: string } {
  const map = rooms();
  for (let attempt = 0; attempt < 32; attempt++) {
    const code = randomLobbyCode(6);
    if (map.has(code)) continue;
    const hostSecret = randomHostSecret();
    map.set(code, {
      hostSecret,
      game: initialGame(),
      usedQuestionIds: new Set(),
    });
    return { code, hostSecret };
  }
  throw new Error("Could not allocate lobby code");
}

export function lobbyExists(code: string): boolean {
  return rooms().has(normalizeLobbyCode(code));
}

export function getPublicState(code: string): Record<string, unknown> | null {
  const entry = rooms().get(normalizeLobbyCode(code));
  if (!entry) return null;
  return publicState(entry.game);
}

export function leavePlayer(code: string, playerId: string): void {
  const c = normalizeLobbyCode(code);
  const entry = rooms().get(c);
  if (!entry) return;
  const { game } = entry;
  const uid = playerId;
  if (!uid) return;
  if (game.phase === "lobby") {
    delete game.players[uid];
    if (game.hostId === uid) game.hostId = null;
  } else {
    game.turnOrder = game.turnOrder.filter((id) => id !== uid);
    delete game.players[uid];
    if (game.turnOrder.length < 2 && game.phase !== "game_over") {
      game.phase = "lobby";
      game.questionText = null;
      game.questionImage = null;
      game.correctAnswer = null;
    }
  }
}

function finishRoundWithWinner(
  game: GameModel,
  winnerId: string,
  answer: number,
  reason: string,
) {
  game.scores[winnerId] = (game.scores[winnerId] ?? 0) + 1;
  game.resolveLines = [reason];
  game.pointWinnerIds = [winnerId];
  game.phase = "ranking";
}

function handleGuess(game: GameModel, uid: string, raw: number) {
  if (game.phase !== "play") return;
  const current =
    game.turnOrder[game.turnIndex % game.turnOrder.length];
  if (uid !== current) return;
  if (!Number.isFinite(raw)) return;

  if (game.lastGuess === null) {
    if (raw <= 0) return;
  } else {
    if (!(raw > game.lastGuess)) return;
  }

  const answer = game.correctAnswer;
  if (answer !== null && raw === answer) {
    game.lastGuess = raw;
    game.lastGuessUserId = uid;
    finishRoundWithWinner(
      game,
      uid,
      answer,
      `${displayNameOf(game.players[uid]!)} acertou em cheio (${answer}). Ponto na hora.`,
    );
    return;
  }

  game.lastGuess = raw;
  game.lastGuessUserId = uid;
  game.turnIndex = (game.turnIndex + 1) % game.turnOrder.length;
}

function handleNemFudendo(entry: RoomEntry, uid: string) {
  const { game } = entry;
  if (game.phase !== "play") return;
  const current =
    game.turnOrder[game.turnIndex % game.turnOrder.length];
  if (uid !== current) return;
  if (game.lastGuess === null || game.lastGuessUserId === null) return;
  if (game.correctAnswer === null) return;

  const last = game.lastGuess;
  const answer = game.correctAnswer;
  const lastUid = game.lastGuessUserId;

  let winnerId: string;
  let reason: string;

  if (last === answer) {
    winnerId = lastUid;
    reason = `${displayNameOf(game.players[lastUid]!)} acertou em cheio (${answer}). Ponto para quem palpitou.`;
  } else if (last < answer) {
    winnerId = lastUid;
    reason = `O palpite ${last} ficou abaixo da resposta (${answer}). Ponto para quem palpitou.`;
  } else {
    winnerId = uid;
    reason = `O palpite ${last} passou da resposta (${answer}). Ponto para quem gritou NEM FUDENDO.`;
  }

  finishRoundWithWinner(game, winnerId, answer, reason);
}

export function dispatchAction(
  code: string,
  msg: Record<string, unknown>,
): { ok: boolean; state: Record<string, unknown> | null } {
  const c = normalizeLobbyCode(code);
  const entry = rooms().get(c);
  if (!entry) return { ok: false, state: null };

  const type = msg.type as string | undefined;
  if (!type) return { ok: false, state: publicState(entry.game) };

  const { game } = entry;

  if (type === "HELLO") {
    const userId = String(msg.userId || "");
    if (!userId) return { ok: false, state: publicState(game) };
    const displayNameRaw = String(msg.displayName || "Jogador").trim();
    const displayName = displayNameRaw.slice(0, 40) || "Jogador";
    const avatarUrl =
      typeof msg.avatarUrl === "string" && msg.avatarUrl.startsWith("http")
        ? msg.avatarUrl.slice(0, 512)
        : null;
    const hostSecret =
      typeof msg.hostSecret === "string" ? msg.hostSecret.trim() : "";

    const isNew = !game.players[userId];
    if (isNew && Object.keys(game.players).length >= MAX_PLAYERS) {
      return { ok: false, state: publicState(game) };
    }

    let claimHost = false;
    if (hostSecret && secretsMatch(entry.hostSecret, hostSecret)) {
      claimHost = true;
    }

    game.players[userId] = {
      id: userId,
      displayName,
      avatarUrl,
    };
    if (claimHost) {
      game.hostId = userId;
    }
    return { ok: true, state: publicState(game) };
  }

  const playerId = String(msg.playerId || "");
  if (!playerId) return { ok: false, state: publicState(game) };

  if (type === "SET_MAX_ROUNDS") {
    if (playerId !== game.hostId) return { ok: false, state: publicState(game) };
    const n = Number(msg.maxRounds);
    if (Number.isFinite(n)) {
      game.maxRounds = Math.min(20, Math.max(1, Math.floor(n)));
    }
    return { ok: true, state: publicState(game) };
  }

  if (type === "START_GAME") {
    if (playerId !== game.hostId) return { ok: false, state: publicState(game) };
    if (game.phase !== "lobby") return { ok: false, state: publicState(game) };
    const ids = Object.keys(game.players);
    if (ids.length < 2) return { ok: false, state: publicState(game) };
    const mr = Number(msg.maxRounds);
    if (Number.isFinite(mr)) {
      game.maxRounds = Math.min(20, Math.max(1, Math.floor(mr)));
    }
    game.currentRound = 1;
    game.turnOrder = shuffle(ids);
    game.turnIndex = 0;
    game.lastGuess = null;
    game.lastGuessUserId = null;
    game.resolveLines = [];
    game.pointWinnerIds = [];
    game.scores = Object.fromEntries(ids.map((id) => [id, 0]));
    game.phase = "loading_question";
    const q = pickNextQuestion(entry);
    game.questionText = q.questionText;
    game.questionImage = q.questionImage;
    game.correctAnswer = q.correctAnswer;
    game.phase = "play";
    return { ok: true, state: publicState(game) };
  }

  if (type === "CONFIRM_GUESS") {
    handleGuess(game, playerId, Number(msg.value));
    return { ok: true, state: publicState(game) };
  }

  if (type === "NEM_FUDENDO") {
    handleNemFudendo(entry, playerId);
    return { ok: true, state: publicState(game) };
  }

  if (type === "CONTINUE_AFTER_RANKING") {
    if (playerId !== game.hostId) return { ok: false, state: publicState(game) };
    if (game.phase !== "ranking") return { ok: false, state: publicState(game) };
    if (game.currentRound >= game.maxRounds) {
      game.phase = "game_over";
      return { ok: true, state: publicState(game) };
    }
    game.currentRound += 1;
    const ids = Object.keys(game.players);
    advanceStarterForNextRound(game, ids);
    game.lastGuess = null;
    game.lastGuessUserId = null;
    game.resolveLines = [];
    game.pointWinnerIds = [];
    game.phase = "loading_question";
    const q = pickNextQuestion(entry);
    game.questionText = q.questionText;
    game.questionImage = q.questionImage;
    game.correctAnswer = q.correctAnswer;
    game.phase = "play";
    return { ok: true, state: publicState(game) };
  }

  if (type === "PLAY_AGAIN") {
    if (playerId !== game.hostId) return { ok: false, state: publicState(game) };
    if (game.phase !== "game_over") return { ok: false, state: publicState(game) };
    const kept: Record<string, GamePlayer> = { ...game.players };
    entry.game = initialGame();
    entry.game.players = kept;
    entry.game.hostId = playerId;
    return { ok: true, state: publicState(entry.game) };
  }

  return { ok: false, state: publicState(game) };
}
