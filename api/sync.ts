import { timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";
import { isChoroplethMapSnapshot } from "../src/sync/snapshot.js";

const CLOUD_MAPS_KEY = "jumap:sync:maps:v1";
const MAX_BODY_BYTES = 4 * 1024 * 1024;

function redisCredentials() {
  return {
    url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

function json(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function isConfigured() {
  const { url, token } = redisCredentials();
  return Boolean(
    process.env.JUMAP_SYNC_KEY
    && process.env.JUMAP_SYNC_KEY.length >= 24
    && url
    && token,
  );
}

function isAuthorized(request: Request) {
  const expected = process.env.JUMAP_SYNC_KEY;
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/i.exec(authorization);
  if (!expected || !match) return false;

  const actualBuffer = Buffer.from(match[1]);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

function redisClient() {
  const { url, token } = redisCredentials();
  return new Redis({
    url: url!,
    token: token!,
  });
}

function authorize(request: Request) {
  if (!isConfigured()) return json({ error: "sync-not-configured" }, 503);
  if (!isAuthorized(request)) return json({ error: "unauthorized" }, 401);
  return null;
}

export async function GET(request: Request) {
  const failure = authorize(request);
  if (failure) return failure;

  try {
    const maps = await redisClient().get<unknown>(CLOUD_MAPS_KEY);
    if (maps === null) return json({ maps: null });
    if (!isChoroplethMapSnapshot(maps)) {
      return json({ error: "stored-data-invalid" }, 500);
    }
    return json({ maps });
  } catch (error) {
    console.error("JUMAP sync read failed", error);
    return json({ error: "sync-unavailable" }, 503);
  }
}

export async function PUT(request: Request) {
  const failure = authorize(request);
  if (failure) return failure;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return json({ error: "payload-too-large" }, 413);

  let payload: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      return json({ error: "payload-too-large" }, 413);
    }
    payload = JSON.parse(text);
  } catch {
    return json({ error: "invalid-json" }, 400);
  }

  const maps = payload && typeof payload === "object" && "maps" in payload
    ? payload.maps
    : null;
  if (!isChoroplethMapSnapshot(maps)) return json({ error: "invalid-maps" }, 400);

  try {
    await redisClient().set(CLOUD_MAPS_KEY, maps);
    return json({ ok: true });
  } catch (error) {
    console.error("JUMAP sync write failed", error);
    return json({ error: "sync-unavailable" }, 503);
  }
}
