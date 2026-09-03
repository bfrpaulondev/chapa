"use client";

import { PauseCircleFilled, PlayCircleFilled, ThunderboltFilled } from "@ant-design/icons";
import { Button, Flex, Tag } from "antd";
import { useEffect, useState, type CSSProperties } from "react";

type MovementKind = "press" | "squat" | "hinge" | "curl" | "pushup" | "pull" | "core";

type MovementProfile = {
  kind: MovementKind;
  label: string;
  tempo: string;
  phases: { label: string; cue: string; intensity: number }[];
  circuit: string;
};

const PROFILES: Record<MovementKind, MovementProfile> = {
  press: {
    kind: "press",
    label: "Empurrar",
    tempo: "3 · 1 · 1",
    phases: [
      { label: "DESCER", cue: "Desce controlado", intensity: 48 },
      { label: "SEGURAR", cue: "Peito firme", intensity: 72 },
      { label: "EMPURRAR", cue: "Força sem perder a linha", intensity: 96 },
    ],
    circuit: "M78 78 C120 35 204 35 248 78 C216 115 114 115 78 78",
  },
  squat: {
    kind: "squat",
    label: "Agachar",
    tempo: "3 · 1 · 1",
    phases: [
      { label: "DESCER", cue: "Joelhos acompanham os pés", intensity: 52 },
      { label: "FUNDO", cue: "Tronco firme e tensão", intensity: 82 },
      { label: "SUBIR", cue: "Empurra o chão", intensity: 98 },
    ],
    circuit: "M204 58 C250 100 250 190 196 236 C148 196 150 101 204 58",
  },
  hinge: {
    kind: "hinge",
    label: "Dobradiça",
    tempo: "3 · 1 · 1",
    phases: [
      { label: "RECUAR", cue: "Anca para trás", intensity: 55 },
      { label: "TENSÃO", cue: "Costas neutras", intensity: 78 },
      { label: "ESTENDER", cue: "Contrai glúteos", intensity: 94 },
    ],
    circuit: "M112 74 C166 65 223 107 233 165 C195 189 128 157 112 74",
  },
  curl: {
    kind: "curl",
    label: "Flexionar",
    tempo: "2 · 1 · 3",
    phases: [
      { label: "SUBIR", cue: "Cotovelo quieto", intensity: 88 },
      { label: "APERTAR", cue: "Contrai sem balançar", intensity: 100 },
      { label: "DESCER", cue: "Resiste ao peso", intensity: 62 },
    ],
    circuit: "M94 196 C68 144 92 82 151 67 C182 110 157 182 94 196",
  },
  pushup: {
    kind: "pushup",
    label: "Flexão",
    tempo: "3 · 1 · 1",
    phases: [
      { label: "DESCER", cue: "Corpo numa linha", intensity: 58 },
      { label: "PAUSA", cue: "Peito perto do chão", intensity: 84 },
      { label: "SUBIR", cue: "Empurra o chão", intensity: 98 },
    ],
    circuit: "M62 171 C117 124 222 124 273 171 C225 205 112 205 62 171",
  },
  pull: {
    kind: "pull",
    label: "Puxar",
    tempo: "2 · 1 · 3",
    phases: [
      { label: "PUXAR", cue: "Cotovelo conduz", intensity: 92 },
      { label: "SEGURAR", cue: "Aperta as costas", intensity: 100 },
      { label: "VOLTAR", cue: "Alonga controlado", intensity: 54 },
    ],
    circuit: "M83 76 C111 30 220 30 253 76 C223 135 113 135 83 76",
  },
  core: {
    kind: "core",
    label: "Estabilizar",
    tempo: "2 · 2 · 2",
    phases: [
      { label: "ACTIVAR", cue: "Expira e fecha as costelas", intensity: 72 },
      { label: "SEGURAR", cue: "Abdómen firme", intensity: 94 },
      { label: "VOLTAR", cue: "Mantém controlo", intensity: 55 },
    ],
    circuit: "M102 177 C119 92 207 83 237 174 C204 220 133 220 102 177",
  },
};

