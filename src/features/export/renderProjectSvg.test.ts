import { describe, expect, it } from "vitest";
import { renderProjectSvg } from "./renderProjectSvg";
import { makeInline2Part, makeLabel, makeNet, makeProject, makeTrace } from "../../test/fixtures";

describe("renderProjectSvg", () => {
  it("renders a complete svg with board, traces, parts and labels", () => {
    const part = makeInline2Part({
      id: "p1",
      ref: "R1",
      origin: { x: 1, y: 1 },
      span: 2,
      value: "10k",
    });
    const project = makeProject({
      width: 6,
      height: 4,
      parts: [part],
      traces: [makeTrace("t1", [{ x: 1, y: 1 }, { x: 4, y: 1 }])],
      netLabels: [makeLabel("nl1", { x: 1, y: 1 }, "VCC")],
      netlist: [makeNet("n1", [{ kind: "pin", partId: "p1", pinId: "1" }, { kind: "hole", hole: { x: 1, y: 1 } }], "VCC")],
    });

    const { svg, width, height } = renderProjectSvg(project);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect(svg).toContain("<svg");
    expect(svg).toContain("R1");
    expect(svg).toContain("10k");
    expect(svg).toContain("VCC");
    expect(svg).toContain("<polyline");
    expect(svg).toContain("<circle");
  });

  it("escapes xml-sensitive text in labels and refs", () => {
    const part = makeInline2Part({
      id: "p1",
      ref: `R<1>&"X"`,
      origin: { x: 1, y: 1 },
      span: 2,
      value: `1k<'>&"`,
    });
    const project = makeProject({
      parts: [part],
      netLabels: [makeLabel("nl1", { x: 1, y: 1 }, `G<&>"'`)],
    });
    const { svg } = renderProjectSvg(project);
    expect(svg).toContain("R&lt;1&gt;&amp;&quot;X&quot;");
    expect(svg).toContain("1k&lt;&#39;&gt;&amp;&quot;");
    expect(svg).toContain("G&lt;&amp;&gt;&quot;&#39;");
  });
});
