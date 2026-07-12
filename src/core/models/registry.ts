import type { Dataset, Dataset2D, Dataset3D, Point2D } from "../datasets/types";
import { compileSafeExpression } from "../expressions/safe-expression";
import { nonlinearLeastSquares, leastSquares } from "../fitting/linear-algebra";
import {
  lagrangeInterpolation,
  linearInterpolation,
  naturalCubicSpline,
  newtonInterpolation,
  type Predictor,
} from "../fitting/interpolation";
import { evaluatePolynomial, fitPolynomial } from "../fitting/polynomial";
import { calculateMetrics } from "../metrics/metrics";
import { datasetRange, parameterValue, spec } from "./helpers";
import type {
  FitResult,
  ModelDefinition,
  ParameterBound,
  ParameterSpec,
  ParameterValues,
  TraceLike,
} from "./types";

const highDegreeWarning = "High-degree polynomials can oscillate strongly and extrapolate poorly.";

function require2D(dataset: Dataset): Dataset2D {
  if (dataset.dimension !== "2d") throw new Error("This model requires a 2D dataset.");
  return dataset;
}

function require3D(dataset: Dataset): Dataset3D {
  if (dataset.dimension !== "3d") throw new Error("This model requires a 3D surface dataset.");
  return dataset;
}

function ranges2D(dataset: Dataset) {
  const x = datasetRange(dataset, "x");
  const y = datasetRange(dataset, "y");
  return { x, y };
}

function nonlinearFit(
  dataset: Dataset2D,
  params: ParameterValues,
  bounds: Record<string, ParameterBound>,
  predictor: (x: number, params: ParameterValues) => number,
): FitResult {
  const result = nonlinearLeastSquares(
    dataset.points.map((point) => [point.x]),
    dataset.points.map((point) => point.y),
    params,
    (input, values) => predictor(input[0]!, values),
    {
      bounds: Object.fromEntries(
        Object.entries(bounds).map(([key, value]) => [key, { min: value.min, max: value.max }]),
      ),
    },
  );
  const predicted = dataset.points.map((point) => predictor(point.x, result.params));
  return {
    params: result.params,
    converged: result.converged,
    message: result.message,
    iterations: result.iterations,
    metrics: calculateMetrics(
      dataset.points.map((point) => point.y),
      predicted,
    ),
  };
}

function interpolationDefinition(
  id: string,
  label: string,
  description: string,
  limitation: string,
  factory: (points: Point2D[]) => Predictor,
): ModelDefinition {
  return {
    id,
    label,
    category: "interpolation",
    dimensions: ["2d"],
    description,
    limitation,
    supportsAutomaticFit: false,
    createInitialParams: () => ({}),
    getParameterSpecs: () => [],
    predict2D: (x, _params, dataset) => factory(require2D(dataset).points)(x),
    formula: () => label,
    validate: (dataset) => {
      if (dataset.dimension !== "2d") return "Interpolation is available only for 2D datasets.";
      if ((id === "lagrange" || id === "newton") && dataset.points.length > 30) {
        return "High-degree global interpolation is limited to 30 points. Use a cubic spline for larger datasets.";
      }
      return null;
    },
  };
}

const piecewiseLinear = interpolationDefinition(
  "piecewise-linear",
  "Piecewise linear interpolation",
  "Connects adjacent observations with straight segments.",
  "The slope changes abruptly at each source point.",
  linearInterpolation,
);
const lagrange = interpolationDefinition(
  "lagrange",
  "Lagrange interpolation",
  "Constructs one polynomial that passes through every source point.",
  "High degree can oscillate strongly and is numerically sensitive.",
  lagrangeInterpolation,
);
const newton = interpolationDefinition(
  "newton",
  "Newton interpolation",
  "Uses divided differences to construct the same interpolating polynomial in Newton form.",
  "It inherits the instability of high-degree global polynomial interpolation.",
  newtonInterpolation,
);
const cubicSpline = interpolationDefinition(
  "cubic-spline",
  "Natural cubic spline",
  "Uses smooth piecewise cubic segments with natural boundary conditions.",
  "Behavior beyond the measured interval should not be treated as prediction.",
  naturalCubicSpline,
);

const linear: ModelDefinition = {
  id: "linear",
  label: "Linear regression",
  category: "regression",
  dimensions: ["2d"],
  description: "Fits y = a·x + b by ordinary least squares.",
  limitation: "A low error does not make a linear mechanism plausible.",
  supportsAutomaticFit: true,
  createInitialParams(dataset) {
    const { y } = ranges2D(dataset);
    return { a: 0, b: (y.min + y.max) / 2 };
  },
  getParameterSpecs(dataset, params) {
    const { x, y } = ranges2D(dataset);
    const slope = y.span / x.span;
    return [
      spec("a", "Slope a", params.a ?? 0, -slope * 20, slope * 20),
      spec("b", "Intercept b", params.b ?? 0, y.min - y.span * 5, y.max + y.span * 5),
    ];
  },
  fit(dataset) {
    const data = require2D(dataset);
    const [a, b] = leastSquares(
      data.points.map((point) => [point.x, 1]),
      data.points.map((point) => point.y),
    );
    return {
      params: { a: a!, b: b! },
      converged: true,
      message: "Least-squares solution calculated.",
    };
  },
  predict2D: (x, params) => parameterValue(params, "a") * x + parameterValue(params, "b"),
  formula: (params) => `y = ${fmt(params.a)}·x + ${fmt(params.b)}`,
};

