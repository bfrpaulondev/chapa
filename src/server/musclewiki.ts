const MUSCLEWIKI_URL = "https://api.musclewiki.com";

const EXERCISE_ALIASES: Record<string, string> = {
  "supino reto": "Barbell Bench Press",
  "supino inclinado": "Incline Barbell Bench Press",
  "mergulho": "Chest Dip",
  "flexão de braços": "Push Up",
  "flexao de bracos": "Push Up",
  "tríceps na polia": "Cable Pushdown",
  "triceps na polia": "Cable Pushdown",
  "agachamento livre": "Barbell Squat",
  "levantamento terra": "Barbell Deadlift",
  "remada curvada": "Bent Over Barbell Row",
  "rosca direta": "Barbell Curl",
  "elevação lateral": "Dumbbell Lateral Raise",
  "elevacao lateral": "Dumbbell Lateral Raise",
};

type MuscleWikiVideo = {
  url?: string | null;
  angle: string;
  gender: string;
  og_image?: string | null;
};

export type ExerciseGuide = {
  id?: number;
  name: string;
  muscles: string[];
  equipment?: string;
  difficulty?: string | null;
  steps: string[];
  videos: { url: string; angle: string; thumbnail?: string }[];
  available: boolean;
  reason?: string;
};

// -.-.-.- Preserve a usable exercise card while explaining provider failures precisely.
function unavailableGuide(name: string, reason: string, steps?: string[]): ExerciseGuide {
  return {
    name,
    muscles: [],
    steps: steps ?? [
      "Mantém o tronco estável e a articulação alinhada.",
      "Controla a fase de descida durante 2–3 segundos.",
      "Interrompe se houver dor aguda ou perda de técnica.",
    ],
    videos: [],
    available: false,
    reason,
  };
}

// -.-.-.- Translate MuscleWiki status codes into actionable configuration feedback.
async function providerReason(response: Response, stage: "search" | "media") {
  const payload = await response.json().catch(() => null) as { detail?: string; message?: string; upgrade_url?: string } | null;
  const detail = payload?.detail ?? payload?.message;
  if (response.status === 401) return "A MUSCLEWIKI_API_KEY é inválida ou não foi reconhecida.";
  if (response.status === 403) {
    return stage === "search"
      ? "A chave MuscleWiki do plano BASIC só funciona no Playground. Para usar vídeos nesta aplicação é necessário o plano TESTING ou superior."
      : "A chave não tem acesso a tokens de vídeo. Confirma que o plano MuscleWiki é TESTING ou superior.";
  }
  if (response.status === 429) return "A quota mensal do MuscleWiki foi atingida. O vídeo volta após o reset ou aumento do plano.";
  if (response.status === 501 && stage === "media") return "O MuscleWiki não conseguiu criar o token temporário de vídeo neste momento.";
  return detail ? `MuscleWiki: ${detail}` : `MuscleWiki indisponível (${stage}, HTTP ${response.status}).`;
}

// -.-.-.- Append a short-lived media token without exposing the permanent API key.
function withToken(url: string, token: string) {
  const target = new URL(url);
  target.searchParams.set("token", token);
  return target.toString();
}

// -.-.-.- Fetch a video-backed exercise guide from MuscleWiki's official server-side API.
export async function findExerciseGuide(query: string): Promise<ExerciseGuide> {
  const key = process.env.MUSCLEWIKI_API_KEY;
  if (!key) {
    return unavailableGuide(query, "Define MUSCLEWIKI_API_KEY na Netlify para activar vídeos oficiais.");
  }

  const headers = { "X-API-Key": key };
  const canonicalQuery = EXERCISE_ALIASES[query.toLocaleLowerCase("pt")] ?? query;
  const search = await fetch(`${MUSCLEWIKI_URL}/search?q=${encodeURIComponent(canonicalQuery)}&limit=1&gender=male`, { headers });
  if (!search.ok) return unavailableGuide(query, await providerReason(search, "search"));
  const results = (await search.json()) as Array<{
    id: number;
    name: string;
    primary_muscles: string[];
    category?: string;
    difficulty?: string | null;
    steps: string[];
    videos: MuscleWikiVideo[];
  }>;
  const exercise = results[0];
  if (!exercise) {
    return { name: query, muscles: [], steps: [], videos: [], available: false, reason: "Exercício não encontrado no MuscleWiki." };
  }

  const tokenResponse = await fetch(`${MUSCLEWIKI_URL}/media/token`, { method: "POST", headers });
  if (!tokenResponse.ok) {
    return {
      id: exercise.id,
      name: exercise.name,
      muscles: exercise.primary_muscles ?? [],
      equipment: exercise.category,
      difficulty: exercise.difficulty,
      steps: exercise.steps ?? [],
      videos: [],
      available: false,
      reason: await providerReason(tokenResponse, "media"),
    };
  }
  const { token } = (await tokenResponse.json()) as { token: string };

  return {
    id: exercise.id,
    name: exercise.name,
    muscles: exercise.primary_muscles ?? [],
    equipment: exercise.category,
    difficulty: exercise.difficulty,
    steps: exercise.steps ?? [],
    videos: (exercise.videos ?? [])
      .filter((video): video is MuscleWikiVideo & { url: string } => Boolean(video.url))
      .map((video) => ({
        url: withToken(video.url, token),
        angle: video.angle,
        thumbnail: video.og_image ? withToken(video.og_image, token) : undefined,
      })),
    available: true,
  };
}
