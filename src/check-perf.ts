#!/usr/bin/env ts-node

import * as readline from "readline"

import {
  PerformanceAnalyzer,
  PerformanceReporter,
} from "./performance-analyzer"

async function main(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  console.log("🚀 Performance Analyzer")
  console.log(
    "This tool will analyze your code for performance issues and provide suggestions.\n",
  )

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve)
    })
  }

  try {
    const filePath = await question(
      "Enter the path to the file you want to analyze: ",
    )

    if (!filePath) {
      console.log("❌ No file path provided")
      return
    }

    const analyzer = new PerformanceAnalyzer()
    const reporter = new PerformanceReporter()

    console.log("\n🔍 Analyzing file...")
    const analysis = analyzer.analyzeFile(filePath)
    reporter.printAnalysis(analysis)
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error)
  } finally {
    rl.close()
  }
}

// Run the script
main().catch(console.error)
