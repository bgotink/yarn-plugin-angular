/* eslint-disable*/
module.exports = {
  name: "@yarnpkg/plugin-angular",
  factory: function (require) {
                          var plugin =
  /******/ (function(modules) { // webpackBootstrap
  /******/ 	// The module cache
  /******/ 	var installedModules = {};
  /******/
  /******/ 	// The require function
  /******/ 	function __webpack_require__(moduleId) {
  /******/
  /******/ 		// Check if module is in cache
  /******/ 		if(installedModules[moduleId]) {
  /******/ 			return installedModules[moduleId].exports;
  /******/ 		}
  /******/ 		// Create a new module (and put it into the cache)
  /******/ 		var module = installedModules[moduleId] = {
  /******/ 			i: moduleId,
  /******/ 			l: false,
  /******/ 			exports: {}
  /******/ 		};
  /******/
  /******/ 		// Execute the module function
  /******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
  /******/
  /******/ 		// Flag the module as loaded
  /******/ 		module.l = true;
  /******/
  /******/ 		// Return the exports of the module
  /******/ 		return module.exports;
  /******/ 	}
  /******/
  /******/
  /******/ 	// expose the modules object (__webpack_modules__)
  /******/ 	__webpack_require__.m = modules;
  /******/
  /******/ 	// expose the module cache
  /******/ 	__webpack_require__.c = installedModules;
  /******/
  /******/ 	// define getter function for harmony exports
  /******/ 	__webpack_require__.d = function(exports, name, getter) {
  /******/ 		if(!__webpack_require__.o(exports, name)) {
  /******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
  /******/ 		}
  /******/ 	};
  /******/
  /******/ 	// define __esModule on exports
  /******/ 	__webpack_require__.r = function(exports) {
  /******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
  /******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
  /******/ 		}
  /******/ 		Object.defineProperty(exports, '__esModule', { value: true });
  /******/ 	};
  /******/
  /******/ 	// create a fake namespace object
  /******/ 	// mode & 1: value is a module id, require it
  /******/ 	// mode & 2: merge all properties of value into the ns
  /******/ 	// mode & 4: return value when already ns object
  /******/ 	// mode & 8|1: behave like require
  /******/ 	__webpack_require__.t = function(value, mode) {
  /******/ 		if(mode & 1) value = __webpack_require__(value);
  /******/ 		if(mode & 8) return value;
  /******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
  /******/ 		var ns = Object.create(null);
  /******/ 		__webpack_require__.r(ns);
  /******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
  /******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
  /******/ 		return ns;
  /******/ 	};
  /******/
  /******/ 	// getDefaultExport function for compatibility with non-harmony modules
  /******/ 	__webpack_require__.n = function(module) {
  /******/ 		var getter = module && module.__esModule ?
  /******/ 			function getDefault() { return module['default']; } :
  /******/ 			function getModuleExports() { return module; };
  /******/ 		__webpack_require__.d(getter, 'a', getter);
  /******/ 		return getter;
  /******/ 	};
  /******/
  /******/ 	// Object.prototype.hasOwnProperty.call
  /******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
  /******/
  /******/ 	// __webpack_public_path__
  /******/ 	__webpack_require__.p = "";
  /******/
  /******/
  /******/ 	// Load entry module and return exports
  /******/ 	return __webpack_require__(__webpack_require__.s = 0);
  /******/ })
  /************************************************************************/
  /******/ ([
  /* 0 */
  /***/ (function(module, exports, __webpack_require__) {

  "use strict";


  var __importDefault = this && this.__importDefault || function (mod) {
    return mod && mod.__esModule ? mod : {
      "default": mod
    };
  };

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  const core_1 = __webpack_require__(1);

  const fslib_1 = __webpack_require__(2);

  const build_angular_patch_1 = __importDefault(__webpack_require__(3));

  const core_patch_1 = __importDefault(__webpack_require__(4));

  const cli_patch_1 = __importDefault(__webpack_require__(5));

  const PATCHES = new Map([[core_1.structUtils.makeIdent('angular-devkit', 'build-angular').identHash, build_angular_patch_1.default], [core_1.structUtils.makeIdent('angular-devkit', 'core').identHash, core_patch_1.default], [core_1.structUtils.makeIdent('angular', 'cli').identHash, cli_patch_1.default]]);
  const TAG = 'ng/';
  /* eslint-disable @typescript-eslint/require-await */

  const plugin = {
    hooks: {
      /**
       * Make the `@angular/cli` binaries available in the entire project, not just at the root level
       */
      setupScriptEnvironment: async (project, env, makePathWrapper) => {
        const angularCliDescriptor = project.topLevelWorkspace.dependencies.get(core_1.structUtils.makeIdent('angular', 'cli').identHash);

        if (!angularCliDescriptor) {
          return;
        }

        const angularCliLocator = project.storedResolutions.get(angularCliDescriptor.descriptorHash);

        if (!angularCliLocator) {
          throw new Error("Couldn't find resolution for @angular/cli");
        }

        const angularCliPackage = project.storedPackages.get(angularCliLocator);

        if (!angularCliPackage) {
          throw new Error(`Assertion failed: The package (${angularCliLocator}) should have been registered`);
        }

        const linker = project.configuration.getLinkers().find(linker => linker.supportsPackage(angularCliPackage, {
          project
        }));

        if (!linker) {
          throw new Error(`Assertion failed: The package (${angularCliLocator}) should have been linked`);
        }

        const packageLocation = await linker.findPackageLocation(angularCliPackage, {
          project,
          report: new core_1.ThrowReport()
        });

        for (const [name, target] of angularCliPackage.bin) {
          await makePathWrapper(name, process.execPath, [fslib_1.npath.fromPortablePath(fslib_1.ppath.resolve(packageLocation, target))]);
        }
      },
      registerPackageExtensions: async (configuration, registerPackageExtension) => {
        registerPackageExtension(core_1.structUtils.makeDescriptor(core_1.structUtils.makeIdent('angular-devkit', 'build-angular'), '*'), {
          dependencies: {
            'pnp-webpack-plugin': '^1.6.0'
          },
          peerDependencies: {
            karma: '~4.4.1',
            protractor: '~5.4.3'
          },
          peerDependenciesMeta: {
            karma: {
              optional: true
            },
            protractor: {
              optional: true
            }
          }
        });
        registerPackageExtension(core_1.structUtils.makeDescriptor(core_1.structUtils.makeIdent(null, 'protractor'), '*'), {
          dependenciesMeta: {
            'webdriver-manager': {
              unplugged: true
            }
          }
        });
      },

      /**
       * Patch a couple of packages to make them work with pnp
       */
      getBuiltinPatch: async (project, name) => {
        if (!name.startsWith(TAG)) {
          return;
        }

        return PATCHES.get(core_1.structUtils.parseIdent(name.slice(TAG.length)).identHash) || null;
      },
      reduceDependency: async dependency => {
        const patch = PATCHES.get(dependency.identHash);

        if (patch == null) {
          return dependency;
        }

        return core_1.structUtils.makeDescriptor(dependency, core_1.structUtils.makeRange({
          protocol: `patch:`,
          source: core_1.structUtils.stringifyDescriptor(dependency),
          selector: `builtin<${TAG}${core_1.structUtils.stringifyIdent(dependency)}>`,
          params: null
        }));
      }
    }
  };
  exports.default = plugin;

  /***/ }),
  /* 1 */
  /***/ (function(module, exports) {

  module.exports = require("@yarnpkg/core");

  /***/ }),
  /* 2 */
  /***/ (function(module, exports) {

  module.exports = require("@yarnpkg/fslib");

  /***/ }),
  /* 3 */
  /***/ (function(module, exports, __webpack_require__) {

  "use strict";


  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = "diff --git a/src/angular-cli-files/models/webpack-configs/common.js b/src/angular-cli-files/models/webpack-configs/common.js\nsemver exclusivity >= 0.900.0\n--- a/src/angular-cli-files/models/webpack-configs/common.js\n+++ b/src/angular-cli-files/models/webpack-configs/common.js\n@@ -385,6 +385,9 @@ function getCommonConfig(wco) {\n         devtool: false,\n         profile: buildOptions.statsJson,\n         resolve: {\n+            plugins: [\n+                require('pnp-webpack-plugin'),\n+            ],\n             extensions: ['.ts', '.tsx', '.mjs', '.js'],\n             symlinks: !buildOptions.preserveSymlinks,\n             modules: [wco.tsConfig.options.baseUrl || projectRoot, 'node_modules'],\n@@ -393,6 +396,9 @@ function getCommonConfig(wco) {\n         resolveLoader: {\n             symlinks: !buildOptions.preserveSymlinks,\n             modules: loaderNodeModules,\n+            plugins: [\n+                require('pnp-webpack-plugin').moduleLoader(module),\n+            ],\n         },\n         context: projectRoot,\n         entry: entryPoints,\ndiff --git a/src/angular-cli-files/models/webpack-configs/common.js b/src/angular-cli-files/models/webpack-configs/common.js\nsemver exclusivity > 0.803.0 < 0.900.0\n--- a/src/angular-cli-files/models/webpack-configs/common.js\n+++ b/src/angular-cli-files/models/webpack-configs/common.js\n@@ -32,10 +32,7 @@ function getCommonConfig(wco) {\n     const { root, projectRoot, buildOptions, tsConfig } = wco;\n     const { styles: stylesOptimization, scripts: scriptsOptimization } = buildOptions.optimization;\n     const { styles: stylesSourceMap, scripts: scriptsSourceMap, vendor: vendorSourceMap, } = buildOptions.sourceMap;\n-    const nodeModules = find_up_1.findUp('node_modules', projectRoot);\n-    if (!nodeModules) {\n-        throw new Error('Cannot locate node_modules directory.');\n-    }\n+    const nodeModules = undefined;\n     // tslint:disable-next-line:no-any\n     const extraPlugins = [];\n     const entryPoints = {};\n@@ -327,6 +324,9 @@ function getCommonConfig(wco) {\n         devtool: false,\n         profile: buildOptions.statsJson,\n         resolve: {\n+            plugins: [\n+                require('pnp-webpack-plugin'),\n+            ],\n             extensions: ['.ts', '.tsx', '.mjs', '.js'],\n             symlinks: !buildOptions.preserveSymlinks,\n             modules: [wco.tsConfig.options.baseUrl || projectRoot, 'node_modules'],\n@@ -334,6 +334,9 @@ function getCommonConfig(wco) {\n         },\n         resolveLoader: {\n             modules: loaderNodeModules,\n+            plugins: [\n+                require('pnp-webpack-plugin').moduleLoader(module),\n+            ],\n         },\n         context: projectRoot,\n         entry: entryPoints,\ndiff --git a/src/protractor/index.js b/src/protractor/index.js\nsemver exclusivity < 0.900.0\n--- a/src/protractor/index.js\n+++ b/src/protractor/index.js\n@@ -27,21 +27,14 @@ function runProtractor(root, options) {\n async function updateWebdriver() {\n     // The webdriver-manager update command can only be accessed via a deep import.\n     const webdriverDeepImport = 'webdriver-manager/built/lib/cmds/update';\n-    const importOptions = [\n-        // When using npm, webdriver is within protractor/node_modules.\n-        `protractor/node_modules/${webdriverDeepImport}`,\n-        // When using yarn, webdriver is found as a root module.\n-        webdriverDeepImport,\n-    ];\n     let path;\n-    for (const importOption of importOptions) {\n-        try {\n-            path = require.resolve(importOption);\n-        }\n-        catch (error) {\n-            if (error.code !== 'MODULE_NOT_FOUND') {\n-                throw error;\n-            }\n+    try {\n+        const protractorPath = require.resolve('protractor');\n+        path = require.resolve(webdriverDeepImport, { paths: [protractorPath] });\n+    }\n+    catch (error) {\n+        if (error.code !== 'MODULE_NOT_FOUND') {\n+            throw error;\n         }\n     }\n     if (!path) {\n";

  /***/ }),
  /* 4 */
  /***/ (function(module, exports, __webpack_require__) {

  "use strict";


  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = "diff --git a/node/resolve.js b/node/resolve.js\nindex 41c5a81..77cfbe4 100644\nsemver exclusivity >=8.3.13\n--- a/node/resolve.js\n+++ b/node/resolve.js\n@@ -66,7 +66,80 @@ function _getGlobalNodeModules() {\n         ? path.resolve(globalPrefix || '', 'lib', 'node_modules')\n         : path.resolve(globalPrefix || '', 'node_modules');\n }\n-let _resolveHook = null;\n+const pnpapi = require('pnpapi');\n+let _resolveHook =\n+    /**\n+     *\n+     * @param {string} request\n+     * @param {{paths?: string[]; checkLocal?: boolean; basedir: string}} options\n+     */\n+    function resolveHook(request, options) {\n+      const basePath = options.basedir;\n+\n+      if (/^(?:\\.\\.?(?:\\/|$)|\\/|([A-Za-z]:)?[/\\\\])/.test(request)) {\n+        let res = path.resolve(basePath, request);\n+        if (request === '..' || request.endsWith('/')) {\n+          res += '/';\n+        }\n+\n+        const m = resolve(res, options);\n+        if (m) {\n+          return m;\n+        }\n+      } else {\n+        const n = resolve(request, options);\n+        if (n) {\n+          return n;\n+        }\n+      }\n+\n+      if (options.checkLocal) {\n+        const callers = _caller();\n+        for (const caller of callers) {\n+          const localDir = path.dirname(caller);\n+          if (localDir !== options.basedir) {\n+            try {\n+              return resolveHook(x, {\n+                ...options,\n+                checkLocal: false,\n+                basedir: localDir,\n+              });\n+            } catch (e) {\n+              // Just swap the basePath with the original call one.\n+              if (!(e instanceof ModuleNotFoundException)) {\n+                throw e;\n+              }\n+            }\n+          }\n+        }\n+      }\n+\n+      throw new ModuleNotFoundException(request, basePath);\n+\n+      function resolve(request, options) {\n+        if (options.resolvePackageJson) {\n+          try {\n+            return pnpapi.resolveRequest(path.join(request, 'package.json'), options.basedir);\n+          } catch (_) {\n+            // ignore\n+          }\n+        }\n+\n+        if (request.endsWith('/')) {\n+          try {\n+            return pnpapi.resolveRequest(path.join(request, 'index'), options.basedir);\n+          } catch (_) {\n+            // ignore\n+          }\n+        } else {\n+          try {\n+            return pnpapi.resolveRequest(request, options.basedir);\n+          } catch (_) {\n+            // ignore\n+          }\n+        }\n+      }\n+    };\n /** @deprecated since version 8. Use `require.resolve` instead. */\n function setResolveHook(hook) {\n     _resolveHook = hook;\n";

  /***/ }),
  /* 5 */
  /***/ (function(module, exports, __webpack_require__) {

  "use strict";


  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = "diff --git a/commands/version-impl.js b/commands/version-impl.js\n--- a/commands/version-impl.js\n+++ b/commands/version-impl.js\n@@ -45,7 +45,7 @@ class VersionCommand extends command_1.Command {\n             ...Object.keys((projPkg && projPkg['dependencies']) || {}),\n             ...Object.keys((projPkg && projPkg['devDependencies']) || {}),\n         ];\n-        if (packageRoot != null) {\n+        if (false && packageRoot != null) {\n             // Add all node_modules and node_modules/@*/*\n             const nodePackageNames = fs.readdirSync(packageRoot).reduce((acc, name) => {\n                 if (name.startsWith('@')) {\n@@ -63,7 +63,15 @@ class VersionCommand extends command_1.Command {\n             if (name in acc) {\n                 return acc;\n             }\n-            acc[name] = this.getVersion(name, packageRoot, maybeNodeModules);\n+            try {\n+                acc[name] = require(require.resolve(`${name}/package.json`, {paths: [this.workspace.root]})).version;\n+            } catch (_) {\n+                try {\n+                    acc[name] = require(`${name}/package.json`).version + ' (cli-only)';\n+                } catch (_) {\n+                    acc[name] = '<error>';\n+                }\n+            }\n             return acc;\n         }, {});\n         let ngCliVersion = pkg.version;\n";

  /***/ })
  /******/ ]);
    return plugin;
  },
};
