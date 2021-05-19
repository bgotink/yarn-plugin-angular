import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import {getDynamicLibs, getPluginConfiguration} from '@yarnpkg/cli';
import {execFileSync} from 'child_process';
import {builtinModules as builtin} from 'module';
import path from 'path';
import {terser} from 'rollup-plugin-terser';

import packageJson from './package.json';

// Rollup hoists Ink's dynamic require of react-devtools-core which causes
// a window not found error so we exclude Ink's devtools file for now.
function excludeDevTools() {
  const re = /ink/;
  return {
    name: `ignoreDevTools`,

    load(id) {
      if (id.match(re)) {
        if (path.parse(id).name === `devtools`) {
          return {code: ``};
        }
      }
    },
  };
}

function hackyYodaFix() {
  return {
    name: 'hackyYodaFix',
    transform(code, id) {
      if (!/nbind/.test(id)) return;
      return code.replace('_a = _typeModule(_typeModule),', 'var _a = _typeModule(_typeModule);');
    },
  };
}

function outputYarnPlugin() {
  return {
    name: 'wrap plugin',

    renderChunk(code) {
      return `/* eslint-disable */
module.exports = {
  name: "@yarnpkg/plugin-angular",
  factory(require) {

${code}

    return plugin;
  },
};`;
    },
  };
}

function writeVersion() {
  return {
    name: 'write version',

    transform(code, id) {
      if (!/commands\/ng\/version/.test(id)) return;
      let version;
      if (process.env.IS_RELEASE) {
        version = packageJson.version;

        if (!version) {
          throw new Error(`No release version found`);
        }
      } else {
        const revision = execFileSync('git', ['describe', 'HEAD'], {
          cwd: __dirname,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'inherit'],
        });
        version = `${revision.replace(/^v/, '').trim()}`;
      }

      return code.replace(/'VERSION'/, `'${version}'`);
    },
  };
}

export default {
  input: 'src/index.ts',
  external: [...getDynamicLibs().keys(), ...getPluginConfiguration().plugins, ...builtin],
  plugins: [
    resolve(),
    typescript(),
    commonjs(),
    json(),
    excludeDevTools(),
    hackyYodaFix(),
    writeVersion(),
  ],

  output: [
    {
      file: 'bundles/@yarnpkg/plugin-angular.dev.js',
      format: 'cjs',
      exports: 'named',
      plugins: [outputYarnPlugin()],
    },
    {
      file: 'bundles/@yarnpkg/plugin-angular.js',
      format: 'cjs',
      exports: 'named',
      plugins: [
        (() => {
          const plugin = replace({
            'process.env.NODE_ENV': JSON.stringify('production'),
          });
          delete plugin.transform;
          return plugin;
        })(),
        outputYarnPlugin(),
        terser({
          ecma: 8,
        }),
      ],
    },
  ],
};
