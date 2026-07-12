# Curvebench: one-shot repository generation prompt

## Role

Act as the senior engineer responsible for delivering a complete, polished, public repository for **Curvebench**, a browser-based learning tool for exploring interpolation, regression, parametric models, residuals, and limited 3D surface fitting.

Generate the entire repository in one pass. The result must be usable without follow-up implementation work:

- installs with `npm install`
- runs locally with `npm run dev`
- passes linting, type checking, unit tests, and the browser smoke test
- builds with `npm run build`
- deploys directly to Vercel as a static Vite application
- contains no placeholders, mock buttons, unfinished screens, `TODO` comments, or fake success states
- is packaged as a single `curvebench.zip` that can be extracted, pushed to a public GitHub repository, and imported into Vercel

Do not merely describe the repository. Create all files and the ZIP.

Use sound defaults when a minor detail is unspecified. Do not stop for clarification unless an actual contradiction makes implementation impossible.

---

## Product purpose

Curvebench is an accessible educational application for loading measured or generated datasets and comparing mathematical approximations against them.

The application should let a learner:

1. select one of roughly 30 bundled synthetic datasets
2. import a dataset from JSON or CSV
3. generate a dataset from a mathematical expression
4. inspect and edit its points
5. add one or more interpolation, regression, or manual parametric models
6. automatically fit supported models
7. manually adjust model parameters and immediately see the result
8. compare residuals and error metrics
9. work with full-featured 2D datasets and deliberately limited 3D surface datasets
10. export the chart, a printable report, or the complete workspace
11. reset individual parts or the entire workspace without reloading the page

The tone should be that of a compact, old-school scientific desktop tool rather than a modern marketing dashboard.

All bundled datasets are **synthetic educational examples**, even where they resemble familiar scientific, biological, sporting, or engineering observations. They must not be presented as medical, engineering, or scientific reference data.

---

## Scope decisions

### Required

- TypeScript
- React
- Vite
- npm
- entirely client-side runtime
- static deployment to Vercel
- Plotly.js for 2D and 3D visualization
- math.js for restricted formula parsing and evaluation
- Zod for dataset and project validation
- Vitest for unit tests
- React Testing Library where component behavior benefits from it
- Playwright for a small Chromium smoke test
- MIT licence
- GitHub Actions build-and-test workflow
- WCAG-minded keyboard and screen-reader accessibility
- responsive desktop-first layout
- 24 bundled 2D datasets and 6 bundled 3D surface datasets
- JSON as the canonical dataset format
- CSV import for simple `x,y` and `x,y,z` data
- localStorage for explicitly saved custom datasets and workspace autosave
- full project JSON import/export
- PNG and SVG chart export
- print-ready report that can be saved as PDF through the browser
- no dark mode

### Explicitly out of scope

Do not add:

- a backend
- Vercel Functions
- a database
- accounts or authentication
- cloud persistence
- collaboration
- telemetry or analytics
- advertisements
- payments
- a CMS
- internationalization
- arbitrary JavaScript evaluation
- symbolic algebra ambitions
- general-purpose spreadsheet behavior
- direct dragging of points on the chart
- exact scientific claims about the synthetic data
- parametric 3D paths such as `x(t), y(t), z(t)`
- automatic fitting for every geometric 3D shape
- a full lesson-management system
- dark mode
- unnecessary routing or a router library

The application is a single-page tool. Avoid architecture intended for a future enterprise platform.

---

## Feasibility guardrails

Keep the broad feature set, but use these deliberate boundaries:

1. Implement **pseudo-Voigt**, a documented weighted Gaussian/Lorentzian approximation, rather than an exact Voigt profile.
2. The PDF option is a clean print view opened through the browser print dialog. The user can select “Save as PDF.” Do not add a fragile screenshot-to-PDF dependency merely to bypass the print dialog.
3. Full numerical functionality is expected in 2D. In 3D, automatic fitting is required only for planes and quadratic surfaces. Other 3D models are manual overlays.
4. Circle, ellipse, sphere, and ellipsoid models are parametric/geometric overlays. They do not need to be forced into `y=f(x)` or `z=f(x,y)` form.
5. Interpolation is available only for suitable 2D datasets. Disable it with a clear explanation for 3D datasets.
6. Limit the number of simultaneously active models to eight.
7. Formula-generated datasets have bounded point counts and grid sizes to prevent browser freezes.
8. Prefer a reliable implementation over mathematically exotic extras.

---

## Technology and dependency policy

Use current stable, mutually compatible package versions and commit the generated `package-lock.json`.

Recommended stack:

- `react`
- `react-dom`
- `vite`
- `typescript`
- `plotly.js`
- a maintained React wrapper for Plotly, or a small typed local wrapper if that avoids wrapper incompatibility
- `mathjs`
- `zod`
- `ml-matrix`
- a small maintained nonlinear least-squares or Levenberg-Marquardt package if it integrates cleanly
- `vitest`
- `@testing-library/react`
- `@testing-library/user-event`
- `playwright`
- ESLint with TypeScript and React support
- Prettier

Avoid a component framework unless it clearly reduces code. Plain React components and CSS are preferable here. Do not introduce Redux, a server-state library, CSS-in-JS, Tailwind, or an icon library merely for convenience.

Use React state, context, and a reducer or similarly modest state architecture. Keep domain calculations framework-independent.

If a numerical package proves unreliable or incompatible, implement the small missing numerical routine locally behind a well-tested abstraction. Do not leave an algorithm nonfunctional.

---

## Repository output

The final ZIP should contain a repository similar to:

