import { Colors } from "@/constants/colors";

describe("Colors", () => {
  it("exposes shared palette for light and dark", () => {
    expect(Colors.light.primaryGreen).toBe("#22C55E");
    expect(Colors.dark.primaryGreen).toBe(Colors.light.primaryGreen);
    expect(Colors.light.errorRed).toBe("#BA1A1A");
  });
});
