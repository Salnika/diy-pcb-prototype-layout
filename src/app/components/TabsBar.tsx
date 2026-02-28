import type { TabState } from "../store";
import * as styles from "../App.css";

type TabsBarProps = Readonly<{
  tabs: readonly TabState[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onAddTab: () => void;
}>;

export function TabsBar({ tabs, activeTabId, onSelectTab, onAddTab }: TabsBarProps) {
  return (
    <div className={styles.tabBar}>
      <div className={styles.tabList}>
        {tabs.map((tab, index) => {
          const name = tab.project.meta.name?.trim() || `Project ${index + 1}`;
          const active = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              className={active ? styles.tabButtonActive : styles.tabButton}
              onClick={() => onSelectTab(tab.id)}
              aria-current={active ? "page" : undefined}
            >
              <span className={styles.tabButtonText}>{name}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={styles.tabAdd}
        onClick={onAddTab}
        aria-label="Add project tab"
      >
        +
      </button>
    </div>
  );
}