```text
curvebench/
  .github/
    workflows/
      ci.yml
  examples/
    imports/
      runner-speed.csv
      runner-speed.json
      surface-example.csv
      curvebench-project.json
  public/
    datasets/
      manifest.json
      2d/
        *.json
      3d/
        *.json
    favicon.svg
    logo.svg
  src/
    app/
    components/
    core/
      datasets/
      expressions/
      fitting/
      metrics/
      models/
      persistence/
      project/
      random/
      validation/
    data/
    features/
      dataset/
      generator/
      models/
      workspace/
    styles/
    test/
    App.tsx
    main.tsx
  tests/
    e2e/
      smoke.spec.ts
  .editorconfig
  .gitignore
  .prettierignore
  .prettierrc.json
  eslint.config.js
  index.html
  LICENSE
  package.json
  package-lock.json
  playwright.config.ts
  README.md
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
  vercel.json
  vite.config.ts
  vitest.config.ts
```

This is guidance, not a requirement to create empty directories or needless index files. Adjust the exact tree when a cleaner arrangement is obvious.

Do not include:

- `node_modules`
- `dist`
- Playwright browser binaries
- test output
- editor-specific workspace state
- OS junk
- generated coverage output

The ZIP should contain the repository directory itself or clearly documented root contents, not an accidental nested chain such as `curvebench/curvebench/final/curvebench`.

---

## Architecture

Use a small, testable architecture with clear dependency direction:

```text
React UI
  -> application/workspace state
    -> domain model registries and services
      -> pure numerical, validation, import/export, and persistence modules
```

### Core design rules

- Numerical functions must not import React.
- Dataset parsing and validation must not depend on UI components.
- Every model type is represented through a common strategy interface.
- Model strategies are registered centrally.
- Adding a new model should require a new strategy module plus one registry entry, not edits across many switch statements.
- Bundled datasets are described by a manifest and stored as individual static JSON files.
- Selecting a bundled dataset fetches its JSON file on demand from `/datasets/...`.
- Do not preload all point arrays into the JavaScript bundle.
- Imported and generated datasets use the same validated domain model as bundled datasets.
- UI components receive prepared view data rather than containing numerical algorithms.
- Errors should use typed results or domain-specific errors where helpful, not stringly typed chaos.
- Avoid speculative generic abstractions. A straightforward discriminated union plus registry is preferable to a miniature plugin framework.

### Suggested model strategy shape

Adapt this as needed while preserving the intent:

```ts
export interface ModelStrategy<TParameters extends ModelParameters = ModelParameters> {
  readonly type: ModelType;
  readonly label: string;
  readonly category: "interpolation" | "regression" | "manual";
  readonly dimensions: readonly DatasetDimension[];
  readonly supportsAutomaticFit: boolean;

  createDefaultParameters(dataset: Dataset): TParameters;
  validateParameters(parameters: unknown): TParameters;
  createTrace(
    dataset: Dataset,
    parameters: TParameters,
    sampling: SamplingContext
  ): PlotTrace[];
  predict?(
    input: PredictionInput,
    parameters: TParameters
  ): number | PredictionPoint;
  fit?(
    dataset: Dataset,
    initialParameters: TParameters,
    options: FitOptions
  ): FitResult<TParameters>;
}
```

Interpolation strategies may store coefficients or interpolation state in the active model instance after calculation. A separate interface or discriminated strategy variant is acceptable if it is cleaner than pretending every method is identical.

### State

The workspace should contain at least:

- current dataset
- dataset source type
- active model instances
- selected model
- chart settings
- residual-section visibility
- data-table visibility
- panel collapse state
- autosave metadata
- current instructional hint state
- dirty or validation state where useful

Use stable IDs for active model instances so multiple instances of the same model type can coexist.

Persist the current workspace to localStorage with schema versioning and defensive validation. A corrupt or outdated saved workspace must not prevent the application from loading. Fall back to the default workspace and show a nonblocking message.

---

## Dataset domain and file formats

### Canonical JSON dataset

Define and validate a versioned schema. The exact naming can vary, but it must support:

```json
{
  "schemaVersion": 1,
  "id": "runner-speed-100m",
  "title": "Runner speed during a 100 m race",
  "shortDescription": "A synthetic sprint velocity profile.",
  "description": "Synthetic educational measurements showing acceleration, a short peak-speed phase, and mild late-race deceleration.",
  "dimension": "2d",
  "category": "sport",
  "tags": ["motion", "speed", "nonlinear"],
  "synthetic": true,
  "sourceNote": "Generated for Curvebench. Not reference data.",
  "axes": {
    "x": {
      "key": "x",
      "label": "Time",
      "unit": "s"
    },
    "y": {
      "key": "y",
      "label": "Speed",
      "unit": "m/s"
    }
  },
  "points": [
    { "x": 0, "y": 0 },
    { "x": 0.5, "y": 2.9 }
  ],
  "recommendedModels": ["cubic-spline", "logistic", "polynomial"],
  "generation": {
    "seed": 1207,
    "noiseDescription": "Mild deterministic measurement noise."
  }
}
```

For 3D:

```json
{
  "schemaVersion": 1,
  "id": "heated-plate",
  "title": "Temperature across a heated plate",
  "shortDescription": "A synthetic two-dimensional temperature field.",
  "description": "A sampled surface with a warm source, edge cooling, and mild deterministic measurement noise.",
  "dimension": "3d",
  "category": "physics",
  "tags": ["surface", "temperature", "gaussian"],
  "synthetic": true,
  "sourceNote": "Generated for Curvebench. Not reference data.",
  "axes": {
    "x": { "key": "x", "label": "Horizontal position", "unit": "cm" },
    "y": { "key": "y", "label": "Vertical position", "unit": "cm" },
    "z": { "key": "z", "label": "Temperature", "unit": "°C" }
  },
  "points": [
    { "x": -5, "y": -5, "z": 21.4 },
    { "x": -4, "y": -5, "z": 22.1 }
  ],
  "recommendedModels": ["plane-3d", "quadratic-surface", "gaussian-surface"],
  "generation": {
    "seed": 2104,
    "noiseDescription": "Mild deterministic measurement noise."
  }
}
```

