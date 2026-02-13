import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-foreground"
          >
            <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
            Blue Ocean Program - GMC Checker
          </Link>
          <div className="flex items-center gap-6 text-sm text-muted">
            <Link
              href="/legal/terms"
              className="transition-colors hover:text-foreground"
            >
              Terms of Service
            </Link>
            <Link
              href="/legal/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              href="/legal/acceptable-use"
              className="transition-colors hover:text-foreground"
            >
              Acceptable Use
            </Link>
          </div>
        </div>
        <div className="mt-6 border-t border-border pt-6 text-center text-sm text-muted">
          Made by Romas. Updated Feb 13th, 2026.
        </div>
      </div>
    </footer>
  );
}
