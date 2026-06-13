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

type ButtondownSubscriberList =
  | ButtondownSubscriber[]
  | { results?: ButtondownSubscriber[] };

export type NewsletterSubscriptionResult = {
  subscriber: ButtondownSubscriber;
  created: boolean;
};

export class ButtondownRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string
  ) {
    super(`Buttondown request failed (${status}): ${detail}`);
    this.name = "ButtondownRequestError";
  }
}

export function buttondownErrorCode(error: ButtondownRequestError) {
  try {
    const payload = JSON.parse(error.detail) as { code?: unknown };
    return typeof payload.code === "string" ? payload.code : null;
  } catch {
    return null;
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

function subscriberList(value: ButtondownSubscriberList) {
  return Array.isArray(value) ? value : value.results ?? [];
}

function isRegisteredSubscriber(
  subscriber: ButtondownSubscriber | null,
  email: string
): subscriber is ButtondownSubscriber {
  return Boolean(
    subscriber?.id &&
    subscriber.email_address.trim().toLowerCase() === email &&
    subscriber.type
  );
}

async function waitForSubscriber(email: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const subscriber = await findSubscriber(email);
    if (subscriber) return subscriber;
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  return null;
}

export async function subscribeToNewsletter(
  email: string
): Promise<NewsletterSubscriptionResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await findSubscriber(normalizedEmail);

  if (isRegisteredSubscriber(existing, normalizedEmail)) {
    return { subscriber: existing, created: false };
  }

  try {
    const createdSubscriber = await buttondownRequest<ButtondownSubscriber>("subscribers", {
      method: "POST",
      body: {
        email_address: normalizedEmail,
      },
    });

    if (!isRegisteredSubscriber(createdSubscriber, normalizedEmail)) {
      throw new ButtondownRequestError(
        502,
        "Buttondown returned an invalid subscriber record."
      );
    }

    const verifiedSubscriber = await waitForSubscriber(normalizedEmail);
    if (!isRegisteredSubscriber(verifiedSubscriber, normalizedEmail)) {
      throw new ButtondownRequestError(
        502,
        "Subscriber creation was not visible during verification."
      );
    }

    return { subscriber: verifiedSubscriber, created: true };
  } catch (error) {
    // A concurrent request can create the subscriber between the lookup and POST.
    if (error instanceof ButtondownRequestError && [400, 409].includes(error.status)) {
      const subscriber = await waitForSubscriber(normalizedEmail);
      if (isRegisteredSubscriber(subscriber, normalizedEmail)) {
        return { subscriber, created: false };
      }
    }

    throw error;
  }
}

async function findSubscriber(email: string) {
  const subscribers = await buttondownRequest<ButtondownSubscriberList>(
    `subscribers?email_address=${encodeURIComponent(email)}`
  );

  return (
    subscriberList(subscribers).find(
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
