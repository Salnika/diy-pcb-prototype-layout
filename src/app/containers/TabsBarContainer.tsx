import { TabsBar } from "../components/TabsBar";
import { useAppActions, useAppSelector } from "../store";

export function TabsBarContainer() {
  const tabs = useAppSelector((state) => state.tabs);
  const activeTabId = useAppSelector((state) => state.activeTabId);
  const actions = useAppActions();

  return (
    <TabsBar
      tabs={tabs}
      activeTabId={activeTabId}
      onSelectTab={actions.setActiveTab}
      onAddTab={actions.addTab}
    />
  );
}
