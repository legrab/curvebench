import { useMemo, useState } from "react";
import type { Dataset } from "../../core/datasets/types";
import { createActiveModel } from "../../core/models/helpers";
import {
  createCustomParameters,
  formulaFor,
  getModelDefinition,
  modelOptionsFor,
} from "../../core/models/registry";
import type { ActiveModel, EvaluatedModel, ParameterBound } from "../../core/models/types";
import { formatNumber } from "../../core/metrics/metrics";

interface Props {
  dataset: Dataset;
  models: ActiveModel[];
  evaluated: EvaluatedModel[];
  selectedModelId: string | null;
  onAdd(model: ActiveModel): void;
  onUpdate(id: string, update: Partial<ActiveModel>): void;
  onRemove(id: string): void;
  onFit(id: string): void;
  onSelect(id: string): void;
  notify(message: string, kind?: "status" | "error"): void;
}

export function ModelPanel(props: Props) {
  const options = useMemo(() => modelOptionsFor(props.dataset), [props.dataset]);
  const [type, setType] = useState(options[0]?.id ?? "");
  const [customExpression, setCustomExpression] = useState(
    props.dataset.dimension === "2d" ? "a*sin(b*x)+c" : "a*sin(x)*cos(y)+c",
  );

  const effectiveType = options.some((option) => option.id === type)
    ? type
    : (options[0]?.id ?? "");
  function addModel() {
    try {
      if (props.models.length >= 8) throw new Error("At most eight active models are allowed.");
      const definition = getModelDefinition(effectiveType);
      const isCustom = effectiveType === "custom-2d" || effectiveType === "custom-3d";
      const model = createActiveModel(
        definition,
        props.dataset,
        isCustom ? customExpression : undefined,
      );
      if (isCustom) {
        model.params = createCustomParameters(customExpression, props.dataset.dimension);
        model.bounds = Object.fromEntries(
          Object.keys(model.params).map((key) => [key, { min: -1000, max: 1000, step: 0.01 }]),
        );
      }
      props.onAdd(model);
    } catch (error) {
      props.notify(messageOf(error), "error");
    }
  }

  const groups = ["interpolation", "regression", "manual"] as const;
  return (
    <aside className="side-panel model-panel" aria-label="Model configuration">
      <section className="panel-section">
        <h2>Add model</h2>
        <label>
          Method
          <select value={effectiveType} onChange={(event) => setType(event.target.value)}>
            {groups.map((group) => (
              <optgroup key={group} label={group[0]!.toUpperCase() + group.slice(1)}>
                {options
                  .filter((option) => option.category === group)
                  .map((option) => (
                    <option value={option.id} key={option.id}>
                      {option.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        {effectiveType.startsWith("custom-") ? (
          <label>
            Expression
            <input
              value={customExpression}
              onChange={(event) => setCustomExpression(event.target.value)}
              aria-label="Custom model expression"
            />
          </label>
        ) : null}
        {effectiveType ? <ModelDescription type={effectiveType} /> : null}
        <button type="button" className="primary full-width" onClick={addModel}>
          Add model
        </button>
      </section>

      <section className="panel-section active-models">
        <h2>
          Active models <span className="count-badge">{props.models.length}/8</span>
        </h2>
        {props.models.length === 0 ? (
          <p className="empty-note">Add a model to compare it with the measured values.</p>
        ) : null}
        {props.models.map((model) => {
          const definition = getModelDefinition(model.type);
          const evaluated = props.evaluated.find((item) => item.active.id === model.id);
          const specs = definition.getParameterSpecs(props.dataset, model.params);
          const selected = props.selectedModelId === model.id;
          return (
            <article className={`model-card ${selected ? "selected" : ""}`} key={model.id}>
              <header>
                <button
                  type="button"
                  className="model-select"
                  onClick={() => props.onSelect(model.id)}
                  aria-pressed={selected}
                >
                  <strong>{model.name}</strong>
                  <span>
                    {definition.category} ·{" "}
                    {definition.supportsAutomaticFit ? "automatic fit" : "manual"}
                  </span>
                </button>
                <label className="visibility-toggle">
                  <input
                    type="checkbox"
                    checked={model.visible}
                    onChange={(event) =>
                      props.onUpdate(model.id, { visible: event.target.checked })
                    }
                  />
                  <span>Visible</span>
                </label>
              </header>
              <details open={selected}>
                <summary>Parameters and result</summary>
                <label>
                  Name
                  <input
                    value={model.name}
                    onChange={(event) => props.onUpdate(model.id, { name: event.target.value })}
                  />
                </label>
                {model.expression !== undefined ? (
                  <label>
                    Expression
                    <input
                      value={model.expression}
                      onChange={(event) => {
                        try {
                          const params = createCustomParameters(
                            event.target.value,
                            props.dataset.dimension,
                          );
                          const bounds = { ...model.bounds };
                          for (const key of Object.keys(params))
                            bounds[key] ??= { min: -1000, max: 1000, step: 0.01 };
                          props.onUpdate(model.id, {
                            expression: event.target.value,
                            params: {
                              ...params,
                              ...Object.fromEntries(
                                Object.entries(model.params).filter(([key]) => key in params),
                              ),
                            },
                            bounds,
                          });
                        } catch {
                          props.onUpdate(model.id, { expression: event.target.value });
                        }
                      }}
                    />
                  </label>
                ) : null}
                <div className="parameter-grid">
                  {specs
                    .filter((item) => !item.hidden)
                    .map((item) => (
                      <label key={item.key}>
                        {item.label}
                        <input
                          type="number"
                          value={model.params[item.key] ?? 0}
                          min={model.bounds[item.key]?.min ?? item.min}
                          max={model.bounds[item.key]?.max ?? item.max}
                          step={model.bounds[item.key]?.step ?? item.step}
                          onChange={(event) => {
                            let value = Number(event.target.value);
                            if (item.integer) value = Math.round(value);
                            const params = { ...model.params, [item.key]: value };
                            if (model.type === "polynomial" && item.key === "degree") {
                              for (let index = 0; index <= value; index += 1)
                                params[`c${index}`] ??= 0;
                            }
                            props.onUpdate(model.id, {
                              params,
                              fitStatus: "idle",
                              fitMessage: undefined,
                            });
                          }}
                        />
                      </label>
                    ))}
                </div>
                {specs.length ? (
                  <details className="bounds-editor">
                    <summary>Parameter bounds</summary>
                    {specs
                      .filter((item) => !item.hidden)
                      .map((item) => (
                        <div className="bound-row" key={item.key}>
                          <span>{item.label}</span>
                          {(["min", "max", "step"] as const).map((key) => (
                            <label key={key}>
                              {key}
                              <input
                                type="number"
                                value={model.bounds[item.key]?.[key] ?? item[key]}
                                onChange={(event) => {
                                  const current = model.bounds[item.key] ?? {
                                    min: item.min,
                                    max: item.max,
                                    step: item.step,
                                  };
                                  const updated: ParameterBound = {
                                    ...current,
                                    [key]: Number(event.target.value),
                                  };
                                  props.onUpdate(model.id, {
                                    bounds: { ...model.bounds, [item.key]: updated },
                                  });
                                }}
                              />
                            </label>
                          ))}
                        </div>
                      ))}
                  </details>
                ) : null}
                <div className="formula-box">
                  <code>{formulaFor(definition, model.params, model.expression)}</code>
                </div>
                {model.type === "polynomial" && (model.params.degree ?? 0) >= 7 ? (
                  <p className="warning">
                    High-degree polynomials can oscillate strongly and extrapolate poorly.
                  </p>
                ) : null}
                {evaluated?.error ? <p className="error-text">{evaluated.error}</p> : null}
                {model.fitMessage ? (
                  <p className={model.fitStatus === "failed" ? "error-text" : "help-text"}>
                    {model.fitMessage}
                  </p>
                ) : null}
                {evaluated?.metrics ? (
                  <dl className="metric-strip">
                    <div>
                      <dt>RMSE</dt>
                      <dd>{formatNumber(evaluated.metrics.rmse)}</dd>
                    </div>
                    <div>
                      <dt>MAE</dt>
                      <dd>{formatNumber(evaluated.metrics.mae)}</dd>
                    </div>
                    <div>
                      <dt>R²</dt>
                      <dd>{formatNumber(evaluated.metrics.r2)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="empty-note">
                    Pointwise metrics are not applicable to this geometric overlay.
                  </p>
                )}
                <div className="model-actions">
                  {definition.supportsAutomaticFit ? (
                    <button type="button" className="primary" onClick={() => props.onFit(model.id)}>
                      Fit automatically
                    </button>
                  ) : null}
                  {model.fittedParams ? (
                    <button
                      type="button"
                      onClick={() =>
                        props.onUpdate(model.id, {
                          params: { ...model.fittedParams! },
                          fitStatus: "fitted",
                          fitMessage: "Restored fitted values.",
                        })
                      }
                    >
                      Restore fitted values
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      const reset = createActiveModel(definition, props.dataset, model.expression);
                      if (model.expression) {
                        try {
                          reset.params = createCustomParameters(
                            model.expression,
                            props.dataset.dimension,
                          );
                        } catch {
                          /* keep empty until expression is corrected */
                        }
                      }
                      props.onUpdate(model.id, {
                        params: reset.params,
                        bounds: reset.bounds,
                        fitStatus: "idle",
                        fitMessage: "Model reset.",
                      });
                    }}
                  >
                    Reset model
                  </button>
                  <button type="button" className="danger" onClick={() => props.onRemove(model.id)}>
                    Remove
                  </button>
                </div>
              </details>
            </article>
          );
        })}
      </section>
    </aside>
  );
}

function ModelDescription({ type }: { type: string }) {
  const definition = getModelDefinition(type);
  return (
    <div className="method-note">
      <p>{definition.description}</p>
      <p>
        <strong>Limit:</strong> {definition.limitation}
      </p>
    </div>
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Model operation failed.";
}
