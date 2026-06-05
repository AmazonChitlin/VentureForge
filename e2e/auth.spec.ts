import { expect, test } from "@playwright/test";

import {
  createAuthenticatedProject,
  signInTestUser,
  signUpTestUser,
} from "./auth-helpers";

test("unauthenticated users are redirected from the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  await expect(page.getByRole("heading", { name: "Open your saved business projects." })).toBeVisible();
});

test("unauthenticated users are redirected from project pages", async ({ page }) => {
  await page.goto("/project/not-a-real-project/overview");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  await expect(page.getByRole("heading", { name: "Open your saved business projects." })).toBeVisible();
});

test("logout prevents access to protected project routes", async ({ page }, testInfo) => {
  await signUpTestUser(page, testInfo);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
});

test("users cannot access another user's project by guessing the project ID", async ({ page }, testInfo) => {
  const userBEmail = await signUpTestUser(page, {
    ...testInfo,
    title: `${testInfo.title} owner b`,
  });
  const projectBId = await createAuthenticatedProject(page, {
    businessIdea: "A private food truck project owned by user B.",
    businessModel: "mobile",
    city: "Phoenix",
    name: "User B Private Food Truck",
    state: "AZ",
  });
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);

  await signUpTestUser(page, {
    ...testInfo,
    title: `${testInfo.title} attacker a`,
  });
  const projectAId = await createAuthenticatedProject(page, {
    businessIdea: "A visible record shop project owned by user A.",
    businessModel: "physical_location",
    city: "Tempe",
    name: "User A Visible Records",
    state: "AZ",
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "User A Visible Records" })).toBeVisible();
  await expect(page.getByText("User B Private Food Truck")).toHaveCount(0);

  await expectNoProjectAccess(page.request.get(`/api/projects/${projectBId}`));
  await expectNoProjectAccess(page.request.patch(`/api/projects/${projectBId}`, {
    data: { name: "User A tried to rename this" },
  }));
  await expectNoProjectAccess(page.request.put(`/api/projects/${projectBId}/guided-builder`, {
    data: { projectId: projectBId },
  }));
  await expectNoProjectAccess(page.request.post(`/api/projects/${projectBId}/run`, {
    data: { module: "concept" },
  }));
  await expectNoProjectAccess(page.request.get(`/api/projects/${projectBId}/traceability`));
  await expectNoProjectAccess(page.request.post(`/api/projects/${projectBId}/exports`, {
    data: { type: "business_plan_markdown" },
  }));
  await expectNoProjectAccess(page.request.delete(`/api/projects/${projectBId}`));

  await page.goto(`/project/${projectBId}/overview`);
  await expect(page.getByRole("heading", { name: "We could not open that project." })).toBeVisible();

  const accountDeleteResponse = await page.request.delete("/api/account/data");
  expect(accountDeleteResponse.ok()).toBeTruthy();
  const accountDeletePayload = await accountDeleteResponse.json();
  expect(accountDeletePayload.deletedProjects).toBeGreaterThanOrEqual(1);

  await page.getByRole("button", { name: "Log out" }).click();
  await signInTestUser(page, userBEmail, "/dashboard");
  await expect(page.getByRole("heading", { name: "User B Private Food Truck" })).toBeVisible();
  const ownerResponse = await page.request.get(`/api/projects/${projectBId}`);
  expect(ownerResponse.ok()).toBeTruthy();
  const ownerPayload = await ownerResponse.json();
  expect(ownerPayload.project.name).toBe("User B Private Food Truck");

  const userAAccessAfterSwitch = await page.request.get(`/api/projects/${projectAId}`);
  await expectNoProjectAccess(Promise.resolve(userAAccessAfterSwitch));
});

async function expectNoProjectAccess(responsePromise: Promise<{ status(): number; json(): Promise<any> }>) {
  const response = await responsePromise;
  expect(response.status()).toBe(404);
  const payload = await response.json();
  expect(payload.error).toBe("Project not found or you do not have access to it.");
}
