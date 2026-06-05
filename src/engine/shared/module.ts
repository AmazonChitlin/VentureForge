import type { EngineResult } from "@/engine/shared/engine-result";

export interface EngineContext {
  projectId: string;
  requestedAt: Date;
}

export interface EngineModule<Input, Output> {
  readonly id: string;
  readonly version: string;
  run(input: Input, context: EngineContext): Promise<EngineResult<Output>>;
}

export interface ModuleDescriptor {
  id: string;
  title: string;
  stage: number;
  dependsOn: string[];
  purpose: string;
}
