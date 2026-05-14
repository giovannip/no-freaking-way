import { NextResponse } from "next/server";
import { createLobby } from "@/lib/game-room-store";

export async function POST() {
  try {
    const { code, hostSecret } = createLobby();
    return NextResponse.json({ code, hostSecret });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível criar a sala." },
      { status: 500 },
    );
  }
}
