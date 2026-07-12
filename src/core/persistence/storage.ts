import { datasetSchema, workspaceSchema } from "../validation/schemas";
import type { Dataset } from "../datasets/types";
import type { WorkspaceState } from "../../features/workspace/types";

const WORKSPACE_KEY = "curvebench.workspace.v1";
const DATASETS_KEY = "curvebench.datasets.v1";

export function saveWorkspace(workspace: WorkspaceState): void {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
}

export function loadWorkspace(): WorkspaceState | null {
  const raw = localStorage.getItem(WORKSPACE_KEY);
  if (!raw) return null;
  try {
    return workspaceSchema.parse(JSON.parse(raw)) as WorkspaceState;
  } catch {
    localStorage.removeItem(WORKSPACE_KEY);
    return null;
  }
}

export function loadSavedDatasets(): Dataset[] {
  const raw = localStorage.getItem(DATASETS_KEY);
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error("Invalid saved dataset collection.");
    return value.map((item) => datasetSchema.parse(item));
  } catch {
    localStorage.removeItem(DATASETS_KEY);
    return [];
  }
}

export function saveDataset(dataset: Dataset): Dataset[] {
  const datasets = loadSavedDatasets();
  const next = [...datasets.filter((item) => item.id !== dataset.id), dataset];
  localStorage.setItem(DATASETS_KEY, JSON.stringify(next));
  return next;
}

export function removeSavedDataset(id: string): Dataset[] {
  const next = loadSavedDatasets().filter((dataset) => dataset.id !== id);
  localStorage.setItem(DATASETS_KEY, JSON.stringify(next));
  return next;
}

export function clearBrowserData(): void {
  localStorage.removeItem(WORKSPACE_KEY);
  localStorage.removeItem(DATASETS_KEY);
}
