import { useEffect, useMemo, useRef, useState } from "react";
import { Plot, type PlotHandle } from "./components/Plot";
import { DatasetPanel } from "./features/dataset/DatasetPanel";
import { DataTable } from "./features/dataset/DataTable";
import { ModelPanel } from "./features/models/ModelPanel";
import { MetricsTable } from "./features/models/MetricsTable";
import { ResidualPlot } from "./components/ResidualPlot";
import { Tutorial } from "./features/workspace/Tutorial";
import { ManualPage } from "./features/manual/ManualPage";
import { workspaceReducer } from "./features/workspace/reducer";
import { createDefaultWorkspace } from "./features/workspace/default-workspace";
import type { WorkspaceAction, WorkspaceState } from "./features/workspace/types";
import type {
  Dataset,
  DatasetManifest,
  DatasetManifestEntry,
  DatasetSource,
} from "./core/datasets/types";
import { loadBundledDataset, loadManifest } from "./core/datasets/loaders";
import { createActiveModel, evaluateActiveModel } from "./core/models/helpers";
import { fitActiveModel, getModelDefinition, modelRegistry } from "./core/models/registry";
import type { ActiveModel } from "./core/models/types";
import {
  clearBrowserData,
  loadSavedDatasets,
  loadWorkspace,
  removeSavedDataset,
  saveDataset,
  saveWorkspace,
} from "./core/persistence/storage";
import { createProject, parseProject } from "./core/project/project";
import "./styles/main.css";

