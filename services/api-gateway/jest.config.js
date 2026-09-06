export default {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          rootDir: ".",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          isolatedModules: true,
        },
      },
    ],
  },
  testMatch: ["**/tests/**/*.test.ts"],
};
