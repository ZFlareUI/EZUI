/**
 * EZUI Compiler - Compiles parsed AST to JavaScript component classes
 */

import { ReactiveState } from '../runtime/reactivity.js';
import { DOMUtils } from '../runtime/dom.js';

export class EZUICompiler {
  constructor(options = {}) {
    this.options = {
      strictMode: true,
      sanitizeHtml: true,
      allowUnsafeEval: false,
      maxRenderDepth: 100,
      enableCSP: true,
      ...options
    };
    
    this.renderDepth = 0;
    this.compilationErrors = [];
  }

  compile(ast) {
    try {
      this.compilationErrors = [];
      this.validateAST(ast);
      
      const componentName = this.sanitizeComponentName(ast.name);
      
      return this.generateComponentClass(ast, componentName);
      
    } catch (error) {
      this.compilationErrors.push({
        type: 'COMPILATION_ERROR',
        message: error.message,
        ast: ast
      });
      throw new Error(`Compilation failed: ${error.message}`);
    }
  }

  validateAST(ast) {
    if (!ast || typeof ast !== 'object') {
      throw new Error('Invalid AST: must be an object');
    }
    
    if (!ast.name) {
      throw new Error('Component must have a name');
    }
    
    if (ast.template && !ast.template.html) {
      throw new Error('Template must have HTML content');
    }
    
    // Validate state properties
    if (ast.state) {
      this.validateStateObject(ast.state);
    }
    
    // Validate style properties
    if (ast.style) {
      this.validateStyleObject(ast.style);
    }
  }

