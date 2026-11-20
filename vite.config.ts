import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

const patchRemoteEntry = {
  name: 'patch-remote-entry',
  generateBundle(_: unknown, bundle: Record<string, { type: string; code?: string }>) {
    const remoteEntry = bundle['remoteEntry.js'] as { type: string; code: string } | undefined;
    if (remoteEntry?.type === 'chunk' && remoteEntry.code) {
      // Replace preload-helper import (loaded as non-module by NPWD host)
      remoteEntry.code = remoteEntry.code.replace(
        /import\s*\{\s*_\s*as\s*(\w+)\s*\}\s*from\s*["'][^"']*preload-helper[^"']*["'];?\s*/,
        (_, varName) => `const ${varName} = (n) => n();\n`,
      );
      // Replace import.meta.url — syntax error when loaded as a non-module script
      remoteEntry.code = remoteEntry.code.replace(
        /import\.meta\.url/g,
        `(document.currentScript && document.currentScript.src || '')`,
      );
    }
  },
};

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'forge-npwd-management',
      filename: 'remoteEntry.js',
      exposes: { './config': './forge-npwd.config.ts' },
      shared: ['react', 'react-dom', '@emotion/react', 'react-router-dom'],
    }),
    patchRemoteEntry,
  ],
  build: {
    target: 'esnext',
    outDir: 'web/dist',
    emptyOutDir: true,
    modulePreload: false,
    assetsDir: '',
    assetsInlineLimit: 1000000,
  },
});
