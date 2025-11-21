#!/usr/bin/env node

/**
 * QA Checker - Machine-verifiable validation against ARCHITECTURE.md
 * 
 * This script implements the QA checks defined in qa/requirements.json
 * and validates the codebase against the True North (ARCHITECTURE.md).
 * 
 * Usage:
 *   node qa/checker.js [--strict] [--category=<category>]
 * 
 * Exit codes:
 *   0 - GREEN (all checks passed)
 *   1 - RED (critical failures)
 *   2 - YELLOW (warnings present)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const strictMode = args.includes('--strict');
const categoryFilter = args.find(arg => arg.startsWith('--category='))?.split('=')[1];

// Colors for output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Load requirements
const requirements = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'requirements.json'), 'utf8')
);

// Results tracking
const results = {
  categories: {},
  overallStatus: 'green',
  totalChecks: 0,
  passedChecks: 0,
  failedChecks: 0,
  warningChecks: 0,
  startTime: new Date()
};

/**
 * Print colored output
 */
function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print section header
 */
function printHeader(title) {
  print('\n' + '='.repeat(70), 'bold');
  print(`  ${title}`, 'bold');
  print('='.repeat(70), 'bold');
}

/**
 * Print check result
 */
function printCheckResult(check, status, message = '') {
  const statusSymbol = {
    pass: '✓',
    fail: '✗',
    warning: '⚠',
    pending: '○'
  }[status];
  
  const statusColor = {
    pass: 'green',
    fail: 'red',
    warning: 'yellow',
    pending: 'blue'
  }[status];
  
  print(`  ${statusSymbol} ${check.id}: ${check.name}`, statusColor);
  if (message) {
    print(`    ${message}`, statusColor);
  }
}

/**
 * Check if file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(path.join(projectRoot, filePath));
  } catch (error) {
    return false;
  }
}

/**
 * Count files in directory matching pattern
 */
function countFiles(dirPath, pattern = null) {
  try {
    const fullPath = path.join(projectRoot, dirPath);
    if (!fs.existsSync(fullPath)) return 0;
    
    let count = 0;
    const files = fs.readdirSync(fullPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(fullPath, file.name);
      if (file.isDirectory()) {
        // Recursively count in subdirectories
        const relativePath = path.relative(projectRoot, filePath);
        count += countFiles(relativePath, pattern);
      } else if (file.isFile()) {
        if (!pattern) {
          count++;
        } else if (pattern instanceof RegExp) {
          if (pattern.test(file.name)) count++;
        } else if (file.name.endsWith(pattern)) {
          count++;
        }
      }
    }
    
    return count;
  } catch (error) {
    return 0;
  }
}

/**
 * Check if directories exist
 */
