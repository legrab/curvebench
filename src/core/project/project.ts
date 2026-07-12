import { projectSchema } from "../validation/schemas";
import type { WorkspaceState } from "../../features/workspace/types";

export interface CurvebenchProject {
  schemaVersion: 1;
  projectTitle: string;
  applicationVersion: string;
  createdAt: string;
  exportedAt: string;
  workspace: WorkspaceState;
}

export function createProject(workspace: WorkspaceState): CurvebenchProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    projectTitle: `${workspace.dataset.title} workspace`,
    applicationVersion: __APP_VERSION__,
    createdAt: now,
    exportedAt: now,
    workspace,
  };
}

export function parseProject(text: string): CurvebenchProject {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("The selected project is not valid JSON.");
  }
  return projectSchema.parse(value) as CurvebenchProject;
}
