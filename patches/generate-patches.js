#!/usr/bin/env node

const {xfs, npath, ppath} = require('@yarnpkg/fslib');

const ROOT = npath.toPortablePath(__dirname);
const TARGET = ppath.join(ROOT, '../src/patches');

xfs.removeSync(TARGET);

for (const scope of xfs.readdirSync(ROOT)) {
  const dir = ppath.join(ROOT, scope);

  if (!xfs.statSync(dir).isDirectory()) {
    continue;
  }

  for (const filename of xfs.readdirSync(dir)) {
    const localPath = ppath.join(scope, filename);
    const targetPath = ppath.join(TARGET, `${localPath}.ts`);

    const content = JSON.stringify(xfs.readFileSync(ppath.join(ROOT, localPath), 'utf8'));

    xfs.mkdirpSync(ppath.dirname(targetPath));
    xfs.writeFileSync(targetPath, `export default ${content};\n`);
  }
}