Requirements:

- 2D datasets contain 10 to 100 finite points.
- 3D datasets contain 25 to 100 finite points, normally a modest rectangular grid.
- Point arrays must be sorted sensibly where order matters.
- Dataset IDs are unique and URL-safe.
- Axis units may be empty but labels may not.
- Duplicate x-values should be rejected for interpolation methods that require unique x-values, with a clear method-specific message.
- Imported data must be size-limited to a reasonable maximum such as 2,000 2D points or 2,500 3D points.
- Bundled examples should remain within 100 points for readability.
- All bundled synthetic noise must be deterministic and reproducible.

### Dataset manifest

Create `/public/datasets/manifest.json` containing lightweight metadata and file paths, but not the full point arrays.

It must allow:

- listing and searching datasets without fetching every file
- grouping by category and dimension
- showing a short description
- showing point count
- showing tags and recommended model types

Validate the manifest at runtime and test that every entry points to a valid dataset file with matching metadata.

### CSV format

Support:

```csv
x,y
0,0
0.5,2.9
1,5.1
```

and:

```csv
x,y,z
-1,-1,2.1
0,-1,1.2
1,-1,2.0
```

CSV requirements:

- require headers
- accept case-insensitive `x`, `y`, and `z`
- ignore blank lines
- trim whitespace
- reject non-finite values with row-specific messages
- infer 2D from `x,y` and 3D from `x,y,z`
- after parsing, ask for title, description, category, axis labels, and units
- offer “Use sensible defaults”
- include working CSV examples in `examples/imports`
- do not attempt to encode rich metadata into comments inside CSV

### Imported and custom datasets

Imported or generated datasets should initially exist in the current workspace only.

Provide an explicit action:

- **Save to browser library**

Saved custom datasets:

- are stored in localStorage
- appear in a separate “My datasets” group
- can be renamed
- can be exported
- can be deleted with confirmation
- survive workspace reset
- are removed only by explicit deletion or the separate “Clear browser data” action

Do not silently save every imported file into the permanent browser library.

---

## Bundled datasets

Create exactly **30** bundled datasets: **24 two-dimensional** and **6 three-dimensional**.

They should mix familiar school examples with mildly surprising, visually interesting scenarios. Values need to be plausible enough to support the story but are synthetic and need not reconstruct a real published experiment.

Each should have 10 to 100 points, mild deterministic noise where suitable, useful metadata, and two or three sensible recommended models.

### Required 2D datasets

1. **Runner speed during a 100 m race**  
   Accelerates quickly, approaches peak speed, holds briefly, then decelerates mildly. Do not use a generic bell curve.

2. **Human height from infancy to adulthood**  
   Fast early growth, slower childhood growth, adolescent growth spurt, adult plateau.

3. **Infant weight during the first year**  
   Early dip or slow start is acceptable, followed by nonlinear growth and gradually declining growth rate. Clearly synthetic.

4. **Sunflower height over a growing season**  
   Logistic-like growth with slight measurement variation.

5. **Bacterial culture growth**  
   Lag, exponential growth, then carrying-capacity plateau.

6. **Normalized radioactive decay**  
   A simple half-life example with decaying counts and mild counting noise. Avoid implying that it is a measured safety dataset.

7. **Cooling drink temperature**  
   Newton-style cooling toward room temperature.

8. **Capacitor charging**  
   Exponential approach to a supply voltage.

9. **Spring extension under load**  
   Mostly linear Hooke-like region, with slight high-load deviation.

10. **Projectile height over time**  
    A noisy parabolic arc, ending near ground level.

11. **Vehicle braking distance versus speed**  
    Strongly nonlinear, approximately quadratic.

12. **Pendulum period versus length**  
    Square-root relationship.

13. **Enzyme reaction rate versus substrate concentration**  
    Saturating Michaelis-Menten-like response.

14. **Photosynthesis response to light intensity**  
    Rapid initial increase followed by saturation and slight high-light inhibition if kept subtle.

15. **Dose-response curve**  
    Sigmoidal Hill-like response, labelled as an abstract laboratory response rather than medical guidance.

16. **Acid-base titration-style response**  
    A steep transition region suitable for splines or logistic-style approximation. Synthetic and schematic.

17. **Solubility versus temperature**  
    Nonlinear increase with plausible noise.

18. **Solar panel output during a clear day**  
    Near-zero ends, asymmetric daytime peak, minor atmospheric variation.

19. **Daylight duration through a year**  
    Smooth seasonal periodic behavior at a fictional mid-latitude location.

20. **Traffic flow versus vehicle density**  
    Flow rises, peaks, and then falls as congestion dominates.

21. **Bearing vibration over operating time**  
    Stable baseline followed by accelerating wear and noisier measurements.

22. **Sound level versus distance from a source**  
    Decay with distance expressed in a clearly labelled synthetic measurement scale.

23. **Atmospheric pressure versus altitude**  
    Exponential-like decline over a school-example altitude interval.

24. **Bouncing ball peak height by bounce number**  
    Geometric decay with mild measurement variation.

### Required 3D surface datasets

25. **Temperature across a heated metal plate**  
    Warm source, cooler edges, slightly asymmetric Gaussian-like surface.

26. **Fictional terrain with hill and saddle**  
    A visually interesting sampled elevation field combining broad hill and saddle behavior.

27. **Pollutant concentration downwind**  
    Synthetic plume-like concentration surface. Clearly state that it is not an environmental model.

28. **Chemical reaction yield by temperature and catalyst concentration**  
    Curved response surface with an interior optimum.

29. **Wave interference intensity**  
    Two-source interference-style surface with damped oscillations.

30. **Plant growth response to light and water**  
    Broad optimum with poor growth at both insufficient and excessive input levels.

