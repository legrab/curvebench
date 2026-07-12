import { describe, expect, it } from "vitest";
import { createDefaultWorkspace } from "../../features/workspace/default-workspace";
import { make2D } from "../../test/fixtures";
import { createProject, parseProject } from "./project";

describe("project import/export", () => {
  it("round-trips a workspace", () => {
    const workspace = createDefaultWorkspace(make2D());
    const project = createProject(workspace);
    expect(parseProject(JSON.stringify(project)).workspace.dataset.id).toBe(workspace.dataset.id);
  });
});
