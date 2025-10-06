/**
 * EZUI Core Framework Tests
 * Comprehensive tests for the main EZUI framework functionality
 */

import assert from 'assert';
import { EZUI, ReactiveState } from '../src/ezui.js';
import { EZUILexer } from '../src/parser/lexer.js';
import { EZUIParser } from '../src/parser/parser.js';

describe('EZUI Lexer', () => {
  test('should tokenize component declaration', () => {
    const lexer = new EZUILexer();
    const content = '<component Counter.ezu>';
    const tokens = lexer.tokenize(content);
    
    assert.strictEqual(tokens[0].type, 'COMPONENT');
    assert.strictEqual(tokens[0].value, 'Counter.ezu');
  });

  test('should tokenize style block', () => {
    const lexer = new EZUILexer();
    const content = 'style { button { color: red; } }';
    const tokens = lexer.tokenize(content);
    
    const styleToken = tokens.find(t => t.type === 'STYLE_BLOCK');
    assert.ok(styleToken);
  });

  test('should tokenize state block', () => {
    const lexer = new EZUILexer();
    const content = 'state { count: 0 }';
    const tokens = lexer.tokenize(content);
    
    const stateToken = tokens.find(t => t.type === 'STATE_BLOCK');
    assert.ok(stateToken);
  });

  test('should tokenize interpolations', () => {
    const lexer = new EZUILexer();
    const content = 'template { <div>{count}</div> }';
    const tokens = lexer.tokenize(content);
    
    const interpolationToken = tokens.find(t => t.type === 'INTERPOLATION');
    assert.ok(interpolationToken);
  });
});

describe('EZUI Parser', () => {
  test('should parse complete component', () => {
    const parser = new EZUIParser();
    const content = `
<component Counter.ezu>

style {
  button {
    color: blue
  }
}

state {
  count: 0
}

template {
  <button on:click="count++">Count: {count}</button>
}
    `;

    const ast = parser.parse(content);
    
    assert.strictEqual(ast.type, 'Component');
    assert.strictEqual(ast.name, 'Counter');
    assert.ok(ast.style);
    assert.ok(ast.state);
    assert.ok(ast.template);
    assert.strictEqual(ast.state.count, 0);
  });

  test('should parse CSS properties correctly', () => {
    const parser = new EZUIParser();
    const content = `
<component Test.ezu>

style {
  button {
    font-size: 16px
    background-color: red
    border-radius: 4px
  }
}

state {}
template {}
    `;

    const ast = parser.parse(content);
    const buttonStyles = ast.style.button;
    
    assert.strictEqual(buttonStyles['font-size'], '16px');
    assert.strictEqual(buttonStyles['background-color'], 'red');
    assert.strictEqual(buttonStyles['border-radius'], '4px');
  });

  test('should parse template interpolations', () => {
    const parser = new EZUIParser();
    const content = `
<component Test.ezu>

state {
  name: "World"
  count: 42
}

template {
  <div>Hello {name}! Count: {count}</div>
}
    `;

    const ast = parser.parse(content);
    const interpolations = ast.template.interpolations;
    
    assert.strictEqual(interpolations.length, 2);
    assert.strictEqual(interpolations[0].expression, 'name');
    assert.strictEqual(interpolations[1].expression, 'count');
  });

  test('should parse event handlers', () => {
    const parser = new EZUIParser();
    const content = `
<component Test.ezu>

template {
  <button on:click="count++">Click me</button>
  <input on:input="handleInput()" />
}
    `;

    const ast = parser.parse(content);
    const events = ast.template.events;
    
    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].event, 'click');
    assert.strictEqual(events[0].handler, 'count++');
    assert.strictEqual(events[1].event, 'input');
    assert.strictEqual(events[1].handler, 'handleInput()');
  });
});

describe('Reactive State', () => {
  test('should create reactive state', () => {
    const state = new ReactiveState({ count: 0 });
    
    assert.strictEqual(state.data.count, 0);
  });

  test('should notify listeners on state change', (done) => {
    const state = new ReactiveState({ count: 0 });
    
    state.onChange((data, changes) => {
      assert.strictEqual(data.count, 1);
      assert.strictEqual(changes[0].property, 'count');
      assert.strictEqual(changes[0].value, 1);
      done();
    });
    
    state.update('count', 1);
  });

  test('should support batch updates', (done) => {
    const state = new ReactiveState({ a: 1, b: 2 });
    
    state.onChange((data, changes) => {
      assert.strictEqual(changes.length, 2);
      assert.strictEqual(data.a, 10);
      assert.strictEqual(data.b, 20);
      done();
    });
    
    state.updateBatch({ a: 10, b: 20 });
  });

  test('should support watchers', (done) => {
    const state = new ReactiveState({ count: 0 });
    
    state.watch('count', (newValue, oldValue) => {
      assert.strictEqual(newValue, 5);
      assert.strictEqual(oldValue, 0);
      done();
    });
    
    state.update('count', 5);
  });

  test('should support computed properties', () => {
    const state = new ReactiveState({ a: 5, b: 10 });
    
    state.computed('sum', () => state.data.a + state.data.b);
    
    assert.strictEqual(state.data.sum, 15);
    
    state.update('a', 20);
    assert.strictEqual(state.data.sum, 30);
  });
});