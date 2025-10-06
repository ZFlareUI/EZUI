/**
 * EZUI Parser - Parses tokenized .ezu content into AST
 */

import { EZUILexer } from './lexer.js';

export class EZUIParser {
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