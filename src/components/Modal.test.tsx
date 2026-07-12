import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("is labelled and closes with Escape", async () => {
    const close = vi.fn();
    render(
      <Modal title="Import data" open onClose={close}>
        Body
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Import data" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(close).toHaveBeenCalledOnce();
  });
});
