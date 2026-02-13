"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface ScanCheck {
  id: string;
  category: string;
  name: string;
  status: "pass" | "fail" | "info";
  description: string;
  fix?: string;
}

interface StoredScan {
  id: number;
  domain: string;
  score: number;
  passed: number;
  failed: number;
  warnings: number;
  checks: ScanCheck[];
  scanned_at: string;
}

export default function DashboardPage() {
  const [scans, setScans] = useState<StoredScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/scans")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => setScans(data))
      .catch(() => setError("Could not load scan history."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-card">
        <div className="mx-auto max-w-7xl px-6 py-12">
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="mt-1 text-sm text-muted">
                All scan history and stats
              </p>
            </div>
            <Link
              href="/scan"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              New Scan
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="text-sm text-muted">Total Scans</div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {scans.length}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="text-sm text-muted">Avg Score</div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {scans.length > 0
                  ? Math.round(
                      scans.reduce((a, s) => a + s.score, 0) / scans.length
                    )
                  : "\u2014"}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="text-sm text-muted">Issues Found</div>
              <div className="mt-1 text-2xl font-bold text-danger">
                {scans.reduce((a, s) => a + s.failed, 0)}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="text-sm text-muted">Stores Scanned</div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {new Set(scans.map((s) => s.domain)).size}
              </div>
            </div>
          </div>

          {/* Scan History */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">
              Scan History
            </h2>

            {loading ? (
              <div className="mt-4 rounded-xl border border-border bg-white p-12 text-center text-sm text-muted">
                Loading scans...
              </div>
            ) : error ? (
              <div className="mt-4 rounded-xl border border-border bg-white p-12 text-center text-sm text-danger">
                {error}
              </div>
            ) : scans.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-white p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <h3 className="mt-4 text-sm font-semibold text-foreground">
                  No scans yet
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Run your first scan to see results here.
                </p>
                <Link
                  href="/scan"
                  className="mt-4 inline-block rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
                >
                  Start Scanning
                </Link>
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-card text-left text-xs font-semibold uppercase tracking-wider text-muted">
                      <th className="px-5 py-3">Store URL</th>
                      <th className="px-5 py-3">Score</th>
                      <th className="px-5 py-3">Issues</th>
                      <th className="px-5 py-3">Scanned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scans.map((scan) => (
                      <Fragment key={scan.id}>
                        <tr
                          className="cursor-pointer border-b border-border last:border-0 hover:bg-card/50"
                          onClick={() =>
                            setExpandedId(
                              expandedId === scan.id ? null : scan.id
                            )
                          }
                        >
                          <td className="px-5 py-3 text-sm text-foreground">
                            <div className="flex items-center gap-2">
                              <svg
                                className={`h-4 w-4 shrink-0 text-muted transition-transform ${expandedId === scan.id ? "rotate-90" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                              {scan.domain}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                scan.score >= 80
                                  ? "bg-green-100 text-green-700"
                                  : scan.score >= 50
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {scan.score}/100
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-muted">
                            {scan.failed} failed, {scan.warnings} warnings
                          </td>
                          <td className="px-5 py-3 text-sm text-muted">
                            {new Date(scan.scanned_at).toLocaleDateString()}
                          </td>
                        </tr>

                        {expandedId === scan.id && (
                          <tr>
                            <td colSpan={4} className="bg-card/30 px-5 py-4">
                              <div className="space-y-2">
                                {scan.checks
                                  .filter((c) => c.status === "fail")
                                  .map((check) => (
                                    <div
                                      key={check.id}
                                      className="rounded-lg border border-red-200 bg-red-50 p-3"
                                    >
                                      <div className="flex items-start gap-2">
                                        <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-red-500" />
                                        <div>
                                          <div className="text-sm font-medium text-foreground">
                                            {check.name}
                                          </div>
                                          <div className="mt-0.5 text-xs text-muted">
                                            {check.description}
                                          </div>
                                          {check.fix && (
                                            <div className="mt-1 text-xs text-primary">
                                              Fix: {check.fix}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                {scan.checks.filter((c) => c.status === "fail")
                                  .length === 0 && (
                                  <div className="text-sm text-muted">
                                    No failed checks.
                                  </div>
                                )}
                                <div className="mt-2 text-xs text-muted">
                                  {scan.checks.filter((c) => c.status === "pass").length} passed,{" "}
                                  {scan.checks.filter((c) => c.status === "info").length} info
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
