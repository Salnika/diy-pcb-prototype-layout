import { useCallback, type Dispatch } from "react";
import { parseProject, serializeProject, type Project } from "../../model";
import { downloadText } from "../../features/export/download";
import { projectPartsToBomCsv } from "../../features/export/bom";
import { downloadPng } from "../../features/export/exportPng";
import { renderProjectSvg } from "../../features/export/renderProjectSvg";
import { safeFilename } from "../appUtils";
import type { Action } from "../store";

type UseProjectIOParams = Readonly<{
  project: Project;
  dispatch: Dispatch<Action>;
}>;

export function useProjectIO({ project, dispatch }: UseProjectIOParams) {
  const importJsonFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const importedProject = parseProject(text);
        dispatch({ type: "IMPORT_PROJECT", project: importedProject });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        dispatch({ type: "SET_ERROR", message: `Import failed: ${message}` });
      }
    },
    [dispatch],
  );

  const exportJson = useCallback(() => {
    const name = safeFilename(project.meta.name ?? "project");
    const json = serializeProject(project);
    downloadText(`${name}.perfboard.json`, json, "application/json;charset=utf-8");
  }, [project]);

  const exportSvg = useCallback(() => {
    const name = safeFilename(project.meta.name ?? "project");
    const { svg } = renderProjectSvg(project);
    downloadText(`${name}.svg`, svg, "image/svg+xml;charset=utf-8");
  }, [project]);

  const exportPng = useCallback(async () => {
    try {
      const name = safeFilename(project.meta.name ?? "project");
      const { svg, width, height } = renderProjectSvg(project);
      await downloadPng(`${name}.png`, svg, width, height);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dispatch({ type: "SET_ERROR", message: `PNG export failed: ${message}` });
    }
  }, [dispatch, project]);

  const exportBomCsv = useCallback(() => {
    const name = safeFilename(project.meta.name ?? "project");
    const csv = projectPartsToBomCsv(project.parts);
    downloadText(`${name}.bom.csv`, csv, "text/csv;charset=utf-8");
  }, [project]);

  return {
    importJsonFile,
    exportJson,
    exportSvg,
    exportPng,
    exportBomCsv,
  };
}
