/**
 * EZUI Testing Framework
 * Comprehensive testing utilities for components, state, and performance
 */

export class EZUITestRunner {
  constructor(options = {}) {
    this.options = {
      timeout: 5000,
      enableMocking: true,
      enableSnapshot: true,
      enableCoverage: false,
      autoCleanup: true,
      ...options
    };
    
    this.tests = [];
    this.suites = [];
    this.mocks = new Map();
    this.snapshots = new Map();
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };
    
    this.setupTestEnvironment();
  }

  setupTestEnvironment() {
    // Create test container
    if (!document.getElementById('ezui-test-container')) {
      const container = document.createElement('div');
      container.id = 'ezui-test-container';
      container.style.display = 'none';
      document.body.appendChild(container);
    }
    
    // Mock common browser APIs for testing
    if (this.options.enableMocking) {
      this.setupDefaultMocks();
    }
  }

  setupDefaultMocks() {
    // Mock fetch for API testing
    this.mockFetch();
    
    // Mock localStorage
    this.mockLocalStorage();
    
    // Mock timers
    this.mockTimers();
  }

  // Test definition methods
  describe(name, callback) {
    const suite = new TestSuite(name, this);
    this.suites.push(suite);
    
    const originalContext = this.currentSuite;
    this.currentSuite = suite;
    
    try {
      callback.call(suite);
    } finally {
      this.currentSuite = originalContext;
    }
    
    return suite;
  }

  it(description, testFn, options = {}) {
    const test = new Test(description, testFn, {
      ...this.options,
      ...options
    });
    
    if (this.currentSuite) {
      this.currentSuite.addTest(test);
    } else {
      this.tests.push(test);
    }
    
    return test;
  }

  beforeEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeEach = fn;
    }
  }

  afterEach(fn) {
    if (this.currentSuite) {
      this.afterEach = fn;
    }
  }

  // Component testing utilities
  async mountComponent(componentClass, props = {}, options = {}) {
    const container = options.container || document.getElementById('ezui-test-container');
    
    try {
      const component = new componentClass(props);
      await component.mount(container);
      
      return new ComponentWrapper(component, container, this);
    } catch (error) {
      throw new Error(`Failed to mount component: ${error.message}`);
    }
  }

  createMockElement(tagName = 'div', attributes = {}) {
    const element = document.createElement(tagName);
    
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    
    return element;
  }

  // State testing utilities
  createMockState(initialState = {}) {
    return new MockReactiveState(initialState);
  }

  // Assertion methods
  expect(actual) {
    return new Expectation(actual, this);
  }

  // Mock utilities
  mock(target, method) {
    const original = target[method];
    const mockFn = new MockFunction(original);
    
    target[method] = mockFn;
    
    this.mocks.set(`${target.constructor.name}.${method}`, {
      target,
      method,
      original,
      mock: mockFn
    });
    
    return mockFn;
  }

  spy(target, method) {
    const mock = this.mock(target, method);
    mock.callThrough();
    return mock;
  }

  mockFetch() {
    const originalFetch = window.fetch;
    const mockFetch = new MockFunction(originalFetch);
    
    window.fetch = mockFetch;
    
    this.mocks.set('window.fetch', {
      target: window,
      method: 'fetch',
      original: originalFetch,
      mock: mockFetch
    });
    
    return mockFetch;
  }

  mockLocalStorage() {
    const storage = {};
    
    const mockStorage = {
      getItem: jest.fn(key => storage[key] || null),
      setItem: jest.fn((key, value) => { storage[key] = value; }),
      removeItem: jest.fn(key => { delete storage[key]; }),
      clear: jest.fn(() => { Object.keys(storage).forEach(key => delete storage[key]); }),
      get length() { return Object.keys(storage).length; },
      key: jest.fn(index => Object.keys(storage)[index] || null)
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage
    });
    
    return mockStorage;
  }

  mockTimers() {
    this.originalSetTimeout = window.setTimeout;
    this.originalSetInterval = window.setInterval;
    this.originalClearTimeout = window.clearTimeout;
    this.originalClearInterval = window.clearInterval;
    
    this.timerQueue = [];
    this.currentTime = 0;
    
    window.setTimeout = (fn, delay) => {
      const id = this.timerQueue.length;
      this.timerQueue.push({
        id,
        fn,
        delay,
        type: 'timeout',
        scheduled: this.currentTime + delay
      });
      return id;
    };
    
    window.setInterval = (fn, delay) => {
      const id = this.timerQueue.length;
      this.timerQueue.push({
        id,
        fn,
        delay,
        type: 'interval',
        scheduled: this.currentTime + delay
      });
      return id;
    };
    
    window.clearTimeout = (id) => {
      const index = this.timerQueue.findIndex(timer => timer.id === id);
      if (index !== -1) {
        this.timerQueue.splice(index, 1);
      }
    };
    
    window.clearInterval = window.clearTimeout;
  }

  advanceTimers(time) {
    this.currentTime += time;
    
    const readyTimers = this.timerQueue.filter(timer => timer.scheduled <= this.currentTime);
    
    readyTimers.forEach(timer => {
      timer.fn();
      
      if (timer.type === 'interval') {
        timer.scheduled = this.currentTime + timer.delay;
      } else {
        const index = this.timerQueue.indexOf(timer);
        this.timerQueue.splice(index, 1);
      }
    });
  }

  // Test execution
  async run() {
    console.log('Running EZUI Tests...');
    
    const startTime = performance.now();
    
    // Run individual tests
    for (const test of this.tests) {
      await this.runTest(test);
    }
    
    // Run test suites
    for (const suite of this.suites) {
      await this.runSuite(suite);
    }
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    this.printResults(duration);
    
    if (this.options.autoCleanup) {
      this.cleanup();
    }
    
    return this.results;
  }

  async runTest(test) {
    try {
      console.log(`  PASS ${test.description}`);
      
      const result = await test.run();
      
      if (result.passed) {
        this.results.passed++;
      } else {
        this.results.failed++;
        console.error(`    FAIL ${result.error}`);
      }
    } catch (error) {
      this.results.failed++;
      console.error(`    FAIL Unexpected error: ${error.message}`);
    }
    
    this.results.total++;
  }

  async runSuite(suite) {
    console.log(`\n${suite.name}`);
    
    for (const test of suite.tests) {
      if (suite.beforeEach) {
        await suite.beforeEach();
      }
      
      await this.runTest(test);
      
      if (suite.afterEach) {
        await suite.afterEach();
      }
    }
  }

  printResults(duration) {
    console.log('\n' + '='.repeat(50));
    console.log('Test Results:');
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Skipped: ${this.results.skipped}`);
    console.log(`Total: ${this.results.total}`);
    console.log(`Duration: ${duration}ms`);
    console.log('='.repeat(50));
    
    if (this.results.failed > 0) {
      console.error(`FAILED: ${this.results.failed} test(s) failed`);
    } else {
      console.log('SUCCESS: All tests passed!');
    }
  }

  cleanup() {
    // Restore mocks
    this.mocks.forEach((mock, key) => {
      mock.target[mock.method] = mock.original;
    });
    this.mocks.clear();
    
    // Restore timers
    if (this.originalSetTimeout) {
      window.setTimeout = this.originalSetTimeout;
      window.setInterval = this.originalSetInterval;
      window.clearTimeout = this.originalClearTimeout;
      window.clearInterval = this.originalClearInterval;
    }
    
    // Clear test container
    const container = document.getElementById('ezui-test-container');
    if (container) {
      container.innerHTML = '';
    }
  }
}

class TestSuite {
  constructor(name, runner) {
    this.name = name;
    this.runner = runner;
    this.tests = [];
    this.beforeEach = null;
    this.afterEach = null;
  }

  addTest(test) {
    this.tests.push(test);
  }
}

class Test {
  constructor(description, fn, options) {
    this.description = description;
    this.fn = fn;
    this.options = options;
  }

  async run() {
    const startTime = performance.now();
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), this.options.timeout);
      });
      
      await Promise.race([
        this.fn(),
        timeoutPromise
      ]);
      
      const endTime = performance.now();
      
      return {
        passed: true,
        duration: endTime - startTime
      };
    } catch (error) {
      const endTime = performance.now();
      
      return {
        passed: false,
        error: error.message,
        duration: endTime - startTime
      };
    }
  }
}

class ComponentWrapper {
  constructor(component, container, runner) {
    this.component = component;
    this.container = container;
    this.runner = runner;
  }

  find(selector) {
    return this.container.querySelector(selector);
  }

  findAll(selector) {
    return Array.from(this.container.querySelectorAll(selector));
  }

  text() {
    return this.container.textContent;
  }

  html() {
    return this.container.innerHTML;
  }

  async trigger(eventName, options = {}) {
    const event = new Event(eventName, options);
    this.container.dispatchEvent(event);
    
    // Wait for any async updates
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  async setValue(selector, value) {
    const element = this.find(selector);
    if (element) {
      element.value = value;
      await this.trigger('input', { target: element });
    }
  }

  async click(selector) {
    const element = this.find(selector);
    if (element) {
      element.click();
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  getState(property) {
    return this.component.state ? this.component.state.get(property) : undefined;
  }

  async setState(property, value) {
    if (this.component.state) {
      this.component.state.set(property, value);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  unmount() {
    if (this.component.unmount) {
      this.component.unmount();
    }
    this.container.innerHTML = '';
  }
}

class MockReactiveState {
  constructor(initialState) {
    this.data = { ...initialState };
    this.listeners = new Map();
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    const oldValue = this.data[key];
    this.data[key] = value;
    
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(callback => {
        callback(value, oldValue);
      });
    }
  }

  on(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
  }

  off(key, callback) {
    if (this.listeners.has(key)) {
      const callbacks = this.listeners.get(key);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

class Expectation {
  constructor(actual, runner) {
    this.actual = actual;
    this.runner = runner;
  }

  toBe(expected) {
    if (this.actual !== expected) {
      throw new Error(`Expected ${this.actual} to be ${expected}`);
    }
    return this;
  }

  toEqual(expected) {
    if (JSON.stringify(this.actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} to equal ${JSON.stringify(expected)}`);
    }
    return this;
  }

  toBeTruthy() {
    if (!this.actual) {
      throw new Error(`Expected ${this.actual} to be truthy`);
    }
    return this;
  }

  toBeFalsy() {
    if (this.actual) {
      throw new Error(`Expected ${this.actual} to be falsy`);
    }
    return this;
  }

  toBeNull() {
    if (this.actual !== null) {
      throw new Error(`Expected ${this.actual} to be null`);
    }
    return this;
  }

  toBeUndefined() {
    if (this.actual !== undefined) {
      throw new Error(`Expected ${this.actual} to be undefined`);
    }
    return this;
  }

  toContain(item) {
    if (!this.actual.includes(item)) {
      throw new Error(`Expected ${this.actual} to contain ${item}`);
    }
    return this;
  }

  toThrow(expectedError) {
    try {
      this.actual();
      throw new Error(`Expected function to throw`);
    } catch (error) {
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(`Expected function to throw "${expectedError}", but got "${error.message}"`);
      }
    }
    return this;
  }

  async toResolve() {
    try {
      await this.actual;
    } catch (error) {
      throw new Error(`Expected promise to resolve, but it rejected with: ${error.message}`);
    }
    return this;
  }

  async toReject() {
    try {
      await this.actual;
      throw new Error(`Expected promise to reject, but it resolved`);
    } catch (error) {
      // Expected
    }
    return this;
  }
}

