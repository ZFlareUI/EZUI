/**
 * EZUI Validation and Security Module
 * Provides comprehensive validation, sanitization, and security features
 */

export class EZUIValidator {
  constructor(options = {}) {
    this.options = {
      strictMode: true,
      allowCustomValidators: true,
      sanitizeInputs: true,
      maxStringLength: 10000,
      maxArrayLength: 1000,
      maxObjectDepth: 10,
      ...options
    };
    
    this.customValidators = new Map();
    this.sanitizers = new Map();
    
    this.setupBuiltInValidators();
    this.setupBuiltInSanitizers();
  }

  setupBuiltInValidators() {
    // Email validation
    this.addValidator('email', {
      validate: (value) => {
        if (!value) return true; // Allow empty
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      },
      message: 'Invalid email format'
    });

    // URL validation
    this.addValidator('url', {
      validate: (value) => {
        if (!value) return true;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid URL format'
    });

    // Number range validation
    this.addValidator('range', {
      validate: (value, { min, max }) => {
        const num = Number(value);
        if (isNaN(num)) return false;
        if (min !== undefined && num < min) return false;
        if (max !== undefined && num > max) return false;
        return true;
      },
      message: 'Value must be within specified range'
    });

    // String length validation
    this.addValidator('length', {
      validate: (value, { min, max }) => {
        const str = String(value);
        if (min !== undefined && str.length < min) return false;
        if (max !== undefined && str.length > max) return false;
        return true;
      },
      message: 'String length must be within specified range'
    });

    // Pattern validation
    this.addValidator('pattern', {
      validate: (value, { regex, flags = 'i' }) => {
        if (!value) return true;
        const pattern = new RegExp(regex, flags);
        return pattern.test(String(value));
      },
      message: 'Value does not match required pattern'
    });

    // Required field validation
    this.addValidator('required', {
      validate: (value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim() !== '';
        if (Array.isArray(value)) return value.length > 0;
        return true;
      },
      message: 'This field is required'
    });
  }

  setupBuiltInSanitizers() {
    // HTML sanitization
    this.addSanitizer('html', (value) => {
      if (typeof value !== 'string') return value;
      
      // Remove script tags
      let sanitized = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      // Remove dangerous attributes
      const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'];
      for (const attr of dangerousAttrs) {
        const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
        sanitized = sanitized.replace(regex, '');
      }
      
      // Remove javascript: and data: protocols
      sanitized = sanitized.replace(/javascript:/gi, '');
      sanitized = sanitized.replace(/data:(?!image\/)/gi, '');
      
      return sanitized;
    });

    // SQL injection prevention
    this.addSanitizer('sql', (value) => {
      if (typeof value !== 'string') return value;
      
      // Escape SQL special characters
      return value.replace(/'/g, "''")
                 .replace(/;/g, '\\;')
                 .replace(/--/g, '\\--')
                 .replace(/\/\*/g, '\\/*')
                 .replace(/\*\//g, '\\*/');
    });

    // XSS prevention
    this.addSanitizer('xss', (value) => {
      if (typeof value !== 'string') return value;
      
      const entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
      };
      
      return value.replace(/[&<>"'`=\/]/g, (char) => entityMap[char]);
    });

    // Trim whitespace
    this.addSanitizer('trim', (value) => {
      return typeof value === 'string' ? value.trim() : value;
    });

    // Normalize case
    this.addSanitizer('lowercase', (value) => {
      return typeof value === 'string' ? value.toLowerCase() : value;
    });

    this.addSanitizer('uppercase', (value) => {
      return typeof value === 'string' ? value.toUpperCase() : value;
    });
  }

  // Add custom validator
  addValidator(name, validator) {
    if (!this.options.allowCustomValidators) {
      throw new Error('Custom validators are not allowed in strict mode');
    }
    
    if (typeof validator.validate !== 'function') {
      throw new Error('Validator must have a validate function');
    }
    
    this.customValidators.set(name, validator);
  }

  // Add custom sanitizer
  addSanitizer(name, sanitizer) {
    if (typeof sanitizer !== 'function') {
      throw new Error('Sanitizer must be a function');
    }
    
    this.sanitizers.set(name, sanitizer);
  }

  // Validate a value against rules
  validate(value, rules) {
    const errors = [];
    
    if (!Array.isArray(rules)) {
      rules = [rules];
    }
    
    for (const rule of rules) {
      try {
        const result = this.validateSingle(value, rule);
        if (!result.valid) {
          errors.push(result.error);
        }
      } catch (error) {
        errors.push(`Validation error: ${error.message}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateSingle(value, rule) {
    if (typeof rule === 'string') {
      rule = { type: rule };
    }
    
    if (!rule.type) {
      throw new Error('Validation rule must have a type');
    }
    
    const validator = this.customValidators.get(rule.type);
    
    if (!validator) {
      throw new Error(`Unknown validator type: ${rule.type}`);
    }
    
    const isValid = validator.validate(value, rule.options || {});
    
    return {
      valid: isValid,
      error: isValid ? null : (rule.message || validator.message)
    };
  }

  // Sanitize a value
  sanitize(value, sanitizers) {
    if (!Array.isArray(sanitizers)) {
      sanitizers = [sanitizers];
    }
    
    let sanitized = value;
    
    for (const sanitizerName of sanitizers) {
      const sanitizer = this.sanitizers.get(sanitizerName);
      
      if (!sanitizer) {
        console.warn(`Unknown sanitizer: ${sanitizerName}`);
        continue;
      }
      
      try {
        sanitized = sanitizer(sanitized);
      } catch (error) {
        console.error(`Sanitization error with ${sanitizerName}:`, error);
      }
    }
    
    return sanitized;
  }

  // Validate and sanitize object properties
  validateObject(obj, schema) {
    const result = {
      valid: true,
      errors: {},
      sanitized: {}
    };
    
    // Check for required properties
    for (const [key, rules] of Object.entries(schema)) {
      const value = obj[key];
      
      // Apply sanitization first
      let sanitizedValue = value;
      if (rules.sanitize) {
        sanitizedValue = this.sanitize(value, rules.sanitize);
      }
      
      // Then validate
      if (rules.validate) {
        const validation = this.validate(sanitizedValue, rules.validate);
        
        if (!validation.valid) {
          result.valid = false;
          result.errors[key] = validation.errors;
        }
      }
      
      result.sanitized[key] = sanitizedValue;
    }
    
    return result;
  }

  // Security checks
  checkSecurityConstraints(value) {
    const issues = [];
    
    // Check string length
    if (typeof value === 'string' && value.length > this.options.maxStringLength) {
      issues.push(`String exceeds maximum length of ${this.options.maxStringLength}`);
    }
    
    // Check array length
    if (Array.isArray(value) && value.length > this.options.maxArrayLength) {
      issues.push(`Array exceeds maximum length of ${this.options.maxArrayLength}`);
    }
    
    // Check object depth
    if (typeof value === 'object' && value !== null) {
      const depth = this.getObjectDepth(value);
      if (depth > this.options.maxObjectDepth) {
        issues.push(`Object exceeds maximum depth of ${this.options.maxObjectDepth}`);
      }
    }
    
    return {
      safe: issues.length === 0,
      issues
    };
  }

  getObjectDepth(obj, currentDepth = 0) {
    if (currentDepth > this.options.maxObjectDepth) {
      return currentDepth; // Prevent infinite recursion
    }
    
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth;
    }
    
    let maxDepth = currentDepth;
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const depth = this.getObjectDepth(obj[key], currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      }
    }
    
    return maxDepth;
  }

  // Form validation helper
  validateForm(formData, schema) {
    const results = {};
    let isValid = true;
    
    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const value = formData[fieldName];
      const fieldResult = this.validateObject({ [fieldName]: value }, { [fieldName]: fieldSchema });
      
      results[fieldName] = {
        valid: fieldResult.valid,
        errors: fieldResult.errors[fieldName] || [],
        sanitized: fieldResult.sanitized[fieldName]
      };
      
      if (!fieldResult.valid) {
        isValid = false;
      }
    }
    
    return {
      valid: isValid,
      fields: results
    };
  }

  // Performance and memory checks
  checkPerformanceConstraints(operation, duration) {
    const warnings = [];
    
    if (duration > 100) { // 100ms threshold
      warnings.push(`Slow operation detected: ${operation} took ${duration}ms`);
    }
    
    // Memory usage check (if available)
    if (performance.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
      if (memoryUsage > 50) { // 50MB threshold
        warnings.push(`High memory usage: ${memoryUsage.toFixed(2)}MB`);
      }
    }
    
    return warnings;
  }
}

// Pre-configured validators for common use cases
export const CommonValidators = {
  email: { type: 'email' },
  required: { type: 'required' },
  url: { type: 'url' },
  
  // Numeric validators
  positiveNumber: { 
    type: 'range', 
    options: { min: 0 }, 
    message: 'Must be a positive number' 
  },
  
  age: { 
    type: 'range', 
    options: { min: 0, max: 150 }, 
    message: 'Age must be between 0 and 150' 
  },
  
  percentage: { 
    type: 'range', 
    options: { min: 0, max: 100 }, 
    message: 'Must be between 0 and 100' 
  },
  
  // String validators
  password: {
    type: 'pattern',
    options: { 
      regex: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$'
    },
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
  },
  
  username: {
    type: 'pattern',
    options: { regex: '^[a-zA-Z0-9_]{3,20}$' },
    message: 'Username must be 3-20 characters, letters, numbers, and underscores only'
  },
  
  slug: {
    type: 'pattern',
    options: { regex: '^[a-z0-9-]+$' },
    message: 'Must be lowercase letters, numbers, and hyphens only'
  }
};

// Pre-configured sanitizers
export const CommonSanitizers = {
  html: ['html', 'trim'],
  text: ['xss', 'trim'],
  email: ['lowercase', 'trim'],
  url: ['trim'],
  slug: ['lowercase', 'trim']
};

// Factory function
export function createValidator(options = {}) {
  return new EZUIValidator(options);
}

// Default instance
export const validator = new EZUIValidator();