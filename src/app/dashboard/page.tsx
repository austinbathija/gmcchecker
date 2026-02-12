"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface StoredScan {
  url: string;
  score: number;
  scannedAt: string;
  passed: number;
  failed: number;
  warnings: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; email: string } | null>(null);
  const [scans, setScans] = useState<StoredScan[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("gmc_user");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(stored));

    // Load scan history from localStorage
    const scanHistory = localStorage.getItem("gmc_scan_history");
    if (scanHistory) {
      setScans(JSON.parse(scanHistory));
    }
  }, [router]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("gmc_user");
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 bg-card">
        <div className="mx-auto max-w-7xl px-6 py-12">
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Welcome back{user.name ? `, ${user.name}` : ""}
              </h1>
              <p className="mt-1 text-sm text-muted">{user.email}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/scan"
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                New Scan
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white"
              >
                Log out
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="text-sm text-muted">Total Scans</div>
              <div className="mt-1 text-2xl font-bold text-foreground">{scans.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="text-sm text-muted">Avg Score</div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {scans.length > 0
                  ? Math.round(scans.reduce((a, s) => a + s.score, 0) / scans.length)
                  : "—"}
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
                {new Set(scans.map((s) => s.url)).size}
              </div>
            </div>
          </div>

          {/* Plan */}
          <div className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="text-sm font-semibold text-primary">Free Plan</div>
                <div className="mt-1 text-sm text-muted">1 scan per day. Upgrade for unlimited scans, scan history, and more.</div>
              </div>
              <Link
                href="/#pricing"
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>

          {/* Scan History */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">Scan History</h2>
            {scans.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-white p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-4 text-sm font-semibold text-foreground">No scans yet</h3>
                <p className="mt-2 text-sm text-muted">Run your first scan to see results here.</p>
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
                    {scans.map((scan, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-card/50">
                        <td className="px-5 py-3 text-sm text-foreground">{scan.url}</td>
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
                          {new Date(scan.scannedAt).toLocaleDateString()}
                        </td>
                      </tr>
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
