import "server-only";

type SupabaseOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  prefer?: string;
};

function getConfig() {
  return {
    url: process.env.SUPABASE_URL?.replace(/\/$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function isSupabaseConfigured() {
  const { url, key } = getConfig();
  return Boolean(url && key);
}

export async function checkSupabaseConnection() {
  if (!isSupabaseConfigured()) return false;
  try {
    await supabaseRequest("snapshots?select=id&limit=1");
    return true;
  } catch {
    return false;
  }
}

export async function supabaseRequest<T>(path: string, options: SupabaseOptions = {}): Promise<T> {
  const { url, key } = getConfig();
  if (!url || !key) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: options.method ?? "GET",
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
