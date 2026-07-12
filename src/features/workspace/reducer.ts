import type { WorkspaceAction, WorkspaceState } from "./types";

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "replace":
      return action.workspace;
    case "set-dataset":
      return {
        ...state,
        dataset: action.dataset,
        datasetSource: action.source,
        models: action.models ?? [],
        selectedModelId: action.models?.[0]?.id ?? null,
      };
    case "set-models":
      return {
        ...state,
        models: action.models,
        selectedModelId: action.models.some((model) => model.id === state.selectedModelId)
          ? state.selectedModelId
          : (action.models[0]?.id ?? null),
      };
    case "add-model":
      if (state.models.length >= 8) return state;
      return {
        ...state,
        models: [...state.models, action.model],
        selectedModelId: action.model.id,
      };
    case "update-model":
      return {
        ...state,
        models: state.models.map((model) =>
          model.id === action.id ? { ...model, ...action.update } : model,
        ),
      };
    case "remove-model": {
      const models = state.models.filter((model) => model.id !== action.id);
      return {
        ...state,
        models,
        selectedModelId:
          state.selectedModelId === action.id ? (models[0]?.id ?? null) : state.selectedModelId,
      };
    }
    case "select-model":
      return { ...state, selectedModelId: action.id };
    case "toggle-left":
      return { ...state, leftCollapsed: !state.leftCollapsed };
    case "toggle-right":
      return { ...state, rightCollapsed: !state.rightCollapsed };
    case "set-residuals":
      return { ...state, residualsOpen: action.open };
    case "set-table":
      return { ...state, tableOpen: action.open };
    case "set-tutorial":
      return { ...state, tutorialOpen: action.open };
    case "set-surface":
      return { ...state, showSurface: action.show };
  }
}
