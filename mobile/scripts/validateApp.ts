#!/usr/bin/env npx ts-node
/**
 * FaithFlow Mobile App - Automated Validation Script
 *
 * Runs comprehensive checks on the codebase to ensure quality.
 * Usage: npx ts-node scripts/validateApp.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ValidationResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string[];
}

const results: ValidationResult[] = [];

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

function runCommand(command: string, silent = false): string {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
  } catch (error: any) {
    return error.stdout || error.message || '';
  }
}

// ============================================
// CHECK 1: TypeScript Compilation
// ============================================
function checkTypeScript(): ValidationResult {
  log('🔍', 'Checking TypeScript compilation...');
  try {
    const output = execSync('npx tsc --noEmit 2>&1', {
      encoding: 'utf-8',
      cwd: path.resolve(__dirname, '..')
    });
    return {
      name: 'TypeScript Compilation',
      status: 'pass',
      message: 'No TypeScript errors'
    };
  } catch (error: any) {
    const errors = error.stdout?.split('\n').filter((l: string) => l.includes('error')) || [];
    return {
      name: 'TypeScript Compilation',
      status: 'fail',
      message: `${errors.length} TypeScript errors found`,
      details: errors.slice(0, 10)
    };
  }
}

// ============================================
// CHECK 2: Circular Dependencies
// ============================================
function checkCircularDeps(): ValidationResult {
  log('🔍', 'Checking for circular dependencies...');
  try {
    const output = execSync('npx madge --circular --extensions ts,tsx . 2>&1', {
      encoding: 'utf-8',
      cwd: path.resolve(__dirname, '..')
    });
    if (output.includes('No circular dependency found')) {
      return {
        name: 'Circular Dependencies',
        status: 'pass',
        message: 'No circular dependencies'
      };
    }
    return {
      name: 'Circular Dependencies',
      status: 'fail',
      message: 'Circular dependencies detected',
      details: output.split('\n').slice(0, 10)
    };
  } catch (error: any) {
    return {
      name: 'Circular Dependencies',
      status: 'warn',
      message: 'Could not check circular dependencies'
    };
  }
}

// ============================================
// CHECK 3: Security - No Secrets in Code
// ============================================
function checkNoSecrets(): ValidationResult {
  log('🔍', 'Checking for exposed secrets...');
  const patterns = [
    /sk-[a-zA-Z0-9]{20,}/g,  // API keys
    /password\s*=\s*["'][^"']+["']/gi,
    /secret\s*=\s*["'][^"']+["']/gi,
    /ANTHROPIC_API_KEY\s*=\s*["'][^"']+["']/g,
  ];

  const issues: string[] = [];
  const checkDirs = ['app', 'components', 'hooks', 'services', 'stores'];

  for (const dir of checkDirs) {
    const dirPath = path.resolve(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = getAllFiles(dirPath, ['.ts', '.tsx']);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          issues.push(`Potential secret in: ${path.relative(dirPath, file)}`);
        }
      }
    }
  }

  if (issues.length === 0) {
    return {
      name: 'Security - No Secrets',
      status: 'pass',
      message: 'No hardcoded secrets detected'
    };
  }

  return {
    name: 'Security - No Secrets',
    status: 'fail',
    message: `${issues.length} potential secrets found`,
    details: issues
  };
}

// ============================================
// CHECK 4: Route Protection
// ============================================
function checkRouteProtection(): ValidationResult {
  log('🔍', 'Checking route protection...');
  const protectedPaths = [
    'app/prayer/new.tsx',
    'app/(tabs)/give.tsx',
    'app/groups/new.tsx',
    'app/requests/baptism.tsx',
    'app/requests/accept-jesus.tsx',
    'app/requests/holy-matrimony.tsx',
    'app/requests/child-dedication.tsx',
    'app/settings/privacy.tsx',
  ];

  const unprotected: string[] = [];

  for (const filePath of protectedPaths) {
    const fullPath = path.resolve(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf-8');
    if (!content.includes('useRequireAuth')) {
      unprotected.push(filePath);
    }
  }

  if (unprotected.length === 0) {
    return {
      name: 'Route Protection',
      status: 'pass',
      message: 'All sensitive routes are protected'
    };
  }

  return {
    name: 'Route Protection',
    status: 'fail',
    message: `${unprotected.length} routes missing protection`,
    details: unprotected
  };
}

// ============================================
// CHECK 5: Multi-Tenant Query Keys
// ============================================
function checkQueryKeys(): ValidationResult {
  log('🔍', 'Checking multi-tenant query keys...');
  const hooksDir = path.resolve(__dirname, '..', 'hooks');
  const issues: string[] = [];

  if (!fs.existsSync(hooksDir)) {
    return {
      name: 'Multi-Tenant Query Keys',
      status: 'warn',
      message: 'Hooks directory not found'
    };
  }

  const files = getAllFiles(hooksDir, ['.ts', '.tsx']);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const fileName = path.basename(file);

    // Check for queryKey without churchId
    const queryKeyMatches = content.match(/queryKey:\s*\[([^\]]+)\]/g) || [];
    for (const match of queryKeyMatches) {
      // Skip if it already has churchId
      if (match.includes('churchId') || match.includes('church_id')) continue;
      // Skip if it's a static key (like ['settings'])
      if (!match.includes(',')) continue;

      // Check if this is a church-specific query
      if (content.includes('church') && !match.includes('church')) {
        issues.push(`${fileName}: Query key may need churchId: ${match.slice(0, 50)}...`);
      }
    }
  }

  if (issues.length === 0) {
    return {
      name: 'Multi-Tenant Query Keys',
      status: 'pass',
      message: 'Query keys appear properly scoped'
    };
  }

  return {
    name: 'Multi-Tenant Query Keys',
    status: 'warn',
    message: `${issues.length} query keys may need churchId`,
    details: issues.slice(0, 10)
  };
}

// ============================================
// CHECK 6: i18n Coverage
// ============================================
function checkI18nCoverage(): ValidationResult {
  log('🔍', 'Checking i18n coverage...');
  const appDir = path.resolve(__dirname, '..', 'app');
  const issues: string[] = [];

  const files = getAllFiles(appDir, ['.tsx']);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const fileName = path.relative(appDir, file);

    // Skip if it's just a redirect
    if (content.includes('<Redirect') && !content.includes('Text>')) continue;

    // Check for hardcoded English strings in UI
    const hardcodedStrings = content.match(/<Text[^>]*>[\s\n]*[A-Z][a-z]+/g) || [];

    // If has UI text but no useTranslation
    if (hardcodedStrings.length > 3 && !content.includes('useTranslation')) {
      issues.push(`${fileName}: Has ${hardcodedStrings.length} potential hardcoded strings`);
    }
  }

  if (issues.length === 0) {
    return {
      name: 'i18n Coverage',
      status: 'pass',
      message: 'Good i18n coverage'
    };
  }

  return {
    name: 'i18n Coverage',
    status: 'warn',
    message: `${issues.length} files may need i18n`,
    details: issues.slice(0, 10)
  };
}

// ============================================
// CHECK 7: Accessibility
// ============================================
function checkAccessibility(): ValidationResult {
  log('🔍', 'Checking accessibility...');
  const dirs = ['app', 'components'];
  const issues: string[] = [];

  for (const dir of dirs) {
    const dirPath = path.resolve(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = getAllFiles(dirPath, ['.tsx']);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const fileName = path.relative(dirPath, file);

      // Count Pressable without accessibility
      const pressableCount = (content.match(/<Pressable/g) || []).length;
      const accessibleCount = (content.match(/accessibilityLabel/g) || []).length;

      if (pressableCount > 3 && accessibleCount === 0) {
        issues.push(`${fileName}: ${pressableCount} Pressable components without accessibility`);
      }
    }
  }

  if (issues.length === 0) {
    return {
      name: 'Accessibility',
      status: 'pass',
      message: 'Good accessibility coverage'
    };
  }

  return {
    name: 'Accessibility',
    status: 'warn',
    message: `${issues.length} files need accessibility labels`,
    details: issues.slice(0, 10)
  };
}

// ============================================
// CHECK 8: Bundle Export
// ============================================
function checkBundleExport(): ValidationResult {
  log('🔍', 'Testing bundle export (this may take a minute)...');
  try {
    execSync('rm -rf /tmp/validate-bundle && npx expo export --platform android --output-dir /tmp/validate-bundle 2>&1', {
      encoding: 'utf-8',
      cwd: path.resolve(__dirname, '..'),
      timeout: 300000
    });

    // Check if bundle was created
    if (fs.existsSync('/tmp/validate-bundle/_expo/static/js/android')) {
      return {
        name: 'Bundle Export',
        status: 'pass',
        message: 'Android bundle exported successfully'
      };
    }

    return {
      name: 'Bundle Export',
      status: 'fail',
      message: 'Bundle not created'
    };
  } catch (error: any) {
    return {
      name: 'Bundle Export',
      status: 'fail',
      message: 'Bundle export failed',
      details: [error.message?.slice(0, 200) || 'Unknown error']
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        FaithFlow Mobile App - Validation Report            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // Run all checks
  results.push(checkTypeScript());
  results.push(checkCircularDeps());
  results.push(checkNoSecrets());
  results.push(checkRouteProtection());
  results.push(checkQueryKeys());
  results.push(checkI18nCoverage());
  results.push(checkAccessibility());
  results.push(checkBundleExport());

  // Print results
  console.log('\n┌──────────────────────────────────────────────────────────┐');
  console.log('│                    VALIDATION RESULTS                     │');
  console.log('└──────────────────────────────────────────────────────────┘\n');

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.name}: ${result.message}`);

    if (result.details && result.details.length > 0) {
      for (const detail of result.details) {
        console.log(`   └─ ${detail}`);
      }
    }

    if (result.status === 'pass') passCount++;
    else if (result.status === 'fail') failCount++;
    else warnCount++;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n┌──────────────────────────────────────────────────────────┐');
  console.log('│                        SUMMARY                            │');
  console.log('└──────────────────────────────────────────────────────────┘');
  console.log(`\n   ✅ Passed: ${passCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   ⚠️  Warnings: ${warnCount}`);
  console.log(`   ⏱️  Duration: ${duration}s`);

  if (failCount === 0) {
    console.log('\n🎉 All critical checks passed!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some checks failed. Please review and fix.\n');
    process.exit(1);
  }
}

main().catch(console.error);
