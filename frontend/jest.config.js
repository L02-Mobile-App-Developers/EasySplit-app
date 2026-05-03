module.exports = {
  preset: "jest-expo",

  // Keep coverage collection consistent with package.json
  collectCoverage: true,
  collectCoverageFrom: [
    "**/*.{ts,tsx,js,jsx}",
    "!**/coverage/**",
    "!**/node_modules/**",
    "!**/babel.config.js",
    "!**/expo-env.d.ts",
    "!**/.expo/**",
    "!**app-examples/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text"],

  // Transform ignore: allow some react-native/expo packages to be transformed
  transformIgnorePatterns: [
    "node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))",
  ],

  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

  testPathIgnorePatterns: ["/node_modules/", "/android/", "/ios/"],
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
};