const polynomial: ModelDefinition = {
  id: "polynomial",
  label: "Polynomial regression",
  category: "regression",
  dimensions: ["2d"],
  description: "Fits a polynomial of a selected degree from 1 through 10.",
  limitation: highDegreeWarning,
  supportsAutomaticFit: true,
  createInitialParams(dataset) {
    const { x, y } = ranges2D(dataset);
    return {
      degree: 2,
      center: (x.min + x.max) / 2,
      scale: x.span / 2,
      c0: (y.min + y.max) / 2,
      c1: 0,
      c2: 0,
    };
  },
  getParameterSpecs(dataset, params) {
    const { x, y } = ranges2D(dataset);
    const degree = Math.round(params.degree ?? 2);
    const result: ParameterSpec[] = [spec("degree", "Degree", degree, 1, 10, 1, { integer: true })];
    for (let index = 0; index <= degree; index += 1) {
      result.push(
        spec(`c${index}`, `c${index}`, params[`c${index}`] ?? 0, -y.span * 100, y.span * 100),
      );
    }
    result.push(
      spec(
        "center",
        "x center",
        params.center ?? (x.min + x.max) / 2,
        x.min - x.span,
        x.max + x.span,
        undefined,
        { hidden: true },
      ),
    );
    result.push(
      spec("scale", "x scale", params.scale ?? x.span / 2, x.span / 1000, x.span * 10, undefined, {
        hidden: true,
      }),
    );
    return result;
  },
  fit(dataset, params) {
    const data = require2D(dataset);
    const degree = Math.max(1, Math.min(10, Math.round(params.degree ?? 2)));
    const result = fitPolynomial(data.points, degree);
    const fitted: ParameterValues = { degree, center: result.center, scale: result.scale };
    result.coefficients.forEach((coefficient, index) => (fitted[`c${index}`] = coefficient));
    return {
      params: fitted,
      converged: true,
      message:
        degree >= 7
          ? `Fit calculated. Warning: ${highDegreeWarning}`
          : "QR least-squares solution calculated.",
    };
  },
  predict2D(x, params) {
    const degree = Math.round(parameterValue(params, "degree"));
    const coefficients = Array.from({ length: degree + 1 }, (_, index) => params[`c${index}`] ?? 0);
    return evaluatePolynomial(x, {
      coefficients,
      center: parameterValue(params, "center"),
      scale: Math.max(Math.abs(parameterValue(params, "scale")), 1e-12),
    });
  },
  formula(params) {
    const degree = Math.round(params.degree ?? 2);
    return `y = ${Array.from({ length: degree + 1 }, (_, index) => `${fmt(params[`c${index}`])}·u^${index}`).join(" + ")}, u=(x-${fmt(params.center)})/${fmt(params.scale)}`;
  },
  validate(dataset, params) {
    const degree = Math.round(params.degree ?? 2);
    if (dataset.dimension !== "2d") return "Polynomial regression requires 2D data.";
    if (degree >= dataset.points.length)
      return "Polynomial degree must be lower than the point count.";
    return null;
  },
};

const exponentialPredict = (x: number, p: ParameterValues) => p.c! + p.a! * Math.exp(p.b! * x);
const exponential: ModelDefinition = {
  id: "exponential",
  label: "Exponential fit",
  category: "regression",
  dimensions: ["2d"],
  description: "Fits y = c + a·exp(b·x).",
  limitation: "Initial values and parameter bounds matter when the data is weakly exponential.",
  supportsAutomaticFit: true,
  createInitialParams(dataset) {
    const data = require2D(dataset);
    const { x, y } = ranges2D(data);
    const rising = data.points.at(-1)!.y >= data.points[0]!.y;
    return {
      c: y.min,
      a: rising ? Math.max(y.span, 1) : Math.max(y.max - y.min, 1),
      b: (rising ? 1 : -1) / x.span,
    };
  },
  getParameterSpecs(dataset, params) {
    const { x, y } = ranges2D(dataset);
    return [
      spec("c", "Baseline c", params.c ?? y.min, y.min - y.span * 5, y.max + y.span * 5),
      spec("a", "Amplitude a", params.a ?? y.span, -y.span * 20, y.span * 20),
      spec("b", "Rate b", params.b ?? 1 / x.span, -30 / x.span, 30 / x.span),
    ];
  },
  fit(dataset, params, bounds) {
    return nonlinearFit(require2D(dataset), params, bounds, exponentialPredict);
  },
  predict2D: exponentialPredict,
  formula: (p) => `y = ${fmt(p.c)} + ${fmt(p.a)}·exp(${fmt(p.b)}·x)`,
};

