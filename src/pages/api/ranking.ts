import type { APIRoute } from 'astro';

interface RankingEntry {
  name: string;
  score: number;
  date: string;
}

async function readRanking(): Promise<RankingEntry[]> {
  if (process.env.KV_REST_API_URL) {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
    return (await redis.get<RankingEntry[]>('ranking')) ?? [];
  }
  // Local fallback: JSON file
  const { readFileSync, existsSync, mkdirSync } = await import('fs');
  const { resolve } = await import('path');
  const dir = resolve(process.cwd(), 'data');
  const file = resolve(dir, 'ranking.json');
  if (!existsSync(file)) { mkdirSync(dir, { recursive: true }); return []; }
  try { return JSON.parse(readFileSync(file, 'utf-8')); } catch { return []; }
}

async function writeRanking(data: RankingEntry[]): Promise<void> {
  if (process.env.KV_REST_API_URL) {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
    await redis.set('ranking', data);
    return;
  }
  const { writeFileSync, mkdirSync, existsSync } = await import('fs');
  const { resolve } = await import('path');
  const dir = resolve(process.cwd(), 'data');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'ranking.json'), JSON.stringify(data, null, 2), 'utf-8');
}

export const GET: APIRoute = async () => {
  try {
    const ranking = await readRanking();
    const sorted = [...ranking].sort((a, b) => b.score - a.score);
    return new Response(JSON.stringify({ ranking: sorted }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Error llegint el ranking' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { name, score } = await request.json() as { name: string; score: number };

    if (!name || typeof name !== 'string' || name.trim().length < 1)
      return new Response(JSON.stringify({ error: 'Nom invàlid' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });

    if (typeof score !== 'number' || score < 0 || score > 100)
      return new Response(JSON.stringify({ error: 'Puntuació invàlida' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });

    const trimmedName = name.trim();
    const ranking = await readRanking();
    const idx = ranking.findIndex(e => e.name.toLowerCase() === trimmedName.toLowerCase());

    if (idx !== -1) {
      if (score > ranking[idx].score) {
        ranking[idx].score = score;
        ranking[idx].date = new Date().toISOString();
      }
    } else {
      ranking.push({ name: trimmedName, score, date: new Date().toISOString() });
    }

    await writeRanking(ranking);
    const sorted = [...ranking].sort((a, b) => b.score - a.score);
    return new Response(JSON.stringify({ success: true, ranking: sorted }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Error intern del servidor' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
