export function ManualPage({ onBack }: { onBack(): void }) {
  return (
    <main className="manual-page" id="manual">
      <div className="manual-heading">
        <div>
          <p className="eyebrow">Curvebench manual</p>
          <h2>From source data to a useful model comparison</h2>
          <p>
            Curvebench is a learning workspace: load observations, overlay one or more methods,
            inspect residuals and metrics, then decide which mathematical description is useful.
          </p>
        </div>
        <button type="button" className="primary" onClick={onBack}>
          Back to workspace
        </button>
      </div>

      <section>
        <h3>Typical workflow</h3>
        <ol>
          <li>Select a bundled dataset, import a file, or generate values from an expression.</li>
          <li>
            Add models in the right panel. Recommended models are loaded first for bundled data.
          </li>
          <li>
            Use <strong>Fit</strong> for supported regressions, or adjust manual parameters
            directly.
          </li>
          <li>Compare the graph, residual pattern, RMSE, MAE, R², and maximum error.</li>
          <li>
            Edit measured values in the data table, or export the dataset and complete project.
          </li>
        </ol>
        <div className="manual-note">
          A low error does not prove a mechanism. Prefer a method whose assumptions and shape make
          sense for the scenario, and be cautious when extrapolating beyond the measured range.
        </div>
      </section>

      <section>
        <h3>Interpolation, regression, and manual overlays</h3>
        <div className="manual-grid">
          <article>
            <h4>Interpolation</h4>
            <p>
              Passes through the supplied 2-D points. Piecewise linear and cubic splines are useful
              local descriptions; high-degree global interpolation can oscillate strongly.
            </p>
          </article>
          <article>
            <h4>Regression / fitting</h4>
            <p>
              Estimates parameters by minimizing error. Curvebench includes linear, polynomial,
              exponential, logarithmic, power-law, saturation, logistic, and peak fits, plus plane
              and quadratic-surface fits in 3-D.
            </p>
          </article>
          <article>
            <h4>Manual overlays</h4>
            <p>
              Lets you explore sinusoidal, geometric, Gaussian-surface, or restricted custom
              formulas. These parameters are not automatically optimized unless marked otherwise.
            </p>
          </article>
        </div>
      </section>

      <section>
        <h3>Import contracts and downloadable skeletons</h3>
        <p>
          Imports stay in the current browser workspace until you explicitly save them. All numeric
          values must be finite. Dataset JSON accepts at most 2,000 2-D points or 2,500 3-D points.
        </p>
        <div className="format-list">
          <article>
            <div>
              <h4>2-D dataset JSON</h4>
              <p>
                Canonical, metadata-rich format. Requires schema version 1, a kebab-case ID,
                descriptions, category, tags, provenance fields, x/y axes, points, and a model-ID
                list. Use <code>dimension: "2d"</code> and points shaped as{" "}
                <code>{`{ x, y }`}</code>.
              </p>
            </div>
            <a className="download-link" href="/templates/dataset-2d.json" download>
              Download 2-D JSON
            </a>
          </article>
          <article>
            <div>
              <h4>3-D dataset JSON</h4>
              <p>
                Uses the same metadata with <code>dimension: "3d"</code>, x/y/z axes, and points
                shaped as <code>{`{ x, y, z }`}</code>. Four or more points are required.
              </p>
            </div>
            <a className="download-link" href="/templates/dataset-3d.json" download>
              Download 3-D JSON
            </a>
          </article>
          <article>
            <div>
              <h4>2-D CSV</h4>
              <p>
                The header must include <code>x,y</code>, followed by at least two numeric rows.
                Commas, semicolons, and tabs are accepted. Curvebench asks for metadata after
                parsing.
              </p>
            </div>
            <a className="download-link" href="/templates/dataset-2d.csv" download>
              Download 2-D CSV
            </a>
          </article>
          <article>
            <div>
              <h4>3-D CSV</h4>
              <p>
                The header must include <code>x,y,z</code>. Each non-empty row must contain finite
                values for all three coordinates; regular grids can optionally be connected in the
                plot.
              </p>
            </div>
            <a className="download-link" href="/templates/dataset-3d.csv" download>
              Download 3-D CSV
            </a>
          </article>
          <article>
            <div>
              <h4>Curvebench project JSON</h4>
              <p>
                Opened from <strong>Open project</strong>. A project contains one complete canonical
                dataset plus the current model parameters, bounds, selection, and display state.
              </p>
            </div>
            <a className="download-link" href="/templates/curvebench-project.json" download>
              Download project JSON
            </a>
          </article>
        </div>
      </section>

      <section>
        <h3>Formula-generated data</h3>
        <p>
          Use <code>x</code> for 2-D expressions and <code>x</code> plus <code>y</code> for 3-D
          surfaces. Arithmetic, powers, trigonometric functions, <code>exp</code>, <code>log</code>,
          <code>sqrt</code>, <code>abs</code>, <code>min</code>, and <code>max</code> are supported.
          JavaScript, assignments, and unapproved functions are rejected. Generation is limited to
          150 points in 2-D or a 35 × 35 grid in 3-D.
        </p>
      </section>
    </main>
  );
}
