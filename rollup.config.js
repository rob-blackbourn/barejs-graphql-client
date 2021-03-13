import { terser } from "rollup-plugin-terser";

export default {
  input: "src/index.js",
  output: [
    {
      file: "dist/index.js",
      format: "es",
    },
    {
        file: "dist/browser/index.min.js",
        format: "iife",
        name: 'barejsGraphQlClient',
        sourcemap: true,
        plugins: [
            terser()
        ]
    }
  ],
};
