import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty-state-shell">
      <div className="empty-state-card">
        <span className="eyebrow">404</span>
        <h1>Page not found</h1>
        <p>The macro page you asked for does not exist in the current driver registry.</p>
        <Link href="/" className="inline-link">
          Return to the dashboard home
        </Link>
      </div>
    </div>
  );
}
