import { expect, test, type Page } from "@playwright/test";

import { createAuthenticatedProject, signUpTestUser } from "./auth-helpers";
import { vinylRecordStoreFixture } from "./private-beta-fixtures";

test.beforeEach(async ({ page }, testInfo) => {
  await signUpTestUser(page, testInfo);
  await page.evaluate(() => localStorage.clear());
  const projectId = await createAuthenticatedProject(page, {
    businessIdea: vinylRecordStoreFixture.idea,
    businessModel: vinylRecordStoreFixture.businessModel,
    city: vinylRecordStoreFixture.city,
    name: vinylRecordStoreFixture.name,
    state: vinylRecordStoreFixture.state,
  });
  await page.goto(`/project/${projectId}/builder`);
  await waitForBuilderDraftReady(page);
});

test("user can create a new project using Guided Mode", async ({ page }) => {
  await expect(page.getByText("Planning support only")).toBeVisible();
  await expect(page.getByText(/does not guarantee business success or funding/i)).toBeVisible();
  await page.getByRole("button", { name: "Start from scratch" }).click();
  await expect(page.getByRole("heading", { name: "Start with your idea" })).toBeVisible();
});

test("basic idea questions do not expose advanced fields", async ({ page }) => {
  await page.getByRole("button", { name: "Start from scratch" }).click();
  await expect(page.getByText("NAICS")).toHaveCount(0);
  await expect(page.getByText("What kind of business do you want to start?")).toBeVisible();
  await expect(page.getByText("Why we ask this")).toBeVisible();
});

test("unsure answer is accepted and builder keeps moving", async ({ page }) => {
  await page.getByRole("button", { name: "Start from scratch" }).click();
  await page.getByRole("button", { name: "I’m not sure yet" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Picture your first customer" })).toBeVisible();
});

test("sensitive pasted text is blocked and can be replaced", async ({ page }) => {
  await page.getByRole("button", { name: "Start from scratch" }).click();
  const ideaBox = page.locator(".vf-question-card textarea");
  await ideaBox.fill("I pasted my SSN 123-45-6789 by mistake.");
  await expect(page.getByText("Please remove private information")).toBeVisible();
  await expect(page.getByText(/Please remove sensitive information before saving/i)).toBeVisible();
  await expect(ideaBox).not.toHaveValue(/123-45-6789/);

  await ideaBox.fill("A safe neighborhood record shop idea.");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Picture your first customer" })).toBeVisible();
});

test("user can review the generated business profile", async ({ page }) => {
  await page.getByRole("button", { name: "Use an example business" }).click();
  await page.getByRole("button", { name: "Review" }).first().click();
  await expect(page.getByRole("heading", { name: "Review your business profile" })).toBeVisible();
  await expect(page.getByText("College students near ASU and local punk and metal fans")).toBeVisible();
});

test("user can generate a feasibility check from guided answers", async ({ page }) => {
  await page.getByRole("button", { name: "Use an example business" }).click();
  await page.getByRole("button", { name: "Idea check" }).click();
  await expect(page.getByText("Your first feasibility check")).toBeVisible();
  await expect(page.getByText(/proof|reliable|risk/i).first()).toBeVisible();
});

test("user can switch to Detailed Mode", async ({ page }) => {
  await page.getByRole("button", { name: "Use an example business" }).click();
  await page.getByRole("button", { name: "Detailed" }).click();
  await expect(page.getByRole("heading", { name: "Detailed Mode" })).toBeVisible();
  await expect(page.getByText("Structured answers")).toBeVisible();
});

test("empty state shows a helpful next action", async ({ page }) => {
  await page.getByRole("button", { name: "Start from scratch" }).click();
  await page.getByRole("button", { name: "Review" }).first().click();
  await expect(page.getByText("We still have a few blanks")).toBeVisible();
  await expect(page.getByText(/follow-up questions/i)).toBeVisible();
});

test("financial guided checklist creates a beginner estimate", async ({ page }) => {
  await page.getByRole("button", { name: "Use an example business" }).click();
  await page.getByRole("button", { name: "Money estimate" }).click();
  await expect(page.getByText("Simple monthly estimate", { exact: true })).toBeVisible();
  await expect(page.getByText("Break-even estimate")).toBeVisible();
});

test("state checklist responds to physical and employee flags", async ({ page }) => {
  await page.getByRole("button", { name: "Use an example business" }).click();
  await page.getByRole("button", { name: "Setup questions" }).click();
  await expect(page.getByText("Arizona setup checklist")).toBeVisible();
  await expect(page.getByText(/workers|employer|zoning/i).first()).toBeVisible();
});

test("setup questions allow a safe not-sure answer", async ({ page }) => {
  await page.getByRole("button", { name: "Use an example business" }).click();
  await page.getByRole("button", { name: "Setup questions" }).click();
  const employeeQuestion = page.locator(".vf-boolean-choice").filter({ hasText: "Will you have employees?" });
  await employeeQuestion.getByRole("button", { name: "Not sure yet" }).click();
  await expect(employeeQuestion.getByRole("button", { name: "Not sure yet" })).toHaveClass(/is-selected/);
});

test("website wizard reuses customer and positioning answers", async ({ page }) => {
  await page.getByRole("button", { name: "Use an example business" }).click();
  await page.getByRole("button", { name: "Website" }).click();
  await expect(page.getByText("Website starter", { exact: true })).toBeVisible();
  await expect(page.locator(".vf-website-preview").getByText(/punk|metal|local artists/i).first()).toBeVisible();
});

async function waitForBuilderDraftReady(page: Page) {
  await expect(page.getByText("Saved to your project").last()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Loading your draft")).toHaveCount(0);
}
