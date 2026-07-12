import type { Dataset } from "../core/datasets/types";
import type { EvaluatedModel } from "../core/models/types";

export function ResidualPlot({ dataset, model }: { dataset: Dataset; model?: EvaluatedModel }) {
  if (!model?.metrics || dataset.dimension !== "2d") {
    return (
      <p className="empty-note">
        Select a visible 2D model with pointwise predictions to inspect residuals.
      </p>
    );
  }
  const points = dataset.points.map((point, index) => ({
    x: point.x,
    y: model.metrics!.residuals[index]!,
  }));
  const xMin = Math.min(...points.map((point) => point.x));
  const xMax = Math.max(...points.map((point) => point.x));
  const maxAbs = Math.max(...points.map((point) => Math.abs(point.y)), 1e-9);
  const width = 840;
  const height = 220;
  const pad = 34;
  const sx = (x: number) => pad + ((x - xMin) / Math.max(xMax - xMin, 1e-9)) * (width - pad * 2);
  const sy = (y: number) => height / 2 - (y / maxAbs) * (height / 2 - pad);
  return (
    <div
      className="residual-plot"
      role="img"
      aria-label={`Residual plot for ${model.active.name}. Residuals range from ${(-maxAbs).toPrecision(4)} to ${maxAbs.toPrecision(4)}.`}
    >
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <rect x="0" y="0" width={width} height={height} fill="#fbfaf6" />
        <line
          x1={pad}
          x2={width - pad}
          y1={height / 2}
          y2={height / 2}
          stroke="#7a898b"
          strokeWidth="1"
        />
        {points.map((point, index) => (
          <circle
            key={index}
            cx={sx(point.x)}
            cy={sy(point.y)}
            r="3.5"
            fill="#c86d36"
            stroke="#fff"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
}
