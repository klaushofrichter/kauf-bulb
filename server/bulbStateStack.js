const MAX_STACK_SIZE = 50;

class BulbStateStack {
  constructor() {
    // Map of bulb ID to array of states (stack)
    this.stacks = new Map();
  }

  /**
   * Push current state onto the stack for a bulb
   * @param {string} bulbId - The bulb ID
   * @param {object} state - The state to push { on, brightness, r, g, b, transition }
   * @returns {number} - The new stack size for this bulb
   */
  push(bulbId, state) {
    if (!this.stacks.has(bulbId)) {
      this.stacks.set(bulbId, []);
    }

    const stack = this.stacks.get(bulbId);

    // Add state to the stack
    stack.push({
      on: state.on,
      brightness: state.brightness,
      r: state.r,
      g: state.g,
      b: state.b,
      transition: state.transition ?? 1000,
      timestamp: new Date().toISOString()
    });

    // Remove oldest states if stack exceeds max size
    while (stack.length > MAX_STACK_SIZE) {
      stack.shift();
    }

    return stack.length;
  }

  /**
   * Pop the most recent state from the stack for a bulb
   * @param {string} bulbId - The bulb ID
   * @returns {object|null} - The popped state or null if stack is empty
   */
  pop(bulbId) {
    const stack = this.stacks.get(bulbId);
    if (!stack || stack.length === 0) {
      return null;
    }

    return stack.pop();
  }

  /**
   * Get the current stack size for a bulb
   * @param {string} bulbId - The bulb ID
   * @returns {number} - The stack size
   */
  size(bulbId) {
    const stack = this.stacks.get(bulbId);
    return stack ? stack.length : 0;
  }

  /**
   * Clear the stack for a bulb
   * @param {string} bulbId - The bulb ID
   */
  clear(bulbId) {
    this.stacks.delete(bulbId);
  }

  /**
   * Clear all stacks
   */
  clearAll() {
    this.stacks.clear();
  }
}

export const bulbStateStack = new BulbStateStack();
