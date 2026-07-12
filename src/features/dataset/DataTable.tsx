import { useState } from "react";
import type { Dataset, Point2D, Point3D } from "../../core/datasets/types";

export function DataTable({
  dataset,
  onApply,
}: {
  dataset: Dataset;
  onApply(dataset: Dataset): void;
}) {
  const [rows, setRows] = useState<Array<Point2D | Point3D>>([...dataset.points]);

  function update(index: number, key: "x" | "y" | "z", value: number) {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    );
  }
  function apply() {
    if (rows.some((row) => Object.values(row).some((value) => !Number.isFinite(value)))) return;
    const sorted = [...rows].sort(
      (left, right) => left.x - right.x || ("z" in left && "z" in right ? left.y - right.y : 0),
    );
    onApply({ ...dataset, points: sorted as never });
  }
  return (
    <div className="data-table-wrap">
      <div className="table-actions">
        <button type="button" onClick={() => setRows([...dataset.points])}>
          Discard edits
        </button>
        <button
          type="button"
          onClick={() =>
            setRows((current) => [
              ...current,
              dataset.dimension === "2d" ? { x: 0, y: 0 } : { x: 0, y: 0, z: 0 },
            ])
          }
        >
          Add point
        </button>
        <button type="button" className="primary" onClick={apply}>
          Apply edits
        </button>
      </div>
      <table>
        <caption>
          {dataset.points.length} measured points. Editing the table invalidates previous fit
          results.
        </caption>
        <thead>
          <tr>
            <th>#</th>
            <th>x</th>
            <th>y</th>
            {dataset.dimension === "3d" ? <th>z</th> : null}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <th scope="row">{index + 1}</th>
              <td>
                <input
                  aria-label={`Point ${index + 1} x`}
                  type="number"
                  value={row.x}
                  onChange={(event) => update(index, "x", Number(event.target.value))}
                />
              </td>
              <td>
                <input
                  aria-label={`Point ${index + 1} y`}
                  type="number"
                  value={row.y}
                  onChange={(event) => update(index, "y", Number(event.target.value))}
                />
              </td>
              {dataset.dimension === "3d" ? (
                <td>
                  <input
                    aria-label={`Point ${index + 1} z`}
                    type="number"
                    value={(row as Point3D).z}
                    onChange={(event) => update(index, "z", Number(event.target.value))}
                  />
                </td>
              ) : null}
              <td>
                <button
                  type="button"
                  className="icon-button danger"
                  onClick={() =>
                    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))
                  }
                  aria-label={`Remove point ${index + 1}`}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
