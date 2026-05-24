import { FontFamily, FontSize, FontWeight } from "@/constants/fonts";

describe("fonts constants", () => {
  it("maps Inter font families", () => {
    expect(FontFamily.semibold).toBe("Inter_600SemiBold");
    expect(FontSize.lg).toBe(18);
    expect(FontWeight.bold).toBe("700");
  });
});
