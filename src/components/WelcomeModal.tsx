"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "gmc_terms_accepted";

export default function WelcomeModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
          <h2 className="text-xl font-bold text-foreground">
            Welcome to GMC Checker
          </h2>
        </div>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            Hey this is Romas! Everyday I strive to make this program more
            efficient! Here is a website that will scan your website for Google
            Merchant Center requirements. Right now this website is in beta, so
            it will make some mistakes. You are one of the select few that has
            beta access :)
          </p>

          <p>Keep in mind, GMC checks for 3 things:</p>

          <ul className="list-inside list-disc space-y-1 pl-1">
            <li>
              <span className="font-medium text-foreground">#1</span> External
              factors like Social Medias, IP Location, SEO
            </li>
            <li>
              <span className="font-medium text-foreground">#2</span> Branding
              and a professionally built website
            </li>
            <li>
              <span className="font-medium text-foreground">#3</span> GMC basic
              requirements
            </li>
          </ul>

          <p>
            This website will only check for <span className="font-medium text-foreground">#3</span>, the basic
            requirements that GMC looks for.
          </p>

          <p>Have fun, and let me know if you see any bugs!</p>
        </div>

        <button
          onClick={handleAccept}
          className="mt-8 w-full rounded-lg bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          I Understand
        </button>
      </div>
    </div>
  );
}
