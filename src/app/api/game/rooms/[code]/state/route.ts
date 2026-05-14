import { NextResponse } from "next/server";
import { getPublicState } from "@/lib/game-room-store";
import { normalizeLobbyCode } from "@/lib/lobby-code";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const raw = (await ctx.params).code;
  const code = normalizeLobbyCode(raw);
  if (code.length < 4) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }
  const state = getPublicState(code);
  if (!state) {
    return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
  }
  return NextResponse.json(state);
}
