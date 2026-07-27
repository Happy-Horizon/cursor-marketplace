#!/usr/bin/env node

/**
 * Codemod: Migrate middleware.ts to proxy.ts
 *
 * Next.js 16 renames middleware to proxy. This codemod:
 * 1. Renames src/middleware.ts to src/proxy.ts
 * 2. Renames the exported `middleware` function to `proxy`
 *
 * Usage: node codemod-middleware-to-proxy.js <directory>
 * Example: node codemod-middleware-to-proxy.js ./src
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];
if (!targetDir) {
    console.error('Usage: node codemod-middleware-to-proxy.js <directory>');
    process.exit(1);
}

const resolvedDir = path.resolve(targetDir);

// Look for middleware.ts in the target directory and its parent
const possiblePaths = [
    path.join(resolvedDir, 'middleware.ts'),
    path.join(resolvedDir, 'middleware.tsx'),
    path.join(resolvedDir, 'middleware.js'),
];

let middlewarePath = null;
for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        middlewarePath = p;
        break;
    }
}

if (!middlewarePath) {
    console.log(`\nNo middleware file found in: ${resolvedDir}`);
    console.log('Checked:');
    possiblePaths.forEach((p) => console.log(`  ${p}`));
    console.log('\nMiddleware may have already been migrated to proxy.ts');
    process.exit(0);
}

const ext = path.extname(middlewarePath);
const proxyPath = path.join(path.dirname(middlewarePath), `proxy${ext}`);

// Check if proxy already exists
if (fs.existsSync(proxyPath)) {
    console.log(`\n${proxyPath} already exists!`);
    console.log('Skipping migration to avoid overwriting.');
    process.exit(1);
}

// Read middleware file
let content = fs.readFileSync(middlewarePath, 'utf-8');
const original = content;

// Replace export function middleware → export function proxy
content = content.replace(
    /export\s+(async\s+)?function\s+middleware\b/g,
    'export $1function proxy'
);

// Replace export const middleware → export const proxy
content = content.replace(
    /export\s+const\s+middleware\s*=/g,
    'export const proxy ='
);

// Replace export default function middleware → export default function proxy
content = content.replace(
    /export\s+default\s+(async\s+)?function\s+middleware\b/g,
    'export default $1function proxy'
);

// Write the new proxy file
fs.writeFileSync(proxyPath, content, 'utf-8');

// Remove the old middleware file
fs.unlinkSync(middlewarePath);

console.log(`\nMigrated middleware to proxy:`);
console.log(`  ${middlewarePath} → ${proxyPath}`);

if (content !== original) {
    console.log('  Renamed exported function: middleware → proxy');
} else {
    console.log('  Warning: Could not find middleware function export to rename.');
    console.log('  Please manually rename the exported function.');
}

console.log('\nReview changes with: git diff');
