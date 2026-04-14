import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const results: Record<string, string> = {};

  // Check env vars
  results.hasUrl = process.env.UPSTASH_REDIS_REST_URL ? 'YES' : 'NO';
  results.hasToken = process.env.UPSTASH_REDIS_REST_TOKEN ? 'YES' : 'NO';

  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return new Response(JSON.stringify({ error: 'Missing UPSTASH_REDIS_REST_URL', results }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    // Write test
    await redis.set('test-ping', 'ok');
    results.write = 'OK';

    // Read test
    const val = await redis.get('test-ping');
    results.read = val === 'ok' ? 'OK' : `FAIL (got: ${val})`;

    // Read ranking
    const ranking = await redis.get('ranking');
    results.rankingValue = JSON.stringify(ranking);

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    results.error = e?.message ?? String(e);
    return new Response(JSON.stringify({ ok: false, results }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