// -.-.-.- Select the closest safe motion template from the exercise name.
function getProfile(exerciseName: string) {
  const name = exerciseName.toLocaleLowerCase("pt");
  if (/agach|squat|leg press|afundo|lunge/.test(name)) return PROFILES.squat;
  if (/terra|deadlift|romeno|stiff|remada|row/.test(name)) return PROFILES.hinge;
  if (/rosca|curl|elevação|elevacao|lateral|tríceps|triceps|pushdown/.test(name)) return PROFILES.curl;
  if (/flexão|flexao|push.?up|mergulho|dip/.test(name)) return PROFILES.pushup;
  if (/barra fixa|pull.?up|pulldown|puxada/.test(name)) return PROFILES.pull;
  if (/abdom|crunch|prancha|plank|core/.test(name)) return PROFILES.core;
  return PROFILES.press;
}

// -.-.-.- Render a lightweight looping movement guide with no external video dependency.
export function MovementGuide({ exerciseName }: { exerciseName: string }) {
  const profile = getProfile(exerciseName);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setPhase((current) => (current + 1) % profile.phases.length), 1400);
    return () => window.clearInterval(timer);
  }, [playing, profile.phases.length]);

  const active = profile.phases[phase];

  return (
    <section className={`motion-guide motion-${profile.kind} ${playing ? "is-playing" : "is-paused"}`} aria-label={`Guia animado para ${exerciseName}`}>
      <div className="motion-header">
        <div>
          <Tag color="lime">GUIA CHAPA</Tag>
          <strong>{profile.label}</strong>
        </div>
        <Flex align="center" gap={10}>
          <span className="tempo-badge">TEMPO {profile.tempo}</span>
          <Button
            shape="circle"
            aria-label={playing ? "Pausar animação" : "Reproduzir animação"}
            icon={playing ? <PauseCircleFilled /> : <PlayCircleFilled />}
            onClick={() => setPlaying((value) => !value)}
          />
        </Flex>
      </div>

      <div className="motion-canvas">
        <svg viewBox="0 0 330 280" role="img" aria-label={`Boneco a executar ${exerciseName}`}>
          <defs>
            <linearGradient id={`circuit-${profile.kind}`} x1="0" x2="1">
              <stop offset="0" stopColor="#69d6ff" />
              <stop offset="0.52" stopColor="#c7ff4a" />
              <stop offset="1" stopColor="#ff875c" />
            </linearGradient>
            <radialGradient id={`joint-${profile.kind}`}>
              <stop offset="0" stopColor="#eaffb5" />
              <stop offset="1" stopColor="#c7ff4a" />
            </radialGradient>
          </defs>
          <path className="motion-grid-line" d="M26 235 H305 M26 190 H305 M26 145 H305 M26 100 H305 M70 28 V252 M125 28 V252 M180 28 V252 M235 28 V252" />
          <path className="motion-circuit-shadow" d={profile.circuit} />
          <path className="motion-circuit" d={profile.circuit} stroke={`url(#circuit-${profile.kind})`} />
          {playing ? (
            <circle className="circuit-dot" r="7" fill={`url(#joint-${profile.kind})`}>
              <animateMotion dur="4.2s" repeatCount="indefinite" path={profile.circuit} />
            </circle>
          ) : (
            <circle className="circuit-dot" cx="78" cy="78" r="7" fill={`url(#joint-${profile.kind})`} />
          )}
          <Athlete kind={profile.kind} />
        </svg>
        <div className="motion-callout"><ThunderboltFilled /><span>{active.cue}</span><b>{active.intensity}%</b></div>
      </div>

      <div className="motion-phases" role="list" aria-label="Fases do movimento">
        {profile.phases.map((item, index) => (
          <button key={item.label} className={index === phase ? "active" : ""} onClick={() => { setPhase(index); setPlaying(false); }}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.label}</strong>
            <i style={{ "--phase-scale": item.intensity / 100 } as CSSProperties} />
          </button>
        ))}
      </div>
    </section>
  );
}

