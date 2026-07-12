import { datasetManifestSchema, datasetSchema } from "../validation/schemas";
import type { Dataset, DatasetManifest } from "./types";

export async function loadManifest(signal?: AbortSignal): Promise<DatasetManifest> {
  const response = await fetch("/datasets/manifest.json", { signal });
  if (!response.ok) throw new Error(`Dataset manifest request failed (${response.status}).`);
  return datasetManifestSchema.parse(await response.json());
}

export async function loadBundledDataset(path: string, signal?: AbortSignal): Promise<Dataset> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error(`Dataset request failed (${response.status}).`);
  return datasetSchema.parse(await response.json());
}

export function parseDatasetJson(text: string): Dataset {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
  return datasetSchema.parse(value);
}
