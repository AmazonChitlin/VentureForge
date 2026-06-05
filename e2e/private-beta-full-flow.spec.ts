import { expect, test, type Page } from "@playwright/test";

import {
  createAuthenticatedProject,
  signInTestUser,
  signUpTestUser,
} from "./auth-helpers";
import {
  foodTruckFixture,
  vinylRecordStoreFixture,
  type PrivateBetaBusinessFixture,
} from "./private-beta-fixtures";

const moduleRunOrder = [
  "concept",
  "market",
  "customers",
  "competitors",
  "feasibility",
  "strategy",
  "execution",
  "launch",
  "financials",
  "funding",
  "state",
  "risk",
  "plan",
  "website",
] as const;

test.describe("private beta full flow", () => {
  test.setTimeout(150_000);

  test("beginner guided flow reaches Markdown business-plan export", async ({ page }, testInfo) => {
    const email = await signUpTestUser(page, testInfo);
    const fixture = vinylRecordStoreFixture;

    const projectId = await createProjectFromUi(page, fixture);
    await completeGuidedBuilder(page, fixture);

    await expect(page.getByRole("heading", { name: "Review your business profile" })).toBeVisible();
    await expect(page.getByText(fixture.idea)).toBeVisible();
    await expect(page.getByText(/We still have a few blanks|follow-up questions/i).first()).toBeVisible();
    await waitForSavedDraft(page);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Review your business profile" })).toBeVisible();
    await expect(page.getByText(fixture.idea)).toBeVisible();

    const generatedProject = await runCoreModules(page, projectId);
    const marketUsesMock = Boolean(generatedProject.outputs.market?.data?.containsMockData);

    await page.goto(`/project/${projectId}/market`);
    await expect(page.getByRole("heading", { name: "Market Research" })).toBeVisible();
    if (marketUsesMock) {
      await expect(
        page.getByText(/sample data|mock data|Replace sample placeholders/i).first(),
      ).toBeVisible();
    }

    await page.goto(`/project/${projectId}/financials`);
    await expect(page.getByText(/Financial estimates only/i)).toBeVisible();
    await expect(page.getByText(/CPA|bookkeeper/i).first()).toBeVisible();

    await page.goto(`/project/${projectId}/funding`);
    await expect(page.getByText(/Final eligibility, approval, terms, and availability/i).first()).toBeVisible();

    await page.goto(`/project/${projectId}/state`);
    await expect(page.getByText(/Verify every state and local requirement/i).first()).toBeVisible();

    await page.goto(`/project/${projectId}/risk`);
    await expect(page.getByRole("heading", { name: "Things to Watch" })).toBeVisible();
    await expect(page.getByText(/Planning support only|does not guarantee/i).first()).toBeVisible();

    await page.goto(`/project/${projectId}/plan`);
    await expect(page.getByRole("heading", { name: "Business Plan" })).toBeVisible();
    await expect(page.getByText(/Planning support only/i).first()).toBeVisible();

    await page.goto(`/project/${projectId}/website`);
    await expect(page.locator(".vf-workspace-website-preview")).toBeVisible();

    await page.goto(`/project/${projectId}/traceability`);
    await expect(page.getByRole("heading", { name: "How your answers are used", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Business Concept" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Website Package" })).toBeVisible();
    await expect(page.getByText(/drafts ready/i)).toBeVisible();

    const markdown = await exportMarkdownBusinessPlan(page, projectId);
    expect(markdown).toContain("Executive Summary");
    expect(markdown).toContain("Assumptions");
    expect(markdown).toContain("Sources");
    expect(markdown).toMatch(/warnings/i);
    if (marketUsesMock) {
      expect(markdown).toMatch(/mock|sample data/i);
    }

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto(`/project/${projectId}/overview`);
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);

    await signInTestUser(page, email, "/dashboard");
    await expect(page.getByRole("heading", { name: fixture.name })).toBeVisible();
    await page.goto(`/project/${projectId}/overview`);
    await expect(page.getByRole("heading", { name: fixture.name })).toBeVisible();

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await signUpTestUser(page, {
      ...testInfo,
      title: `${testInfo.title} second account isolation`,
    });
    await page.goto(`/project/${projectId}/overview`);
    await expect(
      page.getByRole("heading", { name: /could not open that project|404/i }),
    ).toBeVisible();
  });

  test("food truck fixture drives health-department state checklist coverage", async ({ page }, testInfo) => {
    await signUpTestUser(page, testInfo);
    const projectId = await createAuthenticatedProject(page, {
      businessIdea: foodTruckFixture.idea,
      businessModel: foodTruckFixture.businessModel,
      city: foodTruckFixture.city,
      name: foodTruckFixture.name,
      state: foodTruckFixture.state,
    });

    const result = await runModule(page, projectId, "state");
    expect(JSON.stringify(result.project.outputs.state?.data)).toMatch(/health/i);
    expect(JSON.stringify(result.project.outputs.state?.data)).toMatch(/verify/i);

    await page.goto(`/project/${projectId}/state`);
    await expect(page.getByText(/health/i).first()).toBeVisible();
    await expect(page.getByText(/Verify every state and local requirement/i).first()).toBeVisible();
  });
});

