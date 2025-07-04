/**
 * Performance optimization utilities
 */

// Memoization cache
const memoCache = new Map<string, any>()

/**
 * Memoize function results for better performance
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  return ((...args: Parameters<T>) => {
    const key = keyGenerator 
      ? keyGenerator(...args)
      : JSON.stringify(args)
    
    if (memoCache.has(key)) {
      return memoCache.get(key)
    }
    
    const result = fn(...args)
    memoCache.set(key, result)
    return result
  }) as T
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Clear memoization cache
 */
export function clearMemoCache(): void {
  memoCache.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: memoCache.size,
    keys: Array.from(memoCache.keys())
  }
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  private startMemory: number = 0
  private checkpoints: Map<string, number> = new Map()

  start(): void {
    this.startMemory = process.memoryUsage().heapUsed
  }

  checkpoint(name: string): void {
    this.checkpoints.set(name, process.memoryUsage().heapUsed)
  }

  getUsage(): { current: number; start: number; checkpoints: Record<string, number> } {
    const current = process.memoryUsage().heapUsed
    const checkpointsObj: Record<string, number> = {}
    
    for (const [name, usage] of this.checkpoints) {
      checkpointsObj[name] = usage
    }

    return {
      current,
      start: this.startMemory,
      checkpoints: checkpointsObj
    }
  }

  reset(): void {
    this.startMemory = 0
    this.checkpoints.clear()
  }
}

/**
 * Performance timer
 */
export class PerformanceTimer {
  private timers: Map<string, number> = new Map()

  start(name: string): void {
    this.timers.set(name, performance.now())
  }

  end(name: string): number {
    const startTime = this.timers.get(name)
    if (!startTime) {
      throw new Error(`Timer '${name}' was not started`)
    }
    
    const duration = performance.now() - startTime
    this.timers.delete(name)
    return duration
  }

  getDuration(name: string): number | null {
    const startTime = this.timers.get(name)
    if (!startTime) return null
    return performance.now() - startTime
  }
}

/**
 * Batch processor for large datasets
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)
    
    // Allow other tasks to run
    await new Promise(resolve => setImmediate(resolve))
  }
  
  return results
}

/**
 * Lazy loader for modules
 */
export class LazyLoader<T> {
  private module: T | null = null
  private loader: () => Promise<T>

  constructor(loader: () => Promise<T>) {
    this.loader = loader
  }

  async get(): Promise<T> {
    if (!this.module) {
      this.module = await this.loader()
    }
    return this.module
  }

  reset(): void {
    this.module = null
  }
} 