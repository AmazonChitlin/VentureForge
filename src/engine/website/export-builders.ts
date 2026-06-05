import type {
  BrandVoiceGuide,
  NextJsWebsiteExport,
  StaticWebsiteExport,
  WebsiteCopyBlocks,
  WebsiteFaqPage,
  WebsiteMetaDescriptions,
  WebsitePage,
  WebsiteSocialBios,
  WebsiteTone,
} from "./schema";
import { toneProfiles } from "./tone-profiles";

export interface ExportableWebsiteContent {
  businessName: string;
  tone: WebsiteTone;
  homepage: WebsitePage;
  aboutPage: WebsitePage;
  productsServicesPage: WebsitePage;
  contactPage: WebsitePage;
  faqPage: WebsiteFaqPage;
  localSeoTitle: string | null;
  metaDescriptions: WebsiteMetaDescriptions;
  googleBusinessProfileDescription: string;
  socialBios: WebsiteSocialBios;
  brandVoiceGuide: BrandVoiceGuide;
  localBusinessJsonLd: string | null;
}

export function buildStaticWebsiteExport(
  content: ExportableWebsiteContent,
): StaticWebsiteExport {
  const pages = pageEntries(content);
  const structuredData = content.localBusinessJsonLd
    ? `<script type="application/ld+json">${escapeJsonForHtml(content.localBusinessJsonLd)}</script>`
    : "";
  const html = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'self\'; img-src \'self\' data:; font-src \'self\'; base-uri \'none\'; form-action \'none\'">',
    `<title>${escapeHtml(content.localSeoTitle ?? content.homepage.title)}</title>`,
    `<meta name="description" content="${escapeHtml(content.metaDescriptions.homepage)}">`,
    '<link rel="stylesheet" href="styles.css">',
    structuredData,
    "</head>",
    "<body>",
    '<header class="site-header">',
    `<a class="brand" href="#home">${escapeHtml(content.businessName)}</a>`,
    `<nav aria-label="Main navigation">${pages.map(([key, page]) => `<a href="#${escapeHtml(key)}">${escapeHtml(page.navigationLabel)}</a>`).join("")}</nav>`,
    "</header>",
    "<main>",
    pages.map(([key, page]) => renderPage(key, page)).join(""),
    "</main>",
    `<footer><p>${escapeHtml(content.businessName)}. Review all generated copy before publishing.</p></footer>`,
    "</body>",
    "</html>",
  ].join("\n");

  return {
    html,
    css: buildCss(content.tone),
  };
}

export function buildNextJsWebsiteExport(
  content: ExportableWebsiteContent,
): NextJsWebsiteExport {
  return {
    files: [
      file("app/layout.tsx", layoutSource()),
      file("app/page.tsx", contentPageSource("homepage")),
      file("app/about/page.tsx", contentPageSource("aboutPage")),
      file("app/services/page.tsx", contentPageSource("productsServicesPage")),
      file("app/contact/page.tsx", contentPageSource("contactPage")),
      file("app/faq/page.tsx", faqPageSource()),
      file("components/site-shell.tsx", siteShellSource()),
      file("components/content-page.tsx", reusableContentPageSource()),
      file("components/faq-page.tsx", reusableFaqPageSource()),
      file(
        "lib/site-content.ts",
        `export const siteContent = ${JSON.stringify(content, null, 2)} as const;\n`,
      ),
      file("app/globals.css", buildCss(content.tone)),
    ],
  };
}

export function buildWebsiteCopyBlocks(
  content: ExportableWebsiteContent,
): WebsiteCopyBlocks {
  const copy = plainTextCopy(content);
  return {
    squarespace: {
      platform: "Squarespace",
      suggestedUse:
        "Create five pages, then paste each labeled page block into a Squarespace text section.",
      content: copy,
    },
    wix: {
      platform: "Wix",
      suggestedUse:
        "Create five pages and use the labeled blocks as a Wix editor starting draft.",
      content: copy,
    },
    shopify: {
      platform: "Shopify",
      suggestedUse:
        "Use the homepage block for the storefront and adapt the services block into product or collection descriptions.",
      content: copy,
    },
    wordpress: {
      platform: "WordPress",
      suggestedUse:
        "Create five pages and paste the labeled blocks into WordPress blocks or a page builder.",
      content: copy,
    },
  };
}

