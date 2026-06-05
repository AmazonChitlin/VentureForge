import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { hashPassword, verifyPassword } from "../lib/auth/password";
import { signupAction } from "../lib/auth/actions";
import { safeCallbackUrl } from "../lib/auth/schemas";
import {
  credentialsProviderIdentity,
  upsertAuthenticatedUser,
} from "../lib/auth/userProvisioning";
import { prisma } from "../lib/prisma";
import {
  createWorkspaceProject,
  getWorkspaceProject,
} from "../lib/repositories/projectRepository";

const databaseAvailable = Boolean(process.env.DATABASE_URL);

test("credential hashes verify only the matching password", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("wrong horse battery staple", hash), false);
  assert.equal(await verifyPassword("anything", null), false);
});

test(
  "auth user provisioning creates a User record and project ownership is enforced",
  { skip: databaseAvailable ? false : "Set DATABASE_URL to run Auth.js persistence coverage." },
  async () => {
    const stamp = Date.now();
    const owner = await upsertAuthenticatedUser({
      email: `auth-owner-${stamp}@ventureforge.test`,
      name: "Auth Owner",
    });
    const stranger = await upsertAuthenticatedUser({
      email: `auth-stranger-${stamp}@ventureforge.test`,
      name: "Auth Stranger",
    });
    const project = await createWorkspaceProject({
      businessIdea: "A test business with authenticated ownership.",
      city: "Tempe",
      name: "Auth Owned Project",
      state: "AZ",
      businessModel: "service",
    }, owner.id);

    try {
      const ownerRecord = await prisma.user.findUnique({
        select: {
          authProvider: true,
          authProviderAccountHash: true,
          email: true,
        },
        where: { id: owner.id },
      });
      const expectedIdentity = credentialsProviderIdentity(owner.email);
      assert.equal(ownerRecord?.authProvider, "credentials");
      assert.equal(
        ownerRecord?.authProviderAccountHash,
        expectedIdentity.accountHash,
      );
      assert.notEqual(ownerRecord?.authProviderAccountHash, owner.email);
      assert.match(ownerRecord?.authProviderAccountHash ?? "", /^[a-f0-9]{64}$/);

      const record = await prisma.businessProject.findUnique({
        select: { userId: true },
        where: { id: project.id },
      });
      assert.equal(record?.userId, owner.id);
      assert.ok(await getWorkspaceProject(project.id, owner.id));
      assert.equal(await getWorkspaceProject(project.id, stranger.id), undefined);
    } finally {
      await prisma.user.deleteMany({
        where: { id: { in: [owner.id, stranger.id] } },
      });
      await prisma.$disconnect();
    }
  },
);

test("protected route layouts call the authenticated user helper", async () => {
  const protectedLayouts = [
    "src/app/dashboard/layout.tsx",
    "src/app/project/layout.tsx",
    "src/app/settings/layout.tsx",
  ];
  for (const file of protectedLayouts) {
    const contents = await readFile(file, "utf8");
    assert.match(contents, /requireCurrentUser/);
  }
});

test("signup callback URLs are restricted to safe internal destinations", () => {
  assert.equal(safeCallbackUrl(undefined), "/dashboard");
  assert.equal(safeCallbackUrl("/dashboard"), "/dashboard");
  assert.equal(safeCallbackUrl("/project/new"), "/project/new");
  assert.equal(safeCallbackUrl("/project/abc_123-builder/builder"), "/project/abc_123-builder/builder");
  assert.equal(safeCallbackUrl("/project/abc_123/overview"), "/dashboard");
  assert.equal(safeCallbackUrl("/api/projects"), "/dashboard");
  assert.equal(safeCallbackUrl("https://example.com/dashboard"), "/dashboard");
  assert.equal(safeCallbackUrl("//example.com/dashboard"), "/dashboard");
});

test(
  "signup server action creates an account and returns a safe result instead of throwing",
  { skip: databaseAvailable ? false : "Set DATABASE_URL to run signup action coverage." },
  async () => {
    const email = `signup-action-${Date.now()}@ventureforge.test`;
    try {
      const result = await signupAction(signupFormData({
        callbackUrl: "https://malicious.example/bad",
        email,
        name: "Signup Action Tester",
        password: "signup-password-123",
      }));

      assert.equal(result.ok, true);
      assert.match(result.redirectTo ?? "", /\/dashboard|\/login\?error=created-account/);
      const created = await prisma.user.findUnique({
        select: { email: true },
        where: { email },
      });
      assert.equal(created?.email, email);
    } finally {
      await prisma.user.deleteMany({ where: { email } });
      await prisma.$disconnect();
    }
  },
);

test(
  "duplicate signup returns a friendly result and does not throw",
  { skip: databaseAvailable ? false : "Set DATABASE_URL to run duplicate signup coverage." },
  async () => {
    const email = `duplicate-signup-${Date.now()}@ventureforge.test`;
    try {
      const first = await signupAction(signupFormData({
        callbackUrl: "/dashboard",
        email,
        name: "Duplicate Signup",
        password: "signup-password-123",
      }));
      assert.equal(first.ok, true);

      const duplicate = await signupAction(signupFormData({
        callbackUrl: "/dashboard",
        email,
        name: "Duplicate Signup",
        password: "signup-password-123",
      }));
      assert.equal(duplicate.ok, false);
      assert.match(duplicate.message ?? "", /already has an account/i);
      assert.match(duplicate.fieldErrors?.email ?? "", /already has an account/i);
    } finally {
      await prisma.user.deleteMany({ where: { email } });
      await prisma.$disconnect();
    }
  },
);

function signupFormData(input: {
  callbackUrl: string;
  email: string;
  name: string;
  password: string;
}) {
  const formData = new FormData();
  formData.set("callbackUrl", input.callbackUrl);
  formData.set("email", input.email);
  formData.set("name", input.name);
  formData.set("password", input.password);
  return formData;
}
