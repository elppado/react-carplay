// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ["node-carplay"] })]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        stream: "stream-browserify",
        Buffer: "buffer"
      }
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: "globalThis"
        },
        plugins: [
          NodeGlobalsPolyfillPlugin({
            process: true,
            buffer: true
          })
        ]
      }
    },
    plugins: [react()]
  }
});
export {
  electron_vite_config_default as default
};
