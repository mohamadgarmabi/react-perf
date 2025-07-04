import chalk from 'chalk'
import { PerformanceSnapshotManager } from './performance-snapshot'
import type { SnapshotComparison, PerformanceSnapshot } from './performance-snapshot'
import type { FileAnalysis } from './performance-analyzer'

export interface AlertThresholds {
  maxScoreRegression: number
  maxHighSeverityIncrease: number
  maxTotalIssuesIncrease: number
  minScoreImprovement: number
}

export interface AlertReport {
  hasRegressions: boolean
  hasImprovements: boolean
  criticalIssues: string[]
  warnings: string[]
  recommendations: string[]
  summary: {
    status: 'pass' | 'fail' | 'warning'
    message: string
    score: number
  }
  details: {
    regression: SnapshotComparison['regression']
    improvement: SnapshotComparison['improvement']
    unchanged: SnapshotComparison['unchanged']
  }
}

export class PRAlertSystem {
  private snapshotManager: PerformanceSnapshotManager
  private thresholds: AlertThresholds

  constructor(
    snapshotsDir: string = '.performance-snapshots',
    thresholds: Partial<AlertThresholds> = {}
  ) {
    this.snapshotManager = new PerformanceSnapshotManager(snapshotsDir)
    this.thresholds = {
      maxScoreRegression: 5,
      maxHighSeverityIncrease: 2,
      maxTotalIssuesIncrease: 10,
      minScoreImprovement: 2,
      ...thresholds
    }
  }

  async generateAlertReport(
    currentSnapshot: PerformanceSnapshot,
    baselineBranch: string = 'main'
  ): Promise<AlertReport> {
    const comparison = await this.snapshotManager.compareWithBaseline(currentSnapshot, baselineBranch)
    
    if (!comparison) {
      return {
        hasRegressions: false,
        hasImprovements: false,
        criticalIssues: ['No baseline found for comparison'],
        warnings: [],
        recommendations: ['Create a baseline snapshot first'],
        summary: {
          status: 'warning',
          message: 'No baseline available for comparison',
          score: 0
        },
        details: {
          regression: { totalIssues: 0, highSeverityIssues: 0, averageScore: 0, filesWithRegressions: [] },
          improvement: { totalIssues: 0, highSeverityIssues: 0, averageScore: 0, filesWithImprovements: [] },
          unchanged: { totalFiles: 0, files: [] }
        }
      }
    }

    const criticalIssues: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // Check for critical regressions
    if (comparison.regression.averageScore > this.thresholds.maxScoreRegression) {
      criticalIssues.push(
        `Performance score regressed by ${comparison.regression.averageScore.toFixed(2)} points (threshold: ${this.thresholds.maxScoreRegression})`
      )
    }

    if (comparison.regression.highSeverityIssues > this.thresholds.maxHighSeverityIncrease) {
      criticalIssues.push(
        `High severity issues increased by ${comparison.regression.highSeverityIssues} (threshold: ${this.thresholds.maxHighSeverityIncrease})`
      )
    }

    if (comparison.regression.totalIssues > this.thresholds.maxTotalIssuesIncrease) {
      criticalIssues.push(
        `Total issues increased by ${comparison.regression.totalIssues} (threshold: ${this.thresholds.maxTotalIssuesIncrease})`
      )
    }

    // Check for improvements
    if (comparison.improvement.averageScore > this.thresholds.minScoreImprovement) {
      recommendations.push(
        `Great improvement! Performance score improved by ${comparison.improvement.averageScore.toFixed(2)} points`
      )
    }

    // Generate warnings for moderate regressions
    if (comparison.regression.averageScore > 0 && comparison.regression.averageScore <= this.thresholds.maxScoreRegression) {
      warnings.push(
        `Performance score slightly regressed by ${comparison.regression.averageScore.toFixed(2)} points`
      )
    }

    if (comparison.regression.filesWithRegressions.length > 0) {
      warnings.push(
        `${comparison.regression.filesWithRegressions.length} files show performance regressions`
      )
    }

    // Generate recommendations
    if (comparison.regression.filesWithRegressions.length > 0) {
      recommendations.push(
        `Review the following files for performance issues: ${comparison.regression.filesWithRegressions.slice(0, 5).join(', ')}`
      )
    }

    if (comparison.improvement.filesWithImprovements.length > 0) {
      recommendations.push(
        `${comparison.improvement.filesWithImprovements.length} files show improvements - consider these patterns for other files`
      )
    }

    // Calculate overall status and score
    const hasRegressions = criticalIssues.length > 0
    const hasImprovements = comparison.improvement.averageScore > this.thresholds.minScoreImprovement
    
    let status: 'pass' | 'fail' | 'warning' = 'pass'
    let score = 100

    if (hasRegressions) {
      status = 'fail'
      score = Math.max(0, 100 - (criticalIssues.length * 20))
    } else if (warnings.length > 0) {
      status = 'warning'
      score = Math.max(50, 100 - (warnings.length * 10))
    }

    const message = this.generateStatusMessage(status, comparison)

    return {
      hasRegressions,
      hasImprovements,
      criticalIssues,
      warnings,
      recommendations,
      summary: { status, message, score },
      details: {
        regression: comparison.regression,
        improvement: comparison.improvement,
        unchanged: comparison.unchanged
      }
    }
  }

