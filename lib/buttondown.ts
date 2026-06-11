import "server-only";

type ButtondownEmail = {
  id: string;
  absolute_url?: string;
  status: string;
};

function apiKey() {
  return process.env.BUTTONDOWN_API_KEY;
}

export function isButtondownConfigured() {
  return Boolean(apiKey());
}

async function buttondownRequest<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown; headers?: Record<string, string> } = {}
) {
  const key = apiKey();
  if (!key) throw new Error("Buttondown is not configured.");

  const response = await fetch(`https://api.buttondown.com/v1/${path}`, {
    method: options.method ?? "GET",
    cache: "no-store",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Buttondown request failed (${response.status}): ${detail}`);
  }

  return response.json() as Promise<T>;
}

export async function subscribeToNewsletter(email: string, ipAddress?: string) {
  return buttondownRequest<{ id: string; type: string }>("subscribers", {
    method: "POST",
    headers: {
      "X-Buttondown-Collision-Behavior": "overwrite",
    },
    body: {
      email_address: email,
      type: "regular",
      ip_address: ipAddress,
      metadata: {
        source: "macro-fx-monitor",
      },
    },
  });
}

export async function publishNewsletterEmail({
  subject,
  body,
  slug,
  description,
  snapshotId,
}: {
  subject: string;
  body: string;
  slug: string;
  description: string;
  snapshotId: string;
}) {
  return buttondownRequest<ButtondownEmail>("emails", {
    method: "POST",
    body: {
      subject,
      body: `<!-- buttondown-editor-mode: plaintext -->${body}`,
      slug,
      description,
      status: "about_to_send",
      email_type: "public",
      archival_mode: "enabled",
      metadata: {
        snapshot_id: snapshotId,
        generated_by: "macro-fx-monitor",
      },
    },
  });
}
