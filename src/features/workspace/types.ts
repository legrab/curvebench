import type { Dataset, DatasetSource } from "../../core/datasets/types";
import type { ActiveModel } from "../../core/models/types";

export interface WorkspaceState {
  schemaVersion: 1;
  dataset: Dataset;
  datasetSource: DatasetSource;
  models: ActiveModel[];
  selectedModelId: string | null;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  residualsOpen: boolean;
  tableOpen: boolean;
  tutorialOpen: boolean;
  showSurface: boolean;
}

export type WorkspaceAction =
  | { type: "replace"; workspace: WorkspaceState }
  | { type: "set-dataset"; dataset: Dataset; source: DatasetSource; models?: ActiveModel[] }
  | { type: "set-models"; models: ActiveModel[] }
  | { type: "add-model"; model: ActiveModel }
  | { type: "update-model"; id: string; update: Partial<ActiveModel> }
  | { type: "remove-model"; id: string }
  | { type: "select-model"; id: string | null }
  | { type: "toggle-left" }
  | { type: "toggle-right" }
  | { type: "set-residuals"; open: boolean }
  | { type: "set-table"; open: boolean }
  | { type: "set-tutorial"; open: boolean }
  | { type: "set-surface"; show: boolean };
