import * as fs from 'fs'
import * as path from 'path'
import type { FileAnalysis } from './performance-analyzer'

export interface PerformanceSnapshot {
  id: string
  timestamp: number
  branch: string
  commit: string
  metrics: {
    totalFiles: number
    totalIssues: number
    highSeverityIssues: number
    mediumSeverityIssues: number
    lowSeverityIssues: number
    averageScore: number
    performanceScore: number
    memoryScore: number
    codeQualityScore: number
  }
  fileAnalysis: FileAnalysisSummary[]
  environment: {
    nodeVersion: string
    packageVersion: string
    os: string
  }
}

export interface FileAnalysisSummary {
  filePath: string
  totalIssues: number
  highSeverity: number
  mediumSeverity: number
  lowSeverity: number
  score: number
  grade: string
}

export interface SnapshotComparison {
  baseline: PerformanceSnapshot
  current: PerformanceSnapshot
  regression: {
    totalIssues: number
    highSeverityIssues: number
    averageScore: number
    filesWithRegressions: string[]
  }
  improvement: {
    totalIssues: number
    highSeverityIssues: number
    averageScore: number
    filesWithImprovements: string[]
  }
  unchanged: {
    totalFiles: number
    files: string[]
  }
}

export class PerformanceSnapshotManager {
  private snapshotsDir: string
  private baselineDir: string

