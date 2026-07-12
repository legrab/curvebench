import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import Plotly from "plotly.js-dist-min";
import type { Dataset } from "../core/datasets/types";
import type { EvaluatedModel, TraceLike } from "../core/models/types";
import { axisLabel } from "../core/models/helpers";

export interface PlotHandle {
  exportImage(format: "png" | "svg"): Promise<void>;
  resetView(): Promise<void>;
}

interface PlotProps {
  dataset: Dataset;
  models: EvaluatedModel[];
  showSurface: boolean;
}

export const Plot = forwardRef<PlotHandle, PlotProps>(function Plot(
  { dataset, models, showSurface },
  ref,
) {
  const elementRef = useRef<HTMLDivElement>(null);
  const traces = useMemo(
    () => buildTraces(dataset, models, showSurface),
    [dataset, models, showSurface],
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const is3d = dataset.dimension === "3d";
    const layout = {
      autosize: true,
      paper_bgcolor: "#eef1ef",
      plot_bgcolor: "#fbfaf6",
      font: { family: "Inter, Segoe UI, sans-serif", color: "#26383d", size: 12 },
      margin: is3d ? { l: 0, r: 0, t: 34, b: 0 } : { l: 64, r: 24, t: 34, b: 58 },
      legend: { orientation: "h", y: -0.18, x: 0, bgcolor: "rgba(255,255,255,.72)" },
      hovermode: is3d ? "closest" : "x unified",
      uirevision: dataset.id,
      ...(is3d
        ? {
            scene: {
              xaxis: {
                title: axisLabel(dataset.axes.x.label, dataset.axes.x.unit),
                gridcolor: "#cdd6d5",
              },
              yaxis: {
                title: axisLabel(dataset.axes.y.label, dataset.axes.y.unit),
                gridcolor: "#cdd6d5",
              },
              zaxis: {
                title: axisLabel(dataset.axes.z.label, dataset.axes.z.unit),
                gridcolor: "#cdd6d5",
              },
              bgcolor: "#f8f7f2",
            },
          }
        : {
            xaxis: {
              title: axisLabel(dataset.axes.x.label, dataset.axes.x.unit),
              gridcolor: "#d7dedc",
              zerolinecolor: "#aab8b7",
            },
            yaxis: {
              title: axisLabel(dataset.axes.y.label, dataset.axes.y.unit),
              gridcolor: "#d7dedc",
              zerolinecolor: "#aab8b7",
            },
          }),
    };
    const config = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["lasso2d", "select2d"],
      toImageButtonOptions: { filename: `curvebench-${dataset.id}` },
    };
    void Plotly.react(element, { data: traces, layout, config });
    return () => Plotly.purge(element);
  }, [dataset, traces]);

  useImperativeHandle(ref, () => ({
    async exportImage(format) {
      if (!elementRef.current) throw new Error("The graph is not ready.");
      await Plotly.downloadImage(elementRef.current, {
        format,
        filename: `curvebench-${dataset.id}`,
        width: 1400,
        height: 900,
        scale: format === "png" ? 2 : 1,
      });
    },
    async resetView() {
      if (!elementRef.current) return;
      await Plotly.relayout(elementRef.current, {
        "xaxis.autorange": true,
        "yaxis.autorange": true,
        "scene.camera": null,
      });
    },
  }));

  return (
    <div className="plot-shell">
      <div
        ref={elementRef}
        className="plot"
        data-testid="main-plot"
        role="img"
        aria-label={`${dataset.dimension === "2d" ? "Two-dimensional" : "Three-dimensional"} plot of ${dataset.title} with ${models.filter((model) => model.active.visible).length} visible models.`}
      />
    </div>
  );
});

function buildTraces(
  dataset: Dataset,
  models: EvaluatedModel[],
  showSurface: boolean,
): TraceLike[] {
  const dataTrace: TraceLike =
    dataset.dimension === "2d"
      ? {
          type: "scatter",
          mode: "markers",
          name: "Measured values",
          x: dataset.points.map((point) => point.x),
          y: dataset.points.map((point) => point.y),
          marker: {
            size: 7,
            color: "#3f7487",
            symbol: "circle",
            line: { width: 1, color: "#f8f5ee" },
          },
          hovertemplate: "x=%{x:.5g}<br>y=%{y:.5g}<extra>Measured values</extra>",
        }
      : {
          type: "scatter3d",
          mode: "markers",
          name: "Measured values",
          x: dataset.points.map((point) => point.x),
          y: dataset.points.map((point) => point.y),
          z: dataset.points.map((point) => point.z),
          marker: {
            size: 4,
            color: dataset.points.map((point) => point.z),
            colorscale: "Portland",
            opacity: 0.92,
          },
          hovertemplate: "x=%{x:.5g}<br>y=%{y:.5g}<br>z=%{z:.5g}<extra>Measured values</extra>",
        };
  const result: TraceLike[] = [dataTrace];
  if (dataset.dimension === "3d" && showSurface) {
    const surface = gridSurface(dataset);
    if (surface) result.push(surface);
  }
  for (const model of models) {
    if (model.active.visible && !model.error) result.push(...model.traces);
  }
  return result;
}

function gridSurface(dataset: Extract<Dataset, { dimension: "3d" }>): TraceLike | null {
  const xs = [...new Set(dataset.points.map((point) => point.x))].sort((a, b) => a - b);
  const ys = [...new Set(dataset.points.map((point) => point.y))].sort((a, b) => a - b);
  if (xs.length * ys.length !== dataset.points.length) return null;
  const map = new Map(dataset.points.map((point) => [`${point.x}:${point.y}`, point.z]));
  const z = ys.map((y) => xs.map((x) => map.get(`${x}:${y}`) ?? Number.NaN));
  return {
    type: "surface",
    name: "Measured surface",
    x: xs,
    y: ys,
    z,
    opacity: 0.28,
    showscale: false,
    connectgaps: false,
  };
}
