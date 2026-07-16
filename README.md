# Curvebench

Curvebench is a static browser application for learning how interpolation, regression, parametric models, residuals, and limited 3D surface fitting behave on measured data.

It contains 43 synthetic educational datasets, JSON and CSV import, formula-based dataset generation, editable points, multiple simultaneous model overlays, automatic fitting where supported, local project persistence, image export, and a print-ready report.

> All bundled data is synthetic and intended only for mathematical education. It is not medical, scientific, environmental, engineering, or safety reference data.

## Run locally

Requirements: Node.js 22 or another currently supported Node version compatible with the committed dependencies.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Verification

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run check` runs formatting, linting, type checking, unit/component tests, and the production build. Browser tests are separate because Playwright requires a browser binary.

## Deploy to Vercel

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Keep the detected Vite framework settings.
4. Deploy without environment variables.

`vercel.json` explicitly uses `npm run build` and the `dist` output directory. The application has no backend, database, authentication, or serverless functions.

## Main capabilities

- 34 bundled 2D datasets and 9 bundled 3D surface datasets, including molecular, hobby, society, and beginner 3D examples
- On-demand static JSON loading through a validated manifest
- Canonical JSON import and simple `x,y` or `x,y,z` CSV import
- Restricted formula generation for `y=f(x)` and `z=f(x,y)`
- Browser-local custom dataset library and debounced workspace autosave
- Piecewise linear, Lagrange, Newton, and natural cubic spline interpolation
- Linear, polynomial, exponential, logarithmic, power-law, saturation, logistic, Gaussian, Lorentzian, and pseudo-Voigt fitting
- Manual sinusoid, damped sinusoid, circle, ellipse, Gaussian surface, sphere, ellipsoid, and custom formula overlays
- Automatic plane and quadratic-surface fitting in 3D
- RMSE, MAE, R², maximum absolute error, and residual display where meaningful
- PNG, SVG, dataset JSON, project JSON, and browser print/PDF export
- In-app manual with downloadable 2D/3D JSON, CSV, and project skeletons
- Keyboard-labelled controls, textual chart summaries, raw data access, and reduced-motion support

## Architecture

The application follows a small dependency direction:

```text
React UI
  -> workspace state and feature components
    -> model registry and dataset services
      -> pure numerical, validation, expression, persistence, and import/export modules
```

Numerical code does not import React. Models implement a common strategy interface and are registered centrally in `src/core/models/registry.ts`. Dataset parsing, fitting, metrics, and expression validation can be tested independently.

## Repository layout

```text
public/datasets/       Generated, committed datasets and manifest
scripts/               Deterministic dataset generation
src/core/              Domain schemas, numerical methods, models, storage
src/features/          Dataset, model, and workspace UI
src/components/        Shared UI and plotting components
examples/imports/      Working JSON, CSV, surface, and project examples
tests/e2e/             Playwright smoke test
.github/workflows/     Build-and-test CI
```

## Dataset JSON

Canonical files are versioned and include metadata:

```json
{
  "schemaVersion": 1,
  "id": "example-line",
  "title": "Example line",
  "shortDescription": "A small linear dataset.",
  "description": "Synthetic points for testing.",
  "dimension": "2d",
  "category": "school",
  "tags": ["linear"],
  "synthetic": true,
  "sourceNote": "Synthetic educational data.",
  "axes": {
    "x": { "key": "x", "label": "Input", "unit": "s" },
    "y": { "key": "y", "label": "Output", "unit": "m" }
  },
  "points": [
    { "x": 0, "y": 1 },
    { "x": 1, "y": 3 }
  ],
  "recommendedModels": ["linear"]
}
```

CSV files require headers:

```csv
x,y
0,1
1,3
```

or:

```csv
x,y,z
0,0,1
1,0,2
```

CSV metadata is entered after parsing. See `examples/imports` for working files.

## Add a bundled dataset

1. Add a deterministic definition to `scripts/generate-datasets.mjs`.
2. Run `npm run generate:datasets`.
3. Run `npm test` to validate all files and manifest entries.

The browser loads only manifest metadata initially. Point arrays are fetched when selected.

## Add a model strategy

1. Add a `ModelDefinition` in `src/core/models/registry.ts`, or split it into a dedicated strategy module if it is substantial.
2. Define defaults, parameter specifications, prediction or trace creation, fitting support, formula text, and limitations.
3. Add it to `modelDefinitions`.
4. Add direct numerical tests. The registry test evaluates every registered strategy.

The UI derives the available model list and parameter controls from the registry rather than duplicating model-specific switches.

## Numerical limitations

- The pseudo-Voigt model is a weighted Gaussian/Lorentzian approximation, not an exact Voigt profile.
- Nonlinear fits use a bounded finite-difference Levenberg-Marquardt-style routine and can fail to converge on incompatible data or poor bounds.
- Polynomial fitting uses centered and scaled coordinates. Degree 7 and above is explicitly warned against.
- Lagrange and Newton interpolation are limited to 30 observations to avoid presenting high-degree global interpolation as a sensible default.
- Circle, ellipse, sphere, and ellipsoid are manual geometric overlays and do not produce pointwise regression metrics.
- 3D automatic fitting is intentionally limited to planes and quadratic surfaces.
- “Print report / Save as PDF” uses the browser print dialog.

## Accessibility

Curvebench uses semantic landmarks, labelled form controls, keyboard-accessible menus and dialogs, visible focus states, textual chart summaries, metrics tables, and an editable raw-data table. Plotly output is supplemented rather than treated as a complete accessible representation.

This project aims for practical WCAG 2.2 AA behavior but does not claim formal conformance without an independent audit.

## Licence

MIT. See [LICENSE](LICENSE).
