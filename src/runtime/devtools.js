/**
 * EZUI Development Tools and Utilities
 * Comprehensive development aids for debugging, profiling, and monitoring
 */

export class EZUIDevTools {
  constructor(options = {}) {
    this.options = {
      enabled: process.env.NODE_ENV !== 'production',
      enableProfiler: true,
      enableInspector: true,
      enableHotReload: true,
      enableDebugPanel: true,
      enablePerformanceMonitor: true,
      ...options
    };
    
    this.components = new Map();
    this.stateSnapshots = [];
    this.performanceEntries = [];
    this.renderTimes = new Map();
    
    if (this.options.enabled) {
      this.initialize();
    }
  }

  initialize() {
    console.log('EZUI Dev Tools initialized');
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Create debug panel
    if (this.options.enableDebugPanel) {
      this.createDebugPanel();
    }
    
    // Setup performance monitoring
    if (this.options.enablePerformanceMonitor) {
      this.setupPerformanceMonitoring();
    }
    
    // Setup hot reload
    if (this.options.enableHotReload) {
      this.setupHotReload();
    }
    
    // Add global debug helpers
    this.addGlobalHelpers();
  }

  // Component registration and tracking
  registerComponent(component, metadata = {}) {
    const id = this.generateComponentId(component);
    
    this.components.set(id, {
      component,
      metadata: {
        name: component.constructor.name,
        created: Date.now(),
        renders: 0,
        lastRender: null,
        errors: [],
        ...metadata
      }
    });
    
    this.instrumentComponent(component, id);
    
    console.log(`Component registered: ${component.constructor.name}`, { id, metadata });
    
    return id;
  }

  unregisterComponent(componentId) {
    if (this.components.has(componentId)) {
      const { metadata } = this.components.get(componentId);
      console.log(`Component unregistered: ${metadata.name}`, { componentId });
      this.components.delete(componentId);
    }
  }

  instrumentComponent(component, id) {
    // Wrap render method
    if (component.render) {
      const originalRender = component.render.bind(component);
      component.render = (...args) => {
        const startTime = performance.now();
        
        try {
          const result = originalRender(...args);
          
          const endTime = performance.now();
          const renderTime = endTime - startTime;
          
          this.recordRender(id, renderTime);
          
          return result;
        } catch (error) {
          this.recordError(id, error, 'render');
          throw error;
        }
      };
    }
    
    // Wrap state updates
    if (component.state && component.state.set) {
      const originalSet = component.state.set.bind(component.state);
      component.state.set = (key, value) => {
        const oldValue = component.state.get(key);
        
        this.recordStateChange(id, key, oldValue, value);
        
        return originalSet(key, value);
      };
    }
  }

  recordRender(componentId, renderTime) {
    if (this.components.has(componentId)) {
      const componentData = this.components.get(componentId);
      componentData.metadata.renders++;
      componentData.metadata.lastRender = Date.now();
      
      this.renderTimes.set(componentId, renderTime);
      
      if (renderTime > 16) { // More than one frame
        console.warn(`Slow render detected: ${componentData.metadata.name} took ${renderTime.toFixed(2)}ms`);
      }
    }
  }

  recordError(componentId, error, context) {
    if (this.components.has(componentId)) {
      const componentData = this.components.get(componentId);
      componentData.metadata.errors.push({
        error: error.message,
        stack: error.stack,
        context,
        timestamp: Date.now()
      });
      
      console.error(`Component error in ${componentData.metadata.name}:`, error);
    }
  }

  recordStateChange(componentId, key, oldValue, newValue) {
    const snapshot = {
      componentId,
      timestamp: Date.now(),
      key,
      oldValue: this.deepClone(oldValue),
      newValue: this.deepClone(newValue)
    };
    
    this.stateSnapshots.push(snapshot);
    
    // Keep only last 100 snapshots
    if (this.stateSnapshots.length > 100) {
      this.stateSnapshots.shift();
    }
    
    console.log(`State change in component ${componentId}:`, {
      key,
      oldValue,
      newValue
    });
  }

