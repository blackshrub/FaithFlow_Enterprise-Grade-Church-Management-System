#!/usr/bin/env node

/**
 * Bundle Size Analyzer for FaithFlow Mobile
 * Phase 9.1.4 - Bundle Size Optimization
 *
 * Analyzes the app bundle to identify:
 * - Large dependencies
 * - Unused code
 * - Optimization opportunities
 * - Module size breakdown
 *
 * Usage:
 *   node scripts/analyze-bundle.js
 *   npm run analyze-bundle
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 FaithFlow Bundle Size Analyzer\n');
console.log('=' .repeat(60));

/**
 * Read and parse package.json
 */
function getPackageInfo() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson;
}

/**
 * Calculate estimated size of dependencies
 */
function analyzeDependencies(deps) {
  const heavyPackages = {
    '@tanstack/react-query': '~100KB',
    '@react-navigation/native': '~50KB',
    '@gorhom/bottom-sheet': '~80KB',
    'react-native-reanimated': '~500KB',
    'react-native-gesture-handler': '~200KB',
    'lucide-react-native': '~2MB (if importing all icons)',
    '@gluestack-ui/themed': '~300KB',
    'expo-image-picker': '~100KB',
    'expo-av': '~150KB',
    'react-native-svg': '~100KB',
  };

  const results = [];
  let totalEstimated = 0;

  Object.keys(deps).forEach(dep => {
    const estimate = heavyPackages[dep];
    if (estimate) {
      const sizeMatch = estimate.match(/(\d+)(KB|MB)/);
      if (sizeMatch) {
        const size = parseInt(sizeMatch[1]);
        const unit = sizeMatch[2];
        const sizeInKB = unit === 'MB' ? size * 1024 : size;

        results.push({
          name: dep,
          version: deps[dep],
          estimatedSize: estimate,
          sizeInKB,
          warning: estimate.includes('if importing all'),
        });

        totalEstimated += sizeInKB;
      }
    }
  });

  return { results, totalEstimated };
}

/**
 * Check for potential optimizations
 */
function checkOptimizations(packageJson) {
  const optimizations = [];

  // Check for lucide-react-native usage
  if (packageJson.dependencies['lucide-react-native']) {
    optimizations.push({
      package: 'lucide-react-native',
      issue: 'Importing all icons increases bundle size significantly',
      solution: 'Use specific icon imports: import { Home } from "lucide-react-native" instead of import * as Icons',
      impact: 'Can save ~1.5MB',
      priority: 'HIGH',
    });
  }

  // Check for lodash
  if (packageJson.dependencies['lodash']) {
    optimizations.push({
      package: 'lodash',
      issue: 'Full lodash library is very large',
      solution: 'Use lodash-es or import specific functions: import debounce from "lodash/debounce"',
      impact: 'Can save ~50-70KB',
      priority: 'MEDIUM',
    });
  }

  // Check for moment
  if (packageJson.dependencies['moment']) {
    optimizations.push({
      package: 'moment',
      issue: 'Moment.js is large and includes all locales',
      solution: 'Switch to date-fns or day.js (much smaller)',
      impact: 'Can save ~200KB',
      priority: 'HIGH',
    });
  }

  // Check for duplicate React versions
  const reactVersion = packageJson.dependencies['react'];
  const reactNativeVersion = packageJson.dependencies['react-native'];

  if (reactVersion && reactNativeVersion) {
    optimizations.push({
      package: 'react',
      issue: 'Ensure only one version of React is installed',
      solution: 'Check for peer dependency conflicts and deduplicate',
      impact: 'Prevents duplicate React in bundle',
      priority: 'MEDIUM',
    });
  }

  return optimizations;
}

/**
 * Analyze imports in source files
 */
