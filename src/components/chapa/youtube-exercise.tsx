"use client";

import { YoutubeFilled } from "@ant-design/icons";
import { Alert, Tag } from "antd";

type ExerciseVideo = {
  match: RegExp;
  id: string;
  title: string;
  source: string;
  warning?: string;
};

const EXERCISE_VIDEOS: ExerciseVideo[] = [
  { match: /supino inclinado|incline.*press/i, id: "hChjZQhX1Ls", title: "Dumbbell Incline Press — 3 Golden Rules", source: "ScottHermanFitness" },
  { match: /supino|bench press/i, id: "ysUTNll8JQ8", title: "Barbell Bench Press — 3 Golden Rules", source: "ScottHermanFitness" },
  { match: /flex[aã]o|push.?up/i, id: "wxhNoKZlfY8", title: "How To: Push-Up", source: "ScottHermanFitness" },
  { match: /tr[ií]ceps.*polia|pushdown/i, id: "2-LAMcpzODU", title: "How To: Tricep Pushdown", source: "ScottHermanFitness" },
  { match: /mergulho|bench dip|dips?/i, id: "0326dy_-CzM", title: "How to Do Triceps Bench Dips", source: "Howcast" },
  { match: /barra fixa|pull.?up/i, id: "eGo4IYlbE5g", title: "How To: Pull-Up", source: "ScottHermanFitness" },
  { match: /remada|barbell row/i, id: "G8l_8chR5BE", title: "Barbell Row — Technique Tutorial", source: "Alan Thrall" },
  { match: /puxada.*nuca|behind.*neck/i, id: "kwJeh3QyhVE", title: "How-To Use the Lat Pulldown Machine", source: "Gold's Gym", warning: "Executa a puxada à frente do peito. A VIGOR não recomenda puxar atrás da nuca." },
  { match: /puxada|lat pulldown/i, id: "kwJeh3QyhVE", title: "How-To Use the Lat Pulldown Machine", source: "Gold's Gym" },
  { match: /rosca direta|barbell curl/i, id: "kwG2ipFRgfo", title: "How To: Barbell Curl", source: "ScottHermanFitness" },
  { match: /rosca martelo|hammer curl/i, id: "zC3nLlEvin4", title: "How To: Dumbbell Hammer Curl", source: "ScottHermanFitness" },
  { match: /agachamento|barbell squat|squat/i, id: "ultWZbUMPL8", title: "How To: Barbell Squat", source: "ScottHermanFitness" },
  { match: /leg press/i, id: "IZxyjW7MPJQ", title: "How To: Seated Leg Press", source: "ScottHermanFitness" },
  { match: /cadeira extensora|leg extension/i, id: "I1F58vIjbvc", title: "How To: Seated Leg Extension", source: "ScottHermanFitness" },
  { match: /cadeira flexora|leg curl/i, id: "1Tq3QdYUuHs", title: "How To: Prone Leg Curl", source: "ScottHermanFitness" },
  { match: /tal[oõ]es|calf raise/i, id: "3UWi44yN-wM", title: "How To: Standing Calf Raise", source: "ScottHermanFitness" },
  { match: /desenvolvimento|shoulder press/i, id: "GFblCmuEE18", title: "Dumbbell Shoulder Press — Perfect Form", source: "ScottHermanFitness" },
  { match: /eleva[cç][aã]o lateral|lateral raise/i, id: "3VcKaXpzqRo", title: "How To: Dumbbell Side Lateral Raise", source: "ScottHermanFitness" },
  { match: /eleva[cç][aã]o frontal|front raise/i, id: "-t7fuZ0KhDA", title: "How To: Dumbbell Front Raise", source: "ScottHermanFitness" },
  { match: /encolhimento|shrug/i, id: "cJRVVxmytaM", title: "How To: Dumbbell Shrug", source: "ScottHermanFitness" },
];

// -.-.-.- Match generated Portuguese or English exercise names to a reviewed free demonstration.
function findVideo(exerciseName: string) {
  return EXERCISE_VIDEOS.find((video) => video.match.test(exerciseName));
}

export function YouTubeExercise({ exerciseName }: { exerciseName: string }) {
  const video = findVideo(exerciseName);

  if (!video) {
    return <Alert type="info" showIcon message="Ainda não existe um vídeo revisto para este exercício. O guia animado continua disponível abaixo." />;
  }

  return (
    <section className="youtube-exercise" aria-label={`Vídeo de execução para ${exerciseName}`}>
      <div className="youtube-exercise-heading">
        <div><Tag icon={<YoutubeFilled />} color="red">YOUTUBE</Tag><strong>Execução humana real</strong></div>
        <span>{video.source}</span>
      </div>
      <div className="youtube-frame">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1`}
          title={`${exerciseName}: ${video.title}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <p className="youtube-caption">{video.title}</p>
      {video.warning ? <Alert type="warning" showIcon message={video.warning} /> : null}
    </section>
  );
}
