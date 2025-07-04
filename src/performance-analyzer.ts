/* eslint-disable max-lines */
import * as fs from "fs"

interface PerformanceIssue {
  line: number
  message: string
  suggestion: string
  type: "warning" | "error" | "info"
  severity: "low" | "medium" | "high"
}

interface FileAnalysis {
  filePath: string
  issues: PerformanceIssue[]
  summary: {
    totalIssues: number
    highSeverity: number
    mediumSeverity: number
    lowSeverity: number
  }
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

export class PerformanceAnalyzer {
  private issues: PerformanceIssue[] = []

  analyzeFile(filePath: string): FileAnalysis {
    this.issues = []

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    const content = fs.readFileSync(filePath, "utf-8")
    const lines = content.split("\n")

    // Analyze each line
    lines.forEach((line, index) => {
      this.analyzeLine(line, index + 1, filePath)
    })

    // Analyze overall patterns
    this.analyzeOverallPatterns(content, filePath)

    const summary = this.calculateSummary()
    const score = this.calculateScore(summary, lines.length)

    return {
      score,
      summary,
      filePath,
      issues: this.issues,
    }
  }

  private analyzeLine(
    line: string,
    lineNumber: number,
    filePath: string,
  ): void {
    const trimmedLine = line.trim()

    // Skip empty lines and comments
    if (
      !trimmedLine ||
      trimmedLine.startsWith("//") ||
      trimmedLine.startsWith("/*")
    ) {
      return
    }

    // Check for common performance issues
    this.checkForExpensiveOperations(line, lineNumber)
    this.checkForMemoryLeaks(line, lineNumber)
    this.checkForInefficientPatterns(line, lineNumber)
    this.checkForReactSpecificIssues(line, lineNumber, filePath)
  }

  private checkForExpensiveOperations(line: string, lineNumber: number): void {
    // Array operations
    if (line.includes(".map(") && line.includes(".filter(")) {
      this.addIssue(
        lineNumber,
        "warning",
        "Multiple array operations",
        "Consider combining .map() and .filter() into a single operation or use .reduce()",
        "medium",
      )
    }

    if (line.includes(".forEach(") && line.includes("push(")) {
      this.addIssue(
        lineNumber,
        "warning",
        "Inefficient array building",
        "Consider using .map() instead of .forEach() with push()",
        "medium",
      )
    }

    // String operations
    if (line.includes("+") && line.includes('"') && line.includes('"')) {
      this.addIssue(
        lineNumber,
        "info",
        "String concatenation",
        "Consider using template literals (backticks) for better readability",
        "low",
      )
    }

    // Object operations
    if (line.includes("Object.keys(") && line.includes(".length")) {
      this.addIssue(
        lineNumber,
        "info",
        "Object keys length check",
        "Consider using Object.keys(obj).length === 0 for empty object check",
        "low",
      )
    }
  }

  private checkForMemoryLeaks(line: string, lineNumber: number): void {
    // Event listeners
    if (
      line.includes("addEventListener(") &&
      !line.includes("removeEventListener(")
    ) {
      this.addIssue(
        lineNumber,
        "error",
        "Potential memory leak",
        "Make sure to remove event listeners in cleanup functions",
        "high",
      )
    }

    // Intervals and timeouts
    if (line.includes("setInterval(") && !line.includes("clearInterval(")) {
      this.addIssue(
        lineNumber,
        "error",
        "Potential memory leak",
        "Make sure to clear intervals in cleanup functions",
        "high",
      )
    }

    if (line.includes("setTimeout(") && !line.includes("clearTimeout(")) {
      this.addIssue(
        lineNumber,
        "warning",
        "Potential memory leak",
        "Consider clearing timeouts if component unmounts",
        "medium",
      )
    }
  }

  private checkForInefficientPatterns(line: string, lineNumber: number): void {
    // Nested loops
    if (line.includes("for") && line.includes("{")) {
      this.addIssue(
        lineNumber,
        "info",
        "Loop detected",
        "Check if nested loops can be optimized or replaced with more efficient algorithms",
        "low",
      )
    }

    // Expensive DOM queries
    if (
      line.includes("document.querySelector(") ||
      line.includes("document.getElementById(")
    ) {
      this.addIssue(
        lineNumber,
        "warning",
        "DOM query",
        "Consider caching DOM queries if used multiple times",
        "medium",
      )
    }

    // Inline functions in render
    if (line.includes("function(") || line.includes("=>")) {
      this.addIssue(
        lineNumber,
        "info",
        "Inline function",
        "Consider moving functions outside render to prevent recreation on each render",
        "low",
      )
    }
  }

