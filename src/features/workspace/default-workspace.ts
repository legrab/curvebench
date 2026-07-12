import type { Dataset } from "../../core/datasets/types";
import { createActiveModel } from "../../core/models/helpers";
import { fitActiveModel, getModelDefinition } from "../../core/models/registry";
import type { WorkspaceState } from "./types";

export function createDefaultWorkspace(dataset: Dataset): WorkspaceState {
  const definition = getModelDefinition(dataset.dimension === "2d" ? "exponential" : "plane-3d");
  const model = createActiveModel(definition, dataset);
  try {
    const fit = fitActiveModel(definition, dataset, model.params, model.bounds);
    model.params = fit.params;
    model.fittedParams = fit.params;
    model.fitStatus = fit.converged ? "fitted" : "failed";
    model.fitMessage = fit.message;
  } catch (error) {
    model.fitStatus = "failed";
    model.fitMessage = error instanceof Error ? error.message : "Default fit failed.";
  }
  return {
    schemaVersion: 1,
    dataset,
    datasetSource: { kind: "bundled", id: dataset.id },
    models: [model],
    selectedModelId: model.id,
    leftCollapsed: false,
    rightCollapsed: false,
    residualsOpen: false,
    tableOpen: false,
    tutorialOpen: true,
    showSurface: false,
  };
}