function checkDirectories(baseDir, expectedDirs) {
  try {
    const fullPath = path.join(projectRoot, baseDir);
    if (!fs.existsSync(fullPath)) return { missing: expectedDirs, found: [] };
    
    const existing = fs.readdirSync(fullPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    const missing = expectedDirs.filter(dir => !existing.includes(dir));
    const found = expectedDirs.filter(dir => existing.includes(dir));
    
    return { missing, found };
  } catch (error) {
    return { missing: expectedDirs, found: [] };
  }
}

/**
 * Check file imports
 */
function checkImports(filePath, expectedImports) {
  try {
    const content = fs.readFileSync(path.join(projectRoot, filePath), 'utf8');
    const missing = [];
    const found = [];
    
    for (const importItem of expectedImports) {
      if (content.includes(importItem)) {
        found.push(importItem);
      } else {
        missing.push(importItem);
      }
    }
    
    return { missing, found };
  } catch (error) {
    return { missing: expectedImports, found: [] };
  }
}

/**
 * Execute a single check
 */
function executeCheck(check, category) {
  results.totalChecks++;
  let status = 'pending';
  let message = '';
  
  try {
    switch (check.type) {
      case 'file_existence':
        if (fileExists(check.target)) {
          status = 'pass';
          message = `File exists: ${check.target}`;
        } else {
          status = check.required ? 'fail' : 'warning';
          message = `File not found: ${check.target}`;
        }
        break;
        
      case 'directory_existence':
        const dirCheck = checkDirectories(check.target_dir, check.expected_categories || []);
        if (dirCheck.missing.length === 0) {
          status = 'pass';
          message = `All ${dirCheck.found.length} directories found`;
        } else {
          status = check.required ? 'fail' : 'warning';
          message = `Missing directories: ${dirCheck.missing.join(', ')}`;
        }
        break;
        
      case 'component_existence':
      case 'hook_existence':
        const tsxCount = countFiles(check.target_dir, '.tsx');
        const tsCount = countFiles(check.target_dir, '.ts');
        const count = tsxCount + tsCount;
        if (count >= (check.expected_count || 1)) {
          status = 'pass';
          message = `Found ${count} items (expected ${check.expected_count || 'at least 1'})`;
        } else {
          status = check.required ? 'fail' : 'warning';
          message = `Found ${count} items, expected ${check.expected_count || 'at least 1'}`;
        }
        break;
        
      case 'build_validation':
        // Build check would require running the build
        status = 'warning';
        message = 'Manual build validation required';
        break;
        
      case 'env_validation':
        const envExists = fileExists('.env');
        if (envExists) {
          status = 'pass';
          message = 'Environment file exists';
        } else if (!strictMode && !check.required) {
          status = 'warning';
          message = 'Environment file missing (non-strict mode)';
        } else {
          status = 'fail';
          message = 'Environment file required';
        }
        break;
        
      default:
        status = 'warning';
        message = `Check type '${check.type}' not fully implemented`;
    }
  } catch (error) {
    status = 'fail';
    message = `Check failed with error: ${error.message}`;
  }
  
  // Update counters
  if (status === 'pass') results.passedChecks++;
  else if (status === 'fail') results.failedChecks++;
  else if (status === 'warning') results.warningChecks++;
  
  // Track in category
  if (!results.categories[category]) {
    results.categories[category] = {
      checks: [],
      passed: 0,
      failed: 0,
      warnings: 0
    };
  }
  
  results.categories[category].checks.push({
    ...check,
    status,
    message
  });
  
  if (status === 'pass') results.categories[category].passed++;
  else if (status === 'fail') results.categories[category].failed++;
  else if (status === 'warning') results.categories[category].warnings++;
  
  printCheckResult(check, status, message);
  
  return status;
}

/**
 * Execute checks for a category
 */
function executeCategory(categoryKey, categoryData) {
  printHeader(categoryData.category);
  print(`Severity: ${categoryData.severity}`, 'blue');
  
  for (const check of categoryData.checks) {
    executeCheck(check, categoryKey);
  }
}

/**
 * Print final summary
 */
function printSummary() {
  printHeader('QA Summary');
  
  const duration = ((new Date() - results.startTime) / 1000).toFixed(2);
  
  print(`\nTotal Checks: ${results.totalChecks}`, 'bold');
  print(`✓ Passed: ${results.passedChecks}`, 'green');
  print(`✗ Failed: ${results.failedChecks}`, 'red');
  print(`⚠ Warnings: ${results.warningChecks}`, 'yellow');
  print(`Duration: ${duration}s\n`, 'blue');
  
  // Determine overall status
  if (results.failedChecks > 0) {
    results.overallStatus = 'red';
    print('Overall Status: RED ✗', 'red');
    print('Critical failures detected. Fix required before deployment.', 'red');
  } else if (results.warningChecks > 0) {
    results.overallStatus = 'yellow';
    print('Overall Status: YELLOW ⚠', 'yellow');
    print('Warnings present. Review recommended.', 'yellow');
  } else {
    results.overallStatus = 'green';
    print('Overall Status: GREEN ✓', 'green');
    print('All checks passed. System ready.', 'green');
  }
  
  print('\n' + '='.repeat(70), 'bold');
}

/**
 * Main execution
 */
function main() {
  printHeader('Maturion Genesis Forge - QA Checker');
  print(`Mode: ${strictMode ? 'STRICT' : 'NORMAL'}`, 'blue');
  print(`Requirements Version: ${requirements.version}`, 'blue');
  
  if (categoryFilter) {
    print(`Filter: ${categoryFilter} category only`, 'blue');
  }
  
  // Execute all requirement categories
  for (const [categoryKey, categoryData] of Object.entries(requirements.requirements)) {
    if (categoryFilter && categoryKey !== categoryFilter) {
      continue;
    }
    
    executeCategory(categoryKey, categoryData);
  }
  
  // Print summary
  printSummary();
  
  // Exit with appropriate code
  if (results.overallStatus === 'red') {
    process.exit(1);
  } else if (results.overallStatus === 'yellow' && strictMode) {
    process.exit(1); // In strict mode, warnings are failures
  } else if (results.overallStatus === 'yellow') {
    process.exit(2);
  } else {
    process.exit(0);
  }
}

// Run the checker
main();
