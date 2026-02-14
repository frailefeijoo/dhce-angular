import fs from 'node:fs';
import path from 'node:path';

const modulePath = process.argv[2];

if (!modulePath) {
  console.error('Usage: node scripts/promote-index.mjs <module-output-path>');
  process.exit(1);
}

const browserIndexPath = path.join(modulePath, 'browser', 'index.html');
const rootIndexPath = path.join(modulePath, 'index.html');

if (!fs.existsSync(browserIndexPath)) {
  console.error(`Index not found at: ${browserIndexPath}`);
  process.exit(1);
}

const html = fs.readFileSync(browserIndexPath, 'utf8');

const toBrowserAssetPath = (match, attr, quote, value, offset, source) => {
  if (attr === 'href') {
    const context = source.slice(Math.max(0, offset - 20), offset).toLowerCase();
    if (context.includes('<base')) {
      return match;
    }
  }

  const isExternal = /^(https?:|data:|mailto:|tel:|#|\/\/)/i.test(value);
  const isAlreadyBrowserPath = value.startsWith('browser/') || value.startsWith('./browser/');
  const isAbsolutePath = value.startsWith('/');

  if (isExternal || isAlreadyBrowserPath || isAbsolutePath) {
    return `${attr}=${quote}${value}${quote}`;
  }

  return `${attr}=${quote}browser/${value}${quote}`;
};

const rewritten = html
  .replace(/(href)=(['"])([^'"]+)\2/g, toBrowserAssetPath)
  .replace(/(src)=(['"])([^'"]+)\2/g, toBrowserAssetPath);

fs.writeFileSync(rootIndexPath, rewritten, 'utf8');
