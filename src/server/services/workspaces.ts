import type { WorkspaceDto } from "@/types/movie";
import { notFound } from "../errors";
import { SEED_MOVIES } from "../seed";
import { workspaceCreateSchema } from "../validation";
import { getRepository } from "../repositories";

function defaultWorkspaceName() {
  const suffix = new Date().toISOString().slice(0, 10);
  return `Training Workspace ${suffix}`;
}

export async function createWorkspace(body: unknown): Promise<{
  workspace: WorkspaceDto;
  moviesSeeded: number;
}> {
  const parsed = workspaceCreateSchema.parse(body);
  console.info("[workspace:init] creating workspace");
  const workspace = await getRepository().createWorkspace({
    name: parsed?.name ?? defaultWorkspaceName()
  });
  console.info("[workspace:init] workspace created", {
    workspaceId: workspace.id
  });
  await getRepository().resetWorkspace(workspace.id, SEED_MOVIES);
  console.info("[workspace:init] seed movies restored", {
    workspaceId: workspace.id,
    moviesSeeded: SEED_MOVIES.length
  });
  return { workspace, moviesSeeded: SEED_MOVIES.length };
}

export async function getWorkspace(id: string): Promise<WorkspaceDto> {
  const workspace = await getRepository().getWorkspace(id);
  if (!workspace) {
    throw notFound("Workspace not found");
  }
  return workspace;
}

export async function resetWorkspace(id: string) {
  await getWorkspace(id);
  const movies = await getRepository().resetWorkspace(id, SEED_MOVIES);
  return { data: movies, seeded: movies.length };
}
