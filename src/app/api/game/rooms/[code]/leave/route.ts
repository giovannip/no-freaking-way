import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicState, leavePlayer } from "@/lib/game-room-store";
import { normalizeLobbyCode } from "@/lib/lobby-code";

const bodySchema = z.object({
  playerId: z.string().min(1),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const raw = (await ctx.params).code;
  const code = normalizeLobbyCode(raw);
  if (code.length < 4) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "playerId obrigatório" }, { status: 400 });
  }

  leavePlayer(code, parsed.data.playerId);
  const state = getPublicState(code);
  if (!state) {
    return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
  }
  return NextResponse.json({ payload: state });
}
