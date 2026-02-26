import { ToolPalette } from "../components/ToolPalette";
import { useAppActions, useAppSelector } from "../store";

export function ToolPaletteContainer() {
  const tool = useAppSelector((state) => state.ui.tool);
  const actions = useAppActions();

  return <ToolPalette tool={tool} onSetTool={actions.setTool} />;
}