  constructor(snapshotsDir: string = '.performance-snapshots') {
    this.snapshotsDir = snapshotsDir
    this.baselineDir = path.join(snapshotsDir, 'baselines')
    this.ensureDirectories()
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.snapshotsDir)) {
      fs.mkdirSync(this.snapshotsDir, { recursive: true })
    }
    if (!fs.existsSync(this.baselineDir)) {
      fs.mkdirSync(this.baselineDir, { recursive: true })
    }
  }

  async createSnapshot(
    analyses: FileAnalysis[],
    branch: string,
    commit: string
  ): Promise<PerformanceSnapshot> {
    const totalFiles = analyses.length
    const totalIssues = analyses.reduce((sum, analysis) => sum + analysis.summary.totalIssues, 0)
    const highSeverityIssues = analyses.reduce((sum, analysis) => sum + analysis.summary.highSeverity, 0)
    const mediumSeverityIssues = analyses.reduce((sum, analysis) => sum + analysis.summary.mediumSeverity, 0)
    const lowSeverityIssues = analyses.reduce((sum, analysis) => sum + analysis.summary.lowSeverity, 0)
    
    const averageScore = analyses.reduce((sum, analysis) => sum + analysis.score.total, 0) / totalFiles
    const performanceScore = analyses.reduce((sum, analysis) => sum + analysis.score.breakdown.performance, 0) / totalFiles
    const memoryScore = analyses.reduce((sum, analysis) => sum + analysis.score.breakdown.memoryLeaks, 0) / totalFiles
    const codeQualityScore = analyses.reduce((sum, analysis) => sum + analysis.score.breakdown.codeQuality, 0) / totalFiles

    const fileAnalysis: FileAnalysisSummary[] = analyses.map(analysis => ({
      filePath: analysis.filePath,
      totalIssues: analysis.summary.totalIssues,
      highSeverity: analysis.summary.highSeverity,
      mediumSeverity: analysis.summary.mediumSeverity,
      lowSeverity: analysis.summary.lowSeverity,
      score: analysis.score.total,
      grade: analysis.score.grade
    }))

    const snapshot: PerformanceSnapshot = {
      id: this.generateSnapshotId(),
      timestamp: Date.now(),
      branch,
      commit,
      metrics: {
        totalFiles,
        totalIssues,
        highSeverityIssues,
        mediumSeverityIssues,
        lowSeverityIssues,
        averageScore,
        performanceScore,
        memoryScore,
        codeQualityScore
      },
      fileAnalysis,
      environment: {
        nodeVersion: process.version,
        packageVersion: this.getPackageVersion(),
        os: process.platform
      }
    }

    await this.saveSnapshot(snapshot)
    return snapshot
  }

  private generateSnapshotId(): string {
    return `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private getPackageVersion(): string {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
      return packageJson.version || 'unknown'
    } catch {
      return 'unknown'
    }
  }

  async saveSnapshot(snapshot: PerformanceSnapshot): Promise<void> {
    const filename = `${snapshot.id}.json`
    const filepath = path.join(this.snapshotsDir, filename)
    
    fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2))
  }

  async loadSnapshot(snapshotId: string): Promise<PerformanceSnapshot | null> {
    const filepath = path.join(this.snapshotsDir, `${snapshotId}.json`)
    
    if (!fs.existsSync(filepath)) {
      return null
    }

    const content = fs.readFileSync(filepath, 'utf-8')
    return JSON.parse(content)
  }

  async saveBaseline(snapshot: PerformanceSnapshot, branch: string = 'main'): Promise<void> {
    const filename = `baseline-${branch}.json`
    const filepath = path.join(this.baselineDir, filename)
    
    fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2))
  }

  async loadBaseline(branch: string = 'main'): Promise<PerformanceSnapshot | null> {
    const filename = `baseline-${branch}.json`
    const filepath = path.join(this.baselineDir, filename)
    
    if (!fs.existsSync(filepath)) {
      return null
    }

    const content = fs.readFileSync(filepath, 'utf-8')
    return JSON.parse(content)
  }

  async compareWithBaseline(
    currentSnapshot: PerformanceSnapshot,
    baselineBranch: string = 'main'
  ): Promise<SnapshotComparison | null> {
    const baseline = await this.loadBaseline(baselineBranch)
    
    if (!baseline) {
      return null
    }

    const regression = this.calculateRegression(baseline, currentSnapshot)
    const improvement = this.calculateImprovement(baseline, currentSnapshot)
    const unchanged = this.calculateUnchanged(baseline, currentSnapshot)

    return {
      baseline,
      current: currentSnapshot,
      regression,
      improvement,
      unchanged
    }
  }

  private calculateRegression(baseline: PerformanceSnapshot, current: PerformanceSnapshot) {
    const filesWithRegressions: string[] = []
    
    baseline.fileAnalysis.forEach(baselineFile => {
      const currentFile = current.fileAnalysis.find(f => f.filePath === baselineFile.filePath)
      if (currentFile && currentFile.score < baselineFile.score) {
        filesWithRegressions.push(baselineFile.filePath)
      }
    })

    return {
      totalIssues: Math.max(0, current.metrics.totalIssues - baseline.metrics.totalIssues),
      highSeverityIssues: Math.max(0, current.metrics.highSeverityIssues - baseline.metrics.highSeverityIssues),
      averageScore: Math.max(0, baseline.metrics.averageScore - current.metrics.averageScore),
      filesWithRegressions
    }
  }

  private calculateImprovement(baseline: PerformanceSnapshot, current: PerformanceSnapshot) {
    const filesWithImprovements: string[] = []
    
    baseline.fileAnalysis.forEach(baselineFile => {
      const currentFile = current.fileAnalysis.find(f => f.filePath === baselineFile.filePath)
      if (currentFile && currentFile.score > baselineFile.score) {
        filesWithImprovements.push(baselineFile.filePath)
      }
    })

    return {
      totalIssues: Math.max(0, baseline.metrics.totalIssues - current.metrics.totalIssues),
      highSeverityIssues: Math.max(0, baseline.metrics.highSeverityIssues - current.metrics.highSeverityIssues),
      averageScore: Math.max(0, current.metrics.averageScore - baseline.metrics.averageScore),
      filesWithImprovements
    }
  }

  private calculateUnchanged(baseline: PerformanceSnapshot, current: PerformanceSnapshot) {
    const unchangedFiles: string[] = []
    
    baseline.fileAnalysis.forEach(baselineFile => {
      const currentFile = current.fileAnalysis.find(f => f.filePath === baselineFile.filePath)
      if (currentFile && Math.abs(currentFile.score - baselineFile.score) < 0.01) {
        unchangedFiles.push(baselineFile.filePath)
      }
    })

    return {
      totalFiles: unchangedFiles.length,
      files: unchangedFiles
    }
  }

  async listSnapshots(): Promise<PerformanceSnapshot[]> {
    if (!fs.existsSync(this.snapshotsDir)) {
      return []
    }

    const files = fs.readdirSync(this.snapshotsDir)
    const snapshots: PerformanceSnapshot[] = []

    for (const file of files) {
      if (file.endsWith('.json') && !file.startsWith('baseline-')) {
        try {
          const content = fs.readFileSync(path.join(this.snapshotsDir, file), 'utf-8')
          snapshots.push(JSON.parse(content))
        } catch (error) {
          console.warn(`Failed to load snapshot ${file}:`, error)
        }
      }
    }

    return snapshots.sort((a, b) => b.timestamp - a.timestamp)
  }

  async cleanupOldSnapshots(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const snapshots = await this.listSnapshots()
    const cutoff = Date.now() - maxAge

    for (const snapshot of snapshots) {
      if (snapshot.timestamp < cutoff) {
        const filepath = path.join(this.snapshotsDir, `${snapshot.id}.json`)
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath)
        }
      }
    }
  }
} 