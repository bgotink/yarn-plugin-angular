import {structUtils, Hooks} from '@yarnpkg/core';

export const registerPackageExtensions: Hooks['registerPackageExtensions'] = async (
  configuration,
  registerPackageExtension,
) => {
  if (configuration.get('nodeLinker') === 'node-modules') {
    return;
  }

  registerPackageExtension(
    structUtils.makeDescriptor(structUtils.makeIdent('angular', 'cdk'), '*'),
    {
      peerDependencies: {
        typescript: '*',
      },
      peerDependenciesMeta: {
        typescript: {optional: true},
      },
    },
  );

  registerPackageExtension(
    structUtils.makeDescriptor(structUtils.makeIdent('angular', 'core'), '*'),
    {
      peerDependencies: {
        '@angular/compiler': '*',
      },
      peerDependenciesMeta: {
        '@angular/compiler': {optional: true},
      },
    },
  );

  registerPackageExtension(
    structUtils.makeDescriptor(
      structUtils.makeIdent('angular-devkit', 'build-angular'),
      '< 0.1000.0',
    ),
    {
      dependencies: {
        '@types/karma': '^4.4.3',
        '@types/node': '^14.0.20',
        'pnp-webpack-plugin': '^1.6.0',
      },
      peerDependencies: {
        '@angular/core': '*',
        karma: '~4.4.1',
        protractor: '~5.4.3',
      },
      peerDependenciesMeta: {
        karma: {optional: true},
        protractor: {optional: true},
      },
    },
  );

  registerPackageExtension(
    structUtils.makeDescriptor(
      structUtils.makeIdent('angular-devkit', 'build-angular'),
      '< 0.1100.0',
    ),
    {
      dependencies: {
        '@types/karma': '^4.4.3',
        '@types/node': '^14.0.20',
      },
      peerDependencies: {
        '@angular/core': '*',
        karma: '~4.4.1',
        protractor: '~5.4.3',
      },
      peerDependenciesMeta: {
        karma: {optional: true},
        protractor: {optional: true},
      },
    },
  );

  registerPackageExtension(
    structUtils.makeDescriptor(structUtils.makeIdent('angular-devkit', 'build-angular'), '*'),
    {
      dependencies: {
        '@types/karma': '^5.0.1',
        '@types/node': '^14.0.20',
      },
      peerDependencies: {
        '@angular/core': '*',
      },
    },
  );

  registerPackageExtension(
    structUtils.makeDescriptor(structUtils.makeIdent('angular-devkit', 'core'), '*'),
    {
      dependencies: {
        '@types/node': '^14.0.20',
      },
    },
  );

  registerPackageExtension(
    structUtils.makeDescriptor(structUtils.makeIdent('angular-devkit', 'schematics'), '*'),
    {
      dependencies: {
        '@types/node': '^14.0.20',
      },
    },
  );

  registerPackageExtension(
    structUtils.makeDescriptor(structUtils.makeIdent('ngtools', 'webpack'), '*'),
    {
      dependencies: {
        '@types/node': '^14.0.20',
        '@yarnpkg/fslib': '^2.1.0',
      },
      peerDependencies: {
        '@angular/core': '*',
      },
    },
  );

  registerPackageExtension(
    structUtils.makeDescriptor(structUtils.makeIdent(null, 'protractor'), '*'),
    {
      dependenciesMeta: {
        'webdriver-manager': {unplugged: true},
      },
    },
  );

  registerPackageExtension(
    structUtils.makeDescriptor(structUtils.makeIdent(null, 'webpack'), '< 5.0.0'),
    {
      dependencies: {
        events: '^3.0.0',
      },
    },
  );
};
