import { z } from "zod";

import { BusinessConceptSchema } from "@/engine/concept/schema";
import { CustomerAnalysisSchema } from "@/engine/customer-analysis/schema";
import { StrategyRecommendationSchema } from "@/engine/strategy/schema";

const textSchema = z.string().trim().default("");
const stringListSchema = z.array(z.string().trim().min(1)).default([]);

export const WebsiteToneSchema = z.enum([
  "professional",
  "friendly",
  "luxury",
  "punk_edgy",
  "modern",
  "local_community",
  "industrial",
  "playful",
]);

export const WebsiteLocationSchema = z.object({
  city: textSchema,
  state: textSchema,
  zipCode: textSchema,
});

export const WebsiteContactInfoSchema = z.object({
  email: textSchema,
  phone: textSchema,
  address: textSchema,
});

export const WebsiteEngineInputSchema = z.object({
  businessName: textSchema,
  brandStyle: textSchema,
  targetCustomer: textSchema,
  productsServices: stringListSchema,
  location: WebsiteLocationSchema.default({
    city: "",
    state: "",
    zipCode: "",
  }),
  contactInfo: WebsiteContactInfoSchema.default({
    email: "",
    phone: "",
    address: "",
  }),
  hours: stringListSchema,
  tone: WebsiteToneSchema.default("professional"),
  callToAction: textSchema,
  valueProposition: textSchema,
  customerPainPoints: stringListSchema,
  differentiators: stringListSchema,
  seoKeywords: stringListSchema,
  localServiceArea: stringListSchema,
  businessConcept: BusinessConceptSchema,
  customerAnalysis: CustomerAnalysisSchema.optional(),
  marketingStrategy: StrategyRecommendationSchema.optional(),
  positioningStrategy: StrategyRecommendationSchema.optional(),
});

export const WebsiteContentSectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
  bullets: z.array(z.string()),
});

export const WebsitePageSchema = z.object({
  slug: z.string().min(1),
  navigationLabel: z.string().min(1),
  title: z.string().min(1),
  headline: z.string().min(1),
  introduction: z.string().min(1),
  sections: z.array(WebsiteContentSectionSchema),
  callToAction: z.string().min(1),
  metaDescription: z.string().min(1),
});

export const WebsiteFaqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  source: z.enum(["customer_objection", "business_input", "generated"]),
});

export const WebsiteFaqPageSchema = WebsitePageSchema.extend({
  faqs: z.array(WebsiteFaqItemSchema).min(1),
});

export const BrandVoiceGuideSchema = z.object({
  tone: WebsiteToneSchema,
  summary: z.string().min(1),
  traits: z.array(z.string()).min(1),
  wordsToUse: z.array(z.string()).min(1),
  wordsToAvoid: z.array(z.string()).min(1),
  writingGuidelines: z.array(z.string()).min(1),
});

export const WebsiteMetaDescriptionsSchema = z.object({
  homepage: z.string().min(1),
  about: z.string().min(1),
  productsServices: z.string().min(1),
  contact: z.string().min(1),
  faq: z.string().min(1),
});

export const WebsiteSocialBiosSchema = z.object({
  shortBio: z.string().min(1),
  instagramBio: z.string().min(1),
  facebookAbout: z.string().min(1),
  linkedInAbout: z.string().min(1),
});

export const StaticWebsiteExportSchema = z.object({
  html: z.string().min(1),
  css: z.string().min(1),
});

export const WebsiteExportFileSchema = z.object({
  path: z.string().min(1),
  content: z.string().min(1),
});

export const NextJsWebsiteExportSchema = z.object({
  files: z.array(WebsiteExportFileSchema).min(1),
});

export const CmsCopyBlockSchema = z.object({
  platform: z.enum(["Squarespace", "Wix", "Shopify", "WordPress"]),
  suggestedUse: z.string().min(1),
  content: z.string().min(1),
});

export const WebsiteCopyBlocksSchema = z.object({
  squarespace: CmsCopyBlockSchema,
  wix: CmsCopyBlockSchema,
  shopify: CmsCopyBlockSchema,
  wordpress: CmsCopyBlockSchema,
});

export const WebsitePackageSchema = z.object({
  businessName: z.string().min(1),
  homepage: WebsitePageSchema,
  aboutPage: WebsitePageSchema,
  productsServicesPage: WebsitePageSchema,
  contactPage: WebsitePageSchema,
  faqPage: WebsiteFaqPageSchema,
  localSeoTitle: z.string().min(1).nullable(),
  metaDescriptions: WebsiteMetaDescriptionsSchema,
  googleBusinessProfileDescription: z.string().min(1),
  socialBios: WebsiteSocialBiosSchema,
  brandVoiceGuide: BrandVoiceGuideSchema,
  localBusinessJsonLd: z.string().min(1).nullable(),
  staticExport: StaticWebsiteExportSchema,
  nextJsPageExport: NextJsWebsiteExportSchema,
  copyBlocks: WebsiteCopyBlocksSchema,
});

export type WebsiteTone = z.infer<typeof WebsiteToneSchema>;
export type WebsiteLocation = z.infer<typeof WebsiteLocationSchema>;
export type WebsiteContactInfo = z.infer<typeof WebsiteContactInfoSchema>;
export type WebsiteEngineInput = z.input<typeof WebsiteEngineInputSchema>;
export type NormalizedWebsiteEngineInput = z.output<
  typeof WebsiteEngineInputSchema
>;
export type WebsiteContentSection = z.infer<
  typeof WebsiteContentSectionSchema
>;
export type WebsitePage = z.infer<typeof WebsitePageSchema>;
export type WebsiteFaqItem = z.infer<typeof WebsiteFaqItemSchema>;
export type WebsiteFaqPage = z.infer<typeof WebsiteFaqPageSchema>;
export type BrandVoiceGuide = z.infer<typeof BrandVoiceGuideSchema>;
export type WebsiteMetaDescriptions = z.infer<
  typeof WebsiteMetaDescriptionsSchema
>;
export type WebsiteSocialBios = z.infer<typeof WebsiteSocialBiosSchema>;
export type StaticWebsiteExport = z.infer<typeof StaticWebsiteExportSchema>;
export type WebsiteExportFile = z.infer<typeof WebsiteExportFileSchema>;
export type NextJsWebsiteExport = z.infer<typeof NextJsWebsiteExportSchema>;
export type CmsCopyBlock = z.infer<typeof CmsCopyBlockSchema>;
export type WebsiteCopyBlocks = z.infer<typeof WebsiteCopyBlocksSchema>;
export type WebsitePackage = z.infer<typeof WebsitePackageSchema>;
