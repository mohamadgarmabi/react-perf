#!/usr/bin/env ts-node

import * as fs from "fs"
import * as path from "path"

interface PerformanceIssue {
  line: number
  message: string
  priority: string
  suggestion: string
}

interface FileResult {
  filePath: string
  totalIssues: number
  lowPriority: number
  highPriority: number
  mediumPriority: number
  issues: PerformanceIssue[]
  score: {
    total: number
    grade: string
    breakdown: {
      memoryLeaks: number
      performance: number
      codeQuality: number
    }
  }
}

interface ProjectScore {
  total: number
  grade: string
  bestFile: string
  worstFile: string
  totalFiles: number
  averageScore: number
  filesWithIssues: number
}

export class BulkPerfChecker {
  private results: FileResult[] = []

  checkDirectory(
    dirPath: string,
    extensions: string[] = [".ts", ".tsx", ".js", ".jsx"],
  ): void {
    this.results = []

    if (!fs.existsSync(dirPath)) {
      console.log(`❌ Directory not found: ${dirPath}`)
      return
    }

    console.log(`🔍 Scanning directory: ${dirPath}`)
    console.log(
      `📁 Looking for files with extensions: ${extensions.join(", ")}`,
    )

    this.scanDirectory(dirPath, extensions)
    this.printResults()
  }

  private scanDirectory(dirPath: string, extensions: string[]): void {
    const items = fs.readdirSync(dirPath)

    for (const item of items) {
      const fullPath = path.join(dirPath, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        // Skip node_modules and .git
        if (
          item !== "node_modules" &&
          item !== ".git" &&
          !item.startsWith(".")
        ) {
          this.scanDirectory(fullPath, extensions)
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item)
        if (extensions.includes(ext)) {
          this.checkFile(fullPath)
        }
      }
    }
  }

