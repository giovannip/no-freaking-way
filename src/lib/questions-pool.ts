import { readFileSync } from "fs";
import { join } from "path";

export type PoolQuestion = {
  id: string;
  questionText: string;
  correctAnswer: number;
  /** URL (http/https) de imagem ou GIF ilustrativo; opcional. */
  image?: string | null;
};

function normalizeQuestionImage(row: unknown): string | null {
  if (typeof row !== "object" || row === null) return null;
  const img = (row as { image?: unknown }).image;
  if (typeof img !== "string") return null;
  const u = img.trim();
  if (!/^https?:\/\//i.test(u)) return null;
  return u.slice(0, 2048);
}

let cached: PoolQuestion[] | null = null;

export function loadQuestionsFromDisk(): PoolQuestion[] {
  if (cached) return cached;
  const path = join(process.cwd(), "data", "questions.json");
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("questions.json must be an array");
  }
  const out: PoolQuestion[] = [];
  for (const row of parsed) {
    if (
      row &&
      typeof row === "object" &&
      typeof (row as PoolQuestion).id === "string" &&
      typeof (row as PoolQuestion).questionText === "string" &&
      typeof (row as PoolQuestion).correctAnswer === "number" &&
      Number.isFinite((row as PoolQuestion).correctAnswer)
    ) {
      const image = normalizeQuestionImage(row);
      const q = row as PoolQuestion;
      out.push({
        id: q.id,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        ...(image ? { image } : {}),
      });
    }
  }
  if (out.length === 0) {
    throw new Error("questions.json has no valid questions");
  }
  cached = out;
  return out;
}