function renderPage(key: string, page: WebsitePage | WebsiteFaqPage): string {
  const faqMarkup = "faqs" in page
    ? `<div class="faq-list">${page.faqs.map((faq) => `<details><summary>${escapeHtml(faq.question)}</summary><p>${escapeHtml(faq.answer)}</p></details>`).join("")}</div>`
    : "";
  return [
    `<section class="page" id="${escapeHtml(key)}">`,
    `<p class="eyebrow">${escapeHtml(page.navigationLabel)}</p>`,
    `<h1>${escapeHtml(page.headline)}</h1>`,
    `<p class="introduction">${escapeHtml(page.introduction)}</p>`,
    ...page.sections.map(
      (section) =>
        `<article><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p>${section.bullets.length ? `<ul>${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}</article>`,
    ),
    faqMarkup,
    `<p><a class="cta" href="#contact">${escapeHtml(page.callToAction)}</a></p>`,
    "</section>",
  ].join("\n");
}

function buildCss(tone: WebsiteTone): string {
  const colors = toneProfiles[tone].colors;
  return `:root {
  color-scheme: light;
  --ink: ${colors.ink};
  --muted: ${colors.muted};
  --background: ${colors.background};
  --surface: ${colors.surface};
  --accent: ${colors.accent};
  --accent-text: ${colors.accentText};
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--background); color: var(--ink); font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
.site-header { align-items: center; background: var(--surface); border-bottom: 1px solid color-mix(in srgb, var(--muted) 24%, transparent); display: flex; gap: 1rem; justify-content: space-between; padding: 1rem clamp(1rem, 4vw, 4rem); position: sticky; top: 0; }
.brand { color: var(--ink); font-weight: 800; text-decoration: none; }
nav { display: flex; flex-wrap: wrap; gap: 0.85rem; }
nav a { color: var(--muted); font-size: 0.9rem; text-decoration: none; }
main { margin: 0 auto; max-width: 76rem; padding: 1rem; }
.page { background: var(--surface); border-radius: 1.25rem; margin: 1rem 0; padding: clamp(1.5rem, 5vw, 4rem); }
.eyebrow { color: var(--accent); font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
h1 { font-size: clamp(2rem, 6vw, 4.5rem); letter-spacing: -0.05em; line-height: 1; max-width: 16ch; }
h2 { font-size: 1.2rem; margin-top: 2rem; }
.introduction { color: var(--muted); font-size: 1.15rem; max-width: 62ch; }
article, .faq-list { max-width: 68ch; }
.cta { background: var(--accent); border-radius: 999px; color: var(--accent-text); display: inline-block; font-weight: 800; padding: 0.8rem 1.15rem; text-decoration: none; }
details { border-top: 1px solid color-mix(in srgb, var(--muted) 24%, transparent); padding: 0.85rem 0; }
summary { cursor: pointer; font-weight: 800; }
footer { color: var(--muted); padding: 2rem; text-align: center; }
`;
}

function layoutSource(): string {
  return `import type { ReactNode } from "react";
import "./globals.css";
import { SiteShell } from "../components/site-shell";
import { siteContent } from "../lib/site-content";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteShell businessName={siteContent.businessName}>{children}</SiteShell>
      </body>
    </html>
  );
}
`;
}

function contentPageSource(
  key: "homepage" | "aboutPage" | "productsServicesPage" | "contactPage",
): string {
  return `import { ContentPage } from "../components/content-page";
import { siteContent } from "../lib/site-content";

export const metadata = {
  title: siteContent.${key}.title,
  description: siteContent.${key}.metaDescription,
};

export default function Page() {
  return <ContentPage page={siteContent.${key}} />;
}
`.replace(
    /from "\.\.\/components/g,
    key === "homepage" ? 'from "../components' : 'from "../../components',
  ).replace(
    /from "\.\.\/lib/g,
    key === "homepage" ? 'from "../lib' : 'from "../../lib',
  );
}

function faqPageSource(): string {
  return `import { FaqPage } from "../../components/faq-page";
import { siteContent } from "../../lib/site-content";

export const metadata = {
  title: siteContent.faqPage.title,
  description: siteContent.faqPage.metaDescription,
};

export default function Page() {
  return <FaqPage page={siteContent.faqPage} />;
}
`;
}

function siteShellSource(): string {
  return `import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  ["/", "Home"],
  ["/about", "About"],
  ["/services", "Services"],
  ["/contact", "Contact"],
  ["/faq", "FAQ"],
] as const;

export function SiteShell({ businessName, children }: { businessName: string; children: ReactNode }) {
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">{businessName}</Link>
        <nav aria-label="Main navigation">
          {links.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
      </header>
      <main>{children}</main>
      <footer><p>{businessName}. Review all generated copy before publishing.</p></footer>
    </>
  );
}
`;
}

function reusableContentPageSource(): string {
  return `interface ContentSection {
  heading: string;
  body: string;
  bullets: readonly string[];
}

interface ContentPageProps {
  page: {
    navigationLabel: string;
    headline: string;
    introduction: string;
    sections: readonly ContentSection[];
    callToAction: string;
  };
}

export function ContentPage({ page }: ContentPageProps) {
  return (
    <section className="page">
      <p className="eyebrow">{page.navigationLabel}</p>
      <h1>{page.headline}</h1>
      <p className="introduction">{page.introduction}</p>
      {page.sections.map((section) => (
        <article key={section.heading}>
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
          {section.bullets.length > 0 && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
        </article>
      ))}
      <p><a className="cta" href="/contact">{page.callToAction}</a></p>
    </section>
  );
}
`;
}

function reusableFaqPageSource(): string {
  return `interface FaqPageProps {
  page: {
    navigationLabel: string;
    headline: string;
    introduction: string;
    faqs: readonly { question: string; answer: string }[];
    callToAction: string;
  };
}

export function FaqPage({ page }: FaqPageProps) {
  return (
    <section className="page">
      <p className="eyebrow">{page.navigationLabel}</p>
      <h1>{page.headline}</h1>
      <p className="introduction">{page.introduction}</p>
      <div className="faq-list">
        {page.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
      </div>
      <p><a className="cta" href="/contact">{page.callToAction}</a></p>
    </section>
  );
}
`;
}

function plainTextCopy(content: ExportableWebsiteContent): string {
  return pageEntries(content)
    .map(([, page]) => [
      `# ${page.navigationLabel}`,
      page.headline,
      page.introduction,
      ...page.sections.flatMap((section) => [
        `## ${section.heading}`,
        section.body,
        ...section.bullets.map((bullet) => `- ${bullet}`),
      ]),
      ...("faqs" in page
        ? page.faqs.flatMap((faq) => [`## ${faq.question}`, faq.answer])
        : []),
      `CTA: ${page.callToAction}`,
    ].join("\n\n"))
    .join("\n\n---\n\n");
}

function pageEntries(
  content: ExportableWebsiteContent,
): [string, WebsitePage | WebsiteFaqPage][] {
  return [
    ["home", content.homepage],
    ["about", content.aboutPage],
    ["services", content.productsServicesPage],
    ["contact", content.contactPage],
    ["faq", content.faqPage],
  ];
}

function file(path: string, content: string) {
  return { path, content };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJsonForHtml(value: string): string {
  return value
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
