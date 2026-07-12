import { useMemo, useRef, useState } from "react";
import type { Dataset, DatasetManifest, DatasetManifestEntry } from "../../core/datasets/types";
import { csvToDataset, parseCsv, type CsvMetadata, type ParsedCsv } from "../../core/datasets/csv";
import { parseDatasetJson } from "../../core/datasets/loaders";
import {
  generateDataset,
  type Generator2DOptions,
  type Generator3DOptions,
} from "../../core/datasets/generator";
import { Modal } from "../../components/Modal";

interface Props {
  manifest: DatasetManifest;
  current: Dataset;
  savedDatasets: Dataset[];
  onLoadBundled(entry: DatasetManifestEntry): void;
  onLoadDataset(
    dataset: Dataset,
    source: "imported" | "generated" | "saved",
    filename?: string,
    expression?: string,
  ): void;
  onSaveCurrent(): void;
  onDeleteSaved(id: string): void;
  onExportDataset(dataset: Dataset): void;
  notify(message: string, kind?: "status" | "error"): void;
}

const defaultCsvMetadata: CsvMetadata = {
  id: "imported-dataset",
  title: "Imported dataset",
  description: "Dataset imported locally from CSV.",
  category: "custom",
  xLabel: "x",
  xUnit: "",
  yLabel: "y",
  yUnit: "",
  zLabel: "z",
  zUnit: "",
};

export function DatasetPanel(props: Props) {
  const [search, setSearch] = useState("");
  const [dimension, setDimension] = useState<"all" | "2d" | "3d">("all");
  const [category, setCategory] = useState("all");
  const [csv, setCsv] = useState<{ parsed: ParsedCsv; filename: string } | null>(null);
  const [csvMetadata, setCsvMetadata] = useState(defaultCsvMetadata);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const jsonInput = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);

  const categories = useMemo(
    () => [...new Set(props.manifest.datasets.map((entry) => entry.category))].sort(),
    [props.manifest],
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return props.manifest.datasets.filter((entry) => {
      const matchesDimension = dimension === "all" || entry.dimension === dimension;
      const matchesCategory = category === "all" || entry.category === category;
      const haystack =
        `${entry.title} ${entry.shortDescription} ${entry.tags.join(" ")}`.toLowerCase();
      return matchesDimension && matchesCategory && (!term || haystack.includes(term));
    });
  }, [props.manifest, search, dimension, category]);

  async function readJson(file?: File) {
    if (!file) return;
    try {
      props.onLoadDataset(parseDatasetJson(await file.text()), "imported", file.name);
      props.notify(`Imported ${file.name}.`);
    } catch (error) {
      props.notify(messageOf(error), "error");
    } finally {
      if (jsonInput.current) jsonInput.current.value = "";
    }
  }

  async function readCsv(file?: File) {
    if (!file) return;
    try {
      const parsed = parseCsv(await file.text());
      setCsv({ parsed, filename: file.name });
      setCsvMetadata({
        ...defaultCsvMetadata,
        id: file.name.replace(/\.[^.]+$/, ""),
        title: file.name.replace(/\.[^.]+$/, ""),
      });
    } catch (error) {
      props.notify(messageOf(error), "error");
    } finally {
      if (csvInput.current) csvInput.current.value = "";
    }
  }

  return (
    <aside className="side-panel dataset-panel" aria-label="Dataset configuration">
      <section className="panel-section">
        <h2>Bundled datasets</h2>
        <label>
          Search
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="title, tag, or description"
          />
        </label>
        <div className="field-row">
          <label>
            Dimension
            <select
              value={dimension}
              onChange={(event) => setDimension(event.target.value as typeof dimension)}
            >
              <option value="all">All</option>
              <option value="2d">2D</option>
              <option value="3d">3D surfaces</option>
            </select>
          </label>
          <label>
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">All</option>
              {categories.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="dataset-list" aria-label={`${filtered.length} matching bundled datasets`}>
          {filtered.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`dataset-item ${props.current.id === entry.id ? "selected" : ""}`}
              onClick={() => props.onLoadBundled(entry)}
            >
              <span className="dataset-title">{entry.title}</span>
              <span>
                {entry.dimension.toUpperCase()} · {entry.pointCount} points · {entry.category}
              </span>
              <span>{entry.shortDescription}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <h2>My datasets</h2>
        {props.savedDatasets.length === 0 ? (
          <p className="empty-note">No datasets are saved in this browser.</p>
        ) : null}
        {props.savedDatasets.map((dataset) => (
          <div className="saved-row" key={dataset.id}>
            <button
              type="button"
              className="text-button"
              onClick={() => props.onLoadDataset(dataset, "saved")}
            >
              {dataset.title}
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => props.onExportDataset(dataset)}
              aria-label={`Export ${dataset.title}`}
            >
              ⇩
            </button>
            <button
              type="button"
              className="icon-button danger"
              onClick={() => props.onDeleteSaved(dataset.id)}
              aria-label={`Delete ${dataset.title}`}
            >
              ×
            </button>
          </div>
        ))}
      </section>

      <section className="panel-section">
        <h2>Import or generate</h2>
        <div className="button-grid">
          <button type="button" onClick={() => jsonInput.current?.click()}>
            Import JSON
          </button>
          <button type="button" onClick={() => csvInput.current?.click()}>
            Import CSV
          </button>
          <button type="button" onClick={() => setGeneratorOpen(true)}>
            Formula generator
          </button>
        </div>
        <input
          ref={jsonInput}
          type="file"
          hidden
          accept="application/json,.json"
          onChange={(event) => void readJson(event.target.files?.[0])}
        />
        <input
          ref={csvInput}
          type="file"
          hidden
          accept="text/csv,.csv"
          onChange={(event) => void readCsv(event.target.files?.[0])}
        />
      </section>

      <section className="panel-section current-dataset">
        <h2>Current dataset</h2>
        <strong>{props.current.title}</strong>
        <p>{props.current.description}</p>
        <dl className="compact-definition">
          <div>
            <dt>Dimension</dt>
            <dd>{props.current.dimension.toUpperCase()}</dd>
          </div>
          <div>
            <dt>Points</dt>
            <dd>{props.current.points.length}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{props.current.category}</dd>
          </div>
        </dl>
        <p className="synthetic-note">{props.current.sourceNote}</p>
        <div className="button-grid">
          <button type="button" onClick={props.onSaveCurrent}>
            Save to browser library
          </button>
          <button type="button" onClick={() => props.onExportDataset(props.current)}>
            Export dataset
          </button>
        </div>
      </section>

      <Modal
        title="CSV metadata"
        open={Boolean(csv)}
        onClose={() => setCsv(null)}
        footer={
          <>
            <button type="button" onClick={() => setCsv(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => {
                if (!csv) return;
                try {
                  props.onLoadDataset(
                    csvToDataset(csv.parsed, csvMetadata),
                    "imported",
                    csv.filename,
                  );
                  props.notify(`Imported ${csv.filename}.`);
                  setCsv(null);
                } catch (error) {
                  props.notify(messageOf(error), "error");
                }
              }}
            >
              Load dataset
            </button>
          </>
        }
      >
        <p>
          {csv?.parsed.points.length} points detected as {csv?.parsed.dimension.toUpperCase()}.
        </p>
        <MetadataFields
          value={csvMetadata}
          dimension={csv?.parsed.dimension ?? "2d"}
          onChange={setCsvMetadata}
        />
      </Modal>

      <GeneratorModal
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        onGenerate={(dataset, expression) => {
          props.onLoadDataset(dataset, "generated", undefined, expression);
          props.notify(`Generated ${dataset.title}.`);
          setGeneratorOpen(false);
        }}
        notify={props.notify}
      />
    </aside>
  );
}

