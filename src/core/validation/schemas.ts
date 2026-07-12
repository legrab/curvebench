import { z } from "zod";

const finiteNumber = z.number().refine(Number.isFinite, "Value must be finite.");
const axisKey = z.enum(["x", "y", "z"]);
const axisSchema = z.object({
  key: axisKey,
  label: z.string().trim().min(1).max(80),
  unit: z.string().trim().max(40),
});

const baseDataset = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().trim().min(1).max(120),
  shortDescription: z.string().trim().min(1).max(220),
  description: z.string().trim().min(1).max(1200),
  category: z.string().trim().min(1).max(60),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  synthetic: z.boolean(),
  sourceNote: z.string().trim().min(1).max(240),
  recommendedModels: z.array(z.string().trim().min(1)).max(10),
  generation: z
    .object({
      seed: z.number().int().optional(),
      noiseDescription: z.string().max(240).optional(),
      formulaNote: z.string().max(400).optional(),
    })
    .optional(),
});

export const dataset2DSchema = baseDataset.extend({
  dimension: z.literal("2d"),
  axes: z.object({
    x: axisSchema.refine((axis) => axis.key === "x", "x axis must use key x"),
    y: axisSchema.refine((axis) => axis.key === "y", "y axis must use key y"),
  }),
  points: z
    .array(z.object({ x: finiteNumber, y: finiteNumber }))
    .min(2)
    .max(2000),
});

export const dataset3DSchema = baseDataset.extend({
  dimension: z.literal("3d"),
  axes: z.object({
    x: axisSchema.refine((axis) => axis.key === "x", "x axis must use key x"),
    y: axisSchema.refine((axis) => axis.key === "y", "y axis must use key y"),
    z: axisSchema.refine((axis) => axis.key === "z", "z axis must use key z"),
  }),
  points: z
    .array(z.object({ x: finiteNumber, y: finiteNumber, z: finiteNumber }))
    .min(4)
    .max(2500),
});

export const datasetSchema = z.discriminatedUnion("dimension", [dataset2DSchema, dataset3DSchema]);

export const manifestEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  shortDescription: z.string().min(1),
  dimension: z.enum(["2d", "3d"]),
  category: z.string().min(1),
  tags: z.array(z.string()),
  pointCount: z.number().int().positive(),
  recommendedModels: z.array(z.string()),
  path: z.string().startsWith("/datasets/"),
});

export const datasetManifestSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string(),
  datasets: z.array(manifestEntrySchema).length(30),
});

export const activeModelSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1).max(100),
  visible: z.boolean(),
  params: z.record(z.string(), finiteNumber),
  bounds: z.record(
    z.string(),
    z.object({ min: finiteNumber, max: finiteNumber, step: finiteNumber.positive() }),
  ),
  fittedParams: z.record(z.string(), finiteNumber).optional(),
  fitStatus: z.enum(["idle", "fitted", "failed"]).default("idle"),
  fitMessage: z.string().optional(),
  expression: z.string().optional(),
});

export const workspaceSchema = z.object({
  schemaVersion: z.literal(1),
  dataset: datasetSchema,
  datasetSource: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("bundled"), id: z.string() }),
    z.object({ kind: z.literal("imported"), filename: z.string().optional() }),
    z.object({ kind: z.literal("generated"), expression: z.string() }),
    z.object({ kind: z.literal("saved"), id: z.string() }),
  ]),
  models: z.array(activeModelSchema).max(8),
  selectedModelId: z.string().nullable(),
  leftCollapsed: z.boolean(),
  rightCollapsed: z.boolean(),
  residualsOpen: z.boolean(),
  tableOpen: z.boolean(),
  tutorialOpen: z.boolean(),
  showSurface: z.boolean(),
});

export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  projectTitle: z.string().min(1).max(120),
  applicationVersion: z.string(),
  createdAt: z.string(),
  exportedAt: z.string(),
  workspace: workspaceSchema,
});
