import { describe, expect, it } from "vitest";
import { createActiveModel, evaluateActiveModel } from "./helpers";
import { createCustomParameters, fitActiveModel, modelDefinitions } from "./registry";
import { make2D, make3D } from "../../test/fixtures";

describe("model registry", () => {
  it("contains unique strategy IDs", () => {
    expect(new Set(modelDefinitions.map((definition) => definition.id)).size).toBe(
      modelDefinitions.length,
    );
  });

  it.each(modelDefinitions.map((definition) => [definition.id, definition] as const))(
    "evaluates %s",
    (_id, definition) => {
      const dataset = definition.dimensions.includes("2d") ? make2D() : make3D();
      const expression =
        definition.id === "custom-2d"
          ? "a*x+c"
          : definition.id === "custom-3d"
            ? "a*x+b*y+c"
            : undefined;
      const active = createActiveModel(definition, dataset, expression);
      if (expression) {
        active.params = createCustomParameters(expression, dataset.dimension);
        active.bounds = Object.fromEntries(
          Object.keys(active.params).map((key) => [key, { min: -10, max: 10, step: 0.01 }]),
        );
      }
      if (definition.supportsAutomaticFit) {
        const result = fitActiveModel(definition, dataset, active.params, active.bounds);
        active.params = result.params;
        expect(result.params).toBeTruthy();
      }
      const evaluated = evaluateActiveModel(active, definition, dataset);
      expect(evaluated.error).toBeUndefined();
      expect(evaluated.traces.length).toBeGreaterThan(0);
    },
  );
});
