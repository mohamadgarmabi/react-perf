#!/usr/bin/env node

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { PerformanceAnalyzer } from './index'
import { PerformanceSnapshotManager } from './performance-snapshot'
import { PRAlertSystem } from './pr-alerts'

interface CIConfig {
  baselineBranch: string
  snapshotsDir: string
  thresholds: {
    maxScoreRegression: number
    maxHighSeverityIncrease: number
    maxTotalIssuesIncrease: number
    minScoreImprovement: number
  }
  outputFormats: ('console' | 'json' | 'github-comment')[]
  failOnRegression: boolean
  warnOnRegression: boolean
}

export class CIPerformanceChecker {
  private config: CIConfig
  private snapshotManager: PerformanceSnapshotManager
  private alertSystem: PRAlertSystem
  private analyzer: PerformanceAnalyzer

  constructor(config: Partial<CIConfig> = {}) {
    this.config = {
      baselineBranch: 'main',
      snapshotsDir: '.performance-snapshots',
      thresholds: {
        maxScoreRegression: 5,
        maxHighSeverityIncrease: 2,
        maxTotalIssuesIncrease: 10,
        minScoreImprovement: 2
      },
      outputFormats: ['console'],
      failOnRegression: true,
      warnOnRegression: true,
      ...config
    }

    this.snapshotManager = new PerformanceSnapshotManager(this.config.snapshotsDir)
    this.alertSystem = new PRAlertSystem(this.config.snapshotsDir, this.config.thresholds)
    this.analyzer = new PerformanceAnalyzer()
  }

  async run(): Promise<void> {
    try {
      console.log('🚀 Starting CI Performance Check...')
      
      // Get current branch and commit
      const currentBranch = this.getCurrentBranch()
      const currentCommit = this.getCurrentCommit()
      
      console.log(`📋 Current branch: ${currentBranch}`)
      console.log(`📋 Current commit: ${currentCommit}`)

      // Analyze current codebase
      console.log('🔍 Analyzing current codebase...')
      const analyses = await this.analyzeCodebase()
      
      if (analyses.length === 0) {
        console.log('⚠️ No files found to analyze')
        return
      }

      console.log(`✅ Analyzed ${analyses.length} files`)

      // Create snapshot
      console.log('📸 Creating performance snapshot...')
      const snapshot = await this.snapshotManager.createSnapshot(
        analyses,
        currentBranch,
        currentCommit
      )

      console.log(`✅ Snapshot created: ${snapshot.id}`)

      // Generate alert report
      console.log('📊 Generating alert report...')
      const report = await this.alertSystem.generateAlertReport(
        snapshot,
        this.config.baselineBranch
      )

      // Output results
      await this.outputResults(report, snapshot)

      // Handle CI actions
      await this.handleCIActions(report)

      console.log('✅ CI Performance Check completed')

    } catch (error) {
      console.error('❌ CI Performance Check failed:', error)
      process.exit(1)
    }
  }

