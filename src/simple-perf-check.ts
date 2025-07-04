#!/usr/bin/env ts-node

import * as fs from "fs"
import * as readline from "readline"

interface PerformanceIssue {
  line: number
  message: string
  suggestion: string
  severity: "low" | "medium" | "high"
}

export class SimplePerformanceChecker {
  private issues: PerformanceIssue[] = []

  checkFile(filePath: string): void {
    this.issues = []

    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`)
      return
    }

    const content = fs.readFileSync(filePath, "utf-8")
    const lines = content.split("\n")

    console.log(`🔍 Analyzing ${filePath} (${lines.length} lines)...`)

    // Check each line
    lines.forEach((line, index) => {
      this.checkLine(line, index + 1, filePath)
    })

    this.printResults()
  }

  private checkLine(line: string, lineNumber: number, filePath: string): void {
    const trimmedLine = line.trim()

    // Skip empty lines and comments
    if (
      !trimmedLine ||
      trimmedLine.startsWith("//") ||
      trimmedLine.startsWith("/*")
    ) {
      return
    }

    // Check for performance issues
    this.checkArrayOperations(line, lineNumber)
    this.checkMemoryLeaks(line, lineNumber)
    this.checkReactIssues(line, lineNumber, filePath)
    this.checkInefficientPatterns(line, lineNumber)
  }

  private checkArrayOperations(line: string, lineNumber: number): void {
    if (line.includes(".map(") && line.includes(".filter(")) {
      this.addIssue(
        lineNumber,
        "Multiple array operations",
        "Consider combining .map() and .filter() into a single operation",
        "medium",
      )
    }

    if (line.includes(".forEach(") && line.includes("push(")) {
      this.addIssue(
        lineNumber,
        "Inefficient array building",
        "Consider using .map() instead of .forEach() with push()",
        "medium",
      )
    }
  }

  private checkMemoryLeaks(line: string, lineNumber: number): void {
    if (
      line.includes("addEventListener(") &&
      !line.includes("removeEventListener(")
    ) {
      this.addIssue(
        lineNumber,
        "Potential memory leak",
        "Make sure to remove event listeners in cleanup functions",
        "high",
      )
    }

    if (line.includes("setInterval(") && !line.includes("clearInterval(")) {
      this.addIssue(
        lineNumber,
        "Potential memory leak",
        "Make sure to clear intervals in cleanup functions",
        "high",
      )
    }

    if (line.includes("setTimeout(") && !line.includes("clearTimeout(")) {
      this.addIssue(
        lineNumber,
        "Potential memory leak",
        "Consider clearing timeouts if component unmounts",
        "medium",
      )
    }
  }

  private checkReactIssues(
    line: string,
    lineNumber: number,
    filePath: string,
  ): void {
    if (!filePath.includes(".tsx") && !filePath.includes(".jsx")) {
      return
    }

    if (line.includes("useEffect(") && line.includes("[]")) {
      this.addIssue(
        lineNumber,
        "useEffect dependencies",
        "Check if empty dependency array is intentional",
        "medium",
      )
    }

    if (line.includes("style={{") || line.includes('className="')) {
      this.addIssue(
        lineNumber,
        "Inline styles/classes",
        "Consider extracting styles and classes to constants",
        "low",
      )
    }

    if (
      (line.includes("function(") || line.includes("=>")) &&
      line.includes("(")
    ) {
      this.addIssue(
        lineNumber,
        "Inline function",
        "Consider moving functions outside render to prevent recreation",
        "low",
      )
    }
  }

  private checkInefficientPatterns(line: string, lineNumber: number): void {
    if (
      line.includes("document.querySelector(") ||
      line.includes("document.getElementById(")
    ) {
      this.addIssue(
        lineNumber,
        "DOM query",
        "Consider caching DOM queries if used multiple times",
        "medium",
      )
    }

    if (line.includes("+") && line.includes('"') && line.includes('"')) {
      this.addIssue(
        lineNumber,
        "String concatenation",
        "Consider using template literals (backticks) for better readability",
        "low",
      )
    }
  }

  private addIssue(
    lineNumber: number,
    message: string,
    suggestion: string,
    severity: PerformanceIssue["severity"],
  ): void {
    this.issues.push({
      message,
      severity,
      suggestion,
      line: lineNumber,
    })
  }

  private printResults(): void {
    if (this.issues.length === 0) {
      console.log("✅ No performance issues found!")
      return
    }

    console.log(
      `\n📊 Found ${this.issues.length} potential performance issues:`,
    )

    const highIssues = this.issues.filter((i) => i.severity === "high")
    const mediumIssues = this.issues.filter((i) => i.severity === "medium")
    const lowIssues = this.issues.filter((i) => i.severity === "low")

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

    console.log("\n💡 Tips:")
    console.log("   - Fix high priority issues first (memory leaks)")
    console.log("   - Use React DevTools Profiler for runtime analysis")
    console.log(
      "   - Consider using bundle analyzers for dependency optimization",
    )
  }
}

async function main(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  console.log("🚀 Simple Performance Checker")
  console.log("Analyzes your code for common performance issues\n")

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve)
    })
  }

  try {
    const filePath = await question("Enter file path to analyze: ")

    if (!filePath) {
      console.log("❌ No file path provided")
      return
    }

    const checker = new SimplePerformanceChecker()
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
