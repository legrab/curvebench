import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { datasetManifestSchema, datasetSchema } from "./schemas";

describe("bundled datasets", () => {
  const root = resolve(process.cwd(), "public/datasets");
  const manifest = datasetManifestSchema.parse(
    JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8")),
  );

  it("contains 24 2D and 6 3D entries", () => {
    expect(manifest.datasets.filter((entry) => entry.dimension === "2d")).toHaveLength(24);
    expect(manifest.datasets.filter((entry) => entry.dimension === "3d")).toHaveLength(6);
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
      24,
    );
    expect(readdirSync(resolve(root, "3d")).filter((file) => file.endsWith(".json"))).toHaveLength(
      6,
    );
  });
});
