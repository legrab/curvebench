import { expect, test, type Page } from "@playwright/test";

function capturePageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  return errors;
}

test("loads datasets, adds a model, generates data, exports, and resets", async ({ page }) => {
  const pageErrors = capturePageErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Curvebench", level: 1 })).toBeVisible();
  await expect(
    page.getByText("Normalized radioactive decay", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByTestId("main-plot")).toBeVisible();

  await page.getByRole("button", { name: /Runner speed during a 100 m race/ }).click();
  await expect(
    page.getByText("Runner speed during a 100 m race", { exact: true }).first(),
  ).toBeVisible();

  await page.getByLabel("Method").selectOption("polynomial");
  await page.getByRole("button", { name: "Add model" }).click();
  await expect(page.getByText("Polynomial regression", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Degree").last().fill("4");

  await page.getByRole("button", { name: "Formula generator" }).click();
  await expect(page.getByRole("dialog", { name: "Formula dataset generator" })).toBeVisible();
  await page.getByLabel("Title").last().fill("Generated smoke line");
  await page.getByLabel("Formula expression").fill("2*x + 1");
  await page.getByRole("button", { name: "Generate and load" }).click();
  await expect(page.getByText("Generated smoke line", { exact: true }).first()).toBeVisible();

  await page.getByText("Export", { exact: true }).click();
  const projectDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project as JSON" }).click();
  await expect((await projectDownload).suggestedFilename()).toContain("project.json");

  const svgDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Chart as SVG" }).click();
  await expect((await svgDownload).suggestedFilename()).toContain(".svg");

  await page.getByText("Reset", { exact: true }).click();
  await page.getByRole("button", { name: "Reset workspace to default" }).click();
  await expect(
    page.getByText("Normalized radioactive decay", { exact: true }).first(),
  ).toBeVisible();
  await expect.poll(() => pageErrors.map((error) => error.message)).toEqual([]);
});

test("renders a 3D surface and adds an automatic plane fit", async ({ page }) => {
  const pageErrors = capturePageErrors(page);
  await page.goto("/");
  await page.getByRole("combobox", { name: "Dimension" }).selectOption("3d");
  await page.getByRole("button", { name: /Simple tilted tabletop/ }).click();
  await expect(page.getByText("Simple tilted tabletop", { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId("main-plot")).toBeVisible();

  await page.getByLabel("Connect regular-grid measurements").check();
  await page.getByLabel("Method").selectOption("plane-3d");
  await page.getByRole("button", { name: "Add model" }).click();
  await expect(page.getByText("Plane", { exact: true }).first()).toBeVisible();
  await expect.poll(() => pageErrors.map((error) => error.message)).toEqual([]);
});

test("imports canonical JSON and CSV examples through the interface", async ({ page }) => {
  const pageErrors = capturePageErrors(page);
  await page.goto("/");

  await page
    .locator('.dataset-panel input[type="file"][accept*="application/json"]')
    .setInputFiles("examples/imports/runner-speed.json");
  await expect(
    page.getByText("Runner speed during a 100 m race", { exact: true }).first(),
  ).toBeVisible();

  await page
    .locator('.dataset-panel input[type="file"][accept*="text/csv"]')
    .setInputFiles("examples/imports/surface-example.csv");
  await expect(page.getByRole("dialog", { name: "CSV metadata" })).toBeVisible();
  await expect(page.getByText("81 points detected as 3D.")).toBeVisible();
  await page.getByRole("button", { name: "Load dataset" }).click();
  await expect(page.getByText("surface-example", { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId("main-plot")).toBeVisible();
  await expect.poll(() => pageErrors.map((error) => error.message)).toEqual([]);
});

test("opens the manual, downloads a template, and exposes the repository", async ({ page }) => {
  const pageErrors = capturePageErrors(page);
  await page.goto("/");

  await page.getByText("Help", { exact: true }).click();
  await page.getByRole("button", { name: "User manual & import formats" }).click();
  await expect(page).toHaveURL(/#manual$/);
  await expect(page.getByRole("heading", { name: /From source data/ })).toBeVisible();

  const templateDownload = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download 2-D JSON" }).click();
  await expect((await templateDownload).suggestedFilename()).toBe("dataset-2d.json");

  await page.getByRole("button", { name: "Back to workspace" }).click();
  const repository = page.getByRole("link", { name: "legrab/curvebench" });
  await expect(repository).toHaveAttribute("href", "https://github.com/legrab/curvebench");
  await expect.poll(() => pageErrors.map((error) => error.message)).toEqual([]);
});
