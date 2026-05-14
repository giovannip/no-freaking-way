"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NemFudendoWordmark } from "@/components/brand/NemFudendoWordmark";
import { normalizeLobbyCode } from "@/lib/lobby-code";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const room = normalizeLobbyCode(code);
    if (room.length < 4) {
      alert("Digite um código válido.");
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(`/api/lobby/${encodeURIComponent(room)}`);
      if (!res.ok) {
        alert("Sala não encontrada.");
        return;
      }
      router.push(`/play/${encodeURIComponent(room)}`);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 bg-[#0b0c0f] px-6 py-16 text-zinc-100">
      <div>
        <Link href="/" className="text-xs font-semibold text-brand">
          ← Voltar
        </Link>
        <div className="mx-auto mt-6 flex max-w-[220px] justify-center">
          <NemFudendoWordmark className="h-auto w-full object-contain" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-zinc-100">Entrar com código</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Peça o código de 6 caracteres ao host.
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={12}
          className="rounded-xl border border-zinc-700 bg-[#1e1f22] px-4 py-3 text-center font-mono text-xl tracking-[0.3em] outline-none focus:border-brand"
          placeholder="ABC123"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button
          type="submit"
          disabled={checking}
          className="rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {checking ? "Verificando…" : "Continuar"}
        </button>
      </form>
    </div>
  );
}