class MockFunction {
  constructor(original) {
    this.original = original;
    this.calls = [];
    this.returnValue = undefined;
    this.implementation = null;
    this.shouldCallThrough = false;
    
    const mockFn = (...args) => {
      this.calls.push(args);
      
      if (this.shouldCallThrough && this.original) {
        return this.original.apply(this, args);
      }
      
      if (this.implementation) {
        return this.implementation.apply(this, args);
      }
      
      return this.returnValue;
    };
    
    // Copy mock methods to the function
    Object.setPrototypeOf(mockFn, MockFunction.prototype);
    Object.assign(mockFn, this);
    
    return mockFn;
  }

  mockReturnValue(value) {
    this.returnValue = value;
    return this;
  }

  mockImplementation(fn) {
    this.implementation = fn;
    return this;
  }

  callThrough() {
    this.shouldCallThrough = true;
    return this;
  }

  mockResolvedValue(value) {
    this.implementation = async () => value;
    return this;
  }

  mockRejectedValue(error) {
    this.implementation = async () => { throw error; };
    return this;
  }

  toHaveBeenCalled() {
    if (this.calls.length === 0) {
      throw new Error('Expected function to have been called');
    }
  }

  toHaveBeenCalledTimes(times) {
    if (this.calls.length !== times) {
      throw new Error(`Expected function to have been called ${times} times, but was called ${this.calls.length} times`);
    }
  }

  toHaveBeenCalledWith(...args) {
    const found = this.calls.some(call => 
      call.length === args.length && 
      call.every((arg, index) => arg === args[index])
    );
    
    if (!found) {
      throw new Error(`Expected function to have been called with ${JSON.stringify(args)}`);
    }
  }

  reset() {
    this.calls = [];
    this.returnValue = undefined;
    this.implementation = null;
    this.shouldCallThrough = false;
  }
}

// Factory function
export function createTestRunner(options = {}) {
  return new EZUITestRunner(options);
}

// Global test instance
export const testRunner = new EZUITestRunner();

// Export global functions for convenience
export const { describe, it, expect, beforeEach, afterEach } = testRunner;