const logarithmic: ModelDefinition = {
  id: "logarithmic",
  label: "Logarithmic fit",
  category: "regression",
  dimensions: ["2d"],
  description: "Fits y = a·ln(x) + b.",
  limitation: "Every x-value must be strictly positive.",
  supportsAutomaticFit: true,
  createInitialParams(dataset) {
    const { y } = ranges2D(dataset);
    return { a: 1, b: (y.min + y.max) / 2 };
  },
  getParameterSpecs(dataset, params) {
    const { y } = ranges2D(dataset);
    return [
      spec("a", "Scale a", params.a ?? 1, -y.span * 20, y.span * 20),
      spec("b", "Offset b", params.b ?? 0, y.min - y.span * 10, y.max + y.span * 10),
    ];
  },
  fit(dataset) {
    const data = require2D(dataset);
    if (data.points.some((point) => point.x <= 0))
      throw new Error("Logarithmic fitting requires x > 0.");
    const [a, b] = leastSquares(
      data.points.map((point) => [Math.log(point.x), 1]),
      data.points.map((point) => point.y),
    );
    return {
      params: { a: a!, b: b! },
      converged: true,
      message: "Transformed least-squares solution calculated.",
    };
  },
  predict2D(x, params) {
    if (x <= 0) throw new Error("Logarithmic fitting requires x > 0.");
    return params.a! * Math.log(x) + params.b!;
  },
  formula: (p) => `y = ${fmt(p.a)}·ln(x) + ${fmt(p.b)}`,
  validate: (dataset) =>
    dataset.dimension === "2d" && dataset.points.some((point) => point.x <= 0)
      ? "Logarithmic fitting requires x > 0."
      : null,
};

const powerLaw: ModelDefinition = {
  id: "power-law",
  label: "Power-law fit",
  category: "regression",
  dimensions: ["2d"],
  description: "Fits y = a·x^b using a log-transformed initial solution.",
  limitation: "Automatic fitting requires positive x and y values.",
  supportsAutomaticFit: true,
  createInitialParams: () => ({ a: 1, b: 1 }),
  getParameterSpecs(dataset, params) {
    const { y } = ranges2D(dataset);
    return [
      spec("a", "Scale a", params.a ?? 1, -y.span * 20, y.max * 20),
      spec("b", "Exponent b", params.b ?? 1, -10, 10, 0.01),
    ];
  },
  fit(dataset) {
    const data = require2D(dataset);
    if (data.points.some((point) => point.x <= 0 || point.y <= 0))
      throw new Error("Power-law fitting requires x > 0 and y > 0.");
    const [b, logA] = leastSquares(
      data.points.map((point) => [Math.log(point.x), 1]),
      data.points.map((point) => Math.log(point.y)),
    );
    return {
      params: { a: Math.exp(logA!), b: b! },
      converged: true,
      message: "Log-transformed least-squares solution calculated.",
    };
  },
  predict2D(x, params) {
    if (x <= 0) throw new Error("Power-law evaluation requires x > 0.");
    return params.a! * x ** params.b!;
  },
  formula: (p) => `y = ${fmt(p.a)}·x^${fmt(p.b)}`,
};

function peakSpecs(dataset: Dataset, params: ParameterValues, widthKey: "sigma" | "gamma") {
  const { x, y } = ranges2D(dataset);
  return [
    spec("b", "Baseline", params.b ?? y.min, y.min - y.span * 3, y.max + y.span * 3),
    spec("A", "Amplitude", params.A ?? y.span, -y.span * 10, y.span * 10),
    spec("x0", "Center", params.x0 ?? (x.min + x.max) / 2, x.min - x.span, x.max + x.span),
    spec(
      widthKey,
      widthKey === "sigma" ? "Sigma" : "Gamma",
      params[widthKey] ?? x.span / 6,
      x.span / 1000,
      x.span * 4,
    ),
  ];
}

function peakInitial(dataset: Dataset, widthKey: "sigma" | "gamma") {
  const data = require2D(dataset);
  const { x, y } = ranges2D(data);
  const peak = data.points.reduce(
    (best, point) => (point.y > best.y ? point : best),
    data.points[0]!,
  );
  return { b: y.min, A: y.span, x0: peak.x, [widthKey]: x.span / 6 };
}

const logisticPredict = (x: number, p: ParameterValues) =>
  p.b! + p.L! / (1 + Math.exp(-p.k! * (x - p.x0!)));
