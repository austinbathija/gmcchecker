import * as cheerio from "cheerio";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScanCheck {
  id: string;
  category: string;
  name: string;
  status: "pass" | "fail" | "info";
  description: string;
  fix?: string;
}

export interface WrongDomainLink {
  wrongDomain: string;
  fullUrl: string;
  linkText: string;
  pageType: string;
  foundOn: string;
}

export interface EmailMismatch {
  email: string;
  pagesFound: string[];
}

export interface CollectionIssue {
  name: string;
  url: string;
  activeProducts: number;
  empty: boolean;
  duplicateProducts?: string[];
}

export interface StoreIntelligence {
  domainAge: string | null;
  domainCreatedDate: string | null;
  currency: string | null;
  jurisdiction: string | null;
  language: string | null;
  timezone: string | null;
  theme: string | null;
}

export interface TargetedCopyItem {
  keyword: string;
  context: string;
  foundOn: string;
}

export interface ShippingPolicyDetails {
  found: boolean;
  currency: string | null;
  cost: string | null;
  time: string | null;
  countries: string | null;
  cutoffTime: string | null;
}

export interface RefundPolicyDetails {
  found: boolean;
  returnWindow: string | null;
  returnShipping: string | null;
  processingTime: string | null;
  exchangesAllowed: string | null;
  restockingFees: string | null;
}

export interface ContactPageResult {
  path: string;
  url: string;
  is404: boolean;
}

export interface PolicyContactCheck {
  policyName: string;
  policyUrl: string;
  hasEmail: boolean;
  hasPhone: boolean;
  hasAddress: boolean;
}

