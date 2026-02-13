import Link from "next/link";

export default function AcceptableUsePolicyPage() {
  return (
    <div className="min-h-screen bg-card">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          &larr; Back
        </Link>
        <h1 className="text-3xl font-bold text-foreground">
          Acceptable Use Policy
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: February 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Purpose
            </h2>
            <p className="mt-2">
              This Acceptable Use Policy outlines the permitted and prohibited
              uses of Blue Ocean Program - GMC Checker. By using the Service, you agree to comply with
              this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Permitted Use
            </h2>
            <p className="mt-2">You may use Blue Ocean Program - GMC Checker to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Scan Shopify stores that you own or have explicit authorization
                to scan
              </li>
              <li>
                Generate compliance reports for the purpose of improving your
                Google Merchant Center approval status
              </li>
              <li>
                Share scan results with team members or service providers
                working on your store
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. Prohibited Use
            </h2>
            <p className="mt-2">You may not use Blue Ocean Program - GMC Checker to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Scan stores belonging to others without their explicit consent
              </li>
              <li>
                Conduct competitive intelligence or gather information about
                competitors&apos; stores without authorization
              </li>
              <li>
                Perform excessive or automated scanning that could impact
                service availability
              </li>
              <li>
                Attempt to bypass, disable, or interfere with the
                Service&apos;s security features
              </li>
              <li>
                Share your access password with unauthorized individuals
              </li>
              <li>
                Use the Service for any illegal or unauthorized purpose
              </li>
              <li>
                Scrape, copy, or redistribute the scanning technology or
                results for commercial purposes
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. Rate Limits
            </h2>
            <p className="mt-2">
              To ensure fair usage and service availability for all program
              members, reasonable rate limits are in place. Excessive scanning
              or automated bulk requests may result in temporary or permanent
              access restrictions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Access Security
            </h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your
              access credentials. Do not share your password with anyone
              outside of the authorized program. If you believe your access has
              been compromised, contact the program administrator immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Enforcement
            </h2>
            <p className="mt-2">
              Violations of this Acceptable Use Policy may result in immediate
              termination of access without notice. We reserve the right to
              investigate and take appropriate action against anyone who
              violates this policy, including but not limited to revoking
              access and pursuing legal remedies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              7. Reporting Violations
            </h2>
            <p className="mt-2">
              If you become aware of any violations of this policy, please
              report them to the program administrator immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              8. Changes to This Policy
            </h2>
            <p className="mt-2">
              We may update this Acceptable Use Policy at any time. Continued
              use of the Service after changes constitutes acceptance of the
              updated policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
