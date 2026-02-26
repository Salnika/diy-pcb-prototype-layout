import { AppHeader } from "../components/AppHeader";
import { featureFlags } from "../featureFlags";
import { useProjectIO } from "../hooks/useProjectIO";
import { useAppDispatch, useAppSelector } from "../store";
import { selectCanRedo, selectCanUndo } from "../state/selectors";
import { useDialogGateway } from "../effects/dialogGateway";

export function AppHeaderContainer() {
  const state = useAppSelector((s) => s);
  const dispatch = useAppDispatch();
  const dialogs = useDialogGateway();

  const canUndo = selectCanUndo(state);
  const canRedo = selectCanRedo(state);

  const { importJsonFile, exportJson, exportSvg, exportPng } = useProjectIO({
    project: state.project,
    dispatch,
  });

  return (
    <AppHeader
      canUndo={canUndo}
      canRedo={canRedo}
      showAutoLayout={featureFlags.autoLayout}
      lastError={state.ui.lastError}
      onUndo={() => dispatch({ type: "UNDO" })}
      onRedo={() => dispatch({ type: "REDO" })}
      onRunAutoLayout={() => {
        if (!dialogs.confirmAutoLayout()) return;
        dispatch({ type: "RUN_AUTO_LAYOUT" });
      }}
      onExportJson={exportJson}
      onImportJsonFile={importJsonFile}
      onExportSvg={exportSvg}
      onExportPng={exportPng}
    />
  );
}
