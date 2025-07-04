#!/usr/bin/env ts-node

import * as fs from "fs"
import * as readline from "readline"

interface PerformanceIssue {
  line: number
  message: string
  priority: string
  suggestion: string
}

interface FileScore {
  total: number
  grade: string
  breakdown: {
    memoryLeaks: number
    performance: number
    codeQuality: number
  }
}

export class QuickPerfChecker {
  checkFile(filePath: string): void {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`)
      return
    }

    const content = fs.readFileSync(filePath, "utf-8")
    const lines = content.split("\n")

    console.log(`🔍 Analyzing ${filePath} (${lines.length} lines)...`)

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

    const score = this.calculateScore(issues, lines.length)
    this.printResults(issues, score)
  }

  private calculateScore(
    issues: PerformanceIssue[],
    totalLines: number,
  ): FileScore {
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

  private printResults(issues: PerformanceIssue[], score: FileScore): void {
    // Score section
    console.log("\n" + "=".repeat(50))
    console.log("🏆 CODE QUALITY SCORE")
    console.log("=".repeat(50))
    console.log(`📈 Overall Score: ${score.total}/100 (${score.grade})`)
    console.log(`🔴 Memory Safety: ${score.breakdown.memoryLeaks}/100`)
    console.log(`🟡 Performance: ${score.breakdown.performance}/100`)
    console.log(`🟢 Code Quality: ${score.breakdown.codeQuality}/100`)

    // Grade emoji
    const gradeEmoji = this.getGradeEmoji(score.total)
    console.log(`\n${gradeEmoji} Grade: ${score.grade}`)

    // Score interpretation
    this.printScoreInterpretation(score.total)

    console.log("=".repeat(50))

    if (issues.length === 0) {
      console.log("✅ No performance issues found!")
      return
    }

    console.log(`\n📊 Found ${issues.length} potential issues:`)

    const highIssues = issues.filter((i) => i.priority === "🔴 HIGH")
    const mediumIssues = issues.filter((i) => i.priority === "🟡 MEDIUM")
    const lowIssues = issues.filter((i) => i.priority === "🟢 LOW")

    if (highIssues.length > 0) {
      console.log("\n🔴 HIGH PRIORITY:")
      highIssues.forEach((issue) => {
        console.log(`   Line ${issue.line}: ${issue.message}`)
        console.log(`   💡 ${issue.suggestion}`)
      })
    }

    if (mediumIssues.length > 0) {
      console.log("\n🟡 MEDIUM PRIORITY:")
      mediumIssues.forEach((issue) => {
        console.log(`   Line ${issue.line}: ${issue.message}`)
        console.log(`   💡 ${issue.suggestion}`)
      })
    }

    if (lowIssues.length > 0) {
      console.log("\n🟢 LOW PRIORITY:")
      lowIssues.forEach((issue) => {
        console.log(`   Line ${issue.line}: ${issue.message}`)
        console.log(`   💡 ${issue.suggestion}`)
      })
    }

    console.log("\n💡 Quick Tips:")
    console.log("   - Fix memory leaks first (HIGH priority)")
    console.log("   - Use React DevTools Profiler")
    console.log("   - Consider bundle analysis")
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
      console.log("🌟 Excellent! Your code is production-ready!")
    } else if (score >= 80) {
      console.log("👍 Great job! Minor improvements needed.")
    } else if (score >= 70) {
      console.log("✅ Good work! Some optimizations recommended.")
    } else if (score >= 60) {
      console.log("📝 Decent code, but needs attention.")
    } else if (score >= 50) {
      console.log("⚠️ Below average. Consider refactoring.")
    } else if (score >= 40) {
      console.log("🚨 Poor quality. Significant improvements needed.")
    } else {
      console.log("💀 Critical issues! Immediate action required.")
    }
  }
}

async function main(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  console.log("🚀 Quick Performance Checker")
  console.log("Fast analysis of common performance issues\n")

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve)
    })
  }

  try {
    const filePath = await question("Enter file path: ")

    if (!filePath) {
      console.log("❌ No file path provided")
      return
    }

    const checker = new QuickPerfChecker()
    checker.checkFile(filePath)
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error)
  } finally {
    rl.close()
  }
}

if (require.main === module) {
  main().catch(console.error)
}
