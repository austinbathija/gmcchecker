"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { ScanResult, ScanCheck } from "@/lib/scanner";

function StatusIcon({ status }: { status: ScanCheck["status"] }) {
  if (status === "pass") {
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
        <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (status === "fail") {
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100">
        <svg className="h-4 w-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100">
      <svg className="h-4 w-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold" style={{ color }}>{score}</div>
        <div className="text-xs text-muted">/ 100</div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [filter, setFilter] = useState<"all" | "fail" | "warning" | "pass">("all");

  useEffect(() => {
    const stored = sessionStorage.getItem("gmc_scan_result");
    if (!stored) {
      router.push("/scan");
      return;
    }
    setResult(JSON.parse(stored));
  }, [router]);

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const filteredChecks =
    filter === "all"
      ? result.checks
      : result.checks.filter((c) => c.status === filter);

  // Group by category
  const grouped: Record<string, ScanCheck[]> = {};
  for (const check of filteredChecks) {
    if (!grouped[check.category]) grouped[check.category] = [];
    grouped[check.category].push(check);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 bg-card">
        <div className="mx-auto max-w-5xl px-6 py-12">
          {/* Header */}
          <div className="flex flex-col items-center gap-8 rounded-2xl border border-border bg-white p-8 shadow-sm md:flex-row">
            <ScoreRing score={result.score} />
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-bold text-foreground">Scan Results</h1>
              <p className="mt-1 text-sm text-muted truncate max-w-md">{result.url}</p>
              <p className="mt-1 text-xs text-muted">
                Scanned {new Date(result.scannedAt).toLocaleString()}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-4 md:justify-start">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="h-3 w-3 rounded-full bg-success" />
                  <span className="text-muted">{result.summary.passed} passed</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="h-3 w-3 rounded-full bg-danger" />
                  <span className="text-muted">{result.summary.failed} failed</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="h-3 w-3 rounded-full bg-warning" />
                  <span className="text-muted">{result.summary.warnings} warnings</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href="/scan"
                className="rounded-lg bg-primary px-5 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Scan Again
              </Link>
              <Link
                href="/signup"
                className="rounded-lg border border-border px-5 py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-card"
              >
                Save Report
              </Link>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="mt-8 flex gap-2">
            {(["all", "fail", "warning", "pass"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-primary text-white"
                    : "bg-white text-muted border border-border hover:bg-card"
                }`}
              >
                {f === "all" ? "All" : f === "fail" ? "Failed" : f === "warning" ? "Warnings" : "Passed"}
                <span className="ml-1.5 text-xs opacity-70">
                  ({f === "all" ? result.checks.length : result.checks.filter((c) => c.status === f).length})
                </span>
              </button>
            ))}
          </div>

          {/* Results grouped by category */}
          <div className="mt-6 space-y-6">
            {Object.entries(grouped).map(([category, checks]) => (
              <div key={category}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                  {category}
                </h2>
                <div className="space-y-3">
                  {checks.map((check) => (
                    <div
                      key={check.id}
                      className="rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <StatusIcon status={check.status} />
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-foreground">
                            {check.name}
                          </h3>
                          <p className="mt-1 text-sm text-muted">
                            {check.description}
                          </p>
                          {check.fix && (
                            <div className="mt-3 rounded-lg bg-indigo-50 p-3">
                              <p className="text-xs font-semibold text-primary">How to fix:</p>
                              <p className="mt-1 text-xs text-indigo-700">{check.fix}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {filteredChecks.length === 0 && (
            <div className="mt-8 text-center text-muted">
              No checks match this filter.
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
