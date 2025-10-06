/**
 * EZUI DOM Utilities
 * Helper functions for DOM manipulation and component lifecycle
 */

export class DOMUtils {
  // Create element with attributes and content
  static createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    for (const [key, value] of Object.entries(attributes)) {
      if (key.startsWith('on') && typeof value === 'function') {
        // Event listener
        const event = key.slice(2).toLowerCase();
        element.addEventListener(event, value);
      } else if (key === 'className') {
        element.className = value;
      } else if (key === 'innerHTML') {
        element.innerHTML = value;
      } else {
        element.setAttribute(key, value);
      }
    }
    
    if (content) {
      element.innerHTML = content;
    }
    
    return element;
  }

  // Safe HTML parsing with script removal
  static parseHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    
    // Remove any script tags for security
    const scripts = template.content.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    return template.content;
  }

  // Find components in a DOM tree
  static findComponents(root, componentNames = []) {
    const components = [];
    const selector = componentNames.length > 0 
      ? componentNames.join(', ')
      : '*';
    
    const elements = root.querySelectorAll(selector);
    
    for (const element of elements) {
      if (element._ezuiComponent) {
        components.push({
          element,
          instance: element._ezuiComponent,
          name: element.tagName.toLowerCase()
        });
      }
    }
    
    return components;
  }

  // Batch DOM updates
  static batchUpdates(updateFn) {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(updateFn);
    } else {
      // Fallback for environments without requestAnimationFrame
      setTimeout(updateFn, 16);
    }
  }

  // Create scoped CSS
  static createScopedCSS(css, scopeId) {
    const style = document.createElement('style');
    style.textContent = css;
    style.setAttribute('data-scope', scopeId);
    return style;
  }

  // Generate unique IDs
  static generateId(prefix = 'ezui') {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}-${Date.now().toString(36)}`;
  }

  // Escape HTML for safe insertion
  static escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Unescape HTML entities
  static unescapeHTML(html) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
  }

  // Deep clone DOM node
  static cloneNode(node, deep = true) {
    const clone = node.cloneNode(deep);
    
    // Preserve event listeners if needed
    if (node._ezuiEvents) {
      clone._ezuiEvents = { ...node._ezuiEvents };
    }
    
    return clone;
  }

  // Measure element dimensions
  static measureElement(element) {
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      marginTop: parseFloat(computedStyle.marginTop),
      marginRight: parseFloat(computedStyle.marginRight),
      marginBottom: parseFloat(computedStyle.marginBottom),
      marginLeft: parseFloat(computedStyle.marginLeft)
    };
  }

  // Check if element is in viewport
  static isInViewport(element, threshold = 0) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    return (
      rect.top >= -threshold &&
      rect.left >= -threshold &&
      rect.bottom <= windowHeight + threshold &&
      rect.right <= windowWidth + threshold
    );
  }

  // Animate element properties
  static animate(element, properties, duration = 300, easing = 'ease') {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const startValues = {};
      
      // Get initial values
      for (const prop in properties) {
        startValues[prop] = parseFloat(getComputedStyle(element)[prop]) || 0;
      }
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Apply easing
        const easedProgress = this.easing[easing] 
          ? this.easing[easing](progress)
          : progress;
        
        // Update properties
        for (const prop in properties) {
          const start = startValues[prop];
          const end = properties[prop];
          const current = start + (end - start) * easedProgress;
          
          element.style[prop] = `${current}px`;
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }

  // Easing functions
  static easing = {
    linear: (t) => t,
    easeIn: (t) => t * t,
    easeOut: (t) => t * (2 - t),
    easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  };

  // Event delegation helper
  static delegate(parent, selector, event, handler) {
    parent.addEventListener(event, (e) => {
      if (e.target.matches(selector)) {
        handler(e);
      }
    });
  }

  // Debounce function calls
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle function calls
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Observer utilities
  static createIntersectionObserver(callback, options = {}) {
    const defaultOptions = {
      threshold: 0.1,
      rootMargin: '0px'
    };
    
    return new IntersectionObserver(callback, { ...defaultOptions, ...options });
  }

  static createResizeObserver(callback) {
    if (typeof ResizeObserver !== 'undefined') {
      return new ResizeObserver(callback);
    } else {
      // Fallback for browsers without ResizeObserver
      console.warn('ResizeObserver not supported, falling back to window resize');
      window.addEventListener('resize', this.debounce(callback, 100));
      return null;
    }
  }

  // CSS custom properties helpers
  static setCSSProperty(element, property, value) {
    element.style.setProperty(`--${property}`, value);
  }

  static getCSSProperty(element, property) {
    return getComputedStyle(element).getPropertyValue(`--${property}`);
  }

  // Focus management
  static trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    });
    
    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }
  }
}