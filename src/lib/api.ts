export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function streamChat(message: string, onDelta: (chunk: string) => void) {
  const res = await fetch("/api/coach/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok || !res.body) throw new Error(`chat ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onDelta(decoder.decode(value, { stream: true }));
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ---------- tipos ----------
export type Profile = {
  name?: string;
  sex?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  goal?: string;
  experience?: string;
  daysPerWeek?: number;
  equipment?: string[];
  dietStyle?: string;
  photoDataUrl?: string;
  onboarded?: boolean;
};

export type Brief = {
  headline?: string;
  focus?: string;
  checklist?: string[];
  nudges?: { time: string; message: string; kind: string }[];
};

export type PlanDay = {
  day: string;
  focus: string;
  exercises: { name: string; sets: number; reps: string; rest: string; notes: string }[];
};

export type WorkoutPlan = { _id?: string; split?: string; goal?: string; daysPerWeek?: number; days?: PlanDay[] };

export type MealPlan = { _id?: string; source?: string; targetKcal?: number; ingredients?: string[]; text?: string };

export type Supplement = { _id?: string; name: string; dosage?: string; times?: string[]; withFood?: boolean; instructions?: string };

export type Metric = { _id?: string; date: string; weightKg?: number; waistCm?: number; armCm?: number; chestCm?: number; bodyFat?: number; notes?: string };

export type Photo = { _id?: string; date: string; note?: string; analysis?: string };

export type ChatMsg = { _id?: string; role: "user" | "assistant"; content: string };
