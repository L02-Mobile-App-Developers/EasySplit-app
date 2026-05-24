import { render } from "@testing-library/react-native";

import Example from "@/app/example";

// kiểm tra có welcome không, nếu có thì test pass, không có thì test fail
describe("<Example />", () => {
  test("Text renders correctly on Example", () => {
    const { getByText } = render(<Example />);

    getByText("Welcome!");
  });
});
