"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type {
  ScanResult,
  ScanCheck,
  WrongDomainLink,
  EmailMismatch,
  CollectionIssue,
  TargetedCopyItem,
  StoreIntelligence,
  ShippingPolicyDetails,
  RefundPolicyDetails,
} from "@/lib/scanner";

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
  if (status === "info") {
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100">
        <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function IntelligencePanel({ data }: { data: StoreIntelligence }) {
  const items = [
    { label: "Domain Age", value: data.domainAge, sub: data.domainCreatedDate ? `Registered: ${data.domainCreatedDate}` : null },
    { label: "Currency", value: data.currency },
    { label: "Jurisdiction", value: data.jurisdiction },
    { label: "Language", value: data.language },
    { label: "Timezone", value: data.timezone },
    { label: "Theme", value: data.theme },
  ];

  const hasData = items.some((i) => i.value);
  if (!hasData) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Store Intelligence
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="text-xs font-medium text-blue-600">{item.label}</div>
            <div className="mt-0.5 text-sm font-semibold text-foreground">
              {item.value || "—"}
            </div>
            {"sub" in item && item.sub && (
              <div className="text-xs text-muted">{item.sub}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WrongDomainLinksTable({ links }: { links: WrongDomainLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Wrong Domain Links ({links.length})
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-red-200 text-red-700">
              <th className="pb-2 pr-3 font-semibold">Wrong Domain</th>
              <th className="pb-2 pr-3 font-semibold">Link URL</th>
              <th className="pb-2 pr-3 font-semibold">Link Text</th>
              <th className="pb-2 pr-3 font-semibold">Page Type</th>
              <th className="pb-2 font-semibold">Found On</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link, i) => (
              <tr key={i} className="border-b border-red-100 last:border-0">
                <td className="py-2 pr-3 font-mono text-red-600">{link.wrongDomain}</td>
                <td className="py-2 pr-3 max-w-[200px] truncate text-foreground">{link.fullUrl}</td>
                <td className="py-2 pr-3 text-muted">{link.linkText}</td>
                <td className="py-2 pr-3">
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">{link.pageType}</span>
                </td>
                <td className="py-2 max-w-[150px] truncate text-muted">{link.foundOn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmailMismatchTable({ mismatches }: { mismatches: EmailMismatch[] }) {
  if (mismatches.length === 0) return null;
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-orange-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Email Domain Mismatches ({mismatches.length})
      </h2>
      <div className="space-y-3">
        {mismatches.map((m, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg bg-white p-3 border border-orange-100">
            <div className="flex-1">
              <div className="font-mono text-sm font-semibold text-orange-700">{m.email}</div>
              <div className="mt-1 text-xs text-muted">Found on: {m.pagesFound.join(", ")}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CollectionIssuesTable({ issues }: { issues: CollectionIssue[] }) {
  if (issues.length === 0) return null;
  const empty = issues.filter((i) => i.empty);
  const low = issues.filter((i) => !i.empty);
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        Collection Issues ({issues.length})
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-amber-200 text-amber-700">
              <th className="pb-2 pr-3 font-semibold">Collection</th>
              <th className="pb-2 pr-3 font-semibold">URL</th>
              <th className="pb-2 pr-3 font-semibold">Active Products</th>
              <th className="pb-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {empty.map((col, i) => (
              <tr key={`e-${i}`} className="border-b border-amber-100 last:border-0">
                <td className="py-2 pr-3 font-semibold text-foreground">{col.name}</td>
                <td className="py-2 pr-3 max-w-[200px] truncate text-muted">{col.url}</td>
                <td className="py-2 pr-3 font-mono text-red-600">0</td>
                <td className="py-2">
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700 font-semibold">Empty</span>
                </td>
              </tr>
            ))}
            {low.map((col, i) => (
              <tr key={`l-${i}`} className="border-b border-amber-100 last:border-0">
                <td className="py-2 pr-3 font-semibold text-foreground">{col.name}</td>
                <td className="py-2 pr-3 max-w-[200px] truncate text-muted">{col.url}</td>
                <td className="py-2 pr-3 font-mono text-amber-600">{col.activeProducts}</td>
                <td className="py-2">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 font-semibold">&lt; 5 products</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TargetedCopyTable({ items }: { items: TargetedCopyItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        Targeted Copy Detected ({items.length})
      </h2>
      <p className="mb-3 text-xs text-purple-600">
        The following words/phrases may trigger GMC review. Consider removing or softening this language.
      </p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg bg-white p-3 border border-purple-100">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                {item.keyword}
              </span>
              <span className="text-xs text-muted truncate">on {item.foundOn}</span>
            </div>
            <p className="mt-1.5 text-xs text-foreground font-mono bg-purple-50 rounded p-2 break-words">
              {item.context}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PolicyDetailsPanel({
  title,
  icon,
  items,
  color,
}: {
  title: string;
  icon: React.ReactNode;
  items: { label: string; value: string | null }[];
  color: string;
}) {
  return (
    <div className={`rounded-xl border border-${color}-200 bg-${color}-50 p-6`}
      style={{ borderColor: `var(--color-${color === "teal" ? "accent" : color})20`, backgroundColor: `var(--color-${color === "teal" ? "accent" : color})08` }}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider"
        style={{ color: `var(--color-${color === "teal" ? "accent" : color})` }}>
        {icon}
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg bg-white p-3 border" style={{ borderColor: `var(--color-${color === "teal" ? "accent" : color})15` }}>
            <div className="text-xs font-medium text-muted">{item.label}</div>
            <div className="mt-0.5 text-sm text-foreground">
              {item.value ? (
                <span className="font-medium">{item.value}</span>
              ) : (
                <span className="italic text-muted">Not detected</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [filter, setFilter] = useState<"all" | "fail" | "warning" | "pass">("all");
  const [activeTab, setActiveTab] = useState<"checks" | "intelligence" | "details">("checks");

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

  const shippingItems = result.shippingPolicyDetails
    ? [
        { label: "Shipping Currency", value: result.shippingPolicyDetails.currency },
        { label: "Shipping Cost", value: result.shippingPolicyDetails.cost },
        { label: "Shipping Time", value: result.shippingPolicyDetails.time },
        { label: "Shipping Countries", value: result.shippingPolicyDetails.countries },
        { label: "Order Cutoff Time", value: result.shippingPolicyDetails.cutoffTime },
      ]
    : [];

  const refundItems = result.refundPolicyDetails
    ? [
        { label: "Return Window", value: result.refundPolicyDetails.returnWindow },
        { label: "Return Shipping", value: result.refundPolicyDetails.returnShipping },
        { label: "Processing Time", value: result.refundPolicyDetails.processingTime },
        { label: "Exchanges", value: result.refundPolicyDetails.exchangesAllowed },
        { label: "Restocking Fees", value: result.refundPolicyDetails.restockingFees },
      ]
    : [];

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

          {/* Main Tabs */}
          <div className="mt-8 flex gap-1 rounded-lg bg-white p-1 border border-border">
            {([
              { key: "checks" as const, label: "All Checks", count: result.checks.length },
              { key: "intelligence" as const, label: "Store Intelligence", count: null },
              { key: "details" as const, label: "Detailed Findings", count: (result.wrongDomainLinks.length + result.emailMismatches.length + result.collectionIssues.length + result.targetedCopy.length) || null },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted hover:bg-card"
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className={`ml-1.5 text-xs ${activeTab === tab.key ? "opacity-70" : "opacity-50"}`}>
                    ({tab.count})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab: All Checks */}
          {activeTab === "checks" && (
            <>
              {/* Filter sub-tabs */}
              <div className="mt-6 flex gap-2">
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
            </>
          )}

          {/* Tab: Store Intelligence */}
          {activeTab === "intelligence" && (
            <div className="mt-6 space-y-6">
              <IntelligencePanel data={result.storeIntelligence} />

              {result.shippingPolicyDetails && (
                <PolicyDetailsPanel
                  title="Shipping Policy Extracted Data"
                  color="teal"
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  }
                  items={shippingItems}
                />
              )}

              {result.refundPolicyDetails && (
                <PolicyDetailsPanel
                  title="Refund Policy Extracted Data"
                  color="teal"
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                    </svg>
                  }
                  items={refundItems}
                />
              )}

              {!result.storeIntelligence.domainAge &&
                !result.storeIntelligence.currency &&
                !result.shippingPolicyDetails &&
                !result.refundPolicyDetails && (
                  <div className="rounded-xl border border-border bg-white p-8 text-center">
                    <p className="text-muted">No store intelligence data could be extracted for this site.</p>
                  </div>
                )}
            </div>
          )}

          {/* Tab: Detailed Findings */}
          {activeTab === "details" && (
            <div className="mt-6 space-y-6">
              <WrongDomainLinksTable links={result.wrongDomainLinks} />
              <EmailMismatchTable mismatches={result.emailMismatches} />
              <CollectionIssuesTable issues={result.collectionIssues} />
              <TargetedCopyTable items={result.targetedCopy} />

              {result.wrongDomainLinks.length === 0 &&
                result.emailMismatches.length === 0 &&
                result.collectionIssues.length === 0 &&
                result.targetedCopy.length === 0 && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                      <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="mt-3 font-semibold text-green-700">No detailed issues found</p>
                    <p className="mt-1 text-sm text-green-600">
                      No wrong domain links, email mismatches, collection issues, or targeted copy were detected.
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