const logistic: ModelDefinition = {
  id: "logistic",
  label: "Logistic fit",
  category: "regression",
  dimensions: ["2d"],
  description: "Fits a baseline-shifted logistic curve.",
  limitation: "Non-sigmoidal data may produce unstable or boundary-limited parameters.",
  supportsAutomaticFit: true,
  createInitialParams(dataset) {
    const data = require2D(dataset);
    const { x, y } = ranges2D(data);
    const rising = data.points.at(-1)!.y >= data.points[0]!.y;
    return {
      b: y.min,
      L: rising ? y.span : -y.span,
      k: (rising ? 4 : -4) / x.span,
      x0: (x.min + x.max) / 2,
    };
  },
  getParameterSpecs(dataset, params) {
    const { x, y } = ranges2D(dataset);
    return [
      spec("b", "Baseline b", params.b ?? y.min, y.min - y.span * 5, y.max + y.span * 5),
      spec("L", "Range L", params.L ?? y.span, -y.span * 20, y.span * 20),
      spec("k", "Slope k", params.k ?? 4 / x.span, -40 / x.span, 40 / x.span),
      spec("x0", "Midpoint x₀", params.x0 ?? (x.min + x.max) / 2, x.min - x.span, x.max + x.span),
    ];
  },
  fit(dataset, params, bounds) {
    return nonlinearFit(require2D(dataset), params, bounds, logisticPredict);
  },
  predict2D: logisticPredict,
  formula: (p) => `y = ${fmt(p.b)} + ${fmt(p.L)}/(1 + exp(-${fmt(p.k)}·(x-${fmt(p.x0)})))`,
};

const gaussianPredict = (x: number, p: ParameterValues) =>
  p.b! + p.A! * Math.exp(-0.5 * ((x - p.x0!) / p.sigma!) ** 2);
const gaussian: ModelDefinition = {
  id: "gaussian",
  label: "Gaussian fit",
  category: "regression",
  dimensions: ["2d"],
  description: "Fits a Gaussian peak with baseline, amplitude, center, and width.",
  limitation: "A single symmetric peak is assumed.",
  supportsAutomaticFit: true,
  createInitialParams: (dataset) => peakInitial(dataset, "sigma"),
  getParameterSpecs: (dataset, params) => peakSpecs(dataset, params, "sigma"),
  fit: (dataset, params, bounds) =>
    nonlinearFit(require2D(dataset), params, bounds, gaussianPredict),
  predict2D: gaussianPredict,
  formula: (p) => `y = ${fmt(p.b)} + ${fmt(p.A)}·exp(-0.5·((x-${fmt(p.x0)})/${fmt(p.sigma)})²)`,
};

const lorentzianPredict = (x: number, p: ParameterValues) =>
  p.b! + (p.A! * p.gamma! ** 2) / ((x - p.x0!) ** 2 + p.gamma! ** 2);
const lorentzian: ModelDefinition = {
  id: "lorentzian",
  label: "Lorentzian fit",
  category: "regression",
  dimensions: ["2d"],
  description: "Fits a Lorentzian peak with long tails.",
  limitation: "A single symmetric peak is assumed.",
  supportsAutomaticFit: true,
  createInitialParams: (dataset) => peakInitial(dataset, "gamma"),
  getParameterSpecs: (dataset, params) => peakSpecs(dataset, params, "gamma"),
  fit: (dataset, params, bounds) =>
    nonlinearFit(require2D(dataset), params, bounds, lorentzianPredict),
  predict2D: lorentzianPredict,
  formula: (p) => `y = ${fmt(p.b)} + ${fmt(p.A)}·γ²/((x-${fmt(p.x0)})²+γ²), γ=${fmt(p.gamma)}`,
};

const pseudoVoigtPredict = (x: number, p: ParameterValues) => {
  const gaussianPart = Math.exp(-0.5 * ((x - p.x0!) / p.width!) ** 2);
  const lorentzianPart = p.width! ** 2 / ((x - p.x0!) ** 2 + p.width! ** 2);
  return p.b! + p.A! * (p.eta! * lorentzianPart + (1 - p.eta!) * gaussianPart);
};
const pseudoVoigt: ModelDefinition = {
  id: "pseudo-voigt",
  label: "Pseudo-Voigt approximation",
  category: "regression",
  dimensions: ["2d"],
  description: "Fits a weighted Gaussian/Lorentzian peak approximation.",
  limitation: "This is not an exact Voigt evaluation; η blends the two component shapes.",
  supportsAutomaticFit: true,
  createInitialParams(dataset) {
    const peak = peakInitial(dataset, "sigma");
    return { b: peak.b!, A: peak.A!, x0: peak.x0!, width: peak.sigma!, eta: 0.5 };
  },
  getParameterSpecs(dataset, params) {
    const { x, y } = ranges2D(dataset);
    return [
      spec("b", "Baseline", params.b ?? y.min, y.min - y.span * 3, y.max + y.span * 3),
      spec("A", "Amplitude", params.A ?? y.span, -y.span * 10, y.span * 10),
      spec("x0", "Center", params.x0 ?? (x.min + x.max) / 2, x.min - x.span, x.max + x.span),
      spec("width", "Shared width", params.width ?? x.span / 6, x.span / 1000, x.span * 4),
      spec("eta", "Lorentzian fraction η", params.eta ?? 0.5, 0, 1, 0.01),
    ];
  },
  fit: (dataset, params, bounds) =>
    nonlinearFit(require2D(dataset), params, bounds, pseudoVoigtPredict),
  predict2D: pseudoVoigtPredict,
  formula: (p) => `y = baseline + A·[${fmt(p.eta)}·L + ${fmt(1 - (p.eta ?? 0.5))}·G]`,
};

