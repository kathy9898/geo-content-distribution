import { z } from "zod";

export const geoOptimizationOutputSchema = z.object({
  sourceGeoScore: z.number().min(0).max(100),
  geoScore: z.number().min(0).max(100),
  qualified: z.boolean(),
  title: z.string().min(1),
  summary: z.string().min(1),
  coreConclusion: z.string().min(1),
  bodyMarkdown: z.string().min(1),
  dimensionScores: z.array(z.object({
    key: z.string(),
    label: z.string(),
    layer: z.string(),
    weight: z.number().min(0).max(100),
    beforeScore: z.number().min(0).max(100),
    afterScore: z.number().min(0).max(100),
    note: z.string(),
  })).min(1),
  riskCheck: z.object({
    keywordStuffing: z.boolean(),
    overOptimization: z.boolean(),
    fabrication: z.boolean(),
    note: z.string(),
  }),
  supplementSuggestions: z.array(z.object({
    location: z.string(),
    suggestion: z.string(),
  })),
  changePreview: z.array(z.object({
    area: z.string(),
    before: z.string(),
    after: z.string(),
    reason: z.string(),
  })),
  entities: z.object({
    brandNames: z.array(z.string()),
    technicalTerms: z.array(z.string()),
    keyPeople: z.array(z.string()),
  }),
  qaPairs: z.array(z.object({ question: z.string(), answer: z.string() })),
  decisionScenarios: z.array(z.string()),
  evidence: z.array(z.object({
    type: z.enum(["data", "case", "source", "example"]),
    content: z.string(),
    source: z.string(),
  })),
  riskNotes: z.array(z.string()),
  improvementSuggestions: z.array(z.string()),
});

export const platformVariantOutputSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  bodyMarkdown: z.string().min(1),
  tags: z.array(z.string()),
  geoFidelityScore: z.number().min(0).max(100),
  platformToneScore: z.number().min(0).max(100),
  factualConsistencyScore: z.number().min(0).max(100),
  marketingRiskScore: z.number().min(0).max(100),
  riskNotes: z.array(z.string()),
});

export const humanizeOutputSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  bodyMarkdown: z.string().min(1),
  tags: z.array(z.string()),
  humanToneScore: z.number().min(0).max(100),
  geoFidelityScore: z.number().min(0).max(100),
  platformToneScore: z.number().min(0).max(100),
  factualConsistencyScore: z.number().min(0).max(100),
  changeSummary: z.array(z.string()),
  riskNotes: z.array(z.string()),
});

export const citationValidationOutputSchema = z.object({
  citationScore: z.number().min(1).max(10),
  citationProbabilityReason: z.string(),
  deductions: z.array(z.object({
    issue: z.string(),
    severity: z.enum(["low", "medium", "high"]),
    suggestion: z.string(),
  })),
  top3Improvements: z.array(z.object({
    target: z.string(),
    reason: z.string(),
    rewriteSuggestion: z.string(),
  })),
  likelyQuotedSections: z.array(z.string()),
  riskNotes: z.array(z.string()),
  triggerQueries: z.array(z.string()),
  summary: z.string(),
});

export type GeoOptimizationOutput = z.infer<typeof geoOptimizationOutputSchema>;
export type PlatformVariantOutput = z.infer<typeof platformVariantOutputSchema>;
export type HumanizeOutput = z.infer<typeof humanizeOutputSchema>;
export type CitationValidationOutput = z.infer<typeof citationValidationOutputSchema>;
