/**
 * Jest test setup configuration
 * Sets up the test environment with necessary polyfills and mocks
 */

// Setup JSDOM environment (already configured via Jest preset)

// Mock browser APIs that might not be available in JSDOM
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock performance API
global.performance = global.performance || {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
};

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16); // ~60fps
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Mock fetch API
global.fetch = jest.fn();

// Mock localStorage and sessionStorage
const createMockStorage = () => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn(index => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
};

Object.defineProperty(window, 'localStorage', {
  value: createMockStorage()
});

Object.defineProperty(window, 'sessionStorage', {
  value: createMockStorage()
});

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset localStorage/sessionStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear DOM
  document.body.innerHTML = '';
  
  // Mock console.error and console.warn to log but not fail tests during development
  console.error = jest.fn((message) => {
    // Log all errors but don't fail tests for now
    originalConsoleError(message);
  });
  
  console.warn = jest.fn((message) => {
    // Allow expected warning messages
    if (typeof message === 'string' && (
      message.includes('Warning:') ||
      message.includes('Expected warning') ||
      message.includes('Test warning')
    )) {
      return;
    }
    
    // Log warnings but don't fail tests
    originalConsoleWarn(message);
  });
});

afterEach(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  
  // Clean up any timers
  jest.clearAllTimers();
});

// Custom matchers
expect.extend({
  toBeInDOM(received) {
    const pass = document.body.contains(received);
    if (pass) {
      return {
        message: () => `Expected element not to be in DOM`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected element to be in DOM`,
        pass: false,
      };
    }
  },
  
  toHaveTextContent(received, expectedText) {
    const pass = received.textContent === expectedText;
    if (pass) {
      return {
        message: () => `Expected element not to have text content "${expectedText}"`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected element to have text content "${expectedText}", but got "${received.textContent}"`,
        pass: false,
      };
    }
  },
  
  toBeVisible(received) {
    const pass = received.offsetWidth > 0 && received.offsetHeight > 0;
    if (pass) {
      return {
        message: () => `Expected element not to be visible`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected element to be visible`,
        pass: false,
      };
    }
  }
});

// Global test utilities
global.waitFor = async (callback, timeout = 1000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const result = await callback();
      if (result) return result;
    } catch (error) {
      // Continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  throw new Error(`waitFor timeout after ${timeout}ms`);
};

global.nextTick = () => new Promise(resolve => setTimeout(resolve, 0));

global.createMockElement = (tagName = 'div', attributes = {}) => {
  const element = document.createElement(tagName);
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key.startsWith('data-')) {
      element.dataset[key.slice(5)] = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  
  return element;
};

// Set up test timeout
jest.setTimeout(10000); // 10 seconds

console.log('EZUI test environment initialized');