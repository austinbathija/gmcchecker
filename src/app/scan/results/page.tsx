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
  ContactPageResult,
  PolicyContactCheck,
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
  return null;
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
        <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000" />
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
            <div className="mt-0.5 text-sm font-semibold text-foreground">{item.value || "—"}</div>
            {"sub" in item && item.sub && <div className="text-xs text-muted">{item.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactPage404sPanel({ items }: { items: ContactPageResult[] }) {
  const failed = items.filter((i) => i.is404);
  if (failed.length === 0) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 mt-3">
      <p className="text-xs font-semibold text-red-700 mb-2">404 Error Details:</p>
      <div className="space-y-1">
        {failed.map((item) => (
          <div key={item.path} className="flex items-center gap-2 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
            <span className="font-mono text-red-600">{item.url}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WrongDomainLinksPanel({ links }: { links: WrongDomainLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 mt-3">
      <p className="text-xs font-semibold text-red-700 mb-2">Wrong Domain Link Details:</p>
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
                <td className="py-2 pr-3 text-muted">{link.linkText || "(no text)"}</td>
                <td className="py-2 pr-3"><span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">{link.pageType}</span></td>
                <td className="py-2 max-w-[200px] truncate text-muted">{link.foundOn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmailMismatchPanel({ mismatches }: { mismatches: EmailMismatch[] }) {
  if (mismatches.length === 0) return null;
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 mt-3">
      <p className="text-xs font-semibold text-orange-700 mb-2">Mismatched Email Details:</p>
      {mismatches.map((m, i) => (
        <div key={i} className="flex items-start gap-2 text-xs mt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0 mt-1" />
          <div>
            <span className="font-mono font-semibold text-orange-700">{m.email}</span>
            <span className="text-muted"> — Found on: {m.pagesFound.join(", ")}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CollectionIssuesPanel({ issues }: { issues: CollectionIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mt-3">
      <p className="text-xs font-semibold text-amber-700 mb-2">Collection Details:</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-amber-200 text-amber-700">
              <th className="pb-2 pr-3 font-semibold">Collection</th>
              <th className="pb-2 pr-3 font-semibold">URL</th>
              <th className="pb-2 pr-3 font-semibold">Products</th>
              <th className="pb-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((col, i) => (
              <tr key={i} className="border-b border-amber-100 last:border-0">
                <td className="py-2 pr-3 font-semibold text-foreground">{col.name}</td>
                <td className="py-2 pr-3 max-w-[200px] truncate text-muted">{col.url}</td>
                <td className="py-2 pr-3 font-mono">{col.activeProducts}</td>
                <td className="py-2">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${col.empty ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {col.empty ? "Empty" : "< 5"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TargetedCopyPanel({ items }: { items: TargetedCopyItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 mt-3">
      <p className="text-xs font-semibold text-purple-700 mb-2">Flagged Copy ({items.length} instances):</p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="rounded bg-white p-2 border border-purple-100">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">{item.keyword}</span>
              <span className="text-xs text-muted truncate">on {item.foundOn}</span>
            </div>
            <p className="mt-1 text-xs font-mono text-foreground bg-purple-50 rounded p-1.5 break-words">{item.context}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PolicyExtractedData({ title, items }: { title: string; items: { label: string; value: string | null }[] }) {
  return (
    <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 mt-3">
      <p className="text-xs font-semibold text-cyan-700 mb-2">{title}:</p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded bg-white p-2 border border-cyan-100">
            <div className="text-xs font-medium text-muted">{item.label}</div>
            <div className="mt-0.5 text-xs text-foreground">
              {item.value ? <span className="font-medium">{item.value}</span> : <span className="italic text-muted">Not detected</span>}
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
  const [filter, setFilter] = useState<"all" | "fail" | "pass">("all");

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

  const filteredChecks = filter === "all" ? result.checks : result.checks.filter((c) => c.status === filter);
  const grouped: Record<string, ScanCheck[]> = {};
  for (const check of filteredChecks) {
    if (!grouped[check.category]) grouped[check.category] = [];
    grouped[check.category].push(check);
  }

  // Build inline detail lookup by check ID
  const getInlineDetail = (checkId: string) => {
    if (checkId === "contact_page_404s" && result.contactPage404s.length > 0) {
      return <ContactPage404sPanel items={result.contactPage404s} />;
    }
    if (checkId === "wrong_domain_links" && result.wrongDomainLinks.length > 0) {
      return <WrongDomainLinksPanel links={result.wrongDomainLinks} />;
    }
    if (checkId === "email_domain_mismatch" && result.emailMismatches.length > 0) {
      return <EmailMismatchPanel mismatches={result.emailMismatches} />;
    }
    if ((checkId === "empty_collections" || checkId === "low_product_collections") && result.collectionIssues.length > 0) {
      return <CollectionIssuesPanel issues={result.collectionIssues} />;
    }
    if (checkId === "targeted_copy" && result.targetedCopy.length > 0) {
      return <TargetedCopyPanel items={result.targetedCopy} />;
    }
    if (checkId === "shipping_cost" && result.shippingPolicyDetails) {
      return (
        <PolicyExtractedData
          title="Shipping Policy Extracted Data"
          items={[
            { label: "Currency", value: result.shippingPolicyDetails.currency },
            { label: "Cost", value: result.shippingPolicyDetails.cost },
            { label: "Delivery Time", value: result.shippingPolicyDetails.time },
            { label: "Countries", value: result.shippingPolicyDetails.countries },
            { label: "Order Cutoff", value: result.shippingPolicyDetails.cutoffTime },
          ]}
        />
      );
    }
    if (checkId === "refund_returnWindow" && result.refundPolicyDetails) {
      return (
        <PolicyExtractedData
          title="Refund Policy Extracted Data"
          items={[
            { label: "Return Window", value: result.refundPolicyDetails.returnWindow },
            { label: "Return Shipping", value: result.refundPolicyDetails.returnShipping },
            { label: "Processing Time", value: result.refundPolicyDetails.processingTime },
            { label: "Exchanges", value: result.refundPolicyDetails.exchangesAllowed },
            { label: "Restocking Fees", value: result.refundPolicyDetails.restockingFees },
          ]}
        />
      );
    }
    return null;
  };

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
              <p className="mt-1 text-xs text-muted">Scanned {new Date(result.scannedAt).toLocaleString()}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-4 md:justify-start">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="h-3 w-3 rounded-full bg-success" />
                  <span className="text-muted">{result.summary.passed} passed</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="h-3 w-3 rounded-full bg-danger" />
                  <span className="text-muted">{result.summary.failed} failed</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/scan" className="rounded-lg bg-primary px-5 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-primary-dark">
                Scan Again
              </Link>
              <Link href="/signup" className="rounded-lg border border-border px-5 py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-card">
                Save Report
              </Link>
            </div>
          </div>

          {/* Store Intelligence */}
          <div className="mt-8">
            <IntelligencePanel data={result.storeIntelligence} />
          </div>

          {/* Filter tabs */}
          <div className="mt-8 flex gap-2">
            {(["all", "fail", "pass"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-primary text-white"
                    : "bg-white text-muted border border-border hover:bg-card"
                }`}
              >
                {f === "all" ? "All" : f === "fail" ? "Failed" : "Passed"}
                <span className="ml-1.5 text-xs opacity-70">
                  ({f === "all" ? result.checks.length : result.checks.filter((c) => c.status === f).length})
                </span>
              </button>
            ))}
          </div>

          {/* All checks grouped by category with inline details */}
          <div className="mt-6 space-y-6">
            {Object.entries(grouped).map(([category, checks]) => (
              <div key={category}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                  {category}
                </h2>
                <div className="space-y-3">
                  {checks.map((check) => (
                    <div key={check.id} className="rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-sm">
                      <div className="flex items-start gap-3">
                        <StatusIcon status={check.status} />
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-foreground">{check.name}</h3>
                          <p className="mt-1 text-sm text-muted whitespace-pre-line">{check.description}</p>
                          {check.fix && (
                            <div className="mt-3 rounded-lg bg-indigo-50 p-3">
                              <p className="text-xs font-semibold text-primary">How to fix:</p>
                              <p className="mt-1 text-xs text-indigo-700">{check.fix}</p>
                            </div>
                          )}
                          {/* Inline detailed data */}
                          {getInlineDetail(check.id)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {filteredChecks.length === 0 && (
            <div className="mt-8 text-center text-muted">No checks match this filter.</div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