### Dataset generation quality

Do not hand-type random-looking numbers without a reproducible basis.

Create a small development-time dataset-generation script or test fixture utility that:

- uses seeded pseudo-random noise
- generates the bundled JSON consistently
- can be rerun by a maintainer
- is not required at runtime
- documents the conceptual base formula for each dataset
- does not claim scientific calibration

Commit the generated JSON files. Vercel deployment must not need to run the generator.

Include an npm script such as `npm run generate:datasets`, and test that running it produces schema-valid files without changing IDs or manifest consistency.

---

## Formula dataset generator

Provide an in-app generator that creates a dataset through the same domain model and loading path as imported data.

### 2D generator

Inputs:

- dataset title
- expression for `y=f(x)`
- x minimum
- x maximum
- number of points
- optional noise:
  - none
  - Gaussian
  - uniform
- noise magnitude
- integer seed
- x and y labels
- x and y units
- category or tag

Defaults should create a valid example immediately.

### 3D generator

Inputs:

- dataset title
- expression for `z=f(x,y)`
- x minimum and maximum
- y minimum and maximum
- x sample count
- y sample count
- optional seeded noise
- axis labels and units
- category or tag

Bound grid resolution, for example:

- 2 to 150 points in 2D generation
- 2 to 35 samples per axis in 3D generation
- reject total grids beyond the chosen safe maximum

Provide:

- inline formula validation
- computed point-count preview
- a small result preview or summary
- **Generate and load**
- **Generate and save to browser library**

### Restricted expression language

Use a restricted math.js instance and validate the parsed AST before compilation.

Allow only what the application needs:

- numeric constants
- symbols `x`, `y`, `pi`, and `e`
- parentheses
- arithmetic operators
- exponentiation
- approved functions such as:
  - `sin`, `cos`, `tan`
  - `asin`, `acos`, `atan`
  - `sinh`, `cosh`, `tanh`
  - `exp`
  - `log`, `log10`
  - `sqrt`
  - `abs`
  - `floor`, `ceil`, `round`
  - `min`, `max`
  - `pow`

Reject:

- assignments
- function definitions
- blocks
- arrays or matrices unless explicitly required internally
- object and property access
- imports
- units
- arbitrary symbols
- parser control functions
- nested evaluation
- JavaScript execution
- expressions producing complex or non-finite values

Do not use `eval`, `new Function`, or dynamic JavaScript compilation.

Evaluation errors must identify the problematic formula or coordinate without exposing a stack trace in the UI.

---

## Mathematical model taxonomy

The UI and code must distinguish:

1. **Interpolation**  
   Constructs a curve through the supplied points.

2. **Regression and automatic fitting**  
   Estimates parameters that minimize a residual objective.

3. **Manual parametric models**  
   Adds a configurable mathematical shape or function, whether or not automatic fitting is supported.

4. **Custom formula overlay**  
   Draws a user expression with named constants.

Do not label every technique merely “curve fitting.” Add concise educational copy explaining the difference.

---

## 2D model strategies

### Interpolation

Implement:

1. **Piecewise linear interpolation**
2. **Lagrange polynomial interpolation**
3. **Newton divided-difference interpolation**
4. **Natural cubic spline**

Requirements:

- sort a copy of points by x where mathematically appropriate
- do not mutate source data
- require unique x-values
- sample enough points for a visually smooth trace
- show the resulting representation or coefficients in a compact details section where practical
- Lagrange and Newton must warn when point count or implied degree is high
- include a visible warning from degree 7 upward and a stronger warning for very large datasets
- do not imply that high-degree interpolation is a robust general model
- natural cubic spline should use standard natural boundary conditions

### Automatic 2D regression/fitting

Implement:

1. **Linear**
   - `y = a*x + b`

2. **Polynomial**
   - degree selectable from 1 through 10
   - use numerically sensible centering/scaling internally if helpful
   - present coefficients in the original x coordinate or clearly explain transformed coefficients

3. **Exponential**
   - preferably `y = c + a*exp(b*x)`
   - allow a simpler constrained form only if robustly documented

4. **Logarithmic**
   - `y = a*ln(x) + b`
   - clearly reject non-positive x-values

5. **Power law**
   - `y = a*x^b`
   - clearly handle domain restrictions

6. **Logistic**
   - `y = b + L / (1 + exp(-k*(x-x0)))`

7. **Gaussian**
   - `y = b + A*exp(-0.5*((x-mu)/sigma)^2)`

8. **Lorentzian**
   - `y = b + A*gamma^2 / ((x-x0)^2 + gamma^2)`

9. **Pseudo-Voigt**
   - weighted combination of normalized Gaussian and Lorentzian terms
   - shared center and width convention
   - `eta` constrained to `[0,1]`
   - label it “Pseudo-Voigt approximation”
   - briefly explain that it approximates, rather than exactly evaluates, a Voigt profile

Use ordinary least squares for linear-in-parameter models. Use a bounded nonlinear least-squares method for nonlinear models.

Automatic fitting must:

- produce deterministic results
- calculate reasonable initial parameters from the dataset
- support parameter bounds
- fail gracefully when a dataset is incompatible
- return a typed result containing parameters, convergence status, iteration count where available, warnings, and metrics
- never display “best fit” when optimization failed
- remain responsive for bundled dataset sizes

### Manual 2D model overlays

Allow independent instances of:

- line
- polynomial
- exponential
- logarithmic
- power law
- logistic
- Gaussian
- Lorentzian
- pseudo-Voigt
- sinusoid
- damped sinusoid
- circle
- ellipse
- custom `y=f(x)` expression

Automatically fitted models remain manually adjustable after fitting. For each active model:

