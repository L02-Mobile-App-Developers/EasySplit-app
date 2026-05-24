import "@testing-library/jest-native/extend-expect";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("uuid", () => ({
  v4: jest.fn(() => "11111111-1111-1111-1111-111111111111"),
}));

Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: jest.fn(() => "22222222-2222-2222-2222-222222222222"),
  },
  configurable: true,
});
