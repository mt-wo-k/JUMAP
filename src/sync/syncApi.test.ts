import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "../../api/sync";

const redisMock = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock("@upstash/redis", () => ({
  Redis: class {
    get = redisMock.get;
    set = redisMock.set;
  },
}));

const sampleKey = "a-secure-test-key-that-is-at-least-24-characters";
const sampleMaps = [{
  id: "test-map",
  name: "テスト",
  prefectureCodes: ["13"],
  unit: "円",
  maxColor: "#E26A51",
  invertColorScale: false,
  areas: { "13101": { value: 42, memo: "メモ" } },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
}];

function configureSync() {
  vi.stubEnv("JUMAP_SYNC_KEY", sampleKey);
  vi.stubEnv("KV_REST_API_URL", "https://example.upstash.io");
  vi.stubEnv("KV_REST_API_TOKEN", "test-token");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("sync API access checks", () => {
  it("reports a missing server configuration before accessing Redis", async () => {
    vi.stubEnv("JUMAP_SYNC_KEY", "");
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");

    const response = await GET(new Request("https://example.test/api/sync"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "sync-not-configured" });
  });

  it("rejects requests without the configured shared key", async () => {
    configureSync();

    const [readResponse, writeResponse] = await Promise.all([
      GET(new Request("https://example.test/api/sync")),
      PUT(new Request("https://example.test/api/sync", {
        method: "PUT",
        body: JSON.stringify({ maps: [] }),
      })),
    ]);

    expect(readResponse.status).toBe(401);
    expect(writeResponse.status).toBe(401);
    expect(await readResponse.json()).toEqual({ error: "unauthorized" });
  });

  it("reads and writes the authorized cloud snapshot", async () => {
    configureSync();
    redisMock.get.mockResolvedValue(sampleMaps);
    redisMock.set.mockResolvedValue("OK");
    const headers = { Authorization: `Bearer ${sampleKey}` };

    const readResponse = await GET(new Request("https://example.test/api/sync", { headers }));
    const writeResponse = await PUT(new Request("https://example.test/api/sync", {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ maps: sampleMaps }),
    }));

    expect(readResponse.status).toBe(200);
    expect(await readResponse.json()).toEqual({ maps: sampleMaps });
    expect(writeResponse.status).toBe(200);
    expect(redisMock.set).toHaveBeenCalledWith("jumap:sync:maps:v1", sampleMaps);
  });

  it("rejects malformed map data before it reaches Redis", async () => {
    configureSync();
    const response = await PUT(new Request("https://example.test/api/sync", {
      method: "PUT",
      headers: { Authorization: `Bearer ${sampleKey}` },
      body: JSON.stringify({ maps: [{ ...sampleMaps[0], maxColor: "blue" }] }),
    }));

    expect(response.status).toBe(400);
    expect(redisMock.set).not.toHaveBeenCalled();
  });
});
