import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { hashPassword, verifyPassword } from "../lib/auth/password";
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
