/**
 * EZUI Error Handling and Logging System
 * Provides comprehensive error tracking, logging, and reporting
 */

export class EZUILogger {
  constructor(options = {}) {
    this.options = {
      level: 'info', // debug, info, warn, error
      enableConsole: true,
      enableStorage: true,
      maxStorageSize: 1000,
      enableRemoteLogging: false,
      remoteEndpoint: null,
      enablePerformanceLogging: true,
      enableUserTracking: false,
      ...options
    };
    
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    this.logs = [];
    this.errors = [];
    this.performance = [];
    this.userActions = [];
    
    this.setupStorageCleanup();
  }

  // Core logging methods
  debug(message, data = {}) {
    this.log('debug', message, data);
  }

  info(message, data = {}) {
    this.log('info', message, data);
  }

  warn(message, data = {}) {
    this.log('warn', message, data);
  }

  error(message, error = null, data = {}) {
    const errorData = {
      ...data,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null
    };
    
    this.log('error', message, errorData);
    
    // Store in separate error array for easier access
    this.errors.push({
      timestamp: new Date().toISOString(),
      message,
      error: errorData.error,
      data: errorData,
      url: window.location.href,
      userAgent: navigator.userAgent
    });
  }

  // Main logging function
  log(level, message, data = {}) {
    if (this.levels[level] < this.levels[this.options.level]) {
      return; // Skip logs below current level
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId(),
      ...this.getContextualInfo()
    };
    
    // Store log
    this.logs.push(logEntry);
    
    // Console output
    if (this.options.enableConsole) {
      this.outputToConsole(level, message, data);
    }
    
    // Storage
    if (this.options.enableStorage) {
      this.saveToStorage(logEntry);
    }
    
    // Remote logging
    if (this.options.enableRemoteLogging && this.options.remoteEndpoint) {
      this.sendToRemote(logEntry);
    }
    
    // Cleanup if needed
    this.cleanupLogs();
  }

  // Performance logging
  logPerformance(operation, duration, details = {}) {
    if (!this.options.enablePerformanceLogging) return;
    
    const perfEntry = {
      timestamp: new Date().toISOString(),
      operation,
      duration,
      details,
      memory: this.getMemoryUsage(),
      ...this.getContextualInfo()
    };
    
    this.performance.push(perfEntry);
    
    // Log slow operations as warnings
    if (duration > 100) { // 100ms threshold
      this.warn(`Slow operation detected: ${operation}`, {
        duration: `${duration}ms`,
        ...details
      });
    }
    
    this.debug(`Performance: ${operation}`, {
      duration: `${duration}ms`,
      ...details
    });
  }

  // User action tracking
  logUserAction(action, element = null, data = {}) {
    if (!this.options.enableUserTracking) return;
    
    const actionEntry = {
      timestamp: new Date().toISOString(),
      action,
      element: element ? {
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        textContent: element.textContent?.substring(0, 100)
      } : null,
      data,
      ...this.getContextualInfo()
    };
    
    this.userActions.push(actionEntry);
    
    this.debug(`User action: ${action}`, actionEntry);
  }

  // Component lifecycle logging
  logComponentLifecycle(component, event, details = {}) {
    this.info(`Component ${event}: ${component}`, {
      component,
      event,
      ...details
    });
  }

  // State change logging
  logStateChange(component, property, oldValue, newValue) {
    this.debug(`State change in ${component}`, {
      property,
      oldValue,
      newValue,
      timestamp: Date.now()
    });
  }

  // Network request logging
  logNetworkRequest(url, method, status, duration, details = {}) {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    
    this.log(level, `Network request: ${method} ${url}`, {
      method,
      status,
      duration: `${duration}ms`,
      ...details
    });
  }

