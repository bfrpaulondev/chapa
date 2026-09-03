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
    return {
      name: query,
      muscles: [],
      steps: [
        "Mantém o tronco estável e a articulação alinhada.",
        "Controla a fase de descida durante 2–3 segundos.",
        "Interrompe se houver dor aguda ou perda de técnica.",
      ],
      videos: [],
      available: false,
      reason: "Define MUSCLEWIKI_API_KEY na Netlify para activar vídeos oficiais.",
    };
  }

  const headers = { "X-API-Key": key };
  const canonicalQuery = EXERCISE_ALIASES[query.toLocaleLowerCase("pt")] ?? query;
  const search = await fetch(`${MUSCLEWIKI_URL}/search?q=${encodeURIComponent(canonicalQuery)}&limit=1&gender=male`, { headers });
  if (!search.ok) throw new Error(`MuscleWiki search ${search.status}`);
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
  if (!tokenResponse.ok) throw new Error(`MuscleWiki media token ${tokenResponse.status}`);
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
