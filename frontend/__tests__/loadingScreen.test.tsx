import { render } from "@testing-library/react-native";

import LoadingScreen from "@/services/LoadingScreen";

describe("<LoadingScreen />", () => {
  test("renders app name correctly", () => {
    const { getByText } = render(<LoadingScreen />);

    getByText("EASYSPLIT");
  });

  test("renders footer text correctly", () => {
    const { getByText } = render(<LoadingScreen />);

    getByText("Sản phẩm của");
    getByText("L02 - Mobile App Developers");
  });

  test("renders logo image", () => {
    const { getByTestId } = render(<LoadingScreen />);

    getByTestId("logo-image");
  });
});
