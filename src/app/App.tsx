import { useEffect, useState } from "react";
import { AppHeaderContainer } from "./containers/AppHeaderContainer";
import { TabsBarContainer } from "./containers/TabsBarContainer";
import { ToolPaletteContainer } from "./containers/ToolPaletteContainer";
import { BoardContainer } from "../features/board/containers/BoardContainer";
import { InspectorContainer } from "../features/inspector/containers/InspectorContainer";
import { INSPECTOR_COLLAPSE_KEY, LEGACY_INSPECTOR_COLLAPSE_KEY } from "./appUtils";
import { useStorageGateway } from "./effects/storageGateway";
import * as styles from "./App.css";

export function App() {
  const storage = useStorageGateway();
  const [inspectorCollapsed, setInspectorCollapsed] = useState(() => {
    const current = storage.getItem(INSPECTOR_COLLAPSE_KEY);
    if (current !== null) return current === "1";
    return storage.getItem(LEGACY_INSPECTOR_COLLAPSE_KEY) === "1";
  });

  useEffect(() => {
    storage.setItem(INSPECTOR_COLLAPSE_KEY, inspectorCollapsed ? "1" : "0");
  }, [inspectorCollapsed, storage]);

  return (
    <div className={styles.app}>
      <AppHeaderContainer />

      <TabsBarContainer />

      <div
        className={styles.main}
        style={{ gridTemplateColumns: `max-content 1fr ${inspectorCollapsed ? "44px" : "300px"}` }}
      >
        <ToolPaletteContainer />

        <main className={styles.centerPane}>
          <BoardContainer />
        </main>

        <InspectorContainer
          collapsed={inspectorCollapsed}
          onToggleCollapsed={() => setInspectorCollapsed((prev) => !prev)}
        />
      </div>
    </div>
  );
}
