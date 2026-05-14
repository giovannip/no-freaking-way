import { NextResponse } from "next/server";
import { dispatchAction } from "@/lib/game-room-store";
import { normalizeLobbyCode } from "@/lib/lobby-code";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const raw = (await ctx.params).code;
  const code = normalizeLobbyCode(raw);
  if (code.length < 4) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const result = dispatchAction(code, body);
  if (!result.state) {
    return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
  }
  return NextResponse.json({
    ok: result.ok,
    payload: result.state,
  });
}
