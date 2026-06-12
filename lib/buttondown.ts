import "server-only";

type ButtondownEmail = {
  id: string;
  absolute_url?: string;
  status: string;
};

type ButtondownSubscriber = {
  id: string;
  email_address: string;
  type: string;
};

type ButtondownSubscriberList = {
  results: ButtondownSubscriber[];
};

export class ButtondownRequestError extends Error {
  constructor(
    public readonly status: number,
    detail: string
  ) {
    super(`Buttondown request failed (${status}): ${detail}`);
    this.name = "ButtondownRequestError";
  }
}

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
    throw new ButtondownRequestError(response.status, detail);
  }

  return response.json() as Promise<T>;
}

export async function subscribeToNewsletter(email: string, ipAddress?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await findSubscriber(normalizedEmail);

  if (existing) {
    return { subscriber: existing, created: false };
  }

  try {
    const subscriber = await buttondownRequest<ButtondownSubscriber>("subscribers", {
      method: "POST",
      body: {
        email_address: normalizedEmail,
        ip_address: ipAddress,
      },
    });

    return { subscriber, created: true };
  } catch (error) {
    // A concurrent request can create the subscriber between the lookup and POST.
    if (error instanceof ButtondownRequestError && [400, 409].includes(error.status)) {
      const subscriber = await findSubscriber(normalizedEmail);
      if (subscriber) return { subscriber, created: false };
    }

    throw error;
  }
}

async function findSubscriber(email: string) {
  const subscribers = await buttondownRequest<ButtondownSubscriberList>(
    `subscribers?email_address=${encodeURIComponent(email)}`
  );

  return (
    subscribers.results.find(
      (subscriber) => subscriber.email_address.trim().toLowerCase() === email
    ) ?? null
  );
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
