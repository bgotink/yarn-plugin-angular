#!/usr/bin/env node

const {xfs, npath, ppath} = require('@yarnpkg/fslib');

const ROOT = npath.toPortablePath(__dirname);
const TARGET = ppath.join(ROOT, '../src/patches');

xfs.removeSync(TARGET);

const folders = new Set([ROOT]);

for (const folder of folders) {
  for (const entry of xfs.readdirSync(folder)) {
    const resolvedEntry = ppath.join(folder, entry);

    if (xfs.statSync(resolvedEntry).isDirectory()) {
      folders.add(resolvedEntry);
      continue;
    }

    if (ppath.extname(resolvedEntry) !== '.patch') {
      continue;
    }

    const localPath = ppath.relative(ROOT, resolvedEntry);
    const targetPath = ppath.join(TARGET, `${localPath}.ts`);

    const content = JSON.stringify(xfs.readFileSync(resolvedEntry, 'utf8'));

    xfs.mkdirpSync(ppath.dirname(targetPath));
    xfs.writeFileSync(targetPath, `export default ${content};\n`);
  }
}
