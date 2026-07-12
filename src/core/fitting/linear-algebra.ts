import { Matrix, QrDecomposition, solve } from "ml-matrix";

export function leastSquares(design: number[][], targets: number[]): number[] {
  if (design.length !== targets.length || design.length === 0) {
    throw new Error("Least-squares input dimensions do not match.");
  }
  const columns = design[0]?.length ?? 0;
  if (columns === 0 || design.some((row) => row.length !== columns)) {
    throw new Error("Least-squares design matrix is invalid.");
  }
  try {
    const decomposition = new QrDecomposition(new Matrix(design));
    return decomposition.solve(Matrix.columnVector(targets)).to1DArray();
  } catch (error) {
    throw new Error(`Least-squares system is singular or ill-conditioned: ${messageOf(error)}`, {
      cause: error,
    });
  }
}

export interface NonlinearFitOptions {
  maxIterations?: number;
  tolerance?: number;
  damping?: number;
  bounds?: Record<string, { min: number; max: number }>;
}

export interface NonlinearFitResult {
  params: Record<string, number>;
  converged: boolean;
  iterations: number;
  message: string;
  objective: number;
}

export function nonlinearLeastSquares(
  inputs: number[][],
  targets: number[],
  initial: Record<string, number>,
  predictor: (input: number[], params: Record<string, number>) => number,
  options: NonlinearFitOptions = {},
): NonlinearFitResult {
  const keys = Object.keys(initial);
  if (keys.length === 0) throw new Error("Nonlinear fitting requires parameters.");
  if (inputs.length !== targets.length || inputs.length < keys.length) {
    throw new Error("The dataset does not contain enough observations for this model.");
  }
  const maxIterations = options.maxIterations ?? 160;
  const tolerance = options.tolerance ?? 1e-8;
  let lambda = options.damping ?? 1e-2;
  let vector = keys.map((key) => initial[key]!);
  let current = objective(vector);
  let iterations = 0;

  for (; iterations < maxIterations; iterations += 1) {
    const params = toParams(vector);
    const predictions = inputs.map((input) => predictor(input, params));
    if (predictions.some((value) => !Number.isFinite(value))) {
      return result(false, "Model produced a non-finite value.");
    }
    const residuals = targets.map((target, index) => target - predictions[index]!);
    const jacobian = inputs.map((input, rowIndex) =>
      keys.map((key, parameterIndex) => {
        const base = vector[parameterIndex]!;
        const step = Math.max(Math.abs(base) * 1e-5, 1e-6);
        const shifted = [...vector];
        shifted[parameterIndex] = clamp(key, base + step);
        const denominator = shifted[parameterIndex]! - base;
        if (Math.abs(denominator) < Number.EPSILON) return 0;
        const value = predictor(input, toParams(shifted));
        return (value - predictions[rowIndex]!) / denominator;
      }),
    );

    const j = new Matrix(jacobian);
    const jt = j.transpose();
    const normal = jt.mmul(j);
    for (let index = 0; index < keys.length; index += 1) {
      normal.set(index, index, normal.get(index, index) + lambda);
    }
    const gradient = jt.mmul(Matrix.columnVector(residuals));
    let delta: number[];
    try {
      delta = solve(normal, gradient).to1DArray();
    } catch {
      lambda *= 10;
      continue;
    }
    if (delta.some((value) => !Number.isFinite(value))) {
      return result(false, "Optimizer produced a non-finite parameter update.");
    }
    const candidate = vector.map((value, index) => clamp(keys[index]!, value + delta[index]!));
    const candidateObjective = objective(candidate);
    if (candidateObjective < current) {
      const improvement = current - candidateObjective;
      vector = candidate;
      current = candidateObjective;
      lambda = Math.max(1e-9, lambda * 0.35);
      if (improvement <= tolerance * Math.max(1, current) || norm(delta) <= tolerance) {
        return result(true, "Fit converged.");
      }
    } else {
      lambda = Math.min(1e12, lambda * 4);
    }
  }
  return result(false, `Fit did not converge within ${maxIterations} iterations.`);

  function objective(candidate: number[]): number {
    const params = toParams(candidate);
    let value = 0;
    for (let index = 0; index < inputs.length; index += 1) {
      const prediction = predictor(inputs[index]!, params);
      if (!Number.isFinite(prediction)) return Number.POSITIVE_INFINITY;
      const residual = targets[index]! - prediction;
      value += residual * residual;
    }
    return value;
  }

  function toParams(candidate: number[]): Record<string, number> {
    return Object.fromEntries(keys.map((key, index) => [key, candidate[index]!])) as Record<
      string,
      number
    >;
  }

  function clamp(key: string, value: number): number {
    const bound = options.bounds?.[key];
    if (!bound) return value;
    return Math.max(bound.min, Math.min(bound.max, value));
  }

  function result(converged: boolean, message: string): NonlinearFitResult {
    return { params: toParams(vector), converged, iterations, message, objective: current };
  }
}

function norm(values: number[]): number {
  return Math.sqrt(values.reduce((total, value) => total + value * value, 0));
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "unknown numerical error";
}