  // Debug panel creation
  createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'ezui-debug-panel';
    panel.innerHTML = `
      <div class="ezui-debug-header">
        <h3>EZUI Dev Tools</h3>
        <button class="ezui-debug-close">×</button>
      </div>
      <div class="ezui-debug-content">
        <div class="ezui-debug-tabs">
          <button class="ezui-debug-tab active" data-tab="components">Components</button>
          <button class="ezui-debug-tab" data-tab="state">State</button>
          <button class="ezui-debug-tab" data-tab="performance">Performance</button>
          <button class="ezui-debug-tab" data-tab="console">Console</button>
        </div>
        <div class="ezui-debug-panels">
          <div class="ezui-debug-panel active" id="ezui-debug-components"></div>
          <div class="ezui-debug-panel" id="ezui-debug-state"></div>
          <div class="ezui-debug-panel" id="ezui-debug-performance"></div>
          <div class="ezui-debug-panel" id="ezui-debug-console"></div>
        </div>
      </div>
    `;
    
    this.addDebugStyles();
    
    // Position panel
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 400px;
      height: 500px;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      z-index: 10000;
      color: #fff;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      display: none;
    `;
    
    document.body.appendChild(panel);
    
    // Setup panel interactions
    this.setupPanelInteractions(panel);
    
    // Update panel content periodically
    setInterval(() => this.updateDebugPanel(), 1000);
  }

  addDebugStyles() {
    if (document.getElementById('ezui-debug-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'ezui-debug-styles';
    styles.textContent = `
      .ezui-debug-header {
        padding: 10px;
        background: #2d2d2d;
        border-bottom: 1px solid #444;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .ezui-debug-header h3 {
        margin: 0;
        font-size: 14px;
        color: #61dafb;
      }
      
      .ezui-debug-close {
        background: none;
        border: none;
        color: #fff;
        font-size: 16px;
        cursor: pointer;
      }
      
      .ezui-debug-close:hover {
        color: #ff4757;
      }
      
      .ezui-debug-content {
        height: calc(100% - 40px);
        display: flex;
        flex-direction: column;
      }
      
      .ezui-debug-tabs {
        display: flex;
        background: #2d2d2d;
        border-bottom: 1px solid #444;
      }
      
      .ezui-debug-tab {
        flex: 1;
        padding: 8px;
        background: none;
        border: none;
        color: #ccc;
        cursor: pointer;
        font-size: 11px;
      }
      
      .ezui-debug-tab.active {
        color: #61dafb;
        background: #1a1a1a;
      }
      
      .ezui-debug-tab:hover {
        background: #333;
      }
      
      .ezui-debug-panels {
        flex: 1;
        overflow: auto;
      }
      
      .ezui-debug-panel {
        padding: 10px;
        display: none;
        height: 100%;
        overflow-y: auto;
      }
      
      .ezui-debug-panel.active {
        display: block;
      }
      
      .ezui-component-item {
        padding: 8px;
        margin: 4px 0;
        background: #2d2d2d;
        border-radius: 4px;
        border-left: 3px solid #61dafb;
      }
      
      .ezui-component-name {
        font-weight: bold;
        color: #61dafb;
      }
      
      .ezui-component-stats {
        font-size: 10px;
        color: #888;
        margin-top: 4px;
      }
      
      .ezui-state-item {
        padding: 6px;
        margin: 2px 0;
        background: #2d2d2d;
        border-radius: 3px;
        font-size: 10px;
      }
      
      .ezui-state-key {
        color: #ffa502;
        font-weight: bold;
      }
      
      .ezui-state-value {
        color: #7bed9f;
      }
      