- show editable numeric parameters
- use sliders where a finite useful range can be inferred
- always also provide numeric inputs
- allow editing parameter bounds for automatically fitted models
- provide **Fit automatically** when supported
- provide **Restore fitted values**
- provide **Reset model**
- provide visibility toggle
- allow rename
- allow remove
- identify invalid parameters immediately
- preserve sufficient precision internally while formatting reasonably in the UI

Circle and ellipse should render as parametric traces. They are manual overlays in the first version and do not require automatic geometric fitting.

---

## 3D model strategies

3D datasets represent sampled surfaces with points `(x,y,z)` interpreted as observations of `z` over `(x,y)`.

### Automatic fitting required

1. **Plane**
   - `z = a*x + b*y + c`

2. **Quadratic surface**
   - `z = a*x^2 + b*y^2 + c*x*y + d*x + e*y + f`

Use least squares and report appropriate metrics over observed z-values.

### Manual 3D overlays required

- plane
- quadratic surface
- Gaussian surface
- sphere
- ellipsoid
- custom `z=f(x,y)` surface

Suggested Gaussian surface:

```text
z = baseline + amplitude *
    exp(
      -0.5 * (
        ((x-cx)/sx)^2 +
        ((y-cy)/sy)^2
      )
    )
```

An optional rotation parameter may be included only if implemented cleanly. It is not required.

Sphere and ellipsoid are geometric surface overlays. They do not need automatic fitting.

Render sampled 3D datasets as points by default. Let the user toggle a light connecting surface or mesh where the data forms a regular grid and doing so is meaningful.

Keep 3D controls clear enough that a user understands which models support automatic fitting.

---

## Custom formula overlays

Allow a user to add:

- `y=f(x)` for a 2D workspace
- `z=f(x,y)` for a 3D workspace

A custom formula overlay should support named scalar constants, for example:

```text
a * sin(b*x + c) + d
```

The user can define constants `a`, `b`, `c`, and `d` with:

- current value
- minimum
- maximum
- step

Parse symbols from the validated AST and treat approved non-coordinate, non-built-in symbols as model parameters only after the user confirms them. Limit the number of custom parameters to a reasonable value such as eight.

Custom formulas are manual overlays only. Do not attempt generic automatic optimization for arbitrary expressions in this version.

---

## Model evaluation and metrics

For applicable explicit regression models, calculate:

- RMSE
- MAE
- coefficient of determination `R²`
- maximum absolute error
- residual count
- convergence status for nonlinear fits

Use clear definitions and unit-aware labels.

Requirements:

- do not show `R²` where it is undefined or misleading
- handle constant target data defensively
- avoid `NaN` and infinity in the UI
- distinguish training residuals from interpolation behavior
- for exact interpolation through all training points, explain that near-zero training residuals do not imply stable prediction between or outside points
- geometric overlays without a meaningful pointwise `y` or `z` prediction may omit regression metrics and say why

### Residual plot

Provide a collapsible residual section below the main graph.

For 2D:

- x coordinate versus residual
- horizontal zero reference line
- active model selector if several evaluable models are present

For 3D:

- a compact observed-versus-predicted plot or residual distribution is acceptable
- do not attempt a complicated second 3D residual surface unless it remains simple and reliable

Also show a compact metrics table comparing active evaluable models.

---

## User interface

### Overall layout

Desktop:

```text
Header
┌────────────────┬──────────────────────────────┬──────────────────┐
│ Dataset panel  │ Main graph and information   │ Model panel      │
│                │                              │                  │
└────────────────┴──────────────────────────────┴──────────────────┘
```

Suggested widths:

- left: 280 to 340 px
- centre: flexible and dominant
- right: 320 to 380 px

Requirements:

- left and right panels scroll independently
- main workspace remains as large as possible
- each side panel can collapse independently
- provide a distraction-free graph mode that collapses both panels
- restore panel state through workspace persistence
- on narrow screens, stack dataset controls, graph, and model controls vertically
- no functionality should require a desktop pointer

### Header

Include:

- Curvebench logo and wordmark
- current dataset title
- workspace status if useful
- **Open project**
- **Export**
- **Reset**
- compact help/getting-started control
- distraction-free toggle

### Left dataset panel

Sections:

1. **Bundled datasets**
   - dimension filter
   - category filter
   - search by title, description, and tags
   - grouped or compact list
   - point count and dimension
   - concise preview metadata
   - load action

2. **My datasets**
   - saved browser datasets
   - load, rename, export, delete

3. **Import**
   - JSON dataset
   - CSV dataset
   - clear validation errors

4. **Generate**
   - 2D or 3D formula generator

5. **Current dataset**
   - metadata
   - source
   - point count
   - edit metadata
   - save to browser library when appropriate
   - export dataset

### Main workspace

Include:

- interactive Plotly graph
- axis labels and units
- legend
- hover values
- model traces with visually distinct line styles or markers
- graph reset control
- autoscale control
- 2D/3D-appropriate controls
- metrics comparison
- concise formula and parameter summary
- collapsible residual section
- collapsible raw data table
- compact educational notes and warnings

Do not bury the graph under decorative cards.

### Right model panel

Sections:

1. **Add model**
   - category tabs or grouping
   - filter by current dimension
   - concise method description
   - support badges such as “automatic fit” or “manual”

2. **Active models**
   - maximum eight
   - each in a compact expandable block
   - visibility, rename, fit, reset, restore, remove
   - parameter fields
   - fit status
   - warnings
   - metrics summary

3. **Comparison**
   - optional concise ranked view by selected metric
   - do not imply that the lowest training error is always the best explanatory model

### Point table editing

The collapsible data table should allow:

- view all points
- edit numeric values
- add a point
- remove a point
- sort by x, and then y for 3D where helpful
- discard edits
- apply edits after validation

Do not add:

- formulas in cells
- bulk spreadsheet selection
- direct chart point dragging
- complex undo history

A simple confirmation before replacing the active fitted state is appropriate. Dataset edits should invalidate or recalculate model results in a predictable way.