async function createProjectFromUi(page: Page, fixture: PrivateBetaBusinessFixture) {
  await page.goto("/project/new");
  await page.getByLabel("Business name").fill(fixture.name);
  await page.getByLabel("Describe your idea").fill(fixture.idea);
  await page.getByText("Add location details now (optional)").click();
  await page.getByLabel("City").fill(fixture.city);
  await page.getByLabel("State code").fill(fixture.state);
  await page.getByLabel("How will customers buy?").selectOption(fixture.businessModel);
  await page.getByRole("button", { name: "Start step-by-step Builder" }).click();
  await expect(page.getByRole("heading", { name: "Let’s build your business step by step." })).toBeVisible();
  await expect(page.getByText(/Private beta/i).first()).toBeVisible();
  await expect(page.getByText(/Do not enter Social Security numbers/i).first()).toBeVisible();
  await waitForSavedDraft(page);
  const match = page.url().match(/\/project\/([^/]+)\/builder/);
  expect(match?.[1]).toBeTruthy();
  return match![1];
}

async function completeGuidedBuilder(page: Page, fixture: PrivateBetaBusinessFixture) {
  await waitForSavedDraft(page);
  await page.getByRole("button", { name: "Start from scratch" }).click();
  await answerTextStep(page, "Start with your idea", fixture.idea);
  await answerTextStep(page, "Picture your first customer", fixture.targetCustomer);

  await expect(page.getByRole("heading", { name: "Choose where the business happens" })).toBeVisible();
  await page.getByRole("button", { name: businessModelCardName(fixture.businessModel) }).click();
  await page.getByLabel("City").fill(fixture.city);
  await page.getByLabel("County").fill(fixture.county);
  await page.getByLabel("State").fill(fixture.state);
  await page.getByLabel("ZIP code").fill(fixture.zipCode);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Describe what you will sell" })).toBeVisible();
  await page.getByLabel("What will you sell?").fill(fixture.productOrService);
  await page.getByLabel("What problem does this solve for customers?").fill(fixture.customerProblem);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Find your practical edge" })).toBeVisible();
  await page.getByRole("button", { name: "I’m not sure yet" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Estimate what you need to open" })).toBeVisible();
  await page.getByLabel("Space deposit or setup").fill(fixture.startupCosts.space);
  await page.getByLabel("Equipment").fill(fixture.startupCosts.equipment);
  await page.getByLabel("Starting inventory").fill(fixture.startupCosts.inventory);
  await page.getByLabel("Other opening costs").fill(fixture.startupCosts.other);
  await page.getByLabel("Monthly rent, if any").fill(fixture.startupCosts.rent);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Make a simple money estimate" })).toBeVisible();
  await page.getByLabel("Price for one normal sale").fill(fixture.money.pricePerSale);
  await page.getByLabel("Normal sales each week").fill(fixture.money.weeklySales);
  await page.getByLabel("Money you can safely put in").fill(fixture.money.ownerCapital);
  await page.getByLabel("Outside money you may need").fill(fixture.money.desiredFunding);
  await page.getByLabel("Repay a loan").check();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Flag rules that may apply" })).toBeVisible();
  if (fixture.regulatedActivities.length) {
    for (const activity of fixture.regulatedActivities) {
      await page.getByLabel(activityLabel(activity)).check();
    }
  } else {
    await page.getByRole("button", { name: "I’m not sure yet" }).click();
  }
  await chooseBoolean(page, "Will you have employees?", fixture.hasEmployees);
  await chooseBoolean(page, "Will customers visit your location?", fixture.customersVisitLocation);
  await chooseBoolean(page, "Will you sell products?", fixture.sellsTaxableGoodsOrServices);
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

async function answerTextStep(page: Page, heading: string, value: string) {
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await page.locator(".vf-question-card textarea").fill(value);
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

async function chooseBoolean(page: Page, label: string, value: boolean | null) {
  const control = page.locator(".vf-boolean-choice").filter({ hasText: label });
  await control.getByRole("button", {
    name: value === true ? "Yes" : value === false ? "No" : "Not sure yet",
  }).click();
}

async function waitForSavedDraft(page: Page) {
  await expect(page.getByText("Saved to your project").last()).toBeVisible({ timeout: 10_000 });
}

async function runCoreModules(page: Page, projectId: string) {
  let project: any;
  for (const module of moduleRunOrder) {
    const result = await runModule(page, projectId, module);
    project = result.project;
  }
  return project;
}

async function runModule(page: Page, projectId: string, module: string) {
  const response = await page.request.post(`/api/projects/${projectId}/run`, {
    data: { module },
  });
  const payload = await response.json();
  expect(response.ok(), payload.error ?? `Could not run ${module}`).toBeTruthy();
  expect(payload.project.outputs[module], `${module} output should be persisted`).toBeTruthy();
  return payload;
}

async function exportMarkdownBusinessPlan(page: Page, projectId: string) {
  const response = await page.request.post(`/api/projects/${projectId}/exports`, {
    data: { type: "business_plan_markdown" },
  });
  const payload = await response.json();
  expect(response.ok(), payload.error ?? "Markdown export failed").toBeTruthy();
  const artifact = payload.artifacts?.[0];
  expect(artifact?.filename).toMatch(/business-plan.*\.md$/);
  expect(artifact?.encoding).toBe("utf8");
  return artifact.contents as string;
}

function businessModelCardName(model: PrivateBetaBusinessFixture["businessModel"]) {
  return {
    hybrid: "A mix of these",
    mobile: "I go to customers",
    online: "Mostly online",
    physical_location: "Customers visit me",
  }[model];
}

function activityLabel(activity: string) {
  return {
    alcohol: "Alcohol",
    childcare: "Childcare",
    construction: "Construction",
    food: "Food or drinks",
    health: "Health services",
    "professional services": "Licensed professional services",
    transportation: "Transportation",
  }[activity] ?? activity;
}