  private generateStatusMessage(status: string, comparison: SnapshotComparison): string {
    switch (status) {
      case 'pass':
        return '✅ Performance check passed - no significant regressions detected'
      case 'warning':
        return '⚠️ Performance check passed with warnings - minor regressions detected'
      case 'fail':
        return '❌ Performance check failed - significant regressions detected'
      default:
        return 'Unknown status'
    }
  }

  printAlertReport(report: AlertReport): void {
    console.log('\n' + '='.repeat(60))
    console.log(chalk.bold.blue('🚀 React Performance PR Alert Report'))
    console.log('='.repeat(60))

    // Summary
    console.log('\n📊 Summary:')
    const statusColor = report.summary.status === 'pass' ? chalk.green : 
                       report.summary.status === 'warning' ? chalk.yellow : chalk.red
    console.log(`Status: ${statusColor(report.summary.status.toUpperCase())}`)
    console.log(`Score: ${chalk.bold(report.summary.score)}/100`)
    console.log(`Message: ${report.summary.message}`)

    // Critical Issues
    if (report.criticalIssues.length > 0) {
      console.log('\n❌ Critical Issues:')
      report.criticalIssues.forEach(issue => {
        console.log(`  • ${chalk.red(issue)}`)
      })
    }

    // Warnings
    if (report.warnings.length > 0) {
      console.log('\n⚠️ Warnings:')
      report.warnings.forEach(warning => {
        console.log(`  • ${chalk.yellow(warning)}`)
      })
    }

    // Improvements
    if (report.hasImprovements) {
      console.log('\n✅ Improvements:')
      console.log(`  • Performance score improved by ${chalk.green(report.details.improvement.averageScore.toFixed(2))} points`)
      console.log(`  • ${chalk.green(report.details.improvement.filesWithImprovements.length)} files show improvements`)
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      report.recommendations.forEach(rec => {
        console.log(`  • ${chalk.blue(rec)}`)
      })
    }

    // Detailed Metrics
    console.log('\n📈 Detailed Metrics:')
    console.log(`Files with regressions: ${chalk.red(report.details.regression.filesWithRegressions.length)}`)
    console.log(`Files with improvements: ${chalk.green(report.details.improvement.filesWithImprovements.length)}`)
    console.log(`Unchanged files: ${chalk.gray(report.details.unchanged.totalFiles)}`)

    console.log('\n' + '='.repeat(60))
  }

  generateGitHubComment(report: AlertReport, prNumber?: string): string {
    const statusEmoji = report.summary.status === 'pass' ? '✅' : 
                       report.summary.status === 'warning' ? '⚠️' : '❌'
    
    const statusText = report.summary.status === 'pass' ? 'PASSED' : 
                      report.summary.status === 'warning' ? 'PASSED WITH WARNINGS' : 'FAILED'

    let comment = `## 🚀 React Performance Check ${statusEmoji}\n\n`
    comment += `**Status:** ${statusText}\n`
    comment += `**Score:** ${report.summary.score}/100\n\n`

    if (report.criticalIssues.length > 0) {
      comment += '### ❌ Critical Issues\n'
      report.criticalIssues.forEach(issue => {
        comment += `- ${issue}\n`
      })
      comment += '\n'
    }

    if (report.warnings.length > 0) {
      comment += '### ⚠️ Warnings\n'
      report.warnings.forEach(warning => {
        comment += `- ${warning}\n`
      })
      comment += '\n'
    }

    if (report.hasImprovements) {
      comment += '### ✅ Improvements\n'
      comment += `- Performance score improved by ${report.details.improvement.averageScore.toFixed(2)} points\n`
      comment += `- ${report.details.improvement.filesWithImprovements.length} files show improvements\n\n`
    }

    if (report.recommendations.length > 0) {
      comment += '### 💡 Recommendations\n'
      report.recommendations.forEach(rec => {
        comment += `- ${rec}\n`
      })
      comment += '\n'
    }

    comment += '### 📊 Metrics\n'
    comment += `- Files with regressions: ${report.details.regression.filesWithRegressions.length}\n`
    comment += `- Files with improvements: ${report.details.improvement.filesWithImprovements.length}\n`
    comment += `- Unchanged files: ${report.details.unchanged.totalFiles}\n`

    if (prNumber) {
      comment += `\n---\n*Generated by React Performance Analyzer for PR #${prNumber}*`
    }

    return comment
  }

  generateJSONReport(report: AlertReport): string {
    return JSON.stringify(report, null, 2)
  }

  async shouldBlockPR(report: AlertReport): Promise<boolean> {
    return report.summary.status === 'fail'
  }

  async shouldWarnPR(report: AlertReport): Promise<boolean> {
    return report.summary.status === 'warning'
  }
} 