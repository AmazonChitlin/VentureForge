import {
  engineResultSchema,
  type EngineResult,
} from "@/engine/shared/engine-result";

import {
  FinancialEngineInputSchema,
  FinancialProjectionSchema,
  type EditableFinancialAssumption,
  type FinancialEngineInput,
  type FinancialMetric,
  type FinancialProjection,
  type NormalizedFinancialEngineInput,
  type ScenarioForecast,
  type SensitivityAnalysisRow,
  type TraceableFinancialRow,
} from "./schema";

const CPA_REVIEW_WARNING =
  "Financial projections are estimates and should be reviewed by a CPA or bookkeeper before they are used for business decisions, loan applications, or tax planning.";

type InputMoneyKey =
  | "startupCosts"
  | "fixedMonthlyCosts"
  | "variableCosts"
  | "pricePerUnitService"
  | "expectedUnitSales"
  | "payroll"
  | "rent"
  | "utilities"
  | "insurance"
  | "licenses"
  | "equipment"
  | "inventory"
  | "marketing"
  | "loanPayments"
  | "ownerDraw"
  | "availableOwnerCapital"
  | "openingCash";

type InputRateKey =
  | "grossMarginAssumptions"
  | "taxEstimatePlaceholder"
  | "monthlyGrowthRate"
  | "annualGrowthRate";

type ResolvedAssumption = EditableFinancialAssumption;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sum(values: number[]): number {
  return roundMoney(values.reduce((total, value) => total + value, 0));
}

function formatMoney(value: number): string {
  return `$${roundMoney(value).toFixed(2)}`;
}

function resolveAssumption(
  input: NormalizedFinancialEngineInput,
  key: InputMoneyKey | InputRateKey,
  label: string,
  placeholderValue: number,
  placeholderReason: string,
): ResolvedAssumption {
  const inputValue = input[key];
  const isPlaceholder = inputValue === undefined;
  const value = isPlaceholder ? placeholderValue : inputValue;

  return {
    key,
    label,
    value,
    source: isPlaceholder ? "placeholder_assumption" : "user_input",
    isPlaceholder,
    notes: isPlaceholder
      ? `Placeholder used: ${placeholderReason}`
      : "Provided by the user and editable.",
  };
}

function row(
  key: string,
  label: string,
  amount: number,
  formula: string,
  editableAssumptionKeys: string[],
  assumptions: ResolvedAssumption[],
  notes?: string,
): TraceableFinancialRow {
  const relatedAssumptions = assumptions.filter((assumption) =>
    editableAssumptionKeys.includes(assumption.key),
  );
  const isPlaceholder = relatedAssumptions.some(
    (assumption) => assumption.isPlaceholder,
  );

  return {
    key,
    label,
    amount: roundMoney(amount),
    formula,
    source:
      editableAssumptionKeys.length === 1
        ? relatedAssumptions[0]?.source ?? "calculated"
        : "calculated",
    isPlaceholder,
    editableAssumptionKeys,
    notes,
  };
}

function metric(
  value: number | null,
  formula: string,
  editableAssumptionKeys: string[],
  assumptions: ResolvedAssumption[],
  notes?: string,
): FinancialMetric {
  return {
    value: value === null ? null : roundMoney(value),
    formula,
    source: "calculated",
    isPlaceholder: assumptions.some(
      (assumption) =>
        editableAssumptionKeys.includes(assumption.key) &&
        assumption.isPlaceholder,
    ),
    editableAssumptionKeys,
    notes,
  };
}

