export interface ScanCheck {
  id: string;
  category: string;
  name: string;
  status: "pass" | "fail" | "warning";
  description: string;
  fix?: string;
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
}

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  // Remove trailing slash
  return url.replace(/\/+$/, "");
}

export async function scanStore(inputUrl: string): Promise<ScanResult> {
  const url = normalizeUrl(inputUrl);
  const checks: ScanCheck[] = [];

  // Fetch the homepage
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

  // 1. SSL Check
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

  // 2. Site Reachability
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
    // Cannot continue scanning if site is unreachable
    return buildResult(url, checks);
  }

  const htmlLower = homepageHtml.toLowerCase();

  // 3. Check for policy pages (look for links)
  const policyChecks = [
    {
      id: "refund_policy",
      name: "Return/Refund Policy",
      patterns: ["refund", "return policy", "returns policy", "return-policy", "refund-policy", "/policies/refund"],
      fix: "Add a clear return/refund policy page and link to it from your footer. In Shopify, go to Settings > Policies > Refund policy.",
    },
    {
      id: "shipping_policy",
      name: "Shipping Policy",
      patterns: ["shipping policy", "shipping-policy", "/policies/shipping", "delivery policy"],
      fix: "Add a shipping policy page detailing shipping methods, costs, and delivery times. In Shopify, go to Settings > Policies > Shipping policy.",
    },
    {
      id: "privacy_policy",
      name: "Privacy Policy",
      patterns: ["privacy policy", "privacy-policy", "/policies/privacy"],
      fix: "Add a privacy policy page. Shopify can auto-generate one: Settings > Policies > Privacy policy.",
    },
    {
      id: "terms_of_service",
      name: "Terms of Service",
      patterns: ["terms of service", "terms-of-service", "/policies/terms", "terms and conditions", "terms-and-conditions"],
      fix: "Add a Terms of Service page and link it from your footer. In Shopify: Settings > Policies > Terms of service.",
    },
  ];

  for (const policy of policyChecks) {
    const found = policy.patterns.some((p) => htmlLower.includes(p));
    checks.push({
      id: policy.id,
      category: "Policies",
      name: policy.name,
      status: found ? "pass" : "fail",
      description: found
        ? `A link to your ${policy.name.toLowerCase()} was found on your site.`
        : `No ${policy.name.toLowerCase()} link was found. Google Merchant Center requires this.`,
      fix: found ? undefined : policy.fix,
    });
  }

  // 4. Contact Information
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phonePattern = /[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{7,}/;
  const hasEmail = emailPattern.test(homepageHtml);
  const hasPhone = phonePattern.test(homepageHtml);
  const hasContactLink = htmlLower.includes("contact") || htmlLower.includes("/pages/contact");

  checks.push({
    id: "contact_email",
    category: "Contact Info",
    name: "Email Address",
    status: hasEmail ? "pass" : "warning",
    description: hasEmail
      ? "An email address was found on your homepage."
      : "No email address was found on your homepage. Google recommends visible contact information.",
    fix: !hasEmail
      ? "Add your business email address to your footer or a dedicated contact page."
      : undefined,
  });

  checks.push({
    id: "contact_phone",
    category: "Contact Info",
    name: "Phone Number",
    status: hasPhone ? "pass" : "warning",
    description: hasPhone
      ? "A phone number was found on your homepage."
      : "No phone number was found on your homepage.",
    fix: !hasPhone
      ? "Add a business phone number to your site. This increases trust with Google."
      : undefined,
  });

  checks.push({
    id: "contact_page",
    category: "Contact Info",
    name: "Contact Page",
    status: hasContactLink ? "pass" : "fail",
    description: hasContactLink
      ? "A link to a contact page was found."
      : "No contact page link was found. Google requires a way for customers to reach you.",
    fix: !hasContactLink
      ? "Create a contact page (e.g., /pages/contact) and link it in your navigation or footer."
      : undefined,
  });

  // 5. Product structured data (JSON-LD)
  const hasProductJsonLd = htmlLower.includes('"@type"') && (htmlLower.includes('"product"') || htmlLower.includes("'product'"));
  const hasAnyJsonLd = htmlLower.includes("application/ld+json");

  checks.push({
    id: "structured_data",
    category: "Product Data",
    name: "Structured Data (JSON-LD)",
    status: hasProductJsonLd ? "pass" : hasAnyJsonLd ? "warning" : "warning",
    description: hasProductJsonLd
      ? "Product structured data (JSON-LD) was detected on your homepage."
      : hasAnyJsonLd
        ? "JSON-LD structured data was found but no Product schema detected on the homepage. Product pages may still have it."
        : "No JSON-LD structured data was detected on the homepage. Product pages may still have it.",
    fix: !hasProductJsonLd
      ? "Ensure your product pages include JSON-LD structured data with @type Product. Most Shopify themes do this automatically."
      : undefined,
  });

  // 6. Meta description
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

  // 7. Viewport / Mobile-friendly meta tag
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
      ? "Ensure your theme includes a viewport meta tag in the <head>. Most modern Shopify themes include this."
      : undefined,
  });

  // 8. Title tag
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

  // 9. Check for password protection / coming soon
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

  // 10. Favicon
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

  return buildResult(url, checks);
}

function buildResult(url: string, checks: ScanCheck[]): ScanResult {
  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const total = checks.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  return {
    url,
    scannedAt: new Date().toISOString(),
    score,
    checks,
    summary: { passed, failed, warnings },
  };
}
