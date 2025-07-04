# React Performance Checker (react-perf)

A comprehensive React performance analysis tool that helps developers identify and fix performance issues in their React applications.

## 🚀 Features

- **Multiple Analysis Modes**: Full analysis, quick check, simple check, and bulk directory scanning
- **Performance Issue Detection**: Memory leaks, inefficient patterns, React-specific issues
- **Scoring System**: Grades your code from A+ to F with detailed breakdowns
- **CLI Interface**: Easy-to-use command-line interface
- **Interactive Mode**: Guided analysis with prompts
- **Bulk Analysis**: Scan entire directories for performance issues

## 📦 Installation

### npm
```bash
npm install react-perf
```

### pnpm
```bash
pnpm add react-perf
```

### yarn
```bash
yarn add react-perf
```

### Global Installation
```bash
# npm
npm install -g react-perf

# pnpm
pnpm add -g react-perf

# yarn
yarn global add react-perf
```

## 🛠️ Usage

### Command Line Interface
```bash
# Full analysis of a single file
npx react-perf analyze src/components/MyComponent.tsx
npx react-perf a src/components/MyComponent.tsx

# Quick performance check
npx react-perf quick src/components/MyComponent.tsx
npx react-perf q src/components/MyComponent.tsx

# Simple check with basic analysis
npx react-perf simple src/components/MyComponent.tsx
npx react-perf s src/components/MyComponent.tsx

# Bulk analysis of entire directory
npx react-perf bulk src/components --extensions .ts,.tsx,.js,.jsx
npx react-perf b src/components --extensions .ts,.tsx,.js,.jsx

# Interactive mode
npx react-perf interactive
npx react-perf i

# Fix suggestions
npx react-perf fix src/components/MyComponent.tsx
npx react-perf f src/components/MyComponent.tsx

# Project health assessment
npx react-perf health src/
npx react-perf h src/
```

### Alternative Package Managers

If you have installed globally or prefer different package managers:

```bash
# Using pnpm
pnpm react-perf analyze src/components/MyComponent.tsx
pnpm react-perf a src/components/MyComponent.tsx

# Using yarn
yarn react-perf analyze src/components/MyComponent.tsx
yarn react-perf a src/components/MyComponent.tsx

# Using global installation
react-perf analyze src/components/MyComponent.tsx
react-perf a src/components/MyComponent.tsx
```

### Programmatic Usage

```typescript
import { PerformanceAnalyzer, PerformanceReporter } from 'react-perf';

const analyzer = new PerformanceAnalyzer();
const reporter = new PerformanceReporter();

const analysis = analyzer.analyzeFile('src/components/MyComponent.tsx');
reporter.printAnalysis(analysis);
```

## 🔍 What It Detects

### Memory Leaks
- Unremoved event listeners
- Uncleared intervals and timeouts
- Missing cleanup functions

### Performance Issues
- Multiple array operations (map + filter)
- Inefficient DOM queries
- Inline functions in render
- Large file sizes

### React-Specific Issues
- useEffect with empty dependencies
- Inline styles and classes
- Multiple components in single file
- Hook usage in non-hook files

### Code Quality
- String concatenation vs template literals
- Object operations optimization
- File organization issues

## 📊 Scoring System

The tool provides a comprehensive scoring system:

- **Overall Score**: 0-100 with letter grades (A+ to F)
- **Memory Safety**: Focus on memory leak prevention
- **Performance**: Optimization opportunities
- **Code Quality**: Best practices and maintainability

### Grade Breakdown
- **A+ (90-100)**: Excellent, production-ready code
- **A (85-89)**: Great job, minor improvements needed
- **B (70-84)**: Good work, some optimizations recommended
- **C (50-69)**: Decent code, needs attention
- **D (35-49)**: Below average, consider refactoring
- **F (0-34)**: Critical issues, immediate action required

## 🎯 Analysis Modes

| Command | Alias | Description |
|---------|-------|-------------|
| `analyze` | `a` | Comprehensive analysis with detailed reports, issue categorization, and specific recommendations |
| `quick` | `q` | Fast analysis focusing on common performance issues with immediate feedback |
| `simple` | `s` | Basic analysis for quick code quality assessment |
| `bulk` | `b` | Scan entire directories and provide project-wide performance insights |
| `interactive` | `i` | Guided analysis with step-by-step prompts for choosing analysis type and files |
| `fix` | `f` | Show automatic fix suggestions for a file |
| `health` | `h` | Overall project health assessment |

### Quick Reference:
- **`a`** - Full analysis (analyze)
- **`q`** - Quick check
- **`s`** - Simple check
- **`b`** - Bulk analysis
- **`i`** - Interactive mode
- **`f`** - Fix suggestions
- **`h`** - Health assessment

## 📋 Example Output

```
🔍 Performance Analysis Report
==================================================
📁 File: src/components/MyComponent.tsx
📊 Total Issues: 3
🔴 High Severity: 1
🟡 Medium Severity: 1
🟢 Low Severity: 1

==================================================
🏆 CODE QUALITY SCORE
==================================================
📈 Overall Score: 85/100 (A)
🔴 Memory Safety: 80/100
🟡 Performance: 90/100
🟢 Code Quality: 95/100

🥇 Grade: A

👍 Great job! Minor improvements needed.
==================================================

🔴 HIGH PRIORITY ISSUES:
❌ Line 15: Potential memory leak
   💡 Suggestion: Make sure to remove event listeners in cleanup functions

🟡 MEDIUM PRIORITY ISSUES:
⚠️ Line 23: Multiple array operations
   💡 Suggestion: Consider combining .map() and .filter() into a single operation

🟢 LOW PRIORITY ISSUES:
ℹ️ Line 8: String concatenation
   💡 Suggestion: Consider using template literals (backticks) for better readability
```

## 🏗️ Project Structure

```
src/
├── performance-analyzer.ts    # Core analysis engine
├── bulk-perf-check.ts        # Directory scanning functionality
├── quick-perf-check.ts       # Fast analysis mode
├── simple-perf-check.ts      # Basic analysis mode
├── cli.ts                    # Command-line interface
└── index.ts                  # Main exports
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/mohamadgarmabi/react-perf.git

# Install dependencies
npm install
# or
pnpm install
# or
yarn install

# Build the project
npm run build
# or
pnpm build
# or
yarn build
```

### Repository
- **GitHub**: [https://github.com/mohamadgarmabi/react-perf](https://github.com/mohamadgarmabi/react-perf)
- **Author**: [Mohammad Garmabi](https://github.com/mohamadgarmabi)

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/mohamadgarmabi/react-perf/issues) page
2. Create a new issue with detailed information
3. Include code examples and error messages

### Links
- **Repository**: [https://github.com/mohamadgarmabi/react-perf](https://github.com/mohamadgarmabi/react-perf)
- **Issues**: [https://github.com/mohamadgarmabi/react-perf/issues](https://github.com/mohamadgarmabi/react-perf/issues)
- **Author**: [Mohammad Garmabi](https://github.com/mohamadgarmabi)

## 🔗 Related Tools

- React DevTools Profiler
- Bundle analyzers (webpack-bundle-analyzer)
- ESLint performance rules
- Lighthouse performance audits

---

*Built with ❤️ for the React community* 



