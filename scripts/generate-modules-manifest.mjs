import fs from 'node:fs';
import path from 'node:path';

const modulesRoot = path.resolve('modules');

if (!fs.existsSync(modulesRoot)) {
  console.error(`Modules folder not found: ${modulesRoot}`);
  process.exit(1);
}

const moduleNames = fs
  .readdirSync(modulesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const modules = moduleNames
  .filter((name) => fs.existsSync(path.join(modulesRoot, name, 'index.html')))
  .map((name) => {
    const modulePath = path.join(modulesRoot, name);
    const browserPath = path.join(modulePath, 'browser');

    const files = fs.existsSync(browserPath)
      ? fs
          .readdirSync(browserPath, { withFileTypes: true })
          .filter((entry) => entry.isFile())
          .map((entry) => entry.name)
          .sort()
      : [];

    const js = files.filter((file) => file.endsWith('.js'));
    const css = files.filter((file) => file.endsWith('.css'));

    return {
      name,
      entry: `${name}/index.html`,
      browserPath: `${name}/browser`,
      files: {
        js,
        css,
      },
    };
  });

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  modules,
};

fs.writeFileSync(path.join(modulesRoot, 'modules-manifest.json'), JSON.stringify(manifest, null, 2));
