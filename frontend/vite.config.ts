import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from "path";

import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  logLevel: 'error',
  plugins: [
    react(),
    tailwindcss(),
    wasm(),
    topLevelAwait(),
    nodePolyfills(), // Polyfill Node.js globals (crypto, Buffer, process, etc.)
    // Copy ZK assets from contract dist to public folder
    viteStaticCopy({
      targets: [
        {
          src: '../contract/dist/managed/kyc/zkir/*.bzkir',
          dest: 'zkir'
        },
        {
          src: '../contract/dist/managed/kyc/keys/*',
          dest: 'keys'
        }
      ]
    })
  ],
  define: {
    'global': 'globalThis',
    'process.env': {},
  },
  resolve: {
    alias: {
      "@midnight-ntwrk/compact-runtime": path.resolve(__dirname, "node_modules/@midnight-ntwrk/compact-runtime"),
      "@midnight-ntwrk/ledger": path.resolve(__dirname, "node_modules/@midnight-ntwrk/ledger"),
      "@midnight-ntwrk/ledger-v7": path.resolve(__dirname, "node_modules/@midnight-ntwrk/ledger-v7/midnight_ledger_wasm.js"),
      "@midnight-ntwrk/onchain-runtime-v2": path.resolve(__dirname, "node_modules/@midnight-ntwrk/onchain-runtime-v2/midnight_onchain_runtime_wasm.js"),
      "@midnight-ntwrk/zswap": path.resolve(__dirname, "node_modules/@midnight-ntwrk/zswap/midnight_zswap_wasm.js"),
      "isomorphic-ws": path.resolve(__dirname, "src/shims/isomorphic-ws.js"),
    }
  },
  optimizeDeps: {
    include: ['object-inspect', 'buffer'],
    exclude: [
        '@midnight-ntwrk/ledger-wasm-node',
        '@midnight-ntwrk/ledger-v7',
        '@midnight-ntwrk/compact-runtime',
        '@midnight-ntwrk/onchain-runtime-v2',
        '@midnight-ntwrk/zswap'
    ],
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api/proof-server': {
        target: 'http://localhost:6300',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proof-server/, ''),
        secure: false,
      },
      '/check': {
        target: 'http://localhost:6300',
        changeOrigin: true,
        secure: false,
      },
      '/prove': {
        target: 'http://localhost:6300',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
