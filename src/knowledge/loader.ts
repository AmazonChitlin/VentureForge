import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  getKnowledgeDescriptor,
  knowledgePackCatalog,
} from "@/knowledge/catalog";
import {
  methodologyFrameworkSchema,
  type MethodologyFramework,
} from "@/knowledge/schema";

const frameworksDirectory = fileURLToPath(
  new URL("./frameworks/", import.meta.url),
);

export async function loadKnowledgeFile(
  id: string,
): Promise<MethodologyFramework> {
  const descriptor = getKnowledgeDescriptor(id);
  if (!descriptor) {
    throw new Error(`Unknown knowledge framework: ${id}`);
  }

  const fileUrl = new URL(`./frameworks/${descriptor.filename}`, import.meta.url);
  const contents = await readFile(fileUrl, "utf8");
  const parsed: unknown = JSON.parse(contents);
  const framework = methodologyFrameworkSchema.parse(parsed);

  if (framework.id !== descriptor.id) {
    throw new Error(
      `Knowledge framework ID mismatch in ${descriptor.filename}: expected ${descriptor.id}, received ${framework.id}`,
    );
  }

  return framework;
}

export async function loadAllKnowledgeFiles(): Promise<
  MethodologyFramework[]
> {
  return Promise.all(
    knowledgePackCatalog.map((descriptor) =>
      loadKnowledgeFile(descriptor.id),
    ),
  );
}

export async function getFrameworkById(
  id: string,
): Promise<MethodologyFramework | undefined> {
  if (!getKnowledgeDescriptor(id)) {
    return undefined;
  }
  return loadKnowledgeFile(id);
}

export function getFrameworksDirectory(): string {
  return frameworksDirectory;
}
