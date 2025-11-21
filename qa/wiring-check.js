#!/usr/bin/env node

/**
 * Wiring Verification Script
 * 
 * Validates that all components, pages, and hooks are properly "wired" -
 * meaning they are imported and used somewhere in the codebase.
 * 
 * This prevents "orphaned" code that exists but isn't accessible.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Get all TypeScript/TSX files in a directory
 */
function getFiles(dir, extension = ['.ts', '.tsx']) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...getFiles(fullPath, extension));
    } else if (item.isFile()) {
      if (extension.some(ext => item.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Check if a file is imported anywhere in the codebase
 */
function isFileImported(targetFile, searchFiles) {
  const fileName = path.basename(targetFile, path.extname(targetFile));
  const relativePath = path.relative(projectRoot, targetFile);
  
  for (const searchFile of searchFiles) {
    if (searchFile === targetFile) continue; // Skip self
    
    try {
      const content = fs.readFileSync(searchFile, 'utf8');
      
      // Check for various import patterns
      const importPatterns = [
        new RegExp(`from ['"].*/${fileName}['"]`),
        new RegExp(`from ['"]@/.*/${fileName}['"]`),
        new RegExp(`import.*${fileName}`),
        new RegExp(`require\\(['"].*/${fileName}['"]\\)`),
      ];
      
      if (importPatterns.some(pattern => pattern.test(content))) {
        return true;
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  return false;
}

/**
 * Verify wiring for a directory
 */
function verifyDirectory(dirName, dirPath, allFiles) {
  print(`\nChecking ${dirName}...`, 'blue');
  
  const files = getFiles(dirPath);
  const unwired = [];
  const wired = [];
  
  for (const file of files) {
    const isWired = isFileImported(file, allFiles);
    const relativePath = path.relative(projectRoot, file);
    
    if (isWired) {
      wired.push(relativePath);
    } else {
      unwired.push(relativePath);
    }
  }
  
  print(`  ✓ Wired: ${wired.length}`, 'green');
  
  if (unwired.length > 0) {
    print(`  ⚠ Unwired: ${unwired.length}`, 'yellow');
    for (const file of unwired) {
      print(`    - ${file}`, 'yellow');
    }
  }
  
  return { wired, unwired };
}

/**
 * Main execution
 */
function main() {
  print('\n' + '='.repeat(70), 'bold');
  print('  Wiring Verification', 'bold');
  print('='.repeat(70), 'bold');
  
  // Get all source files
  const allFiles = getFiles(path.join(projectRoot, 'src'));
  
  print(`\nTotal source files: ${allFiles.length}`, 'blue');
  
  // Check different directories
  const results = {
    components: verifyDirectory(
      'Components',
      path.join(projectRoot, 'src/components'),
      allFiles
    ),
    pages: verifyDirectory(
      'Pages',
      path.join(projectRoot, 'src/pages'),
      allFiles
    ),
    hooks: verifyDirectory(
      'Hooks',
      path.join(projectRoot, 'src/hooks'),
      allFiles
    ),
  };
  
  // Summary
  print('\n' + '='.repeat(70), 'bold');
  print('  Summary', 'bold');
  print('='.repeat(70), 'bold');
  
  const totalWired = results.components.wired.length + results.pages.wired.length + results.hooks.wired.length;
  const totalUnwired = results.components.unwired.length + results.pages.unwired.length + results.hooks.unwired.length;
  
  print(`\nTotal Wired: ${totalWired}`, 'green');
  print(`Total Unwired: ${totalUnwired}`, totalUnwired > 0 ? 'yellow' : 'green');
  
  if (totalUnwired > 0) {
    print('\n⚠ Warning: Unwired files detected', 'yellow');
    print('These files exist but are not imported anywhere.', 'yellow');
    print('Consider wiring them or removing them as legacy code.', 'yellow');
    process.exit(2);
  } else {
    print('\n✓ All files are properly wired!', 'green');
    process.exit(0);
  }
}

main();
