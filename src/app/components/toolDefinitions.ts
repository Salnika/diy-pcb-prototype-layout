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
  { tool: { type: "connect" }, icon: "connect", label: "Connecter (C)", title: "Connecter (C)" },
  { tool: { type: "fixedPoint" }, icon: "fixedPoint", label: "Point fixe (F)", title: "Point fixe (F)" },
  { tool: { type: "wire" }, icon: "wire", label: "Wire (W)", title: "Wire (W)" },
  { tool: { type: "jumper" }, icon: "jumper", label: "Jumper (J)", title: "Jumper (J)" },
  { tool: { type: "label" }, icon: "label", label: "Label net (L)", title: "Label net (L)" },
  { tool: { type: "erase" }, icon: "erase", label: "Erase (E)", title: "Erase (E)" },
] as const;

export const PART_TOOLS: readonly PartToolDefinition[] = [
  { kind: "resistor", icon: "resistor", label: "Résistance", title: "Résistance" },
  { kind: "diode", icon: "diode", label: "Diode", title: "Diode" },
  { kind: "capacitor", icon: "capacitor", label: "Condensateur", title: "Condensateur" },
  {
    kind: "capacitor_ceramic",
    icon: "capacitor_ceramic",
    label: "Condensateur céramique",
    title: "Condensateur céramique",
  },
  {
    kind: "capacitor_electrolytic",
    icon: "capacitor_electrolytic",
    label: "Condensateur polarisé",
    title: "Condensateur polarisé",
  },
  { kind: "capacitor_film", icon: "capacitor_film", label: "Condensateur film", title: "Condensateur film" },
  { kind: "transistor", icon: "transistor", label: "Transistor", title: "Transistor" },
  { kind: "potentiometer", icon: "potentiometer", label: "Potentiomètre", title: "Potentiomètre" },
  { kind: "jack", icon: "jack", label: "Jack (TRS)", title: "Jack (TRS)" },
  { kind: "power_pos", icon: "power_pos", label: "Alim +", title: "Alim +" },
  { kind: "power_neg", icon: "power_neg", label: "Alim -", title: "Alim -" },
  { kind: "power_gnd", icon: "power_gnd", label: "GND", title: "GND" },
  { kind: "dip", icon: "dip", label: "CI (DIP)", title: "CI (DIP)" },
] as const;

export const PART_KIND_OPTIONS: readonly Readonly<{ value: PartKind; label: string }>[] = [
  { value: "resistor", label: "Résistance" },
  { value: "diode", label: "Diode" },
  { value: "capacitor", label: "Condensateur" },
  { value: "capacitor_ceramic", label: "Condensateur céramique" },
  { value: "capacitor_electrolytic", label: "Condensateur polarisé" },
  { value: "capacitor_film", label: "Condensateur film" },
  { value: "transistor", label: "Transistor" },
  { value: "potentiometer", label: "Potentiomètre" },
  { value: "jack", label: "Jack (TRS)" },
  { value: "power_pos", label: "Alim +" },
  { value: "power_neg", label: "Alim -" },
  { value: "power_gnd", label: "GND" },
  { value: "dip", label: "CI (DIP)" },
] as const;