---

## Getting-started exercise

Provide one unobtrusive guided exercise that can be dismissed and reopened.

Use the default radioactive-decay dataset:

1. inspect the measured points
2. add a linear regression
3. observe the systematic residual pattern
4. add exponential fitting
5. compare the metrics and residuals
6. adjust the decay-rate parameter manually
7. restore the fitted values

The exercise should point to existing controls rather than creating a separate tutorial application.

Do not require completion or block normal use.

---

## Default state

On first load:

- load the bundled normalized radioactive-decay dataset
- show the measured points
- add an exponential model automatically and fit it
- keep the residual section collapsed
- keep the data table collapsed
- keep both side panels expanded
- show the getting-started prompt unobtrusively
- use sensible graph bounds and labels

If a valid autosaved workspace exists, restore it instead. Provide a visible **Start with default workspace** action when restoration occurred.

---

## Reset behavior

The main Reset control should open a compact menu with:

- **Reset graph view**
- **Reset selected model**
- **Reset all models**
- **Revert dataset edits**
- **Reset workspace to default**

Also provide a separately located destructive action under settings or browser library management:

- **Clear saved browser data**

Requirements:

- no page reload is needed
- complete reset loads the default radioactive-decay workspace
- reset does not delete saved custom datasets
- clearing browser data requires explicit confirmation
- actions are keyboard-accessible
- destructive actions are visually and semantically distinct

---

## Import and project persistence

### Dataset import

JSON dataset import uses the canonical schema.

CSV import creates a canonical dataset after metadata is provided.

Show:

- filename
- inferred dimension
- row or point count
- validation result
- actionable errors

### Project format

Create a separate versioned Curvebench project schema containing:

- schema version
- project title
- full current dataset or stable bundled-dataset reference with safe fallback
- active model instances
- model parameters and bounds
- fitted parameter snapshot where relevant
- model visibility and names
- graph settings
- panel and section state where useful
- creation and export timestamps
- application version

Project import must:

- validate before replacing the current workspace
- report unsupported model types
- reject invalid numeric values
- recover safely from newer unsupported schema versions
- never execute formulas without the same AST validation used by the UI

Include a working example project under `examples/imports`.

### Autosave

Autosave the current workspace to localStorage after debouncing.

Requirements:

- schema-versioned
- Zod-validated
- size-aware
- defensive against quota errors
- nonblocking error notification
- no browser-storage writes on every slider event without debounce
- no transmission off-device

---

## Export

Use an **Export** menu with:

1. **Chart as PNG**
2. **Chart as SVG**
3. **Dataset as JSON**
4. **Project as JSON**
5. **Print report / Save as PDF**

### Image export

Use Plotly’s supported image export path.

Image exports should include:

- current graph
- title
- axis labels
- legend
- active visible model traces

### Printable report

Create a dedicated print mode or print stylesheet for the centre workspace.

Include:

- Curvebench logo and title
- dataset metadata and synthetic-data notice
- main graph
- active model formulas and parameters
- metrics table
- residual chart when visible
- generation timestamp
- application version

Exclude:

- side panels
- buttons
- editable controls
- transient notifications

The action should open the browser print dialog and clearly say that the report can be saved as PDF. This counts as the PDF export path.

---

## Visual design

### Logo

Create `public/logo.svg` and a matching favicon.

The logo should be simple and original:

- orange or muted orange rectangular or rounded-square background
- a horizontal white sine curve
- two or three data points near the curve
- points use subdued green and blue
- remains legible at favicon size
- no text inside the icon
- wordmark “Curvebench” appears separately in the header

Do not fetch or generate a third-party logo.

### Style direction

Use a restrained late-1990s or early-2000s scientific desktop-tool influence without literal pixel-art retro styling.

Palette direction:

- faded teal-blue primary controls
- muted orange accents
- metallic blue-gray panel backgrounds
- pale neutral work surface
- subdued green and blue series accents
- pastel colors overall
- strong enough contrast for accessibility

Visual rules:

- thin borders
- modest corner radii, mostly 2 to 6 px
- compact controls
- clear hierarchy
- tabular numerals for values
- monospace or math-friendly font only where useful
- restrained shadows
- no glassmorphism
- no large gradients
- no oversized hero typography
- no dashboard KPI cards
- no animation beyond short functional transitions
- respect `prefers-reduced-motion`
- do not rely on color alone to distinguish model traces

Define colors as CSS custom properties. Test text and interactive-control contrast.

### Dry mathematical tone

Copy should be concise and matter-of-fact.

Good:

- “Fit did not converge within 200 iterations.”
- “Logarithmic fitting requires x > 0.”
- “Training residuals are zero by construction.”

Avoid:

- marketing slogans
- celebratory confetti
- gamification
- chatty assistant copy
- anthropomorphized errors
- claims that one model has “won”

---

## Accessibility

Aim for practical WCAG 2.2 AA behavior.

Required:

- semantic landmarks
- one clear page heading
- keyboard-accessible controls
- visible focus states
- labelled form fields
- field-level error messages associated through ARIA
- screen-reader text for icon-only buttons
- accessible dialogs with focus management
- no keyboard traps
- logical tab order
- sufficient contrast
- responsive text at browser zoom
- reduced-motion support
- status updates announced politely where appropriate
- chart has a textual summary and access to the underlying table
- model line differences use dash patterns and labels, not color alone

Plotly’s canvas/SVG output is not sufficient accessibility by itself. The raw data table, metrics, formulas, and concise chart summary must make the important information available in text.

---

## Error handling

Handle at least:

- dataset manifest fetch failure
- individual bundled dataset fetch failure
- malformed JSON
- malformed CSV
- unsupported schema version
- invalid or duplicate points
- formula syntax errors
- forbidden formula constructs
- non-finite generated values
- impossible logarithmic or power-law domains
- singular least-squares systems
- nonlinear fit non-convergence
- localStorage corruption
- localStorage quota errors
- image-export failure
- project import with missing model strategy
- Plotly rendering failure

