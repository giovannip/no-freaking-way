import { PlayClient } from "./PlayClient";

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ h?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const hRaw = sp.h;
  const h = Array.isArray(hRaw) ? hRaw[0] : hRaw;
  return <PlayClient lobbyCodeParam={code} hostSecret={h ?? null} />;
}
