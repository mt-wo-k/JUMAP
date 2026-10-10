import type { ChoroplethMap } from "../domain/types";

export const SYNC_KEY_STORAGE_KEY = "jumap:sync-key:v1";

export type SyncStatus = "required" | "syncing" | "synced" | "error";

export class SyncRequestError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "SyncRequestError";
    this.statusCode = statusCode;
  }
}

export function loadSyncKey() {
  try {
    return localStorage.getItem(SYNC_KEY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveSyncKey(key: string) {
  localStorage.setItem(SYNC_KEY_STORAGE_KEY, key);
}

export function removeSyncKey() {
  localStorage.removeItem(SYNC_KEY_STORAGE_KEY);
}

async function requestSync<T>(key: string, method: "GET" | "PUT", body?: ChoroplethMap[]) {
  let response: Response;
  try {
    response = await fetch("/api/sync", {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify({ maps: body }) } : {}),
    });
  } catch {
    throw new SyncRequestError("network", 0);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload
      ? String(payload.error)
      : "unknown";
    throw new SyncRequestError(error, response.status);
  }
  return payload as T;
}

export async function readCloudMaps(key: string): Promise<ChoroplethMap[] | null> {
  const response = await requestSync<{ maps?: unknown }>(key, "GET");
  if (response.maps === null) return null;
  if (!Array.isArray(response.maps)) throw new SyncRequestError("invalid-response", 502);
  return response.maps as ChoroplethMap[];
}

export async function writeCloudMaps(key: string, maps: ChoroplethMap[]) {
  await requestSync<{ ok: boolean }>(key, "PUT", maps);
}

export function syncErrorMessage(error: unknown) {
  if (!(error instanceof SyncRequestError)) return "同期に失敗しました。";
  if (error.statusCode === 0) return "サーバーに接続できません。接続後に再同期してください。";
  if (error.statusCode === 401) return "同期キーが一致しません。キーを確認してください。";
  if (error.statusCode === 503) return "サーバー側の同期設定が未完了です。READMEの手順を確認してください。";
  if (error.statusCode === 413) return "保存データが同期上限を超えています。";
  return "同期に失敗しました。設定と接続を確認してください。";
}
