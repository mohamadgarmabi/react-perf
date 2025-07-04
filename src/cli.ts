#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'

// Lazy load modules for better performance
let PerformanceAnalyzer: any, PerformanceReporter: any
let BulkPerfChecker: any, QuickPerfChecker: any, SimplePerformanceChecker: any

const loadModules = async () => {
  if (!PerformanceAnalyzer) {
    const perfModule = await import('./performance-analyzer')
    PerformanceAnalyzer = perfModule.PerformanceAnalyzer
    PerformanceReporter = perfModule.PerformanceReporter
  }
  if (!BulkPerfChecker) {
    const bulkModule = await import('./bulk-perf-check')
    BulkPerfChecker = bulkModule.BulkPerfChecker
  }
  if (!QuickPerfChecker) {
    const quickModule = await import('./quick-perf-check')
    QuickPerfChecker = quickModule.QuickPerfChecker
  }
  if (!SimplePerformanceChecker) {
    const simpleModule = await import('./simple-perf-check')
    SimplePerformanceChecker = simpleModule.SimplePerformanceChecker
  }
}

const program = new Command()

program
  .name('react-perf')
  .description('🔍 A comprehensive React performance analysis tool')
  .version('1.0.0')
  .usage('[command] [options]')
  .addHelpText('after', `
Examples:
  $ react-perf analyze src/App.tsx
  $ react-perf quick src/components/Button.tsx --verbose
  $ react-perf bulk src/ --extensions .ts,.tsx --output report.json
  $ react-perf simple src/App.tsx --fix-suggestions
  $ react-perf interactive

For more information, visit: https://github.com/mohamadgarmabi/react-perf
  `)

// Global options
program
  .option('-v, --verbose', 'Enable verbose output')
  .option('--no-color', 'Disable colored output')
  .option('-o, --output <file>', 'Save results to file (JSON format)')
  .option('--fix-suggestions', 'Show automatic fix suggestions')

