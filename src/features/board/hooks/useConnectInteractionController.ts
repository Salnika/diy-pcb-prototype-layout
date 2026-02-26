import { useState } from "react";
import type { NetTerminal } from "../../../model";

export function useConnectInteractionController() {
  const [connectDraft, setConnectDraft] = useState<NetTerminal | null>(null);

  return {
    connectDraft,
    setConnectDraft,
  };
}