const sinusoid: ModelDefinition = {
  id: "sinusoid",
  label: "Sinusoid",
  category: "manual",
  dimensions: ["2d"],
  description: "Manual sinusoidal overlay y = b + A·sin(ωx + φ).",
  limitation: "Automatic frequency estimation is not included.",
  supportsAutomaticFit: false,
  createInitialParams(dataset) {
    const { x, y } = ranges2D(dataset);
    return { b: (y.min + y.max) / 2, A: y.span / 2, omega: (2 * Math.PI) / x.span, phi: 0 };
  },
  getParameterSpecs(dataset, params) {
    const { x, y } = ranges2D(dataset);
    return [
      spec("b", "Baseline", params.b ?? 0, y.min - y.span * 4, y.max + y.span * 4),
      spec("A", "Amplitude", params.A ?? y.span / 2, -y.span * 6, y.span * 6),
      spec(
        "omega",
        "Angular frequency ω",
        params.omega ?? (2 * Math.PI) / x.span,
        0,
        (40 * Math.PI) / x.span,
      ),
      spec("phi", "Phase φ", params.phi ?? 0, -2 * Math.PI, 2 * Math.PI),
    ];
  },
  predict2D: (x, p) => p.b! + p.A! * Math.sin(p.omega! * x + p.phi!),
  formula: (p) => `y = ${fmt(p.b)} + ${fmt(p.A)}·sin(${fmt(p.omega)}·x + ${fmt(p.phi)})`,
};

const dampedSinusoid: ModelDefinition = {
  id: "damped-sinusoid",
  label: "Damped sinusoid",
  category: "manual",
  dimensions: ["2d"],
  description: "Manual damped oscillation y = b + A·exp(-d·(x-xmin))·sin(ωx+φ).",
  limitation: "The damping origin is the left edge of the graph interval.",
  supportsAutomaticFit: false,
  createInitialParams(dataset) {
    const { x, y } = ranges2D(dataset);
    return {
      b: (y.min + y.max) / 2,
      A: y.span / 2,
      damping: 1 / x.span,
      omega: (4 * Math.PI) / x.span,
      phi: 0,
    };
  },
  getParameterSpecs(dataset, params) {
    const { x, y } = ranges2D(dataset);
    return [
      spec("b", "Baseline", params.b ?? 0, y.min - y.span * 4, y.max + y.span * 4),
      spec("A", "Amplitude", params.A ?? y.span / 2, -y.span * 6, y.span * 6),
      spec("damping", "Damping d", params.damping ?? 1 / x.span, 0, 20 / x.span),
      spec(
        "omega",
        "Angular frequency ω",
        params.omega ?? (4 * Math.PI) / x.span,
        0,
        (50 * Math.PI) / x.span,
      ),
      spec("phi", "Phase φ", params.phi ?? 0, -2 * Math.PI, 2 * Math.PI),
    ];
  },
  predict2D(x, p, dataset) {
    const xmin = datasetRange(dataset, "x").min;
    return p.b! + p.A! * Math.exp(-p.damping! * (x - xmin)) * Math.sin(p.omega! * x + p.phi!);
  },
  formula: (p) =>
    `y = ${fmt(p.b)} + ${fmt(p.A)}·exp(-${fmt(p.damping)}·Δx)·sin(${fmt(p.omega)}·x+${fmt(p.phi)})`,
};

function ellipseTrace(
  dataset: Dataset,
  params: ParameterValues,
  name: string,
  circleOnly: boolean,
): TraceLike[] {
  require2D(dataset);
  const count = 241;
  const theta = Array.from({ length: count }, (_, index) => (2 * Math.PI * index) / (count - 1));
  const rotation = circleOnly ? 0 : params.rotation!;
  const rx = params.rx!;
  const ry = circleOnly ? rx : params.ry!;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return [
    {
      type: "scatter",
      mode: "lines",
      name,
      x: theta.map((angle) => params.cx! + rx * Math.cos(angle) * cos - ry * Math.sin(angle) * sin),
      y: theta.map((angle) => params.cy! + rx * Math.cos(angle) * sin + ry * Math.sin(angle) * cos),
      line: { width: 2.2, dash: "dash" },
    },
  ];
}

const circle: ModelDefinition = {
  id: "circle",
  label: "Circle",
  category: "manual",
  dimensions: ["2d"],
  description: "Manual parametric circle overlay.",
  limitation: "It is a geometric overlay, not y=f(x), so regression metrics are omitted.",
  supportsAutomaticFit: false,
  createInitialParams(dataset) {
    const { x, y } = ranges2D(dataset);
    return { cx: (x.min + x.max) / 2, cy: (y.min + y.max) / 2, rx: Math.min(x.span, y.span) / 4 };
  },
  getParameterSpecs(dataset, params) {
    const { x, y } = ranges2D(dataset);
    return [
      spec("cx", "Center x", params.cx ?? 0, x.min - x.span, x.max + x.span),
      spec("cy", "Center y", params.cy ?? 0, y.min - y.span, y.max + y.span),
      spec(
        "rx",
        "Radius",
        params.rx ?? 1,
        Math.min(x.span, y.span) / 1000,
        Math.max(x.span, y.span) * 2,
      ),
    ];
  },
  createTrace: (dataset, params, name) => ellipseTrace(dataset, params, name, true),
  formula: (p) => `(x-${fmt(p.cx)})² + (y-${fmt(p.cy)})² = ${fmt(p.rx)}²`,
};