  // Helper methods
  getContextualInfo() {
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: screen.width,
        height: screen.height
      },
      connection: this.getConnectionInfo(),
      timing: this.getTimingInfo()
    };
  }

  getConnectionInfo() {
    if ('connection' in navigator) {
      const conn = navigator.connection;
      return {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData
      };
    }
    return null;
  }

  getTimingInfo() {
    if ('timing' in performance) {
      const timing = performance.timing;
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart
      };
    }
    return null;
  }

  getMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory;
      return {
        usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
      };
    }
    return null;
  }

  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = 'ezui_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    return this.sessionId;
  }

  outputToConsole(level, message, data) {
    const prefix = `[EZUI ${level.toUpperCase()}]`;
    const hasData = Object.keys(data).length > 0;
    
    switch (level) {
      case 'debug':
        hasData ? console.debug(prefix, message, data) : console.debug(prefix, message);
        break;
      case 'info':
        hasData ? console.info(prefix, message, data) : console.info(prefix, message);
        break;
      case 'warn':
        hasData ? console.warn(prefix, message, data) : console.warn(prefix, message);
        break;
      case 'error':
        hasData ? console.error(prefix, message, data) : console.error(prefix, message);
        break;
    }
  }

  saveToStorage(logEntry) {
    try {
      const stored = localStorage.getItem('ezui_logs');
      const logs = stored ? JSON.parse(stored) : [];
      
      logs.push(logEntry);
      
      // Limit storage size
      if (logs.length > this.options.maxStorageSize) {
        logs.splice(0, logs.length - this.options.maxStorageSize);
      }
      
      localStorage.setItem('ezui_logs', JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to save log to localStorage:', error);
    }
  }

  async sendToRemote(logEntry) {
    try {
      await fetch(this.options.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.warn('Failed to send log to remote endpoint:', error);
    }
  }

  cleanupLogs() {
    // Keep only recent logs in memory
    const maxLogs = Math.max(100, this.options.maxStorageSize / 10);
    
    if (this.logs.length > maxLogs) {
      this.logs.splice(0, this.logs.length - maxLogs);
    }
    
    if (this.errors.length > maxLogs) {
      this.errors.splice(0, this.errors.length - maxLogs);
    }
    
    if (this.performance.length > maxLogs) {
      this.performance.splice(0, this.performance.length - maxLogs);
    }
    
    if (this.userActions.length > maxLogs) {
      this.userActions.splice(0, this.userActions.length - maxLogs);
    }
  }

  setupStorageCleanup() {
    // Clean up old logs on page load
    try {
      const stored = localStorage.getItem('ezui_logs');
      if (stored) {
        const logs = JSON.parse(stored);
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        const recentLogs = logs.filter(log => {
          const logTime = new Date(log.timestamp).getTime();
          return logTime > oneDayAgo;
        });
        
        if (recentLogs.length !== logs.length) {
          localStorage.setItem('ezui_logs', JSON.stringify(recentLogs));
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old logs:', error);
    }
  }

  // Export methods
  exportLogs() {
    return {
      logs: [...this.logs],
      errors: [...this.errors],
      performance: [...this.performance],
      userActions: [...this.userActions],
      system: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId()
      }
    };
  }

  exportAsJSON() {
    return JSON.stringify(this.exportLogs(), null, 2);
  }

  exportAsCSV() {
    const logs = this.logs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      data: JSON.stringify(log.data)
    }));
    
    const headers = ['timestamp', 'level', 'message', 'data'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => headers.map(header => 
        JSON.stringify(log[header] || '')
      ).join(','))
    ].join('\n');
    
    return csvContent;
  }

  // Clear methods
  clearLogs() {
    this.logs = [];
  }

  clearErrors() {
    this.errors = [];
  }

  clearPerformance() {
    this.performance = [];
  }

  clearUserActions() {
    this.userActions = [];
  }

  clearAll() {
    this.clearLogs();
    this.clearErrors();
    this.clearPerformance();
    this.clearUserActions();
    
    try {
      localStorage.removeItem('ezui_logs');
    } catch (error) {
      console.warn('Failed to clear logs from localStorage:', error);
    }
  }

  // Statistics
  getStatistics() {
    const errorCount = this.errors.length;
    const warnCount = this.logs.filter(log => log.level === 'warn').length;
    const infoCount = this.logs.filter(log => log.level === 'info').length;
    const debugCount = this.logs.filter(log => log.level === 'debug').length;
    
    const avgPerformance = this.performance.length > 0
      ? this.performance.reduce((sum, p) => sum + p.duration, 0) / this.performance.length
      : 0;
    
    return {
      total: this.logs.length,
      errors: errorCount,
      warnings: warnCount,
      info: infoCount,
      debug: debugCount,
      performance: {
        total: this.performance.length,
        average: Math.round(avgPerformance * 100) / 100
      },
      userActions: this.userActions.length,
      sessionId: this.getSessionId(),
      memoryUsage: this.getMemoryUsage()
    };
  }
}

// Error boundary helper
export class EZUIErrorBoundary {
  constructor(logger, options = {}) {
    this.logger = logger;
    this.options = {
      fallbackComponent: null,
      onError: null,
      enableRecovery: true,
      ...options
    };
    
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, 'Global Error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, 'Unhandled Promise Rejection');
    });
  }

  handleError(error, context, additionalData = {}) {
    // Log the error
    this.logger.error(`${context}: ${error.message}`, error, additionalData);
    
    // Call custom error handler
    if (this.options.onError) {
      try {
        this.options.onError(error, context, additionalData);
      } catch (handlerError) {
        this.logger.error('Error in custom error handler', handlerError);
      }
    }
    
    // Attempt recovery if enabled
    if (this.options.enableRecovery) {
      this.attemptRecovery(error, context);
    }
  }

  attemptRecovery(error, context) {
    // Basic recovery strategies
    if (context.includes('Component')) {
      this.logger.info('Attempting component recovery');
      // Component-specific recovery logic would go here
    }
  }

  wrapFunction(fn, context) {
    return (...args) => {
      try {
        return fn.apply(this, args);
      } catch (error) {
        this.handleError(error, context);
        throw error;
      }
    };
  }

  wrapAsync(fn, context) {
    return async (...args) => {
      try {
        return await fn.apply(this, args);
      } catch (error) {
        this.handleError(error, context);
        throw error;
      }
    };
  }
}

// Factory functions
export function createLogger(options = {}) {
  return new EZUILogger(options);
}

export function createErrorBoundary(logger, options = {}) {
  return new EZUIErrorBoundary(logger, options);
}

// Default instances
export const logger = new EZUILogger();
export const errorBoundary = new EZUIErrorBoundary(logger);