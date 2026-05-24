import { Text, TextProps } from "react-native";
import { FontFamily } from "@/constants/fonts";

interface ThemedTextProps extends TextProps {
  fontWeight?: "regular" | "medium" | "semibold" | "bold" | "extrabold" | "black";
}

export function ThemedText({
  style,
  fontWeight = "regular",
  ...rest
}: ThemedTextProps) {
  const fontFamilyMap = {
    regular: FontFamily.regular,
    medium: FontFamily.medium,
    semibold: FontFamily.semibold,
    bold: FontFamily.bold,
    extrabold: FontFamily.extrabold,
    black: FontFamily.black,
  };

  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: fontFamilyMap[fontWeight],
        },
        style,
      ]}
    />
  );
}
