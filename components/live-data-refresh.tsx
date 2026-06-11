"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 15 * 60_000;

export function LiveDataRefresh() {
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    setLastRefresh(new Date());

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setLastRefresh(new Date());
    };

    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return (
    <div className="live-refresh" title="Visible pages request fresh source data every 15 minutes.">
      <span className="live-refresh-dot" />
      <span>Auto-refresh 15m</span>
      {lastRefresh ? (
        <span className="live-refresh-time">
          checked {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      ) : null}
    </div>
  );
}
