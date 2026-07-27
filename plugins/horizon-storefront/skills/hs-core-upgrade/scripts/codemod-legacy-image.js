#!/usr/bin/env node

/**
 * Codemod: Migrate next/legacy/image to next/image
 *
 * v2-era projects used `next/legacy/image` (or the old `next/image` API with
 * `layout` prop). This codemod:
 *
 * 1. Replaces `import Image from 'next/legacy/image'` with `import Image from 'next/image'`
 * 2. Removes deprecated `layout` prop and converts to equivalent style
 * 3. Removes `objectFit` / `objectPosition` props (moved to style)
 * 4. Removes `lazyBoundary` / `lazyRoot` props (removed in modern next/image)
 *
 * Usage: node codemod-legacy-image.js <directory>
 * Example: node codemod-legacy-image.js ./src
 *
 * Options:
 *   --dry-run    Show what would change without writing files
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!targetDir) {
    console.error('Usage: node codemod-legacy-image.js <directory> [--dry-run]');
    process.exit(1);
}

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];
let filesModified = 0;
let totalFixes = 0;

function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', '.next', '.turbo', '.git', 'dist', 'build'].includes(entry.name)) continue;
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

    // 1. Replace import from 'next/legacy/image' → 'next/image'
    const legacyImportRegex = /(import\s+(?:\w+|\{[^}]+\})\s+from\s+['"])next\/legacy\/image(['"])/g;
    const legacyMatches = content.match(legacyImportRegex);
    if (legacyMatches) {
        fixes += legacyMatches.length;
        content = content.replace(legacyImportRegex, '$1next/image$2');
    }

    // 2. Replace require('next/legacy/image') → require('next/image')
    content = content.replace(
        /require\(\s*['"]next\/legacy\/image['"]\s*\)/g,
        (match) => {
            fixes++;
            return match.replace('next/legacy/image', 'next/image');
        }
    );

    // 3. Remove deprecated `layout` prop from <Image> components
    //    layout="fill" → style={{ objectFit: 'cover' }} (or use fill prop)
    //    layout="responsive" → remove (new default)
    //    layout="intrinsic" → remove (new default)
    //    layout="fixed" → remove
    const layoutFillRegex = /(\s+)layout\s*=\s*["']fill["']/g;
    const layoutFillMatches = content.match(layoutFillRegex);
    if (layoutFillMatches) {
        fixes += layoutFillMatches.length;
        content = content.replace(layoutFillRegex, '$1fill');
    }

    const layoutOtherRegex = /\s+layout\s*=\s*["'](?:responsive|intrinsic|fixed)["']/g;
    const layoutOtherMatches = content.match(layoutOtherRegex);
    if (layoutOtherMatches) {
        fixes += layoutOtherMatches.length;
        content = content.replace(layoutOtherRegex, '');
    }

    // 4. Convert objectFit prop to style (only if not already in style prop)
    //    objectFit="cover" → style={{ objectFit: 'cover' }}
    const objectFitRegex = /\s+objectFit\s*=\s*["'](\w+)["']/g;
    const objectFitMatches = content.match(objectFitRegex);
    if (objectFitMatches) {
        fixes += objectFitMatches.length;
        // For simplicity, just remove objectFit prop and add a comment
        content = content.replace(objectFitRegex, (match, value) => {
            return ` style={{ objectFit: '${value}' }}`;
        });
    }

    // 5. Convert objectPosition prop to style
    //    objectPosition="center" → style={{ objectPosition: 'center' }}
    const objectPosRegex = /\s+objectPosition\s*=\s*["']([^"']+)["']/g;
    const objectPosMatches = content.match(objectPosRegex);
    if (objectPosMatches) {
        fixes += objectPosMatches.length;
        content = content.replace(objectPosRegex, (match, value) => {
            return ` style={{ objectPosition: '${value}' }}`;
        });
    }

    // 6. Remove deprecated lazyBoundary and lazyRoot props
    const deprecatedPropsRegex = /\s+(?:lazyBoundary|lazyRoot)\s*=\s*(?:["'][^"']*["']|\{[^}]*\})/g;
    const deprecatedMatches = content.match(deprecatedPropsRegex);
    if (deprecatedMatches) {
        fixes += deprecatedMatches.length;
        content = content.replace(deprecatedPropsRegex, '');
    }

    if (content !== original) {
        if (!dryRun) {
            fs.writeFileSync(filePath, content, 'utf-8');
        }
        filesModified++;
        totalFixes += fixes;
        console.log(`  ${filePath} (${fixes} fix${fixes > 1 ? 'es' : ''})`);
    }
}

console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Scanning for next/legacy/image usage in: ${path.resolve(targetDir)}\n`);
walkDir(path.resolve(targetDir));

console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Done! ${dryRun ? 'Would modify' : 'Modified'} ${filesModified} file(s), ${totalFixes} total fix(es).`);
if (filesModified > 0) {
    if (!dryRun) {
        console.log('\nReview changes with: git diff');
    }
    console.log('\nNote: If objectFit/objectPosition were combined with existing style props,');
    console.log('you may need to manually merge the style objects.');
    console.log('Also check for any `layout="fill"` that was converted to `fill` prop —');
    console.log('ensure the parent has `position: relative` set.');
}

if (dryRun) {
    console.log('\nRun without --dry-run to apply changes.');
}