function MetadataFields({
  value,
  dimension,
  onChange,
}: {
  value: CsvMetadata;
  dimension: "2d" | "3d";
  onChange(value: CsvMetadata): void;
}) {
  const field = (key: keyof CsvMetadata, label: string) => (
    <label>
      {label}
      <input
        value={value[key] ?? ""}
        onChange={(event) => onChange({ ...value, [key]: event.target.value })}
      />
    </label>
  );
  return (
    <div className="form-grid">
      {field("title", "Title")}
      {field("id", "ID")}
      {field("description", "Description")}
      {field("category", "Category")}
      {field("xLabel", "x label")}
      {field("xUnit", "x unit")}
      {field("yLabel", "y label")}
      {field("yUnit", "y unit")}
      {dimension === "3d" ? (
        <>
          {field("zLabel", "z label")}
          {field("zUnit", "z unit")}
        </>
      ) : null}
    </div>
  );
}

function GeneratorModal({
  open,
  onClose,
  onGenerate,
  notify,
}: {
  open: boolean;
  onClose(): void;
  onGenerate(dataset: Dataset, expression: string): void;
  notify(message: string, kind?: "status" | "error"): void;
}) {
  const [dimension, setDimension] = useState<"2d" | "3d">("2d");
  const [values, setValues] = useState<Record<string, string>>({
    title: "Generated linear example",
    expression: "2*x + 1",
    xMin: "0",
    xMax: "10",
    pointCount: "25",
    yMin: "-5",
    yMax: "5",
    xCount: "12",
    yCount: "12",
    noiseMagnitude: "0",
    seed: "42",
    xLabel: "x",
    xUnit: "",
    yLabel: "y",
    yUnit: "",
    zLabel: "z",
    zUnit: "",
    category: "generated",
  });
  const update = (key: string, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  function submit() {
    try {
      const common = {
        title: values.title!,
        expression: values.expression!,
        seed: Number(values.seed),
        noiseKind: Number(values.noiseMagnitude) > 0 ? ("gaussian" as const) : ("none" as const),
        noiseMagnitude: Number(values.noiseMagnitude),
        category: values.category!,
      };
      const options: Generator2DOptions | Generator3DOptions =
        dimension === "2d"
          ? {
              ...common,
              dimension,
              xMin: Number(values.xMin),
              xMax: Number(values.xMax),
              pointCount: Number(values.pointCount),
              xLabel: values.xLabel!,
              xUnit: values.xUnit!,
              yLabel: values.yLabel!,
              yUnit: values.yUnit!,
            }
          : {
              ...common,
              dimension,
              xMin: Number(values.xMin),
              xMax: Number(values.xMax),
              yMin: Number(values.yMin),
              yMax: Number(values.yMax),
              xCount: Number(values.xCount),
              yCount: Number(values.yCount),
              xLabel: values.xLabel!,
              xUnit: values.xUnit!,
              yLabel: values.yLabel!,
              yUnit: values.yUnit!,
              zLabel: values.zLabel!,
              zUnit: values.zUnit!,
            };
      onGenerate(generateDataset(options), values.expression!);
    } catch (error) {
      notify(messageOf(error), "error");
    }
  }
  return (
    <Modal
      title="Formula dataset generator"
      open={open}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={submit}>
            Generate and load
          </button>
        </>
      }
    >
      <div className="segmented" role="group" aria-label="Generated dataset dimension">
        <button
          type="button"
          className={dimension === "2d" ? "active" : ""}
          onClick={() => {
            setDimension("2d");
            update("expression", "2*x + 1");
          }}
        >
          2D
        </button>
        <button
          type="button"
          className={dimension === "3d" ? "active" : ""}
          onClick={() => {
            setDimension("3d");
            update("expression", "sin(x) * cos(y)");
          }}
        >
          3D surface
        </button>
      </div>
      <div className="form-grid">
        <label>
          Title
          <input value={values.title} onChange={(event) => update("title", event.target.value)} />
        </label>
        <label>
          Expression
          <input
            aria-label="Formula expression"
            value={values.expression}
            onChange={(event) => update("expression", event.target.value)}
          />
        </label>
        <label>
          x minimum
          <input
            type="number"
            value={values.xMin}
            onChange={(event) => update("xMin", event.target.value)}
          />
        </label>
        <label>
          x maximum
          <input
            type="number"
            value={values.xMax}
            onChange={(event) => update("xMax", event.target.value)}
          />
        </label>
        {dimension === "2d" ? (
          <label>
            Point count
            <input
              type="number"
              min="2"
              max="150"
              value={values.pointCount}
              onChange={(event) => update("pointCount", event.target.value)}
            />
          </label>
        ) : (
          <>
            <label>
              y minimum
              <input
                type="number"
                value={values.yMin}
                onChange={(event) => update("yMin", event.target.value)}
              />
            </label>
            <label>
              y maximum
              <input
                type="number"
                value={values.yMax}
                onChange={(event) => update("yMax", event.target.value)}
              />
            </label>
            <label>
              x samples
              <input
                type="number"
                min="2"
                max="35"
                value={values.xCount}
                onChange={(event) => update("xCount", event.target.value)}
              />
            </label>
            <label>
              y samples
              <input
                type="number"
                min="2"
                max="35"
                value={values.yCount}
                onChange={(event) => update("yCount", event.target.value)}
              />
            </label>
          </>
        )}
        <label>
          Noise magnitude
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.noiseMagnitude}
            onChange={(event) => update("noiseMagnitude", event.target.value)}
          />
        </label>
        <label>
          Seed
          <input
            type="number"
            value={values.seed}
            onChange={(event) => update("seed", event.target.value)}
          />
        </label>
        <label>
          x label
          <input value={values.xLabel} onChange={(event) => update("xLabel", event.target.value)} />
        </label>
        <label>
          x unit
          <input value={values.xUnit} onChange={(event) => update("xUnit", event.target.value)} />
        </label>
        <label>
          {dimension === "2d" ? "y label" : "y label"}
          <input value={values.yLabel} onChange={(event) => update("yLabel", event.target.value)} />
        </label>
        <label>
          y unit
          <input value={values.yUnit} onChange={(event) => update("yUnit", event.target.value)} />
        </label>
        {dimension === "3d" ? (
          <>
            <label>
              z label
              <input
                value={values.zLabel}
                onChange={(event) => update("zLabel", event.target.value)}
              />
            </label>
            <label>
              z unit
              <input
                value={values.zUnit}
                onChange={(event) => update("zUnit", event.target.value)}
              />
            </label>
          </>
        ) : null}
      </div>
      <p className="help-text">
        Allowed expressions include arithmetic, powers, trigonometric functions, exp, log, sqrt,
        abs, min, and max. JavaScript and assignments are rejected.
      </p>
    </Modal>
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Operation failed.";
}