Use a visible but nonintrusive notification region and contextual errors near the relevant controls.

The application must remain usable after recoverable failures.

---

## Performance

This is a small browser tool, but avoid obvious waste:

- fetch bundled point files on demand
- lazy-load the Plotly-heavy workspace if doing so stays simple
- debounce formula previews, fitting triggered by parameter edits, and autosave
- cancel or ignore stale async calculations
- bound nonlinear iterations
- bound chart sampling density
- avoid recreating large trace objects unnecessarily
- avoid fitting automatically on every keystroke
- keep imported file limits explicit
- show progress or busy state for fitting that is not instantaneous

A Web Worker is optional, not required. Use one only if nonlinear fitting measurably blocks interaction and the worker boundary remains clean.

---

## Numerical implementation quality

### General

- use finite-number checks at module boundaries
- use stable scaling or centering where appropriate
- do not mutate input arrays
- expose tolerances and iteration limits as named constants
- document mathematical assumptions concisely
- return structured warnings
- distinguish invalid input from non-convergence
- keep UI formatting separate from stored numeric precision

### Polynomial fitting

- support degree 1 to 10
- reject degree greater than or equal to point count
- warn from degree 7 upward
- avoid raw normal equations if a more stable QR or SVD path is available through the chosen matrix library
- test known polynomial recovery

### Nonlinear fitting

- infer initial values from data ranges
- enforce positive widths such as sigma and gamma
- enforce sensible logistic and pseudo-Voigt bounds
- use a maximum iteration count
- detect non-finite objective values
- preserve the last valid parameter set
- expose convergence outcome honestly

### Interpolation

Test:

- exact recovery at source points
- duplicate-x rejection
- sorting behavior
- expected cubic-spline continuity within numerical tolerance
- Lagrange/Newton agreement on a small dataset

### Metrics

Test:

- perfect fit
- known error values
- constant-target R² handling
- omitted or undefined predictions
- finite output only

---

## Testing

### Unit tests

Create focused tests for:

- dataset JSON schema
- project JSON schema
- CSV parsing
- manifest consistency
- every bundled dataset
- deterministic noise generation
- restricted expression AST validation
- formula evaluation
- 2D generator
- 3D generator
- each interpolation strategy
- each automatic fit strategy
- 3D plane fitting
- 3D quadratic fitting
- metrics
- parameter validation and bounds
- model registry uniqueness
- localStorage serialization and fallback
- project import/export round trip
- dataset import/export round trip
- key reset behavior

Every model strategy should have at least one direct unit test. Nonlinear model tests should use synthetic data generated from the corresponding model with small deterministic noise and realistic tolerances.

### Component tests

Use React Testing Library for selected behaviors such as:

- dataset selection
- model addition and removal
- parameter validation
- import error presentation
- reset confirmation
- accessible dialog focus behavior

Do not snapshot the whole application.

### Browser smoke test

Create a Playwright Chromium smoke test that:

1. opens the application
2. confirms the default radioactive-decay dataset appears
3. confirms the graph workspace renders
4. selects the runner-speed dataset
5. adds a polynomial model
6. changes its degree
7. opens the formula generator
8. generates `y = 2*x + 1`
9. verifies the generated dataset is loaded
10. opens the export menu
11. verifies project export is available
12. resets the workspace
13. confirms the default dataset returns

Use robust roles and labels rather than brittle CSS selectors.

### Commands

