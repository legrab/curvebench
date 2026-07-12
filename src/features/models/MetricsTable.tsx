import { formatNumber } from "../../core/metrics/metrics";
import type { EvaluatedModel } from "../../core/models/types";

export function MetricsTable({ models }: { models: EvaluatedModel[] }) {
  const evaluable = models.filter((model) => model.metrics && model.active.visible);
  if (!evaluable.length)
    return (
      <p className="empty-note">No visible model currently provides pointwise error metrics.</p>
    );
  return (
    <div className="metrics-table-wrap">
      <table className="metrics-table">
        <caption>
          Training-set error comparison. Lower training error is not automatically the better
          explanatory model.
        </caption>
        <thead>
          <tr>
            <th>Model</th>
            <th>RMSE</th>
            <th>MAE</th>
            <th>R²</th>
            <th>Maximum |error|</th>
          </tr>
        </thead>
        <tbody>
          {evaluable.map((model) => (
            <tr key={model.active.id}>
              <th scope="row">{model.active.name}</th>
              <td>{formatNumber(model.metrics!.rmse)}</td>
              <td>{formatNumber(model.metrics!.mae)}</td>
              <td>{formatNumber(model.metrics!.r2)}</td>
              <td>{formatNumber(model.metrics!.maxAbsoluteError)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
