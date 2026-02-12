import * as cheerio from "cheerio";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScanCheck {
  id: string;
  category: string;
  name: string;
  status: "pass" | "fail" | "warning" | "info";
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

export interface ContactPresence {
  email: { found: boolean; inFooter: boolean; inContactPage: boolean; inPolicies: boolean; value?: string };
  phone: { found: boolean; inFooter: boolean; inContactPage: boolean; inPolicies: boolean; value?: string };
  address: { found: boolean; inFooter: boolean; inContactPage: boolean; inPolicies: boolean; value?: string };
  supportHours: { found: boolean; inFooter: boolean; inContactPage: boolean; inPolicies: boolean; value?: string };
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
  contactPresence: ContactPresence;
  targetedCopy: TargetedCopyItem[];
  shippingPolicyDetails: ShippingPolicyDetails | null;
  refundPolicyDetails: RefundPolicyDetails | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  return url.replace(/\/+$/, "");
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function fetchPage(url: string): Promise<{ ok: boolean; status: number; html: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "GMCScout/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    return { ok: res.ok, status: res.status, html };
  } catch {
    return { ok: false, status: 0, html: "" };
  }
}

function extractEmails(html: string): string[] {
  const pattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(pattern) || [];
  // Filter out common false positives
  const filtered = matches.filter(
    (e) =>
      !e.endsWith(".png") &&
      !e.endsWith(".jpg") &&
      !e.endsWith(".svg") &&
      !e.endsWith(".gif") &&
      !e.endsWith(".webp") &&
      !e.includes("sentry") &&
      !e.includes("example.com") &&
      !e.includes("wixpress") &&
      !e.includes("schema.org")
  );
  return [...new Set(filtered)];
}

function extractPhones(html: string): string[] {
  const pattern = /[\+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,}/g;
  const matches = html.match(pattern) || [];
  return [...new Set(matches.map((p) => p.trim()).filter((p) => p.length >= 7 && p.length <= 20))];
}

function extractTextContent($: cheerio.CheerioAPI, selector?: string): string {
  if (selector) {
    return $(selector).text().replace(/\s+/g, " ").trim();
  }
  return $("body").text().replace(/\s+/g, " ").trim();
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

// ─── ADDRESS PATTERN ─────────────────────────────────────────────────────────

const ADDRESS_PATTERN = /\d+\s+[\w\s]+(?:st|street|ave|avenue|blvd|boulevard|dr|drive|rd|road|ln|lane|way|ct|court|pl|place|cir|circle)\b[^<]{0,120}(?:\d{4,6})/i;
const ADDRESS_FORMAT_FULL = /\d+[^,\n]{2,40},\s*[A-Za-z\s]+,\s*[A-Za-z\s]{2,},\s*[\dA-Za-z\s\-]{3,10},\s*[A-Za-z\s]+/;

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
      headers: { "User-Agent": "GMCScout/1.0" },
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

  // ── Fetch additional pages in parallel ─────────────────────────────────
  const contactPaths = ["/contact", "/pages/contact-us", "/pages/get-in-touch", "/contact-us", "/get-in-touch", "/getintouch", "/pages/contact"];
  const requiredPages = [
    { path: "/policies/terms-of-service", name: "Terms & Conditions", patterns: ["terms of service", "terms-of-service", "terms and conditions", "terms-and-conditions", "/policies/terms"] },
    { path: "/policies/privacy-policy", name: "Privacy Policy", patterns: ["privacy policy", "privacy-policy", "/policies/privacy"] },
    { path: "/policies/shipping-policy", name: "Shipping Policy", patterns: ["shipping policy", "shipping-policy", "/policies/shipping", "delivery policy"] },
    { path: "/policies/refund-policy", name: "Returns & Refunds Policy", patterns: ["refund policy", "refund-policy", "return policy", "returns policy", "return-policy", "/policies/refund"] },
    { path: "/pages/billing-terms", name: "Billing Terms & Conditions", patterns: ["billing terms", "billing-terms", "billing policy"] },
    { path: "/pages/faq", name: "FAQ", patterns: ["/pages/faq", "/faq", "frequently asked", "help center"] },
    { path: "/pages/track-order", name: "Track Order", patterns: ["/pages/track-order", "/track-order", "/pages/order-tracking", "track your order", "order tracking", "track order"] },
  ];

  // Build list of all pages to fetch
  const pagesToFetch: { label: string; url: string }[] = [];
  for (const cp of contactPaths) {
    pagesToFetch.push({ label: `contact:${cp}`, url: `${url}${cp}` });
  }
  for (const rp of requiredPages) {
    pagesToFetch.push({ label: `required:${rp.name}`, url: `${url}${rp.path}` });
  }
  // Also fetch some specific pages for additional detection
  pagesToFetch.push({ label: "shipping_policy", url: `${url}/policies/shipping-policy` });
  pagesToFetch.push({ label: "refund_policy", url: `${url}/policies/refund-policy` });
  pagesToFetch.push({ label: "collections_json", url: `${url}/collections.json` });
  pagesToFetch.push({ label: "meta_json", url: `${url}/meta.json` });

  // Fetch all in parallel
  const fetchResults: Record<string, { ok: boolean; status: number; html: string }> = {};
  const fetchPromises = pagesToFetch.map(async (p) => {
    const result = await fetchPage(p.url);
    fetchResults[p.label] = result;
  });
  await Promise.all(fetchPromises);

  // ── 4. Contact Page 404 Checks ─────────────────────────────────────────
  let anyContactPageFound = false;
  const contactPageResults: { path: string; status: number; ok: boolean }[] = [];
  for (const cp of contactPaths) {
    const key = `contact:${cp}`;
    const r = fetchResults[key];
    if (r) {
      contactPageResults.push({ path: cp, status: r.status, ok: r.ok });
      if (r.ok && !r.html.toLowerCase().includes("page not found") && !r.html.toLowerCase().includes("404")) {
        anyContactPageFound = true;
      }
    }
  }

  checks.push({
    id: "contact_page_exists",
    category: "Contact Info",
    name: "Contact Page Accessibility",
    status: anyContactPageFound ? "pass" : "fail",
    description: anyContactPageFound
      ? "A working contact page was found on your store."
      : `No working contact page found. Checked: ${contactPaths.join(", ")} — all returned 404 or page not found.`,
    fix: !anyContactPageFound
      ? "Create a contact page at /pages/contact-us and ensure it's linked in your navigation and footer."
      : undefined,
  });

  // ── 5. Required Pages Check ────────────────────────────────────────────
  for (const rp of requiredPages) {
    const key = `required:${rp.name}`;
    const r = fetchResults[key];
    const pageOk = r && r.ok && !r.html.toLowerCase().includes("page not found");
    const linkedInHomepage = rp.patterns.some((p) => htmlLower.includes(p));

    let status: ScanCheck["status"] = "fail";
    let desc = "";
    if (pageOk && linkedInHomepage) {
      status = "pass";
      desc = `${rp.name} page exists and is linked from your homepage.`;
    } else if (pageOk && !linkedInHomepage) {
      status = "warning";
      desc = `${rp.name} page exists at ${rp.path} but was not found linked from your homepage/footer.`;
    } else if (!pageOk && linkedInHomepage) {
      status = "warning";
      desc = `A link to ${rp.name} was found on your homepage, but the page at ${rp.path} returned an error.`;
    } else {
      desc = `No ${rp.name} page found. Google Merchant Center requires this page.`;
    }

    checks.push({
      id: `required_page_${rp.name.toLowerCase().replace(/[^a-z]/g, "_")}`,
      category: "Required Pages",
      name: rp.name,
      status,
      description: desc,
      fix: status !== "pass"
        ? `Create a ${rp.name} page and link it in your footer navigation. In Shopify, go to Settings > Policies or create a custom page.`
        : undefined,
    });
  }

  // ── 6. Wrong Domain Links ──────────────────────────────────────────────
  const wrongDomainLinks: WrongDomainLink[] = [];
  const allowedDomains = [
    storeDomain,
    "shopify.com", "myshopify.com", "cdn.shopify.com", "shopifycdn.com",
    "google.com", "googleapis.com", "gstatic.com",
    "facebook.com", "fb.com", "instagram.com", "twitter.com", "x.com",
    "youtube.com", "tiktok.com", "pinterest.com", "linkedin.com",
    "apple.com", "apps.apple.com", "play.google.com",
    "paypal.com", "stripe.com", "klarna.com", "afterpay.com",
    "trustpilot.com", "judge.me", "loox.io", "stamped.io",
    "klaviyo.com", "mailchimp.com",
    "w3.org", "schema.org", "gravatar.com",
  ];

  const pagesToScanForLinks: { html: string; pageType: string; foundOn: string }[] = [
    { html: homepageHtml, pageType: "Homepage", foundOn: url },
  ];
  // Also scan a few product pages if we can find them
  const productLinks: string[] = [];
  $('a[href*="/products/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href && !href.includes("collections") && productLinks.length < 3) {
      const fullUrl = href.startsWith("http") ? href : `${url}${href.startsWith("/") ? "" : "/"}${href}`;
      productLinks.push(fullUrl);
    }
  });

  // Fetch up to 3 product pages for scanning
  const productPagePromises = productLinks.slice(0, 3).map(async (pUrl) => {
    const r = await fetchPage(pUrl);
    if (r.ok) {
      pagesToScanForLinks.push({ html: r.html, pageType: "Product", foundOn: pUrl });
    }
  });
  await Promise.all(productPagePromises);

  for (const page of pagesToScanForLinks) {
    const $page = cheerio.load(page.html);
    $page("a[href]").each((_, el) => {
      const href = $page(el).attr("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:") || href.startsWith("/") || href.startsWith("?")) {
        return;
      }
      try {
        const linkDomain = getDomain(href);
        if (!linkDomain) return;
        const isAllowed = allowedDomains.some(
          (d) => linkDomain === d || linkDomain.endsWith(`.${d}`)
        );
        if (!isAllowed && linkDomain !== storeDomain && !linkDomain.endsWith(`.${storeDomain}`)) {
          wrongDomainLinks.push({
            wrongDomain: linkDomain,
            fullUrl: href,
            linkText: $page(el).text().trim().substring(0, 100) || "(no text)",
            pageType: page.pageType,
            foundOn: page.foundOn,
          });
        }
      } catch {
        // skip invalid URLs
      }
    });
  }

  if (wrongDomainLinks.length > 0) {
    checks.push({
      id: "wrong_domain_links",
      category: "Link Integrity",
      name: "Wrong Domain Links",
      status: "fail",
      description: `Found ${wrongDomainLinks.length} link(s) pointing to external/wrong domains. These may indicate template leftovers or incorrect links.`,
      fix: "Review each flagged link and either remove it or update it to point to your own domain.",
    });
  } else {
    checks.push({
      id: "wrong_domain_links",
      category: "Link Integrity",
      name: "Wrong Domain Links",
      status: "pass",
      description: "No wrong-domain links were detected on your site.",
    });
  }

  // ── 7. Email Domain Mismatch ───────────────────────────────────────────
  const emailMismatches: EmailMismatch[] = [];
  const allEmailsByPage: Record<string, string[]> = {};

  // Collect emails from homepage
  const homepageEmails = extractEmails(homepageHtml);
  if (homepageEmails.length > 0) allEmailsByPage["Homepage"] = homepageEmails;

  // Collect emails from contact pages
  for (const cp of contactPaths) {
    const key = `contact:${cp}`;
    const r = fetchResults[key];
    if (r && r.ok) {
      const emails = extractEmails(r.html);
      if (emails.length > 0) allEmailsByPage[cp] = emails;
    }
  }

  // Aggregate and check domain mismatch
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

  if (emailMismatches.length > 0) {
    checks.push({
      id: "email_domain_mismatch",
      category: "Contact Info",
      name: "Email Domain Mismatch",
      status: "fail",
      description: `Found ${emailMismatches.length} email(s) with domains that don't match your store domain (${storeDomain}).`,
      fix: "Use email addresses that match your store domain (e.g., support@" + storeDomain + ") to avoid GMC rejections.",
    });
  } else {
    checks.push({
      id: "email_domain_mismatch",
      category: "Contact Info",
      name: "Email Domain Match",
      status: Object.keys(emailPageMap).length > 0 ? "pass" : "warning",
      description: Object.keys(emailPageMap).length > 0
        ? "All email addresses found match your store domain."
        : "No email addresses were found to check.",
    });
  }

  // ── 8. Collection Checks (Shopify API) ─────────────────────────────────
  const collectionIssues: CollectionIssue[] = [];
  const collectionsRes = fetchResults["collections_json"];
  let collectionsData: { collections?: { handle: string; title: string; products_count?: number }[] } | null = null;

  if (collectionsRes && collectionsRes.ok) {
    try {
      collectionsData = JSON.parse(collectionsRes.html);
    } catch {
      collectionsData = null;
    }
  }

  if (collectionsData?.collections) {
    for (const col of collectionsData.collections) {
      // Fetch individual collection to get actual product count
      let activeProducts = col.products_count ?? 0;
      try {
        const colRes = await fetchPage(`${url}/collections/${col.handle}/products.json?limit=250`);
        if (colRes.ok) {
          const colData = JSON.parse(colRes.html);
          activeProducts = colData.products?.length ?? 0;
        }
      } catch {
        // Use products_count from the listing
      }

      if (activeProducts === 0) {
        collectionIssues.push({
          name: col.title,
          url: `${url}/collections/${col.handle}`,
          activeProducts: 0,
          empty: true,
        });
      } else if (activeProducts < 5) {
        collectionIssues.push({
          name: col.title,
          url: `${url}/collections/${col.handle}`,
          activeProducts,
          empty: false,
        });
      }
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
      description: `Found ${emptyCollections.length} collection(s) with 0 active products. Empty collections can cause GMC disapprovals.`,
      fix: "Add products to empty collections or remove/hide them from your store navigation.",
    });
  }

  if (lowProductCollections.length > 0) {
    checks.push({
      id: "low_product_collections",
      category: "Collections",
      name: "Collections With < 5 Products",
      status: "warning",
      description: `Found ${lowProductCollections.length} collection(s) with fewer than 5 active products. Google recommends at least 5 products per collection.`,
      fix: "Add more products to these collections or consolidate them into larger collections.",
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

  // ── 9. Store Intelligence Extraction ───────────────────────────────────
  const storeIntelligence: StoreIntelligence = {
    domainAge: null,
    domainCreatedDate: null,
    currency: null,
    jurisdiction: null,
    language: null,
    timezone: null,
    theme: null,
  };

  // Currency detection
  const currencyPatterns = [
    { code: "USD", symbols: ["$", "USD", "US$"] },
    { code: "EUR", symbols: ["€", "EUR"] },
    { code: "GBP", symbols: ["£", "GBP"] },
    { code: "CAD", symbols: ["CAD", "CA$", "C$"] },
    { code: "AUD", symbols: ["AUD", "AU$", "A$"] },
    { code: "JPY", symbols: ["¥", "JPY"] },
    { code: "INR", symbols: ["₹", "INR"] },
  ];

  // Check meta tags and JSON-LD for currency
  const currencyMeta = homepageHtml.match(/"priceCurrency"\s*:\s*"([A-Z]{3})"/i) ||
    homepageHtml.match(/"currency"\s*:\s*"([A-Z]{3})"/i) ||
    homepageHtml.match(/data-currency="([A-Z]{3})"/i) ||
    homepageHtml.match(/Shopify\.currency\.active\s*=\s*"([A-Z]{3})"/i);
  if (currencyMeta) {
    storeIntelligence.currency = currencyMeta[1].toUpperCase();
  } else {
    for (const cp of currencyPatterns) {
      if (homepageHtml.includes(cp.symbols[0]) || homepageHtml.includes(cp.code)) {
        storeIntelligence.currency = cp.code;
        break;
      }
    }
  }

  // Language detection
  const langAttr = $("html").attr("lang");
  if (langAttr) storeIntelligence.language = langAttr;

  // Jurisdiction / locale from Shopify
  const jurisdictionMatch = homepageHtml.match(/Shopify\.shop\s*=\s*"([^"]+)"/i) ||
    homepageHtml.match(/"country"\s*:\s*"([^"]+)"/i) ||
    homepageHtml.match(/"countryCode"\s*:\s*"([^"]+)"/i);
  if (jurisdictionMatch) storeIntelligence.jurisdiction = jurisdictionMatch[1];

  // Timezone from Shopify
  const tzMatch = homepageHtml.match(/"timezone"\s*:\s*"([^"]+)"/i) ||
    homepageHtml.match(/Shopify\.timezone\s*=\s*"([^"]+)"/i);
  if (tzMatch) storeIntelligence.timezone = tzMatch[1];

  // Theme detection
  const themeMatch = homepageHtml.match(/Shopify\.theme\s*=\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i) ||
    homepageHtml.match(/theme_name["']\s*:\s*["']([^"']+)/i);
  if (themeMatch) storeIntelligence.theme = themeMatch[1];
  // Also check for common theme identifiers
  if (!storeIntelligence.theme) {
    const themeStylesheet = $('link[href*="theme."]').attr("href");
    if (themeStylesheet) {
      const themeNameFromUrl = themeStylesheet.match(/themes\/([^/]+)/);
      if (themeNameFromUrl) storeIntelligence.theme = themeNameFromUrl[1];
    }
  }

  // Domain age via RDAP (free, no API key needed)
  try {
    const rdapRes = await fetch(`https://rdap.org/domain/${storeDomain}`, {
      headers: { Accept: "application/rdap+json" },
      signal: AbortSignal.timeout(10000),
    });
    if (rdapRes.ok) {
      const rdapData = await rdapRes.json();
      const events = rdapData.events || [];
      const regEvent = events.find((e: { eventAction: string }) => e.eventAction === "registration");
      if (regEvent?.eventDate) {
        const createdDate = new Date(regEvent.eventDate);
        storeIntelligence.domainCreatedDate = createdDate.toISOString().split("T")[0];
        const ageMs = Date.now() - createdDate.getTime();
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
        if (ageDays >= 365) {
          const years = Math.floor(ageDays / 365);
          storeIntelligence.domainAge = `${years} year${years > 1 ? "s" : ""}`;
        } else {
          storeIntelligence.domainAge = `${ageDays} days`;
        }

        // Domain age check (12+ days before GMC creation)
        checks.push({
          id: "domain_age",
          category: "Domain",
          name: "Domain Age (12+ Days)",
          status: ageDays >= 12 ? "pass" : "fail",
          description: ageDays >= 12
            ? `Domain was registered ${storeIntelligence.domainAge} ago (${storeIntelligence.domainCreatedDate}). Meets the 12-day minimum.`
            : `Domain is only ${ageDays} day(s) old (registered ${storeIntelligence.domainCreatedDate}). Google requires at least 12 days before GMC creation.`,
          fix: ageDays < 12
            ? `Wait ${12 - ageDays} more day(s) before submitting to Google Merchant Center.`
            : undefined,
        });
      }
    }
  } catch {
    // RDAP lookup failed — skip silently
    checks.push({
      id: "domain_age",
      category: "Domain",
      name: "Domain Age (12+ Days)",
      status: "info",
      description: "Could not determine domain age — RDAP lookup did not return data for this domain.",
    });
  }

  // ── 10. Contact Information Presence Check ─────────────────────────────
  const contactPresence: ContactPresence = {
    email: { found: false, inFooter: false, inContactPage: false, inPolicies: false },
    phone: { found: false, inFooter: false, inContactPage: false, inPolicies: false },
    address: { found: false, inFooter: false, inContactPage: false, inPolicies: false },
    supportHours: { found: false, inFooter: false, inContactPage: false, inPolicies: false },
  };

  // Helper to check presence in HTML
  const checkContactIn = (html: string, location: "inFooter" | "inContactPage" | "inPolicies") => {
    const emails = extractEmails(html);
    if (emails.length > 0) {
      contactPresence.email.found = true;
      contactPresence.email[location] = true;
      if (!contactPresence.email.value) contactPresence.email.value = emails[0];
    }
    const phones = extractPhones(html);
    if (phones.length > 0) {
      contactPresence.phone.found = true;
      contactPresence.phone[location] = true;
      if (!contactPresence.phone.value) contactPresence.phone.value = phones[0];
    }
    if (ADDRESS_PATTERN.test(html)) {
      contactPresence.address.found = true;
      contactPresence.address[location] = true;
      const addrMatch = html.match(ADDRESS_PATTERN);
      if (addrMatch && !contactPresence.address.value) contactPresence.address.value = addrMatch[0].trim().substring(0, 200);
    }
    const hoursPatterns = /(?:hours|support hours|business hours|opening hours|open\s+\d|mon(?:day)?[\s\-–]+(?:fri|sat|sun)|(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)))/i;
    if (hoursPatterns.test(html)) {
      contactPresence.supportHours.found = true;
      contactPresence.supportHours[location] = true;
    }
  };

  // Check footer (last 30% of homepage HTML roughly, or look for <footer>)
  const footerHtml = $("footer").html() || "";
  checkContactIn(footerHtml, "inFooter");

  // Check contact pages
  for (const cp of contactPaths) {
    const key = `contact:${cp}`;
    const r = fetchResults[key];
    if (r && r.ok) {
      checkContactIn(r.html, "inContactPage");
    }
  }

  // Check policy pages
  for (const rp of requiredPages) {
    const key = `required:${rp.name}`;
    const r = fetchResults[key];
    if (r && r.ok) {
      checkContactIn(r.html, "inPolicies");
    }
  }

  // Add checks for contact presence
  const contactItems = [
    { key: "email" as const, name: "Email Address" },
    { key: "phone" as const, name: "Phone Number" },
    { key: "address" as const, name: "Physical Address" },
    { key: "supportHours" as const, name: "Support Hours" },
  ];

  for (const item of contactItems) {
    const data = contactPresence[item.key];
    const locations: string[] = [];
    if (data.inFooter) locations.push("footer");
    if (data.inContactPage) locations.push("contact page");
    if (data.inPolicies) locations.push("policy pages");

    const allPresent = data.inFooter && data.inContactPage && data.inPolicies;

    checks.push({
      id: `contact_presence_${item.key}`,
      category: "Contact Info",
      name: `${item.name} Presence`,
      status: allPresent ? "pass" : data.found ? "warning" : "fail",
      description: allPresent
        ? `${item.name} found in footer, contact page, and policy pages.${data.value ? ` (${data.value})` : ""}`
        : data.found
          ? `${item.name} found in: ${locations.join(", ")}. Missing from: ${["footer", "contact page", "policy pages"].filter((l) => !locations.includes(l)).join(", ")}.${data.value ? ` (${data.value})` : ""}`
          : `No ${item.name.toLowerCase()} found anywhere on the site. GMC requires this to be in the footer, contact page, and linked in every policy.`,
      fix: !allPresent
        ? `Add your ${item.name.toLowerCase()} to the footer, /pages/contact, and link it in every policy page.`
        : undefined,
    });
  }

  // ── 11. Business Address Format ────────────────────────────────────────
  const allHtml = homepageHtml + " " + footerHtml + " " +
    Object.entries(fetchResults)
      .filter(([k]) => k.startsWith("contact:") || k.startsWith("required:"))
      .map(([, v]) => v.html)
      .join(" ");

  const addressFound = ADDRESS_PATTERN.test(allHtml);
  const addressFormatCorrect = ADDRESS_FORMAT_FULL.test(allHtml);

  checks.push({
    id: "business_address_format",
    category: "Contact Info",
    name: "Business Address Format",
    status: addressFormatCorrect ? "pass" : addressFound ? "warning" : "fail",
    description: addressFormatCorrect
      ? "A properly formatted business address was found: [Street + Number], [City], [State], [Zip], [Country]."
      : addressFound
        ? "An address was found but may not be in the required format: [Street + Number], [City], [State/Province], [Zipcode], [Country]."
        : "No business address found. GMC requires a correctly formatted physical address.",
    fix: !addressFormatCorrect
      ? "Add your business address in the format: 123 Main Street, City, State, 12345, Country — visible in footer and contact page."
      : undefined,
  });

  // ── 12. Shipping Policy Details ────────────────────────────────────────
  let shippingPolicyDetails: ShippingPolicyDetails | null = null;
  const shippingRes = fetchResults["shipping_policy"];
  if (shippingRes && shippingRes.ok) {
    const $ship = cheerio.load(shippingRes.html);
    const shipText = extractTextContent($ship);
    const shipLower = shipText.toLowerCase();

    shippingPolicyDetails = {
      found: true,
      currency: null,
      cost: null,
      time: null,
      countries: null,
      cutoffTime: null,
    };

    // Extract shipping currency
    for (const cp of currencyPatterns) {
      for (const sym of cp.symbols) {
        if (shipText.includes(sym)) {
          shippingPolicyDetails.currency = cp.code;
          break;
        }
      }
      if (shippingPolicyDetails.currency) break;
    }

    // Extract shipping cost
    const costMatch = shipText.match(/(?:shipping\s+(?:cost|fee|rate|charge)s?\s*(?:is|are|:)?\s*)([\$€£¥₹]?\s*[\d,.]+(?:\s*[-–]\s*[\$€£¥₹]?\s*[\d,.]+)?)/i) ||
      shipText.match(/(?:free shipping)/i) ||
      shipText.match(/([\$€£¥₹]\s*[\d,.]+)\s*(?:shipping|delivery|flat rate)/i);
    if (costMatch) shippingPolicyDetails.cost = costMatch[0].trim().substring(0, 100);

    // Extract shipping time
    const timeMatch = shipText.match(/(\d+\s*[-–]\s*\d+\s*(?:business\s+)?(?:days?|weeks?))/i) ||
      shipText.match(/((?:within|approximately|about)\s+\d+\s*[-–]?\s*\d*\s*(?:business\s+)?(?:days?|weeks?))/i);
    if (timeMatch) shippingPolicyDetails.time = timeMatch[0].trim().substring(0, 100);

    // Extract shipping countries
    const countriesMatch = shipText.match(/(?:ship(?:ping)?\s+(?:to|within|available in)\s*:?\s*)([^.]+)/i) ||
      shipText.match(/(?:we\s+(?:ship|deliver)\s+(?:to|within)\s*)([^.]+)/i);
    if (countriesMatch) shippingPolicyDetails.countries = countriesMatch[0].trim().substring(0, 200);

    // Extract order cutoff time
    const cutoffMatch = shipText.match(/(?:order(?:s)?\s+(?:placed\s+)?(?:before|by)\s+)([\d:]+\s*(?:am|pm|[A-Z]{2,4}))/i) ||
      shipText.match(/(?:cutoff|cut-off|cut off)\s*(?:time)?\s*(?:is|:)?\s*([\d:]+\s*(?:am|pm|[A-Z]{2,4}))/i);
    if (cutoffMatch) shippingPolicyDetails.cutoffTime = cutoffMatch[0].trim().substring(0, 100);

    // Checks for shipping info
    const shipChecks = [
      { key: "cost", label: "Shipping Cost", value: shippingPolicyDetails.cost },
      { key: "time", label: "Shipping Time", value: shippingPolicyDetails.time },
      { key: "countries", label: "Shipping Countries", value: shippingPolicyDetails.countries },
    ];

    for (const sc of shipChecks) {
      checks.push({
        id: `shipping_${sc.key}`,
        category: "Shipping Policy",
        name: sc.label,
        status: sc.value ? "pass" : "warning",
        description: sc.value
          ? `Detected: ${sc.value}`
          : `Could not detect ${sc.label.toLowerCase()} information in your shipping policy.`,
        fix: !sc.value
          ? `Add clear ${sc.label.toLowerCase()} information to your /policies/shipping-policy page.`
          : undefined,
      });
    }

    // Check if the shipping page mentions currency
    if (shippingPolicyDetails.currency) {
      checks.push({
        id: "shipping_currency",
        category: "Shipping Policy",
        name: "Shipping Currency",
        status: "pass",
        description: `Shipping prices are shown in ${shippingPolicyDetails.currency}.`,
      });
    } else if (!shipLower.includes("free")) {
      checks.push({
        id: "shipping_currency",
        category: "Shipping Policy",
        name: "Shipping Currency",
        status: "warning",
        description: "Could not detect a clear currency for shipping costs.",
        fix: "Ensure shipping costs clearly indicate the currency (e.g., $5.99 USD).",
      });
    }
  } else {
    checks.push({
      id: "shipping_policy_page",
      category: "Shipping Policy",
      name: "Shipping Policy Page",
      status: "fail",
      description: "Shipping policy page at /policies/shipping-policy was not found or returned an error.",
      fix: "Create a shipping policy in Shopify: Settings > Policies > Shipping policy.",
    });
  }

  // ── 13. Refund Policy Details ──────────────────────────────────────────
  let refundPolicyDetails: RefundPolicyDetails | null = null;
  const refundRes = fetchResults["refund_policy"];
  if (refundRes && refundRes.ok) {
    const $refund = cheerio.load(refundRes.html);
    const refundText = extractTextContent($refund);

    refundPolicyDetails = {
      found: true,
      returnWindow: null,
      returnShipping: null,
      processingTime: null,
      exchangesAllowed: null,
      restockingFees: null,
    };

    // Return window
    const windowMatch = refundText.match(/(\d+)\s*(?:[-–])?\s*(?:day|calendar day|business day)s?\s*(?:return|refund|exchange|money.back)/i) ||
      refundText.match(/(?:return|refund|exchange|money.back)\s*(?:within|period|window)\s*(?:of\s*)?(\d+)\s*(?:days?)/i);
    if (windowMatch) refundPolicyDetails.returnWindow = windowMatch[0].trim().substring(0, 100);

    // Return shipping
    const returnShipMatch = refundText.match(/(?:return\s+shipping|shipping\s+(?:for\s+)?return)[\s\S]{0,80}(?:customer|buyer|seller|we|us|free|prepaid|label)/i);
    if (returnShipMatch) refundPolicyDetails.returnShipping = returnShipMatch[0].trim().substring(0, 150);

    // Processing time
    const procMatch = refundText.match(/(?:refund|credit|reimburs)[\s\S]{0,60}(\d+\s*[-–]?\s*\d*\s*(?:business\s+)?(?:days?|weeks?))/i) ||
      refundText.match(/(\d+\s*[-–]\s*\d+\s*(?:business\s+)?(?:days?|weeks?))\s*(?:to\s+)?(?:process|receive|refund)/i);
    if (procMatch) refundPolicyDetails.processingTime = procMatch[0].trim().substring(0, 150);

    // Exchanges
    const exchangeMatch = refundText.match(/exchange[s]?\s+(?:are\s+)?(?:allowed|accepted|available|not\s+(?:allowed|accepted|available))/i) ||
      refundText.match(/(?:we\s+(?:do|don'?t)\s+(?:offer|accept)\s+)?exchange/i);
    if (exchangeMatch) refundPolicyDetails.exchangesAllowed = exchangeMatch[0].trim().substring(0, 100);

    // Restocking fees
    const restockMatch = refundText.match(/restock(?:ing)?\s+fee[\s\S]{0,60}(?:\d+%?|no|none|waived)/i) ||
      refundText.match(/(?:no|none|waived|\d+%?)\s*restock(?:ing)?\s+fee/i);
    if (restockMatch) refundPolicyDetails.restockingFees = restockMatch[0].trim().substring(0, 100);

    const refundChecks = [
      { key: "returnWindow", label: "Return Window", value: refundPolicyDetails.returnWindow },
      { key: "returnShipping", label: "Return Shipping Policy", value: refundPolicyDetails.returnShipping },
      { key: "processingTime", label: "Refund Processing Time", value: refundPolicyDetails.processingTime },
      { key: "exchangesAllowed", label: "Exchanges Policy", value: refundPolicyDetails.exchangesAllowed },
      { key: "restockingFees", label: "Restocking Fees", value: refundPolicyDetails.restockingFees },
    ];

    for (const rc of refundChecks) {
      checks.push({
        id: `refund_${rc.key}`,
        category: "Refund Policy",
        name: rc.label,
        status: rc.value ? "pass" : "warning",
        description: rc.value
          ? `Detected: ${rc.value}`
          : `Could not detect ${rc.label.toLowerCase()} information in your refund policy.`,
        fix: !rc.value
          ? `Add clear ${rc.label.toLowerCase()} information to your /policies/refund-policy page.`
          : undefined,
      });
    }
  } else {
    checks.push({
      id: "refund_policy_page",
      category: "Refund Policy",
      name: "Refund Policy Page",
      status: "fail",
      description: "Refund policy page at /policies/refund-policy was not found or returned an error.",
      fix: "Create a refund policy in Shopify: Settings > Policies > Refund policy.",
    });
  }

  // ── 14. Targeted Copy Detection ────────────────────────────────────────
  const targetedCopy: TargetedCopyItem[] = [];
  const pagesToCheckForCopy: { label: string; html: string }[] = [
    { label: "Homepage", html: homepageHtml },
  ];
  // Add product pages
  for (const page of pagesToScanForLinks) {
    if (page.pageType === "Product") {
      pagesToCheckForCopy.push({ label: page.foundOn, html: page.html });
    }
  }

  for (const page of pagesToCheckForCopy) {
    const $p = cheerio.load(page.html);
    // Remove scripts and styles to only get visible text
    $p("script, style, noscript").remove();
    const visibleText = $p("body").text();

    for (const keyword of TARGETED_KEYWORDS) {
      const regex = new RegExp(`(?:[^\\w]|^)(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?:[^\\w]|$)`, "gi");
      let match;
      while ((match = regex.exec(visibleText)) !== null) {
        // Get surrounding context (40 chars before and after)
        const start = Math.max(0, match.index - 40);
        const end = Math.min(visibleText.length, match.index + match[0].length + 40);
        const context = visibleText.substring(start, end).replace(/\s+/g, " ").trim();

        targetedCopy.push({
          keyword,
          context: `...${context}...`,
          foundOn: page.label,
        });
        break; // Only report each keyword once per page
      }
    }
  }

  if (targetedCopy.length > 0) {
    checks.push({
      id: "targeted_copy",
      category: "Content Compliance",
      name: "Targeted Health/Medical Copy",
      status: "warning",
      description: `Found ${targetedCopy.length} instance(s) of potentially targeted or medical/health claim language that could trigger GMC review.`,
      fix: "Review flagged copy and remove or soften any health claims, medical terminology, or overly targeted language. Google restricts health-related product claims.",
    });
  } else {
    checks.push({
      id: "targeted_copy",
      category: "Content Compliance",
      name: "Targeted Copy Check",
      status: "pass",
      description: "No problematic targeted or medical/health claim language was detected.",
    });
  }

  // ── 15. SEO & Branding (from original scanner) ────────────────────────

  // Meta description
  const hasMetaDescription = htmlLower.includes('name="description"') || htmlLower.includes("name='description'");
  checks.push({
    id: "meta_description",
    category: "SEO",
    name: "Meta Description",
    status: hasMetaDescription ? "pass" : "warning",
    description: hasMetaDescription
      ? "A meta description tag was found on your homepage."
      : "No meta description was found. This can affect how Google displays your site.",
    fix: !hasMetaDescription
      ? "Add a meta description to your homepage. In Shopify: Online Store > Preferences > Home page meta description."
      : undefined,
  });

  // Viewport / Mobile-friendly
  const hasViewport = htmlLower.includes('name="viewport"') || htmlLower.includes("name='viewport'");
  checks.push({
    id: "mobile_friendly",
    category: "Accessibility",
    name: "Mobile-Friendly Meta Tag",
    status: hasViewport ? "pass" : "fail",
    description: hasViewport
      ? "Your site has a viewport meta tag, indicating mobile-responsive design."
      : "No viewport meta tag found. Google prioritizes mobile-friendly stores.",
    fix: !hasViewport
      ? "Ensure your theme includes a viewport meta tag in the <head>."
      : undefined,
  });

  // Title tag
  const titleMatch = homepageHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
  const hasTitle = titleMatch && titleMatch[1].trim().length > 0;
  checks.push({
    id: "title_tag",
    category: "SEO",
    name: "Page Title",
    status: hasTitle ? "pass" : "fail",
    description: hasTitle
      ? `Page title found: "${titleMatch![1].trim().substring(0, 60)}"`
      : "No page title was found. This is required for Google indexing.",
    fix: !hasTitle
      ? "Add a page title in Shopify: Online Store > Preferences > Homepage title."
      : undefined,
  });

  // Structured data
  const hasProductJsonLd = htmlLower.includes('"@type"') && (htmlLower.includes('"product"') || htmlLower.includes("'product'"));
  const hasAnyJsonLd = htmlLower.includes("application/ld+json");
  checks.push({
    id: "structured_data",
    category: "Product Data",
    name: "Structured Data (JSON-LD)",
    status: hasProductJsonLd ? "pass" : "warning",
    description: hasProductJsonLd
      ? "Product structured data (JSON-LD) was detected on your homepage."
      : hasAnyJsonLd
        ? "JSON-LD structured data was found but no Product schema detected on the homepage. Product pages may still have it."
        : "No JSON-LD structured data was detected on the homepage. Product pages may still have it.",
    fix: !hasProductJsonLd
      ? "Ensure your product pages include JSON-LD structured data with @type Product. Most Shopify themes do this automatically."
      : undefined,
  });

  // Favicon
  const hasFavicon = htmlLower.includes('rel="icon"') || htmlLower.includes("rel='icon'") || htmlLower.includes("rel=\"shortcut icon\"") || htmlLower.includes("favicon");
  checks.push({
    id: "favicon",
    category: "Branding",
    name: "Favicon",
    status: hasFavicon ? "pass" : "warning",
    description: hasFavicon
      ? "A favicon was detected on your site."
      : "No favicon detected. While not required, it adds professionalism and trust.",
    fix: !hasFavicon
      ? "Upload a favicon in Shopify: Online Store > Themes > Customize > Theme settings > Favicon."
      : undefined,
  });

  return buildResult(url, checks, {
    storeIntelligence,
    wrongDomainLinks,
    emailMismatches,
    collectionIssues,
    contactPresence,
    targetedCopy,
    shippingPolicyDetails,
    refundPolicyDetails,
  });
}

// ─── Build Result ─────────────────────────────────────────────────────────────

interface ScanExtras {
  storeIntelligence: StoreIntelligence;
  wrongDomainLinks: WrongDomainLink[];
  emailMismatches: EmailMismatch[];
  collectionIssues: CollectionIssue[];
  contactPresence: ContactPresence;
  targetedCopy: TargetedCopyItem[];
  shippingPolicyDetails: ShippingPolicyDetails | null;
  refundPolicyDetails: RefundPolicyDetails | null;
}

function emptyExtras(): ScanExtras {
  return {
    storeIntelligence: { domainAge: null, domainCreatedDate: null, currency: null, jurisdiction: null, language: null, timezone: null, theme: null },
    wrongDomainLinks: [],
    emailMismatches: [],
    collectionIssues: [],
    contactPresence: {
      email: { found: false, inFooter: false, inContactPage: false, inPolicies: false },
      phone: { found: false, inFooter: false, inContactPage: false, inPolicies: false },
      address: { found: false, inFooter: false, inContactPage: false, inPolicies: false },
      supportHours: { found: false, inFooter: false, inContactPage: false, inPolicies: false },
    },
    targetedCopy: [],
    shippingPolicyDetails: null,
    refundPolicyDetails: null,
  };
}

function buildResult(url: string, checks: ScanCheck[], extras: ScanExtras): ScanResult {
  // Only count pass/fail/warning for scoring (not info)
  const scorable = checks.filter((c) => c.status !== "info");
  const passed = scorable.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const total = scorable.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  return {
    url,
    scannedAt: new Date().toISOString(),
    score,
    checks,
    summary: { passed, failed, warnings },
    ...extras,
  };
}