const ellipse: ModelDefinition = {
  id: "ellipse",
  label: "Ellipse",
  category: "manual",
  dimensions: ["2d"],
  description: "Manual rotated parametric ellipse overlay.",
  limitation: "It is a geometric overlay, so pointwise regression metrics are omitted.",
  supportsAutomaticFit: false,
  createInitialParams(dataset) {
    const { x, y } = ranges2D(dataset);
    return {
      cx: (x.min + x.max) / 2,
      cy: (y.min + y.max) / 2,
      rx: x.span / 4,
      ry: y.span / 4,
      rotation: 0,
    };
  },
  getParameterSpecs(dataset, params) {
    const { x, y } = ranges2D(dataset);
    return [
      spec("cx", "Center x", params.cx ?? 0, x.min - x.span, x.max + x.span),
      spec("cy", "Center y", params.cy ?? 0, y.min - y.span, y.max + y.span),
      spec("rx", "Radius x", params.rx ?? x.span / 4, x.span / 1000, x.span * 2),
      spec("ry", "Radius y", params.ry ?? y.span / 4, y.span / 1000, y.span * 2),
      spec("rotation", "Rotation", params.rotation ?? 0, -Math.PI, Math.PI),
    ];
  },
  createTrace: (dataset, params, name) => ellipseTrace(dataset, params, name, false),
  formula: (p) => `Rotated ellipse centered at (${fmt(p.cx)}, ${fmt(p.cy)})`,
};

const custom2D: ModelDefinition = {
  id: "custom-2d",
  label: "Custom y=f(x)",
  category: "manual",
  dimensions: ["2d"],
  description: "A restricted mathematical expression with up to eight named constants.",
  limitation: "Custom formulas are manual overlays and are not automatically optimized.",
  supportsAutomaticFit: false,
  createInitialParams: () => ({}),
  getParameterSpecs: (_dataset, params) =>
    Object.keys(params).map((key) => spec(key, key, params[key]!, -1000, 1000, 0.01)),
  predict2D(x, params, _dataset, expression) {
    if (!expression) throw new Error("Custom expression is missing.");
    return compileSafeExpression(expression, ["x"], true).evaluate({ x, ...params });
  },
  formula: (_params, expression) => `y = ${expression ?? "?"}`,
};

const plane3D: ModelDefinition = {
  id: "plane-3d",
  label: "Plane",
  category: "regression",
  dimensions: ["3d"],
  description: "Fits z = a·x + b·y + c by least squares.",
  limitation: "A plane cannot represent curvature.",
  supportsAutomaticFit: true,
  createInitialParams(dataset) {
    const z = datasetRange(dataset, "z");
    return { a: 0, b: 0, c: (z.min + z.max) / 2 };
  },
  getParameterSpecs(dataset, params) {
    const x = datasetRange(dataset, "x");
    const y = datasetRange(dataset, "y");
    const z = datasetRange(dataset, "z");
    return [
      spec("a", "x slope", params.a ?? 0, (-z.span * 20) / x.span, (z.span * 20) / x.span),
      spec("b", "y slope", params.b ?? 0, (-z.span * 20) / y.span, (z.span * 20) / y.span),
      spec("c", "Offset", params.c ?? 0, z.min - z.span * 10, z.max + z.span * 10),
    ];
  },
  fit(dataset) {
    const data = require3D(dataset);
    const [a, b, c] = leastSquares(
      data.points.map((point) => [point.x, point.y, 1]),
      data.points.map((point) => point.z),
    );
    return {
      params: { a: a!, b: b!, c: c! },
      converged: true,
      message: "Least-squares plane calculated.",
    };
  },
  predict3D: (x, y, p) => p.a! * x + p.b! * y + p.c!,
  formula: (p) => `z = ${fmt(p.a)}·x + ${fmt(p.b)}·y + ${fmt(p.c)}`,
};

const quadraticSurface: ModelDefinition = {
  id: "quadratic-surface",
  label: "Quadratic surface",
  category: "regression",
  dimensions: ["3d"],
  description: "Fits a complete second-degree surface including an x·y interaction.",
  limitation: "It represents only globally quadratic curvature.",
  supportsAutomaticFit: true,
  createInitialParams(dataset) {
    const z = datasetRange(dataset, "z");
    return { a: 0, b: 0, c: 0, d: 0, e: 0, f: (z.min + z.max) / 2 };
  },
  getParameterSpecs(dataset, params) {
    const z = datasetRange(dataset, "z");
    return ["a", "b", "c", "d", "e", "f"].map((key) =>
      spec(key, key, params[key] ?? 0, -z.span * 100, z.span * 100),
    );
  },
  fit(dataset) {
    const data = require3D(dataset);
    const [a, b, c, d, e, f] = leastSquares(
      data.points.map((point) => [
        point.x ** 2,
        point.y ** 2,
        point.x * point.y,
        point.x,
        point.y,
        1,
      ]),
      data.points.map((point) => point.z),
    );
    return {
      params: { a: a!, b: b!, c: c!, d: d!, e: e!, f: f! },
      converged: true,
      message: "Least-squares quadratic surface calculated.",
    };
  },
  predict3D: (x, y, p) => p.a! * x ** 2 + p.b! * y ** 2 + p.c! * x * y + p.d! * x + p.e! * y + p.f!,
  formula: (p) =>
    `z = ${fmt(p.a)}x² + ${fmt(p.b)}y² + ${fmt(p.c)}xy + ${fmt(p.d)}x + ${fmt(p.e)}y + ${fmt(p.f)}`,
};

