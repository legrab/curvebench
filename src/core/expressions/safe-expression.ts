import { create, all, type MathNode } from "mathjs";

const math = create(all!, {});
const allowedFunctions = new Set([
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "sinh",
  "cosh",
  "tanh",
  "exp",
  "log",
  "log10",
  "sqrt",
  "abs",
  "floor",
  "ceil",
  "round",
  "min",
  "max",
  "pow",
]);
const constants = new Set(["pi", "e"]);
const forbiddenNodeTypes = new Set([
  "AssignmentNode",
  "FunctionAssignmentNode",
  "BlockNode",
  "ArrayNode",
  "ObjectNode",
  "AccessorNode",
  "IndexNode",
  "RangeNode",
  "ConditionalNode",
]);

export interface CompiledSafeExpression {
  expression: string;
  parameters: string[];
  evaluate(scope: Record<string, number>): number;
}

export function compileSafeExpression(
  expression: string,
  coordinates: readonly ("x" | "y")[],
  allowParameters = false,
): CompiledSafeExpression {
  if (!expression.trim()) throw new Error("Expression is required.");
  if (expression.length > 300) throw new Error("Expression exceeds the 300-character limit.");
  let node: MathNode;
  try {
    node = math.parse(expression);
  } catch (error) {
    throw new Error(`Formula syntax error: ${messageOf(error)}`, { cause: error });
  }

  const parameters = new Set<string>();
  node.traverse((child) => {
    if (forbiddenNodeTypes.has(child.type)) {
      throw new Error(`${child.type.replace("Node", "")} expressions are not allowed.`);
    }
    if (child.type === "FunctionNode") {
      const name = (child as unknown as { fn: { name?: string } }).fn.name;
      if (!name || !allowedFunctions.has(name))
        throw new Error(`Function '${name ?? "unknown"}' is not allowed.`);
    }
    if (child.type === "SymbolNode") {
      const name = (child as unknown as { name: string }).name;
      if (
        coordinates.includes(name as "x" | "y") ||
        constants.has(name) ||
        allowedFunctions.has(name)
      )
        return;
      if (!allowParameters) throw new Error(`Unknown symbol '${name}'.`);
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,19}$/.test(name))
        throw new Error(`Invalid parameter name '${name}'.`);
      parameters.add(name);
    }
    if (child.type === "ConstantNode") {
      const value = Number((child as unknown as { value: unknown }).value);
      if (!Number.isFinite(value)) throw new Error("Only finite numeric constants are allowed.");
    }
  });
  if (parameters.size > 8) throw new Error("Custom models support at most eight named parameters.");

  const compiled = node.compile();
  return {
    expression,
    parameters: [...parameters].sort(),
    evaluate(scope) {
      let value: unknown;
      try {
        value = compiled.evaluate(scope);
      } catch (error) {
        throw new Error(`Formula evaluation failed: ${messageOf(error)}`, { cause: error });
      }
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error("Formula produced a non-finite or non-real value.");
      }
      return value;
    },
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "unknown formula error";
}
