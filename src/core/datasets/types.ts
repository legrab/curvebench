export type DatasetDimension = "2d" | "3d";

export interface AxisDefinition {
  key: "x" | "y" | "z";
  label: string;
  unit: string;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface DatasetBase {
  schemaVersion: 1;
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  tags: string[];
  synthetic: boolean;
  sourceNote: string;
  recommendedModels: string[];
  generation?: {
    seed?: number;
    noiseDescription?: string;
    formulaNote?: string;
  };
}

export interface Dataset2D extends DatasetBase {
  dimension: "2d";
  axes: { x: AxisDefinition; y: AxisDefinition };
  points: Point2D[];
}

export interface Dataset3D extends DatasetBase {
  dimension: "3d";
  axes: { x: AxisDefinition; y: AxisDefinition; z: AxisDefinition };
  points: Point3D[];
}

export type Dataset = Dataset2D | Dataset3D;

export interface DatasetManifestEntry {
  id: string;
  title: string;
  shortDescription: string;
  dimension: DatasetDimension;
  category: string;
  tags: string[];
  pointCount: number;
  recommendedModels: string[];
  path: string;
}

export interface DatasetManifest {
  schemaVersion: 1;
  generatedAt: string;
  datasets: DatasetManifestEntry[];
}

export type DatasetSource =
  | { kind: "bundled"; id: string }
  | { kind: "imported"; filename?: string }
  | { kind: "generated"; expression: string }
  | { kind: "saved"; id: string };
