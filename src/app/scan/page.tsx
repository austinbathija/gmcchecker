"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ScanPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please enter a store URL.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.loggedOut) {
          // Session expired or scan limit reached — redirect to login
          router.push("/login");
          return;
        }
        setError(data.error || "Scan failed. Please try again.");
        setLoading(false);
        return;
      }

      // Store result in sessionStorage and navigate
      sessionStorage.setItem("gmc_scan_result", JSON.stringify(data));
      router.push("/scan/results");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Scan your store
            </h1>
            <p className="mt-4 text-lg text-muted">
              Enter your Shopify store URL below and we&apos;ll check it for Google
              Merchant Center compliance issues.
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-border bg-white p-8 shadow-lg">
            <form onSubmit={handleScan} className="space-y-4">
              <div>
                <label htmlFor="store-url" className="block text-sm font-medium text-foreground">
                  Store URL
                </label>
                <div className="mt-2 flex gap-3">
                  <input
                    id="store-url"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="e.g. mystore.myshopify.com"
                    className="flex-1 rounded-lg border border-border bg-white px-4 py-3 text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Scanning...
                      </span>
                    ) : (
                      "Scan Now"
                    )}
                  </button>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-danger">{error}</p>
                )}
              </div>
            </form>

            {loading && (
              <div className="mt-8 animate-fade-in">
                {[
                  "Checking SSL & site reachability...",
                  "Crawling contact pages...",
                  "Scanning required pages (Terms, Privacy, Shipping, Refund, FAQ)...",
                  "Checking for wrong domain links...",
                  "Detecting email domain mismatches...",
                  "Analyzing collections...",
                  "Extracting store intelligence...",
                  "Scanning shipping & refund policies...",
                  "Checking for targeted copy...",
                  "Validating contact info & address format...",
                ].map((text, i) => (
                  <div key={i} className="mt-2 flex items-center gap-3 text-sm text-muted">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                    {text}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-white p-5 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-primary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">Secure</h3>
              <p className="mt-1 text-xs text-muted">We never store your data or access your admin.</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-5 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-primary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">Fast</h3>
              <p className="mt-1 text-xs text-muted">Results in under 30 seconds.</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-5 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-primary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">Actionable</h3>
              <p className="mt-1 text-xs text-muted">Every issue comes with a fix guide.</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
