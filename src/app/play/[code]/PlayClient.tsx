"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GameApp } from "@/components/GameApp";
import { NemFudendoWordmark } from "@/components/brand/NemFudendoWordmark";
import {
  AVATAR_PRESETS,
  DEFAULT_AVATAR_PRESET_ID,
  getPresetUrlById,
} from "@/lib/avatar-presets";
import { normalizeLobbyCode } from "@/lib/lobby-code";

type PlayClientProps = {
  lobbyCodeParam: string;
  hostSecret: string | null;
};

const STORAGE_DISPLAY_NAME = "nfw-display-name";
const STORAGE_AVATAR_PRESET_ID = "nfw-avatar-preset-id";

export function PlayClient({ lobbyCodeParam, hostSecret }: PlayClientProps) {
  const room = useMemo(
    () => normalizeLobbyCode(lobbyCodeParam),
    [lobbyCodeParam],
  );

  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  const [presetId, setPresetId] = useState(DEFAULT_AVATAR_PRESET_ID);
  useEffect(() => {
    let id = localStorage.getItem("nfw-player-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("nfw-player-id", id);
    }
    setPlayerId(id);
    const saved = localStorage.getItem(STORAGE_DISPLAY_NAME);
    if (saved) setName(saved.slice(0, 40));
    const savedPreset = localStorage.getItem(STORAGE_AVATAR_PRESET_ID);
    if (savedPreset && getPresetUrlById(savedPreset)) setPresetId(savedPreset);
  }, []);

  const [lobbyOk, setLobbyOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!room || room.length < 4) {
      setLobbyOk(false);
      return;
    }
    fetch(`/api/lobby/${encodeURIComponent(room)}`)
      .then((r) => setLobbyOk(r.ok))
      .catch(() => setLobbyOk(false));
  }, [room]);

  const [started, setStarted] = useState(false);
  const [finalAvatarUrl, setFinalAvatarUrl] = useState<string | null>(null);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const display = name.trim();
      if (!display) return;
      const url = getPresetUrlById(presetId);
      if (!url) return;
      try {
        localStorage.setItem(STORAGE_DISPLAY_NAME, display.slice(0, 40));
        localStorage.setItem(STORAGE_AVATAR_PRESET_ID, presetId);
      } catch {
        /* ignore quota / private mode */
      }
      setFinalAvatarUrl(url);
      setStarted(true);
    },
    [name, presetId],
  );

  if (!playerId || lobbyOk === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0b0c0f] px-4 text-zinc-200">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <p className="text-sm">Verificando sala…</p>
      </div>
    );
  }

  if (lobbyOk === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b0c0f] px-6 text-center text-zinc-200">
        <p className="text-lg font-semibold text-red-400">Sala não encontrada</p>
        <p className="text-sm text-zinc-400">
          Confira o código ou peça um novo link ao host.
        </p>
        <Link
          href="/join"
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          Entrar em outra sala
        </Link>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 bg-[#0b0c0f] px-4 py-10 text-zinc-100">
        <div className="text-center">
          <div className="mx-auto flex max-w-[240px] justify-center">
            <NemFudendoWordmark className="h-auto w-full object-contain" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-zinc-200">Entrar na sala</h1>
          <p className="mt-1 font-mono text-lg tracking-widest text-zinc-300">
            {room}
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">
              Nome exibido
            </label>
            <input
              required
              maxLength={40}
              className="w-full rounded-xl border border-zinc-700 bg-[#1e1f22] px-3 py-3 text-sm outline-none focus:border-brand"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como quer aparecer"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-zinc-400">
              Escolha o avatar
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {AVATAR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-label="Selecionar este avatar"
                  aria-pressed={presetId === p.id}
                  onClick={() => setPresetId(p.id)}
                  className={`flex items-center justify-center rounded-xl border p-2 transition-colors ${
                    presetId === p.id
                      ? "border-brand bg-brand-surface ring-1 ring-brand"
                      : "border-zinc-700 bg-[#1e1f22] hover:border-zinc-500"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt=""
                    className="h-14 w-14 rounded-full bg-zinc-800"
                  />
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Entrar no lobby
          </button>
        </form>
      </div>
    );
  }

  return (
    <GameApp
      lobbyCode={room}
      hostSecret={hostSecret}
      playerId={playerId}
      displayName={name.trim()}
      avatarUrl={finalAvatarUrl}
    />
  );
}
