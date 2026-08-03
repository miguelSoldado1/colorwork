import { describe, expect, it } from "vitest";
import { placeTooltip } from "../../src/components/ui/tooltip";

const VIEWPORT = { height: 800, width: 1280 };
const TIP = { height: 30, width: 130 };

function box(left: number, top: number, size = 48) {
  return { bottom: top + size, height: size, left, right: left + size, top, width: size };
}

describe("placeTooltip", () => {
  it("sits beside a stacked trigger, centred on it", () => {
    const spot = placeTooltip(box(29, 400), TIP, true, VIEWPORT);

    expect(spot.left).toBe(91);
    expect(spot.top).toBe(409);
  });

  it("drops below a trigger in a row, so neighbours stay visible", () => {
    const spot = placeTooltip(box(75, 94), TIP, false, VIEWPORT);

    expect(spot.top).toBe(156);
    expect(spot.left).toBe(34);
  });

  it("flips above a trigger with no room below", () => {
    const spot = placeTooltip(box(75, 760), TIP, false, VIEWPORT);

    expect(spot.top).toBe(716);
    expect(spot.origin).toBe("65px 30px");
  });

  it("falls back to below when a stacked trigger has no room beside it", () => {
    const spot = placeTooltip(box(1180, 400), TIP, true, VIEWPORT);

    expect(spot.top).toBe(462);
  });

  it("keeps the tooltip inside the viewport edges", () => {
    const atLeftEdge = placeTooltip(box(0, 94), TIP, false, VIEWPORT);
    const atRightEdge = placeTooltip(box(1232, 94), TIP, false, VIEWPORT);
    // Partly scrolled out of the top of the rail, so centring alone would go off-screen.
    const atTop = placeTooltip(box(29, -20), TIP, true, VIEWPORT);

    expect(atLeftEdge.left).toBe(8);
    expect(atRightEdge.left).toBe(1142);
    expect(atTop.top).toBe(8);
  });

  it("points the origin at the trigger even when clamped", () => {
    const spot = placeTooltip(box(0, 94), TIP, false, VIEWPORT);

    // Trigger centre is x=24, tooltip starts at x=8.
    expect(spot.origin).toBe("16px 0px");
  });
});
