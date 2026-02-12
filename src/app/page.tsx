import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const features = [
  {
    title: "Instant Store Scan",
    description:
      "Enter your store URL and get a comprehensive compliance report in seconds. We check every policy Google cares about.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: "Policy Compliance Check",
    description:
      "We verify your return policy, shipping policy, privacy policy, and terms of service meet Google's requirements.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Contact Info Validation",
    description:
      "Missing contact information is a top rejection reason. We check for phone numbers, email addresses, and physical addresses.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "SSL & Security Check",
    description:
      "Google requires secure checkout. We verify your SSL certificate is valid and your site loads over HTTPS.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: "Product Data Analysis",
    description:
      "We check your product pages for missing prices, descriptions, images, and structured data that Google requires.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    title: "Actionable Fix Guide",
    description:
      "Every issue comes with a clear, step-by-step guide on how to fix it. No guesswork, just solutions.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for a quick check",
    features: [
      "1 free scan per day",
      "Basic compliance report",
      "Policy page detection",
      "SSL verification",
    ],
    cta: "Start Free Scan",
    href: "/scan",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For serious store owners",
    features: [
      "Unlimited scans",
      "Full compliance report",
      "Product data analysis",
      "Priority support",
      "Scan history & tracking",
      "Email alerts for new issues",
    ],
    cta: "Start Free Trial",
    href: "/signup",
    highlighted: true,
  },
  {
    name: "Agency",
    price: "$99",
    period: "/month",
    description: "For agencies managing multiple stores",
    features: [
      "Everything in Pro",
      "Up to 25 stores",
      "Team member access",
      "White-label reports",
      "API access",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    href: "/signup",
    highlighted: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm text-indigo-700">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse-dot" />
              Trusted by 2,000+ Shopify merchants
            </div>
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
                Scan Your Store Free
              </Link>
              <Link
                href="/#features"
                className="w-full rounded-lg border border-border px-8 py-3.5 text-center font-medium text-foreground transition-colors hover:bg-card sm:w-auto"
              >
                See How It Works
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative gradient blobs */}
        <div className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-indigo-100 opacity-50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-cyan-100 opacity-50 blur-3xl" />
      </section>

      {/* Social proof bar */}
      <section className="border-y border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-6 py-8 text-center text-sm text-muted md:gap-16">
          <div>
            <div className="text-2xl font-bold text-foreground">50,000+</div>
            <div>Scans completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">2,000+</div>
            <div>Stores fixed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">95%</div>
            <div>Approval rate after fix</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">30 sec</div>
            <div>Average scan time</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Everything you need to get approved
            </h2>
            <p className="mt-4 text-lg text-muted">
              We check every aspect of your store that Google Merchant Center
              evaluates, so nothing slips through the cracks.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-white p-6 transition-shadow hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-primary">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-card py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-muted">
              Three simple steps to GMC compliance.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Enter your store URL",
                description:
                  "Paste your Shopify store URL and click scan. That&apos;s it.",
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
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-muted">
              Start for free. Upgrade when you need more power.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 ${
                  plan.highlighted
                    ? "border-primary bg-white shadow-xl shadow-indigo-100 ring-1 ring-primary"
                    : "border-border bg-white"
                }`}
              >
                {plan.highlighted && (
                  <div className="mb-4 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-primary">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-semibold text-foreground">
                  {plan.name}
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-muted">{plan.description}</p>
                <Link
                  href={plan.href}
                  className={`mt-6 block w-full rounded-lg py-3 text-center text-sm font-medium transition-colors ${
                    plan.highlighted
                      ? "bg-primary text-white hover:bg-primary-dark"
                      : "border border-border text-foreground hover:bg-card"
                  }`}
                >
                  {plan.cta}
                </Link>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-muted"
                    >
                      <svg
                        className="h-4 w-4 shrink-0 text-success"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-indigo-700 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Stop guessing why Google rejected your store
          </h2>
          <p className="mt-4 text-lg text-indigo-100">
            Run a free scan now and find out exactly what needs to be fixed.
          </p>
          <Link
            href="/scan"
            className="mt-8 inline-block rounded-lg bg-white px-8 py-3.5 font-medium text-primary shadow-lg transition-all hover:shadow-xl"
          >
            Scan Your Store Free
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
