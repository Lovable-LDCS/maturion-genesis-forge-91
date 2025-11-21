#!/usr/bin/env node

/**
 * Legacy Component Scanner
 * 
 * Scans for components that may be legacy or unused based on:
 * 1. No imports found in the codebase
 * 2. Not mentioned in ARCHITECTURE.md
 * 3. Located in test/diagnostics directories but not used
 * 
 * Implements the "Two Strike Rule":
 * - First detection: WARNING
 * - Second consecutive detection: MARK FOR DELETION
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
 * Load legacy tracking file
 */
function loadLegacyTracking() {
  const trackingFile = path.join(__dirname, 'legacy-tracking.json');
  if (fs.existsSync(trackingFile)) {
    return JSON.parse(fs.readFileSync(trackingFile, 'utf8'));
  }
  return { detected: {}, marked_for_deletion: [] };
}

/**
 * Save legacy tracking file
 */
function saveLegacyTracking(data) {
  const trackingFile = path.join(__dirname, 'legacy-tracking.json');
  fs.writeFileSync(trackingFile, JSON.stringify(data, null, 2));
}

/**
 * Get all source files
 */
function getFiles(dir, extensions = ['.ts', '.tsx']) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...getFiles(fullPath, extensions));
    } else if (item.isFile()) {
      if (extensions.some(ext => item.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Check if file is imported
 */
function isImported(targetFile, allFiles) {
  const fileName = path.basename(targetFile, path.extname(targetFile));
  
  for (const file of allFiles) {
    if (file === targetFile) continue;
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes(fileName)) {
        return true;
      }
    } catch (error) {
      // Skip
    }
  }
  
  return false;
}

/**
 * Check if mentioned in ARCHITECTURE.md
 */
function isInArchitecture(fileName) {
  const archFile = path.join(projectRoot, 'ARCHITECTURE.md');
  if (!fs.existsSync(archFile)) return false;
  
  try {
    const content = fs.readFileSync(archFile, 'utf8');
    return content.includes(fileName);
  } catch (error) {
    return false;
  }
}

/**
 * Scan for legacy components
 */
function scanForLegacy() {
  print('\n' + '='.repeat(70), 'bold');
  print('  Legacy Component Scanner', 'bold');
  print('='.repeat(70), 'bold');
  
  const tracking = loadLegacyTracking();
  const allFiles = getFiles(path.join(projectRoot, 'src'));
  const componentsToCheck = getFiles(path.join(projectRoot, 'src/components'));
  
  const currentDetection = [];
  const newlyDetected = [];
  const stillDetected = [];
  const resolved = [];
  
  print(`\nScanning ${componentsToCheck.length} components...`, 'blue');
  
  for (const file of componentsToCheck) {
    const relativePath = path.relative(projectRoot, file);
    const fileName = path.basename(file, path.extname(file));
    
    const imported = isImported(file, allFiles);
    const inArch = isInArchitecture(fileName);
    
    // Skip test and diagnostic components unless truly orphaned
    const isTestComponent = relativePath.includes('/test/') || relativePath.includes('/diagnostics/');
    
    if (!imported && !inArch) {
      currentDetection.push(relativePath);
      
      if (tracking.detected[relativePath]) {
        // Second detection - mark for deletion
        stillDetected.push(relativePath);
        if (!tracking.marked_for_deletion.includes(relativePath)) {
          tracking.marked_for_deletion.push(relativePath);
        }
      } else {
        // First detection - warning
        newlyDetected.push(relativePath);
        tracking.detected[relativePath] = {
          first_detected: new Date().toISOString(),
          is_test_component: isTestComponent
        };
      }
    } else if (tracking.detected[relativePath]) {
      // Was detected before but now resolved
      resolved.push(relativePath);
      delete tracking.detected[relativePath];
      const idx = tracking.marked_for_deletion.indexOf(relativePath);
      if (idx > -1) {
        tracking.marked_for_deletion.splice(idx, 1);
      }
    }
  }
  
  // Report results
  print('\n--- Results ---\n', 'bold');
  
  if (resolved.length > 0) {
    print(`✓ Resolved (${resolved.length}):`, 'green');
    resolved.forEach(f => print(`  - ${f}`, 'green'));
    print('');
  }
  
  if (newlyDetected.length > 0) {
    print(`⚠ Newly Detected (${newlyDetected.length}):`, 'yellow');
    print('  First detection - will mark for deletion if still present in next scan', 'yellow');
    newlyDetected.forEach(f => print(`  - ${f}`, 'yellow'));
    print('');
  }
  
  if (stillDetected.length > 0) {
    print(`✗ Marked for Deletion (${stillDetected.length}):`, 'red');
    print('  Second consecutive detection - recommend deletion', 'red');
    stillDetected.forEach(f => print(`  - ${f}`, 'red'));
    print('');
  }
  
  // Summary
  print('='.repeat(70), 'bold');
  print('Summary:', 'bold');
  print(`  Total components scanned: ${componentsToCheck.length}`, 'blue');
  print(`  Currently tracked: ${Object.keys(tracking.detected).length}`, 'yellow');
  print(`  Marked for deletion: ${tracking.marked_for_deletion.length}`, tracking.marked_for_deletion.length > 0 ? 'red' : 'green');
  print(`  Resolved this scan: ${resolved.length}`, 'green');
  
  // Save tracking
  saveLegacyTracking(tracking);
  
  print('\nTracking saved to qa/legacy-tracking.json', 'blue');
  print('='.repeat(70), 'bold');
  
  // Exit code
  if (stillDetected.length > 0) {
    print('\n⚠ WARNING: Components marked for deletion found!', 'red');
    process.exit(1);
  } else if (newlyDetected.length > 0) {
    print('\n⚠ New potentially legacy components detected.', 'yellow');
    process.exit(2);
  } else {
    print('\n✓ No legacy components detected.', 'green');
    process.exit(0);
  }
}

scanForLegacy();
