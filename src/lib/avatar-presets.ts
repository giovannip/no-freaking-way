/**
 * Avatares ilustrados (Dicebear "personas") — URLs estáveis por seed.
 */
export type AvatarPreset = {
  id: string;
  url: string;
};

function persona(seed: string): string {
  return `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(seed)}`;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "w-east-asia", url: persona("nfw-w-leste-asia") },
  { id: "m-east-asia", url: persona("nfw-m-leste-asia") },
  { id: "w-south-asia", url: persona("nfw-w-sul-asia") },
  { id: "m-south-asia", url: persona("nfw-m-sul-asia") },
  { id: "w-africa", url: persona("nfw-w-africa") },
  { id: "m-africa", url: persona("nfw-m-africa") },
  { id: "w-europe", url: persona("nfw-w-europa") },
  { id: "m-europe", url: persona("nfw-m-europa") },
  { id: "w-americas", url: persona("nfw-w-americas") },
  { id: "m-americas", url: persona("nfw-m-americas") },
  { id: "w-mena", url: persona("nfw-w-mena") },
  { id: "m-mena", url: persona("nfw-m-mena") },
];

export const DEFAULT_AVATAR_PRESET_ID = AVATAR_PRESETS[0]!.id;

export function getPresetUrlById(id: string): string | null {
  const p = AVATAR_PRESETS.find((x) => x.id === id);
  return p?.url ?? null;
}