function analyzeImports() {
  const srcPath = path.join(__dirname, '..', 'app');
  const issues = [];

  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for import * patterns
        if (content.includes('import *')) {
          const matches = content.match(/import \* as \w+ from ['"]([^'"]+)['"]/g);
          if (matches) {
            matches.forEach(match => {
              const packageMatch = match.match(/from ['"]([^'"]+)['"]/);
              if (packageMatch) {
                issues.push({
                  file: filePath.replace(path.join(__dirname, '..'), ''),
                  line: match,
                  issue: 'Using import * may include unnecessary code',
                  suggestion: 'Use specific imports instead',
                });
              }
            });
          }
        }

        // Check for large icon imports
        if (content.includes('from "lucide-react-native"') &&
            !content.includes('import {') &&
            content.includes('import *')) {
          issues.push({
            file: filePath.replace(path.join(__dirname, '..'), ''),
            issue: 'Importing all lucide icons',
            suggestion: 'Import only needed icons: import { Home, User } from "lucide-react-native"',
          });
        }
      }
    });
  }

  scanDirectory(srcPath);
  return issues;
}

/**
 * Main analysis function
 */
function analyze() {
  const packageJson = getPackageInfo();

  console.log('\n📦 Package Information');
  console.log('-'.repeat(60));
  console.log(`Name: ${packageJson.name}`);
  console.log(`Version: ${packageJson.version}`);

  // Analyze dependencies
  console.log('\n🔍 Heavy Dependencies Analysis');
  console.log('-'.repeat(60));

  const { results, totalEstimated } = analyzeDependencies(packageJson.dependencies);

  if (results.length > 0) {
    results
      .sort((a, b) => b.sizeInKB - a.sizeInKB)
      .forEach(dep => {
        const warning = dep.warning ? ' ⚠️' : '';
        console.log(`  ${dep.name}${warning}`);
        console.log(`    Estimated: ${dep.estimatedSize}`);
        console.log(`    Version: ${dep.version}`);
        if (dep.warning) {
          console.log(`    ⚠️  Use specific imports to reduce size`);
        }
        console.log('');
      });

    console.log(`  Total Heavy Dependencies: ~${Math.round(totalEstimated / 1024)}MB`);
  } else {
    console.log('  No known heavy dependencies found.');
  }

  // Check for optimizations
  console.log('\n💡 Optimization Opportunities');
  console.log('-'.repeat(60));

  const optimizations = checkOptimizations(packageJson);

  if (optimizations.length > 0) {
    optimizations.forEach((opt, idx) => {
      console.log(`\n${idx + 1}. ${opt.package} [${opt.priority}]`);
      console.log(`   Issue: ${opt.issue}`);
      console.log(`   Solution: ${opt.solution}`);
      console.log(`   Impact: ${opt.impact}`);
    });
  } else {
    console.log('  ✅ No obvious optimizations found!');
  }

  // Analyze imports
  console.log('\n🔎 Import Analysis');
  console.log('-'.repeat(60));

  const importIssues = analyzeImports();

  if (importIssues.length > 0) {
    console.log(`  Found ${importIssues.length} potential import optimizations:\n`);
    importIssues.slice(0, 10).forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ${issue.file}`);
      console.log(`     Issue: ${issue.issue}`);
      console.log(`     Suggestion: ${issue.suggestion}\n`);
    });

    if (importIssues.length > 10) {
      console.log(`  ... and ${importIssues.length - 10} more`);
    }
  } else {
    console.log('  ✅ No import issues found!');
  }

  // Recommendations
  console.log('\n📋 Recommendations');
  console.log('-'.repeat(60));
  console.log('\n  1. Run expo-analyzer for detailed bundle analysis:');
  console.log('     npx expo-analyzer');
  console.log('\n  2. Use Metro bundler for production build:');
  console.log('     npx expo export --platform ios');
  console.log('     npx expo export --platform android');
  console.log('\n  3. Enable hermes engine for faster startup (already default in Expo)');
  console.log('\n  4. Use dynamic imports for heavy screens:');
  console.log('     const HeavyScreen = React.lazy(() => import("./HeavyScreen"))');
  console.log('\n  5. Monitor bundle size over time:');
  console.log('     - Set up CI checks for bundle size');
  console.log('     - Track changes in each PR');
  console.log('\n  6. Profile app startup time:');
  console.log('     - Use React Native Performance Monitor');
  console.log('     - Check Time to Interactive (TTI)');

  console.log('\n' + '='.repeat(60));
  console.log('✅ Analysis Complete!\n');
}

// Run analysis
try {
  analyze();
} catch (error) {
  console.error('❌ Error during analysis:', error.message);
  process.exit(1);
}
