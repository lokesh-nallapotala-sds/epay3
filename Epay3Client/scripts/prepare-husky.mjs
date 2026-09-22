import fs from 'node:fs';
import path from 'node:path';
import husky from 'husky';

const clientRoot = process.cwd();
const repoRoot = path.resolve(clientRoot, '..');
const hooksPath = 'Epay3Client/.husky';

if (!fs.existsSync(path.join(repoRoot, '.git'))) {
  process.exit(0);
}

process.chdir(repoRoot);

const result = husky(hooksPath);

if (
  result &&
  result !== ".git can't be found" &&
  result !== 'git command not found'
) {
  process.stdout.write(result);
}