  private checkForReactSpecificIssues(
    line: string,
    lineNumber: number,
    filePath: string,
  ): void {
    // Only check React files
    if (!filePath.includes(".tsx") && !filePath.includes(".jsx")) {
      return
    }

    // useState without proper dependencies
    if (line.includes("useState(") && line.includes("[]")) {
      this.addIssue(
        lineNumber,
        "info",
        "useState initialization",
        "Consider if empty array is the best initial state",
        "low",
      )
    }

    // useEffect without dependencies
    if (line.includes("useEffect(") && line.includes("[]")) {
      this.addIssue(
        lineNumber,
        "warning",
        "useEffect dependencies",
        "Check if empty dependency array is intentional",
        "medium",
      )
    }

    // Inline objects in JSX
    if (line.includes("style={{") || line.includes('className="')) {
      this.addIssue(
        lineNumber,
        "info",
        "Inline styles/classes",
        "Consider extracting styles and classes to constants",
        "low",
      )
    }
  }

  private analyzeOverallPatterns(content: string, filePath: string): void {
    // Check file size
    const lines = content.split("\n").length
    if (lines > 500) {
      this.addIssue(
        1,
        "warning",
        "Large file",
        `File has ${lines} lines. Consider splitting into smaller components/modules`,
        "medium",
      )
    }

    // Check for too many imports
    const importLines = content.match(/^import.*$/gm)?.length || 0
    if (importLines > 20) {
      this.addIssue(
        1,
        "info",
        "Many imports",
        `File has ${importLines} imports. Consider organizing imports or splitting the file`,
        "low",
      )
    }

    // Check for React components
    if (filePath.includes(".tsx") || filePath.includes(".jsx")) {
      const componentCount = (
        content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []
      ).length
      if (componentCount > 3) {
        this.addIssue(
          1,
          "warning",
          "Multiple components",
          `File contains ${componentCount} components. Consider splitting into separate files`,
          "medium",
        )
      }

      // Detect main React hooks usage in non-hook files
      const isHookFile = /hook/i.test(filePath)
      const mainHooks = [
        "useState",
        "useEffect",
        "useReducer",
        "useCallback",
        "useMemo",
        "useContext",
        "useRef",
        "useImperativeHandle",
        "useLayoutEffect",
        "useDebugValue",
      ]
      const mainHookRegex = new RegExp(
        `\\b(${mainHooks.join("|")})\\s*\\(`,
        "g",
      )
      const usesMainHook = mainHookRegex.test(content)

      if (!isHookFile && usesMainHook) {
        this.addIssue(
          1,
          "error",
          "Warning: Using main React hooks (such as useState, useEffect, etc.) directly in jsx/tsx files is not allowed. You must move your hook logic and state to a separate file named with .hook (e.g., my-feature.hook.ts). This helps with separation of concerns and improves testability.",
          "Move hook logic to a .hook file (e.g., my-feature.hook.ts) for better separation of concerns and testability.",
          "high",
        )
      }
    }
  }

  private addIssue(
    lineNumber: number,
    type: PerformanceIssue["type"],
    message: string,
    suggestion: string,
    severity: PerformanceIssue["severity"],
  ): void {
    this.issues.push({
      type,
      message,
      severity,
      suggestion,
      line: lineNumber,
    })
  }

  private calculateSummary() {
    return {
      totalIssues: this.issues.length,
      lowSeverity: this.issues.filter((i) => i.severity === "low").length,
      highSeverity: this.issues.filter((i) => i.severity === "high").length,
      mediumSeverity: this.issues.filter((i) => i.severity === "medium").length,
    }
  }

