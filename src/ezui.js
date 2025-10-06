/**
 * EZUI Framework - Main Entry Point
 * Lightweight reactive framework for .ezu components
 */

import { EZUIParser } from './parser/parser.js';
import { EZUICompiler } from './parser/compiler.js';
import { ReactiveState } from './runtime/reactivity.js';
import { ComponentRegistry } from './runtime/component.js';
import { DOMUtils } from './runtime/dom.js';

class EZUI {
  constructor(options = {}) {
    this.options = {
      strictMode: false,
      enableMetrics: false,
      autoDiscovery: true,
      errorReporting: true,
      developmentMode: process?.env?.NODE_ENV !== 'production',
      ...options
    };
    
    this.parser = new EZUIParser();
    this.compiler = this.options.developmentMode 
      ? EZUICompiler.createDevelopmentCompiler()
      : EZUICompiler.createSecureCompiler();
    this.registry = new ComponentRegistry();
    this.loadedComponents = new Map();
    this.isInitialized = false;
    this.errors = [];
    
    // Performance metrics
    this.metrics = {
      componentsLoaded: 0,
      componentsRegistered: 0,
      totalLoadTime: 0,
      errors: 0
    };
    
    // Global error handling
    this.setupGlobalErrorHandling();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  setupGlobalErrorHandling() {
    if (!this.options.errorReporting) return;
    
    // Handle unhandled component errors
    window.addEventListener('error', (event) => {
      if (event.error && event.error.message?.includes('EZUI')) {
        this.handleError(event.error, 'Global Error');
      }
    });
    
    // Handle promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message?.includes('EZUI')) {
        this.handleError(event.reason, 'Unhandled Promise Rejection');
      }
    });
  }

  handleError(error, context = 'Unknown') {
    const errorInfo = {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.errors.push(errorInfo);
    this.metrics.errors++;
    
    if (this.options.developmentMode) {
      console.error('EZUI Error:', errorInfo);
    }
    
    // Emit custom error event for external error reporting
    window.dispatchEvent(new CustomEvent('ezui:error', {
      detail: errorInfo
    }));
  }

  async init() {
    if (this.isInitialized) return;
    
    try {
      const startTime = performance.now();
      
      // Auto-discover and load .ezu components
      if (this.options.autoDiscovery) {
        await this.discoverComponents();
      }
      
      // Process existing component tags in HTML
      this.processExistingComponents();
      
      // Set up mutation observer for dynamic components
      this.setupMutationObserver();
      
      // Setup performance monitoring
      if (this.options.enableMetrics) {
        this.setupPerformanceMonitoring();
      }
      
      const initTime = performance.now() - startTime;
      this.metrics.totalLoadTime = initTime;
      
      this.isInitialized = true;
      
      if (this.options.developmentMode) {
        console.log(`EZUI Framework initialized in ${initTime.toFixed(2)}ms`);
        console.log('Registry:', this.registry.getStats());
      }
      
      // Emit initialization event
      window.dispatchEvent(new CustomEvent('ezui:ready', {
        detail: { metrics: this.metrics }
      }));
      
    } catch (error) {
      this.handleError(error, 'Initialization');
      throw new Error(`EZUI initialization failed: ${error.message}`);
    }
  }

  setupPerformanceMonitoring() {
    // Monitor component performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.startsWith('ezui:')) {
          console.log(`Performance: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
        }
      }
    });
    
    if (typeof PerformanceObserver !== 'undefined') {
      observer.observe({ entryTypes: ['measure'] });
    }
  }

  async discoverComponents() {
    // Look for script tags with type="text/ezu"
    const ezuScripts = document.querySelectorAll('script[type="text/ezu"]');
    
    for (const script of ezuScripts) {
      if (script.src) {
        await this.loadComponent(script.src);
      } else if (script.textContent.trim()) {
        await this.registerInlineComponent(script.textContent);
      }
    }
  }

  async loadComponent(url) {
    const startTime = performance.now();
    
    try {
      // Check if already loaded
      if (this.loadedComponents.has(url)) {
        return this.loadedComponents.get(url);
      }
      
      // Validate URL
      const validUrl = new URL(url, window.location.origin);
      
      // Fetch with timeout and proper error handling
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(validUrl.href, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/plain, */*'
        }
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const ezuContent = await response.text();
      
      if (!ezuContent.trim()) {
        throw new Error('Empty component file');
      }
      
      const componentName = this.getComponentNameFromUrl(url);
      const result = await this.registerComponent(componentName, ezuContent);
      
      // Cache the loaded component
      this.loadedComponents.set(url, result);
      
      const loadTime = performance.now() - startTime;
      this.metrics.componentsLoaded++;
      
      if (this.options.enableMetrics) {
        performance.mark('ezui:component-loaded');
        performance.measure(`ezui:load-${componentName}`, 'ezui:component-loaded');
      }
      
      if (this.options.developmentMode) {
        console.log(`Loaded component ${componentName} in ${loadTime.toFixed(2)}ms`);
      }
      
      return result;
      
    } catch (error) {
      this.handleError(error, `Loading component from ${url}`);
      throw error;
    }
  }

  async registerComponent(name, ezuContent) {
    const startTime = performance.now();
    
    try {
      // Validate inputs
      if (!name || typeof name !== 'string') {
        throw new Error('Component name is required and must be a string');
      }
      
      if (!ezuContent || typeof ezuContent !== 'string') {
        throw new Error('Component content is required and must be a string');
      }
      
      // Check for duplicate registration
      if (this.registry.has(name) && !this.options.developmentMode) {
        console.warn(`Component ${name} is already registered`);
        return;
      }
      
      // Parse the .ezu content with validation
      const parsed = this.parser.parse(ezuContent);
      
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Failed to parse component content');
      }
      
      // Compile to JavaScript with error handling
      const compiled = this.compiler.compile(parsed);
      
      if (!compiled) {
        throw new Error('Failed to compile component');
      }
      
      // Register the component
      this.registry.register(name, compiled);
      
      const registerTime = performance.now() - startTime;
      this.metrics.componentsRegistered++;
      
      if (this.options.enableMetrics) {
        performance.mark('ezui:component-registered');
        performance.measure(`ezui:register-${name}`, 'ezui:component-registered');
      }
      
      if (this.options.developmentMode) {
        console.log(`Registered component ${name} in ${registerTime.toFixed(2)}ms`);
      }
      
      // Emit registration event
      window.dispatchEvent(new CustomEvent('ezui:component-registered', {
        detail: { name, parseTime: registerTime }
      }));
      
      return { name, compiled, parseTime: registerTime };
      
    } catch (error) {
      this.handleError(error, `Registering component ${name}`);
      throw new Error(`Failed to register component ${name}: ${error.message}`);
    }
  }

  async registerInlineComponent(ezuContent) {
    const parsed = this.parser.parse(ezuContent);
    const componentName = parsed.name || 'inline-component';
    
    await this.registerComponent(componentName, ezuContent);
  }

  processExistingComponents() {
    // Find all custom elements that match registered components
    const allElements = document.querySelectorAll('*');
    
    for (const element of allElements) {
      const tagName = element.tagName.toLowerCase();
      
      if (this.registry.has(tagName) && !element._ezuiComponent) {
        this.mountComponent(element, tagName);
      }
    }
  }

  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.processNode(node);
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  processNode(node) {
    const tagName = node.tagName?.toLowerCase();
    
    if (tagName && this.registry.has(tagName) && !node._ezuiComponent) {
      this.mountComponent(node, tagName);
    }

    // Process child nodes
    node.querySelectorAll?.('*').forEach((child) => {
      const childTagName = child.tagName.toLowerCase();
      if (this.registry.has(childTagName) && !child._ezuiComponent) {
        this.mountComponent(child, childTagName);
      }
    });
  }

  mountComponent(element, componentName) {
    const startTime = performance.now();
    
    try {
      if (!element || !componentName) {
        throw new Error('Element and component name are required');
      }
      
      // Prevent double mounting
      if (element._ezuiComponent) {
        if (this.options.developmentMode) {
          console.warn(`Component ${componentName} already mounted on element`);
        }
        return element._ezuiComponent;
      }
      
      const componentClass = this.registry.get(componentName);
      
      if (!componentClass) {
        throw new Error(`Component ${componentName} not found in registry`);
      }
      
      // Create and mount instance with error boundary
      const instance = new componentClass(element);
      
      if (!instance) {
        throw new Error('Failed to create component instance');
      }
      
      element._ezuiComponent = instance;
      
      // Mount with performance tracking
      if (this.options.enableMetrics) {
        performance.mark(`ezui:mount-start-${componentName}`);
      }
      
      instance.mount();
      
      const mountTime = performance.now() - startTime;
      
      if (this.options.enableMetrics) {
        performance.mark(`ezui:mount-end-${componentName}`);
        performance.measure(
          `ezui:mount-${componentName}`,
          `ezui:mount-start-${componentName}`,
          `ezui:mount-end-${componentName}`
        );
      }
      
      if (this.options.developmentMode) {
        console.log(`Mounted component ${componentName} in ${mountTime.toFixed(2)}ms`);
      }
      
      // Emit mount event
      window.dispatchEvent(new CustomEvent('ezui:component-mounted', {
        detail: { name: componentName, element, instance, mountTime }
      }));
      
      return instance;
      
    } catch (error) {
      this.handleError(error, `Mounting component ${componentName}`);
      
      // Create error placeholder
      if (element) {
        element.innerHTML = `
          <div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;">
            <strong>Component Error:</strong> Failed to mount ${componentName}
            ${this.options.developmentMode ? `<br><small>${error.message}</small>` : ''}
          </div>
        `;
      }
      
      throw error;
    }
  }

  getComponentNameFromUrl(url) {
    const filename = url.split('/').pop();
    const name = filename.replace('.ezu', '');
    return name.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '');
  }

  // Advanced API methods
  getMetrics() {
    return {
      ...this.metrics,
      registry: this.registry.getStats(),
      errors: this.errors.length,
      loadedComponents: this.loadedComponents.size
    };
  }

  getErrors() {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
    this.metrics.errors = 0;
  }

  // Development utilities
  debug() {
    if (!this.options.developmentMode) {
      console.warn('Debug mode only available in development');
      return;
    }
    
    console.group('EZUI Framework Debug Information');
    console.log('Options:', this.options);
    console.log('Metrics:', this.getMetrics());
    console.log('Loaded Components:', Array.from(this.loadedComponents.keys()));
    console.log('Errors:', this.errors);
    this.registry.debug();
    console.groupEnd();
  }

  // Hot reload support for development
  async hotReload(componentName, ezuContent) {
    if (!this.options.developmentMode) {
      console.warn('Hot reload only available in development mode');
      return;
    }
    
    try {
      const parsed = this.parser.parse(ezuContent);
      const compiled = this.compiler.compile(parsed);
      
      // Hot reload in registry
      this.registry.hotReload(componentName, compiled);
      
      console.log(`Hot reloaded component: ${componentName}`);
      
      // Emit hot reload event
      window.dispatchEvent(new CustomEvent('ezui:hot-reload', {
        detail: { componentName }
      }));
      
    } catch (error) {
      this.handleError(error, `Hot reloading ${componentName}`);
      throw error;
    }
  }

  // Batch operations for performance
  async batchRegister(components) {
    const results = [];
    
    for (const { name, content } of components) {
      try {
        const result = await this.registerComponent(name, content);
        results.push({ success: true, name, result });
      } catch (error) {
        results.push({ success: false, name, error: error.message });
      }
    }
    
    return results;
  }

  // Memory cleanup
  cleanup() {
    // Clear loaded components cache
    this.loadedComponents.clear();
    
    // Clear errors
    this.clearErrors();
    
    // Registry cleanup
    const components = this.registry.list();
    for (const name of components) {
      const instances = document.querySelectorAll(name);
      instances.forEach(element => {
        if (element._ezuiComponent) {
          element._ezuiComponent.destroy();
        }
      });
    }
    
    if (this.options.developmentMode) {
      console.log('EZUI cleanup completed');
    }
  }

  // Validation utilities
  validateComponent(ezuContent) {
    try {
      const parsed = this.parser.parse(ezuContent);
      return { valid: true, parsed };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Public API for manually registering components
  static async register(name, ezuContent) {
    if (!window.ezui) {
      throw new Error('EZUI framework not initialized');
    }
    return window.ezui.registerComponent(name, ezuContent);
  }

  static async load(url) {
    if (!window.ezui) {
      throw new Error('EZUI framework not initialized');
    }
    return window.ezui.loadComponent(url);
  }

  static getMetrics() {
    return window.ezui?.getMetrics() || null;
  }

  static debug() {
    return window.ezui?.debug();
  }

  // Factory methods for different environments
  static createDevelopmentInstance(options = {}) {
    return new EZUI({
      developmentMode: true,
      strictMode: false,
      enableMetrics: true,
      errorReporting: true,
      ...options
    });
  }

  static createProductionInstance(options = {}) {
    return new EZUI({
      developmentMode: false,
      strictMode: true,
      enableMetrics: false,
      errorReporting: false,
      autoDiscovery: true,
      ...options
    });
  }
}

// Initialize EZUI framework
window.ezui = new EZUI();

// Export for module usage
export { EZUI, ReactiveState, ComponentRegistry, DOMUtils };