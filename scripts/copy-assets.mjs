import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, sep } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const src = join(root, 'src');
const dist = join(root, 'dist');
const assetExtensions = new Set(['.graphql', '.json', '.css', '.scss']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
      continue;
    }

    if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

for (const file of await walk(src)) {
  if (!assetExtensions.has(extname(file))) {
    continue;
  }

  const output = join(dist, relative(src, file).split(sep).join('/'));
  await mkdir(dirname(output), { recursive: true });
  await copyFile(file, output);
}

await stat(dist);
