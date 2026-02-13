import Link from "next/link";

export default function TermsOfServicePage() {
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
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: February 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Acceptance of Terms
            </h2>
            <p className="mt-2">
              By accessing and using Blue Ocean Program - GMC Checker (&quot;the Service&quot;), you agree to
              be bound by these Terms of Service. If you do not agree with any
              part of these terms, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Description of Service
            </h2>
            <p className="mt-2">
              Blue Ocean Program - GMC Checker is a compliance scanning tool that analyzes Shopify
              stores for Google Merchant Center policy compliance. The Service
              provides automated reports identifying potential issues that may
              affect your Google Merchant Center approval status.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. Access and Authorization
            </h2>
            <p className="mt-2">
              Access to the Service is provided through a shared program
              password. You agree not to share, redistribute, or disclose your
              access credentials to any unauthorized third parties. Each access
              credential is intended for use by the authorized recipient only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. Acceptable Use
            </h2>
            <p className="mt-2">You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Use the Service to scan stores you do not own or have authorization to scan</li>
              <li>Attempt to reverse-engineer, decompile, or extract the underlying scanning logic</li>
              <li>Use automated scripts or bots to interact with the Service beyond its intended interface</li>
              <li>Attempt to circumvent authentication or access controls</li>
              <li>Resell, redistribute, or commercially exploit the scan results without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Disclaimer of Warranties
            </h2>
            <p className="mt-2">
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without
              warranties of any kind, either express or implied. Blue Ocean Program - GMC Checker does
              not guarantee that scan results are complete, accurate, or
              up-to-date. Compliance with Google Merchant Center policies is
              ultimately determined by Google, and our scan results are advisory
              only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Limitation of Liability
            </h2>
            <p className="mt-2">
              In no event shall Blue Ocean Program - GMC Checker, its operators, or affiliates be
              liable for any indirect, incidental, special, consequential, or
              punitive damages arising out of or related to your use of the
              Service. This includes, without limitation, lost profits, lost
              data, business interruption, or any damages resulting from
              Google Merchant Center decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              7. Intellectual Property
            </h2>
            <p className="mt-2">
              All content, features, and functionality of the Service,
              including but not limited to scanning algorithms, reports, and
              user interface design, are owned by Blue Ocean Program - GMC Checker and are protected
              by intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              8. Termination
            </h2>
            <p className="mt-2">
              We reserve the right to terminate or suspend your access to the
              Service at any time, without prior notice, for any reason,
              including but not limited to a breach of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              9. Changes to Terms
            </h2>
            <p className="mt-2">
              We reserve the right to modify these Terms at any time. Continued
              use of the Service after changes constitutes acceptance of the
              updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              10. Contact
            </h2>
            <p className="mt-2">
              If you have questions about these Terms of Service, please
              contact us through the program administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
