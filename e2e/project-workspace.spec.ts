import { expect, test } from "@playwright/test";

import {
  createAuthenticatedProject,
  signUpTestUser,
} from "./auth-helpers";

test("dashboard lists account projects and opens a workspace", async ({ page }, testInfo) => {
  await signUpTestUser(page, testInfo);
  await page.goto("/project/new");
  await page.getByLabel("Business name").fill("Needle & Groove Records");
  await page.getByLabel("Describe your idea").fill("A neighborhood record store with curated vinyl and listening events.");
  await page.getByText("Add location details now (optional)").click();
  await page.getByLabel("City").fill("Tempe");
  await page.getByLabel("State code").fill("AZ");
  await page.getByRole("button", { name: "Start step-by-step Builder" }).click();
  await expect(page.getByRole("heading", { name: "Let’s build your business step by step." })).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Pick up where you left off." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Needle & Groove Records" })).toBeVisible();
  await page.getByRole("link", { name: "View details" }).first().click();
  await expect(page.getByRole("heading", { name: "Needle & Groove Records" })).toBeVisible();
  await expect(page.getByText("Recommended next action")).toBeVisible();
});

test("concept screen runs prerequisite engines and displays metadata", async ({ page }, testInfo) => {
  await signUpTestUser(page, testInfo);
  const projectId = await createAuthenticatedProject(page, {
    businessIdea: "A neighborhood record store with curated vinyl and listening events.",
    businessModel: "physical_location",
    city: "Tempe",
    name: "Needle & Groove Records",
    state: "AZ",
  });
  await page.goto(`/project/${projectId}/concept`);
  await page.getByRole("button", { name: "Build this draft" }).click();
  await expect(page.getByRole("heading", { name: "Here is what we found so far" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Business concept statement" })).toBeVisible();
  await expect(page.getByText(/confidence/).first()).toBeVisible();
  await expect(page.getByText("What we still need")).toBeVisible();
  await expect(page.getByText("What to double-check")).toBeVisible();
  await expect(page.getByText("Helpful next steps")).toBeVisible();
  await expect(page.getByText("Planning support only", { exact: true })).toBeVisible();
  await expect(page.getByText(/does not guarantee business success or funding/i)).toBeVisible();
});

test("state and website screens generate specialized output", async ({ page }, testInfo) => {
  await signUpTestUser(page, testInfo);
  const foodTruckId = await createAuthenticatedProject(page, {
    businessIdea: "A food truck selling tacos and drinks at events in Phoenix.",
    businessModel: "mobile",
    city: "Phoenix",
    name: "Desert Bites Food Truck",
    state: "AZ",
  });
  await page.goto(`/project/${foodTruckId}/state`);
  await page.getByRole("button", { name: "Build this draft" }).click();
  await expect(page.getByRole("heading", { name: "Setup checklist to verify" })).toBeVisible();
  await expect(page.getByText(/Verify every state and local requirement/i)).toBeVisible();
  await expect(page.getByText(/health/i).first()).toBeVisible();

  const recordStoreId = await createAuthenticatedProject(page, {
    businessIdea: "A neighborhood record store with curated vinyl and listening events.",
    businessModel: "physical_location",
    city: "Tempe",
    name: "Needle & Groove Records",
    state: "AZ",
  });
  await page.goto(`/project/${recordStoreId}/website`);
  await page.getByRole("button", { name: "Build this draft" }).click();
  await expect(page.locator(".vf-workspace-website-preview")).toBeVisible();
  await expect(page.getByText("Static HTML export")).toBeVisible();
});

test("user can create a project and land on editable intake", async ({ page }, testInfo) => {
  await signUpTestUser(page, testInfo);
  await page.goto("/project/new");
  await page.getByLabel("Business name").fill("Test Neighborhood Studio");
  await page.getByLabel("Describe your idea").fill("A small studio that helps neighborhood shops create simple product photos.");
  await page.getByText("Add location details now (optional)").click();
  await page.getByLabel("City").fill("Tempe");
  await page.getByLabel("State code").fill("AZ");
  await page.getByRole("button", { name: "Start step-by-step Builder" }).click();
  await expect(page.getByRole("heading", { name: "Let’s build your business step by step." })).toBeVisible();
});

test("traceability view shows the connected engine chain", async ({ page }, testInfo) => {
  await signUpTestUser(page, testInfo);
  const projectId = await createAuthenticatedProject(page, {
    businessIdea: "A neighborhood record store with curated vinyl and listening events.",
    businessModel: "physical_location",
    city: "Tempe",
    name: "Needle & Groove Records",
    state: "AZ",
  });
  await page.goto(`/project/${projectId}/traceability`);
  await expect(page.getByRole("heading", { name: "How your answers are used", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Founder Intake" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Business Concept" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Website Package" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Information used" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Later drafts that may change" }).first()).toBeVisible();
});

test("detailed answer form stays hidden until a founder asks for it", async ({ page }, testInfo) => {
  await signUpTestUser(page, testInfo);
  const projectId = await createAuthenticatedProject(page, {
    businessIdea: "A neighborhood record store with curated vinyl and listening events.",
    businessModel: "physical_location",
    city: "Tempe",
    name: "Needle & Groove Records",
    state: "AZ",
  });
  await page.goto(`/project/${projectId}/intake`);
  await expect(page.getByRole("heading", { name: "Detailed answers" })).toBeVisible();
  await expect(page.getByLabel("NAICS code guess (optional)")).not.toBeVisible();
  await page.getByText("Show the detailed answer form").click();
  await expect(page.getByLabel("NAICS code guess (optional)")).toBeVisible();
  await expect(page.getByText(/Optional government industry code/i)).toBeVisible();
});
