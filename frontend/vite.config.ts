import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    wasm(),
    topLevelAwait(),
    // Copy ZK assets from contract dist to public folder
    viteStaticCopy({
      targets: [
        {
          src: '../contract/dist/managed/kyc/zkir/*',
          dest: 'zkir'
        },
        {
          src: '../contract/dist/managed/kyc/keys/*',
          dest: 'keys'
        }
      ]
    })
  ],
  resolve: {
    alias: {
      // Force a single instance of these packages to fix dual-package-hazard/instanceof errors
      "@midnight-ntwrk/compact-runtime": path.resolve(__dirname, "node_modules/@midnight-ntwrk/compact-runtime"),
      "@midnight-ntwrk/ledger": path.resolve(__dirname, "node_modules/@midnight-ntwrk/ledger"),
      "@midnight-ntwrk/midnight-js-types": path.resolve(__dirname, "node_modules/@midnight-ntwrk/midnight-js-types"),
      // Browser shim for indexer WebSocket
      "isomorphic-ws": path.resolve(__dirname, "src/shims/isomorphic-ws.js"),
    }
  },
  optimizeDeps: {
    exclude: ['@midnight-ntwrk/ledger-wasm-node']
  }
})