// -.-.-.- Draw movement-specific stick figures using GPU-friendly group transforms.
function Athlete({ kind }: { kind: MovementKind }) {
  if (kind === "press") {
    return (
      <g className="athlete athlete-press">
        <path className="equipment" d="M45 207 H260 M85 207 V224 M230 207 V224" />
        <circle className="body-fill" cx="79" cy="164" r="17" />
        <path className="body-line" d="M96 170 L210 183 L253 217 M206 183 L225 222" />
        <g className="moving-limbs"><path className="body-line" d="M130 176 L132 119 M188 180 L190 119" /><path className="equipment strong" d="M108 113 H215" /></g>
        <circle className="joint" cx="130" cy="176" r="5" /><circle className="joint" cx="188" cy="180" r="5" />
      </g>
    );
  }
  if (kind === "pushup" || kind === "core") {
    return (
      <g className={`athlete athlete-${kind}`}>
        <path className="equipment" d="M35 225 H296" />
        <circle className="body-fill" cx="76" cy="153" r="16" />
        <g className="moving-body"><path className="body-line" d="M94 160 L219 181 L277 218 M214 181 L259 222 M125 165 L111 220 M158 171 L151 221" /></g>
        <circle className="joint" cx="125" cy="165" r="5" /><circle className="joint" cx="219" cy="181" r="5" />
      </g>
    );
  }
  if (kind === "squat") {
    return (
      <g className="athlete athlete-squat">
        <g className="moving-body"><circle className="body-fill" cx="164" cy="56" r="19" /><path className="body-line" d="M164 78 L155 151 M161 94 L105 108 M160 94 L218 108 M155 151 L116 196 L105 244 M155 151 L205 190 L229 239" /><path className="equipment strong" d="M94 105 H230" /></g>
        <circle className="joint" cx="155" cy="151" r="6" /><circle className="joint" cx="116" cy="196" r="5" /><circle className="joint" cx="205" cy="190" r="5" />
      </g>
    );
  }
  if (kind === "hinge") {
    return (
      <g className="athlete athlete-hinge">
        <g className="moving-body"><circle className="body-fill" cx="143" cy="57" r="18" /><path className="body-line" d="M145 78 L180 144 M159 104 L108 158 M163 103 L136 169 M180 144 L148 198 L138 245 M180 144 L220 194 L235 243" /><path className="equipment strong" d="M88 174 H161" /></g>
        <circle className="joint" cx="180" cy="144" r="6" /><circle className="joint" cx="148" cy="198" r="5" /><circle className="joint" cx="220" cy="194" r="5" />
      </g>
    );
  }
  if (kind === "pull") {
    return (
      <g className="athlete athlete-pull">
        <path className="equipment strong" d="M80 39 H249" />
        <g className="moving-body"><circle className="body-fill" cx="165" cy="94" r="18" /><path className="body-line" d="M165 115 L165 187 M165 125 L105 45 M165 125 L225 45 M165 187 L130 242 M165 187 L201 242" /></g>
        <circle className="joint" cx="165" cy="125" r="6" />
      </g>
    );
  }
  return (
    <g className="athlete athlete-curl">
      <circle className="body-fill" cx="164" cy="57" r="19" />
      <path className="body-line" d="M164 79 L164 158 M164 158 L132 240 M164 158 L198 240 M164 98 L126 149 M164 98 L203 149" />
      <g className="moving-limbs"><path className="body-line" d="M126 149 L105 199 M203 149 L224 199" /><path className="equipment strong" d="M91 202 H119 M210 202 H238" /></g>
      <circle className="joint" cx="126" cy="149" r="5" /><circle className="joint" cx="203" cy="149" r="5" />
    </g>
  );
}
