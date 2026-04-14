import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const results: Record<string, string> = {};

  // Show all relevant env var names (not values for security)
  const relevantVars = Object.keys(process.env).filter(k =>
    k.includes('UPSTASH') || k.includes('REDIS') || k.includes('KV_')
  );
  results.foundVars = relevantVars.join(', ') || 'NONE';

  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  results.hasUrl = url ? 'YES' : 'NO';
  results.hasToken = token ? 'YES' : 'NO';

  if (!url) {
    return new Response(JSON.stringify({ error: 'No Redis URL found', results }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url, token: token! });

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