  private checkFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, "utf-8")
      const lines = content.split("\n")
      const issues: PerformanceIssue[] = []

      lines.forEach((line, index) => {
        const lineNum = index + 1
        const trimmedLine = line.trim()

        if (
          !trimmedLine ||
          trimmedLine.startsWith("//") ||
          trimmedLine.startsWith("/*")
        ) {
          return
        }

        // Memory leaks
        if (
          line.includes("addEventListener(") &&
          !line.includes("removeEventListener(")
        ) {
          issues.push({
            line: lineNum,
            priority: "🔴 HIGH",
            message: "Potential memory leak",
            suggestion: "Remove event listeners in cleanup",
          })
        }

        if (line.includes("setInterval(") && !line.includes("clearInterval(")) {
          issues.push({
            line: lineNum,
            priority: "🔴 HIGH",
            message: "Potential memory leak",
            suggestion: "Clear intervals in cleanup",
          })
        }

        // Array operations
        if (line.includes(".map(") && line.includes(".filter(")) {
          issues.push({
            line: lineNum,
            priority: "🟡 MEDIUM",
            message: "Multiple array operations",
            suggestion: "Combine into single operation",
          })
        }

        // React specific
        if (
          (filePath.includes(".tsx") || filePath.includes(".jsx")) &&
          line.includes("useEffect(") &&
          line.includes("[]")
        ) {
          issues.push({
            line: lineNum,
            priority: "🟡 MEDIUM",
            message: "useEffect dependencies",
            suggestion: "Check if empty deps array is intentional",
          })
        }

        // DOM queries
        if (
          line.includes("document.querySelector(") ||
          line.includes("document.getElementById(")
        ) {
          issues.push({
            line: lineNum,
            message: "DOM query",
            priority: "🟡 MEDIUM",
            suggestion: "Cache DOM queries if used multiple times",
          })
        }

        // Inline functions
        if (
          (line.includes("function(") || line.includes("=>")) &&
          line.includes("(")
        ) {
          issues.push({
            line: lineNum,
            priority: "🟢 LOW",
            message: "Inline function",
            suggestion: "Move outside render to prevent recreation",
          })
        }
      })

      const score = this.calculateFileScore(issues, lines.length)

      this.results.push({
        score,
        issues,
        filePath,
        totalIssues: issues.length,
        lowPriority: score.breakdown.codeQuality < 100 ? 1 : 0,
        highPriority: score.breakdown.memoryLeaks < 100 ? 1 : 0,
        mediumPriority: score.breakdown.performance < 100 ? 1 : 0,
      })
    } catch (error) {
      console.log(`⚠️ Error reading file ${filePath}: ${error}`)
    }
  }

  private calculateFileScore(
    issues: PerformanceIssue[],
    totalLines: number,
  ): FileResult["score"] {
    // Base score starts at 100
    const baseScore = 100

    // Count issues by priority
    const highIssues = issues.filter((i) => i.priority === "🔴 HIGH").length
    const mediumIssues = issues.filter((i) => i.priority === "🟡 MEDIUM").length
    const lowIssues = issues.filter((i) => i.priority === "🟢 LOW").length

    // Deduct points based on issues
    const highDeduction = highIssues * 15 // Memory leaks are very bad
    const mediumDeduction = mediumIssues * 8 // Performance issues
    const lowDeduction = lowIssues * 2 // Code quality issues

    // Bonus for clean code (no issues)
    const cleanCodeBonus = issues.length === 0 ? 10 : 0

    // File size bonus/penalty
    const sizeBonus = totalLines < 100 ? 5 : totalLines > 500 ? -10 : 0

    const totalScore = Math.max(
      0,
      Math.min(
        100,
        baseScore -
          highDeduction -
          mediumDeduction -
          lowDeduction +
          cleanCodeBonus +
          sizeBonus,
      ),
    )

    // Calculate breakdown
    const memoryLeaks = Math.max(0, 100 - highIssues * 20)
    const performance = Math.max(0, 100 - mediumIssues * 10)
    const codeQuality = Math.max(0, 100 - lowIssues * 5)

    // Determine grade
    let grade = "F"
    if (totalScore >= 90) grade = "A+"
    else if (totalScore >= 85) grade = "A"
    else if (totalScore >= 80) grade = "A-"
    else if (totalScore >= 75) grade = "B+"
    else if (totalScore >= 70) grade = "B"
    else if (totalScore >= 65) grade = "B-"
    else if (totalScore >= 60) grade = "C+"
    else if (totalScore >= 55) grade = "C"
    else if (totalScore >= 50) grade = "C-"
    else if (totalScore >= 45) grade = "D+"
    else if (totalScore >= 40) grade = "D"
    else if (totalScore >= 35) grade = "D-"

    return {
      grade,
      total: Math.round(totalScore),
      breakdown: {
        memoryLeaks: Math.round(memoryLeaks),
        performance: Math.round(performance),
        codeQuality: Math.round(codeQuality),
      },
    }
  }

  private calculateProjectScore(): ProjectScore {
    if (this.results.length === 0) {
      return {
        total: 100,
        grade: "A+",
        totalFiles: 0,
        bestFile: "N/A",
        worstFile: "N/A",
        averageScore: 100,
        filesWithIssues: 0,
      }
    }

    const scores = this.results.map((r) => r.score.total)
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length

    const bestFile = this.results.reduce((best, current) =>
      current.score.total > best.score.total ? current : best,
    ).filePath

    const worstFile = this.results.reduce((worst, current) =>
      current.score.total < worst.score.total ? current : worst,
    ).filePath

    const filesWithIssues = this.results.filter((r) => r.totalIssues > 0).length

    // Determine overall grade
    let grade = "F"
    if (averageScore >= 90) grade = "A+"
    else if (averageScore >= 85) grade = "A"
    else if (averageScore >= 80) grade = "A-"
    else if (averageScore >= 75) grade = "B+"
    else if (averageScore >= 70) grade = "B"
    else if (averageScore >= 65) grade = "B-"
    else if (averageScore >= 60) grade = "C+"
    else if (averageScore >= 55) grade = "C"
    else if (averageScore >= 50) grade = "C-"
    else if (averageScore >= 45) grade = "D+"
    else if (averageScore >= 40) grade = "D"
    else if (averageScore >= 35) grade = "D-"

    return {
      grade,
      bestFile,
      worstFile,
      filesWithIssues,
      total: Math.round(averageScore),
      totalFiles: this.results.length,
      averageScore: Math.round(averageScore),
    }
  }

  private printResults(): void {
    if (this.results.length === 0) {
      console.log("✅ No performance issues found in any files!")
      return
    }

    const projectScore = this.calculateProjectScore()

    console.log(`\n📊 Found issues in ${this.results.length} files:`)

    // Sort by total issues (descending)
    const sortedResults = this.results.sort(
      (a, b) => b.totalIssues - a.totalIssues,
    )

    let totalHigh = 0
    let totalMedium = 0
    let totalLow = 0

    sortedResults.forEach((result) => {
      console.log(`\n📁 ${result.filePath}`)
      console.log(
        `   📊 Total: ${result.totalIssues} (🔴${result.highPriority} 🟡${result.mediumPriority} 🟢${result.lowPriority})`,
      )
      console.log(
        `   🏆 Score: ${result.score.total}/100 (${result.score.grade})`,
      )

      if (result.highPriority > 0) {
        const highIssues = result.issues.filter((i) => i.priority === "🔴 HIGH")
        highIssues.forEach((issue) => {
          console.log(`   🔴 Line ${issue.line}: ${issue.message}`)
        })
      }

      totalHigh += result.highPriority
      totalMedium += result.mediumPriority
      totalLow += result.lowPriority
    })

    console.log(`\n📈 SUMMARY:`)
    console.log(`   🔴 High Priority: ${totalHigh}`)
    console.log(`   🟡 Medium Priority: ${totalMedium}`)
    console.log(`   🟢 Low Priority: ${totalLow}`)
    console.log(`   📊 Total Issues: ${totalHigh + totalMedium + totalLow}`)

    // Project Score Section
    console.log(`\n${"=".repeat(50)}`)
    console.log("🏆 PROJECT QUALITY SCORE")
    console.log("=".repeat(50))
    console.log(
      `📈 Overall Project Score: ${projectScore.total}/100 (${projectScore.grade})`,
    )
    console.log(`📁 Total Files Analyzed: ${projectScore.totalFiles}`)
    console.log(`⚠️ Files with Issues: ${projectScore.filesWithIssues}`)
    console.log(`🥇 Best File: ${projectScore.bestFile}`)
    console.log(`💀 Worst File: ${projectScore.worstFile}`)

    // Grade emoji
    const gradeEmoji = this.getGradeEmoji(projectScore.total)
    console.log(`\n${gradeEmoji} Project Grade: ${projectScore.grade}`)

    // Score interpretation
    this.printScoreInterpretation(projectScore.total)

    console.log(`\n💡 Recommendations:`)
    if (totalHigh > 0) {
      console.log(`   🔴 Fix ${totalHigh} memory leak issues first`)
    }
    if (totalMedium > 0) {
      console.log(`   🟡 Address ${totalMedium} performance issues`)
    }
    console.log(`   💡 Use React DevTools Profiler for runtime analysis`)
  }

  private getGradeEmoji(score: number): string {
    if (score >= 90) return "🏆"
    if (score >= 80) return "🥇"
    if (score >= 70) return "🥈"
    if (score >= 60) return "🥉"
    if (score >= 50) return "📚"
    if (score >= 40) return "⚠️"
    if (score >= 30) return "🚨"
    return "💀"
  }

  private printScoreInterpretation(score: number): void {
    if (score >= 90) {
      console.log("🌟 Excellent project! Production-ready codebase!")
    } else if (score >= 80) {
      console.log("👍 Great project! Minor improvements needed.")
    } else if (score >= 70) {
      console.log("✅ Good project! Some optimizations recommended.")
    } else if (score >= 60) {
      console.log("📝 Decent project, but needs attention.")
    } else if (score >= 50) {
      console.log("⚠️ Below average project. Consider refactoring.")
    } else if (score >= 40) {
      console.log("🚨 Poor quality project. Significant improvements needed.")
    } else {
      console.log("💀 Critical issues! Immediate action required.")
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dirPath = args[0] || "."

  console.log("🚀 Bulk Performance Checker")
  console.log("Scans entire directories for performance issues\n")

  const checker = new BulkPerfChecker()
  checker.checkDirectory(dirPath)
}

if (require.main === module) {
  main().catch(console.error)
}
