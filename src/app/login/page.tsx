"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    if (!password.trim()) {
      setError("Please enter the access password.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push("/scan");
        return;
      }

      setError(data.error || "Authentication failed.");
      if (data.locked) setLocked(true);
      if (typeof data.remainingAttempts === "number") {
        setRemainingAttempts(data.remainingAttempts);
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-card px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-2xl font-bold text-foreground"
          >
            <svg
              className="h-8 w-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            GMC Scout
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-foreground">
            Enter Access Password
          </h1>
          <p className="mt-2 text-sm text-muted">
            This tool is available to program members only.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
          {error && (
            <div
              className={`mb-4 rounded-lg p-3 text-sm ${locked ? "bg-red-100 text-red-800" : "bg-red-50 text-red-600"}`}
            >
              {error}
            </div>
          )}

          {remainingAttempts !== null && !locked && (
            <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              {remainingAttempts} attempt
              {remainingAttempts !== 1 ? "s" : ""} remaining
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter your access password"
                disabled={locked || loading}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={locked || loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Verifying..."
                : locked
                  ? "Access Locked"
                  : "Access Tool"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