export default function App() {
  const [manifest, setManifest] = useState<DatasetManifest | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [baseline, setBaseline] = useState<Dataset | null>(null);
  const [savedDatasets, setSavedDatasets] = useState<Dataset[]>([]);
  const [status, setStatus] = useState<{ message: string; kind: "status" | "error" }>({
    message: "",
    kind: "status",
  });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"workspace" | "manual">(() =>
    window.location.hash === "#manual" ? "manual" : "workspace",
  );
  const projectInput = useRef<HTMLInputElement>(null);
  const plotRef = useRef<PlotHandle>(null);

  useEffect(() => {
    const handleHashChange = () =>
      setView(window.location.hash === "#manual" ? "manual" : "workspace");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function showManual() {
    window.location.hash = "manual";
    setView("manual");
  }

  function showWorkspace() {
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
    setView("workspace");
  }

  function dispatch(action: WorkspaceAction) {
    setWorkspace((current) => (current ? workspaceReducer(current, action) : current));
  }

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const loadedManifest = await loadManifest(controller.signal);
        setManifest(loadedManifest);
        setSavedDatasets(loadSavedDatasets());
        const restored = loadWorkspace();
        if (restored) {
          const unsupported = restored.models.filter((model) => !modelRegistry.has(model.type));
          if (unsupported.length)
            throw new Error(
              `Saved workspace contains unsupported model types: ${unsupported.map((model) => model.type).join(", ")}.`,
            );
          setWorkspace(restored);
          setBaseline(restored.dataset);
          notify("Restored the previous browser workspace.");
        } else {
          const entry = loadedManifest.datasets.find((item) => item.id === "radioactive-decay");
          if (!entry) throw new Error("The default radioactive-decay dataset is missing.");
          const dataset = await loadBundledDataset(entry.path, controller.signal);
          setWorkspace(createDefaultWorkspace(dataset));
          setBaseline(dataset);
        }
      } catch (error) {
        notify(messageOf(error), "error");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!workspace) return;
    const timer = window.setTimeout(() => {
      try {
        saveWorkspace(workspace);
      } catch (error) {
        notify(`Workspace autosave failed: ${messageOf(error)}`, "error");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [workspace]);

  const evaluatedModels = useMemo(() => {
    if (!workspace) return [];
    return workspace.models.map((model) => {
      const definition = modelRegistry.get(model.type);
      return definition
        ? evaluateActiveModel(model, definition, workspace.dataset)
        : {
            active: model,
            definition: getModelDefinition("linear"),
            traces: [],
            error: `Unsupported model strategy '${model.type}'.`,
          };
    });
  }, [workspace]);

  const residualModel = useMemo(() => {
    if (!workspace) return undefined;
    return (
      evaluatedModels.find(
        (model) => model.active.id === workspace.selectedModelId && model.metrics,
      ) ?? evaluatedModels.find((model) => model.metrics)
    );
  }, [evaluatedModels, workspace]);

  function notify(message: string, kind: "status" | "error" = "status") {
    setStatus({ message, kind });
  }

  async function loadEntry(entry: DatasetManifestEntry) {
    try {
      setLoading(true);
      const dataset = await loadBundledDataset(entry.path);
      loadDataset(dataset, { kind: "bundled", id: dataset.id });
      notify(`Loaded ${dataset.title}.`);
    } catch (error) {
      notify(messageOf(error), "error");
    } finally {
      setLoading(false);
    }
  }

  function loadDataset(dataset: Dataset, source: DatasetSource) {
    const models = createRecommendedModels(dataset);
    dispatch({ type: "set-dataset", dataset, source, models });
    setBaseline(dataset);
  }

  function createRecommendedModels(dataset: Dataset): ActiveModel[] {
    const preferred = dataset.recommendedModels.find((id) => {
      const definition = modelRegistry.get(id);
      return definition?.dimensions.includes(dataset.dimension);
    });
    if (!preferred) return [];
    const definition = getModelDefinition(preferred);
    const model = createActiveModel(definition, dataset);
    if (definition.supportsAutomaticFit) {
      try {
        const fit = fitActiveModel(definition, dataset, model.params, model.bounds);
        model.params = fit.params;
        model.fittedParams = fit.params;
        model.fitStatus = fit.converged ? "fitted" : "failed";
        model.fitMessage = fit.message;
      } catch (error) {
        model.fitStatus = "failed";
        model.fitMessage = messageOf(error);
      }
    }
    return [model];
  }

  function fitModel(id: string) {
    if (!workspace) return;
    const model = workspace.models.find((item) => item.id === id);
    if (!model) return;
    try {
      const definition = getModelDefinition(model.type);
      const fit = fitActiveModel(definition, workspace.dataset, model.params, model.bounds);
      dispatch({
        type: "update-model",
        id,
        update: {
          params: fit.params,
          fittedParams: fit.params,
          fitStatus: fit.converged ? "fitted" : "failed",
          fitMessage: fit.message,
        },
      });
      notify(fit.message, fit.converged ? "status" : "error");
    } catch (error) {
      dispatch({
        type: "update-model",
        id,
        update: { fitStatus: "failed", fitMessage: messageOf(error) },
      });
      notify(messageOf(error), "error");
    }
  }

  function exportDataset(dataset: Dataset) {
    downloadText(`${dataset.id}.json`, JSON.stringify(dataset, null, 2), "application/json");
  }

  async function openProject(file?: File) {
    if (!file) return;
    try {
      const project = parseProject(await file.text());
      const unsupported = project.workspace.models.filter(
        (model) => !modelRegistry.has(model.type),
      );
      if (unsupported.length)
        throw new Error(
          `Project contains unsupported model types: ${unsupported.map((model) => model.type).join(", ")}.`,
        );
      setWorkspace(project.workspace);
      setBaseline(project.workspace.dataset);
      notify(`Opened ${file.name}.`);
    } catch (error) {
      notify(messageOf(error), "error");
    } finally {
      if (projectInput.current) projectInput.current.value = "";
    }
  }

  async function resetDefault() {
    if (!manifest) return;
    const entry = manifest.datasets.find((item) => item.id === "radioactive-decay");
    if (!entry) return;
    try {
      const dataset = await loadBundledDataset(entry.path);
      setWorkspace(createDefaultWorkspace(dataset));
      setBaseline(dataset);
      notify("Workspace reset to the default decay example.");
    } catch (error) {
      notify(messageOf(error), "error");
    }
  }

  function resetSelectedModel() {
    if (!workspace?.selectedModelId) return;
    const current = workspace.models.find((model) => model.id === workspace.selectedModelId);
    if (!current) return;
    const definition = getModelDefinition(current.type);
    const reset = createActiveModel(definition, workspace.dataset, current.expression);
    dispatch({
      type: "update-model",
      id: current.id,
      update: {
        params: reset.params,
        bounds: reset.bounds,
        fittedParams: undefined,
        fitStatus: "idle",
        fitMessage: "Model reset.",
      },
    });
  }

  if (loading && (!manifest || !workspace)) {
    return (
      <main className="loading-screen">
        <img src="/logo.svg" alt="" />
        <h1>Curvebench</h1>
        <p>Loading datasets and numerical workspace…</p>
      </main>
    );
  }
  if (!manifest || !workspace) {
    return (
      <main className="fatal-screen">
        <h1>Curvebench could not start</h1>
        <p>{status.message || "The dataset manifest or default workspace could not be loaded."}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </main>
    );
  }

  const layoutClass = [
    "workspace-layout",
    workspace.leftCollapsed ? "left-collapsed" : "",
    workspace.rightCollapsed ? "right-collapsed" : "",
  ].join(" ");
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img src="/logo.svg" alt="" />
          <div>
            <h1>Curvebench</h1>
            <span>Interpolation, regression, and surface fitting</span>
          </div>
        </div>
        <div className="header-dataset">
          <strong>{workspace.dataset.title}</strong>
          <span>
            {workspace.dataset.dimension.toUpperCase()} · {workspace.dataset.points.length} points
          </span>
        </div>
        <nav className="header-actions" aria-label="Workspace actions">
          <button type="button" onClick={() => projectInput.current?.click()}>
            Open project
          </button>
          <input
            ref={projectInput}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={(event) => void openProject(event.target.files?.[0])}
          />
          <details className="menu">
            <summary>Export</summary>
            <div className="menu-popover">
              <button
                type="button"
                onClick={() =>
                  void plotRef.current
                    ?.exportImage("png")
                    .catch((error) => notify(messageOf(error), "error"))
                }
              >
                Chart as PNG
              </button>
              <button
                type="button"
                onClick={() =>
                  void plotRef.current
                    ?.exportImage("svg")
                    .catch((error) => notify(messageOf(error), "error"))
                }
              >
                Chart as SVG
              </button>
              <button type="button" onClick={() => exportDataset(workspace.dataset)}>
                Dataset as JSON
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadText(
                    `curvebench-${workspace.dataset.id}-project.json`,
                    JSON.stringify(createProject(workspace), null, 2),
                    "application/json",
                  )
                }
              >
                Project as JSON
              </button>
              <button type="button" onClick={() => window.print()}>
                Print report / Save as PDF
              </button>
            </div>
          </details>
          <details className="menu">
            <summary>Reset</summary>
            <div className="menu-popover">
              <button type="button" onClick={() => void plotRef.current?.resetView()}>
                Reset graph view
              </button>
              <button type="button" onClick={resetSelectedModel}>
                Reset selected model
              </button>
              <button type="button" onClick={() => dispatch({ type: "set-models", models: [] })}>
                Reset all models
              </button>
              <button
                type="button"
                onClick={() =>
                  baseline &&
                  dispatch({
                    type: "set-dataset",
                    dataset: baseline,
                    source: workspace.datasetSource,
                    models: createRecommendedModels(baseline),
                  })
                }
              >
                Revert dataset edits
              </button>
              <button type="button" onClick={() => void resetDefault()}>
                Reset workspace to default
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  if (
                    !window.confirm(
                      "Clear the autosaved workspace and all custom datasets stored in this browser?",
                    )
                  )
                    return;
                  clearBrowserData();
                  setSavedDatasets([]);
                  void resetDefault();
                }}
              >
                Clear saved browser data
              </button>
            </div>
          </details>
          <details className="menu">
            <summary>Help</summary>
            <div className="menu-popover">
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.closest("details")?.removeAttribute("open");
                  showWorkspace();
                  dispatch({ type: "set-tutorial", open: true });
                }}
              >
                Getting-started exercise
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.closest("details")?.removeAttribute("open");
                  showManual();
                }}
              >
                User manual &amp; import formats
              </button>
            </div>
          </details>
          <button
            type="button"
            onClick={() => {
              if (!workspace.leftCollapsed) dispatch({ type: "toggle-left" });
              if (!workspace.rightCollapsed) dispatch({ type: "toggle-right" });
            }}
            aria-label="Enter distraction-free graph mode"
          >
            Focus graph
          </button>
        </nav>
      </header>

      {view === "manual" ? (
        <ManualPage onBack={showWorkspace} />
      ) : (
        <div className={layoutClass}>
          {workspace.leftCollapsed ? (
            <button
              className="panel-restore left"
              type="button"
              onClick={() => dispatch({ type: "toggle-left" })}
              aria-label="Expand dataset panel"
            >
              ›
            </button>
          ) : (
            <div className="panel-column">
              <button
                className="panel-collapse"
                type="button"
                onClick={() => dispatch({ type: "toggle-left" })}
              >
                ‹ Collapse datasets
              </button>
              <DatasetPanel
                manifest={manifest}
                current={workspace.dataset}
                savedDatasets={savedDatasets}
                onLoadBundled={(entry) => void loadEntry(entry)}
                onLoadDataset={(dataset, source, filename, expression) =>
                  loadDataset(
                    dataset,
                    source === "saved"
                      ? { kind: "saved", id: dataset.id }
                      : source === "generated"
                        ? { kind: "generated", expression: expression ?? "" }
                        : { kind: "imported", filename },
                  )
                }
                onSaveCurrent={() => {
                  try {
                    setSavedDatasets(saveDataset(workspace.dataset));
                    notify(`Saved ${workspace.dataset.title} in this browser.`);
                  } catch (error) {
                    notify(messageOf(error), "error");
                  }
                }}
                onDeleteSaved={(id) => {
                  if (window.confirm("Delete this saved dataset from the browser library?"))
                    setSavedDatasets(removeSavedDataset(id));
                }}
                onExportDataset={exportDataset}
                notify={notify}
              />
            </div>
          )}

          <main className="main-workspace" id="print-report">
            {workspace.tutorialOpen ? (
              <Tutorial onClose={() => dispatch({ type: "set-tutorial", open: false })} />
            ) : null}
            <section className="graph-section" aria-labelledby="graph-heading">
              <div className="section-heading">
                <div>
                  <h2 id="graph-heading">Graph</h2>
                  <p>{workspace.dataset.shortDescription}</p>
                </div>
                {workspace.dataset.dimension === "3d" ? (
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={workspace.showSurface}
                      onChange={(event) =>
                        dispatch({ type: "set-surface", show: event.target.checked })
                      }
                    />
                    Connect regular-grid measurements
                  </label>
                ) : null}
              </div>
              <Plot
                ref={plotRef}
                dataset={workspace.dataset}
                models={evaluatedModels}
                showSurface={workspace.showSurface}
              />
              <p className="chart-summary">
                Measured values are shown as points.{" "}
                {evaluatedModels.filter((model) => model.active.visible && !model.error).length}{" "}
                model overlays are currently visible. Exact values are available in the data table
                and metrics below.
              </p>
            </section>

            <section className="analysis-section" aria-labelledby="analysis-heading">
              <h2 id="analysis-heading">Model comparison</h2>
              <MetricsTable models={evaluatedModels} />
            </section>

            <section className="collapsible-section">
              <button
                type="button"
                className="section-toggle"
                aria-expanded={workspace.residualsOpen}
                onClick={() => dispatch({ type: "set-residuals", open: !workspace.residualsOpen })}
              >
                <span>Residuals</span>
                <span>{workspace.residualsOpen ? "−" : "+"}</span>
              </button>
              {workspace.residualsOpen ? (
                <ResidualPlot dataset={workspace.dataset} model={residualModel} />
              ) : null}
            </section>

            <section className="collapsible-section">
              <button
                type="button"
                className="section-toggle"
                aria-expanded={workspace.tableOpen}
                onClick={() => dispatch({ type: "set-table", open: !workspace.tableOpen })}
              >
                <span>Measured data table</span>
                <span>{workspace.tableOpen ? "−" : "+"}</span>
              </button>
              {workspace.tableOpen ? (
                <DataTable
                  dataset={workspace.dataset}
                  onApply={(dataset) => {
                    dispatch({
                      type: "set-dataset",
                      dataset,
                      source: workspace.datasetSource,
                      models: workspace.models.map((model) => ({
                        ...model,
                        fitStatus: "idle",
                        fitMessage: "Dataset changed; refit this model.",
                      })),
                    });
                    notify(
                      "Dataset edits applied. Existing model parameters were retained but fit statuses were invalidated.",
                    );
                  }}
                />
              ) : null}
            </section>

            <footer className="report-footer">
              <span>Curvebench {__APP_VERSION__}</span>
              <span>
                Synthetic educational datasets are not scientific, medical, safety, or engineering
                reference data.
              </span>
            </footer>
          </main>

          {workspace.rightCollapsed ? (
            <button
              className="panel-restore right"
              type="button"
              onClick={() => dispatch({ type: "toggle-right" })}
              aria-label="Expand model panel"
            >
              ‹
            </button>
          ) : (
            <div className="panel-column">
              <button
                className="panel-collapse"
                type="button"
                onClick={() => dispatch({ type: "toggle-right" })}
              >
                Collapse models ›
              </button>
              <ModelPanel
                dataset={workspace.dataset}
                models={workspace.models}
                evaluated={evaluatedModels}
                selectedModelId={workspace.selectedModelId}
                onAdd={(model) => dispatch({ type: "add-model", model })}
                onUpdate={(id, update) => dispatch({ type: "update-model", id, update })}
                onRemove={(id) => dispatch({ type: "remove-model", id })}
                onFit={fitModel}
                onSelect={(id) => dispatch({ type: "select-model", id })}
                notify={notify}
              />
            </div>
          )}
        </div>
      )}
      <div
        className={`status-region ${status.kind}`}
        role={status.kind === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {loading ? "Loading…" : status.message}
      </div>
    </div>
  );
}

function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Operation failed.";
}
