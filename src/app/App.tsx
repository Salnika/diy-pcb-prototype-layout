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
  const [toolsDrawerOpen, setToolsDrawerOpen] = useState(false);
  const [inspectorDrawerOpen, setInspectorDrawerOpen] = useState(false);

  useEffect(() => {
    storage.setItem(INSPECTOR_COLLAPSE_KEY, inspectorCollapsed ? "1" : "0");
  }, [inspectorCollapsed, storage]);

  function closeMobileDrawers() {
    setToolsDrawerOpen(false);
    setInspectorDrawerOpen(false);
  }

  function toggleToolsDrawer() {
    setToolsDrawerOpen((prev) => {
      const next = !prev;
      if (next) setInspectorDrawerOpen(false);
      return next;
    });
  }

  function toggleInspectorDrawer() {
    setInspectorDrawerOpen((prev) => {
      const next = !prev;
      if (next) setToolsDrawerOpen(false);
      return next;
    });
  }

  const hasMobileDrawerOpen = toolsDrawerOpen || inspectorDrawerOpen;

  return (
    <div className={styles.app}>
      <AppHeaderContainer
        toolsDrawerOpen={toolsDrawerOpen}
        inspectorDrawerOpen={inspectorDrawerOpen}
        onToggleToolsDrawer={toggleToolsDrawer}
        onToggleInspectorDrawer={toggleInspectorDrawer}
      />

      <TabsBarContainer />

      <div
        className={styles.main}
        style={{
          gridTemplateColumns: `220px minmax(0, 1fr) ${inspectorCollapsed ? "56px" : "340px"}`,
        }}
      >
        <button
          type="button"
          className={`${styles.mobileBackdrop} ${hasMobileDrawerOpen ? styles.mobileBackdropVisible : ""}`}
          aria-label="Close panels"
          onClick={closeMobileDrawers}
        />

        <ToolPaletteContainer
          mobileOpen={toolsDrawerOpen}
          onRequestCloseMobile={() => setToolsDrawerOpen(false)}
        />

        <main
          className={styles.centerPane}
          onPointerDown={() => {
            if (hasMobileDrawerOpen) closeMobileDrawers();
          }}
        >
          <BoardContainer />
        </main>

        <InspectorContainer
          collapsed={inspectorCollapsed}
          mobileOpen={inspectorDrawerOpen}
          onRequestCloseMobile={() => setInspectorDrawerOpen(false)}
          onToggleCollapsed={() => setInspectorCollapsed((prev) => !prev)}
        />
      </div>
    </div>
  );
}
