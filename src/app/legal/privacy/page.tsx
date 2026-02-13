import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-card">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          &larr; Back
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: February 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Information We Collect
            </h2>
            <p className="mt-2">
              When you use Blue Ocean Program - GMC Checker, we may collect the following information:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Store URLs:</strong> The Shopify store URLs you submit
                for scanning
              </li>
              <li>
                <strong>Scan Results:</strong> The compliance reports generated
                from your scans
              </li>
              <li>
                <strong>Usage Data:</strong> IP addresses, browser type, and
                access timestamps for security and rate-limiting purposes
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. How We Use Your Information
            </h2>
            <p className="mt-2">We use the collected information to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Provide and maintain the scanning service</li>
              <li>Generate compliance reports for your stores</li>
              <li>Enforce access controls and prevent abuse</li>
              <li>Improve the accuracy and coverage of our scans</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. Data Storage and Security
            </h2>
            <p className="mt-2">
              Scan results are stored locally in your browser and are not
              transmitted to or stored on our servers beyond what is necessary
              to generate the report. Session authentication uses secure,
              HTTP-only cookies that cannot be accessed by client-side scripts.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. Data Sharing
            </h2>
            <p className="mt-2">
              We do not sell, trade, or otherwise transfer your information to
              outside parties. We do not share your store URLs, scan results,
              or any personal data with third parties except as required by
              law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Cookies
            </h2>
            <p className="mt-2">
              We use a single session cookie for authentication purposes. This
              cookie is HTTP-only (not accessible to JavaScript), secure
              (transmitted only over HTTPS), and expires after 7 days. We do
              not use tracking cookies or third-party analytics cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Third-Party Services
            </h2>
            <p className="mt-2">
              When scanning a store, our service accesses publicly available
              pages of the target Shopify store. We do not access any
              non-public data, admin panels, or customer information from the
              stores being scanned.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              7. Your Rights
            </h2>
            <p className="mt-2">You have the right to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Clear your locally stored scan history at any time through your
                browser
              </li>
              <li>Request information about what data we hold about you</li>
              <li>Request deletion of any data associated with your usage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              8. Changes to This Policy
            </h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. Any changes
              will be reflected on this page with an updated revision date.
              Continued use of the Service constitutes acceptance of the
              updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              9. Contact
            </h2>
            <p className="mt-2">
              If you have questions about this Privacy Policy, please contact
              us through the program administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
