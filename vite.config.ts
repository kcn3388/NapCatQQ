// import PreprocessorDirectives from 'unplugin-preprocessor-directives/vite';
import obfuscator from 'rollup-plugin-obfuscator';
import cp from 'vite-plugin-cp';
import { UserConfig, defineConfig } from 'vite';
import { resolve } from 'path';
import { PluginOption, Plugin } from 'vite';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { builtinModules } from 'module';
import os from 'node:os';
import fs from 'node:fs';

const external = ['silk-wasm', 'ws', 'express', 'uuid', 'fluent-ffmpeg', 'sqlite3', 'log4js',
  'qrcode-terminal', 'MoeHook'];

const nodeModules = [...builtinModules, builtinModules.map(m => `node:${m}`)].flat();
// let nodeModules = ["fs", "path", "events", "buffer", "url", "crypto", "fs/promise", "fsPromise", "os", "http", "net"]
// nodeModules = [...nodeModules, ...nodeModules.map(m => `node:${m}`)]

function genCpModule(module: string) {
  return { src: `./node_modules/${module}`, dest: `dist/node_modules/${module}`, flatten: false };
}

const startScripts: string[] = ['./script/napcat.ps1', './script/napcat.bat', './script/napcat-utf8.bat', './script/napcat-utf8.ps1', './script/napcat-log.ps1',
  './script/napcat.sh'
];

// if (os.platform() !== 'win32') {
//   startScripts = ['./script/napcat.sh'];
// }

const baseConfigPlugin: PluginOption[] = [
  // PreprocessorDirectives(),
  cp({
    targets: [
      // ...external.map(genCpModule),
      { src: './src/onebot11/onebot11.json', dest: 'dist/config/' },
      { src: './package.json', dest: 'dist' },
      { src: './README.md', dest: 'dist' },
      { src: './src/core.lib/MoeHook.node', dest: 'dist' },
      ...(startScripts.map((startScript) => {
        return { src: startScript, dest: 'dist' };
      })),
    ]
  }),
  nodeResolve(),
  commonjs(),
];

let corePath = resolve(__dirname, './src/core/src');
if (!fs.existsSync(corePath)) {
  corePath = resolve(__dirname, './src/core.lib/src');
}
const baseConfig = (mode: string = 'development') => defineConfig({
  resolve: {
    conditions: ['node', 'default'],
    alias: {
      '@/core': corePath,
      '@': resolve(__dirname, './src'),
      './lib-cov/fluent-ffmpeg': './lib/fluent-ffmpeg',
    },
  },
  build: {
    target: 'esnext',
    minify: mode === 'production' ? 'esbuild' : false,
    lib: {
      entry: 'src/onebot11/index.ts',
      formats: ['cjs'],
      fileName: () => 'napcat.cjs',
    },
    rollupOptions: {
      // external: [ /node:*/ ],
      external: [...nodeModules, ...external]
    },
  },
});

export default defineConfig(({ mode }): UserConfig => {
  if (mode === 'production') {
    return {
      ...baseConfig(mode),
      plugins: [
        ...baseConfigPlugin,
        {
          ...(obfuscator({
            options: {
              compact: true,
              controlFlowFlattening: true,
              controlFlowFlatteningThreshold: 0.75,
              deadCodeInjection: true,
              deadCodeInjectionThreshold: 0.4,
              debugProtection: false,
              disableConsoleOutput: false,
              identifierNamesGenerator: 'hexadecimal',
              log: false,
              renameGlobals: false,
              rotateStringArray: true,
              selfDefending: true,
              stringArray: true,
              stringArrayEncoding: ['base64'],
              stringArrayThreshold: 0.75,
              transformObjectKeys: true,
              unicodeEscapeSequence: false
            },
            include: ['src/**/*.js', 'src/**/*.ts'],
          }) as Plugin),
          enforce: 'post',
          apply: 'build',
        },
      ]
    };
  } else {
    return {
      ...baseConfig(mode),
      plugins: baseConfigPlugin,
    };
  }
});
