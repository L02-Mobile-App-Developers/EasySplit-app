import { renderHook } from "@testing-library/react-native";

import { FontFamily } from "@/constants/fonts";
import { useAppTheme } from "@/hooks/useAppTheme";

jest.mock("@/hooks/use-theme-color", () => ({
  useThemeColor: jest.fn((_props, key: string) => `color-${key}`),
}));

describe("useAppTheme", () => {
  it("maps theme colors and font families", () => {
    const { result } = renderHook(() => useAppTheme());

    expect(result.current.textColor).toBe("color-text");
    expect(result.current.selected).toBe("color-primaryGreen");
    expect(result.current.fontBold).toBe(FontFamily.bold);
  });
});
