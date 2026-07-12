import type { Dataset2D, Dataset3D } from "../core/datasets/types";

export function make2D(): Dataset2D {
  return {
    schemaVersion: 1,
    id: "test-positive-data",
    title: "Positive test data",
    shortDescription: "Synthetic test data.",
    description: "Synthetic positive test data for numerical verification.",
    dimension: "2d",
    category: "test",
    tags: ["test"],
    synthetic: true,
    sourceNote: "Test data.",
    axes: {
      x: { key: "x", label: "x", unit: "" },
      y: { key: "y", label: "y", unit: "" },
    },
    points: Array.from({ length: 12 }, (_, index) => {
      const x = index + 1;
      return { x, y: 2.5 + 4.2 * Math.exp(-0.18 * x) };
    }),
    recommendedModels: ["exponential"],
  };
}

export function make3D(): Dataset3D {
  return {
    schemaVersion: 1,
    id: "test-surface",
    title: "Test surface",
    shortDescription: "Synthetic test surface.",
    description: "Synthetic quadratic test surface.",
    dimension: "3d",
    category: "test",
    tags: ["test"],
    synthetic: true,
    sourceNote: "Test data.",
    axes: {
      x: { key: "x", label: "x", unit: "" },
      y: { key: "y", label: "y", unit: "" },
      z: { key: "z", label: "z", unit: "" },
    },
    points: [-2, -1, 0, 1, 2].flatMap((x) =>
      [-2, -1, 0, 1, 2].map((y) => ({
        x,
        y,
        z: 2 * x * x - y * y + 0.5 * x * y + 3 * x - 2 * y + 7,
      })),
    ),
    recommendedModels: ["quadratic-surface"],
  };
}