      .ezui-perf-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid #333;
      }
      
      .ezui-perf-metric {
        color: #ff6b6b;
      }
    `;
    
    document.head.appendChild(styles);
  }

  setupPanelInteractions(panel) {
    // Close button
    panel.querySelector('.ezui-debug-close').onclick = () => {
      panel.style.display = 'none';
    };
    
    // Tab switching
    const tabs = panel.querySelectorAll('.ezui-debug-tab');
    const panels = panel.querySelectorAll('.ezui-debug-panel');
    
    tabs.forEach(tab => {
      tab.onclick = () => {
        // Remove active class from all
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked
        tab.classList.add('active');
        document.getElementById(`ezui-debug-${tab.dataset.tab}`).classList.add('active');
      };
    });
    
    // Make panel draggable
    this.makeDraggable(panel, panel.querySelector('.ezui-debug-header'));
  }

  makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    handle.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      const newTop = element.offsetTop - pos2;
      const newLeft = element.offsetLeft - pos1;
      
      element.style.top = Math.max(0, Math.min(window.innerHeight - element.offsetHeight, newTop)) + "px";
      element.style.left = Math.max(0, Math.min(window.innerWidth - element.offsetWidth, newLeft)) + "px";
      element.style.bottom = 'auto';
      element.style.right = 'auto';
    }
    
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  updateDebugPanel() {
    const panel = document.getElementById('ezui-debug-panel');
    if (!panel || panel.style.display === 'none') return;
    
    // Update components panel
    this.updateComponentsPanel();
    
    // Update state panel
    this.updateStatePanel();
    
    // Update performance panel
    this.updatePerformancePanel();
  }

  updateComponentsPanel() {
    const container = document.getElementById('ezui-debug-components');
    if (!container) return;
    
    const components = Array.from(this.components.entries());
    
    container.innerHTML = components.map(([id, data]) => {
      const { component, metadata } = data;
      const renderTime = this.renderTimes.get(id) || 0;
      
      return `
        <div class="ezui-component-item">
          <div class="ezui-component-name">${metadata.name}</div>
          <div class="ezui-component-stats">
            Renders: ${metadata.renders} | 
            Last: ${renderTime.toFixed(2)}ms |
            Errors: ${metadata.errors.length}
          </div>
        </div>
      `;
    }).join('');
  }

  updateStatePanel() {
    const container = document.getElementById('ezui-debug-state');
    if (!container) return;
    
    const recent = this.stateSnapshots.slice(-20).reverse();
    
    container.innerHTML = recent.map(snapshot => `
      <div class="ezui-state-item">
        <div><span class="ezui-state-key">${snapshot.key}:</span></div>
        <div>Old: <span class="ezui-state-value">${JSON.stringify(snapshot.oldValue)}</span></div>
        <div>New: <span class="ezui-state-value">${JSON.stringify(snapshot.newValue)}</span></div>
        <div style="font-size: 9px; color: #666;">${new Date(snapshot.timestamp).toLocaleTimeString()}</div>
      </div>
    `).join('');
  }

  updatePerformancePanel() {
    const container = document.getElementById('ezui-debug-performance');
    if (!container) return;
    
    const memory = this.getMemoryUsage();
    const avgRenderTime = this.getAverageRenderTime();
    
    container.innerHTML = `
      <div class="ezui-perf-item">
        <span>Memory Usage:</span>
        <span class="ezui-perf-metric">${memory ? `${memory.used}MB / ${memory.total}MB` : 'N/A'}</span>
      </div>
      <div class="ezui-perf-item">
        <span>Avg Render Time:</span>
        <span class="ezui-perf-metric">${avgRenderTime.toFixed(2)}ms</span>
      </div>
      <div class="ezui-perf-item">
        <span>Total Components:</span>
        <span class="ezui-perf-metric">${this.components.size}</span>
      </div>
      <div class="ezui-perf-item">
        <span>State Changes:</span>
        <span class="ezui-perf-metric">${this.stateSnapshots.length}</span>
      </div>
    `;
  }

  // Keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+D to toggle debug panel
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleDebugPanel();
      }
      
      // Ctrl+Shift+C to log component tree
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.logComponentTree();
      }
      
      // Ctrl+Shift+S to log state snapshots
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        this.logStateSnapshots();
      }
    });
  }

  toggleDebugPanel() {
    const panel = document.getElementById('ezui-debug-panel');
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  }

  // Performance monitoring
  setupPerformanceMonitoring() {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn('Long task detected:', {
              duration: entry.duration,
              name: entry.name,
              startTime: entry.startTime
            });
          }
        });
      });
      
      observer.observe({ entryTypes: ['longtask'] });
    }
    
    // Monitor memory usage
    setInterval(() => {
      const memory = this.getMemoryUsage();
      if (memory && memory.used > memory.limit * 0.8) {
        console.warn('High memory usage detected:', memory);
      }
    }, 10000);
  }

  // Hot reload
  setupHotReload() {
    if ('WebSocket' in window) {
      const ws = new WebSocket('ws://localhost:3001'); // Assuming dev server
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'reload') {
          console.log('Hot reloading...');
          window.location.reload();
        } else if (data.type === 'component-update') {
          console.log('Hot updating component:', data.component);
          // Component-specific hot reload logic would go here
        }
      };
      
      ws.onerror = () => {
        console.log('Hot reload server not available');
      };
    }
  }

  // Global helpers
  addGlobalHelpers() {
    window.EZUI = {
      devTools: this,
      inspect: (component) => this.inspectComponent(component),
      profile: (name, fn) => this.profileFunction(name, fn),
      logState: () => this.logStateSnapshots(),
      logComponents: () => this.logComponentTree(),
      clearLogs: () => console.clear(),
      exportDebugData: () => this.exportDebugData()
    };
    
    console.log('Global EZUI dev tools available: window.EZUI');
  }

  // Utility methods
  inspectComponent(component) {
    const entries = Array.from(this.components.entries());
    const entry = entries.find(([id, data]) => data.component === component);
    
    if (entry) {
      const [id, data] = entry;
      console.group(`Component: ${data.metadata.name}`);
      console.log('ID:', id);
      console.log('Metadata:', data.metadata);
      console.log('Component:', data.component);
      console.log('State:', data.component.state);
      console.groupEnd();
    } else {
      console.warn('Component not found in registry');
    }
  }

  profileFunction(name, fn) {
    return (...args) => {
      const startTime = performance.now();
      const result = fn.apply(this, args);
      const endTime = performance.now();
      
      console.log(`Profile: ${name} took ${(endTime - startTime).toFixed(2)}ms`);
      
      return result;
    };
  }

  logComponentTree() {
    console.group('Component Tree');
    this.components.forEach((data, id) => {
      console.log(`${data.metadata.name} (${id})`, {
        renders: data.metadata.renders,
        errors: data.metadata.errors.length,
        lastRender: data.metadata.lastRender
      });
    });
    console.groupEnd();
  }

  logStateSnapshots() {
    console.group('State Snapshots');
    this.stateSnapshots.slice(-10).forEach((snapshot, index) => {
      console.log(`${index + 1}. ${snapshot.key}:`, {
        old: snapshot.oldValue,
        new: snapshot.newValue,
        timestamp: new Date(snapshot.timestamp).toLocaleTimeString()
      });
    });
    console.groupEnd();
  }

  exportDebugData() {
    const data = {
      components: Array.from(this.components.entries()).map(([id, data]) => ({
        id,
        ...data.metadata
      })),
      stateSnapshots: this.stateSnapshots,
      performance: {
        renderTimes: Array.from(this.renderTimes.entries()),
        memory: this.getMemoryUsage(),
        averageRenderTime: this.getAverageRenderTime()
      },
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ezui-debug-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    console.log('Debug data exported');
  }

  // Helper methods
  generateComponentId(component) {
    return `${component.constructor.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  deepClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      return obj; // Return original if can't clone
    }
  }

  getMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }

  getAverageRenderTime() {
    const times = Array.from(this.renderTimes.values());
    return times.length > 0 
      ? times.reduce((sum, time) => sum + time, 0) / times.length 
      : 0;
  }
}

// Factory function
export function createDevTools(options = {}) {
  return new EZUIDevTools(options);
}

// Default instance (only in development)
export const devTools = new EZUIDevTools();