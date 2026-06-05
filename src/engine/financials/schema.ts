import { z } from "zod";

const optionalMoneySchema = z.number().finite().nonnegative().optional();
const optionalRateSchema = z.number().finite().min(0).max(1).optional();

export const FinancialValueSourceSchema = z.enum([
  "user_input",
  "placeholder_assumption",
  "calculated",
]);

export const RevenueStreamInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  monthlyRevenue: z.number().finite().nonnegative(),
  notes: z.string().default(""),
});

export const FundingSourceInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  amount: z.number().finite().nonnegative(),
  sourceType: z.enum(["owner_capital", "loan", "grant", "equity", "other"]),
  notes: z.string().default(""),
});

export const FinancialEngineInputSchema = z.object({
  startupCosts: optionalMoneySchema,
  fixedMonthlyCosts: optionalMoneySchema,
  variableCosts: optionalMoneySchema,
  pricePerUnitService: optionalMoneySchema,
  expectedUnitSales: optionalMoneySchema,
  expectedRevenueStreams: z.array(RevenueStreamInputSchema).default([]),
  grossMarginAssumptions: optionalRateSchema,
  payroll: optionalMoneySchema,
  rent: optionalMoneySchema,
  utilities: optionalMoneySchema,
  insurance: optionalMoneySchema,
  licenses: optionalMoneySchema,
  equipment: optionalMoneySchema,
  inventory: optionalMoneySchema,
  marketing: optionalMoneySchema,
  loanPayments: optionalMoneySchema,
  ownerDraw: optionalMoneySchema,
  taxEstimatePlaceholder: optionalRateSchema,
  availableOwnerCapital: optionalMoneySchema,
  fundingSources: z.array(FundingSourceInputSchema).default([]),
  openingCash: optionalMoneySchema,
  monthlyGrowthRate: optionalRateSchema,
  annualGrowthRate: optionalRateSchema,
});

export const EditableFinancialAssumptionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.number().finite().nonnegative(),
  source: FinancialValueSourceSchema.exclude(["calculated"]),
  isPlaceholder: z.boolean(),
  notes: z.string().min(1),
});

export const TraceableFinancialRowSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  amount: z.number().finite(),
  formula: z.string().min(1),
  source: FinancialValueSourceSchema,
  isPlaceholder: z.boolean(),
  editableAssumptionKeys: z.array(z.string()),
  notes: z.string().optional(),
});

export const MonthlyProfitLossRowSchema = z.object({
  month: z.number().int().min(1).max(12),
  unitSales: z.number().finite().nonnegative(),
  revenue: z.number().finite(),
  costOfGoodsSold: z.number().finite(),
  grossProfit: z.number().finite(),
  fixedOperatingCosts: z.number().finite(),
  preTaxIncome: z.number().finite(),
  estimatedTaxes: z.number().finite(),
  netIncome: z.number().finite(),
  formulas: z.object({
    revenue: z.string().min(1),
    costOfGoodsSold: z.string().min(1),
    grossProfit: z.string().min(1),
    preTaxIncome: z.string().min(1),
    estimatedTaxes: z.string().min(1),
    netIncome: z.string().min(1),
  }),
});

export const ThreeYearForecastRowSchema = z.object({
  year: z.number().int().min(1).max(3),
  revenue: z.number().finite(),
  costOfGoodsSold: z.number().finite(),
  grossProfit: z.number().finite(),
  fixedOperatingCosts: z.number().finite(),
  estimatedTaxes: z.number().finite(),
  netIncome: z.number().finite(),
  formula: z.string().min(1),
});

export const CashFlowForecastRowSchema = z.object({
  month: z.number().int().min(1).max(12),
  openingCash: z.number().finite(),
  netCashFlow: z.number().finite(),
  endingCash: z.number().finite(),
  formula: z.string().min(1),
});

export const FinancialMetricSchema = z.object({
  value: z.number().finite().nullable(),
  formula: z.string().min(1),
  source: FinancialValueSourceSchema,
  isPlaceholder: z.boolean(),
  editableAssumptionKeys: z.array(z.string()),
  notes: z.string().optional(),
});

export const BreakEvenAnalysisSchema = z.object({
  contributionMarginPerUnit: z.number().finite(),
  fixedMonthlyCosts: z.number().finite(),
  offsettingRevenueStreams: z.number().finite(),
  breakEvenUnits: z.number().finite().nonnegative().nullable(),
  breakEvenRevenue: z.number().finite().nonnegative().nullable(),
  formula: z.string().min(1),
  editableAssumptionKeys: z.array(z.string()),
  notes: z.string().min(1),
});

export const ScenarioForecastSchema = z.object({
  name: z.enum(["conservative", "expected", "optimistic"]),
  unitSalesMultiplier: z.number().finite().nonnegative(),
  monthlyRevenue: z.number().finite(),
  monthlyExpenses: z.number().finite(),
  monthlyNetIncome: z.number().finite(),
  formula: z.string().min(1),
});

export const SensitivityAnalysisRowSchema = z.object({
  assumption: z.string().min(1),
  caseLabel: z.string().min(1),
  value: z.number().finite(),
  monthlyNetIncome: z.number().finite(),
  formula: z.string().min(1),
});

export const FinancialProjectionSchema = z.object({
  editableAssumptions: z.array(EditableFinancialAssumptionSchema),
  startupCostTable: z.array(TraceableFinancialRowSchema),
  useOfFundsTable: z.array(TraceableFinancialRowSchema),
  sourceOfFundsTable: z.array(TraceableFinancialRowSchema),
  monthlyProfitLoss12Months: z.array(MonthlyProfitLossRowSchema).length(12),
  threeYearForecast: z.array(ThreeYearForecastRowSchema).length(3),
  cashFlowForecast: z.array(CashFlowForecastRowSchema).length(12),
  breakEvenAnalysis: BreakEvenAnalysisSchema,
  grossMargin: FinancialMetricSchema,
  netMargin: FinancialMetricSchema,
  runway: FinancialMetricSchema,
  fundingGap: FinancialMetricSchema,
  conservativeScenario: ScenarioForecastSchema,
  expectedScenario: ScenarioForecastSchema,
  optimisticScenario: ScenarioForecastSchema,
  sensitivityAnalysis: z.array(SensitivityAnalysisRowSchema),
  assumptionsNarrative: z.string().min(1),
});

export type FinancialEngineInput = z.input<typeof FinancialEngineInputSchema>;
export type NormalizedFinancialEngineInput = z.output<
  typeof FinancialEngineInputSchema
>;
export type EditableFinancialAssumption = z.infer<
  typeof EditableFinancialAssumptionSchema
>;
export type TraceableFinancialRow = z.infer<typeof TraceableFinancialRowSchema>;
export type MonthlyProfitLossRow = z.infer<typeof MonthlyProfitLossRowSchema>;
export type ThreeYearForecastRow = z.infer<typeof ThreeYearForecastRowSchema>;
export type CashFlowForecastRow = z.infer<typeof CashFlowForecastRowSchema>;
export type FinancialMetric = z.infer<typeof FinancialMetricSchema>;
export type BreakEvenAnalysis = z.infer<typeof BreakEvenAnalysisSchema>;
export type ScenarioForecast = z.infer<typeof ScenarioForecastSchema>;
export type SensitivityAnalysisRow = z.infer<typeof SensitivityAnalysisRowSchema>;
export type FinancialProjection = z.infer<typeof FinancialProjectionSchema>;
