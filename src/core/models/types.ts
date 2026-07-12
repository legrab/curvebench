import type { Dataset, DatasetDimension } from "../datasets/types";
import type { ModelMetrics } from "../metrics/metrics";

export type ModelCategory = "interpolation" | "regression" | "manual";
export type ParameterValues = Record<string, number>;

export interface ParameterBound {
  min: number;
  max: number;
  step: number;
}

export interface ParameterSpec extends ParameterBound {
  key: string;
  label: string;
  integer?: boolean;
  hidden?: boolean;
}

export interface FitResult {
  params: ParameterValues;
  converged: boolean;
  message: string;
  iterations?: number;
  metrics?: ModelMetrics;
}

export interface TraceLike {
  type: string;
  mode?: string;
  name: string;
  x?: number[] | number[][];
  y?: number[] | number[][];
  z?: number[] | number[][];
  i?: number[];
  j?: number[];
  k?: number[];
  line?: Record<string, unknown>;
  marker?: Record<string, unknown>;
  opacity?: number;
  showscale?: boolean;
  hovertemplate?: string;
  connectgaps?: boolean;
}

export interface ModelDefinition {
  id: string;
  label: string;
  category: ModelCategory;
  dimensions: DatasetDimension[];
  description: string;
  limitation: string;
  supportsAutomaticFit: boolean;
  createInitialParams(dataset: Dataset): ParameterValues;
  getParameterSpecs(dataset: Dataset, params: ParameterValues): ParameterSpec[];
  fit?(
    dataset: Dataset,
    params: ParameterValues,
    bounds: Record<string, ParameterBound>,
  ): FitResult;
  predict2D?(x: number, params: ParameterValues, dataset: Dataset, expression?: string): number;
  predict3D?(
    x: number,
    y: number,
    params: ParameterValues,
    dataset: Dataset,
    expression?: string,
  ): number;
  createTrace?(
    dataset: Dataset,
    params: ParameterValues,
    name: string,
    expression?: string,
  ): TraceLike[];
  formula(params: ParameterValues, expression?: string): string;
  validate?(dataset: Dataset, params: ParameterValues): string | null;
}

export interface ActiveModel {
  id: string;
  type: string;
  name: string;
  visible: boolean;
  params: ParameterValues;
  bounds: Record<string, ParameterBound>;
  fittedParams?: ParameterValues;
  fitStatus: "idle" | "fitted" | "failed";
  fitMessage?: string;
  expression?: string;
}

export interface EvaluatedModel {
  active: ActiveModel;
  definition: ModelDefinition;
  traces: TraceLike[];
  metrics?: ModelMetrics;
  error?: string;
}