  private calculateScore(
    summary: {
      totalIssues: number
      highSeverity: number
      mediumSeverity: number
      lowSeverity: number
    },
    totalLines: number,
  ): FileAnalysis["score"] {
    // Base score starts at 100
    const baseScore = 100

    // Deduct points based on issues
    const highDeduction = summary.highSeverity * 15 // Memory leaks are very bad
    const mediumDeduction = summary.mediumSeverity * 8 // Performance issues
    const lowDeduction = summary.lowSeverity * 2 // Code quality issues

    // Bonus for clean code (no issues)
    const cleanCodeBonus = summary.totalIssues === 0 ? 10 : 0

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
    const memoryLeaks = Math.max(0, 100 - summary.highSeverity * 20)
    const performance = Math.max(0, 100 - summary.mediumSeverity * 10)
    const codeQuality = Math.max(0, 100 - summary.lowSeverity * 5)

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
}

export class PerformanceReporter {
  printAnalysis(analysis: FileAnalysis): void {
    console.log("\n🔍 Performance Analysis Report")
    console.log("=".repeat(50))
    console.log(`📁 File: ${analysis.filePath}`)
    console.log(`📊 Total Issues: ${analysis.summary.totalIssues}`)
    console.log(`🔴 High Severity: ${analysis.summary.highSeverity}`)
    console.log(`🟡 Medium Severity: ${analysis.summary.mediumSeverity}`)
    console.log(`🟢 Low Severity: ${analysis.summary.lowSeverity}`)

    // Score section
    console.log("\n" + "=".repeat(50))
    console.log("🏆 CODE QUALITY SCORE")
    console.log("=".repeat(50))
    console.log(
      `📈 Overall Score: ${analysis.score.total}/100 (${analysis.score.grade})`,
    )
    console.log(`🔴 Memory Safety: ${analysis.score.breakdown.memoryLeaks}/100`)
    console.log(`🟡 Performance: ${analysis.score.breakdown.performance}/100`)
    console.log(`🟢 Code Quality: ${analysis.score.breakdown.codeQuality}/100`)

    // Grade emoji
    const gradeEmoji = this.getGradeEmoji(analysis.score.total)
    console.log(`\n${gradeEmoji} Grade: ${analysis.score.grade}`)

    // Score interpretation
    this.printScoreInterpretation(analysis.score.total)

    console.log("=".repeat(50))

    // Check for main React hook usage error
    const hasMainHookError = analysis.issues.some((issue) =>
      issue.message.startsWith(
        "Warning: Using main React hooks (such as useState, useEffect, etc.)",
      ),
    )
    if (hasMainHookError) {
      console.log(
        "\n🚫 Warning: Using main React hooks (such as useState, useEffect, etc.) directly in jsx/tsx files is not allowed. You must move your hook logic and state to a separate file named with .hook (e.g., my-feature.hook.ts). This helps with separation of concerns and improves testability.",
      )
    }

    if (analysis.issues.length === 0) {
      console.log("✅ No performance issues found!")
      return
    }

    // Group issues by severity
    const highIssues = analysis.issues.filter((i) => i.severity === "high")
    const mediumIssues = analysis.issues.filter((i) => i.severity === "medium")
    const lowIssues = analysis.issues.filter((i) => i.severity === "low")

    if (highIssues.length > 0) {
      console.log("\n🔴 HIGH PRIORITY ISSUES:")
      highIssues.forEach((issue) => this.printIssue(issue))
    }

    if (mediumIssues.length > 0) {
      console.log("\n🟡 MEDIUM PRIORITY ISSUES:")
      mediumIssues.forEach((issue) => this.printIssue(issue))
    }

    if (lowIssues.length > 0) {
      console.log("\n🟢 LOW PRIORITY ISSUES:")
      lowIssues.forEach((issue) => this.printIssue(issue))
    }

    this.printRecommendations(analysis)
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

  private printIssue(issue: PerformanceIssue): void {
    const icon =
      issue.type === "error" ? "❌" : issue.type === "warning" ? "⚠️" : "ℹ️"
    console.log(`${icon} Line ${issue.line}: ${issue.message}`)
    console.log(`   💡 Suggestion: ${issue.suggestion}`)
  }

  private printRecommendations(analysis: FileAnalysis): void {
    console.log("\n📋 GENERAL RECOMMENDATIONS:")

    if (analysis.summary.highSeverity > 0) {
      console.log(
        "🔴 Fix high severity issues first - they can cause memory leaks and crashes",
      )
    }

    if (analysis.summary.mediumSeverity > 0) {
      console.log("🟡 Address medium severity issues to improve performance")
    }

    console.log("🟢 Low severity issues are mostly code quality improvements")
    console.log(
      "💡 Consider using React DevTools Profiler for runtime performance analysis",
    )
    console.log("💡 Use bundle analyzers to identify large dependencies")
  }
}

export type { FileAnalysis, PerformanceIssue }
