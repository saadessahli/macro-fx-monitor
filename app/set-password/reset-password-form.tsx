"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type ResetPasswordFormProps = {
  initialError?: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

type RecoveryState = "booting" | "ready" | "submitting" | "success" | "error";

const supportedOtpTypes = new Set<EmailOtpType>([
  "email",
  "invite",
  "magiclink",
  "recovery",
  "signup",
  "email_change",
]);

export function ResetPasswordForm({
  initialError,
  supabaseUrl,
  supabaseAnonKey,
}: ResetPasswordFormProps) {
  const router = useRouter();
  const supabase = useMemo(
    () => createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey),
    [supabaseAnonKey, supabaseUrl]
  );

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState<RecoveryState>(initialError ? "error" : "booting");
  const [message, setMessage] = useState<string | null>(
    initialError ?? "Checking your recovery session..."
  );
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapRecovery() {
      try {
        const currentUrl = new URL(window.location.href);
        const query = currentUrl.searchParams;
        const hash = new URLSearchParams(currentUrl.hash.startsWith("#") ? currentUrl.hash.slice(1) : "");

        const hashAccessToken = hash.get("access_token");
        const hashRefreshToken = hash.get("refresh_token");
        const code = query.get("code");
        const tokenHash = query.get("token_hash");
        const type = (query.get("type") ?? hash.get("type")) as EmailOtpType | null;

        if (hashAccessToken && hashRefreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type && supportedOtpTypes.has(type)) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (error) throw error;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          throw new Error("The recovery link is invalid, expired, or missing its session.");
        }

        currentUrl.search = "";
        currentUrl.hash = "";
        window.history.replaceState({}, "", currentUrl.pathname);

        if (!cancelled) {
          setEmail(user.email ?? null);
          setMessage("Choose a new password for the admin workspace.");
          setStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "The recovery link could not be verified.");
        }
      }
    }

    void bootstrapRecovery();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 12) {
      setStatus("error");
      setMessage("Use at least 12 characters.");
      return;
    }

    if (password !== confirmation) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    setMessage("Updating your password...");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setMessage(error.message || "Password could not be updated.");
      return;
    }

    setStatus("success");
    setMessage("Password updated. Redirecting to the admin workspace...");
    router.push("/admin/marketing");
    router.refresh();
  }

  const isLocked = status === "booting" || status === "submitting" || status === "success";
  const canSubmit = status === "ready" || status === "error";

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {email ? <p className="auth-hint">Admin account: {email}</p> : null}

      <label htmlFor="new-password">New password</label>
      <input
        id="new-password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        required
        disabled={!canSubmit || isLocked}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <label htmlFor="confirm-password">Confirm password</label>
      <input
        id="confirm-password"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        minLength={12}
        required
        disabled={!canSubmit || isLocked}
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
      />

      <button type="submit" disabled={!canSubmit || isLocked}>
        {status === "submitting" ? "Updating..." : "Set password"}
      </button>

      {message ? (
        <p
          className={status === "success" ? "auth-success" : status === "error" ? "auth-error" : "auth-hint"}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
