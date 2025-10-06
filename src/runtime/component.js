/**
 * EZUI Component Registry
 * Manages registration and lifecycle of EZUI components
 */

export class ComponentRegistry {
  constructor() {
    this.components = new Map();
    this.instances = new WeakMap();
    this.componentCount = 0;
  }

  register(name, componentClass) {
    const normalizedName = this.normalizeName(name);
    
    // Register as custom element if not already registered
    if (!customElements.get(normalizedName)) {
      customElements.define(normalizedName, componentClass);
    }
    
    this.components.set(normalizedName, {
      name: normalizedName,
      class: componentClass,
      instances: new Set(),
      registered: Date.now()
    });
    
    console.log(`Registered EZUI component: ${normalizedName}`);
  }

  get(name) {
    const normalizedName = this.normalizeName(name);
    const component = this.components.get(normalizedName);
    return component ? component.class : null;
  }

  has(name) {
    const normalizedName = this.normalizeName(name);
    return this.components.has(normalizedName);
  }

  unregister(name) {
    const normalizedName = this.normalizeName(name);
    const component = this.components.get(normalizedName);
    
    if (component) {
      // Clean up all instances
      for (const instance of component.instances) {
        this.destroyInstance(instance);
      }
      
      this.components.delete(normalizedName);
      console.log(`Unregistered component: ${normalizedName}`);
    }
  }

  createInstance(name, element) {
    const ComponentClass = this.get(name);
    
    if (!ComponentClass) {
      throw new Error(`Component "${name}" not found`);
    }
    
    const instance = new ComponentClass(element);
    
    // Track instance
    const component = this.components.get(this.normalizeName(name));
    if (component) {
      component.instances.add(instance);
    }
    
    this.instances.set(element, instance);
    this.componentCount++;
    
    return instance;
  }

  getInstance(element) {
    return this.instances.get(element);
  }

  destroyInstance(instance) {
    if (instance && instance.element) {
      // Call cleanup lifecycle
      if (instance.onUnmount) {
        instance.onUnmount();
      }
      
      // Remove from tracking
      const element = instance.element;
      this.instances.delete(element);
      
      // Remove from component instances
      for (const component of this.components.values()) {
        component.instances.delete(instance);
      }
      
      this.componentCount--;
    }
  }

  // Get all registered components
  list() {
    return Array.from(this.components.keys());
  }

  // Get component statistics
  getStats() {
    const stats = {
      totalComponents: this.components.size,
      totalInstances: this.componentCount,
      components: []
    };
    
    for (const [name, component] of this.components.entries()) {
      stats.components.push({
        name,
        instances: component.instances.size,
        registered: component.registered
      });
    }
    
    return stats;
  }

  // Hot reload support
  hotReload(name, newComponentClass) {
    const normalizedName = this.normalizeName(name);
    const component = this.components.get(normalizedName);
    
    if (component) {
      // Update the component class
      component.class = newComponentClass;
      
      // Reload all instances
      for (const instance of component.instances) {
        try {
          // Preserve state if possible
          const currentState = instance.state ? instance.state.getSnapshot() : {};
          
          // Create new instance with preserved state
          const newInstance = new newComponentClass(instance.element);
          if (newInstance.state && Object.keys(currentState).length > 0) {
            newInstance.state.updateBatch(currentState);
          }
          
          // Replace instance
          this.instances.set(instance.element, newInstance);
          newInstance.mount();
          
          console.log(`Hot reloaded instance of ${normalizedName}`);
        } catch (error) {
          console.error(`Failed to hot reload instance of ${normalizedName}:`, error);
        }
      }
    } else {
      // Register as new component
      this.register(name, newComponentClass);
    }
  }

  // Component communication
  emit(fromInstance, eventName, data) {
    const customEvent = new CustomEvent(`ezui:${eventName}`, {
      detail: { data, source: fromInstance },
      bubbles: true,
      composed: true
    });
    
    if (fromInstance.element) {
      fromInstance.element.dispatchEvent(customEvent);
    }
  }

  // Listen for component events
  on(element, eventName, handler) {
    const fullEventName = `ezui:${eventName}`;
    
    element.addEventListener(fullEventName, (event) => {
      handler(event.detail.data, event.detail.source);
    });
    
    return () => {
      element.removeEventListener(fullEventName, handler);
    };
  }

  // Find components by selector
  findComponents(selector) {
    const elements = document.querySelectorAll(selector);
    const components = [];
    
    for (const element of elements) {
      const instance = this.getInstance(element);
      if (instance) {
        components.push(instance);
      }
    }
    
    return components;
  }

  // Normalize component name for custom elements
  normalizeName(name) {
    if (!name) return 'ezui-component';
    
    // Ensure it follows custom element naming rules
    let normalized = name.toLowerCase();
    
    // Must contain a hyphen
    if (!normalized.includes('-')) {
      normalized = `ezui-${normalized}`;
    }
    
    // Replace invalid characters
    normalized = normalized.replace(/[^a-z0-9-]/g, '-');
    
    // Remove multiple consecutive hyphens
    normalized = normalized.replace(/-+/g, '-');
    
    // Remove leading/trailing hyphens
    normalized = normalized.replace(/^-+|-+$/g, '');
    
    // Ensure it starts with a letter
    if (!/^[a-z]/.test(normalized)) {
      normalized = `c-${normalized}`;
    }
    
    return normalized;
  }

  // Debug utilities
  debug() {
    console.group('EZUI Component Registry Debug');
    console.log('Stats:', this.getStats());
    console.log('Components:', this.components);
    console.log('Instances:', this.instances);
    console.groupEnd();
  }
}