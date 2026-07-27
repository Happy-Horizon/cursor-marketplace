#!/usr/bin/env node

/**
 * Codemod: Fix SCSS division operator deprecation
 *
 * Sass deprecated `/` for division. This codemod:
 * 1. Replaces `$var/2` patterns with `$var*0.5`
 * 2. Replaces `$var / 2)` patterns with `$var * 0.5)`
 * 3. Adds leading zeros to bare decimal values (.75 → 0.75)
 * 4. Adds missing semicolons after @content
 * 5. Fixes spacing in calc() division expressions
 *
 * Usage: node codemod-scss-division.js <directory>
 * Example: node codemod-scss-division.js ./src
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!targetDir) {
    console.error('Usage: node codemod-scss-division.js <directory> [--dry-run]');
    process.exit(1);
}

const EXTENSIONS = ['.scss', '.css'];
let filesModified = 0;
let totalFixes = 0;

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
    let fixes = 0;

    // 1. Fix simple division by 2: $var/2 → $var*0.5
    //    Matches: $variable/2, $variable / 2, ($variable / 2)
    content = content.replace(/(\$[\w-]+)\s*\/\s*2\b/g, (match, varName) => {
        fixes++;
        return `${varName}*0.5`;
    });

    // 2. Fix division in calc() - add spaces around / for clarity
    //    calc(... / (2/1)) → calc(... / (2 / 1))
    content = content.replace(/\((\d+)\/(\d+)\)/g, (match, a, b) => {
        fixes++;
        return `(${a} / ${b})`;
    });

    // 3. Add leading zeros to bare decimal values
    //    .75rem → 0.75rem, .875rem → 0.875rem
    //    But NOT inside selectors or property names
    content = content.replace(/(?<=[\s:,(])\.([\d]+)/g, (match, digits) => {
        fixes++;
        return `0.${digits}`;
    });

    // 4. Add missing semicolons after @content
    content = content.replace(/@content(?!\s*;)\s*$/gm, (match) => {
        // Only fix if @content is not followed by a semicolon
        if (match.trim() === '@content') {
            fixes++;
            return '@content;';
        }
        return match;
    });

    if (content !== original) {
        if (!dryRun) {
            fs.writeFileSync(filePath, content, 'utf-8');
        }
        filesModified++;
        totalFixes += fixes;
        console.log(`  ${filePath} (${fixes} fix${fixes > 1 ? 'es' : ''})`);
    }
}

console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Scanning for SCSS issues in: ${path.resolve(targetDir)}\n`);
walkDir(path.resolve(targetDir));

console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Done! ${dryRun ? 'Would modify' : 'Modified'} ${filesModified} file(s), ${totalFixes} total fix(es).`);
if (filesModified > 0 && !dryRun) {
    console.log('\nReview changes with: git diff');
    console.log('Note: Complex division expressions may need manual review.');
    console.log('Consider using @use "sass:math" and math.div() for complex cases.');
}
if (dryRun) {
    console.log('\nRun without --dry-run to apply changes.');
}
