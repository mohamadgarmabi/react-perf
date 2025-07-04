#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Bundle size analyzer and optimizer
 */
class BundleAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.distPath = path.join(this.projectRoot, 'dist');
    this.nodeModulesPath = path.join(this.projectRoot, 'node_modules');
  }

  /**
   * Get file size in human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Analyze bundle size
   */
  analyzeBundle() {
    console.log('📊 Analyzing bundle size...\n');

    if (!fs.existsSync(this.distPath)) {
      console.log('❌ Dist folder not found. Run build first.');
      return;
    }

    const files = this.getFilesRecursively(this.distPath);
    let totalSize = 0;
    const fileSizes = [];

    files.forEach(file => {
      const stats = fs.statSync(file);
      const relativePath = path.relative(this.distPath, file);
      const size = stats.size;
      totalSize += size;
      
      fileSizes.push({
        file: relativePath,
        size: size,
        formattedSize: this.formatBytes(size)
      });
    });

    // Sort by size (largest first)
    fileSizes.sort((a, b) => b.size - a.size);

    console.log('📁 Bundle Analysis Results:\n');
    fileSizes.forEach(({ file, formattedSize }) => {
      console.log(`  ${file}: ${formattedSize}`);
    });

    console.log(`\n📈 Total Bundle Size: ${this.formatBytes(totalSize)}`);
    
    // Provide optimization suggestions
    this.provideOptimizationSuggestions(fileSizes, totalSize);
  }

  /**
   * Get all files recursively from a directory
   */
  getFilesRecursively(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Provide optimization suggestions
   */
  provideOptimizationSuggestions(fileSizes, totalSize) {
    console.log('\n💡 Optimization Suggestions:\n');

    const largeFiles = fileSizes.filter(f => f.size > 100 * 1024); // Files larger than 100KB
    
    if (largeFiles.length > 0) {
      console.log('🔍 Large files detected:');
      largeFiles.forEach(({ file, formattedSize }) => {
        console.log(`  - ${file} (${formattedSize})`);
      });
      console.log('\n  Consider:');
      console.log('  • Code splitting');
      console.log('  • Tree shaking');
      console.log('  • Lazy loading');
    }

    if (totalSize > 1024 * 1024) { // Larger than 1MB
      console.log('⚠️  Bundle is quite large (>1MB)');
      console.log('  Consider:');
      console.log('  • Minification');
      console.log('  • Compression (gzip/brotli)');
      console.log('  • Removing unused dependencies');
    }

    // Check for duplicate dependencies
    this.checkDuplicateDependencies();
  }

  /**
   * Check for duplicate dependencies
   */
  checkDuplicateDependencies() {
    console.log('\n🔍 Checking for duplicate dependencies...');
    
    try {
      const packageLockPath = path.join(this.projectRoot, 'package-lock.json');
      const pnpmLockPath = path.join(this.projectRoot, 'pnpm-lock.yaml');
      
      if (fs.existsSync(pnpmLockPath)) {
        console.log('  Using pnpm - good for deduplication!');
      } else if (fs.existsSync(packageLockPath)) {
        console.log('  Using npm - consider pnpm for better deduplication');
      }
    } catch (error) {
      console.log('  Could not check lock files');
    }
  }

  /**
   * Generate optimization report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      bundleAnalysis: this.analyzeBundle(),
      recommendations: [
        'Use webpack bundle analyzer for detailed analysis',
        'Enable tree shaking in webpack config',
        'Use dynamic imports for code splitting',
        'Minify and compress production builds',
        'Remove unused dependencies',
        'Consider using pnpm for better deduplication'
      ]
    };

    const reportPath = path.join(this.projectRoot, 'bundle-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }
}

// Run analysis
const analyzer = new BundleAnalyzer();
analyzer.analyzeBundle();
analyzer.generateReport(); 