// @ts-check

const {xfs, npath} = require('@yarnpkg/fslib');
const {inc, valid} = require('semver');

// Read current state

const packageJsonPath = npath.toPortablePath(npath.join(__dirname, '..', 'package.json'));

const packageJson = xfs.readJsonSync(packageJsonPath);

if (process.argv.length !== 3) {
  console.error('Usage: yarn version <version|bump>');

  process.exit(1);
}

// Bump version

const arg = process.argv[2];

let version = packageJson.version;
if (valid(arg)) {
  version = arg;
} else {
  switch (arg) {
    case 'major':
    case 'minor':
    case 'patch':
    case 'premajor':
    case 'preminor':
    case 'prepatch':
    case 'prerelease':
      version = inc(version, arg);
      break;
    default:
      throw new Error(`Invalid argument: ${JSON.stringify(arg)}`);
  }
}

// Write the version

packageJson.version = version;
xfs.writeJsonSync(packageJsonPath, packageJson);

console.log(version);
