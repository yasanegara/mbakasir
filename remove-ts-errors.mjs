const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));
let changedFiles = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('@ts-expect-error')) {
    // Remove lines with @ts-expect-error
    const newContent = content.split('\n').filter(line => !line.includes('@ts-expect-error')).join('\n');
    fs.writeFileSync(file, newContent);
    console.log('Removed from', file);
    changedFiles++;
  }
});

console.log(`Finished. Changed ${changedFiles} files.`);
