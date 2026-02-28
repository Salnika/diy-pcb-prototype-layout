import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { AppStoreProvider } from "./store";
import { DialogGatewayContext, type DialogGateway } from "./effects/dialogGateway";
import { StorageGatewayContext } from "./effects/storageGateway";

function renderApp() {
  const mem = new Map<string, string>();
  const storageGateway = {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mem.set(key, value);
    },
    removeItem: (key: string) => {
      mem.delete(key);
    },
  };

  const dialogGateway: DialogGateway = {
    confirm: () => true,
    prompt: () => null,
    confirmAutoLayout: () => true,
  };

  return render(
    <StorageGatewayContext.Provider value={storageGateway}>
      <DialogGatewayContext.Provider value={dialogGateway}>
        <AppStoreProvider>
          <App />
        </AppStoreProvider>
      </DialogGatewayContext.Provider>
    </StorageGatewayContext.Provider>,
  );
}

describe("App shell", () => {
  it("toggles tools and inspector drawers from header controls", () => {
    const { container } = renderApp();
    const asides = container.querySelectorAll("aside");
    const toolsPane = asides[0];
    const inspectorPane = asides[1];

    expect(toolsPane).toHaveAttribute("data-mobile-open", "false");
    expect(inspectorPane).toHaveAttribute("data-mobile-open", "false");

    fireEvent.click(screen.getByRole("button", { name: "Toggle tools panel" }));
    expect(toolsPane).toHaveAttribute("data-mobile-open", "true");
    expect(inspectorPane).toHaveAttribute("data-mobile-open", "false");

    fireEvent.click(screen.getByRole("button", { name: "Toggle inspector panel" }));
    expect(toolsPane).toHaveAttribute("data-mobile-open", "false");
    expect(inspectorPane).toHaveAttribute("data-mobile-open", "true");
  });

  it("closes drawers from dedicated close controls and backdrop", () => {
    const { container } = renderApp();
    const asides = container.querySelectorAll("aside");
    const toolsPane = asides[0];
    const inspectorPane = asides[1];

    fireEvent.click(screen.getByRole("button", { name: "Toggle tools panel" }));
    fireEvent.click(screen.getByRole("button", { name: "Close tools panel" }));
    expect(toolsPane).toHaveAttribute("data-mobile-open", "false");

    fireEvent.click(screen.getByRole("button", { name: "Toggle inspector panel" }));
    fireEvent.click(screen.getByRole("button", { name: "Close panels" }));
    expect(inspectorPane).toHaveAttribute("data-mobile-open", "false");
  });
});
