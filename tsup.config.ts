import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "bin/gitfamiliar": "bin/gitfamiliar.ts",
  },
  format: ["esm"],
  dts: { entry: "src/index.ts" },
  splitting: true,
  sourcemap: true,
  clean: true,
  target: "node18",
});