const gaussianSurface: ModelDefinition = {
  id: "gaussian-surface",
  label: "Gaussian surface",
  category: "manual",
  dimensions: ["3d"],
  description: "Manual anisotropic Gaussian surface with baseline and amplitude.",
  limitation: "Automatic surface fitting is not included in this version.",
  supportsAutomaticFit: false,
  createInitialParams(dataset) {
    const x = datasetRange(dataset, "x");
    const y = datasetRange(dataset, "y");
    const z = datasetRange(dataset, "z");
    const data = require3D(dataset);
    const peak = data.points.reduce(
      (best, point) => (point.z > best.z ? point : best),
      data.points[0]!,
    );
    return {
      baseline: z.min,
      amplitude: z.span,
      cx: peak.x,
      cy: peak.y,
      sx: x.span / 5,
      sy: y.span / 5,
    };
  },
  getParameterSpecs(dataset, params) {
    const x = datasetRange(dataset, "x");
    const y = datasetRange(dataset, "y");
    const z = datasetRange(dataset, "z");
    return [
      spec(
        "baseline",
        "Baseline",
        params.baseline ?? z.min,
        z.min - z.span * 5,
        z.max + z.span * 5,
      ),
      spec("amplitude", "Amplitude", params.amplitude ?? z.span, -z.span * 10, z.span * 10),
      spec("cx", "Center x", params.cx ?? 0, x.min - x.span, x.max + x.span),
      spec("cy", "Center y", params.cy ?? 0, y.min - y.span, y.max + y.span),
      spec("sx", "Width x", params.sx ?? x.span / 5, x.span / 1000, x.span * 4),
      spec("sy", "Width y", params.sy ?? y.span / 5, y.span / 1000, y.span * 4),
    ];
  },
  predict3D: (x, y, p) =>
    p.baseline! +
    p.amplitude! * Math.exp(-0.5 * (((x - p.cx!) / p.sx!) ** 2 + ((y - p.cy!) / p.sy!) ** 2)),
  formula: (p) =>
    `z = ${fmt(p.baseline)} + ${fmt(p.amplitude)}·exp(-½[((x-${fmt(p.cx)})/${fmt(p.sx)})²+((y-${fmt(p.cy)})/${fmt(p.sy)})²])`,
};

function ellipsoidTrace(
  dataset: Dataset,
  params: ParameterValues,
  name: string,
  sphereOnly: boolean,
): TraceLike[] {
  require3D(dataset);
  const theta = Array.from({ length: 32 }, (_, index) => (2 * Math.PI * index) / 31);
  const phi = Array.from({ length: 18 }, (_, index) => (Math.PI * index) / 17);
  const rx = params.rx!;
  const ry = sphereOnly ? rx : params.ry!;
  const rz = sphereOnly ? rx : params.rz!;
  return [
    {
      type: "surface",
      name,
      x: phi.map((p) => theta.map((t) => params.cx! + rx * Math.sin(p) * Math.cos(t))),
      y: phi.map((p) => theta.map((t) => params.cy! + ry * Math.sin(p) * Math.sin(t))),
      z: phi.map((p) => theta.map(() => params.cz! + rz * Math.cos(p))),
      opacity: 0.42,
      showscale: false,
    },
  ];
}

function ellipsoidSpecs(dataset: Dataset, params: ParameterValues, sphereOnly: boolean) {
  const x = datasetRange(dataset, "x");
  const y = datasetRange(dataset, "y");
  const z = datasetRange(dataset, "z");
  const specs = [
    spec("cx", "Center x", params.cx ?? 0, x.min - x.span, x.max + x.span),
    spec("cy", "Center y", params.cy ?? 0, y.min - y.span, y.max + y.span),
    spec("cz", "Center z", params.cz ?? 0, z.min - z.span, z.max + z.span),
    spec(
      "rx",
      sphereOnly ? "Radius" : "Radius x",
      params.rx ?? x.span / 4,
      Math.min(x.span, y.span, z.span) / 1000,
      Math.max(x.span, y.span, z.span) * 2,
    ),
  ];
  if (!sphereOnly) {
    specs.push(spec("ry", "Radius y", params.ry ?? y.span / 4, y.span / 1000, y.span * 2));
    specs.push(spec("rz", "Radius z", params.rz ?? z.span / 4, z.span / 1000, z.span * 2));
  }
  return specs;
}

