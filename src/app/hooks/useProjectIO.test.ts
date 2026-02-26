import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNewProject, serializeProject } from "../../model";

const { downloadText, downloadPng, renderProjectSvg } = vi.hoisted(() => ({
  downloadText: vi.fn(),
  downloadPng: vi.fn(),
  renderProjectSvg: vi.fn(() => ({ svg: "<svg/>", width: 123, height: 45 })),
}));

vi.mock("../../features/export/download", () => ({ downloadText }));
vi.mock("../../features/export/exportPng", () => ({ downloadPng }));
vi.mock("../../features/export/renderProjectSvg", () => ({ renderProjectSvg }));

import { useProjectIO } from "./useProjectIO";

describe("useProjectIO", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("imports project JSON", async () => {
    const dispatch = vi.fn();
    const project = createNewProject("Import");
    const json = serializeProject(project);
    const file = new File([json], "project.json", { type: "application/json" });
    const { result } = renderHook(() => useProjectIO({ project, dispatch }));

    await result.current.importJsonFile(file);
    expect(dispatch).toHaveBeenCalledWith({ type: "IMPORT_PROJECT", project });
  });

  it("dispatches import error on invalid JSON", async () => {
    const dispatch = vi.fn();
    const project = createNewProject("Import");
    const file = new File(["not-json"], "project.json", { type: "application/json" });
    const { result } = renderHook(() => useProjectIO({ project, dispatch }));

    await result.current.importJsonFile(file);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SET_ERROR",
      }),
    );
  });

  it("handles non-Error import exceptions", async () => {
    const dispatch = vi.fn();
    const project = createNewProject("Import");
    const { result } = renderHook(() => useProjectIO({ project, dispatch }));

    await result.current.importJsonFile({
      text: async () => {
        throw "raw-error";
      },
    } as unknown as File);

    expect(dispatch).toHaveBeenCalledWith({
      type: "SET_ERROR",
      message: "Import failed: raw-error",
    });
  });

  it("exports json and svg using safe filenames", () => {
    const dispatch = vi.fn();
    const project = createNewProject("My Project");
    const { result } = renderHook(() => useProjectIO({ project, dispatch }));

    result.current.exportJson();
    expect(downloadText).toHaveBeenCalledWith(
      "My-Project.perfboard.json",
      expect.stringContaining('"schemaVersion"'),
      "application/json;charset=utf-8",
    );

    result.current.exportSvg();
    expect(renderProjectSvg).toHaveBeenCalledWith(project);
    expect(downloadText).toHaveBeenCalledWith("My-Project.svg", "<svg/>", "image/svg+xml;charset=utf-8");
  });

  it("uses project fallback filename when meta.name is absent", async () => {
    const dispatch = vi.fn();
    const unnamed = { ...createNewProject("X"), meta: {} };
    const { result } = renderHook(() => useProjectIO({ project: unnamed, dispatch }));

    result.current.exportJson();
    result.current.exportSvg();
    await result.current.exportPng();

    expect(downloadText).toHaveBeenCalledWith(
      "project.perfboard.json",
      expect.any(String),
      "application/json;charset=utf-8",
    );
    expect(downloadText).toHaveBeenCalledWith("project.svg", "<svg/>", "image/svg+xml;charset=utf-8");
    expect(downloadPng).toHaveBeenCalledWith("project.png", "<svg/>", 123, 45);
  });

  it("exports png and dispatches error when it fails", async () => {
    const dispatch = vi.fn();
    const project = createNewProject("PNG");
    const { result, rerender } = renderHook(
      (props: { project: ReturnType<typeof createNewProject> }) => useProjectIO({ project: props.project, dispatch }),
      { initialProps: { project } },
    );

    await result.current.exportPng();
    expect(downloadPng).toHaveBeenCalledWith("PNG.png", "<svg/>", 123, 45);

    downloadPng.mockRejectedValueOnce(new Error("boom"));
    rerender({ project });
    await result.current.exportPng();
    expect(dispatch).toHaveBeenCalledWith({
      type: "SET_ERROR",
      message: "PNG export failed: boom",
    });

    downloadPng.mockRejectedValueOnce("raw-fail");
    rerender({ project });
    await result.current.exportPng();
    expect(dispatch).toHaveBeenCalledWith({
      type: "SET_ERROR",
      message: "PNG export failed: raw-fail",
    });
  });
});
