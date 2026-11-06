// Local-only allowlist snapshot. This script never installs/logs in/links/deploys/pushes.
import {
  cp,
  lstat,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
const info = JSON.parse(await readFile('dist/build-info.json', 'utf8'));
if (!/^[a-f0-9]{12}$/.test(info.build))
  throw new Error('Build a normal source-fingerprinted artifact first.');
const target = resolve(
  '.cache/stage3/staging-' + info.build + '-' + Date.now(),
);
const allowed = [
  'src',
  'public',
  'tests',
  'scripts',
  'package.json',
  'package-lock.json',
  'index.html',
  'vite.config.ts',
  'tsconfig.json',
  'eslint.config.js',
  'playwright.config.ts',
  'vercel.json',
  '.gitignore',
  '.prettierrc.json',
  '.prettierignore',
  '.npmrc',
  'README.md',
  'AGENTS.md',
  'THIRD_PARTY_NOTICES.md',
];
await mkdir(target, { recursive: true });
for (const path of allowed) {
  if (
    path === '.npmrc' &&
    /auth|token|password/i.test(await readFile(path, 'utf8'))
  )
    throw new Error('Review npm credentials; refusing to copy .npmrc.');
  await cp(path, join(target, path), {
    recursive: true,
    filter: async (source) => {
      if ((await lstat(source)).isSymbolicLink())
        throw new Error('Review symbolic links before staging: ' + source);
      if (
        /(?:^|\/)(?:\.env[^/]*|\.vercel|\.certs|\.cache)(?:\/|$)|\.(?:pem|key)$/i.test(
          source,
        )
      )
        throw new Error(
          'Unexpected sensitive path in staging allowlist: ' + source,
        );
      return true;
    },
  });
}
await writeFile(
  join(target, 'build-provenance.json'),
  JSON.stringify({ revision: info.revision, dirty: info.dirty }, null, 2),
);
const files = [];
async function inventory(dir, prefix = '') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name),
      name = prefix + entry.name;
    if (entry.isDirectory()) await inventory(path, name + '/');
    else
      files.push({
        path: name,
        sha256: createHash('sha256')
          .update(await readFile(path))
          .digest('hex'),
      });
  }
}
await inventory(target);
const manifest = {
  ...info,
  target,
  files: files.sort((a, b) => (a.path < b.path ? -1 : 1)),
  deploymentPerformed: false,
};
await writeFile(
  join(target, 'staging-manifest.json'),
  JSON.stringify(manifest, null, 2),
);
await writeFile(
  '.cache/stage3/staging-latest.json',
  JSON.stringify(manifest, null, 2),
);
console.log(
  JSON.stringify(
    {
      target,
      build: info.build,
      revision: info.revision,
      dirty: info.dirty,
      files: files.length,
      deploymentPerformed: false,
    },
    null,
    2,
  ),
);
