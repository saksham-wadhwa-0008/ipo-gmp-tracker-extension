const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));
const version = manifest.version || '1.0.0';
const zipName = `ipo-gmp-tracker-v${version}.zip`;
const zipPath = path.join(rootDir, zipName);

// Remove old zip if present
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Build production zip with required files only (exclude tests, docs, node_modules, git)
const filesToInclude = [
  'manifest.json',
  'background/*',
  'content/*',
  'popup/*',
  'utils/*',
  'icons/*'
];

const cmd = `zip -r "${zipPath}" ${filesToInclude.join(' ')}`;
console.log(`Packaging extension into ${zipName}...`);
execSync(cmd, { cwd: rootDir, stdio: 'inherit' });

const stats = fs.statSync(zipPath);
console.log(`\n✅ Package created successfully: ${zipName} (${(stats.size / 1024).toFixed(1)} KB)`);
console.log(`Ready for upload to Chrome Web Store Developer Dashboard!`);
