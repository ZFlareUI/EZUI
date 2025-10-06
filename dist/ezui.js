(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.EZUI = {}));
})(this, (function (exports) { 'use strict';

  /**
   * EZUI Lexer - Tokenizes .ezu file content
   */

  class EZUILexer {
    constructor() {
      this.tokens = [];
      this.position = 0;
      this.content = '';
    }

    tokenize(content) {
      this.content = content;
      this.position = 0;
      this.tokens = [];

      while (this.position < this.content.length) {
        this.scanToken();
      }

      this.tokens.push({ type: 'EOF', value: '', line: this.getCurrentLine() });
      return this.tokens;
    }

    scanToken() {
      const char = this.getCurrentChar();

      // Skip whitespace
      if (this.isWhitespace(char)) {
        this.advance();
        return;
      }

      // Skip comments
      if (char === '/' && this.peek() === '/') {
        this.skipLineComment();
        return;
      }

      if (char === '/' && this.peek() === '*') {
        this.skipBlockComment();
        return;
      }

      // Component declaration
      if (char === '<') {
        const nextChars = this.content.slice(this.position + 1, this.position + 10);
        if (nextChars.startsWith('component')) {
          this.scanComponentDeclaration();
          return;
        } else {
          this.scanHtmlTag();
          return;
        }
      }

      // Block keywords
      if (this.matchKeyword('style')) {
        this.addToken('STYLE_BLOCK');
        return;
      }

      if (this.matchKeyword('state')) {
        this.addToken('STATE_BLOCK');
        return;
      }

      if (this.matchKeyword('template')) {
        this.addToken('TEMPLATE_BLOCK');
        return;
      }

      if (this.matchKeyword('props')) {
        this.addToken('PROPS_BLOCK');
        return;
      }

      // Braces
      if (char === '{') {
        this.addToken('LEFT_BRACE');
        return;
      }

      if (char === '}') {
        this.addToken('RIGHT_BRACE');
        return;
      }

      // Parentheses
      if (char === '(') {
        this.addToken('LEFT_PAREN');
        return;
      }

      if (char === ')') {
        this.addToken('RIGHT_PAREN');
        return;
      }

      // This is now handled above in component declaration check

      // Strings
      if (char === '"' || char === "'") {
        this.scanString();
        return;
      }

      // Template interpolation
      if (char === '{' && this.isInTemplate()) {
        this.scanInterpolation();
        return;
      }

      // Identifiers and keywords
      if (this.isAlpha(char)) {
        this.scanIdentifier();
        return;
      }

      // Numbers
      if (this.isDigit(char)) {
        this.scanNumber();
        return;
      }

      // Operators and punctuation
      this.scanOperator();
    }

    scanComponentDeclaration() {
      this.advance(); // Skip '<'
      
      // Skip 'component'
      while (this.getCurrentChar() !== ' ' && this.getCurrentChar() !== '>') {
        this.advance();
      }

      // Skip spaces
      while (this.getCurrentChar() === ' ') {
        this.advance();
      }

      const start = this.position;
      while (this.getCurrentChar() !== '>' && this.getCurrentChar() !== '\0' && this.getCurrentChar() !== ' ') {
        this.advance();
      }

      const componentName = this.content.substring(start, this.position);
      
      // Skip to end of tag
      while (this.getCurrentChar() !== '>' && this.getCurrentChar() !== '\0') {
        this.advance();
      }
      
      if (this.getCurrentChar() === '>') {
        this.advance(); // Skip '>'
      }
      
      this.addToken('COMPONENT', componentName);
    }

    scanHtmlTag() {
      const start = this.position;
      this.advance(); // Skip '<'

      // Handle closing tags
      if (this.getCurrentChar() === '/') {
        this.advance();
        while (this.getCurrentChar() !== '>' && !this.isAtEnd()) {
          this.advance();
        }
        if (this.getCurrentChar() === '>') {
          this.advance();
        }
        
        const tagContent = this.content.substring(start, this.position);
        this.addToken('HTML_TAG', tagContent);
        return;
      }

      while (this.getCurrentChar() !== '>' && !this.isAtEnd()) {
        this.getCurrentChar();
        
        this.advance();
      }

      if (this.getCurrentChar() === '>') {
        this.advance();
      }

      const tagContent = this.content.substring(start, this.position);
      this.addToken('HTML_TAG', tagContent);
    }

    scanString() {
      const quote = this.getCurrentChar();
      this.advance(); // Skip opening quote

      const start = this.position;
      while (this.getCurrentChar() !== quote && !this.isAtEnd()) {
        if (this.getCurrentChar() === '\\') {
          this.advance(); // Skip escape character
        }
        this.advance();
      }

      const value = this.content.substring(start, this.position);
      this.advance(); // Skip closing quote
      
      this.addToken('STRING', value);
    }

    scanInterpolation() {
      this.advance(); // Skip '{'
      const start = this.position;

      let braceCount = 1;
      while (braceCount > 0 && !this.isAtEnd()) {
        if (this.getCurrentChar() === '{') {
          braceCount++;
        } else if (this.getCurrentChar() === '}') {
          braceCount--;
        }
        
        if (braceCount > 0) {
          this.advance();
        }
      }

      const expression = this.content.substring(start, this.position);
      this.addToken('INTERPOLATION', expression);
      
      if (this.getCurrentChar() === '}') {
        this.advance(); // Skip '}'
      }
    }

    scanIdentifier() {
      const start = this.position;
      
      while (this.isAlphaNumeric(this.getCurrentChar()) || this.getCurrentChar() === '-' || this.getCurrentChar() === '_') {
        this.advance();
      }

      const value = this.content.substring(start, this.position);
      this.addToken('IDENTIFIER', value);
    }

    scanNumber() {
      const start = this.position;
      
      while (this.isDigit(this.getCurrentChar())) {
        this.advance();
      }

      if (this.getCurrentChar() === '.' && this.isDigit(this.peek())) {
        this.advance(); // Skip '.'
        while (this.isDigit(this.getCurrentChar())) {
          this.advance();
        }
      }

      const value = this.content.substring(start, this.position);
      this.addToken('NUMBER', parseFloat(value));
    }

    scanOperator() {
      const char = this.getCurrentChar();
      
      // Multi-character operators
      if (char === '+' && this.peek() === '+') {
        this.advance();
        this.advance();
        this.addToken('INCREMENT');
        return;
      }

      if (char === '-' && this.peek() === '-') {
        this.advance();
        this.advance();
        this.addToken('DECREMENT');
        return;
      }

      if (char === '=' && this.peek() === '=') {
        this.advance();
        this.advance();
        this.addToken('EQUAL');
        return;
      }

      if (char === '!' && this.peek() === '=') {
        this.advance();
        this.advance();
        this.addToken('NOT_EQUAL');
        return;
      }

      // Single character operators
      const operators = {
        '+': 'PLUS',
        '-': 'MINUS',
        '*': 'MULTIPLY',
        '/': 'DIVIDE',
        '=': 'ASSIGN',
        ':': 'COLON',
        ';': 'SEMICOLON',
        ',': 'COMMA',
        '.': 'DOT',
        '!': 'NOT',
        '&': 'AND',
        '|': 'OR'
      };

      if (operators[char]) {
        this.addToken(operators[char]);
        return;
      }

      // Unknown character - add as text
      this.addToken('TEXT', char);
    }

    skipLineComment() {
      while (this.getCurrentChar() !== '\n' && !this.isAtEnd()) {
        this.advance();
      }
    }

    skipBlockComment() {
      this.advance(); // Skip '/'
      this.advance(); // Skip '*'

      while (!this.isAtEnd()) {
        if (this.getCurrentChar() === '*' && this.peek() === '/') {
          this.advance(); // Skip '*'
          this.advance(); // Skip '/'
          break;
        }
        this.advance();
      }
    }

    matchKeyword(keyword) {
      const start = this.position;
      const end = start + keyword.length;
      
      if (end > this.content.length) return false;
      
      const substr = this.content.substring(start, end);
      const nextChar = this.content[end];
      
      return substr === keyword && (!this.isAlphaNumeric(nextChar));
    }

    addToken(type, value = null) {
      if (value === null) {
        value = this.getCurrentChar();
        this.advance();
      }
      
      this.tokens.push({
        type,
        value,
        line: this.getCurrentLine()
      });
    }

    getCurrentChar() {
      if (this.isAtEnd()) return '\0';
      return this.content[this.position];
    }

    peek(offset = 1) {
      const pos = this.position + offset;
      if (pos >= this.content.length) return '\0';
      return this.content[pos];
    }

    advance() {
      if (!this.isAtEnd()) {
        this.position++;
      }
    }

    isAtEnd() {
      return this.position >= this.content.length;
    }

    isWhitespace(char) {
      return char === ' ' || char === '\t' || char === '\n' || char === '\r';
    }

    isAlpha(char) {
      return /[a-zA-Z_]/.test(char);
    }

    isDigit(char) {
      return /[0-9]/.test(char);
    }

    isAlphaNumeric(char) {
      return this.isAlpha(char) || this.isDigit(char);
    }

    getCurrentLine() {
      let line = 1;
      for (let i = 0; i < this.position; i++) {
        if (this.content[i] === '\n') {
          line++;
        }
      }
      return line;
    }

    isInTemplate() {
      // Simple heuristic - check if we're inside a template block
      // This would need more sophisticated tracking in a real implementation
      const beforePosition = this.content.substring(0, this.position);
      const lastTemplateStart = beforePosition.lastIndexOf('template {');
      const lastTemplateEnd = beforePosition.lastIndexOf('}');
      
      return lastTemplateStart > lastTemplateEnd;
    }
  }

  /**
   * EZUI Parser - Parses tokenized .ezu content into AST
   */


  class EZUIParser {
    constructor() {
      this.lexer = new EZUILexer();
      this.tokens = [];
      this.current = 0;
    }

    parse(content) {
      this.tokens = this.lexer.tokenize(content);
      this.current = 0;

      const component = {
        type: 'Component',
        name: null,
        style: null,
        state: {},
        props: {},
        template: null,
        methods: {}
      };

      try {
        while (!this.isAtEnd()) {
          const token = this.peek();
          
          if (token.type === 'COMPONENT') {
            component.name = this.parseComponentName();
          } else if (token.type === 'STYLE_BLOCK') {
            component.style = this.parseStyleBlock();
          } else if (token.type === 'STATE_BLOCK') {
            component.state = this.parseStateBlock();
          } else if (token.type === 'PROPS_BLOCK') {
            component.props = this.parsePropsBlock();
          } else if (token.type === 'TEMPLATE_BLOCK') {
            component.template = this.parseTemplateBlock();
          } else {
            this.advance(); // Skip unrecognized tokens
          }
        }

        return component;
      } catch (error) {
        throw new Error(`Parse error: ${error.message} at line ${this.peek().line}`);
      }
    }

    parseComponentName() {
      const token = this.advance();
      return token.value.replace('.ezu', '');
    }

    parseStyleBlock() {
      this.advance(); // Skip 'style'
      this.consume('LEFT_BRACE', 'Expected "{" after style');

      const styles = {};
      
      while (!this.check('RIGHT_BRACE') && !this.isAtEnd()) {
        const rule = this.parseStyleRule();
        if (rule) {
          styles[rule.selector] = rule.properties;
        }
      }

      this.consume('RIGHT_BRACE', 'Expected "}" after style block');
      return styles;
    }

    parseStyleRule() {
      const selector = this.parseSelector();
      
      if (!selector) return null;

      this.consume('LEFT_BRACE', 'Expected "{" after selector');
      
      const properties = {};
      
      while (!this.check('RIGHT_BRACE') && !this.isAtEnd()) {
        const property = this.parseStyleProperty();
        if (property) {
          properties[property.name] = property.value;
        }
      }

      this.consume('RIGHT_BRACE', 'Expected "}" after style properties');
      
      return { selector, properties };
    }

    parseSelector() {
      let selector = '';
      
      while (!this.check('LEFT_BRACE') && !this.isAtEnd()) {
        const token = this.advance();
        if (token.type === 'IDENTIFIER' || token.type === 'TEXT') {
          selector += token.value;
        } else if (token.type === 'COLON') {
          selector += ':';
        } else if (token.type === 'DOT') {
          selector += '.';
        } else {
          selector += token.value;
        }
      }
      
      return selector.trim();
    }

    parseStyleProperty() {
      if (this.check('RIGHT_BRACE')) return null;

      let propertyName = '';
      
      // Parse property name
      while (!this.check('COLON') && !this.isAtEnd()) {
        const token = this.advance();
        if (token.type === 'IDENTIFIER' || token.type === 'TEXT') {
          propertyName += token.value;
        } else if (token.type === 'MINUS') {
          propertyName += '-';
        }
      }

      if (this.check('COLON')) {
        this.advance(); // Skip ':'
      }

      let propertyValue = '';
      
      // Parse property value until newline or semicolon
      while (!this.check('SEMICOLON') && !this.check('RIGHT_BRACE') && !this.isAtEnd()) {
        const token = this.advance();
        
        if (token.value === '\n') break;
        
        if (token.type === 'STRING') {
          propertyValue += `"${token.value}"`;
        } else if (token.type === 'NUMBER') {
          propertyValue += token.value;
        } else if (token.type === 'IDENTIFIER' || token.type === 'TEXT') {
          propertyValue += token.value;
        } else {
          propertyValue += token.value;
        }
      }

      if (this.check('SEMICOLON')) {
        this.advance(); // Skip ';'
      }

      return {
        name: propertyName.trim(),
        value: propertyValue.trim()
      };
    }

    parseStateBlock() {
      this.advance(); // Skip 'state'
      this.consume('LEFT_BRACE', 'Expected "{" after state');

      const state = {};
      
      while (!this.check('RIGHT_BRACE') && !this.isAtEnd()) {
        const property = this.parseStateProperty();
        if (property) {
          state[property.name] = property.value;
        }
      }

      this.consume('RIGHT_BRACE', 'Expected "}" after state block');
      return state;
    }

    parseStateProperty() {
      if (this.check('RIGHT_BRACE')) return null;

      const nameToken = this.advance();
      if (nameToken.type !== 'IDENTIFIER') {
        throw new Error(`Expected property name, got ${nameToken.type}`);
      }

      this.consume('COLON', 'Expected ":" after property name');
      
      const value = this.parseValue();
      
      // Optional semicolon
      if (this.check('SEMICOLON')) {
        this.advance();
      }

      return {
        name: nameToken.value,
        value: value
      };
    }

    parsePropsBlock() {
      this.advance(); // Skip 'props'
      this.consume('LEFT_BRACE', 'Expected "{" after props');

      const props = {};
      
      while (!this.check('RIGHT_BRACE') && !this.isAtEnd()) {
        const property = this.parseStateProperty(); // Same syntax as state
        if (property) {
          props[property.name] = property.value;
        }
      }

      this.consume('RIGHT_BRACE', 'Expected "}" after props block');
      return props;
    }

    parseTemplateBlock() {
      this.advance(); // Skip 'template'
      this.consume('LEFT_BRACE', 'Expected "{" after template');

      let templateContent = '';
      let braceCount = 1;
      
      while (braceCount > 0 && !this.isAtEnd()) {
        const token = this.advance();
        
        if (token.type === 'LEFT_BRACE') {
          braceCount++;
          templateContent += '{';
        } else if (token.type === 'RIGHT_BRACE') {
          braceCount--;
          if (braceCount > 0) {
            templateContent += '}';
          }
        } else if (token.type === 'HTML_TAG') {
          templateContent += token.value;
        } else if (token.type === 'INTERPOLATION') {
          templateContent += `{${token.value}}`;
        } else if (token.type === 'STRING') {
          templateContent += `"${token.value}"`;
        } else if (token.type === 'IDENTIFIER' || token.type === 'TEXT') {
          templateContent += token.value;
        } else if (token.value && typeof token.value === 'string') {
          templateContent += token.value;
        }
      }

      return this.parseTemplate(templateContent.trim());
    }

    parseTemplate(content) {
      // Parse template content for interpolations and event bindings
      const template = {
        html: content,
        interpolations: [],
        events: []
      };

      // Find interpolations {variable}
      const interpolationRegex = /\{([^}]+)\}/g;
      let match;
      
      while ((match = interpolationRegex.exec(content)) !== null) {
        template.interpolations.push({
          expression: match[1].trim(),
          placeholder: match[0],
          index: match.index
        });
      }

      // Find event bindings on:event="handler"
      const eventRegex = /on:(\w+)=["']([^"']+)["']/g;
      
      while ((match = eventRegex.exec(content)) !== null) {
        template.events.push({
          event: match[1],
          handler: match[2],
          binding: match[0]
        });
      }

      return template;
    }

    parseValue() {
      const token = this.peek();
      
      switch (token.type) {
        case 'NUMBER':
          this.advance();
          return token.value;
        
        case 'STRING':
          this.advance();
          return token.value;
        
        case 'IDENTIFIER':
          this.advance();
          // Handle boolean literals
          if (token.value === 'true') return true;
          if (token.value === 'false') return false;
          if (token.value === 'null') return null;
          return token.value;
        
        case 'LEFT_BRACE':
          return this.parseObject();
        
        default:
          throw new Error(`Unexpected token type: ${token.type}`);
      }
    }

    parseObject() {
      this.consume('LEFT_BRACE', 'Expected "{"');
      
      const obj = {};
      
      while (!this.check('RIGHT_BRACE') && !this.isAtEnd()) {
        const key = this.advance();
        if (key.type !== 'IDENTIFIER' && key.type !== 'STRING') {
          throw new Error('Expected property name');
        }
        
        this.consume('COLON', 'Expected ":" after property name');
        const value = this.parseValue();
        
        obj[key.value] = value;
        
        if (this.check('COMMA')) {
          this.advance();
        }
      }
      
      this.consume('RIGHT_BRACE', 'Expected "}"');
      return obj;
    }

    // Utility methods
    peek() {
      return this.tokens[this.current] || { type: 'EOF', value: '', line: 0 };
    }

    advance() {
      if (!this.isAtEnd()) {
        this.current++;
      }
      return this.tokens[this.current - 1];
    }

    check(type) {
      if (this.isAtEnd()) return false;
      return this.peek().type === type;
    }

    consume(type, message) {
      if (this.check(type)) {
        return this.advance();
      }
      
      throw new Error(`${message}. Got ${this.peek().type} instead.`);
    }

    isAtEnd() {
      return this.current >= this.tokens.length || this.peek().type === 'EOF';
    }
  }

  /**
   * EZUI Reactive State System
   * Provides reactive data binding for component state
   */

  class ReactiveState {
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

  /**
   * EZUI DOM Utilities
   * Helper functions for DOM manipulation and component lifecycle
   */

  class DOMUtils {
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

  /**
   * EZUI Compiler - Compiles parsed AST to JavaScript component classes
   */


  class EZUICompiler {
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

  /**
   * EZUI Component Registry
   * Manages registration and lifecycle of EZUI components
   */

  class ComponentRegistry {
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

  /**
   * EZUI Framework - Main Entry Point
   * Lightweight reactive framework for .ezu components
   */


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

  exports.ComponentRegistry = ComponentRegistry;
  exports.DOMUtils = DOMUtils;
  exports.EZUI = EZUI;
  exports.ReactiveState = ReactiveState;

}));
//# sourceMappingURL=ezui.js.map
