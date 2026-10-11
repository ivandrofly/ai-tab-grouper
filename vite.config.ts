import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { copyFileSync, cpSync } from 'node:fs';

const root = resolve(import.meta.dirname, 'src');
const outDir = resolve(import.meta.dirname, 'dist');

export default defineConfig({
  root,
  // Extension pages are served from the extension root, not a web server path.
  base: './',
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: true,
    target: 'chrome120',
    modulePreload: false,
    rollupOptions: {
      input: {
        popup: resolve(root, 'popup/popup.html'),
        options: resolve(root, 'options/options.html'),
        background: resolve(root, 'background.ts'),
      },
      output: {
        // manifest.json points at background.js, so it must keep a fixed name.
        entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
  plugins: [
    {
      name: 'copy-extension-files',
      writeBundle() {
        copyFileSync(resolve(import.meta.dirname, 'manifest.json'), resolve(outDir, 'manifest.json'));
        cpSync(resolve(import.meta.dirname, 'icons'), resolve(outDir, 'icons'), { recursive: true });
      },
    },
  ],
  test: {
    root: import.meta.dirname,
    include: ['tests/**/*.test.ts'],
  },
});