export interface ScanResult {
  url: string;
  scannedAt: string;
  score: number;
  checks: ScanCheck[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
  };
  storeIntelligence: StoreIntelligence;
  wrongDomainLinks: WrongDomainLink[];
  emailMismatches: EmailMismatch[];
  collectionIssues: CollectionIssue[];
  targetedCopy: TargetedCopyItem[];
  shippingPolicyDetails: ShippingPolicyDetails | null;
  refundPolicyDetails: RefundPolicyDetails | null;
  contactPage404s: ContactPageResult[];
  policyContactChecks: PolicyContactCheck[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeUrl(input: string): string {
  let raw = input.trim();
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    raw = "https://" + raw;
  }
  try {
    const parsed = new URL(raw);
    // Always strip path — we only want the origin (scheme + host)
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchPage(url: string): Promise<{ ok: boolean; status: number; html: string }> {
  const headers = {
    "User-Agent": BROWSER_UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });
      const html = await res.text();
      return { ok: res.ok, status: res.status, html };
    } catch {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  return { ok: false, status: 0, html: "" };
}

/** Detect soft-404 pages — checks visible text only (scripts stripped) */
function isSoft404(html: string): boolean {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  const visibleText = $("body").text().substring(0, 2000).toLowerCase();
  return (
    (visibleText.includes("page not found") && !visibleText.includes("contact")) ||
    visibleText.includes("404 not found") ||
    visibleText.includes("page you requested does not exist") ||
    visibleText.includes("this page isn\u2019t available") ||
    visibleText.includes("this page isn't available") ||
    visibleText.includes("page doesn\u2019t exist") ||
    visibleText.includes("page doesn't exist")
  );
}

/** Find footer HTML using multiple selectors — Shopify themes vary */
function getFooterHtml($: cheerio.CheerioAPI): string {
  // Try semantic <footer> first, then class/id-based selectors
  const selectors = [
    "footer",
    "[class*='footer' i]",
    "#footer",
    "#site-footer",
    "#shopify-section-footer",
    "[data-section-type='footer']",
    "[class*='site-footer' i]",
    "[class*='page-footer' i]",
  ];
  for (const sel of selectors) {
    const el = $(sel);
    if (el.length > 0) {
      const html = el.html();
      if (html && html.trim().length > 50) return html;
    }
  }
  return "";
}

/** Extract emails from HTML — checks both raw text and mailto: links */
function extractEmails(html: string): string[] {
  const results = new Set<string>();

  // From mailto: links (most reliable)
  const $el = cheerio.load(html);
  $el('a[href^="mailto:"]').each((_, el) => {
    const href = $el(el).attr("href") || "";
    const email = href.replace("mailto:", "").split("?")[0].trim().toLowerCase();
    if (email && email.includes("@")) results.add(email);
  });

  // From visible text (strip scripts first)
  $el("script, style, noscript, svg").remove();
  const visibleHtml = $el("body").html() || $el.html() || "";
  const pattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = visibleHtml.match(pattern) || [];
  for (const e of matches) {
    const lower = e.toLowerCase();
    if (
      !lower.endsWith(".png") && !lower.endsWith(".jpg") && !lower.endsWith(".svg") &&
      !lower.endsWith(".gif") && !lower.endsWith(".webp") && !lower.endsWith(".js") &&
      !lower.endsWith(".css") && !lower.includes("sentry") && !lower.includes("example.com") &&
      !lower.includes("wixpress") && !lower.includes("schema.org") &&
      !lower.includes("shopify.com") && !lower.includes("hcaptcha.com") &&
      !lower.includes("cloudflare")
    ) {
      results.add(lower);
    }
  }

  return [...results];
}

/** Extract phone numbers from an HTML string — tel: links + regex patterns */
function extractPhonesFromString(html: string): string[] {
  const $el = cheerio.load(html);
  const results = new Set<string>();

  // From tel: links (most reliable)
  $el('a[href^="tel:"]').each((_, el) => {
    const href = $el(el).attr("href") || "";
    const phone = href.replace("tel:", "").trim();
    if (phone.length >= 7) results.add(phone);
  });

  // From visible text — strict phone patterns only
  $el("script, style, noscript, svg").remove();
  const text = $el("body").text() || $el.text();

  // Match specific phone formats:
  // +1 (555) 123-4567, (555) 123-4567, 555-123-4567, +44 20 1234 5678
  const strictPatterns = [
    /\+?1?\s*\(?[2-9]\d{2}\)?\s*[-.\s]?\d{3}\s*[-.\s]?\d{4}/g,      // North American
    /\+\d{1,3}\s*\(?\d{1,4}\)?\s*[-.\s]?\d{2,4}\s*[-.\s]?\d{2,4}\s*[-.\s]?\d{0,4}/g, // International
  ];

  for (const pattern of strictPatterns) {
    const matches = text.match(pattern) || [];
    for (const m of matches) {
      const cleaned = m.trim();
      // Must have at least 10 digits total (excluding formatting)
      const digitCount = cleaned.replace(/\D/g, "").length;
      if (digitCount >= 10 && digitCount <= 15 && cleaned.length <= 25) {
        results.add(cleaned);
      }
    }
  }

  return [...results];
}

/** Extract phone numbers from any HTML string (alias) */
function extractPhonesFromHtml(html: string): string[] {
  return extractPhonesFromString(html);
}

/** Strip scripts/styles from HTML and return visible text */
function getVisibleText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, link, meta").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

/** Check if address-like content exists in HTML */
function hasAddress(html: string): boolean {
  const text = getVisibleText(html);

  // Pattern 1: Street number + street type
  if (/\d+\s+[\w\s]+(?:st|street|ave|avenue|blvd|boulevard|dr|drive|rd|road|ln|lane|way|ct|court|pl|place|cir|circle)\b/i.test(text)) {
    return true;
  }

  // Pattern 2: Comma-separated address (123 Main St, City, ST 12345)
  if (/\d+[^,\n]{2,40},\s*[A-Za-z\s]+,\s*[A-Za-z]{2,}\s+\d{4,6}/i.test(text)) {
    return true;
  }

  // Pattern 3: PO Box
  if (/p\.?o\.?\s*box\s+\d+/i.test(text)) {
    return true;
  }

  // Pattern 4: Suite/Unit/Apt + number patterns with zip codes nearby
  if (/(?:suite|ste|unit|apt|#)\s*\d+[^<]{0,80}\d{5}/i.test(text)) {
    return true;
  }

  // Pattern 5: City, State ZIP (US pattern) or City, Province Postal (CA)
  if (/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?/.test(text)) {
    return true;
  }

  // Pattern 6: Any text with a zip code near a comma-separated location
  if (/,\s*[A-Za-z\s]{2,20},\s*[A-Za-z\s]{2,20},?\s*\d{4,6}/.test(text)) {
    return true;
  }

  return false;
}

// ─── TARGETED COPY KEYWORDS ─────────────────────────────────────────────────

const TARGETED_KEYWORDS = [
  "pain", "relief", "cure", "cures", "heal", "heals", "healing",
  "miracle", "disease", "diseases", "cancer", "tumor", "tumors",
  "diabetes", "arthritis", "inflammation", "chronic",
  "weight loss", "lose weight", "fat burner", "detox",
  "anti-aging", "anti aging", "wrinkle", "cellulite",
  "clinically proven", "doctor recommended", "FDA approved",
  "drug", "medication", "prescription", "pharmaceutical",
  "treat", "treatment", "therapy", "therapeutic",
  "supplement", "symptom", "symptoms", "diagnosis",
  "blood pressure", "cholesterol", "anxiety", "depression",
  "insomnia", "erectile", "fertility", "hormone",
];

// ─── Currency Patterns ───────────────────────────────────────────────────────

const CURRENCY_PATTERNS = [
  { code: "USD", symbols: ["$", "USD", "US$"] },
  { code: "EUR", symbols: ["€", "EUR"] },
  { code: "GBP", symbols: ["£", "GBP"] },
  { code: "CAD", symbols: ["CAD", "CA$", "C$"] },
  { code: "AUD", symbols: ["AUD", "AU$", "A$"] },
  { code: "JPY", symbols: ["¥", "JPY"] },
  { code: "INR", symbols: ["₹", "INR"] },
];

// ─── Main Scanner ─────────────────────────────────────────────────────────────

export async function scanStore(inputUrl: string): Promise<ScanResult> {
  const url = normalizeUrl(inputUrl);
  const storeDomain = getDomain(url);
  const checks: ScanCheck[] = [];

  // ── Fetch homepage ──────────────────────────────────────────────────────
  let homepageHtml = "";
  let homepageFetchOk = false;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    homepageFetchOk = res.ok;
    homepageHtml = await res.text();
  } catch {
    homepageFetchOk = false;
  }

  // ── 1. SSL Check ────────────────────────────────────────────────────────
  checks.push({
    id: "ssl",
    category: "Security",
    name: "SSL Certificate",
    status: url.startsWith("https://") ? "pass" : "fail",
    description: url.startsWith("https://")
      ? "Your site uses HTTPS, which is required by Google Merchant Center."
      : "Your site does not use HTTPS. Google requires all stores to have a valid SSL certificate.",
    fix: !url.startsWith("https://")
      ? "Enable SSL on your domain. Most Shopify stores get this automatically — check your domain settings."
      : undefined,
  });

  // ── 2. Site Reachability ────────────────────────────────────────────────
  checks.push({
    id: "reachable",
    category: "Accessibility",
    name: "Site Reachability",
    status: homepageFetchOk ? "pass" : "fail",
    description: homepageFetchOk
      ? "Your store is accessible and returned a successful response."
      : "We could not reach your store. Google will also fail to crawl it.",
    fix: !homepageFetchOk
      ? "Make sure your store URL is correct and your site is not password-protected or in maintenance mode."
      : undefined,
  });

  if (!homepageFetchOk) {
    return buildResult(url, checks, emptyExtras());
  }

  const $ = cheerio.load(homepageHtml);
  const htmlLower = homepageHtml.toLowerCase();

  // ── 3. Password Protection ─────────────────────────────────────────────
  const isPasswordProtected =
    htmlLower.includes("password-page") ||
    htmlLower.includes("store-password") ||
    htmlLower.includes("password_page") ||
    (htmlLower.includes("enter store using password") && htmlLower.includes("password"));
  checks.push({
    id: "password_protection",
    category: "Accessibility",
    name: "No Password Protection",
    status: isPasswordProtected ? "fail" : "pass",
    description: isPasswordProtected
      ? "Your store appears to be password-protected. Google cannot access password-protected stores."
      : "Your store is publicly accessible (not password-protected).",
    fix: isPasswordProtected
      ? "Remove password protection: Shopify Admin > Online Store > Preferences > uncheck 'Enable password'."
      : undefined,
  });

  // ────────────────────────────────────────────────────────────────────────
  // Fetch ALL pages in parallel
  // ────────────────────────────────────────────────────────────────────────
  const contactPaths = [
    "/contact",
    "/pages/contact-us",
    "/pages/contactus",
    "/pages/get-in-touch",
    "/contact-us",
    "/get-in-touch",
    "/getintouch",
    "/pages/contact",
  ];

  const policyPages = [
    { path: "/policies/terms-of-service", name: "Terms & Conditions", patterns: ["terms of service", "terms-of-service", "terms and conditions", "terms-and-conditions", "/policies/terms"] },
    { path: "/policies/privacy-policy", name: "Privacy Policy", patterns: ["privacy policy", "privacy-policy", "/policies/privacy"] },
    { path: "/policies/shipping-policy", name: "Shipping Policy", patterns: ["shipping policy", "shipping-policy", "/policies/shipping", "delivery policy"] },
    { path: "/policies/refund-policy", name: "Returns & Refunds Policy", patterns: ["refund policy", "refund-policy", "return policy", "returns policy", "return-policy", "/policies/refund"] },
    { path: "/pages/faq", name: "FAQ", patterns: ["/pages/faq", "/faq", "frequently asked", "help center"] },
  ];

  // Billing Terms & Track Order are special — we just need footer links
  const linkOnlyPages = [
    { name: "Billing Terms & Conditions", searchTerms: ["billing terms", "billing-terms", "billing policy", "billing conditions"] },
    { name: "Track Order", searchTerms: ["track order", "track-order", "order tracking", "track your order", "order-tracking"] },
  ];

  const pagesToFetch: { label: string; url: string }[] = [];
  for (const cp of contactPaths) {
    pagesToFetch.push({ label: `contact:${cp}`, url: `${url}${cp}` });
  }
  for (const rp of policyPages) {
    pagesToFetch.push({ label: `required:${rp.name}`, url: `${url}${rp.path}` });
  }
  pagesToFetch.push({ label: "collections_json", url: `${url}/collections.json` });

  const fetchResults: Record<string, { ok: boolean; status: number; html: string }> = {};
  await Promise.all(
    pagesToFetch.map(async (p) => {
      const result = await fetchPage(p.url);
      fetchResults[p.label] = result;
    })
  );

  const shippingRes = fetchResults["required:Shipping Policy"];
  const refundRes = fetchResults["required:Returns & Refunds Policy"];

  // ────────────────────────────────────────────────────────────────────────
  // 4. Contact Page Existence
  // ────────────────────────────────────────────────────────────────────────
  const contactPage404s: ContactPageResult[] = [];
  let workingContactPagePath: string | null = null;

  for (const cp of contactPaths) {
    const key = `contact:${cp}`;
    const r = fetchResults[key];
    if (!r) continue;

    const is404 = !r.ok || r.status === 404 || isSoft404(r.html);

    contactPage404s.push({ path: cp, url: `${url}${cp}`, is404 });

    if (!is404 && !workingContactPagePath) {
      workingContactPagePath = cp;
    }
  }

  // Get the working contact page HTML for later checks
  let contactPageHtml = "";
  if (workingContactPagePath) {
    const r = fetchResults[`contact:${workingContactPagePath}`];
    if (r && r.ok) contactPageHtml = r.html;
  }

  checks.push({
    id: "contact_page_exists",
    category: "Contact Page",
    name: "Contact Page Exists",
    status: workingContactPagePath ? "pass" : "fail",
    description: workingContactPagePath
      ? `A working contact page was found at ${workingContactPagePath}.`
      : "No working contact page found at any common path.",
    fix: !workingContactPagePath
      ? "Create a contact page at /pages/contact-us and link it in your navigation and footer."
      : undefined,
  });

  // ────────────────────────────────────────────────────────────────────────
  // 5. Contact Page 404 Errors — only report truly 404'd paths
  // ────────────────────────────────────────────────────────────────────────
  const paths404 = contactPage404s.filter((c) => c.is404);
  if (paths404.length > 0) {
    checks.push({
      id: "contact_page_404s",
      category: "404 Errors",
      name: `Contact Page 404s (${paths404.length} found)`,
      status: "fail",
      description: `The following contact page URLs return 404:\n${paths404.map((c) => c.url).join("\n")}`,
      fix: "Create pages at these URLs, or remove any links pointing to them.",
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // 6. Required Pages Check
  // ────────────────────────────────────────────────────────────────────────
  for (const rp of policyPages) {
    const key = `required:${rp.name}`;
    const r = fetchResults[key];
    const pageOk = r && r.ok && !isSoft404(r.html);
    const linkedInHomepage = rp.patterns.some((p) => htmlLower.includes(p));

    if (pageOk && linkedInHomepage) {
      checks.push({
        id: `required_page_${rp.name.toLowerCase().replace(/[^a-z]/g, "_")}`,
        category: "Required Pages",
        name: rp.name,
        status: "pass",
        description: `${rp.name} page exists and is linked from your homepage.`,
      });
    } else if (pageOk) {
      checks.push({
        id: `required_page_${rp.name.toLowerCase().replace(/[^a-z]/g, "_")}`,
        category: "Required Pages",
        name: rp.name,
        status: "fail",
        description: `${rp.name} page exists at ${rp.path} but was not found linked from your homepage/footer.`,
        fix: `Link your ${rp.name} page in your footer navigation.`,
      });
    } else {
      checks.push({
        id: `required_page_${rp.name.toLowerCase().replace(/[^a-z]/g, "_")}`,
        category: "Required Pages",
        name: rp.name,
        status: "fail",
        description: linkedInHomepage
          ? `A link to ${rp.name} was found but the page at ${rp.path} returned an error.`
          : `No ${rp.name} page found. Google Merchant Center requires this page.`,
        fix: `Create a ${rp.name} page and link it in your footer. In Shopify: Settings > Policies or create a custom page.`,
      });
    }
  }

  // ── Billing Terms & Track Order: just check footer links ──────────────
  for (const lop of linkOnlyPages) {
    // Find links in homepage that match these terms
    let foundLinkOnDomain = false;
    $("a").each((_, el) => {
      const text = $(el).text().toLowerCase().trim();
      const href = $(el).attr("href") || "";
      const matchesText = lop.searchTerms.some((t) => text.includes(t));
      const matchesHref = lop.searchTerms.some((t) => href.toLowerCase().includes(t.replace(/\s+/g, "-")));
      if (matchesText || matchesHref) {
        // Check if link is on the store's domain (relative or absolute to same domain)
        if (href.startsWith("/") || href.startsWith("#") || getDomain(href) === storeDomain || href.startsWith(url)) {
          foundLinkOnDomain = true;
        }
      }
    });

    checks.push({
      id: `required_page_${lop.name.toLowerCase().replace(/[^a-z]/g, "_")}`,
      category: "Required Pages",
      name: lop.name,
      status: foundLinkOnDomain ? "pass" : "fail",
      description: foundLinkOnDomain
        ? `A ${lop.name} link was found pointing to your store domain.`
        : `No ${lop.name} link found in your footer/homepage pointing to your domain.`,
      fix: !foundLinkOnDomain
        ? `Add a ${lop.name} page and link it in your footer navigation.`
        : undefined,
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // 7. Wrong Domain Links — homepage + products + ALL policy pages
  // ────────────────────────────────────────────────────────────────────────
  const wrongDomainLinks: WrongDomainLink[] = [];
  const allowedDomains = [
    storeDomain,
    "shopify.com", "myshopify.com", "cdn.shopify.com", "shopifycdn.com",
    "google.com", "googleapis.com", "gstatic.com", "googletagmanager.com", "google-analytics.com",
    "facebook.com", "fb.com", "instagram.com", "twitter.com", "x.com",
    "youtube.com", "tiktok.com", "pinterest.com", "linkedin.com", "snapchat.com",
    "apple.com", "apps.apple.com", "play.google.com",
    "paypal.com", "stripe.com", "klarna.com", "afterpay.com", "sezzle.com",
    "trustpilot.com", "judge.me", "loox.io", "stamped.io", "yotpo.com",
    "klaviyo.com", "mailchimp.com", "omnisend.com",
    "w3.org", "schema.org", "gravatar.com",
    "hcaptcha.com", "recaptcha.net", "cloudflare.com", "cloudflareinsights.com",
    "cookiesandyou.com",
    "gorgias.com", "tidio.com", "zendesk.com", "intercom.com", "freshdesk.com",
  ];

  const pagesToScanForLinks: { html: string; pageType: string; foundOn: string }[] = [
    { html: homepageHtml, pageType: "Homepage", foundOn: url },
  ];

  // Add all policy pages
  for (const rp of policyPages) {
    const key = `required:${rp.name}`;
    const r = fetchResults[key];
    if (r && r.ok) {
      pagesToScanForLinks.push({ html: r.html, pageType: "Policy", foundOn: `${url}${rp.path}` });
    }
  }

  // Add first working contact page
  for (const cp of contactPaths) {
    const r = fetchResults[`contact:${cp}`];
    if (r && r.ok && !isSoft404(r.html)) {
      pagesToScanForLinks.push({ html: r.html, pageType: "Other", foundOn: `${url}${cp}` });
      break;
    }
  }

  // Find + fetch product pages
  const productLinks: string[] = [];
  $('a[href*="/products/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href && !href.includes("collections") && productLinks.length < 3) {
      productLinks.push(href.startsWith("http") ? href : `${url}${href.startsWith("/") ? "" : "/"}${href}`);
    }
  });
  await Promise.all(
    productLinks.slice(0, 3).map(async (pUrl) => {
      const r = await fetchPage(pUrl);
      if (r.ok) pagesToScanForLinks.push({ html: r.html, pageType: "Product", foundOn: pUrl });
    })
  );

  for (const page of pagesToScanForLinks) {
    const $page = cheerio.load(page.html);
    $page("a[href]").each((_, el) => {
      const href = $page(el).attr("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:") || href.startsWith("/") || href.startsWith("?") || href.startsWith("data:")) return;
      try {
        const linkDomain = getDomain(href);
        if (!linkDomain) return;
        const isAllowed = allowedDomains.some((d) => linkDomain === d || linkDomain.endsWith(`.${d}`));
        if (!isAllowed && linkDomain !== storeDomain && !linkDomain.endsWith(`.${storeDomain}`)) {
          if (!wrongDomainLinks.some((w) => w.fullUrl === href && w.foundOn === page.foundOn)) {
            wrongDomainLinks.push({
              wrongDomain: linkDomain,
              fullUrl: href,
              linkText: $page(el).text().trim().substring(0, 100) || "(no text)",
              pageType: page.pageType,
              foundOn: page.foundOn,
            });
          }
        }
      } catch { /* skip */ }
    });
  }

  checks.push({
    id: "wrong_domain_links",
    category: "Link Integrity",
    name: "Wrong Domain Links",
    status: wrongDomainLinks.length > 0 ? "fail" : "pass",
    description: wrongDomainLinks.length > 0
      ? `Found ${wrongDomainLinks.length} link(s) pointing to domains other than ${storeDomain}.`
      : "No wrong-domain links were detected across your site pages.",
    fix: wrongDomainLinks.length > 0
      ? "Review each flagged link and either remove it or update it to point to your own domain."
      : undefined,
  });

  // ────────────────────────────────────────────────────────────────────────
  // 8. Email Domain Mismatch
  // ────────────────────────────────────────────────────────────────────────
  const emailMismatches: EmailMismatch[] = [];
  const allEmailsByPage: Record<string, string[]> = {};

  const homepageEmails = extractEmails(homepageHtml);
  if (homepageEmails.length > 0) allEmailsByPage["Homepage"] = homepageEmails;

  for (const cp of contactPaths) {
    const r = fetchResults[`contact:${cp}`];
    if (r && r.ok) {
      const emails = extractEmails(r.html);
      if (emails.length > 0) allEmailsByPage[cp] = emails;
    }
  }
  for (const rp of policyPages) {
    const r = fetchResults[`required:${rp.name}`];
    if (r && r.ok) {
      const emails = extractEmails(r.html);
      if (emails.length > 0) allEmailsByPage[rp.name] = emails;
    }
  }

  const emailPageMap: Record<string, string[]> = {};
  for (const [page, emails] of Object.entries(allEmailsByPage)) {
    for (const email of emails) {
      if (!emailPageMap[email]) emailPageMap[email] = [];
      emailPageMap[email].push(page);
    }
  }

  for (const [email, pages] of Object.entries(emailPageMap)) {
    const emailDomain = email.split("@")[1]?.toLowerCase();
    if (emailDomain && emailDomain !== storeDomain && !storeDomain.includes(emailDomain) && !emailDomain.includes(storeDomain)) {
      emailMismatches.push({ email, pagesFound: pages });
    }
  }

  checks.push({
    id: "email_domain_mismatch",
    category: "Email Integrity",
    name: emailMismatches.length > 0 ? "Email Domain Mismatch" : "Email Domain Match",
    status: emailMismatches.length > 0 ? "fail" : Object.keys(emailPageMap).length > 0 ? "pass" : "fail",
    description: emailMismatches.length > 0
      ? `Found ${emailMismatches.length} email(s) with domains that don't match your store domain (${storeDomain}).`
      : Object.keys(emailPageMap).length > 0
        ? "All email addresses found match your store domain."
        : "No email addresses were found on the site.",
    fix: emailMismatches.length > 0
      ? `Use email addresses matching your store domain (e.g., support@${storeDomain}).`
      : Object.keys(emailPageMap).length === 0
        ? "Add a contact email address to your store."
        : undefined,
  });

  // ────────────────────────────────────────────────────────────────────────
  // 9. Collection Checks + Duplicate Products
  // ────────────────────────────────────────────────────────────────────────
  const collectionIssues: CollectionIssue[] = [];
  const collectionsRes = fetchResults["collections_json"];
  let collectionsData: { collections?: { handle: string; title: string; products_count?: number }[] } | null = null;

  if (collectionsRes && collectionsRes.ok) {
    try { collectionsData = JSON.parse(collectionsRes.html); } catch { collectionsData = null; }
  }

  // Track all product IDs per collection for duplicate check
  const collectionProductIds: Record<string, { id: number; title: string }[]> = {};
  const allSeenProductIds = new Map<number, string[]>(); // productId -> collection names

  if (collectionsData?.collections) {
    const colBatches = [...collectionsData.collections];
    const colResults: { col: typeof colBatches[0]; activeProducts: number; products: { id: number; title: string }[] }[] = [];

    for (let i = 0; i < colBatches.length; i += 10) {
      const batch = colBatches.slice(i, i + 10);
      await Promise.all(
        batch.map(async (col) => {
          let activeProducts = col.products_count ?? 0;
          let products: { id: number; title: string }[] = [];
          try {
            const colRes = await fetchPage(`${url}/collections/${col.handle}/products.json?limit=250`);
            if (colRes.ok) {
              const colData = JSON.parse(colRes.html);
              products = (colData.products || []).map((p: { id: number; title: string }) => ({ id: p.id, title: p.title }));
              activeProducts = products.length;
            }
          } catch { /* use fallback */ }
          colResults.push({ col, activeProducts, products });
        })
      );
    }

    for (const { col, activeProducts, products } of colResults) {
      collectionProductIds[col.handle] = products;

      // Track which collections each product appears in
      for (const p of products) {
        if (!allSeenProductIds.has(p.id)) allSeenProductIds.set(p.id, []);
        allSeenProductIds.get(p.id)!.push(col.title);
      }

      if (activeProducts === 0) {
        collectionIssues.push({ name: col.title, url: `${url}/collections/${col.handle}`, activeProducts: 0, empty: true });
      } else if (activeProducts < 5) {
        collectionIssues.push({ name: col.title, url: `${url}/collections/${col.handle}`, activeProducts, empty: false });
      }
    }

    // Check for duplicate products across collections
    const duplicateProducts: string[] = [];
    for (const [productId, colNames] of allSeenProductIds) {
      if (colNames.length > 1) {
        const product = colResults.find((cr) => cr.products.some((p) => p.id === productId))?.products.find((p) => p.id === productId);
        duplicateProducts.push(`"${product?.title || productId}" appears in: ${colNames.join(", ")}`);
      }
    }

    if (duplicateProducts.length > 0) {
      checks.push({
        id: "duplicate_collection_products",
        category: "Collections",
        name: "Duplicate Products Across Collections",
        status: "fail",
        description: `Found ${duplicateProducts.length} product(s) appearing in multiple collections. Each collection should have unique products.\n${duplicateProducts.slice(0, 10).join("\n")}${duplicateProducts.length > 10 ? `\n...and ${duplicateProducts.length - 10} more` : ""}`,
        fix: "Ensure each collection has unique products. Remove duplicates from collections or reorganize.",
      });
    }
  }

  const emptyCollections = collectionIssues.filter((c) => c.empty);
  const lowProductCollections = collectionIssues.filter((c) => !c.empty);

  if (emptyCollections.length > 0) {
    checks.push({
      id: "empty_collections",
      category: "Collections",
      name: "Empty Collections",
      status: "fail",
      description: `Found ${emptyCollections.length} collection(s) with 0 active products.`,
      fix: "Add products to empty collections or remove/hide them from your store navigation.",
    });
  }
  if (lowProductCollections.length > 0) {
    checks.push({
      id: "low_product_collections",
      category: "Collections",
      name: "Collections With < 5 Products",
      status: "fail",
      description: `Found ${lowProductCollections.length} collection(s) with fewer than 5 active products.`,
      fix: "Add more products to these collections or consolidate them.",
    });
  }
  if (emptyCollections.length === 0 && lowProductCollections.length === 0) {
    checks.push({
      id: "collections_healthy",
      category: "Collections",
      name: "Collection Health",
      status: collectionsData ? "pass" : "info",
      description: collectionsData
        ? "All collections have 5 or more active products."
        : "Could not access collections data (store may not expose /collections.json).",
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // 10. Store Intelligence
  // ────────────────────────────────────────────────────────────────────────
  const storeIntelligence: StoreIntelligence = {
    domainAge: null, domainCreatedDate: null, currency: null,
    jurisdiction: null, language: null, timezone: null, theme: null,
  };

  const currencyMeta = homepageHtml.match(/"priceCurrency"\s*:\s*"([A-Z]{3})"/i) ||
    homepageHtml.match(/"currency"\s*:\s*"([A-Z]{3})"/i) ||
    homepageHtml.match(/data-currency="([A-Z]{3})"/i) ||
    homepageHtml.match(/Shopify\.currency\.active\s*=\s*"([A-Z]{3})"/i);
  if (currencyMeta) {
    storeIntelligence.currency = currencyMeta[1].toUpperCase();
  } else {
    for (const cp of CURRENCY_PATTERNS) {
      if (homepageHtml.includes(cp.symbols[0]) || homepageHtml.includes(cp.code)) {
        storeIntelligence.currency = cp.code; break;
      }
    }
  }

  const langAttr = $("html").attr("lang");
  if (langAttr) storeIntelligence.language = langAttr;

  const jurisdictionMatch = homepageHtml.match(/Shopify\.shop\s*=\s*"([^"]+)"/i) || homepageHtml.match(/"countryCode"\s*:\s*"([^"]+)"/i);
  if (jurisdictionMatch) storeIntelligence.jurisdiction = jurisdictionMatch[1];

  const tzMatch = homepageHtml.match(/"timezone"\s*:\s*"([^"]+)"/i) || homepageHtml.match(/Shopify\.timezone\s*=\s*"([^"]+)"/i);
  if (tzMatch) storeIntelligence.timezone = tzMatch[1];

  const themeMatch = homepageHtml.match(/Shopify\.theme\s*=\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i) || homepageHtml.match(/theme_name["']\s*:\s*["']([^"']+)/i);
  if (themeMatch) storeIntelligence.theme = themeMatch[1];

  // Domain age via RDAP
  try {
    const rdapRes = await fetch(`https://rdap.org/domain/${storeDomain}`, {
      headers: { Accept: "application/rdap+json" },
      signal: AbortSignal.timeout(10000),
    });
    if (rdapRes.ok) {
      const rdapData = await rdapRes.json();
      const regEvent = (rdapData.events || []).find((e: { eventAction: string }) => e.eventAction === "registration");
      if (regEvent?.eventDate) {
        const createdDate = new Date(regEvent.eventDate);
        storeIntelligence.domainCreatedDate = createdDate.toISOString().split("T")[0];
        const ageDays = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        storeIntelligence.domainAge = ageDays >= 365 ? `${Math.floor(ageDays / 365)} year${Math.floor(ageDays / 365) > 1 ? "s" : ""}` : `${ageDays} days`;
        checks.push({
          id: "domain_age", category: "Domain", name: "Domain Age (12+ Days)",
          status: ageDays >= 12 ? "pass" : "fail",
          description: ageDays >= 12
            ? `Domain registered ${storeIntelligence.domainAge} ago (${storeIntelligence.domainCreatedDate}). Meets the 12-day minimum.`
            : `Domain is only ${ageDays} day(s) old. Requires 12+ days for GMC.`,
          fix: ageDays < 12 ? `Wait ${12 - ageDays} more day(s) before submitting to Google Merchant Center.` : undefined,
        });
      }
    }
  } catch {
    checks.push({ id: "domain_age", category: "Domain", name: "Domain Age (12+ Days)", status: "info", description: "Could not determine domain age — RDAP lookup failed." });
  }

  // ────────────────────────────────────────────────────────────────────────
  // 11. Footer Requirements — uses broad selector to find footer content
  // ────────────────────────────────────────────────────────────────────────
  const footerHtml = getFooterHtml($);
  const footerEmails = extractEmails(footerHtml);
  const footerPhones = extractPhonesFromString(footerHtml);
  const footerHasAddress = hasAddress(footerHtml);

  const footerText = getVisibleText(footerHtml);

  checks.push({
    id: "footer_email", category: "Footer Requirements", name: "Email in Footer",
    status: footerEmails.length > 0 ? "pass" : "fail",
    description: footerEmails.length > 0 ? `Email found in footer: ${footerEmails[0]}` : "No email address found in the footer.",
    fix: footerEmails.length === 0 ? "Add your business email address to your site footer." : undefined,
  });

  checks.push({
    id: "footer_phone", category: "Footer Requirements", name: "Phone in Footer",
    status: footerPhones.length > 0 ? "pass" : "fail",
    description: footerPhones.length > 0 ? `Phone number found in footer: ${footerPhones[0]}` : "No phone number found in the footer.",
    fix: footerPhones.length === 0 ? "Add your business phone number to your site footer." : undefined,
  });

  checks.push({
    id: "footer_address", category: "Footer Requirements", name: "Physical Address in Footer",
    status: footerHasAddress ? "pass" : "fail",
    description: footerHasAddress ? "A physical address was found in the footer." : "No physical address found in the footer.",
    fix: !footerHasAddress ? "Add your business address to your footer (e.g., 123 Main Street, City, State, 12345, Country)." : undefined,
  });

  const hoursRegex = /(?:customer\s+service\s+hours|hours\s*of\s*operation|hours|support hours|business hours|opening hours|service\s+hours|open\s+\d|mon(?:day)?[\s\-–]+(?:fri|sat|sun)|(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)))/i;
  checks.push({
    id: "footer_hours", category: "Footer Requirements", name: "Support Hours in Footer",
    status: hoursRegex.test(footerText) ? "pass" : "fail",
    description: hoursRegex.test(footerText) ? "Support/business hours found in the footer." : "No support hours found in the footer.",
    fix: !hoursRegex.test(footerText) ? "Add your Customer Service Hours to the footer (e.g., Mon-Fri 9am-5pm EST)." : undefined,
  });

  const contactWindowRegex = /(?:get\s+back\s+to\s+you|(?:we(?:'ll|\s+will)\s+)?(?:reply|respond|email\s+(?:you\s+)?back|contact\s+you|reach\s+out)|(?:you(?:'ll|\s+will)\s+)?hear\s+(?:back\s+)?from\s+us|response?\s+(?:time|within)|expect\s+a?\s*(?:response|reply)\s+(?:in|within)|allow\s+up\s+to|aim\s+to\s+(?:reply|respond|get\s+back)|(?:within|in)\s+\d+\s*(?:hour|hr|day|minute|min|business\s+day))\s*.*?\d+\s*(?:hour|hr|day|minute|min|business\s+day)/i;
  checks.push({
    id: "footer_contact_window", category: "Footer Requirements", name: "Contact Response Window in Footer",
    status: contactWindowRegex.test(footerText) ? "pass" : "fail",
    description: contactWindowRegex.test(footerText)
      ? "A contact response window was found in the footer."
      : "No contact response window found in the footer.",
    fix: !contactWindowRegex.test(footerText)
      ? 'Add a response time commitment to your footer (e.g., "We will get back to you within 24 hours").'
      : undefined,
  });

  // ────────────────────────────────────────────────────────────────────────
  // 11b. Contact Page Content Checks
  // ────────────────────────────────────────────────────────────────────────
  if (contactPageHtml) {
    const contactText = getVisibleText(contactPageHtml);
    const contactEmails = extractEmails(contactPageHtml);
    const contactPhones = extractPhonesFromHtml(contactPageHtml);
    const contactHasAddr = hasAddress(contactPageHtml);

    checks.push({
      id: "contact_email", category: "Contact Page", name: "Email on Contact Page",
      status: contactEmails.length > 0 ? "pass" : "fail",
      description: contactEmails.length > 0 ? `Email found on contact page: ${contactEmails[0]}` : "No email address found on the contact page.",
      fix: contactEmails.length === 0 ? "Add your business email address to your contact page." : undefined,
    });

    checks.push({
      id: "contact_phone", category: "Contact Page", name: "Phone on Contact Page",
      status: contactPhones.length > 0 ? "pass" : "fail",
      description: contactPhones.length > 0 ? `Phone number found on contact page: ${contactPhones[0]}` : "No phone number found on the contact page.",
      fix: contactPhones.length === 0 ? "Add your business phone number to your contact page." : undefined,
    });

    checks.push({
      id: "contact_address", category: "Contact Page", name: "Address on Contact Page",
      status: contactHasAddr ? "pass" : "fail",
      description: contactHasAddr ? "A physical address was found on the contact page." : "No physical address found on the contact page.",
      fix: !contactHasAddr ? "Add your business address to your contact page." : undefined,
    });

    const hoursInContact = hoursRegex.test(contactText);
    checks.push({
      id: "contact_hours", category: "Contact Page", name: "Support Hours on Contact Page",
      status: hoursInContact ? "pass" : "fail",
      description: hoursInContact ? "Support/business hours found on the contact page." : "No support hours found on the contact page.",
      fix: !hoursInContact ? "Add your Customer Service Hours to the contact page (e.g., Mon-Fri 9am-5pm EST)." : undefined,
    });

    const responseRegex = /(?:get\s+back\s+to\s+you|respond\s+(?:to\s+you\s+)?within|reply\s+within|response\s+time|typically\s+respond|aim\s+to\s+respond|we\s+will\s+respond|expect\s+a\s+(?:response|reply)|(?:within|in)\s+\d+\s*[-–]?\s*\d*\s*(?:hours?|business\s+days?|minutes?))/i;
    checks.push({
      id: "contact_response_time", category: "Contact Page", name: "Response Time Promise",
      status: responseRegex.test(contactText) ? "pass" : "fail",
      description: responseRegex.test(contactText)
        ? "Response time commitment found on the contact page."
        : "No response time promise found (e.g., 'We will get back to you within 24 hours').",
      fix: !responseRegex.test(contactText) ? "Add a response time promise to your contact page (e.g., 'We will get back to you within 24 hours')." : undefined,
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // 12. Policy Page Requirements — contact info in each policy
  // ────────────────────────────────────────────────────────────────────────
  const policyContactChecks: PolicyContactCheck[] = [];
  const policiesToCheck = [
    { name: "Shipping Policy", key: "required:Shipping Policy" },
    { name: "Returns & Refunds Policy", key: "required:Returns & Refunds Policy" },
    { name: "Privacy Policy", key: "required:Privacy Policy" },
    { name: "Terms & Conditions", key: "required:Terms & Conditions" },
  ];

  for (const pol of policiesToCheck) {
    const r = fetchResults[pol.key];
    if (!r || !r.ok) continue;

    const policyEmails = extractEmails(r.html);
    const policyPhones = extractPhonesFromHtml(r.html);
    const policyAddr = hasAddress(r.html);
    const rp = policyPages.find((p) => p.name === pol.name);

    policyContactChecks.push({
      policyName: pol.name,
      policyUrl: rp ? `${url}${rp.path}` : "",
      hasEmail: policyEmails.length > 0,
      hasPhone: policyPhones.length > 0,
      hasAddress: policyAddr,
    });

    const missing: string[] = [];
    if (policyEmails.length === 0) missing.push("email");
    if (policyPhones.length === 0) missing.push("phone");
    if (!policyAddr) missing.push("physical address");

    checks.push({
      id: `policy_contact_${pol.name.toLowerCase().replace(/[^a-z]/g, "_")}`,
      category: "Policy Requirements",
      name: `Contact Info in ${pol.name}`,
      status: missing.length === 0 ? "pass" : "fail",
      description: missing.length === 0
        ? `${pol.name} contains email, phone, and physical address.`
        : `${pol.name} is missing: ${missing.join(", ")}.`,
      fix: missing.length > 0 ? `Add your ${missing.join(", ")} to your ${pol.name} page.` : undefined,
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // 13. Business Address Format
  // ────────────────────────────────────────────────────────────────────────
  const allHtml = homepageHtml + " " + footerHtml + " " +
    Object.values(fetchResults).map((v) => v.html).join(" ");
  const fullAddrFormat = /\d+[^,\n]{2,40},\s*[A-Za-z\s]+,\s*[A-Za-z\s]{2,},\s*[\dA-Za-z\s\-]{3,10},\s*[A-Za-z\s]+/;
  const addrFound = hasAddress(allHtml);
  const addrCorrectFormat = fullAddrFormat.test(allHtml);

  checks.push({
    id: "business_address_format", category: "Contact Info", name: "Business Address Format",
    status: addrCorrectFormat ? "pass" : "fail",
    description: addrCorrectFormat
      ? "A properly formatted business address was found."
      : addrFound
        ? "An address was found but may not be in required format: [Street + Number], [City], [State/Province], [Zipcode], [Country]."
        : "No business address found. GMC requires a correctly formatted physical address.",
    fix: !addrCorrectFormat ? "Add your address: 123 Main Street, City, State, 12345, Country — in footer, contact page, and all policies." : undefined,
  });

  // ────────────────────────────────────────────────────────────────────────
  // 14. Shipping Policy Details
  // ────────────────────────────────────────────────────────────────────────
  let shippingPolicyDetails: ShippingPolicyDetails | null = null;
  if (shippingRes && shippingRes.ok) {
    const shipText = getVisibleText(shippingRes.html);

    shippingPolicyDetails = { found: true, currency: null, cost: null, time: null, countries: null, cutoffTime: null };

    // Currency
    for (const cp of CURRENCY_PATTERNS) {
      for (const sym of cp.symbols) {
        if (shipText.includes(sym)) { shippingPolicyDetails.currency = cp.code; break; }
      }
      if (shippingPolicyDetails.currency) break;
    }

    // Cost
    const costMatch = shipText.match(/free\s+shipping/i) ||
      shipText.match(/([\$€£¥₹]\s*[\d,.]+)\s*(?:flat\s*rate|shipping|delivery)/i) ||
      shipText.match(/(?:shipping|delivery)\s*(?:cost|fee|rate|charge)s?\s*(?:is|are|of|:)?\s*([\$€£¥₹]?\s*[\d,.]+)/i) ||
      shipText.match(/(?:flat\s*rate|standard)\s*(?:shipping)?\s*(?:of|:)?\s*([\$€£¥₹]\s*[\d,.]+)/i) ||
      shipText.match(/(?:[\$€£¥₹]\s*[\d,.]+)\s*(?:for\s+)?(?:standard|express|priority|overnight)\s+(?:shipping|delivery)/i);
    if (costMatch) shippingPolicyDetails.cost = costMatch[0].trim().substring(0, 100);

    // Time
    const timeMatch = shipText.match(/(\d+\s*[-–to]+\s*\d+\s*(?:business\s+)?(?:days?|weeks?|working\s+days?))/i) ||
      shipText.match(/((?:within|approximately|about|up\s+to|typically|usually|estimated)\s+\d+\s*[-–]?\s*\d*\s*(?:business\s+)?(?:days?|weeks?))/i) ||
      shipText.match(/(\d+\s*(?:business\s+)?(?:days?|weeks?))\s*(?:delivery|shipping|transit|processing|turnaround)/i) ||
      shipText.match(/(?:delivery|shipping|transit|processing|handling)\s*(?:time|period|estimate)?\s*(?:is|are|of|:)?\s*(\d+\s*[-–to]*\s*\d*\s*(?:business\s+)?(?:days?|weeks?))/i) ||
      shipText.match(/(?:arrive|delivered|receive)\s*(?:within|in)\s*(\d+\s*[-–to]*\s*\d*\s*(?:business\s+)?(?:days?|weeks?))/i);
    if (timeMatch) shippingPolicyDetails.time = timeMatch[0].trim().substring(0, 100);

    // Countries
    const countriesMatch = shipText.match(/(?:ship(?:ping)?|deliver(?:y)?)\s*(?:to|within|available\s+in|across)\s*:?\s*([^.]{5,100})/i) ||
      shipText.match(/(?:we\s+(?:ship|deliver)\s+(?:to|within|across))\s*([^.]{5,100})/i) ||
      shipText.match(/(?:applicable|applies)\s+to\s+(?:all\s+)?orders\s+shipped\s+(?:within|to)\s+(?:the\s+)?([^.]{5,100})/i) ||
      shipText.match(/orders\s+shipped\s+(?:within|to)\s+(?:the\s+)?(United States|USA|US|Canada|UK|worldwide|internationally)[^.]*/i) ||
      shipText.match(/(?:available|shipping)\s+(?:in|to)\s+(?:the\s+)?(United States|USA|US|Canada|UK|worldwide|internationally|all\s+\d+\s+states)[^.]*/i) ||
      shipText.match(/(?:shipping\s+(?:policy|locations?))\s+[\s\S]{0,40}?(?:within|to)\s+(?:the\s+)?(United States|USA|US|Canada|UK|worldwide|internationally)[^.]*/i) ||
      shipText.match(/(?:currently\s+)?(?:ship|deliver|available)\s+(?:only\s+)?(?:to|in|within)\s+(?:the\s+)?([A-Z][^.]{3,80})/);
    if (countriesMatch) shippingPolicyDetails.countries = countriesMatch[0].trim().substring(0, 200);

    // Cutoff
    const cutoffMatch = shipText.match(/(?:order(?:s)?\s+(?:placed\s+)?(?:before|by)\s+)([\d:]+\s*(?:am|pm)\s*(?:[A-Z]{2,4})?)/i) ||
      shipText.match(/(?:cutoff|cut-off|cut\s+off)\s*(?:time)?\s*(?:is|:)?\s*([\d:]+\s*(?:am|pm)\s*(?:[A-Z]{2,4})?)/i);
    if (cutoffMatch) shippingPolicyDetails.cutoffTime = cutoffMatch[0].trim().substring(0, 100);

    for (const sc of [
      { key: "cost", label: "Shipping Cost", value: shippingPolicyDetails.cost },
      { key: "time", label: "Shipping Time", value: shippingPolicyDetails.time },
      { key: "countries", label: "Shipping Countries", value: shippingPolicyDetails.countries },
    ]) {
      checks.push({
        id: `shipping_${sc.key}`, category: "Shipping Policy", name: sc.label,
        status: sc.value ? "pass" : "fail",
        description: sc.value ? `Detected: ${sc.value}` : `Could not detect ${sc.label.toLowerCase()} in your shipping policy.`,
        fix: !sc.value ? `Add clear ${sc.label.toLowerCase()} info to /policies/shipping-policy.` : undefined,
      });
    }
    if (shippingPolicyDetails.currency) {
      checks.push({ id: "shipping_currency", category: "Shipping Policy", name: "Shipping Currency", status: "pass", description: `Shipping prices shown in ${shippingPolicyDetails.currency}.` });
    }
  } else {
    checks.push({
      id: "shipping_policy_page", category: "Shipping Policy", name: "Shipping Policy Page",
      status: "fail", description: "Shipping policy page not found.",
      fix: "Create a shipping policy in Shopify: Settings > Policies > Shipping policy.",
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // 15. Refund Policy Details — very broad regex patterns
  // ────────────────────────────────────────────────────────────────────────
  let refundPolicyDetails: RefundPolicyDetails | null = null;
  if (refundRes && refundRes.ok) {
    const refundText = getVisibleText(refundRes.html);

    refundPolicyDetails = { found: true, returnWindow: null, returnShipping: null, processingTime: null, exchangesAllowed: null, restockingFees: null };

    // Return window — ultra-broad
    const windowMatch =
      refundText.match(/(\d+)\s*[-–]?\s*(?:day|calendar\s+day|business\s+day)s?\s*(?:return|refund|exchange|money[\s-]?back)/i) ||
      refundText.match(/(?:return|refund|exchange|money[\s-]?back)\s*(?:within|period|window|policy)[\s:]*(?:of\s*|is\s*)?(\d+)\s*(?:[-–]?\s*\d*\s*)?(?:calendar\s+|business\s+)?days?/i) ||
      refundText.match(/(?:have|within|allow(?:ed)?|offer|provide|grant|accept)\s+(\d+)\s*(?:calendar\s+|business\s+)?days?\s+(?:to|for|from|of|after)\s+\w+/i) ||
      refundText.match(/(\d+)\s*[-–]?\s*day\s*(?:return|refund|money[\s-]?back)\s*(?:policy|guarantee|period|window)/i) ||
      refundText.match(/(?:return|refund|send\s+back)\s+(?:your\s+)?(?:item|product|order|purchase|the)s?\s+(?:within|up\s+to|in)\s+(\d+)\s*days?/i) ||
      refundText.match(/(\d+)\s*days?\s*(?:from|after|of|following)\s*(?:the\s*)?(?:date\s*(?:of\s*)?)?(?:purchase|delivery|receipt|arrival|shipment|receiving)/i) ||
      refundText.match(/(?:eligible|qualify|accepted?)\s+(?:for\s+(?:a\s+)?)?(?:return|refund)[\s\S]{0,40}?(\d+)\s*days?/i) ||
      refundText.match(/(\d+)\s*days?\s*(?:return|refund)\s*/i);
    if (windowMatch) refundPolicyDetails.returnWindow = windowMatch[0].trim().substring(0, 120);

    // Return shipping — ultra-broad
    const returnShipMatch =
      refundText.match(/(?:return\s+shipping|shipping\s+(?:for\s+)?(?:the\s+)?return)[\s\S]{0,100}?(?:customer|buyer|seller|we|us|free|prepaid|label|responsible|paid|cost|your\s+expense|at\s+your)/i) ||
      refundText.match(/(?:customer|buyer|you)\s+(?:is|are|will\s+be)\s+responsible\s+for\s+(?:the\s+)?(?:return\s+)?(?:shipping|postage)/i) ||
      refundText.match(/(?:responsible\s+for\s+(?:the\s+)?(?:cost\s+of\s+)?(?:return\s+)?shipping)/i) ||
      refundText.match(/(?:return\s+shipping\s+(?:cost|fee|charge)s?\s+(?:is|are|will\s+be))\s+/i) ||
      refundText.match(/(?:free|prepaid|pre-paid)\s+return\s*(?:shipping|label|postage)/i) ||
      refundText.match(/(?:we|seller)\s+(?:will|shall)\s+(?:pay|cover|provide)\s+(?:the\s+)?(?:return\s+)?(?:shipping|postage)/i) ||
      refundText.match(/(?:shipping\s+cost|return\s+cost)[\s\S]{0,50}?(?:responsible|customer|buyer|you|your|free|paid|our)/i);
    if (returnShipMatch) refundPolicyDetails.returnShipping = returnShipMatch[0].trim().substring(0, 150);

    // Processing time — ultra-broad
    const procMatch =
      refundText.match(/(?:refund|credit|reimburs(?:e|ement)|payment)[\s\S]{0,80}?(\d+\s*[-–to]*\s*\d*\s*(?:business\s+)?(?:days?|weeks?))/i) ||
      refundText.match(/(\d+\s*[-–to]+\s*\d+\s*(?:business\s+)?(?:days?|weeks?))\s*(?:to\s+)?(?:process|receive|issue|complete|appear)\s*(?:the\s+)?(?:refund|credit)/i) ||
      refundText.match(/(?:process(?:ed|ing)?|issued?|receive|applied?|appear|reflect)\s+(?:(?:your|the|a)\s+)?(?:refund|credit)\s+(?:within|in)\s+(\d+\s*[-–to]*\s*\d*\s*(?:business\s+)?(?:days?|weeks?))/i) ||
      refundText.match(/(?:refund|credit)\s+(?:will\s+(?:be\s+)?)?(?:process(?:ed)?|appear|show|reflect|applied?)\s+(?:within|in)\s+(\d+[\s\S]{0,20}?(?:days?|weeks?))/i) ||
      refundText.match(/(?:within|in)\s+(\d+\s*[-–to]*\s*\d*\s*(?:business\s+)?(?:days?|weeks?))\s*(?:of\s+)?(?:receiving|approval|inspection)/i);
    if (procMatch) refundPolicyDetails.processingTime = procMatch[0].trim().substring(0, 150);

    // Exchanges — ultra-broad
    const exchangeMatch =
      refundText.match(/exchange[s]?\s+(?:are\s+)?(?:allowed|accepted|available|offered|not\s+(?:allowed|accepted|available|offered)|only)/i) ||
      refundText.match(/(?:we\s+(?:do|don'?t|cannot|can\s+not|also|only)\s+(?:offer|accept|process|provide)\s+)?exchange[s]?/i) ||
      refundText.match(/(?:no|only)\s+exchange/i) ||
      refundText.match(/exchange\s+(?:for|with|to)\s+(?:a\s+)?(?:different|another|same|equal|new|replacement)/i) ||
      refundText.match(/(?:item|product)s?\s+(?:can|may|cannot)\s+(?:be\s+)?exchange/i) ||
      refundText.match(/exchange[\s\S]{0,30}?(?:defective|damaged|wrong|incorrect|faulty)/i);
    if (exchangeMatch) refundPolicyDetails.exchangesAllowed = exchangeMatch[0].trim().substring(0, 100);

    // Restocking fees — ultra-broad
    const restockMatch =
      refundText.match(/restock(?:ing)?\s+fee[\s\S]{0,80}?(?:\d+%?|no|none|waived|not\s+charge|free|apply|applicable)/i) ||
      refundText.match(/(?:no|none|waived|not?\s+(?:any\s+)?(?:charge)?|\d+%?)\s*restock(?:ing)?\s+fee/i) ||
      refundText.match(/(?:subject\s+to\s+a?\s*)(\d+%?\s*)?restock(?:ing)?\s+fee/i) ||
      refundText.match(/restock/i);
    if (restockMatch) refundPolicyDetails.restockingFees = restockMatch[0].trim().substring(0, 100);

    const refundChecks = [
      {
        key: "returnWindow", label: "Return Window", value: refundPolicyDetails.returnWindow,
        failDesc: "Could not detect how many days customers have to return items.",
        fix: "Add a clear return window to your refund policy, e.g.: 'You have 30 days from the date of delivery to request a return.'",
      },
      {
        key: "returnShipping", label: "Return Shipping Policy", value: refundPolicyDetails.returnShipping,
        failDesc: "Could not detect who pays for return shipping (the customer or your store).",
        fix: "State who is responsible for return shipping costs in your refund policy, e.g.: 'Customers are responsible for return shipping costs' or 'We provide a prepaid return shipping label.'",
      },
      {
        key: "processingTime", label: "Refund Processing Time", value: refundPolicyDetails.processingTime,
        failDesc: "Could not detect how long it takes to process a refund after receiving the returned item.",
        fix: "Add refund processing time to your refund policy, e.g.: 'Refunds are processed within 5-10 business days after we receive your return.'",
      },
      {
        key: "exchangesAllowed", label: "Exchanges Policy", value: refundPolicyDetails.exchangesAllowed,
        failDesc: "Could not detect whether your store allows exchanges.",
        fix: "State whether exchanges are allowed in your refund policy, e.g.: 'We offer exchanges for items of equal value' or 'We do not offer exchanges — please return and reorder.'",
      },
      {
        key: "restockingFees", label: "Restocking Fees", value: refundPolicyDetails.restockingFees,
        failDesc: "Could not detect whether your store charges restocking fees on returns.",
        fix: "State whether restocking fees apply in your refund policy, e.g.: 'No restocking fees apply' or 'A 15% restocking fee may apply to opened items.'",
      },
    ];
    for (const rc of refundChecks) {
      checks.push({
        id: `refund_${rc.key}`, category: "Refund Policy", name: rc.label,
        status: rc.value ? "pass" : "fail",
        description: rc.value ? `Detected: ${rc.value}` : rc.failDesc,
        fix: !rc.value ? rc.fix : undefined,
      });
    }
  } else {
    checks.push({
      id: "refund_policy_page", category: "Refund Policy", name: "Refund Policy Page",
      status: "fail", description: "Refund policy page not found.",
      fix: "Create a refund policy in Shopify: Settings > Policies > Refund policy.",
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // 16. Targeted Copy Detection
  // ────────────────────────────────────────────────────────────────────────
  const targetedCopy: TargetedCopyItem[] = [];
  const pagesToCheckForCopy: { label: string; html: string }[] = [{ label: "Homepage", html: homepageHtml }];
  for (const page of pagesToScanForLinks) {
    if (page.pageType === "Product") pagesToCheckForCopy.push({ label: page.foundOn, html: page.html });
  }

  for (const page of pagesToCheckForCopy) {
    const visibleText = getVisibleText(page.html);
    for (const keyword of TARGETED_KEYWORDS) {
      const regex = new RegExp(`(?:[^\\w]|^)(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?:[^\\w]|$)`, "gi");
      const match = regex.exec(visibleText);
      if (match) {
        const start = Math.max(0, match.index - 40);
        const end = Math.min(visibleText.length, match.index + match[0].length + 40);
        targetedCopy.push({
          keyword,
          context: `...${visibleText.substring(start, end).replace(/\s+/g, " ").trim()}...`,
          foundOn: page.label,
        });
      }
    }
  }

  checks.push({
    id: "targeted_copy", category: "Content Compliance",
    name: targetedCopy.length > 0 ? "Targeted Health/Medical Copy" : "Targeted Copy Check",
    status: targetedCopy.length > 0 ? "fail" : "pass",
    description: targetedCopy.length > 0
      ? `Found ${targetedCopy.length} instance(s) of potentially targeted language that could trigger GMC review.`
      : "No problematic targeted or medical/health claim language was detected.",
    fix: targetedCopy.length > 0 ? "Review flagged copy and remove or soften health claims." : undefined,
  });

  // ────────────────────────────────────────────────────────────────────────
  // 17. SEO & Branding
  // ────────────────────────────────────────────────────────────────────────
  checks.push({
    id: "meta_description", category: "SEO", name: "Meta Description",
    status: (htmlLower.includes('name="description"') || htmlLower.includes("name='description'")) ? "pass" : "fail",
    description: (htmlLower.includes('name="description"') || htmlLower.includes("name='description'")) ? "Meta description found." : "No meta description found.",
    fix: !(htmlLower.includes('name="description"') || htmlLower.includes("name='description'")) ? "Add a meta description in Shopify: Online Store > Preferences." : undefined,
  });

  checks.push({
    id: "mobile_friendly", category: "Accessibility", name: "Mobile-Friendly Meta Tag",
    status: (htmlLower.includes('name="viewport"') || htmlLower.includes("name='viewport'")) ? "pass" : "fail",
    description: (htmlLower.includes('name="viewport"') || htmlLower.includes("name='viewport'")) ? "Viewport meta tag found." : "No viewport meta tag found.",
    fix: !(htmlLower.includes('name="viewport"') || htmlLower.includes("name='viewport'")) ? "Ensure your theme includes a viewport meta tag." : undefined,
  });

  const titleMatch = homepageHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
  const hasTitle = titleMatch && titleMatch[1].trim().length > 0;
  checks.push({
    id: "title_tag", category: "SEO", name: "Page Title",
    status: hasTitle ? "pass" : "fail",
    description: hasTitle ? `Page title: "${titleMatch![1].trim().substring(0, 60)}"` : "No page title found.",
    fix: !hasTitle ? "Add a page title in Shopify: Online Store > Preferences." : undefined,
  });

  const hasFavicon = htmlLower.includes('rel="icon"') || htmlLower.includes("rel='icon'") || htmlLower.includes("shortcut icon") || htmlLower.includes("favicon");
  checks.push({
    id: "favicon", category: "Branding", name: "Favicon",
    status: hasFavicon ? "pass" : "fail",
    description: hasFavicon ? "Favicon detected." : "No favicon detected.",
    fix: !hasFavicon ? "Upload a favicon in Shopify: Themes > Customize > Theme settings > Favicon." : undefined,
  });

  return buildResult(url, checks, {
    storeIntelligence, wrongDomainLinks, emailMismatches, collectionIssues,
    targetedCopy, shippingPolicyDetails, refundPolicyDetails, contactPage404s, policyContactChecks,
  });
}

// ─── Build Result ─────────────────────────────────────────────────────────────

interface ScanExtras {
  storeIntelligence: StoreIntelligence;
  wrongDomainLinks: WrongDomainLink[];
  emailMismatches: EmailMismatch[];
  collectionIssues: CollectionIssue[];
  targetedCopy: TargetedCopyItem[];
  shippingPolicyDetails: ShippingPolicyDetails | null;
  refundPolicyDetails: RefundPolicyDetails | null;
  contactPage404s: ContactPageResult[];
  policyContactChecks: PolicyContactCheck[];
}

function emptyExtras(): ScanExtras {
  return {
    storeIntelligence: { domainAge: null, domainCreatedDate: null, currency: null, jurisdiction: null, language: null, timezone: null, theme: null },
    wrongDomainLinks: [], emailMismatches: [], collectionIssues: [], targetedCopy: [],
    shippingPolicyDetails: null, refundPolicyDetails: null, contactPage404s: [], policyContactChecks: [],
  };
}

function buildResult(url: string, checks: ScanCheck[], extras: ScanExtras): ScanResult {
  const scorable = checks.filter((c) => c.status !== "info");
  const passed = scorable.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const total = scorable.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  return {
    url, scannedAt: new Date().toISOString(), score, checks,
    summary: { passed, failed, warnings: 0 },
    ...extras,
  };
}
