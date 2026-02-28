import type { ReactNode } from "react";
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

function icon(children: ReactNode) {
  return (
    <svg viewBox="0 0 24 24" className={styles.toolIcon} aria-hidden="true">
      {children}
    </svg>
  );
}

export function ToolIcon({ name }: Readonly<{ name: IconName }>) {
  switch (name) {
    case "select":
      return icon(<path d="M5 4v16l4-4 3.4 5 2.5-1.6-3.4-5H18L5 4z" />);

    case "connect":
      return icon(
        <>
          <circle cx="7" cy="12" r="3" />
          <circle cx="17" cy="12" r="3" />
          <path d="M10 12h4" />
        </>,
      );

    case "fixedPoint":
      return icon(
        <>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
        </>,
      );

    case "wire":
      return icon(
        <>
          <polyline points="4,17 9,12 13,14 20,7" />
          <circle cx="4" cy="17" r="1.6" />
          <circle cx="20" cy="7" r="1.6" />
        </>,
      );

    case "jumper":
      return icon(
        <>
          <path d="M4 16c2.5-6 13.5-6 16 0" />
          <circle cx="4" cy="16" r="1.6" />
          <circle cx="20" cy="16" r="1.6" />
        </>,
      );

    case "label":
      return icon(
        <>
          <path d="M4.5 9h8.5l6 6-8 8-6.5-6.5z" />
          <circle cx="9" cy="9" r="1.3" />
        </>,
      );

    case "erase":
      return icon(
        <>
          <path d="M5 15.5l6.5-6.5 7 7-3.8 3.8H8.8L5 16.2z" />
          <path d="M12.8 19.8H20" />
        </>,
      );

    case "resistor":
      return icon(<polyline points="2,12 5,12 7.2,9.2 9.8,14.8 12.4,9.2 15,14.8 17.2,12 22,12" />);

    case "switch":
      return icon(
        <>
          <circle cx="5" cy="8" r="1.3" />
          <circle cx="5" cy="16" r="1.3" />
          <circle cx="19" cy="12" r="1.3" />
          <path d="M6.5 8H10M6.5 16H10M10 8l8.6 3.6" />
        </>,
      );

    case "diode":
      return icon(
        <>
          <path d="M3 12h4" />
          <polygon points="7,7 14,12 7,17" />
          <path d="M14 7v10M14 12h7" />
        </>,
      );

    case "capacitor":
      return icon(
        <>
          <path d="M3 12h5M16 12h5" />
          <path d="M8 6v12M16 6v12" />
        </>,
      );

    case "capacitor_ceramic":
      return icon(
        <>
          <path d="M3 12h5M16 12h5" />
          <path d="M8 6v12M16 6v12" />
          <rect x="10.7" y="8.2" width="2.6" height="7.6" rx="0.8" />
        </>,
      );

    case "capacitor_electrolytic":
      return icon(
        <>
          <path d="M3 12h5M16 12h5" />
          <path d="M8 6v12" />
          <path d="M16 6c2 1.6 2 10.4 0 12" />
          <path d="M5.5 7.5h3M7 6v3" />
        </>,
      );

    case "capacitor_film":
      return icon(
        <>
          <path d="M3 12h4.5M16.5 12H21" />
          <rect x="7.5" y="7" width="9" height="10" rx="1.5" />
        </>,
      );

    case "transistor":
      return icon(
        <>
          <circle cx="12" cy="12" r="5" />
          <path d="M7 12H3M12 7V3M12 17l5 4" />
          <path d="M12 16.8l1.4 0.5-0.8-1.1" />
        </>,
      );

    case "potentiometer":
      return icon(
        <>
          <polyline points="2,12 6,12 8,9 10,15 12,9 14,15 16,12 22,12" />
          <path d="M12 4v5" />
          <polyline points="10.3,6 12,4 13.7,6" />
        </>,
      );

    case "jack":
      return icon(
        <>
          <circle cx="8" cy="12" r="3.7" />
          <path d="M11.7 12H21" />
          <path d="M15 8v8M18 9.2v5.6" />
        </>,
      );

    case "power_pos":
      return icon(
        <>
          <circle cx="12" cy="12" r="7" />
          <path d="M12 8v8M8 12h8" />
        </>,
      );

    case "power_neg":
      return icon(
        <>
          <circle cx="12" cy="12" r="7" />
          <path d="M8 12h8" />
        </>,
      );

    case "power_gnd":
      return icon(
        <>
          <path d="M12 4v5M7 9h10M8.5 12.5h7M10 16h4" />
        </>,
      );

    case "dip":
      return icon(
        <>
          <rect x="7" y="5" width="10" height="14" rx="2" />
          <path d="M9.5 8h5" />
          <path d="M7 7H4M7 10H4M7 13H4M7 16H4" />
          <path d="M17 7h3M17 10h3M17 13h3M17 16h3" />
        </>,
      );
  }
}
