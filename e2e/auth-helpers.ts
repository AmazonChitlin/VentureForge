import { expect, type Page, type TestInfo } from "@playwright/test";

export const TEST_PASSWORD = "playwright-password-123";

export async function signUpTestUser(
  page: Page,
  testInfo: Pick<TestInfo, "title" | "workerIndex">,
) {
  const safeTitle = testInfo.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const email = `${safeTitle}-${Date.now()}-${testInfo.workerIndex}@ventureforge.test`;
  await page.goto(`/signup?callbackUrl=${encodeURIComponent("/dashboard")}`);
  await page.getByLabel("Name").fill("Playwright Founder");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  return email;
}

export async function signInTestUser(
  page: Page,
  email: string,
  callbackUrl = "/dashboard",
) {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(new RegExp(escapeRegExp(callbackUrl)));
}

export async function createAuthenticatedProject(
  page: Page,
  input: {
    name: string;
    businessIdea: string;
    city?: string;
    state?: string;
    businessModel?: string;
  },
): Promise<string> {
  const response = await page.request.post("/api/projects", {
    data: input,
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.project.id as string;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
