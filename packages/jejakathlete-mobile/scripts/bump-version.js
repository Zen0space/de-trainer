#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get version type from command line argument
const versionType = process.argv[2] || 'patch';

// Valid version types
const validTypes = ['major', 'minor', 'patch'];

if (!validTypes.includes(versionType)) {
  console.error(`❌ Invalid version type: ${versionType}`);
  console.log('Usage: node scripts/bump-version.js [major|minor|patch]');
  console.log('Example: node scripts/bump-version.js patch');
  process.exit(1);
}

// File paths
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const appJsonPath = path.join(__dirname, '..', 'app.json');

// Read files
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Parse current version
const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Calculate new version
let newVersion;
switch (versionType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

// Update versions
packageJson.version = newVersion;
appJson.expo.version = newVersion;

// Write files back
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

console.log('✅ Version bumped successfully!');
console.log(`   ${currentVersion} → ${newVersion}`);
console.log('');
console.log('📦 Updated files:');
console.log('   - package.json');
console.log('   - app.json');
console.log('');
console.log('💡 Next steps:');
console.log('   1. Review the changes');
console.log('   2. Commit: git add . && git commit -m "chore: bump version to ' + newVersion + '"');
console.log('   3. Build: eas build --platform android (or ios)');
