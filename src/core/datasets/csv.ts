import type { Dataset, Dataset2D, Dataset3D, Point2D, Point3D } from "./types";

export interface CsvMetadata {
  id: string;
  title: string;
  description: string;
  category: string;
  xLabel: string;
  xUnit: string;
  yLabel: string;
  yUnit: string;
  zLabel?: string;
  zUnit?: string;
}

export interface ParsedCsv {
  dimension: "2d" | "3d";
  points: Point2D[] | Point3D[];
}

export function parseCsv(text: string): ParsedCsv {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  if (rows.length < 3) throw new Error("CSV must contain headers and at least two data rows.");

  const headers = splitRow(rows[0]!).map((cell) => cell.toLowerCase());
  const xIndex = headers.indexOf("x");
  const yIndex = headers.indexOf("y");
  const zIndex = headers.indexOf("z");
  if (xIndex < 0 || yIndex < 0) throw new Error("CSV headers must include x and y.");
  const dimension = zIndex >= 0 ? "3d" : "2d";
  const maximum = dimension === "2d" ? 2000 : 2500;
  if (rows.length - 1 > maximum) throw new Error(`CSV exceeds the ${maximum}-point limit.`);

  const points = rows.slice(1).map((row, index) => {
    const cells = splitRow(row);
    const x = Number(cells[xIndex]);
    const y = Number(cells[yIndex]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`CSV row ${index + 2} contains an invalid x or y value.`);
    }
    if (dimension === "3d") {
      const z = Number(cells[zIndex]);
      if (!Number.isFinite(z)) throw new Error(`CSV row ${index + 2} contains an invalid z value.`);
      return { x, y, z };
    }
    return { x, y };
  });

  return { dimension, points: points as Point2D[] | Point3D[] };
}

function splitRow(row: string): string[] {
  return row.split(/[,;\t]/).map((cell) => cell.trim());
}

export function csvToDataset(parsed: ParsedCsv, metadata: CsvMetadata): Dataset {
  const base = {
    schemaVersion: 1 as const,
    id: sanitizeId(metadata.id || metadata.title),
    title: metadata.title,
    shortDescription: metadata.description.slice(0, 200),
    description: metadata.description,
    category: metadata.category || "custom",
    tags: ["imported", "csv"],
    synthetic: false,
    sourceNote: "Imported locally from CSV. Verify provenance before relying on the values.",
    recommendedModels: [],
  };
  if (parsed.dimension === "2d") {
    return {
      ...base,
      dimension: "2d",
      axes: {
        x: { key: "x", label: metadata.xLabel || "x", unit: metadata.xUnit },
        y: { key: "y", label: metadata.yLabel || "y", unit: metadata.yUnit },
      },
      points: parsed.points as Point2D[],
    } satisfies Dataset2D;
  }
  return {
    ...base,
    dimension: "3d",
    axes: {
      x: { key: "x", label: metadata.xLabel || "x", unit: metadata.xUnit },
      y: { key: "y", label: metadata.yLabel || "y", unit: metadata.yUnit },
      z: { key: "z", label: metadata.zLabel || "z", unit: metadata.zUnit ?? "" },
    },
    points: parsed.points as Point3D[],
  } satisfies Dataset3D;
}

export function datasetToCsv(dataset: Dataset): string {
  if (dataset.dimension === "2d") {
    return ["x,y", ...dataset.points.map((point) => `${point.x},${point.y}`)].join("\n");
  }
  return ["x,y,z", ...dataset.points.map((point) => `${point.x},${point.y},${point.z}`)].join("\n");
}

export function sanitizeId(value: string): string {
  const id = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return id || `custom-${Date.now()}`;
}
