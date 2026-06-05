import type {
  WebsiteFaqPage,
  WebsitePackage,
  WebsitePage,
} from "@/engine/website";
import type { EngineResult } from "@/engine/shared/engine-result";
import { exportWarnings } from "@/exports/export-guardrails";
import { escapeHtml } from "@/exports/html-exporter";
import { safeFilename } from "@/exports/filename";
import type {
  ExportArtifact,
  ExportProvider,
  ExportTextFile,
} from "@/exports/export-provider";
import { buildZip } from "@/exports/zip-builder";

export interface StaticWebsiteBundle {
  filename: string;
  files: ExportTextFile[];
  zip: Uint8Array;
  warnings: string[];
}

export class StaticWebsiteExporter
  implements ExportProvider<EngineResult<WebsitePackage>>
{
  readonly id = "static-website-zip";
  readonly name = "Static website ZIP";

  async createArtifacts(
    input: EngineResult<WebsitePackage>,
  ): Promise<ExportArtifact[]> {
    const bundle = this.buildBundle(input);
    return [
      {
        filename: bundle.filename,
        mediaType: "application/zip",
        contents: bundle.zip,
      },
    ];
  }

  buildBundle(input: EngineResult<WebsitePackage>): StaticWebsiteBundle {
    const warnings = exportWarnings(input);
    const files = [
      pageFile("index.html", input.data, input.data.homepage, warnings),
      pageFile("about.html", input.data, input.data.aboutPage, warnings),
      pageFile(
        "services.html",
        input.data,
        input.data.productsServicesPage,
        warnings,
      ),
      pageFile("contact.html", input.data, input.data.contactPage, warnings),
      pageFile("faq.html", input.data, input.data.faqPage, warnings),
      {
        path: "styles.css",
        content: `${input.data.staticExport.css}\n${exportStyles}`,
      },
    ];
    return {
      filename: `${safeFilename(input.data.businessName, "ventureforge-site")}-static-website.zip`,
      files,
      zip: buildZip(files),
      warnings,
    };
  }
}

function pageFile(
  path: string,
  website: WebsitePackage,
  page: WebsitePage | WebsiteFaqPage,
  warnings: string[],
): ExportTextFile {
  const structuredData =
    path === "index.html" && website.localBusinessJsonLd
      ? `<script type="application/ld+json">${escapeJsonForHtml(website.localBusinessJsonLd)}</script>`
      : "";
  return {
    path,
    content: [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'self\'; img-src \'self\' data:; font-src \'self\'; base-uri \'none\'; form-action \'none\'">',
      `<title>${escapeHtml(page.title)}</title>`,
      `<meta name="description" content="${escapeHtml(page.metaDescription)}">`,
      '<link rel="stylesheet" href="styles.css">',
      structuredData,
      "</head>",
      "<body>",
      renderHeader(website.businessName),
      `<aside class="export-notice"><strong>Review before publishing.</strong> This generated site is an editable planning draft. Verify all claims, contact details, hours, pricing, and legal requirements.${warnings.length ? `<ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : ""}</aside>`,
      "<main>",
      `<p class="eyebrow">${escapeHtml(page.navigationLabel)}</p>`,
      `<h1>${escapeHtml(page.headline)}</h1>`,
      `<p class="introduction">${escapeHtml(page.introduction)}</p>`,
      ...page.sections.map(
        (section) =>
          `<article><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p>${section.bullets.length ? `<ul>${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}</article>`,
      ),
      ...("faqs" in page
        ? [
            `<div class="faq-list">${page.faqs.map((faq) => `<details><summary>${escapeHtml(faq.question)}</summary><p>${escapeHtml(faq.answer)}</p></details>`).join("")}</div>`,
          ]
        : []),
      `<p><a class="cta" href="contact.html">${escapeHtml(page.callToAction)}</a></p>`,
      "</main>",
      `<footer><p>${escapeHtml(website.businessName)}. Review all generated copy before publishing.</p></footer>`,
      "</body>",
      "</html>",
    ].join("\n"),
  };
}

function renderHeader(businessName: string): string {
  return [
    '<header class="site-header">',
    `<a class="brand" href="index.html">${escapeHtml(businessName)}</a>`,
    '<nav aria-label="Main navigation">',
    '<a href="index.html">Home</a>',
    '<a href="about.html">About</a>',
    '<a href="services.html">Services</a>',
    '<a href="contact.html">Contact</a>',
    '<a href="faq.html">FAQ</a>',
    "</nav>",
    "</header>",
  ].join("");
}

function escapeJsonForHtml(value: string): string {
  return value.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
}

const exportStyles = `
.export-notice { background: #fff9ec; border: 1px solid #efca84; color: #7c4b00; margin: 1rem auto; max-width: 74rem; padding: 0.8rem 1rem; }
.export-notice ul { margin-bottom: 0; }
`;

