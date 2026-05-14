"use client";

import Link from "next/link";
import { useState } from "react";
import { NemFudendoWordmark } from "@/components/brand/NemFudendoWordmark";

export default function Home() {
  const [creating, setCreating] = useState(false);

  async function createLobby() {
    setCreating(true);
    try {
      const res = await fetch("/api/lobby/create", { method: "POST" });
      const j = (await res.json()) as {
        code?: string;
        hostSecret?: string;
        error?: string;
      };
      if (!res.ok) {
        alert(j.error ?? "Não foi possível criar a sala.");
        return;
      }
      if (j.code && j.hostSecret) {
        window.location.href = `/play/${encodeURIComponent(j.code)}?h=${encodeURIComponent(j.hostSecret)}`;
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 bg-[#0b0c0f] px-6 py-16 text-zinc-100">
      <div className="text-center">
        <div className="mx-auto flex max-w-[min(100%,320px)] justify-center">
          <NemFudendoWordmark
            priority
            className="h-auto w-full max-w-[280px] object-contain"
          />
        </div>
        <p className="mt-4 text-sm text-zinc-400">
          Curiosidades numéricas e o botão que muda tudo.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={creating}
          onClick={createLobby}
          className="rounded-2xl bg-brand py-4 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {creating ? "Criando sala…" : "Criar lobby"}
        </button>
        <Link
          href="/join"
          className="rounded-2xl border border-zinc-600 py-4 text-center text-sm font-semibold text-zinc-200 hover:border-brand hover:text-white"
        >
          Entrar com código
        </Link>
      </div>

      <p className="text-center text-xs text-zinc-500">
        Até 12 jogadores por sala. O host recebe um link com código secreto para
        iniciar a partida.
      </p>
    </div>
  );
}
