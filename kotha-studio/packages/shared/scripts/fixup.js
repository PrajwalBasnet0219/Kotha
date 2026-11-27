// Node needs to know the module system of each output folder.
const fs = require('fs');
const path = require('path');

for (const [dir, type] of [['cjs', 'commonjs'], ['esm', 'module']]) {
  const target = path.join(__dirname, '..', 'dist', dir);
  if (fs.existsSync(target)) {
    fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify({ type }, null, 2));
  }
}
