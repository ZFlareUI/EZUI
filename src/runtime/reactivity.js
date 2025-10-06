/**
 * EZUI Reactive State System
 * Provides reactive data binding for component state
 */

export class ReactiveState {
  constructor(initialState = {}) {
    this.data = { ...initialState };
    this.listeners = new Set();
    this.computedCache = new Map();
    this.dependencies = new Map();
    this.initialState = { ...initialState };
    this.validation = new Map();
    this.middleware = [];
    this.history = [];
    this.maxHistorySize = 50;
    this.isDebugMode = false;
    
    // Performance optimizations
    this.batchedUpdates = new Set();
    this.updateScheduled = false;
    
    // Deep cloning support
    this._cloneDeep = (obj) => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (obj instanceof Date) return new Date(obj.getTime());
      if (obj instanceof Array) return obj.map(item => this._cloneDeep(item));
      if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            clonedObj[key] = this._cloneDeep(obj[key]);
          }
        }
        return clonedObj;
      }
      return obj;
    };
  }

  createProxy() {
    return new Proxy(this.data, {
      get: (target, property) => {
        // Track dependencies for computed properties
        if (this.currentComputed) {
          if (!this.dependencies.has(this.currentComputed)) {
            this.dependencies.set(this.currentComputed, new Set());
          }
          this.dependencies.get(this.currentComputed).add(property);
        }
        
        return target[property];
      },
      
      set: (target, property, value) => {
        const oldValue = target[property];
        
        if (oldValue !== value) {
          target[property] = value;
          this.notifyListeners(property, value, oldValue);
          this.invalidateComputedProperties(property);
        }
        
        return true;
      }
    });
  }

  // Validation system
  addValidation(property, validator, errorMessage) {
    if (!this.validation.has(property)) {
      this.validation.set(property, []);
    }
    this.validation.get(property).push({ validator, errorMessage });
  }

  validateProperty(property, value) {
    const validators = this.validation.get(property);
    if (!validators) return { valid: true };
    
    for (const { validator, errorMessage } of validators) {
      try {
        if (!validator(value)) {
          return { valid: false, error: errorMessage };
        }
      } catch (error) {
        return { valid: false, error: `Validation error: ${error.message}` };
      }
    }
    return { valid: true };
  }

  // Middleware system for state changes
  addMiddleware(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middleware.push(middleware);
  }

  async applyMiddleware(property, value, oldValue) {
    let processedValue = value;
    
    for (const middleware of this.middleware) {
      try {
        const result = await middleware(property, processedValue, oldValue, this.data);
        if (result !== undefined) {
          processedValue = result;
        }
      } catch (error) {
        console.error('Middleware error:', error);
        throw error;
      }
    }
    
    return processedValue;
  }

  // Update a specific property with validation and middleware
  async update(property, value) {
    try {
      // Validate the new value
      const validation = this.validateProperty(property, value);
      if (!validation.valid) {
        throw new Error(`Validation failed for ${property}: ${validation.error}`);
      }

      const oldValue = this.data[property];
      
      // Apply middleware
      const processedValue = await this.applyMiddleware(property, value, oldValue);
      
      // Store history
      if (this.history.length >= this.maxHistorySize) {
        this.history.shift();
      }
      this.history.push({
        property,
        oldValue: this._cloneDeep(oldValue),
        newValue: this._cloneDeep(processedValue),
        timestamp: Date.now()
      });

      // Update data
      this.data[property] = processedValue;
      
      // Batch updates for performance
      this.batchedUpdates.add({ property, value: processedValue, oldValue });
      this.scheduleUpdate();
      
    } catch (error) {
      if (this.isDebugMode) {
        console.error(`State update failed for ${property}:`, error);
      }
      throw error;
    }
  }

  // Batch update multiple properties
  updateBatch(updates) {
    const changedProperties = [];
    
    for (const [property, value] of Object.entries(updates)) {
      const oldValue = this.data[property];
      if (oldValue !== value) {
        this.data[property] = value;
        changedProperties.push({ property, value, oldValue });
      }
    }
    
    if (changedProperties.length > 0) {
      this.notifyListeners(changedProperties);
    }
  }

  // Subscribe to state changes
  onChange(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners of state changes
  notifyListeners(property, value, oldValue) {
    const changeInfo = Array.isArray(property) 
      ? property 
      : [{ property, value, oldValue }];
    
    // Use microtask to batch updates
    Promise.resolve().then(() => {
      for (const listener of this.listeners) {
        try {
          listener(this.data, changeInfo);
        } catch (error) {
          console.error('Error in state change listener:', error);
        }
      }
    });
  }

  // Computed properties
  computed(name, computeFn) {
    Object.defineProperty(this.data, name, {
      get: () => {
        if (this.computedCache.has(name)) {
          return this.computedCache.get(name);
        }
        
        this.currentComputed = name;
        const value = computeFn();
        this.currentComputed = null;
        
        this.computedCache.set(name, value);
        return value;
      },
      enumerable: true,
      configurable: true
    });
  }

  invalidateComputedProperties(changedProperty) {
    for (const [computedName, deps] of this.dependencies.entries()) {
      if (deps.has(changedProperty)) {
        this.computedCache.delete(computedName);
      }
    }
  }

  // Watchers for specific properties
  watch(property, callback) {
    const listener = (state, changes) => {
      const change = changes.find(c => c.property === property);
      if (change) {
        callback(change.value, change.oldValue);
      }
    };
    
    return this.onChange(listener);
  }

  // Get current state snapshot
  getSnapshot() {
    return { ...this.data };
  }

  // Reset state to initial values
  reset() {
    const changes = [];
    
    for (const [property, value] of Object.entries(this.initialState)) {
      const oldValue = this.data[property];
      if (oldValue !== value) {
        this.data[property] = value;
        changes.push({ property, value, oldValue });
      }
    }
    
    if (changes.length > 0) {
      this.notifyListeners(changes);
    }
  }

  // Performance optimization: batch updates
  scheduleUpdate() {
    if (this.updateScheduled) return;
    
    this.updateScheduled = true;
    
    // Use microtask for batching
    Promise.resolve().then(() => {
      this.flushUpdates();
    });
  }

  flushUpdates() {
    if (this.batchedUpdates.size === 0) return;
    
    const updates = Array.from(this.batchedUpdates);
    this.batchedUpdates.clear();
    this.updateScheduled = false;
    
    // Notify listeners with batched updates
    for (const listener of this.listeners) {
      try {
        listener(this.data, updates);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    }
    
    // Invalidate computed properties
    for (const update of updates) {
      this.invalidateComputedProperties(update.property);
    }
  }

  // Transaction support for atomic updates
  transaction(updateFn) {
    const originalData = this._cloneDeep(this.data);
    const updates = [];
    
    try {
      // Temporarily collect updates
      const originalUpdate = this.update.bind(this);
      this.update = (property, value) => {
        updates.push({ property, value, oldValue: this.data[property] });
        this.data[property] = value;
      };
      
      updateFn(this.data);
      
      // Restore original update method
      this.update = originalUpdate;
      
      // Apply all updates atomically
      const batchUpdate = {};
      for (const update of updates) {
        batchUpdate[update.property] = update.value;
      }
      
      return this.updateBatch(batchUpdate);
      
    } catch (error) {
      // Rollback on error
      this.data = originalData;
      throw error;
    }
  }

  // Undo/Redo functionality
  undo() {
    if (this.history.length === 0) return false;
    
    const lastChange = this.history.pop();
    this.data[lastChange.property] = lastChange.oldValue;
    this.notifyListeners([{
      property: lastChange.property,
      value: lastChange.oldValue,
      oldValue: lastChange.newValue
    }]);
    
    return true;
  }

  canUndo() {
    return this.history.length > 0;
  }

  clearHistory() {
    this.history = [];
  }

  // Performance monitoring
  getPerformanceMetrics() {
    return {
      listenerCount: this.listeners.size,
      computedPropertiesCount: this.computedCache.size,
      dependenciesCount: this.dependencies.size,
      historySize: this.history.length,
      validationRules: this.validation.size,
      middlewareCount: this.middleware.length
    };
  }

  // Debug utilities
  enableDebugMode(enabled = true) {
    this.isDebugMode = enabled;
    if (enabled) {
      console.log('ReactiveState debug mode enabled');
    }
  }

  debugInfo() {
    return {
      data: this._cloneDeep(this.data),
      history: [...this.history],
      metrics: this.getPerformanceMetrics(),
      computedCache: Object.fromEntries(this.computedCache),
      dependencies: Object.fromEntries(this.dependencies)
    };
  }

  // Memory management and cleanup
  destroy() {
    this.listeners.clear();
    this.computedCache.clear();
    this.dependencies.clear();
    this.validation.clear();
    this.middleware.length = 0;
    this.history.length = 0;
    this.batchedUpdates.clear();
    this.updateScheduled = false;
  }
}

// Helper function to create reactive state
export function createState(initialState) {
  return new ReactiveState(initialState);
}

// Helper function for reactive effects
export function createEffect(effectFn, dependencies = []) {
  let cleanup;
  
  const runEffect = () => {
    if (cleanup) {
      cleanup();
    }
    cleanup = effectFn();
  };
  
  // Run effect initially
  runEffect();
  
  // Re-run effect when dependencies change
  if (dependencies.length > 0) {
    dependencies.forEach(state => {
      if (state instanceof ReactiveState) {
        state.onChange(runEffect);
      }
    });
  }
  
  // Return cleanup function
  return () => {
    if (cleanup) {
      cleanup();
    }
  };
}