const sphere: ModelDefinition = {
  id: "sphere",
  label: "Sphere",
  category: "manual",
  dimensions: ["3d"],
  description: "Manual geometric sphere overlay.",
  limitation: "Automatic geometric fitting and pointwise z metrics are omitted.",
  supportsAutomaticFit: false,
  createInitialParams(dataset) {
    const x = datasetRange(dataset, "x");
    const y = datasetRange(dataset, "y");
    const z = datasetRange(dataset, "z");
    return {
      cx: (x.min + x.max) / 2,
      cy: (y.min + y.max) / 2,
      cz: (z.min + z.max) / 2,
      rx: Math.min(x.span, y.span, z.span) / 4,
    };
  },
  getParameterSpecs: (dataset, params) => ellipsoidSpecs(dataset, params, true),
  createTrace: (dataset, params, name) => ellipsoidTrace(dataset, params, name, true),
  formula: (p) => `(x-${fmt(p.cx)})²+(y-${fmt(p.cy)})²+(z-${fmt(p.cz)})²=${fmt(p.rx)}²`,
};

const ellipsoid3D: ModelDefinition = {
  id: "ellipsoid-3d",
  label: "Ellipsoid",
  category: "manual",
  dimensions: ["3d"],
  description: "Manual axis-aligned ellipsoid overlay.",
  limitation: "Automatic fitting and rotation are intentionally omitted.",
  supportsAutomaticFit: false,
  createInitialParams(dataset) {
    const x = datasetRange(dataset, "x");
    const y = datasetRange(dataset, "y");
    const z = datasetRange(dataset, "z");
    return {
      cx: (x.min + x.max) / 2,
      cy: (y.min + y.max) / 2,
      cz: (z.min + z.max) / 2,
      rx: x.span / 4,
      ry: y.span / 4,
      rz: z.span / 4,
    };
  },
  getParameterSpecs: (dataset, params) => ellipsoidSpecs(dataset, params, false),
  createTrace: (dataset, params, name) => ellipsoidTrace(dataset, params, name, false),
  formula: (p) => `Axis-aligned ellipsoid centered at (${fmt(p.cx)}, ${fmt(p.cy)}, ${fmt(p.cz)})`,
};

const custom3D: ModelDefinition = {
  id: "custom-3d",
  label: "Custom z=f(x,y)",
  category: "manual",
  dimensions: ["3d"],
  description: "A restricted surface expression with up to eight named constants.",
  limitation: "Custom formulas are manual overlays and are not automatically optimized.",
  supportsAutomaticFit: false,
  createInitialParams: () => ({}),
  getParameterSpecs: (_dataset, params) =>
    Object.keys(params).map((key) => spec(key, key, params[key]!, -1000, 1000, 0.01)),
  predict3D(x, y, params, _dataset, expression) {
    if (!expression) throw new Error("Custom expression is missing.");
    return compileSafeExpression(expression, ["x", "y"], true).evaluate({ x, y, ...params });
  },
  formula: (_params, expression) => `z = ${expression ?? "?"}`,
};

export const modelDefinitions: ModelDefinition[] = [
  piecewiseLinear,
  lagrange,
  newton,
  cubicSpline,
  linear,
  polynomial,
  exponential,
  logarithmic,
  powerLaw,
  logistic,
  gaussian,
  lorentzian,
  pseudoVoigt,
  sinusoid,
  dampedSinusoid,
  circle,
  ellipse,
  custom2D,
  plane3D,
  quadraticSurface,
  gaussianSurface,
  sphere,
  ellipsoid3D,
  custom3D,
];

export const modelRegistry = new Map(
  modelDefinitions.map((definition) => [definition.id, definition]),
);

export function getModelDefinition(id: string): ModelDefinition {
  const definition = modelRegistry.get(id);
  if (!definition) throw new Error(`Unsupported model strategy '${id}'.`);
  return definition;
}

export function modelOptionsFor(dataset: Dataset): ModelDefinition[] {
  return modelDefinitions.filter((definition) => definition.dimensions.includes(dataset.dimension));
}

export function createCustomParameters(
  expression: string,
  dimension: "2d" | "3d",
): ParameterValues {
  const compiled = compileSafeExpression(expression, dimension === "2d" ? ["x"] : ["x", "y"], true);
  return Object.fromEntries(compiled.parameters.map((name) => [name, 1]));
}

export function fitActiveModel(
  definition: ModelDefinition,
  dataset: Dataset,
  params: ParameterValues,
  bounds: Record<string, ParameterBound>,
): FitResult {
  if (!definition.fit) throw new Error(`${definition.label} does not support automatic fitting.`);
  return definition.fit(dataset, params, bounds);
}

export function formulaFor(
  definition: ModelDefinition,
  params: ParameterValues,
  expression?: string,
): string {
  return definition.formula(params, expression);
}

function fmt(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "?";
  const absolute = Math.abs(value);
  if ((absolute > 0 && absolute < 0.001) || absolute >= 10000) return value.toExponential(3);
  return Number(value.toPrecision(5)).toString();
}