  private getCurrentBranch(): string {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
    } catch {
      return process.env.GITHUB_REF_NAME || process.env.CI_COMMIT_REF_NAME || 'unknown'
    }
  }

  private getCurrentCommit(): string {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
    } catch {
      return process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA || 'unknown'
    }
  }

  private async analyzeCodebase(): Promise<any[]> {
    // Get list of React files to analyze
    const reactFiles = this.findReactFiles()
    
    if (reactFiles.length === 0) {
      console.log('No React files found to analyze')
      return []
    }

    // Analyze files
    const analyses: any[] = []
    for (const file of reactFiles) {
      try {
        const analysis = this.analyzer.analyzeFile(file)
        analyses.push(analysis)
      } catch (error) {
        console.warn(`Failed to analyze ${file}:`, error)
      }
    }

    return analyses
  }

  private findReactFiles(): string[] {
    const patterns = [
      '**/*.tsx',
      '**/*.jsx',
      '**/*.ts',
      '**/*.js'
    ]

    const files: string[] = []
    
    for (const pattern of patterns) {
      try {
        const glob = require('glob')
        const matches = glob.sync(pattern, {
          ignore: [
            'node_modules/**',
            'dist/**',
            'build/**',
            '.git/**',
            '**/*.test.*',
            '**/*.spec.*'
          ]
        })
        files.push(...matches)
      } catch (error) {
        console.warn(`Failed to find files with pattern ${pattern}:`, error)
      }
    }

    return [...new Set(files)] // Remove duplicates
  }

  private async outputResults(report: any, snapshot: any): Promise<void> {
    for (const format of this.config.outputFormats) {
      switch (format) {
        case 'console':
          this.alertSystem.printAlertReport(report)
          break
          
        case 'json':
          const jsonOutput = this.alertSystem.generateJSONReport(report)
          const jsonPath = path.join(this.config.snapshotsDir, `report-${snapshot.id}.json`)
          fs.writeFileSync(jsonPath, jsonOutput)
          console.log(`📄 JSON report saved to: ${jsonPath}`)
          break
          
        case 'github-comment':
          const comment = this.alertSystem.generateGitHubComment(report)
          const commentPath = path.join(this.config.snapshotsDir, `comment-${snapshot.id}.md`)
          fs.writeFileSync(commentPath, comment)
          console.log(`📄 GitHub comment saved to: ${commentPath}`)
          break
      }
    }
  }

  private async handleCIActions(report: any): Promise<void> {
    const shouldBlock = await this.alertSystem.shouldBlockPR(report)
    const shouldWarn = await this.alertSystem.shouldWarnPR(report)

    if (shouldBlock && this.config.failOnRegression) {
      console.log('❌ Performance regression detected - failing CI')
      process.exit(1)
    }

    if (shouldWarn && this.config.warnOnRegression) {
      console.log('⚠️ Performance regression detected - CI will continue with warning')
    }

    // Set GitHub Actions output variables
    if (process.env.GITHUB_OUTPUT) {
      const output = [
        `status=${report.summary.status}`,
        `score=${report.summary.score}`,
        `has_regressions=${report.hasRegressions}`,
        `has_improvements=${report.hasImprovements}`,
        `critical_issues_count=${report.criticalIssues.length}`,
        `warnings_count=${report.warnings.length}`
      ].join('\n')
      
      fs.appendFileSync(process.env.GITHUB_OUTPUT, output)
    }
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  
  // Parse command line arguments
  const config: Partial<CIConfig> = {}
  const thresholds: Partial<CIConfig['thresholds']> = {}
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--baseline-branch':
        config.baselineBranch = args[++i] || 'main'
        break
      case '--snapshots-dir':
        config.snapshotsDir = args[++i] || '.performance-snapshots'
        break
      case '--max-score-regression':
        thresholds.maxScoreRegression = Number(args[++i])
        break
      case '--max-high-severity-increase':
        thresholds.maxHighSeverityIncrease = Number(args[++i])
        break
      case '--max-total-issues-increase':
        thresholds.maxTotalIssuesIncrease = Number(args[++i])
        break
      case '--min-score-improvement':
        thresholds.minScoreImprovement = Number(args[++i])
        break
      case '--output':
        config.outputFormats = (args[++i] || 'console').split(',') as any
        break
      case '--no-fail-on-regression':
        config.failOnRegression = false
        break
      case '--no-warn-on-regression':
        config.warnOnRegression = false
        break
      case '--help':
        printHelp()
        return
    }
  }

  if (Object.keys(thresholds).length > 0) {
    config.thresholds = {
      maxScoreRegression: 5,
      maxHighSeverityIncrease: 2,
      maxTotalIssuesIncrease: 10,
      minScoreImprovement: 2,
      ...thresholds
    }
  }

  const checker = new CIPerformanceChecker(config)
  await checker.run()
}

function printHelp(): void {
  console.log(`
🚀 React Performance CI Checker

Usage: npx react-performanalyzer ci [options]

Options:
  --baseline-branch <branch>     Branch to compare against (default: main)
  --snapshots-dir <dir>          Directory to store snapshots (default: .performance-snapshots)
  --max-score-regression <num>   Maximum allowed score regression (default: 5)
  --max-high-severity-increase <num>  Maximum allowed high severity issues increase (default: 2)
  --max-total-issues-increase <num>   Maximum allowed total issues increase (default: 10)
  --min-score-improvement <num>  Minimum score improvement to highlight (default: 2)
  --output <formats>             Output formats: console,json,github-comment (default: console)
  --no-fail-on-regression        Don't fail CI on performance regression
  --no-warn-on-regression        Don't warn on performance regression
  --help                         Show this help message

Examples:
  npx react-performanalyzer ci
  npx react-performanalyzer ci --baseline-branch develop --output console,json
  npx react-performanalyzer ci --max-score-regression 10 --no-fail-on-regression
`)
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ CI Performance Check failed:', error)
    process.exit(1)
  })
} 