Provide scripts along these lines:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc -b --pretty false",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "generate:datasets": "...",
    "check": "npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build"
  }
}
```

Adjust implementation details as needed, but retain equivalent coverage.

---

## GitHub Actions

Create `.github/workflows/ci.yml`.

Trigger on:

- pushes to `main`
- pull requests

Run on a current Ubuntu runner.

Steps:

1. checkout
2. set up a current supported Node LTS version
3. enable npm cache
4. `npm ci`
5. formatting check
6. lint
7. type check
8. unit and component tests
9. production build
10. install Playwright Chromium with required dependencies
11. browser smoke test

The workflow must work without secrets.

Do not add automated deployment. Vercel’s Git integration handles deployment separately.

---

## Vercel deployment

The application must deploy as a static Vite project with no serverless functions.

Create a minimal root `vercel.json`, for example:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

Change this only if the current Vercel schema requires a more appropriate minimal configuration.

Because this is a single-page application without client-side routes, do not add a catch-all rewrite merely by habit.

README deployment instructions:

1. push the repository to GitHub
2. import the repository in Vercel
3. allow Vercel to detect Vite
4. deploy with no environment variables
5. confirm the generated public URL loads Curvebench

Also document local development and all verification commands.

---

## Standard repository files

### `.gitignore`

Include at least:

```gitignore
node_modules/
dist/
coverage/
playwright-report/
test-results/
.vite/
*.local
.env
.env.*
!.env.example
.DS_Store
Thumbs.db
*.log
```

Do not ignore `package-lock.json`.

### `.editorconfig`

Use UTF-8, LF, final newline, spaces, and a sensible indentation width.

### README

Keep it useful and compact.

Include:

- what Curvebench is
- screenshot placeholder only if an actual screenshot is generated during repository creation; otherwise omit the screenshot section entirely
- main capabilities
- explicit synthetic-data disclaimer
- architecture overview
- repository structure
- prerequisites
- install and run commands
- test and build commands
- dataset format examples
- CSV format
- how to add a bundled dataset
- how to add a model strategy
- Vercel deployment
- accessibility notes
- numerical limitations
- licence

Do not claim perfect accessibility, scientific validation, or universal numerical robustness.

### Licence

Include the standard MIT licence with an appropriate current copyright year and the project name or repository author placeholder only if no author identity is available.

Do not leave tokens such as `__OWNER__` or `YOUR_NAME_HERE`. If no individual author is known, use `Curvebench contributors`.

### Versioning

Start at `0.1.0`.

Display the version in the report and an unobtrusive About section. Source it from package metadata or a generated build constant without requiring a backend.

---

## Maintainability expectations

### Adding datasets

A maintainer should be able to:

1. add one validated JSON file
2. add one manifest entry, or run a deterministic manifest-generation command
3. run tests
4. see it in the application

Avoid hardcoding dataset IDs throughout components.

### Adding model strategies

A maintainer should be able to:

1. create a strategy module
2. define its parameter schema and defaults
3. add it to a central registry
4. add unit tests
5. see it automatically in the appropriate model list

Do not build model selection around duplicated component-level switch statements.

### Comments

Comment:

- mathematical assumptions
- non-obvious numerical stability choices
- security boundaries around expression parsing
- intentionally limited 3D behavior

Do not narrate ordinary TypeScript syntax.

---

## Content details

Provide concise descriptions and limitations for every model.

Examples:

### Lagrange interpolation

- passes exactly through source points
- high degree may oscillate strongly
- unsuitable as a default regression method
- numerically sensitive for many points

### Newton interpolation

- mathematically equivalent interpolating polynomial to Lagrange for the same nodes
- uses divided differences
- can be incrementally extended conceptually
- still inherits high-degree interpolation problems

### Cubic spline

- piecewise cubic
- smoother and usually more stable than one high-degree polynomial
- uses natural boundary conditions here

### R²

- describes variance explained relative to a constant-mean baseline
- does not establish causal correctness
- should not be treated as the sole model-selection criterion

Keep these explanations short enough to remain interface copy.

---

## Acceptance criteria

The repository is complete only when all of the following are true.

### Installation and deployment

- `npm install` succeeds.
- `npm run dev` starts the application.
- `npm run check` succeeds.
- `npm run test:e2e` succeeds after Playwright Chromium is installed.
- `npm run build` creates `dist`.
- Vercel detects and deploys the app without environment variables.
- No backend or serverless function is present.

### Dataset functionality

- all 30 bundled datasets appear
- all bundled files validate
- 24 are 2D and 6 are 3D
- selecting a dataset loads it on demand
- JSON import works
- CSV `x,y` import works
- CSV `x,y,z` import works
- generated 2D formulas work
- generated 3D formulas work
- custom datasets can be saved and deleted locally
- data-table point editing works
- synthetic-data notice is visible

### Model functionality

- all required strategies are registered
- active models are independently configurable
- up to eight active instances work
- supported automatic fits work
- unsupported automatic fits are clearly labelled
- manual parameter adjustment updates the graph
- fitted parameters can be restored
- model reset works
- high polynomial degrees warn
- invalid model domains do not crash the application
- pseudo-Voigt is labelled accurately

### Analysis functionality

- metrics appear where applicable
- residuals can be shown
- formulas and parameters are visible
- 2D and 3D charts render
- chart reset works
- text alternatives and the data table expose chart information

### Persistence and export

- autosave restores a valid workspace
- corrupt storage falls back safely
- dataset JSON export works
- project JSON export and re-import round-trip
- PNG export works
- SVG export works
- print report hides editing chrome and can be saved as PDF
- complete reset restores the initial radioactive-decay state
- complete reset does not delete saved custom datasets

### Quality

- no placeholder controls
- no `TODO` or `FIXME` markers
- no TypeScript errors
- no lint errors
- no failing tests
- no uncaught errors during the smoke test
- no obviously broken layout at desktop and narrow mobile widths
- keyboard focus is visible
- dialogs manage focus
- README commands match the implementation
- ZIP excludes generated dependency and build directories

---

## Implementation sequence

Use this sequence internally to reduce rework, but deliver only the finished repository:

1. scaffold Vite, React, TypeScript, linting, formatting, tests, and CI
2. define dataset, project, model, parameter, and result schemas
3. implement seeded generation and create all bundled datasets
4. implement manifest loading, import, export, and persistence
5. implement expression security and dataset generators
6. implement metrics and numerical utilities
7. implement the strategy registry and 2D interpolation
8. implement automatic 2D fitting
9. implement manual and custom 2D overlays
10. implement limited 3D fitting and overlays
11. implement workspace state and reset semantics
12. implement the three-column UI and responsive layout
13. implement export and print mode
14. implement accessibility behavior and educational copy
15. add unit, component, and browser tests
16. run every verification command
17. fix all failures
18. create `curvebench.zip`

Do not sacrifice correctness by attempting all UI first and leaving the numerical core untested.

---

## Final self-review before delivery

Before producing the ZIP:

1. inspect the repository for placeholders, dead controls, generated junk, and accidental secrets
2. search for `TODO`, `FIXME`, `YOUR_`, `__`, and placeholder text
3. run dataset generation and verify it is deterministic
4. run formatting check
5. run lint
6. run type checking
7. run all unit and component tests
8. run production build
9. run the Playwright smoke test
10. inspect the built application at desktop and narrow viewport sizes
11. verify the default exercise
12. verify every export menu action
13. verify import examples
14. verify project round-trip
15. verify Vercel configuration and README instructions
16. create the ZIP only after checks pass

If a selected third-party package makes the build or tests unreliable, replace it with a simpler compatible approach rather than weakening the acceptance criteria.

---

## Delivery response

Return:

1. a link to `curvebench.zip`
2. a brief list of the implemented capabilities
3. the exact commands used for final verification
4. an honest note about any remaining limitation

There should be no remaining limitation that contradicts a required acceptance criterion. Minor documented numerical or browser-print limitations are acceptable.

The main deliverable is the actual ZIP, not a prose implementation plan.