function monthlyScenario(
  name: ScenarioForecast["name"],
  unitSalesMultiplier: number,
  expectedUnitSales: number,
  pricePerUnit: number,
  variableCostPerUnit: number,
  additionalRevenue: number,
  fixedOperatingCosts: number,
  taxRate: number,
): ScenarioForecast {
  const unitSales = expectedUnitSales * unitSalesMultiplier;
  const monthlyRevenue = roundMoney(unitSales * pricePerUnit + additionalRevenue);
  const costOfGoodsSold = roundMoney(unitSales * variableCostPerUnit);
  const preTaxIncome = roundMoney(
    monthlyRevenue - costOfGoodsSold - fixedOperatingCosts,
  );
  const tax = roundMoney(Math.max(0, preTaxIncome) * taxRate);

  return {
    name,
    unitSalesMultiplier,
    monthlyRevenue,
    monthlyExpenses: roundMoney(costOfGoodsSold + fixedOperatingCosts + tax),
    monthlyNetIncome: roundMoney(preTaxIncome - tax),
    formula:
      "monthly net income = ((expected unit sales x scenario multiplier x price per unit) + other revenue streams) - (scenario units x variable cost per unit) - fixed operating costs - estimated taxes",
  };
}

function buildSensitivityRows(
  expectedUnitSales: number,
  pricePerUnit: number,
  variableCostPerUnit: number,
  additionalRevenue: number,
  fixedOperatingCosts: number,
  rent: number,
  taxRate: number,
): SensitivityAnalysisRow[] {
  const netIncome = (sales: number, testedRent: number): number => {
    const revenue = sales * pricePerUnit + additionalRevenue;
    const variableCosts = sales * variableCostPerUnit;
    const adjustedFixedCosts = fixedOperatingCosts - rent + testedRent;
    const preTaxIncome = revenue - variableCosts - adjustedFixedCosts;
    return roundMoney(preTaxIncome - Math.max(0, preTaxIncome) * taxRate);
  };

  return [
    {
      assumption: "expectedUnitSales",
      caseLabel: "sales volume -20%",
      value: roundQuantity(expectedUnitSales * 0.8),
      monthlyNetIncome: netIncome(expectedUnitSales * 0.8, rent),
      formula:
        "monthly net income recalculated with expected unit sales x 0.80",
    },
    {
      assumption: "expectedUnitSales",
      caseLabel: "sales volume +20%",
      value: roundQuantity(expectedUnitSales * 1.2),
      monthlyNetIncome: netIncome(expectedUnitSales * 1.2, rent),
      formula:
        "monthly net income recalculated with expected unit sales x 1.20",
    },
    {
      assumption: "rent",
      caseLabel: "rent +20%",
      value: roundMoney(rent * 1.2),
      monthlyNetIncome: netIncome(expectedUnitSales, rent * 1.2),
      formula: "monthly net income recalculated with rent x 1.20",
    },
    {
      assumption: "variableCosts",
      caseLabel: "variable cost +20%",
      value: roundMoney(variableCostPerUnit * 1.2),
      monthlyNetIncome: (() => {
        const revenue = expectedUnitSales * pricePerUnit + additionalRevenue;
        const preTaxIncome =
          revenue -
          expectedUnitSales * variableCostPerUnit * 1.2 -
          fixedOperatingCosts;
        return roundMoney(
          preTaxIncome - Math.max(0, preTaxIncome) * taxRate,
        );
      })(),
      formula:
        "monthly net income recalculated with variable cost per unit x 1.20",
    },
  ];
}

