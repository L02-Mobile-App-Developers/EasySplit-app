import { renderHook } from "@testing-library/react-native";

import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: jest.fn(() => "light"),
}));

describe("useThemeColor", () => {
  it("returns theme color by name", () => {
    const { result } = renderHook(() => useThemeColor({}, "text"));

    expect(result.current).toBe(Colors.light.text);
  });

  it("prefers prop override for current theme", () => {
    const { result } = renderHook(() =>
      useThemeColor({ light: "#111111" }, "text"),
    );

    expect(result.current).toBe("#111111");
  });

  it("uses dark override when color scheme is dark", () => {
    (useColorScheme as jest.Mock).mockReturnValue("dark");

    const { result } = renderHook(() =>
      useThemeColor({ dark: "#222222" }, "text"),
    );

    expect(result.current).toBe("#222222");
  });
});
