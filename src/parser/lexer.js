/**
 * EZUI Lexer - Tokenizes .ezu file content
 */

export class EZUILexer {
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

    // Handle opening/self-closing tags
    let inAttribute = false;
    let quoteChar = null;

    while (this.getCurrentChar() !== '>' && !this.isAtEnd()) {
      const char = this.getCurrentChar();
      
      if (!inAttribute && (char === '"' || char === "'")) {
        inAttribute = true;
        quoteChar = char;
      } else if (inAttribute && char === quoteChar) {
        inAttribute = false;
        quoteChar = null;
      }
      
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