import * as styles from "../App.css";

export type IconName =
  | "select"
  | "connect"
  | "fixedPoint"
  | "wire"
  | "jumper"
  | "label"
  | "erase"
  | "resistor"
  | "switch"
  | "diode"
  | "capacitor"
  | "capacitor_ceramic"
  | "capacitor_electrolytic"
  | "capacitor_film"
  | "transistor"
  | "potentiometer"
  | "jack"
  | "power_pos"
  | "power_neg"
  | "power_gnd"
  | "dip";

export function ToolIcon({ name }: Readonly<{ name: IconName }>) {
  switch (name) {
    case "select":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <polyline points="5,4 5,20 9,16 13,22 16,20 12,14 18,14 5,4" />
        </svg>
      );
    case "connect":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <circle cx="7" cy="12" r="3" />
          <circle cx="17" cy="12" r="3" />
          <line x1="10" y1="12" x2="14" y2="12" />
        </svg>
      );
    case "fixedPoint":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="3" x2="12" y2="8" />
          <line x1="12" y1="16" x2="12" y2="21" />
          <line x1="3" y1="12" x2="8" y2="12" />
          <line x1="16" y1="12" x2="21" y2="12" />
        </svg>
      );
    case "wire":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <polyline points="4,18 9,13 13,15 20,8" />
          <circle cx="4" cy="18" r="1.8" />
          <circle cx="20" cy="8" r="1.8" />
        </svg>
      );
    case "jumper":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <path d="M4 16c3-6 13-6 16 0" />
          <circle cx="4" cy="16" r="1.8" />
          <circle cx="20" cy="16" r="1.8" />
        </svg>
      );
    case "label":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <path d="M4 9h9l5 5-8 8-6-6z" />
          <circle cx="9" cy="9" r="1.5" />
        </svg>
      );
    case "erase":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <path d="M4 16l7-7 7 7-4 4H7z" />
          <line x1="12" y1="20" x2="20" y2="20" />
        </svg>
      );
    case "resistor":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <polyline points="2,12 5,12 7,9 10,15 13,9 16,15 18,12 22,12" />
        </svg>
      );
    case "switch":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <line x1="5" y1="7" x2="10" y2="7" />
          <line x1="5" y1="17" x2="10" y2="17" />
          <line x1="18" y1="12" x2="10" y2="8" />
          <line x1="10" y1="5" x2="10" y2="9" />
          <circle cx="5" cy="7" r="1.3" />
          <circle cx="5" cy="17" r="1.3" />
          <circle cx="18" cy="12" r="1.3" />
        </svg>
      );
    case "diode":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <line x1="3" y1="12" x2="8" y2="12" />
          <polygon points="8,7 15,12 8,17" />
          <line x1="15" y1="7" x2="15" y2="17" />
          <line x1="15" y1="12" x2="21" y2="12" />
        </svg>
      );
    case "capacitor":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <line x1="3" y1="12" x2="9" y2="12" />
          <line x1="9" y1="6" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="18" />
          <line x1="15" y1="12" x2="21" y2="12" />
        </svg>
      );
    case "capacitor_ceramic":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <line x1="3" y1="12" x2="9" y2="12" />
          <line x1="9" y1="6" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="18" />
          <line x1="15" y1="12" x2="21" y2="12" />
          <rect x="10.5" y="8" width="3" height="8" />
        </svg>
      );
    case "capacitor_electrolytic":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <line x1="3" y1="12" x2="9" y2="12" />
          <line x1="9" y1="6" x2="9" y2="18" />
          <path d="M15 6c2 2 2 10 0 12" />
          <line x1="15" y1="12" x2="21" y2="12" />
          <line x1="6" y1="6" x2="6" y2="9" />
          <line x1="4.5" y1="7.5" x2="7.5" y2="7.5" />
        </svg>
      );
    case "capacitor_film":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <line x1="3" y1="12" x2="8" y2="12" />
          <rect x="8" y="7" width="8" height="10" rx="1.5" />
          <line x1="16" y1="12" x2="21" y2="12" />
        </svg>
      );
    case "transistor":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
          <line x1="6" y1="12" x2="2" y2="12" />
          <line x1="12" y1="6" x2="12" y2="2" />
          <line x1="12" y1="18" x2="18" y2="22" />
          <polyline points="12,18 13.5,18.5 12.5,17" />
        </svg>
      );
    case "potentiometer":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <polyline points="2,12 6,12 8,9 10,15 12,9 14,15 16,12 22,12" />
          <line x1="12" y1="5" x2="12" y2="10" />
          <polyline points="10,7 12,5 14,7" />
        </svg>
      );
    case "jack":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <circle cx="8" cy="12" r="4" />
          <line x1="12" y1="12" x2="21" y2="12" />
          <line x1="15" y1="8" x2="15" y2="16" />
          <line x1="18" y1="9" x2="18" y2="15" />
        </svg>
      );
    case "power_pos":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
    case "power_neg":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
    case "power_gnd":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <line x1="12" y1="4" x2="12" y2="10" />
          <line x1="7" y1="10" x2="17" y2="10" />
          <line x1="8.5" y1="13" x2="15.5" y2="13" />
          <line x1="10" y1="16" x2="14" y2="16" />
        </svg>
      );
    case "dip":
      return (
        <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
          <rect x="7" y="5" width="10" height="14" rx="2" />
          <line x1="7" y1="7" x2="4" y2="7" />
          <line x1="7" y1="10" x2="4" y2="10" />
          <line x1="7" y1="13" x2="4" y2="13" />
          <line x1="7" y1="16" x2="4" y2="16" />
          <line x1="17" y1="7" x2="20" y2="7" />
          <line x1="17" y1="10" x2="20" y2="10" />
          <line x1="17" y1="13" x2="20" y2="13" />
          <line x1="17" y1="16" x2="20" y2="16" />
        </svg>
      );
  }
}
