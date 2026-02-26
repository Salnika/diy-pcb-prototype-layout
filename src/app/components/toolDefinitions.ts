import type { PartKind } from "../../model";
import type { Tool } from "../store";
import type { IconName } from "./ToolIcon";

export type ToolButtonDefinition = Readonly<{
  tool: Tool;
  icon: IconName;
  label: string;
  title: string;
}>;

export type PartToolDefinition = Readonly<{
  kind: PartKind;
  icon: IconName;
  label: string;
  title: string;
}>;

export const PRIMARY_TOOLS: readonly ToolButtonDefinition[] = [
  { tool: { type: "select" }, icon: "select", label: "Select (V)", title: "Select (V)" },
  { tool: { type: "connect" }, icon: "connect", label: "Connect (C)", title: "Connect (C)" },
  { tool: { type: "fixedPoint" }, icon: "fixedPoint", label: "Fixed Point (F)", title: "Fixed Point (F)" },
  { tool: { type: "wire" }, icon: "wire", label: "Wire (W)", title: "Wire (W)" },
  { tool: { type: "jumper" }, icon: "jumper", label: "Jumper (J)", title: "Jumper (J)" },
  { tool: { type: "label" }, icon: "label", label: "Net Label (L)", title: "Net Label (L)" },
  { tool: { type: "erase" }, icon: "erase", label: "Erase (E)", title: "Erase (E)" },
] as const;

export const PART_TOOLS: readonly PartToolDefinition[] = [
  { kind: "resistor", icon: "resistor", label: "Resistor", title: "Resistor" },
  { kind: "switch", icon: "switch", label: "Switch", title: "Switch" },
  { kind: "diode", icon: "diode", label: "Diode", title: "Diode" },
  { kind: "capacitor", icon: "capacitor", label: "Capacitor", title: "Capacitor" },
  {
    kind: "capacitor_ceramic",
    icon: "capacitor_ceramic",
    label: "Ceramic Capacitor",
    title: "Ceramic Capacitor",
  },
  {
    kind: "capacitor_electrolytic",
    icon: "capacitor_electrolytic",
    label: "Electrolytic Capacitor",
    title: "Electrolytic Capacitor",
  },
  { kind: "capacitor_film", icon: "capacitor_film", label: "Film Capacitor", title: "Film Capacitor" },
  { kind: "transistor", icon: "transistor", label: "Transistor", title: "Transistor" },
  { kind: "potentiometer", icon: "potentiometer", label: "Potentiometer", title: "Potentiometer" },
  { kind: "jack", icon: "jack", label: "Jack (TRS)", title: "Jack (TRS)" },
  { kind: "power_pos", icon: "power_pos", label: "Power +", title: "Power +" },
  { kind: "power_neg", icon: "power_neg", label: "Power -", title: "Power -" },
  { kind: "power_gnd", icon: "power_gnd", label: "GND", title: "GND" },
  { kind: "dip", icon: "dip", label: "IC (DIP)", title: "IC (DIP)" },
] as const;

export const PART_KIND_OPTIONS: readonly Readonly<{ value: PartKind; label: string }>[] = [
  { value: "resistor", label: "Resistor" },
  { value: "switch", label: "Switch" },
  { value: "diode", label: "Diode" },
  { value: "capacitor", label: "Capacitor" },
  { value: "capacitor_ceramic", label: "Ceramic Capacitor" },
  { value: "capacitor_electrolytic", label: "Electrolytic Capacitor" },
  { value: "capacitor_film", label: "Film Capacitor" },
  { value: "transistor", label: "Transistor" },
  { value: "potentiometer", label: "Potentiometer" },
  { value: "jack", label: "Jack (TRS)" },
  { value: "power_pos", label: "Power +" },
  { value: "power_neg", label: "Power -" },
  { value: "power_gnd", label: "GND" },
  { value: "dip", label: "IC (DIP)" },
] as const;
