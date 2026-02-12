import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            Fix Google Merchant Center{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Rejections Fast
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted md:text-xl">
            Scan your Shopify store in seconds. Uncover the hidden compliance
            issues blocking your Google Merchant Center approval and get
            step-by-step fixes.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/scan"
              className="w-full rounded-lg bg-primary px-8 py-3.5 text-center font-medium text-white shadow-lg shadow-indigo-200 transition-all hover:bg-primary-dark hover:shadow-xl sm:w-auto"
            >
              Start Scanning
            </Link>
            <Link
              href="/dashboard"
              className="w-full rounded-lg border border-border px-8 py-3.5 text-center font-medium text-foreground transition-colors hover:bg-card sm:w-auto"
            >
              View Dashboard
            </Link>
          </div>

          {/* How it works */}
          <div className="mt-24 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Enter your store URL",
                description: "Paste your Shopify store URL and click scan.",
              },
              {
                step: "2",
                title: "Review your report",
                description:
                  "Get an instant compliance report showing every issue Google would flag.",
              },
              {
                step: "3",
                title: "Fix & get approved",
                description:
                  "Follow step-by-step fix guides for each issue. Re-scan to verify.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
