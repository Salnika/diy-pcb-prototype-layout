import { ToolPalette } from "../components/ToolPalette";
import { useAppActions, useAppSelector } from "../store";

type ToolPaletteContainerProps = Readonly<{
  mobileOpen: boolean;
  onRequestCloseMobile: () => void;
}>;

export function ToolPaletteContainer({
  mobileOpen,
  onRequestCloseMobile,
}: ToolPaletteContainerProps) {
  const tool = useAppSelector((state) => state.ui.tool);
  const actions = useAppActions();

  return (
    <ToolPalette
      tool={tool}
      onSetTool={actions.setTool}
      mobileOpen={mobileOpen}
      onRequestCloseMobile={onRequestCloseMobile}
    />
  );
}
