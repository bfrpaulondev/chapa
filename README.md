# CHAPA — Treino + Coach IA (PWA)

Super app pessoal de academia: treino, nutrição, suplementos, progresso com fotos e um **mini-coach IA flutuante** que fala contigo conforme o ecrã onde estás e avisa-te dos horários do dia.

## Features (OpenAI + MongoDB)

- **Coach IA (chat streaming)** — sabe o teu perfil, plano ativo, métricas e suplementos; pergunta-lhe históricos, receitas com o que tens em casa, o que quiseres.
- **Avatar coach flutuante** — usa a tua foto de perfil, dá dicas contextuais em cada ecrã (cache diário) e abre o chat num toque.
- **Avisos proativos** — a IA gera um briefing diário com checklist e `nudges` por hora (suplementos, água, treino); o app dispara notificações sem pedires nada.
- **Plano de treino gerado por IA** — split, exercícios, séries/reps/descanso; consistente com objetivo, experiência e equipamento.
- **Nutrição** — plano alimentar geral ou **receitas com os ingredientes que tens em casa**.
- **Suplementos** — adicionas o que compraste e a IA define horários, modo de toma, cuidados e ciclo.
- **Corpo** — métricas (peso, cintura, braço, peito, % gordura), **análise de tendência por IA** e **galeria de fotos com análise visual (vision model)**.

## Stack

- **Next.js 16** (App Router) + **shadcn/ui** + Tailwind — PWA instalável (manifest + service worker)
- **Fastify 5** — API serverless na Vercel (`api/index.ts` com `app.routing`, catch-all via `vercel.json`)
- **MongoDB** via mongoose (Atlas)
- **OpenAI** (`gpt-4o-mini` chat, `gpt-4o` visão — configurável com `AI_MODEL`/`AI_VISION_MODEL`)

## Env vars (Vercel)

```
OPENAI_API_KEY=sk-...
MONGODB_URI=mongodb+srv://...
AI_MODEL=gpt-4o-mini        # opcional
AI_VISION_MODEL=gpt-4o      # opcional
```

## Dev local

```bash
npm i
npm run dev:api   # terminal 1 — Fastify em :4000 (precisa das env vars num .env.local)
DEV_API_URL=http://127.0.0.1:4000 npm run dev   # terminal 2 — UI com proxy /api
```

## Deploy

Push na `main` → Vercel (framework Next.js detetado; a pasta `api/` vira a função serverless).

Site antigo (HTML estático) guardado em `legacy/`.

Instalar no telemóvel: abre o URL → iPhone: Partilhar → Adicionar ao ecrã inicial; Android: menu → Instalar app.