export class FinancialEngine {
  static generate(input: FinancialEngineInput): EngineResult<FinancialProjection> {
    const parsedInput = FinancialEngineInputSchema.parse(input);
    const assumptions: ResolvedAssumption[] = [];
    const warnings = [CPA_REVIEW_WARNING];

    const equipment = resolveAssumption(
      parsedInput,
      "equipment",
      "Equipment startup cost",
      0,
      "enter expected equipment purchases before committing funds.",
    );
    const inventory = resolveAssumption(
      parsedInput,
      "inventory",
      "Opening inventory startup cost",
      0,
      "enter opening inventory needs if the business holds stock.",
    );
    const licenses = resolveAssumption(
      parsedInput,
      "licenses",
      "License and permit startup cost",
      0,
      "verify required licenses and filing costs with official agencies.",
    );
    assumptions.push(equipment, inventory, licenses);

    const itemizedStartupCosts = sum([
      equipment.value,
      inventory.value,
      licenses.value,
    ]);
    const startupCosts = resolveAssumption(
      parsedInput,
      "startupCosts",
      "Total startup costs",
      Math.max(itemizedStartupCosts, 5_000),
      "a $5,000 minimum planning reserve is used until startup costs are itemized.",
    );
    assumptions.push(startupCosts);

    const totalStartupCosts = Math.max(startupCosts.value, itemizedStartupCosts);
    if (startupCosts.value < itemizedStartupCosts) {
      warnings.push(
        "The stated total startup cost is lower than equipment, inventory, and licensing costs combined. The projection uses the itemized total so those costs are not omitted.",
      );
    }

    const payroll = resolveAssumption(
      parsedInput,
      "payroll",
      "Monthly payroll",
      0,
      "enter payroll when staffing needs are known.",
    );
    const rent = resolveAssumption(
      parsedInput,
      "rent",
      "Monthly rent",
      0,
      "enter rent after confirming the operating model and location.",
    );
    const utilities = resolveAssumption(
      parsedInput,
      "utilities",
      "Monthly utilities",
      0,
      "enter utilities after confirming the location and equipment needs.",
    );
    const insurance = resolveAssumption(
      parsedInput,
      "insurance",
      "Monthly insurance",
      0,
      "request insurance quotes for the planned business model.",
    );
    const marketing = resolveAssumption(
      parsedInput,
      "marketing",
      "Monthly marketing",
      0,
      "enter a monthly acquisition and retention budget.",
    );
    const loanPayments = resolveAssumption(
      parsedInput,
      "loanPayments",
      "Monthly loan payments",
      0,
      "add estimated payments after a financing structure is chosen.",
    );
    const ownerDraw = resolveAssumption(
      parsedInput,
      "ownerDraw",
      "Monthly owner draw",
      0,
      "add the amount the founder expects to withdraw each month.",
    );
    assumptions.push(
      payroll,
      rent,
      utilities,
      insurance,
      marketing,
      loanPayments,
      ownerDraw,
    );

    const itemizedFixedOperatingCosts = sum([
      payroll.value,
      rent.value,
      utilities.value,
      insurance.value,
      marketing.value,
      loanPayments.value,
      ownerDraw.value,
    ]);
    const fixedMonthlyCosts = resolveAssumption(
      parsedInput,
      "fixedMonthlyCosts",
      "Total fixed monthly operating costs",
      itemizedFixedOperatingCosts > 0 ? itemizedFixedOperatingCosts : 1_000,
      "a $1,000 planning reserve is used until recurring costs are itemized.",
    );
    assumptions.push(fixedMonthlyCosts);

    const totalFixedOperatingCosts = Math.max(
      fixedMonthlyCosts.value,
      itemizedFixedOperatingCosts,
    );
    if (fixedMonthlyCosts.value < itemizedFixedOperatingCosts) {
      warnings.push(
        "The stated total fixed monthly cost is lower than the itemized recurring costs. The projection uses the itemized total so recurring expenses are not omitted.",
      );
    }

    const pricePerUnit = resolveAssumption(
      parsedInput,
      "pricePerUnitService",
      "Price per unit or service",
      100,
      "replace the $100 starting point with a tested selling price.",
    );
    const expectedUnitSales = resolveAssumption(
      parsedInput,
      "expectedUnitSales",
      "Expected monthly unit or service sales",
      10,
      "replace the 10-unit starting point with a demand estimate.",
    );
    const grossMarginAssumption = resolveAssumption(
      parsedInput,
      "grossMarginAssumptions",
      "Gross margin assumption",
      0.65,
      "a 65% gross margin is used until unit economics are entered.",
    );
    assumptions.push(pricePerUnit, expectedUnitSales, grossMarginAssumption);

    const derivedVariableCostPlaceholder = roundMoney(
      pricePerUnit.value * (1 - grossMarginAssumption.value),
    );
    const variableCost = resolveAssumption(
      parsedInput,
      "variableCosts",
      "Variable cost per unit or service",
      derivedVariableCostPlaceholder,
      "variable cost is derived from price per unit x (1 - gross margin assumption).",
    );
    assumptions.push(variableCost);

    if (
      parsedInput.variableCosts !== undefined &&
      parsedInput.grossMarginAssumptions !== undefined &&
      pricePerUnit.value > 0
    ) {
      const derivedGrossMargin =
        (pricePerUnit.value - variableCost.value) / pricePerUnit.value;
      if (Math.abs(derivedGrossMargin - grossMarginAssumption.value) > 0.05) {
        warnings.push(
          "The entered variable cost and gross margin assumption differ by more than five percentage points. Unit economics use the variable cost per unit; review both assumptions.",
        );
      }
    }

    const taxRate = resolveAssumption(
      parsedInput,
      "taxEstimatePlaceholder",
      "Estimated tax rate placeholder",
      0.15,
      "a 15% placeholder is used only for planning and is not tax advice.",
    );
    const monthlyGrowthRate = resolveAssumption(
      parsedInput,
      "monthlyGrowthRate",
      "Monthly sales growth rate",
      0,
      "sales remain flat until a growth assumption is entered.",
    );
    const annualGrowthRate = resolveAssumption(
      parsedInput,
      "annualGrowthRate",
      "Annual growth rate after year one",
      0.05,
      "a 5% annual planning assumption is used for years two and three.",
    );
    const availableOwnerCapital = resolveAssumption(
      parsedInput,
      "availableOwnerCapital",
      "Available owner capital",
      0,
      "enter cash the founder is prepared to contribute.",
    );
    assumptions.push(
      taxRate,
      monthlyGrowthRate,
      annualGrowthRate,
      availableOwnerCapital,
    );

    const additionalRevenueStreams = sum(
      parsedInput.expectedRevenueStreams.map((stream) => stream.monthlyRevenue),
    );
    const outsideFunding = sum(
      parsedInput.fundingSources.map((source) => source.amount),
    );
    const totalSourcesOfFunds = sum([
      availableOwnerCapital.value,
      outsideFunding,
    ]);

    const openingCash = resolveAssumption(
      parsedInput,
      "openingCash",
      "Opening operating cash",
      totalSourcesOfFunds,
      "opening cash defaults to listed owner capital and funding sources.",
    );
    assumptions.push(openingCash);

    const startupRemainder = roundMoney(totalStartupCosts - itemizedStartupCosts);
    const startupCostTable = [
      row(
        "equipment",
        "Equipment",
        equipment.value,
        "equipment startup cost = equipment input",
        ["equipment"],
        assumptions,
      ),
      row(
        "inventory",
        "Opening inventory",
        inventory.value,
        "opening inventory startup cost = inventory input",
        ["inventory"],
        assumptions,
      ),
      row(
        "licenses",
        "Licenses and permits",
        licenses.value,
        "license startup cost = licenses input",
        ["licenses"],
        assumptions,
      ),
      row(
        "otherStartupCosts",
        "Other or unallocated startup costs",
        startupRemainder,
        "other startup costs = reconciled total startup costs - equipment - inventory - licenses",
        ["startupCosts", "equipment", "inventory", "licenses"],
        assumptions,
      ),
    ];
    const useOfFundsTable = startupCostTable.map((entry) => ({
      ...entry,
      notes: entry.notes ?? "Editable startup use of funds.",
    }));
    const sourceOfFundsTable = [
      row(
        "availableOwnerCapital",
        "Available owner capital",
        availableOwnerCapital.value,
        "owner contribution = available owner capital input",
        ["availableOwnerCapital"],
        assumptions,
      ),
      ...parsedInput.fundingSources.map((source) => ({
        key: `fundingSource:${source.id}`,
        label: source.name,
        amount: roundMoney(source.amount),
        formula: `funding source amount = ${source.name} input`,
        source: "user_input" as const,
        isPlaceholder: false,
        editableAssumptionKeys: [`fundingSources.${source.id}.amount`],
        notes: source.notes || `Funding type: ${source.sourceType}.`,
      })),
    ];

    const monthlyProfitLoss12Months = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const unitSales = roundQuantity(
        expectedUnitSales.value * (1 + monthlyGrowthRate.value) ** index,
      );
      const revenue = roundMoney(
        unitSales * pricePerUnit.value + additionalRevenueStreams,
      );
      const costOfGoodsSold = roundMoney(unitSales * variableCost.value);
      const grossProfit = roundMoney(revenue - costOfGoodsSold);
      const preTaxIncome = roundMoney(grossProfit - totalFixedOperatingCosts);
      const estimatedTaxes = roundMoney(Math.max(0, preTaxIncome) * taxRate.value);
      const netIncome = roundMoney(preTaxIncome - estimatedTaxes);

      return {
        month,
        unitSales,
        revenue,
        costOfGoodsSold,
        grossProfit,
        fixedOperatingCosts: totalFixedOperatingCosts,
        preTaxIncome,
        estimatedTaxes,
        netIncome,
        formulas: {
          revenue:
            "revenue = (month unit sales x price per unit) + expected revenue streams",
          costOfGoodsSold:
            "cost of goods sold = month unit sales x variable cost per unit",
          grossProfit: "gross profit = revenue - cost of goods sold",
          preTaxIncome:
            "pre-tax income = gross profit - fixed monthly operating costs",
          estimatedTaxes:
            "estimated taxes = max(0, pre-tax income) x tax estimate placeholder",
          netIncome: "net income = pre-tax income - estimated taxes",
        },
      };
    });

    const initialOperatingCash = roundMoney(openingCash.value - totalStartupCosts);
    let currentCash = initialOperatingCash;
    const cashFlowForecast = monthlyProfitLoss12Months.map((month) => {
      const beginningCash = currentCash;
      currentCash = roundMoney(beginningCash + month.netIncome);
      return {
        month: month.month,
        openingCash: beginningCash,
        netCashFlow: month.netIncome,
        endingCash: currentCash,
        formula:
          month.month === 1
            ? "month 1 ending cash = (opening cash - startup costs) + month 1 net income"
            : "ending cash = prior month ending cash + current month net income",
      };
    });

    const yearOne = monthlyProfitLoss12Months.reduce(
      (total, month) => ({
        revenue: total.revenue + month.revenue,
        costOfGoodsSold: total.costOfGoodsSold + month.costOfGoodsSold,
        grossProfit: total.grossProfit + month.grossProfit,
        fixedOperatingCosts:
          total.fixedOperatingCosts + month.fixedOperatingCosts,
        estimatedTaxes: total.estimatedTaxes + month.estimatedTaxes,
        netIncome: total.netIncome + month.netIncome,
      }),
      {
        revenue: 0,
        costOfGoodsSold: 0,
        grossProfit: 0,
        fixedOperatingCosts: 0,
        estimatedTaxes: 0,
        netIncome: 0,
      },
    );
    const threeYearForecast = Array.from({ length: 3 }, (_, index) => {
      const growthMultiplier = (1 + annualGrowthRate.value) ** index;
      const revenue = roundMoney(yearOne.revenue * growthMultiplier);
      const costOfGoodsSold = roundMoney(
        yearOne.costOfGoodsSold * growthMultiplier,
      );
      const grossProfit = roundMoney(revenue - costOfGoodsSold);
      const fixedOperatingCosts = roundMoney(
        yearOne.fixedOperatingCosts * growthMultiplier,
      );
      const preTaxIncome = roundMoney(grossProfit - fixedOperatingCosts);
      const estimatedTaxes = roundMoney(Math.max(0, preTaxIncome) * taxRate.value);
      return {
        year: index + 1,
        revenue,
        costOfGoodsSold,
        grossProfit,
        fixedOperatingCosts,
        estimatedTaxes,
        netIncome: roundMoney(preTaxIncome - estimatedTaxes),
        formula:
          index === 0
            ? "year 1 = sum of the 12-month forecast"
            : `year ${index + 1} = year 1 values x (1 + annual growth rate)^${index}`,
      };
    });

    const baselineRevenue = monthlyProfitLoss12Months[0].revenue;
    const baselineGrossProfit = monthlyProfitLoss12Months[0].grossProfit;
    const baselineNetIncome = monthlyProfitLoss12Months[0].netIncome;
    const contributionMarginPerUnit = roundMoney(
      pricePerUnit.value - variableCost.value,
    );
    const uncoveredFixedCosts = Math.max(
      0,
      totalFixedOperatingCosts - additionalRevenueStreams,
    );
    const canCalculateBreakEven = contributionMarginPerUnit > 0;
    const breakEvenUnits = canCalculateBreakEven
      ? Math.ceil(uncoveredFixedCosts / contributionMarginPerUnit)
      : null;
    const breakEvenRevenue =
      breakEvenUnits === null
        ? null
        : roundMoney(
            breakEvenUnits * pricePerUnit.value + additionalRevenueStreams,
          );

    if (!canCalculateBreakEven) {
      warnings.push(
        "Break-even cannot be calculated until price per unit is greater than variable cost per unit.",
      );
    }

    const monthlyBurn = Math.max(0, -baselineNetIncome);
    const runwayValue =
      monthlyBurn > 0
        ? roundMoney(Math.max(0, initialOperatingCash) / monthlyBurn)
        : null;
    const fundingGapValue = roundMoney(
      Math.max(0, totalStartupCosts - totalSourcesOfFunds),
    );

    const conservativeScenario = monthlyScenario(
      "conservative",
      0.75,
      expectedUnitSales.value,
      pricePerUnit.value,
      variableCost.value,
      additionalRevenueStreams,
      totalFixedOperatingCosts,
      taxRate.value,
    );
    const expectedScenario = monthlyScenario(
      "expected",
      1,
      expectedUnitSales.value,
      pricePerUnit.value,
      variableCost.value,
      additionalRevenueStreams,
      totalFixedOperatingCosts,
      taxRate.value,
    );
    const optimisticScenario = monthlyScenario(
      "optimistic",
      1.25,
      expectedUnitSales.value,
      pricePerUnit.value,
      variableCost.value,
      additionalRevenueStreams,
      totalFixedOperatingCosts,
      taxRate.value,
    );

    const placeholderAssumptions = assumptions.filter(
      (assumption) => assumption.isPlaceholder,
    );
    if (placeholderAssumptions.length > 0) {
      warnings.push(
        `Placeholder assumptions are active for: ${placeholderAssumptions
          .map((assumption) => assumption.label)
          .join(", ")}.`,
      );
    }

    const placeholderRatio = placeholderAssumptions.length / assumptions.length;
    const confidence = Math.max(10, Math.round(100 - placeholderRatio * 75));
    const grossMarginValue =
      baselineRevenue > 0 ? baselineGrossProfit / baselineRevenue : 0;
    const netMarginValue =
      baselineRevenue > 0 ? baselineNetIncome / baselineRevenue : 0;

    const projection = FinancialProjectionSchema.parse({
      editableAssumptions: assumptions,
      startupCostTable,
      useOfFundsTable,
      sourceOfFundsTable,
      monthlyProfitLoss12Months,
      threeYearForecast,
      cashFlowForecast,
      breakEvenAnalysis: {
        contributionMarginPerUnit,
        fixedMonthlyCosts: totalFixedOperatingCosts,
        offsettingRevenueStreams: additionalRevenueStreams,
        breakEvenUnits,
        breakEvenRevenue,
        formula:
          "break-even units = ceil(max(0, fixed monthly operating costs - other revenue streams) / (price per unit - variable cost per unit))",
        editableAssumptionKeys: [
          "fixedMonthlyCosts",
          "pricePerUnitService",
          "variableCosts",
          "expectedRevenueStreams",
        ],
        notes: canCalculateBreakEven
          ? "Break-even is a planning estimate based on the current editable assumptions."
          : "Enter a selling price above variable cost to calculate break-even.",
      },
      grossMargin: metric(
        grossMarginValue,
        "gross margin = month 1 gross profit / month 1 revenue",
        ["pricePerUnitService", "expectedUnitSales", "variableCosts"],
        assumptions,
      ),
      netMargin: metric(
        netMarginValue,
        "net margin = month 1 net income / month 1 revenue",
        [
          "pricePerUnitService",
          "expectedUnitSales",
          "variableCosts",
          "fixedMonthlyCosts",
          "taxEstimatePlaceholder",
        ],
        assumptions,
      ),
      runway: metric(
        runwayValue,
        "runway months = max(0, opening cash - startup costs) / max(0, -month 1 net income)",
        ["openingCash", "startupCosts", "fixedMonthlyCosts"],
        assumptions,
        runwayValue === null
          ? "Baseline month-one cash flow is non-negative, so a finite burn-rate runway does not apply."
          : "Runway uses baseline month-one net income as the burn rate.",
      ),
      fundingGap: metric(
        fundingGapValue,
        "funding gap = max(0, reconciled total startup costs - owner capital - listed funding sources)",
        ["startupCosts", "availableOwnerCapital"],
        assumptions,
      ),
      conservativeScenario,
      expectedScenario,
      optimisticScenario,
      sensitivityAnalysis: buildSensitivityRows(
        expectedUnitSales.value,
        pricePerUnit.value,
        variableCost.value,
        additionalRevenueStreams,
        totalFixedOperatingCosts,
        rent.value,
        taxRate.value,
      ),
      assumptionsNarrative:
        `This editable projection reconciles ${formatMoney(totalStartupCosts)} in startup uses against ${formatMoney(totalSourcesOfFunds)} in listed sources. ` +
        `The baseline monthly model starts with ${roundQuantity(expectedUnitSales.value)} unit or service sales at ${formatMoney(pricePerUnit.value)} each, ${formatMoney(variableCost.value)} in variable cost per unit, and ${formatMoney(totalFixedOperatingCosts)} in fixed operating costs. ` +
        `${placeholderAssumptions.length} assumption${placeholderAssumptions.length === 1 ? " is" : "s are"} currently marked as placeholders and should be replaced with researched values.`,
    });

    return engineResultSchema(FinancialProjectionSchema).parse({
      data: projection,
      confidence,
      assumptions: assumptions.map(
        (assumption) =>
          `${assumption.label}: ${assumption.value}${assumption.isPlaceholder ? " (placeholder)" : " (user input)"}`,
      ),
      missingInformation: placeholderAssumptions.map(
        (assumption) => assumption.label,
      ),
      warnings,
      sources: [
        {
          id: "financial-user-assumptions",
          title: "Editable financial assumptions",
          sourceName: "Founder-provided inputs and labeled planning placeholders",
          sourceType: "user",
          notes:
            "Calculated values trace to editable assumptions. Placeholder assumptions must be replaced before relying on this projection.",
        },
      ],
      nextActions: [
        ...(placeholderAssumptions.length > 0
          ? ["Replace each labeled placeholder assumption with a researched value."]
          : []),
        "Review startup uses, recurring costs, unit economics, and tax assumptions with a CPA or bookkeeper.",
        "Test conservative sales assumptions before committing major startup funds.",
      ],
    });
  }
}
