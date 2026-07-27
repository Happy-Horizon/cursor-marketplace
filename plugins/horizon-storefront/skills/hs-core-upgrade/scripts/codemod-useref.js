#!/usr/bin/env node

/**
 * Codemod: Fix useRef() calls to include initial null value
 *
 * React 19 requires an explicit initial value for useRef.
 * This codemod finds `useRef()` (no arguments) and replaces with `useRef(null)`.
 *
 * Usage: node codemod-useref.js <directory>
 * Example: node codemod-useref.js ./src
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!targetDir) {
    console.error('Usage: node codemod-useref.js <directory> [--dry-run]');
    process.exit(1);
}

const EXTENSIONS = ['.tsx', '.ts'];
let filesModified = 0;
let totalReplacements = 0;

function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.turbo') continue;
            walkDir(fullPath);
        } else if (EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;

    // Match useRef() with no arguments (with optional type parameter)
    // Handles: useRef(), useRef<Type>(), useRef< Type >()
    const pattern = /\buseRef(<[^>]*>)?\(\s*\)/g;
    const matches = content.match(pattern);
    if (!matches) return;

    const count = matches.length;

    // Replace useRef() → useRef(null), preserving type parameter
    content = content.replace(pattern, (match, typeParam) => {
        if (typeParam) {
            return `useRef${typeParam}(null)`;
        }
        return 'useRef(null)';
    });

    if (content !== original) {
        if (!dryRun) {
            fs.writeFileSync(filePath, content, 'utf-8');
        }
        filesModified++;
        totalReplacements += count;
        console.log(`  ${filePath} (${count} replacement${count > 1 ? 's' : ''})`);
    }
}

console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Scanning for useRef() without initial value in: ${path.resolve(targetDir)}\n`);
walkDir(path.resolve(targetDir));

console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Done! ${dryRun ? 'Would modify' : 'Modified'} ${filesModified} file(s), ${totalReplacements} total replacement(s).`);
if (filesModified > 0 && !dryRun) {
    console.log('\nReview changes with: git diff');
    console.log('Note: You may want to add explicit type parameters (e.g., useRef<HTMLDivElement | null>(null))');
}
if (dryRun) {
    console.log('\nRun without --dry-run to apply changes.');
}
