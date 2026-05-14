"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NemFudendoIconMark } from "@/components/brand/NemFudendoIconMark";
import { NemFudendoWordmark } from "@/components/brand/NemFudendoWordmark";
import { formatPtBrNumber, parsePtBrNumber } from "@/lib/numbers";
import { normalizeLobbyCode } from "@/lib/lobby-code";

type Phase = "lobby" | "loading_question" | "play" | "ranking" | "game_over";

type Player = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

type GamePayload = {
  phase: Phase;
  players: Player[];
  hostId: string | null;
  maxRounds: number;
  currentRound: number;
  scores: Record<string, number>;
  questionText: string | null;
  questionImage: string | null;
  turnOrder: string[];
  turnIndex: number;
  currentUserId: string | null;
  lastGuess: number | null;
  lastGuessUserId: string | null;
  resolveLines: string[];
  pointWinnerIds: string[];
  correctAnswer: number | null;
};

export type GameAppProps = {
  lobbyCode: string;
  hostSecret: string | null;
  playerId: string;
  displayName: string;
  avatarUrl: string | null;
};

function avatarUrlForPlayer(p: Player): string {
  if (p.avatarUrl) return p.avatarUrl;
  const seed = encodeURIComponent(p.id);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

function displayNameOf(p: Pick<Player, "displayName">): string {
  return p.displayName || "Jogador";
}

export function GameApp({
  lobbyCode,
  hostSecret,
  playerId,
  displayName,
  avatarUrl,
}: GameAppProps) {
  const [bootError, setBootError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [guessRaw, setGuessRaw] = useState("");
  const [game, setGame] = useState<GamePayload | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const room = useMemo(
    () => normalizeLobbyCode(lobbyCode),
    [lobbyCode],
  );

  const profileRef = useRef({ displayName, avatarUrl, hostSecret });
  profileRef.current = { displayName, avatarUrl, hostSecret };

  useEffect(() => {
    if (!room || room.length < 4) {
      setBootError("Código da sala inválido.");
      setLoading(false);
      return;
    }

    const stateUrl = `/api/game/rooms/${encodeURIComponent(room)}/state`;
    const actionUrl = `/api/game/rooms/${encodeURIComponent(room)}/action`;
    const leaveUrl = `/api/game/rooms/${encodeURIComponent(room)}/leave`;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    function postLeave() {
      void fetch(leaveUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
        keepalive: true,
      }).catch(() => {});
    }

    const onPageHide = () => {
      postLeave();
    };
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);

    async function fetchState(): Promise<GamePayload | null> {
      const r = await fetch(stateUrl, { cache: "no-store" });
      if (!r.ok) return null;
      return (await r.json()) as GamePayload;
    }

    async function postHello() {
      const { displayName: dn, avatarUrl: av, hostSecret: hs } =
        profileRef.current;
      const hello: Record<string, unknown> = {
        type: "HELLO",
        userId: playerId,
        displayName: dn.trim() || "Jogador",
        avatarUrl: av ?? null,
      };
      if (hs) hello.hostSecret = hs;
      const r = await fetch(actionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hello),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(
          typeof err === "object" && err && "error" in err
            ? String((err as { error: string }).error)
            : "Falha ao entrar no lobby",
        );
      }
      const data = (await r.json()) as { payload?: GamePayload };
      return data.payload ?? null;
    }

    (async () => {
      try {
        const first = await postHello();
        if (cancelled) return;
        if (first) setGame(first);
        else {
          const s = await fetchState();
          if (!cancelled && s) setGame(s);
        }
        intervalId = setInterval(async () => {
          const s = await fetchState();
          if (!cancelled && s) setGame(s);
        }, 1000);
      } catch (e) {
        if (!cancelled) {
          setBootError(e instanceof Error ? e.message : "Falha ao conectar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (intervalId !== undefined) clearInterval(intervalId);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
    };
  }, [room, playerId]);

  const send = useCallback(
    async (obj: Record<string, unknown>) => {
      const actionUrl = `/api/game/rooms/${encodeURIComponent(room)}/action`;
      const body =
        obj.type === "HELLO"
          ? obj
          : { playerId, ...obj };
      const res = await fetch(actionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { payload?: GamePayload };
      if (data.payload) setGame(data.payload);
    },
    [room, playerId],
  );

  const copyInviteLink = useCallback(async () => {
    const url = `${window.location.origin}/play/${encodeURIComponent(room)}`;
    try {
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2500);
    } catch {
      window.prompt("Copie o link da sala:", url);
    }
  }, [room]);

  const myId = playerId;
  const isHost = Boolean(myId && game?.hostId && myId === game.hostId);

  const board = useMemo(() => {
    if (!game) return [];
    return [...game.players].sort(
      (a, b) => (game.scores[b.id] ?? 0) - (game.scores[a.id] ?? 0),
    );
  }, [game]);

  const canConfirmGuess = useMemo(() => {
    if (!game || game.phase !== "play") return false;
    if (!game.currentUserId || game.currentUserId !== myId) return false;
    const n = parsePtBrNumber(guessRaw);
    if (n === null) return false;
    if (game.lastGuess === null) return n > 0;
    return n > game.lastGuess;
  }, [game, guessRaw, myId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0b0c0f] px-4 text-zinc-200">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <p className="text-sm">Conectando…</p>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b0c0f] px-6 text-center text-zinc-200">
        <p className="text-lg font-semibold text-red-400">Erro</p>
        <p className="text-sm text-zinc-400">{bootError}</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0c0f] text-zinc-400">
        Carregando estado…
      </div>
    );
  }

  const myTurn =
    game.phase === "play" &&
    game.currentUserId &&
    game.currentUserId === myId;
  const canNemFudendo =
    myTurn && game.lastGuess !== null && game.lastGuessUserId !== null;

  const playerCount = Array.isArray(game.players)
    ? game.players.length
    : Object.keys(game.players).length;

  return (
    <div className="min-h-screen bg-[#0b0c0f] px-4 pb-10 pt-4 text-zinc-100">
      <header className="mb-4 grid grid-cols-[auto,1fr,auto] items-center gap-2">
        <NemFudendoIconMark
          size={36}
          className="rounded-lg shadow-lg shadow-black/40 ring-1 ring-zinc-700/80"
        />
        {game.phase === "lobby" ? (
          <span className="justify-self-center rounded-full bg-[#23262d] px-3 py-1 font-mono text-xs font-semibold tracking-widest text-zinc-200">
            {room}
          </span>
        ) : game.phase !== "game_over" ? (
          <span className="justify-self-center rounded-full bg-[#23262d] px-3 py-1 text-xs text-zinc-300">
            Rodada {game.currentRound} / {game.maxRounds}
          </span>
        ) : (
          <span />
        )}
        <span className="h-9 w-9" aria-hidden />
      </header>

      {game.phase === "lobby" && (
        <div className="mx-auto flex max-w-md flex-col gap-4">
          <div className="text-center">
            <div className="mx-auto flex max-w-[220px] justify-center">
              <NemFudendoWordmark className="h-auto w-full object-contain" />
            </div>
            <p className="mt-3 text-sm text-brand-soft">Lobby da partida</p>
            <p className="mt-2 text-xs text-zinc-500">
              Compartilhe o código{" "}
              <span className="font-mono font-semibold text-zinc-300">
                {room}
              </span>{" "}
              ou o link abaixo (sem privilégios de host).
            </p>
            <button
              type="button"
              onClick={() => void copyInviteLink()}
              className="mt-3 w-full rounded-xl border border-zinc-600 bg-[#1e1f22] py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-brand/60 hover:bg-[#23262d]"
            >
              {inviteCopied ? "Link copiado!" : "Copiar link de convite"}
            </button>
          </div>

          <div className="rounded-2xl bg-[#23262d] p-3">
            <p className="mb-2 text-xs font-semibold text-zinc-400">
              Jogadores ({playerCount}/12)
            </p>
            <ul className="flex flex-col gap-2">
              {(
                Array.isArray(game.players)
                  ? game.players
                  : Object.values(
                      game.players as unknown as Record<string, Player>,
                    )
              ).map((p: Player) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl bg-[#1e1f22] px-3 py-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrlForPlayer(p)}
                    alt=""
                    className="h-10 w-10 rounded-full bg-zinc-700"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{displayNameOf(p)}</p>
                    {p.id === game.hostId && (
                      <span className="text-[10px] font-semibold text-brand-soft">
                        Host
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-[#23262d] px-4 py-3">
            <span className="text-sm text-zinc-300">Rodadas</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg bg-zinc-700 px-3 py-1 text-lg leading-none text-white"
                onClick={() =>
                  void send({
                    type: "SET_MAX_ROUNDS",
                    maxRounds: Math.max(1, game.maxRounds - 1),
                  })
                }
              >
                −
              </button>
              <span className="min-w-[2ch] text-center text-sm font-semibold">
                {game.maxRounds}
              </span>
              <button
                type="button"
                className="rounded-lg bg-brand px-3 py-1 text-lg leading-none text-white"
                onClick={() =>
                  void send({
                    type: "SET_MAX_ROUNDS",
                    maxRounds: Math.min(20, game.maxRounds + 1),
                  })
                }
              >
                +
              </button>
            </div>
          </div>

          {isHost ? (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-40"
              disabled={playerCount < 2}
              onClick={() =>
                void send({
                  type: "START_GAME",
                  maxRounds: game.maxRounds,
                })
              }
            >
              Iniciar partida
            </button>
          ) : (
            <p className="text-center text-xs text-zinc-500">
              {game.hostId
                ? "Aguardando o host iniciar…"
                : "Ainda não há host com link de criação. Peça ao criador da sala para abrir o link com o código secreto."}
            </p>
          )}
        </div>
      )}

      {game.phase === "loading_question" && (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-sm text-zinc-400">Carregando pergunta…</p>
          <p className="max-w-xs text-[11px] leading-relaxed text-zinc-500">
            Cada sala evita repetir a mesma pergunta até acabar o baralho; depois
            o deck é embaralhado de novo.
          </p>
        </div>
      )}

      {game.phase === "play" && (
        <div className="mx-auto flex max-w-md flex-col gap-4">
          {game.questionText && (
            <div className="overflow-hidden rounded-2xl bg-[#23262d]">
              {game.questionImage ? (
                <div className="border-b border-zinc-800/80 bg-black/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={game.questionImage}
                    alt=""
                    className="mx-auto max-h-[min(42vh,300px)] w-full object-contain"
                  />
                </div>
              ) : null}
              <p className="p-4 text-base font-semibold leading-snug">
                {game.questionText}
              </p>
            </div>
          )}

          {!myTurn && game.currentUserId && (
            <div className="rounded-2xl bg-[#23262d] p-4 text-center text-sm text-zinc-400">
              Vez de{" "}
              <span className="font-semibold text-zinc-200">
                {displayNameOf(
                  game.players.find((p) => p.id === game.currentUserId) ?? {
                    displayName: "…",
                  },
                )}
              </span>
              …
            </div>
          )}

          {myTurn && (
            <>
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!canConfirmGuess) return;
                  const n = parsePtBrNumber(guessRaw);
                  if (n === null) return;
                  void send({ type: "CONFIRM_GUESS", value: n });
                  setGuessRaw("");
                }}
              >
                <div className="rounded-2xl border border-brand/40 bg-[#23262d] p-4">
                  <p className="mb-2 text-xs font-semibold text-zinc-400">
                    Sua vez — palpite
                  </p>
                  <input
                    inputMode="decimal"
                    className="w-full rounded-lg bg-[#1e1f22] px-3 py-3 text-2xl font-semibold outline-none ring-0 placeholder:text-zinc-600"
                    placeholder="0,00"
                    value={guessRaw}
                    onChange={(e) => setGuessRaw(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Use vírgula para decimais
                  </p>
                  {game.lastGuess !== null && (
                    <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                      Deve ser maior que{" "}
                      <strong>{formatPtBrNumber(game.lastGuess)}</strong>{" "}
                      (último palpite)
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!canConfirmGuess}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Confirmar palpite
                </button>
              </form>

              {canNemFudendo && (
                <>
                  <p className="text-center text-xs text-zinc-500">ou</p>
                  <button
                    type="button"
                    className="w-full rounded-xl border-2 border-[#ed4245] bg-[#2b1a1c] py-4 text-lg font-black uppercase tracking-wide text-white shadow-[0_0_24px_rgba(237,66,69,0.25)]"
                    onClick={() => void send({ type: "NEM_FUDENDO" })}
                  >
                    NEM FUDENDO
                  </button>
                </>
              )}

              <p className="text-center text-[11px] text-zinc-500">
                Palpites menores ou iguais ao último serão rejeitados.
              </p>
            </>
          )}
        </div>
      )}

      {game.phase === "ranking" && (
        <div className="mx-auto flex max-w-md flex-col gap-4">
          <div className="rounded-2xl bg-[#23262d] p-4">
            {game.resolveLines.map((line, i) => (
              <p key={i} className="mb-2 text-sm last:mb-0">
                {line}
              </p>
            ))}
          </div>
          <div className="rounded-2xl bg-[#23262d] p-3">
            <p className="mb-2 text-xs font-semibold text-zinc-400">
              Placar da partida
            </p>
            <ol className="flex flex-col gap-2">
              {board.map((p, idx) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl bg-[#1e1f22] px-3 py-2"
                >
                  <span className="w-6 text-xs font-bold text-zinc-500">
                    {idx + 1}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrlForPlayer(p)}
                    alt=""
                    className="h-9 w-9 rounded-full bg-zinc-700"
                  />
                  <span className="flex-1 text-sm font-medium">
                    {displayNameOf(p)}
                  </span>
                  <span className="text-sm font-bold text-brand">
                    {game.scores[p.id] ?? 0}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          {isHost && (
            <button
              type="button"
              className="rounded-xl bg-brand py-3 text-sm font-semibold text-white"
              onClick={() => void send({ type: "CONTINUE_AFTER_RANKING" })}
            >
              {game.currentRound >= game.maxRounds
                ? "Ver resultado final"
                : "Próxima rodada"}
            </button>
          )}
        </div>
      )}

      {game.phase === "game_over" && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-6">
          <h2 className="text-2xl font-bold">Fim de jogo</h2>
          <ol className="w-full space-y-2">
            {board.slice(0, 5).map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl bg-[#23262d] px-4 py-3"
              >
                <span className="text-lg font-bold text-zinc-500">{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrlForPlayer(p)}
                  alt=""
                  className="h-10 w-10 rounded-full bg-zinc-700"
                />
                <span className="flex-1 font-medium">{displayNameOf(p)}</span>
                <span className="font-bold text-brand">
                  {game.scores[p.id] ?? 0} pts
                </span>
              </li>
            ))}
          </ol>
          {isHost && (
            <button
              type="button"
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white"
              onClick={() => void send({ type: "PLAY_AGAIN" })}
            >
              Jogar de novo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
