import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { modelRegistry } from "../models/registry";
import { datasetManifestSchema, datasetSchema, projectSchema } from "./schemas";

describe("bundled datasets", () => {
  const root = resolve(process.cwd(), "public/datasets");
  const manifest = datasetManifestSchema.parse(
    JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8")),
  );

  it("contains 34 2D and 9 3D entries", () => {
    expect(manifest.datasets.filter((entry) => entry.dimension === "2d")).toHaveLength(34);
    expect(manifest.datasets.filter((entry) => entry.dimension === "3d")).toHaveLength(9);
  });

  it("validates every committed dataset and matching point count", () => {
    for (const entry of manifest.datasets) {
      const dataset = datasetSchema.parse(
        JSON.parse(readFileSync(resolve(process.cwd(), `public${entry.path}`), "utf8")),
      );
      expect(dataset.id).toBe(entry.id);
      expect(dataset.points).toHaveLength(entry.pointCount);
      expect(dataset.synthetic).toBe(true);
    }
    expect(readdirSync(resolve(root, "2d")).filter((file) => file.endsWith(".json"))).toHaveLength(
      34,
    );
    expect(readdirSync(resolve(root, "3d")).filter((file) => file.endsWith(".json"))).toHaveLength(
      9,
    );
  });

  it("provides valid downloadable JSON import skeletons", () => {
    const templateRoot = resolve(process.cwd(), "public/templates");
    datasetSchema.parse(JSON.parse(readFileSync(resolve(templateRoot, "dataset-2d.json"), "utf8")));
    datasetSchema.parse(JSON.parse(readFileSync(resolve(templateRoot, "dataset-3d.json"), "utf8")));
    projectSchema.parse(
      JSON.parse(readFileSync(resolve(templateRoot, "curvebench-project.json"), "utf8")),
    );
  });

  it("recommends only registered models for the matching dimension", () => {
    for (const entry of manifest.datasets) {
      for (const modelId of entry.recommendedModels) {
        expect(modelRegistry.get(modelId)?.dimensions).toContain(entry.dimension);
      }
    }
  });
});
