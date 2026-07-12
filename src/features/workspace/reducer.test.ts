import { describe, expect, it } from "vitest";
import { workspaceReducer } from "./reducer";
import { createDefaultWorkspace } from "./default-workspace";
import { make2D } from "../../test/fixtures";

describe("workspace reducer", () => {
  it("adds, updates, and removes models", () => {
    const initial = createDefaultWorkspace(make2D());
    const model = { ...initial.models[0]!, id: "second" };
    const added = workspaceReducer(initial, { type: "add-model", model });
    expect(added.models).toHaveLength(2);
    const updated = workspaceReducer(added, {
      type: "update-model",
      id: "second",
      update: { name: "Changed" },
    });
    expect(updated.models[1]!.name).toBe("Changed");
    expect(workspaceReducer(updated, { type: "remove-model", id: "second" }).models).toHaveLength(
      1,
    );
  });
});
