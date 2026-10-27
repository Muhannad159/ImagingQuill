import "server-only";
import { createHmac } from "node:crypto";
export function configured() {
  if (
    process.env.NODE_ENV === "production" &&
    /^([123])x0/.test(process.env.TURNSTILE_SECRET_KEY ?? "")
  )
    return false;
  return [
    "GROQ_API_KEY",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "TURNSTILE_SECRET_KEY",
    "RATE_LIMIT_HASH_SECRET",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  ].every((k) => Boolean(process.env[k]));
}
async function redis(command: (string | number)[]) {
  const r = await fetch(process.env.UPSTASH_REDIS_REST_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok)
    throw new Error("Usage protection is unavailable. Please retry later.");
  const data = await r.json();
  if (data.error)
    throw new Error("Usage protection is unavailable. Please retry later.");
  return data.result;
}
const script = `for i=1,#KEYS do if tonumber(redis.call('GET',KEYS[i]) or '0')+tonumber(ARGV[i*3-2])>tonumber(ARGV[i*3-1]) then return 0 end end for i=1,#KEYS do redis.call('INCRBY',KEYS[i],ARGV[i*3-2]);redis.call('EXPIRE',KEYS[i],ARGV[i*3]) end return 1`;
export async function reserve(visitor: string, ip: string, tokens: number) {
  const minute = Math.floor(Date.now() / 60000);
  const day = Math.floor(Date.now() / 86400000);
  const hash = createHmac("sha256", process.env.RATE_LIMIT_HASH_SECRET!)
    .update(`${day}:${ip}`)
    .digest("hex");
  const keys = [
    `iq:u:${visitor}:${minute}`,
    `iq:u:${visitor}:${day}`,
    `iq:ip:${hash}:${minute}`,
    `iq:ip:${hash}:${day}`,
    `iq:tokens:m:${minute}`,
    `iq:tokens:d:${day}`,
  ];
  const minuteLimit = Math.min(
    7000,
    Number(process.env.AI_MINUTE_TOKENS) || 7000,
  );
  const dayLimit = Math.min(
    150000,
    Number(process.env.AI_DAILY_TOKENS) || 150000,
  );
  const result = await redis([
    "EVAL",
    script,
    keys.length,
    ...keys,
    1,
    3,
    120,
    1,
    20,
    90000,
    1,
    3,
    120,
    1,
    20,
    90000,
    tokens,
    minuteLimit,
    120,
    tokens,
    dayLimit,
    90000,
  ]);
  if (result !== 1) return null;
  return { keys: keys.slice(4), tokens };
}
export async function reconcile(
  reservation: { keys: string[]; tokens: number },
  used: number,
) {
  const delta = Math.max(0, reservation.tokens - used);
  if (!delta) return;
  await redis([
    "EVAL",
    `for i=1,#KEYS do if redis.call('EXISTS',KEYS[i])==1 then local v=tonumber(redis.call('GET',KEYS[i]));redis.call('DECRBY',KEYS[i],math.min(v,tonumber(ARGV[1]))) end end return 1`,
    2,
    ...reservation.keys,
    delta,
  ]);
}
