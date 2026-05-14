import { NextResponse } from "next/server";
import { lobbyExists } from "@/lib/game-room-store";
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

  if (!lobbyExists(code)) {
    return NextResponse.json({ exists: false }, { status: 404 });
  }

  return NextResponse.json({
    exists: true,
    code,
    maxPlayers: 12,
  });
}
