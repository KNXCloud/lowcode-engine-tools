import fs from 'node:fs';
import path from 'node:path';

export function replaceContent(
  filePath: string,
  pattern: string | RegExp,
  content: string
) {
  const entryFile = path.resolve(filePath);
  fs.writeFileSync(
    entryFile,
    fs.readFileSync(entryFile, 'utf-8').replace(pattern, content)
  );
}
