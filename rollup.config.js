import { terser } from "rollup-plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import pkg from "./package.json";

export default [
  // browser-friendly UMD build
  {
    input: "src/index.js",
    output: [
      {
        name: "graphqlClient",
        file: 'dist/browser/index.js',
        format: "umd",
      },
      {
        name: "graphqlClient",
        file: 'dist/browser/index.min.js',
        format: "umd",
        sourcemap: true,
        plugins: [terser()],
      },
    ],
    plugins: [
      resolve(),
      commonjs(),
    ],
  },

	// CommonJS (for Node) and ES module (for bundlers) build.
	{
		input: 'src/index.js',
		external: [],
		output: [
			{
        file: 'dist/index.js',
        format: 'es'
      },
			{
        file: 'dist/cjs/index.js',
        format: 'cjs'
      }
		]
	}
];
