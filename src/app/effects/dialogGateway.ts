import { createContext, useContext } from "react";

export type DialogGateway = Readonly<{
  confirm: (message: string) => boolean;
  prompt: (message: string, defaultValue?: string) => string | null;
  confirmAutoLayout: () => boolean;
}>;

export const browserDialogGateway: DialogGateway = {
  confirm: (message) => window.confirm(message),
  prompt: (message, defaultValue) => window.prompt(message, defaultValue) ?? null,
  confirmAutoLayout: () =>
    window.confirm(
      "Auto-layout: optimize placement and regenerate traces from connections. Continue?",
    ),
};

export const DialogGatewayContext = createContext<DialogGateway | null>(null);

export function useDialogGateway(): DialogGateway {
  return useContext(DialogGatewayContext) ?? browserDialogGateway;
}