  validateStateObject(state, path = 'state') {
    for (const [key, value] of Object.entries(state)) {
      if (typeof key !== 'string' || !key.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
        throw new Error(`Invalid state property name: ${key} at ${path}`);
      }
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.validateStateObject(value, `${path}.${key}`);
      }
    }
  }

  validateStyleObject(style) {
    for (const [selector, properties] of Object.entries(style)) {
      if (typeof selector !== 'string') {
        throw new Error(`Invalid CSS selector: ${selector}`);
      }
      
      if (typeof properties !== 'object' || properties === null) {
        throw new Error(`Invalid CSS properties for selector: ${selector}`);
      }
    }
  }

  generateComponentClass(ast, componentName) {
    const compiler = this;
    
    return class extends HTMLElement {
      constructor(element = null) {
        super();
        
        try {
          this.componentName = componentName;
          this.element = element || this;
          this.ast = ast;
          this.compiler = compiler;
          this.isDestroyed = false;
          this.renderQueue = [];
          this.isRendering = false;
          this.errorBoundary = null;
          
          // Performance tracking
          this.metrics = {
            renderCount: 0,
            lastRenderTime: 0,
            totalRenderTime: 0
          };
          
          // Initialize reactive state with validation
          this.state = new ReactiveState(ast.state || {});
          this.setupStateValidation();
          
          this.props = ast.props || {};
          
          // Bind methods
          this.render = this.render.bind(this);
          this.handleEvent = this.handleEvent.bind(this);
          this.safeRender = this.safeRender.bind(this);
          
          // Setup reactivity with debounced rendering
          this.state.onChange((changedState) => {
            this.scheduleRender();
          });
          
          // Create shadow DOM with error boundary
          this.shadowRoot = this.attachShadow({ mode: 'open' });
          this.setupErrorBoundary();
          
        } catch (error) {
          console.error(`Component initialization failed for ${componentName}:`, error);
          this.handleComponentError(error);
        }
      }

      setupStateValidation() {
        // Add common validations
        for (const [key, value] of Object.entries(this.state.data)) {
          if (typeof value === 'string' && key.toLowerCase().includes('email')) {
            this.state.addValidation(key, 
              (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
              'Invalid email format'
            );
          }
          
          if (typeof value === 'number' && key.toLowerCase().includes('age')) {
            this.state.addValidation(key,
              (val) => val >= 0 && val <= 150,
              'Age must be between 0 and 150'
            );
          }
        }
      }

      setupErrorBoundary() {
        this.errorBoundary = (error, errorInfo) => {
          console.error('Component Error:', error, errorInfo);
          this.shadowRoot.innerHTML = `
            <div style="color: red; padding: 20px; border: 1px solid red; border-radius: 4px;">
              <h3>Component Error</h3>
              <p><strong>${error.message}</strong></p>
              <details>
                <summary>Error Details</summary>
                <pre>${error.stack}</pre>
              </details>
            </div>
          `;
        };
      }

      handleComponentError(error) {
        if (this.errorBoundary) {
          this.errorBoundary(error, { component: this.componentName });
        } else {
          console.error('Unhandled component error:', error);
        }
      }

      scheduleRender() {
        if (this.isDestroyed) return;
        
        this.renderQueue.push(Date.now());
        
        if (!this.isRendering) {
          // Use requestAnimationFrame for optimal rendering
          requestAnimationFrame(() => {
            this.safeRender();
          });
        }
      }

      safeRender() {
        if (this.isDestroyed || this.isRendering) return;
        
        try {
          this.isRendering = true;
          const startTime = performance.now();
          
          this.render();
          
          const endTime = performance.now();
          this.updateMetrics(endTime - startTime);
          
        } catch (error) {
          this.handleComponentError(error);
        } finally {
          this.isRendering = false;
          this.renderQueue = [];
        }
      }

      updateMetrics(renderTime) {
        this.metrics.renderCount++;
        this.metrics.lastRenderTime = renderTime;
        this.metrics.totalRenderTime += renderTime;
        
        // Warn about slow renders
        if (renderTime > 16) { // > 1 frame at 60fps
          console.warn(`Slow render detected in ${this.componentName}: ${renderTime.toFixed(2)}ms`);
        }
      }

      mount() {
        this.render();
        this.attachEventListeners();
        
        // Custom mount lifecycle
        if (this.onMount) {
          this.onMount();
        }
      }

      render() {
        if (!this.ast.template) return;
        
        // Prevent infinite render loops
        if (this.compiler.renderDepth >= this.compiler.options.maxRenderDepth) {
          throw new Error(`Maximum render depth exceeded (${this.compiler.options.maxRenderDepth})`);
        }
        
        this.compiler.renderDepth++;
        
        try {
          // Generate scoped CSS with security checks
          const styles = this.generateStyles();
          
          // Process template with interpolations and sanitization
          const processedHtml = this.processTemplate();
          
          // Update DOM safely
          this.updateDOM(styles, processedHtml);
          
          // Re-attach event listeners after render
          this.attachEventListeners();
          
        } finally {
          this.compiler.renderDepth--;
        }
      }

      updateDOM(styles, html) {
        // Create document fragment for efficient DOM updates
        const fragment = document.createDocumentFragment();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = `${styles}${html}`;
        
        // Move nodes to fragment
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }
        
        // Clear and update shadow DOM
        this.shadowRoot.innerHTML = '';
        this.shadowRoot.appendChild(fragment);
      }

      generateStyles() {
        if (!this.ast.style) return '';
        
        const scopeId = `ezui-${this.componentName}-${Math.random().toString(36).substr(2, 9)}`;
        let css = '';
        
        for (const [selector, properties] of Object.entries(this.ast.style)) {
          // Scope the CSS to this component
          const scopedSelector = this.scopeSelector(selector, scopeId);
          css += `${scopedSelector} {\n`;
          
          for (const [property, value] of Object.entries(properties)) {
            css += `  ${this.kebabCase(property)}: ${value};\n`;
          }
          
          css += '}\n';
        }
        
        // Add scope class to component
        this.shadowRoot.host.classList.add(scopeId);
        
        return `<style>\n:host { display: block; }\n${css}</style>`;
      }

      scopeSelector(selector, scopeId) {
        // Handle various selector types
        if (selector.startsWith(':host')) {
          return selector;
        }
        
        if (selector.includes(':')) {
          // Pseudo-selectors like button:hover
          const [base, pseudo] = selector.split(':');
          return `.${scopeId} ${base.trim()}:${pseudo.trim()}`;
        }
        
        return `.${scopeId} ${selector}`;
      }

      processTemplate() {
        if (!this.ast.template) return '';
        
        let html = this.ast.template.html;
        
        // Security: Remove potentially dangerous tags and attributes
        if (this.compiler.options.sanitizeHtml) {
          html = this.sanitizeHtml(html);
        }
        
        // Process interpolations with XSS protection
        for (const interpolation of this.ast.template.interpolations) {
          try {
            const value = this.evaluateExpression(interpolation.expression);
            const sanitizedValue = this.compiler.options.sanitizeHtml 
              ? this.escapeHtml(String(value))
              : String(value);
            html = html.replace(interpolation.placeholder, sanitizedValue);
          } catch (error) {
            console.error(`Interpolation error for ${interpolation.expression}:`, error);
            html = html.replace(interpolation.placeholder, '<!-- Error: Invalid expression -->');
          }
        }
        
        // Remove event handlers from HTML (they'll be added via addEventListener)
        for (const event of this.ast.template.events) {
          html = html.replace(event.binding, '');
        }
        
        return html;
      }

      sanitizeHtml(html) {
        // Remove script tags
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        // Remove dangerous attributes
        const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'];
        for (const attr of dangerousAttrs) {
          const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
          html = html.replace(regex, '');
        }
        
        // Remove javascript: protocol
        html = html.replace(/javascript:/gi, '');
        
        // Remove data: protocol (except for images)
        html = html.replace(/data:(?!image\/)/gi, '');
        
        return html;
      }

      evaluateExpression(expression) {
        try {
          // Security check: prevent eval if not allowed
          if (!this.compiler.options.allowUnsafeEval) {
            return this.safeExpressionEval(expression);
          }
          
          // Create a safe evaluation context
          const context = {
            ...this.state.data,
            ...this.props,
            // Add safe utility functions
            Math: Math,
            Date: Date,
            String: String,
            Number: Number,
            Boolean: Boolean,
            Array: Array,
            Object: Object
          };
          
          return this.safeEval(expression, context);
        } catch (error) {
          console.error(`Error evaluating expression "${expression}":`, error);
          return '';
        }
      }

      safeExpressionEval(expression) {
        // Safer expression evaluation without Function constructor
        const trimmed = expression.trim();
        
        // Handle simple property access
        if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(trimmed)) {
          return this.getNestedProperty(trimmed);
        }
        
        // Handle simple arithmetic and comparisons
        if (/^[a-zA-Z0-9_. +\-*/()%<>=!&|]+$/.test(trimmed)) {
          try {
            // Replace property names with values
            let evaluated = trimmed;
            const propertyRegex = /[a-zA-Z_][a-zA-Z0-9_.]*/g;
            
            evaluated = evaluated.replace(propertyRegex, (match) => {
              const value = this.getNestedProperty(match);
              return typeof value === 'string' ? `"${value}"` : String(value);
            });
            
            // Use Function constructor as last resort (if allowed)
            if (this.compiler.options.allowUnsafeEval) {
              return new Function(`return ${evaluated}`)();
            }
          } catch (error) {
            console.warn(`Safe evaluation failed for: ${expression}`);
          }
        }
        
        // Fallback: return the property value if it exists
        return this.getNestedProperty(trimmed) || '';
      }

      getNestedProperty(path) {
        const properties = path.split('.');
        let value = { ...this.state.data, ...this.props };
        
        for (const prop of properties) {
          if (value && typeof value === 'object' && prop in value) {
            value = value[prop];
          } else {
            return undefined;
          }
        }
        
        return value;
      }

      safeEval(expression, context) {
        // Validate expression for security
        if (this.compiler.options.strictMode) {
          this.validateExpression(expression);
        }
        
        const contextKeys = Object.keys(context);
        const contextValues = Object.values(context);
        
        try {
          // Create function in restricted scope
          const func = new Function(...contextKeys, `
            "use strict";
            return ${expression};
          `);
          return func.apply(null, contextValues);
        } catch (error) {
          console.error('Expression evaluation error:', error);
          return '';
        }
      }

      validateExpression(expression) {
        // Block dangerous patterns
        const dangerousPatterns = [
          /eval\s*\(/i,
          /function\s*\(/i,
          /constructor/i,
          /prototype/i,
          /window/i,
          /document/i,
          /global/i,
          /process/i,
          /require/i,
          /import/i,
          /fetch/i,
          /XMLHttpRequest/i,
          /setTimeout/i,
          /setInterval/i
        ];
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(expression)) {
            throw new Error(`Dangerous expression detected: ${expression}`);
          }
        }
      }

      attachEventListeners() {
        if (!this.ast.template) return;
        
        for (const event of this.ast.template.events) {
          // Find elements that should have this event
          const elements = this.shadowRoot.querySelectorAll('*');
          
          for (const element of elements) {
            // Check if this element had the event binding in the original template
            const originalHtml = this.ast.template.html;
            const elementTag = element.tagName.toLowerCase();
            
            // Simple heuristic: if the event was on this type of element
            if (originalHtml.includes(`<${elementTag}`) && originalHtml.includes(event.binding)) {
              element.addEventListener(event.event, (e) => {
                this.handleEvent(e, event.handler);
              });
            }
          }
        }
      }

      async handleEvent(event, handler) {
        try {
          // Prevent default if specified
          if (handler.includes('preventDefault')) {
            event.preventDefault();
            handler = handler.replace(/\.preventDefault\(\)\s*;?\s*/, '');
          }
          
          // Stop propagation if specified
          if (handler.includes('stopPropagation')) {
            event.stopPropagation();
            handler = handler.replace(/\.stopPropagation\(\)\s*;?\s*/, '');
          }
          
          // Rate limiting for event handlers
          if (this.lastEventTime && (Date.now() - this.lastEventTime) < 16) {
            return; // Throttle to ~60fps
          }
          this.lastEventTime = Date.now();
          
          // Parse and execute the event handler safely
          await this.executeEventHandler(handler, event);
          
        } catch (error) {
          console.error(`Error handling event "${handler}":`, error);
          this.handleComponentError(error);
        }
      }

      async executeEventHandler(handler, event) {
        // Handle increment/decrement operations
        if (handler.includes('++')) {
          const variable = handler.replace('++', '').trim();
          if (this.state.data.hasOwnProperty(variable)) {
            const currentValue = this.state.data[variable];
            if (typeof currentValue === 'number') {
              await this.state.update(variable, currentValue + 1);
            }
          }
          return;
        }
        
        if (handler.includes('--')) {
          const variable = handler.replace('--', '').trim();
          if (this.state.data.hasOwnProperty(variable)) {
            const currentValue = this.state.data[variable];
            if (typeof currentValue === 'number') {
              await this.state.update(variable, currentValue - 1);
            }
          }
          return;
        }
        
        // Handle assignment operations
        if (handler.includes('=') && !handler.includes('==') && !handler.includes('!=')) {
          const [variable, value] = handler.split('=').map(s => s.trim());
          if (this.state.data.hasOwnProperty(variable)) {
            const evaluatedValue = this.evaluateExpressionWithEvent(value, event);
            await this.state.update(variable, evaluatedValue);
          }
          return;
        }
        
        // Handle method calls and complex expressions
        this.evaluateExpressionWithEvent(handler, event);
      }

      evaluateExpressionWithEvent(expression, event) {
        // Add event object to evaluation context
        const context = {
          ...this.state.data,
          ...this.props,
          event,
          target: event?.target,
          value: event?.target?.value,
          checked: event?.target?.checked,
          // Add useful methods
          console: {
            log: (...args) => console.log(`[${this.componentName}]`, ...args),
            warn: (...args) => console.warn(`[${this.componentName}]`, ...args),
            error: (...args) => console.error(`[${this.componentName}]`, ...args)
          }
        };
        
        return this.safeEval(expression, context);
      }

      // Utility methods
      sanitizeComponentName(name) {
        if (!name) return 'ezui-component';
        return name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      }

      kebabCase(str) {
        return str.replace(/([A-Z])/g, '-$1').toLowerCase();
      }

      escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Lifecycle hooks (can be overridden)
      onMount() {}
      onUnmount() {}
      
      // Performance and memory management
      getMetrics() {
        return {
          ...this.metrics,
          averageRenderTime: this.metrics.totalRenderTime / (this.metrics.renderCount || 1),
          memoryUsage: this.estimateMemoryUsage()
        };
      }

      estimateMemoryUsage() {
        // Rough estimation of component memory usage
        const stateSize = JSON.stringify(this.state.data).length;
        const domSize = this.shadowRoot.innerHTML.length;
        return stateSize + domSize;
      }

      // Cleanup and destruction
      destroy() {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;
        
        // Cleanup state
        if (this.state) {
          this.state.destroy();
        }
        
        // Clear shadow DOM
        if (this.shadowRoot) {
          this.shadowRoot.innerHTML = '';
        }
        
        // Clear properties
        this.renderQueue = [];
        this.errorBoundary = null;
        
        // Call cleanup lifecycle
        if (this.onUnmount) {
          this.onUnmount();
        }
      }

      // Custom element lifecycle with error handling
      connectedCallback() {
        try {
          if (!this.shadowRoot.innerHTML && !this.isDestroyed) {
            this.mount();
          }
        } catch (error) {
          this.handleComponentError(error);
        }
      }
      
      disconnectedCallback() {
        try {
          this.destroy();
        } catch (error) {
          console.error('Error during component cleanup:', error);
        }
      }
      
      attributeChangedCallback(name, oldValue, newValue) {
        try {
          // Handle attribute changes as prop updates with validation
          if (this.props.hasOwnProperty(name) && oldValue !== newValue) {
            // Type coercion for common types
            let coercedValue = newValue;
            
            if (newValue === 'true') coercedValue = true;
            else if (newValue === 'false') coercedValue = false;
            else if (!isNaN(newValue) && newValue !== '') coercedValue = Number(newValue);
            
            this.props[name] = coercedValue;
            this.scheduleRender();
          }
        } catch (error) {
          this.handleComponentError(error);
        }
      }
      
      static get observedAttributes() {
        // Return list of attributes to observe based on AST props
        return ast.props ? Object.keys(ast.props) : [];
      }
    };
  }

  // Compiler utility methods
  getCompilationErrors() {
    return [...this.compilationErrors];
  }

  clearErrors() {
    this.compilationErrors = [];
  }

  // Security and validation utilities
  static createSecureCompiler() {
    return new EZUICompiler({
      strictMode: true,
      sanitizeHtml: true,
      allowUnsafeEval: false,
      enableCSP: true
    });
  }

  static createDevelopmentCompiler() {
    return new EZUICompiler({
      strictMode: false,
      sanitizeHtml: false,
      allowUnsafeEval: true,
      enableCSP: false,
      maxRenderDepth: 1000
    });
  }
}