// Main analyze command
program
  .command('analyze <file>')
  .alias('a')
  .description('🔍 Analyze a single file for performance issues')
  .option('-d, --detailed', 'Show detailed analysis with line-by-line breakdown')
  .option('-s, --severity <level>', 'Filter by severity level (high|medium|low)', 'all')
  .option('--ignore-patterns <patterns>', 'Ignore specific patterns (comma-separated)')
  .action(async (file: string, options: any) => {
    try {
      if (!options.color) {
        chalk.level = 0
      }
      
      console.log(chalk.blue('🔍 React Performance Analyzer'))
      console.log(chalk.gray('Analyzing file for performance issues...\n'))
      
      await loadModules()
      const analyzer = new PerformanceAnalyzer()
      const reporter = new PerformanceReporter()
      
      const analysis = analyzer.analyzeFile(file)
      
      if (options.verbose) {
        console.log(chalk.cyan('📋 Analysis Details:'))
        console.log(`   File: ${analysis.filePath}`)
        console.log(`   Total Lines: ${analysis.issues.length}`)
        console.log(`   Issues Found: ${analysis.summary.totalIssues}`)
      }
      
      reporter.printAnalysis(analysis)
      
      if (options.output) {
        const fs = require('fs')
        fs.writeFileSync(options.output, JSON.stringify(analysis, null, 2))
        console.log(chalk.green(`\n💾 Results saved to: ${options.output}`))
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// Quick check command
program
  .command('quick <file>')
  .alias('q')
  .description('⚡ Quick performance check of a single file')
  .option('-f, --fast', 'Skip detailed analysis for faster results')
  .option('--only-critical', 'Show only critical issues')
  .action(async (file: string, options: any) => {
    try {
      if (!options.color) {
        chalk.level = 0
      }
      
      console.log(chalk.blue('⚡ Quick Performance Check'))
      console.log(chalk.gray('Fast analysis of common performance issues...\n'))
      
      await loadModules()
      const checker = new QuickPerfChecker()
      checker.checkFile(file)
      
      if (options.verbose) {
        console.log(chalk.cyan('\n📊 Quick Analysis Summary:'))
        console.log('   - Memory leak detection')
        console.log('   - Performance pattern analysis')
        console.log('   - React-specific optimizations')
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// Simple check command
program
  .command('simple <file>')
  .alias('s')
  .description('📝 Simple performance check with basic analysis')
  .option('--basic-only', 'Show only basic issues (no React-specific)')
  .option('--format <format>', 'Output format (text|json|table)', 'text')
  .action(async (file: string, options: any) => {
    try {
      if (!options.color) {
        chalk.level = 0
      }
      
      console.log(chalk.blue('📝 Simple Performance Check'))
      console.log(chalk.gray('Basic analysis of performance issues...\n'))
      
      await loadModules()
      const checker = new SimplePerformanceChecker()
      checker.checkFile(file)
      
      if (options.verbose) {
        console.log(chalk.cyan('\n📋 Simple Check Features:'))
        console.log('   - Array operation analysis')
        console.log('   - Memory leak detection')
        console.log('   - React component optimization')
        console.log('   - Code quality suggestions')
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// Bulk check command
program
  .command('bulk <directory>')
  .alias('b')
  .description('📁 Analyze entire directory for performance issues')
  .option('-e, --extensions <extensions>', 'File extensions to check (comma-separated)', '.ts,.tsx,.js,.jsx')
  .option('--exclude <patterns>', 'Exclude files/directories (comma-separated)', 'node_modules,.git,dist,build')
  .option('--max-files <number>', 'Maximum number of files to analyze', '1000')
  .option('--parallel <number>', 'Number of parallel processes', '4')
  .option('--summary-only', 'Show only summary, not individual file details')
  .action(async (directory: string, options: any) => {
    try {
      if (!options.color) {
        chalk.level = 0
      }
      
      console.log(chalk.blue('📁 Bulk Performance Check'))
      console.log(chalk.gray('Scanning entire directory for performance issues...\n'))
      
      if (options.verbose) {
        console.log(chalk.cyan('🔧 Configuration:'))
        console.log(`   Directory: ${directory}`)
        console.log(`   Extensions: ${options.extensions}`)
        console.log(`   Exclude: ${options.exclude}`)
        console.log(`   Max Files: ${options.maxFiles}`)
        console.log(`   Parallel: ${options.parallel}`)
      }
      
      const extensions = options.extensions.split(',').map((ext: string) => ext.trim())
      const excludePatterns = options.exclude.split(',').map((pattern: string) => pattern.trim())
      
      await loadModules()
      const checker = new BulkPerfChecker()
      checker.checkDirectory(directory, extensions)
      
      if (options.output) {
        const fs = require('fs')
        const results = {
          directory,
          timestamp: new Date().toISOString(),
          configuration: {
            extensions,
            excludePatterns,
            maxFiles: options.maxFiles,
            parallel: options.parallel
          }
        }
        fs.writeFileSync(options.output, JSON.stringify(results, null, 2))
        console.log(chalk.green(`\n💾 Results saved to: ${options.output}`))
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('🎯 Interactive mode for analyzing files')
  .option('--guided', 'Show guided tour for first-time users')
  .action(async (options: any) => {
    try {
      if (!options.color) {
        chalk.level = 0
      }
      
      console.log(chalk.blue('🎯 Interactive React Performance Checker'))
      console.log(chalk.gray('Choose your analysis mode...\n'))
      
      if (options.guided) {
        console.log(chalk.yellow('🎓 Guided Tour:'))
        console.log('   This tool helps you find performance issues in your React code.')
        console.log('   Choose the analysis mode that best fits your needs:\n')
      }
      
      const readline = require('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })

      const question = (query: string): Promise<string> => {
        return new Promise((resolve) => {
          rl.question(query, resolve)
        })
      }

      console.log(chalk.yellow('📋 Available modes:'))
      console.log('1. 🔍 Full Analysis (detailed report with scoring)')
      console.log('2. ⚡ Quick Check (fast analysis of common issues)')
      console.log('3. 📝 Simple Check (basic analysis for beginners)')
      console.log('4. 📁 Bulk Check (entire directory analysis)')
      console.log('5. 🚀 Auto-fix (suggest automatic fixes)')
      
      const mode = await question('\n🎯 Select mode (1-5): ')
      const filePath = await question('📁 Enter file/directory path: ')
      
      const saveResults = await question('💾 Save results to file? (y/N): ')
      const outputFile = saveResults.toLowerCase() === 'y' ? await question('📄 Output file name: ') : null
      
      rl.close()

      if (!filePath) {
        console.log(chalk.red('❌ No path provided'))
        return
      }

      await loadModules()
      
      switch (mode) {
        case '1':
          const analyzer = new PerformanceAnalyzer()
          const reporter = new PerformanceReporter()
          const analysis = analyzer.analyzeFile(filePath)
          reporter.printAnalysis(analysis)
          if (outputFile) {
            const fs = require('fs')
            fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2))
            console.log(chalk.green(`\n💾 Results saved to: ${outputFile}`))
          }
          break
        case '2':
          const quickChecker = new QuickPerfChecker()
          quickChecker.checkFile(filePath)
          break
        case '3':
          const simpleChecker = new SimplePerformanceChecker()
          simpleChecker.checkFile(filePath)
          break
        case '4':
          const bulkChecker = new BulkPerfChecker()
          bulkChecker.checkDirectory(filePath)
          break
        case '5':
          console.log(chalk.blue('🚀 Auto-fix Mode'))
          console.log(chalk.gray('This feature is coming soon!'))
          console.log(chalk.yellow('For now, use the analysis modes to get suggestions.'))
          break
        default:
          console.log(chalk.red('❌ Invalid mode selected'))
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// New command: Auto-fix suggestions
program
  .command('fix <file>')
  .alias('f')
  .description('🔧 Show automatic fix suggestions for a file')
  .option('--apply', 'Apply fixes automatically (experimental)')
  .option('--backup', 'Create backup before applying fixes')
  .action(async (file: string, options: any) => {
    try {
      if (!options.color) {
        chalk.level = 0
      }
      
      console.log(chalk.blue('🔧 Auto-fix Suggestions'))
      console.log(chalk.gray('Analyzing file for fixable issues...\n'))
      
      const analyzer = new PerformanceAnalyzer()
      const analysis = analyzer.analyzeFile(file)
      
      console.log(chalk.yellow('🔧 Fixable Issues Found:'))
      let fixableCount = 0
      
      analysis.issues.forEach((issue: any, index: number) => {
        if (issue.severity === 'high' || issue.severity === 'medium') {
          fixableCount++
          console.log(`\n${index + 1}. Line ${issue.line}: ${issue.message}`)
          console.log(`   💡 Fix: ${issue.suggestion}`)
          
          if (options.apply) {
            console.log(chalk.green('   ✅ Would apply fix automatically'))
          }
        }
      })
      
      if (fixableCount === 0) {
        console.log(chalk.green('✅ No automatically fixable issues found'))
      } else {
        console.log(chalk.cyan(`\n📊 Found ${fixableCount} fixable issues`))
        if (!options.apply) {
          console.log(chalk.yellow('💡 Use --apply flag to automatically apply fixes'))
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// New command: Project health check
program
  .command('health <directory>')
  .alias('h')
  .description('🏥 Overall project health assessment')
  .option('--score-threshold <number>', 'Minimum score to pass (0-100)', '70')
  .option('--generate-report', 'Generate detailed health report')
  .action(async (directory: string, options: any) => {
    try {
      if (!options.color) {
        chalk.level = 0
      }
      
      console.log(chalk.blue('🏥 Project Health Assessment'))
      console.log(chalk.gray('Analyzing overall project health...\n'))
      
      const checker = new BulkPerfChecker()
      checker.checkDirectory(directory)
      
      console.log(chalk.green('\n✅ Health check completed!'))
      console.log(chalk.cyan('💡 Use --generate-report for detailed analysis'))
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program.parse() 