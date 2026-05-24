module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  collectCoverage: false,
  collectCoverageFrom: [
    "api/**/*.{ts,tsx}",
    "store/**/*.{ts,tsx}",
    "hooks/useAppTheme.ts",
    "hooks/use-theme-color.ts",
    "hooks/useAuth.ts",
    "components/ThemedText.tsx",
    "services/**/*.{ts,tsx}",
    "constants/**/*.{ts,tsx}",
    "!api/types/**",
    "!api/groupApi.ts",
    "!**/__tests__/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["html", "lcov", "text", "text-summary"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  transformIgnorePatterns: [
    "node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))",
  ],

  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },

  testPathIgnorePatterns: [
    "/node_modules/",
    "/android/",
    "/ios/",
    "/__tests__/helpers/",
  ],
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
};
