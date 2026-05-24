import { render } from "@testing-library/react-native";

import { ThemedText } from "@/components/ThemedText";
import { FontFamily } from "@/constants/fonts";

describe("<ThemedText />", () => {
  it("renders children with default font", () => {
    const { getByText } = render(<ThemedText>Hello</ThemedText>);
    const node = getByText("Hello");

    expect(node.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontFamily: FontFamily.regular }),
      ]),
    );
  });

  it("applies semibold font family", () => {
    const { getByText } = render(
      <ThemedText fontWeight="semibold">Bold text</ThemedText>,
    );
    const node = getByText("Bold text");

    expect(node.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontFamily: FontFamily.semibold }),
      ]),
    );
  });
});
