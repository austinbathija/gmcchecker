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

/** Strip scripts/styles from HTML and return visible text */
function getVisibleText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, link, meta").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

/** Get visible text from a specific element */
function getFooterText($: cheerio.CheerioAPI): string {
  const $footer = $("footer").clone();
  $footer.find("script, style, noscript, svg").remove();
  return $footer.text().replace(/\s+/g, " ").trim();
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

  // ────────────────────────────────────────────────────────────────────────
  // Fetch ALL pages we need in parallel
  // ────────────────────────────────────────────────────────────────────────
  const contactPaths = [
    "/contact",
    "/pages/contact-us",
    "/pages/get-in-touch",
    "/contact-us",
    "/get-in-touch",
    "/getintouch",
    "/pages/contact",
  ];

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
  pagesToFetch.push({ label: "collections_json", url: `${url}/collections.json` });

  // Fetch all in parallel
  const fetchResults: Record<string, { ok: boolean; status: number; html: string }> = {};
  await Promise.all(
    pagesToFetch.map(async (p) => {
      const result = await fetchPage(p.url);
      fetchResults[p.label] = result;
    })
  );

  // Also alias policy pages for easy access
  const shippingRes = fetchResults["required:Shipping Policy"];
  const refundRes = fetchResults["required:Returns & Refunds Policy"];
  const termsRes = fetchResults["required:Terms & Conditions"];
  const privacyRes = fetchResults["required:Privacy Policy"];

  // ────────────────────────────────────────────────────────────────────────
  // 4. Contact Page Existence
  //    Does the store have a working contact page at any common path?
  // ────────────────────────────────────────────────────────────────────────
  const contactPage404s: ContactPageResult[] = [];
  let workingContactPagePath: string | null = null;

  for (const cp of contactPaths) {
    const key = `contact:${cp}`;
    const r = fetchResults[key];
    if (!r) continue;

    const is404 = !r.ok ||
      (r.html.toLowerCase().includes("page not found")) ||
      (r.status === 404);

    contactPage404s.push({
      path: cp,
      url: `${url}${cp}`,
      is404,
    });

    if (!is404 && !workingContactPagePath) {
      workingContactPagePath = cp;
    }
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
  // 5. Contact Page 404 Errors
  //    Individual report of which contact paths return 404
  // ────────────────────────────────────────────────────────────────────────
  const paths404 = contactPage404s.filter((c) => c.is404);
  if (paths404.length > 0) {
    const pathList = paths404.map((c) => c.url).join("\n");
    checks.push({
      id: "contact_page_404s",
      category: "404 Errors",
      name: `Contact Page 404s (${paths404.length} found)`,
      status: "fail",
      description: `The following contact page URLs return 404:\n${pathList}`,
      fix: "Create pages at these URLs, or remove any links pointing to them. At minimum, ensure one contact page exists and is linked.",
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // 6. Required Pages Check
  // ────────────────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────────────────
  // 7. Wrong Domain Links
  //    Scan homepage + product pages + ALL policy pages
  // ────────────────────────────────────────────────────────────────────────
  const wrongDomainLinks: WrongDomainLink[] = [];
  const allowedDomains = [
    storeDomain,
    "shopify.com", "myshopify.com", "cdn.shopify.com", "shopifycdn.com",
    "google.com", "googleapis.com", "gstatic.com", "googletagmanager.com",
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

  // Add policy pages to scan for wrong domain links
  for (const rp of requiredPages) {
    const key = `required:${rp.name}`;
    const r = fetchResults[key];
    if (r && r.ok) {
      pagesToScanForLinks.push({
        html: r.html,
        pageType: "Policy",
        foundOn: `${url}${rp.path}`,
      });
    }
  }

  // Add contact pages
  for (const cp of contactPaths) {
    const key = `contact:${cp}`;
    const r = fetchResults[key];
    if (r && r.ok && !r.html.toLowerCase().includes("page not found")) {
      pagesToScanForLinks.push({
        html: r.html,
        pageType: "Other",
        foundOn: `${url}${cp}`,
      });
      break; // Only add first working contact page to avoid duplicates
    }
  }

  // Find product page links on homepage
  const productLinks: string[] = [];
  $('a[href*="/products/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href && !href.includes("collections") && productLinks.length < 3) {
      const fullUrl = href.startsWith("http") ? href : `${url}${href.startsWith("/") ? "" : "/"}${href}`;
      productLinks.push(fullUrl);
    }
  });

  // Fetch up to 3 product pages for scanning
  await Promise.all(
    productLinks.slice(0, 3).map(async (pUrl) => {
      const r = await fetchPage(pUrl);
      if (r.ok) {
        pagesToScanForLinks.push({ html: r.html, pageType: "Product", foundOn: pUrl });
      }
    })
  );

  // Scan all collected pages for wrong domain links
  for (const page of pagesToScanForLinks) {
    const $page = cheerio.load(page.html);
    $page("a[href]").each((_, el) => {
      const href = $page(el).attr("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:") || href.startsWith("/") || href.startsWith("?") || href.startsWith("data:")) {
        return;
      }
      try {
        const linkDomain = getDomain(href);
        if (!linkDomain) return;
        const isAllowed = allowedDomains.some(
          (d) => linkDomain === d || linkDomain.endsWith(`.${d}`)
        );
        if (!isAllowed && linkDomain !== storeDomain && !linkDomain.endsWith(`.${storeDomain}`)) {
          // Avoid duplicate entries for same URL
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
      description: `Found ${wrongDomainLinks.length} link(s) pointing to domains other than ${storeDomain}.`,
      fix: "Review each flagged link and either remove it or update it to point to your own domain. These are often leftover template links.",
    });
  } else {
    checks.push({
      id: "wrong_domain_links",
      category: "Link Integrity",
      name: "Wrong Domain Links",
      status: "pass",
      description: "No wrong-domain links were detected across your site pages.",
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // 8. Email Domain Mismatch
  // ────────────────────────────────────────────────────────────────────────
  const emailMismatches: EmailMismatch[] = [];
  const allEmailsByPage: Record<string, string[]> = {};

  const homepageEmails = extractEmails(homepageHtml);
  if (homepageEmails.length > 0) allEmailsByPage["Homepage"] = homepageEmails;

  for (const cp of contactPaths) {
    const key = `contact:${cp}`;
    const r = fetchResults[key];
    if (r && r.ok) {
      const emails = extractEmails(r.html);
      if (emails.length > 0) allEmailsByPage[cp] = emails;
    }
  }

  // Also check policy pages for emails
  for (const rp of requiredPages) {
    const key = `required:${rp.name}`;
    const r = fetchResults[key];
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

  if (emailMismatches.length > 0) {
    checks.push({
      id: "email_domain_mismatch",
      category: "Email Integrity",
      name: "Email Domain Mismatch",
      status: "fail",
      description: `Found ${emailMismatches.length} email(s) with domains that don't match your store domain (${storeDomain}).`,
      fix: `Use email addresses matching your store domain (e.g., support@${storeDomain}).`,
    });
  } else {
    checks.push({
      id: "email_domain_mismatch",
      category: "Email Integrity",
      name: "Email Domain Match",
      status: Object.keys(emailPageMap).length > 0 ? "pass" : "warning",
      description: Object.keys(emailPageMap).length > 0
        ? "All email addresses found match your store domain."
        : "No email addresses were found on the site.",
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // 9. Collection Checks (Shopify API)
  // ────────────────────────────────────────────────────────────────────────
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
    // Fetch product counts in parallel (batch of 10 at a time)
    const colBatches: typeof collectionsData.collections = [...collectionsData.collections];
    const colResults: { col: typeof colBatches[0]; activeProducts: number }[] = [];

    for (let i = 0; i < colBatches.length; i += 10) {
      const batch = colBatches.slice(i, i + 10);
      await Promise.all(
        batch.map(async (col) => {
          let activeProducts = col.products_count ?? 0;
          try {
            const colRes = await fetchPage(`${url}/collections/${col.handle}/products.json?limit=250`);
            if (colRes.ok) {
              const colData = JSON.parse(colRes.html);
              activeProducts = colData.products?.length ?? 0;
            }
          } catch {
            // Use products_count from listing
          }
          colResults.push({ col, activeProducts });
        })
      );
    }

    for (const { col, activeProducts } of colResults) {
      if (activeProducts === 0) {
        collectionIssues.push({ name: col.title, url: `${url}/collections/${col.handle}`, activeProducts: 0, empty: true });
      } else if (activeProducts < 5) {
        collectionIssues.push({ name: col.title, url: `${url}/collections/${col.handle}`, activeProducts, empty: false });
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
      description: `Found ${emptyCollections.length} collection(s) with 0 active products.`,
      fix: "Add products to empty collections or remove/hide them from your store navigation.",
    });
  }
  if (lowProductCollections.length > 0) {
    checks.push({
      id: "low_product_collections",
      category: "Collections",
      name: "Collections With < 5 Products",
      status: "warning",
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
  // 10. Store Intelligence Extraction
  // ────────────────────────────────────────────────────────────────────────
  const storeIntelligence: StoreIntelligence = {
    domainAge: null,
    domainCreatedDate: null,
    currency: null,
    jurisdiction: null,
    language: null,
    timezone: null,
    theme: null,
  };

  // Currency
  const currencyMeta = homepageHtml.match(/"priceCurrency"\s*:\s*"([A-Z]{3})"/i) ||
    homepageHtml.match(/"currency"\s*:\s*"([A-Z]{3})"/i) ||
    homepageHtml.match(/data-currency="([A-Z]{3})"/i) ||
    homepageHtml.match(/Shopify\.currency\.active\s*=\s*"([A-Z]{3})"/i);
  if (currencyMeta) {
    storeIntelligence.currency = currencyMeta[1].toUpperCase();
  } else {
    for (const cp of CURRENCY_PATTERNS) {
      if (homepageHtml.includes(cp.symbols[0]) || homepageHtml.includes(cp.code)) {
        storeIntelligence.currency = cp.code;
        break;
      }
    }
  }

  // Language
  const langAttr = $("html").attr("lang");
  if (langAttr) storeIntelligence.language = langAttr;

  // Jurisdiction
  const jurisdictionMatch = homepageHtml.match(/Shopify\.shop\s*=\s*"([^"]+)"/i) ||
    homepageHtml.match(/"country"\s*:\s*"([^"]+)"/i) ||
    homepageHtml.match(/"countryCode"\s*:\s*"([^"]+)"/i);
  if (jurisdictionMatch) storeIntelligence.jurisdiction = jurisdictionMatch[1];

  // Timezone
  const tzMatch = homepageHtml.match(/"timezone"\s*:\s*"([^"]+)"/i) ||
    homepageHtml.match(/Shopify\.timezone\s*=\s*"([^"]+)"/i);
  if (tzMatch) storeIntelligence.timezone = tzMatch[1];

  // Theme
  const themeMatch = homepageHtml.match(/Shopify\.theme\s*=\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i) ||
    homepageHtml.match(/theme_name["']\s*:\s*["']([^"']+)/i);
  if (themeMatch) storeIntelligence.theme = themeMatch[1];
  if (!storeIntelligence.theme) {
    const themeStylesheet = $('link[href*="theme."]').attr("href");
    if (themeStylesheet) {
      const themeNameFromUrl = themeStylesheet.match(/themes\/([^/]+)/);
      if (themeNameFromUrl) storeIntelligence.theme = themeNameFromUrl[1];
    }
  }

  // Domain age via RDAP
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
        storeIntelligence.domainAge = ageDays >= 365
          ? `${Math.floor(ageDays / 365)} year${Math.floor(ageDays / 365) > 1 ? "s" : ""}`
          : `${ageDays} days`;

        checks.push({
          id: "domain_age",
          category: "Domain",
          name: "Domain Age (12+ Days)",
          status: ageDays >= 12 ? "pass" : "fail",
          description: ageDays >= 12
            ? `Domain registered ${storeIntelligence.domainAge} ago (${storeIntelligence.domainCreatedDate}). Meets the 12-day minimum.`
            : `Domain is only ${ageDays} day(s) old (registered ${storeIntelligence.domainCreatedDate}). Requires 12+ days for GMC.`,
          fix: ageDays < 12 ? `Wait ${12 - ageDays} more day(s) before submitting to Google Merchant Center.` : undefined,
        });
      }
    }
  } catch {
    checks.push({
      id: "domain_age",
      category: "Domain",
      name: "Domain Age (12+ Days)",
      status: "info",
      description: "Could not determine domain age — RDAP lookup did not return data for this domain.",
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // 11. Footer Requirements
  //     Email, phone, address must be in the site footer
  // ────────────────────────────────────────────────────────────────────────
  const footerHtml = $("footer").html() || "";
  const footerText = getFooterText($);
  const footerEmails = extractEmails(footerHtml);
  const footerPhones = extractPhones(footerHtml);
  const footerHasAddress = ADDRESS_PATTERN.test(footerHtml);

  checks.push({
    id: "footer_email",
    category: "Footer Requirements",
    name: "Email in Footer",
    status: footerEmails.length > 0 ? "pass" : "fail",
    description: footerEmails.length > 0
      ? `Email found in footer: ${footerEmails[0]}`
      : "No email address found in the footer.",
    fix: footerEmails.length === 0 ? "Add your business email address to your site footer." : undefined,
  });

  checks.push({
    id: "footer_phone",
    category: "Footer Requirements",
    name: "Phone in Footer",
    status: footerPhones.length > 0 ? "pass" : "warning",
    description: footerPhones.length > 0
      ? `Phone number found in footer: ${footerPhones[0]}`
      : "No phone number found in the footer.",
    fix: footerPhones.length === 0 ? "Add your business phone number to your site footer." : undefined,
  });

  checks.push({
    id: "footer_address",
    category: "Footer Requirements",
    name: "Physical Address in Footer",
    status: footerHasAddress ? "pass" : "fail",
    description: footerHasAddress
      ? "A physical address was found in the footer."
      : "No physical address found in the footer.",
    fix: !footerHasAddress ? "Add your business address in the format: 123 Main Street, City, State, 12345, Country to your footer." : undefined,
  });

  // Support hours in footer
  const hoursRegex = /(?:hours|support hours|business hours|opening hours|open\s+\d|mon(?:day)?[\s\-–]+(?:fri|sat|sun)|(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)))/i;
  const footerHasHours = hoursRegex.test(footerText);
  checks.push({
    id: "footer_hours",
    category: "Footer Requirements",
    name: "Support Hours in Footer",
    status: footerHasHours ? "pass" : "warning",
    description: footerHasHours
      ? "Support/business hours found in the footer."
      : "No support hours found in the footer.",
    fix: !footerHasHours ? "Add your support/business hours to the footer (e.g., Mon-Fri 9am-5pm EST)." : undefined,
  });

  // ────────────────────────────────────────────────────────────────────────
  // 12. Policy Page Requirements
  //     Each policy page must contain contact info (email, phone, address)
  // ────────────────────────────────────────────────────────────────────────
  const policyContactChecks: PolicyContactCheck[] = [];
  const policiesToCheck = [
    { name: "Shipping Policy", key: "required:Shipping Policy" },
    { name: "Returns & Refunds Policy", key: "required:Returns & Refunds Policy" },
    { name: "Privacy Policy", key: "required:Privacy Policy" },
    { name: "Terms & Conditions", key: "required:Terms & Conditions" },
    { name: "Billing Terms & Conditions", key: "required:Billing Terms & Conditions" },
  ];

  for (const pol of policiesToCheck) {
    const r = fetchResults[pol.key];
    if (!r || !r.ok) continue;

    const policyEmails = extractEmails(r.html);
    const policyPhones = extractPhones(r.html);
    const policyHasAddress = ADDRESS_PATTERN.test(r.html);

    const rp = requiredPages.find((p) => p.name === pol.name);
    const policyUrl = rp ? `${url}${rp.path}` : "";

    policyContactChecks.push({
      policyName: pol.name,
      policyUrl,
      hasEmail: policyEmails.length > 0,
      hasPhone: policyPhones.length > 0,
      hasAddress: policyHasAddress,
    });

    const missing: string[] = [];
    if (policyEmails.length === 0) missing.push("email");
    if (policyPhones.length === 0) missing.push("phone");
    if (!policyHasAddress) missing.push("physical address");

    if (missing.length > 0) {
      checks.push({
        id: `policy_contact_${pol.name.toLowerCase().replace(/[^a-z]/g, "_")}`,
        category: "Policy Requirements",
        name: `Contact Info in ${pol.name}`,
        status: "fail",
        description: `${pol.name} is missing: ${missing.join(", ")}.`,
        fix: `Add your ${missing.join(", ")} to your ${pol.name} page.`,
      });
    } else {
      checks.push({
        id: `policy_contact_${pol.name.toLowerCase().replace(/[^a-z]/g, "_")}`,
        category: "Policy Requirements",
        name: `Contact Info in ${pol.name}`,
        status: "pass",
        description: `${pol.name} contains email, phone, and physical address.`,
      });
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // 13. Business Address Format
  // ────────────────────────────────────────────────────────────────────────
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
      ? "Add your business address in the format: 123 Main Street, City, State, 12345, Country — visible in footer, contact page, and all policies."
      : undefined,
  });

  // ────────────────────────────────────────────────────────────────────────
  // 14. Shipping Policy Details
  // ────────────────────────────────────────────────────────────────────────
  let shippingPolicyDetails: ShippingPolicyDetails | null = null;
  if (shippingRes && shippingRes.ok) {
    const shipText = getVisibleText(shippingRes.html);

    shippingPolicyDetails = {
      found: true,
      currency: null,
      cost: null,
      time: null,
      countries: null,
      cutoffTime: null,
    };

    // Currency
    for (const cp of CURRENCY_PATTERNS) {
      for (const sym of cp.symbols) {
        if (shipText.includes(sym)) {
          shippingPolicyDetails.currency = cp.code;
          break;
        }
      }
      if (shippingPolicyDetails.currency) break;
    }

    // Cost - broader patterns
    const costMatch = shipText.match(/free shipping/i) ||
      shipText.match(/([\$€£¥₹]\s*[\d,.]+)\s*(?:flat\s*rate|shipping|delivery)/i) ||
      shipText.match(/(?:shipping|delivery)\s*(?:cost|fee|rate|charge)s?\s*(?:is|are|of|:)?\s*([\$€£¥₹]?\s*[\d,.]+)/i) ||
      shipText.match(/(?:flat\s*rate|standard)\s*(?:shipping)?\s*(?:of|:)?\s*([\$€£¥₹]\s*[\d,.]+)/i);
    if (costMatch) shippingPolicyDetails.cost = costMatch[0].trim().substring(0, 100);

    // Time - broader patterns
    const timeMatch = shipText.match(/(\d+\s*[-–to]+\s*\d+\s*(?:business\s+)?(?:days?|weeks?|working days?))/i) ||
      shipText.match(/((?:within|approximately|about|up to|typically)\s+\d+\s*[-–]?\s*\d*\s*(?:business\s+)?(?:days?|weeks?))/i) ||
      shipText.match(/(\d+\s*(?:business\s+)?(?:days?|weeks?))\s*(?:delivery|shipping|transit|processing)/i) ||
      shipText.match(/(?:delivery|shipping|transit|processing)\s*(?:time|period)?\s*(?:is|are|of|:)?\s*(\d+\s*[-–to]*\s*\d*\s*(?:business\s+)?(?:days?|weeks?))/i);
    if (timeMatch) shippingPolicyDetails.time = timeMatch[0].trim().substring(0, 100);

    // Countries
    const countriesMatch = shipText.match(/(?:ship(?:ping)?|deliver(?:y)?)\s*(?:to|within|available\s+in|across)\s*:?\s*([^.]{5,100})/i) ||
      shipText.match(/(?:we\s+(?:ship|deliver)\s+(?:to|within|across))\s*([^.]{5,100})/i) ||
      shipText.match(/(?:available|shipping)\s+(?:in|to)\s+(?:the\s+)?(United States|USA|US|Canada|UK|worldwide|internationally|all\s+\d+\s+states)[^.]*/i);
    if (countriesMatch) shippingPolicyDetails.countries = countriesMatch[0].trim().substring(0, 200);

    // Cutoff time
    const cutoffMatch = shipText.match(/(?:order(?:s)?\s+(?:placed\s+)?(?:before|by)\s+)([\d:]+\s*(?:am|pm)\s*(?:[A-Z]{2,4})?)/i) ||
      shipText.match(/(?:cutoff|cut-off|cut off)\s*(?:time)?\s*(?:is|:)?\s*([\d:]+\s*(?:am|pm)\s*(?:[A-Z]{2,4})?)/i);
    if (cutoffMatch) shippingPolicyDetails.cutoffTime = cutoffMatch[0].trim().substring(0, 100);

    // Checks
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
        description: sc.value ? `Detected: ${sc.value}` : `Could not detect ${sc.label.toLowerCase()} in your shipping policy.`,
        fix: !sc.value ? `Add clear ${sc.label.toLowerCase()} info to /policies/shipping-policy.` : undefined,
      });
    }

    if (shippingPolicyDetails.currency) {
      checks.push({
        id: "shipping_currency",
        category: "Shipping Policy",
        name: "Shipping Currency",
        status: "pass",
        description: `Shipping prices shown in ${shippingPolicyDetails.currency}.`,
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

  // ────────────────────────────────────────────────────────────────────────
  // 15. Refund Policy Details
  //     Much broader regex patterns to catch real-world phrasings
  // ────────────────────────────────────────────────────────────────────────
  let refundPolicyDetails: RefundPolicyDetails | null = null;
  if (refundRes && refundRes.ok) {
    const refundText = getVisibleText(refundRes.html);

    refundPolicyDetails = {
      found: true,
      returnWindow: null,
      returnShipping: null,
      processingTime: null,
      exchangesAllowed: null,
      restockingFees: null,
    };

    // Return window - very broad patterns
    const windowMatch =
      refundText.match(/(\d+)\s*[-–]?\s*(?:day|calendar day|business day)s?\s*(?:return|refund|exchange|money[\s-]?back)/i) ||
      refundText.match(/(?:return|refund|exchange|money[\s-]?back)\s*(?:within|period|window|policy)\s*(?:of\s*|is\s*)?(\d+)\s*(?:[-–]?\s*\d*\s*)?(?:calendar\s+|business\s+)?days?/i) ||
      refundText.match(/(?:have|within|allow(?:ed)?|offer|provide|grant)\s+(\d+)\s*(?:calendar\s+|business\s+)?days?\s+(?:to|for|from|of|after)\s+(?:return|request|initiate|notify)/i) ||
      refundText.match(/(\d+)\s*[-–]?\s*day\s*(?:return|refund|money[\s-]?back)\s*(?:policy|guarantee|period|window)/i) ||
      refundText.match(/(?:return|refund)\s+(?:your\s+)?(?:item|product|order|purchase)s?\s+(?:within|up to)\s+(\d+)\s*days?/i) ||
      refundText.match(/(\d+)\s*days?\s*(?:from|after|of)\s*(?:the\s*)?(?:date\s*(?:of\s*)?)?(?:purchase|delivery|receipt|arrival)/i);
    if (windowMatch) refundPolicyDetails.returnWindow = windowMatch[0].trim().substring(0, 120);

    // Return shipping - broader
    const returnShipMatch =
      refundText.match(/(?:return\s+shipping|shipping\s+(?:for\s+)?(?:the\s+)?return)[\s\S]{0,100}(?:customer|buyer|seller|we|us|free|prepaid|label|responsible|paid|cost)/i) ||
      refundText.match(/(?:customer|buyer|you)\s+(?:is|are|will be)\s+responsible\s+for\s+(?:return\s+)?shipping/i) ||
      refundText.match(/(?:we|seller)\s+(?:will|shall)\s+(?:pay|cover|provide)\s+(?:the\s+)?(?:return\s+)?shipping/i) ||
      refundText.match(/(?:free|prepaid|pre-paid)\s+return\s*(?:shipping|label)/i);
    if (returnShipMatch) refundPolicyDetails.returnShipping = returnShipMatch[0].trim().substring(0, 150);

    // Processing time - broader
    const procMatch =
      refundText.match(/(?:refund|credit|reimburs(?:e|ement))[\s\S]{0,80}?(\d+\s*[-–to]*\s*\d*\s*(?:business\s+)?(?:days?|weeks?))/i) ||
      refundText.match(/(\d+\s*[-–to]+\s*\d+\s*(?:business\s+)?(?:days?|weeks?))\s*(?:to\s+)?(?:process|receive|issue|complete)\s*(?:the\s+)?(?:refund|credit)/i) ||
      refundText.match(/(?:process(?:ed|ing)?|issued?|receive)\s+(?:(?:your|the|a)\s+)?(?:refund|credit)\s+(?:within|in)\s+(\d+\s*[-–to]*\s*\d*\s*(?:business\s+)?(?:days?|weeks?))/i) ||
      refundText.match(/(?:refund|credit)\s+(?:will\s+(?:be\s+)?)?(?:process(?:ed)?|appear|show|reflect)\s+(?:within|in)\s+(\d+\s*[-–to]*\s*\d*\s*(?:business\s+)?(?:days?|weeks?))/i);
    if (procMatch) refundPolicyDetails.processingTime = procMatch[0].trim().substring(0, 150);

    // Exchanges - broader
    const exchangeMatch =
      refundText.match(/exchange[s]?\s+(?:are\s+)?(?:allowed|accepted|available|offered|not\s+(?:allowed|accepted|available|offered))/i) ||
      refundText.match(/(?:we\s+(?:do|don'?t|cannot|can not)\s+(?:offer|accept|process)\s+)?exchange[s]?/i) ||
      refundText.match(/(?:no|only)\s+exchange/i) ||
      refundText.match(/exchange\s+(?:for|with)\s+(?:a\s+)?(?:different|another|same|equal)/i);
    if (exchangeMatch) refundPolicyDetails.exchangesAllowed = exchangeMatch[0].trim().substring(0, 100);

    // Restocking fees - broader
    const restockMatch =
      refundText.match(/restock(?:ing)?\s+fee[\s\S]{0,80}?(?:\d+%?|no|none|waived|not\s+charge)/i) ||
      refundText.match(/(?:no|none|waived|not?\s+(?:any\s+)?(?:charge)?|\d+%?)\s*restock(?:ing)?\s+fee/i) ||
      refundText.match(/(?:subject\s+to\s+a?\s*)(\d+%?\s*)?restock(?:ing)?\s+fee/i);
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
        description: rc.value ? `Detected: ${rc.value}` : `Could not detect ${rc.label.toLowerCase()} in your refund policy.`,
        fix: !rc.value ? `Add clear ${rc.label.toLowerCase()} info to /policies/refund-policy.` : undefined,
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

  // ────────────────────────────────────────────────────────────────────────
  // 16. Targeted Copy Detection
  // ────────────────────────────────────────────────────────────────────────
  const targetedCopy: TargetedCopyItem[] = [];
  const pagesToCheckForCopy: { label: string; html: string }[] = [
    { label: "Homepage", html: homepageHtml },
  ];
  for (const page of pagesToScanForLinks) {
    if (page.pageType === "Product") {
      pagesToCheckForCopy.push({ label: page.foundOn, html: page.html });
    }
  }

  for (const page of pagesToCheckForCopy) {
    const visibleText = getVisibleText(page.html);

    for (const keyword of TARGETED_KEYWORDS) {
      const regex = new RegExp(`(?:[^\\w]|^)(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?:[^\\w]|$)`, "gi");
      const match = regex.exec(visibleText);
      if (match) {
        const start = Math.max(0, match.index - 40);
        const end = Math.min(visibleText.length, match.index + match[0].length + 40);
        const context = visibleText.substring(start, end).replace(/\s+/g, " ").trim();
        targetedCopy.push({
          keyword,
          context: `...${context}...`,
          foundOn: page.label,
        });
      }
    }
  }

  if (targetedCopy.length > 0) {
    checks.push({
      id: "targeted_copy",
      category: "Content Compliance",
      name: "Targeted Health/Medical Copy",
      status: "warning",
      description: `Found ${targetedCopy.length} instance(s) of potentially targeted language that could trigger GMC review.`,
      fix: "Review flagged copy and remove or soften health claims, medical terminology, or overly targeted language.",
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

  // ────────────────────────────────────────────────────────────────────────
  // 17. SEO & Branding
  // ────────────────────────────────────────────────────────────────────────
  const hasMetaDescription = htmlLower.includes('name="description"') || htmlLower.includes("name='description'");
  checks.push({
    id: "meta_description",
    category: "SEO",
    name: "Meta Description",
    status: hasMetaDescription ? "pass" : "warning",
    description: hasMetaDescription
      ? "A meta description tag was found on your homepage."
      : "No meta description was found.",
    fix: !hasMetaDescription ? "Add a meta description in Shopify: Online Store > Preferences." : undefined,
  });

  const hasViewport = htmlLower.includes('name="viewport"') || htmlLower.includes("name='viewport'");
  checks.push({
    id: "mobile_friendly",
    category: "Accessibility",
    name: "Mobile-Friendly Meta Tag",
    status: hasViewport ? "pass" : "fail",
    description: hasViewport
      ? "Your site has a viewport meta tag, indicating mobile-responsive design."
      : "No viewport meta tag found. Google prioritizes mobile-friendly stores.",
    fix: !hasViewport ? "Ensure your theme includes a viewport meta tag in the <head>." : undefined,
  });

  const titleMatch = homepageHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
  const hasTitle = titleMatch && titleMatch[1].trim().length > 0;
  checks.push({
    id: "title_tag",
    category: "SEO",
    name: "Page Title",
    status: hasTitle ? "pass" : "fail",
    description: hasTitle
      ? `Page title found: "${titleMatch![1].trim().substring(0, 60)}"`
      : "No page title was found.",
    fix: !hasTitle ? "Add a page title in Shopify: Online Store > Preferences > Homepage title." : undefined,
  });

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
        ? "JSON-LD found but no Product schema on homepage. Product pages may still have it."
        : "No JSON-LD structured data detected on the homepage.",
    fix: !hasProductJsonLd ? "Ensure product pages include JSON-LD with @type Product." : undefined,
  });

  const hasFavicon = htmlLower.includes('rel="icon"') || htmlLower.includes("rel='icon'") || htmlLower.includes("rel=\"shortcut icon\"") || htmlLower.includes("favicon");
  checks.push({
    id: "favicon",
    category: "Branding",
    name: "Favicon",
    status: hasFavicon ? "pass" : "warning",
    description: hasFavicon
      ? "A favicon was detected on your site."
      : "No favicon detected.",
    fix: !hasFavicon ? "Upload a favicon in Shopify: Themes > Customize > Theme settings > Favicon." : undefined,
  });

  return buildResult(url, checks, {
    storeIntelligence,
    wrongDomainLinks,
    emailMismatches,
    collectionIssues,
    targetedCopy,
    shippingPolicyDetails,
    refundPolicyDetails,
    contactPage404s,
    policyContactChecks,
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
    wrongDomainLinks: [],
    emailMismatches: [],
    collectionIssues: [],
    targetedCopy: [],
    shippingPolicyDetails: null,
    refundPolicyDetails: null,
    contactPage404s: [],
    policyContactChecks: [],
  };
}

function buildResult(url: string, checks: ScanCheck[], extras: ScanExtras): ScanResult {
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
