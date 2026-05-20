import { useThemeColor } from "@/hooks/use-theme-color";
import { FontFamily } from "@/constants/fonts";

export function useAppTheme() {
  return {
    textColor: useThemeColor({}, "text"),
    backgroundColor: useThemeColor({}, "background"),
    // iconDefaultColor: useThemeColor({}, "tabIconDefault"),
    selected: useThemeColor({}, "primaryGreen"),
    successGreen: useThemeColor({}, "successGreen"),
    errorRed: useThemeColor({}, "errorRed"),
    warningYellow: useThemeColor({}, "warningYellow"),
    tabIconDefault: useThemeColor({}, "tabIconDefault"),
    lightGray: useThemeColor({}, "lightGray"),
    backgroundWhite: useThemeColor({}, "background"),
    lightRed: useThemeColor({}, "lightRed"),
    lightGreen: useThemeColor({}, "lightGreen"),
    darkGreen: useThemeColor({}, "darkGreen"),
    // Font families
    fontRegular: FontFamily.regular,
    fontMedium: FontFamily.medium,
    fontSemibold: FontFamily.semibold,
    fontBold: FontFamily.bold,
    fontExtrabold: FontFamily.extrabold,
    fontBlack: FontFamily.black,
  };
}
