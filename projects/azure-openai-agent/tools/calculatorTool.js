import { tool } from '@openai/agents';
import { z } from 'zod';

/**
 * Calculator tool for performing mathematical calculations
 */
export const calculatorTool = tool({
  name: 'calculator',
  description: 'Perform a mathematical calculation.',
  parameters: z.object({
    expression: z.string().describe('The mathematical expression to evaluate (e.g., "2 + 2").'),
  }),
  async execute({ expression }) {
    try {
      // A simple and relatively safe way to evaluate math expressions.
      const result = new Function('return ' + expression)();
      return `The result of "${expression}" is ${result}.`;
    } catch (error) {
      return `Error evaluating expression: ${error.message}`;
    }
  },
});

/**
 * Math Calculator service with enhanced functionality
 */
export class MathCalculator {
  /**
   * Evaluate a mathematical expression safely
   */
  static evaluate(expression) {
    try {
      // Handle percentage calculations
      if (expression.includes('%')) {
        return this.evaluatePercentage(expression);
      }

      // Handle common mathematical functions
      const processedExpression = this.preprocessExpression(expression);
      
      // Sanitize the expression to prevent code injection
      const sanitizedExpression = this.sanitizeExpression(processedExpression);
      
      // Evaluate using Function constructor (safer than eval)
      const result = Function(`"use strict"; return (${sanitizedExpression})`)();
      
      // Round to reasonable precision
      return this.formatResult(result);
    } catch (error) {
      throw new Error('Please provide a valid mathematical expression');
    }
  }

  /**
   * Handle percentage calculations
   */
  static evaluatePercentage(expression) {
    // Handle "X% of Y" format
    const percentOfMatch = expression.match(/(\d+(?:\.\d+)?)%\s*of\s*(\d+(?:\.\d+)?)/i);
    if (percentOfMatch) {
      const percentage = parseFloat(percentOfMatch[1]);
      const value = parseFloat(percentOfMatch[2]);
      return this.formatResult((percentage / 100) * value);
    }

    // Handle "X% + Y" or similar operations
    const percentMatch = expression.match(/(\d+(?:\.\d+)?)%/);
    if (percentMatch) {
      const percentage = parseFloat(percentMatch[1]);
      const decimal = percentage / 100;
      const newExpression = expression.replace(/(\d+(?:\.\d+)?)%/, decimal.toString());
      return this.evaluate(newExpression);
    }

    throw new Error('Invalid percentage format');
  }

  /**
   * Preprocess expression to handle common mathematical functions
   */
  static preprocessExpression(expression) {
    return expression
      .replace(/\bsqrt\(/g, 'Math.sqrt(')
      .replace(/\bsin\(/g, 'Math.sin(')
      .replace(/\bcos\(/g, 'Math.cos(')
      .replace(/\btan\(/g, 'Math.tan(')
      .replace(/\blog\(/g, 'Math.log10(')
      .replace(/\bln\(/g, 'Math.log(')
      .replace(/\babs\(/g, 'Math.abs(')
      .replace(/\bpow\(/g, 'Math.pow(')
      .replace(/\bfloor\(/g, 'Math.floor(')
      .replace(/\bceil\(/g, 'Math.ceil(')
      .replace(/\bround\(/g, 'Math.round(')
      .replace(/\bpi\b/g, 'Math.PI')
      .replace(/\be\b/g, 'Math.E')
      .replace(/\^/g, '**'); // Handle exponentiation
  }

  /**
   * Sanitize expression to prevent code injection
   */
  static sanitizeExpression(expression) {
    // Allow only safe mathematical operations and Math object methods
    const allowedPattern = /^[0-9+\-*/().\s^%MathPIEsqrtincotagbleflourcpowxy,]+$/;
    
    if (!allowedPattern.test(expression)) {
      throw new Error('Expression contains invalid characters');
    }

    return expression;
  }

  /**
   * Format the result to a reasonable precision
   */
  static formatResult(result) {
    if (!isFinite(result)) {
      throw new Error('Calculation resulted in infinity or NaN');
    }

    // Round to 10 decimal places to avoid floating point issues
    const rounded = Math.round(result * 10000000000) / 10000000000;
    
    // Return integer if it's a whole number
    return rounded % 1 === 0 ? rounded.toString() : rounded.toString();
  }

  /**
   * Perform basic arithmetic operations
   */
  static add(a, b) {
    return this.formatResult(a + b);
  }

  static subtract(a, b) {
    return this.formatResult(a - b);
  }

  static multiply(a, b) {
    return this.formatResult(a * b);
  }

  static divide(a, b) {
    if (b === 0) {
      throw new Error('Division by zero is not allowed');
    }
    return this.formatResult(a / b);
  }

  static power(base, exponent) {
    return this.formatResult(Math.pow(base, exponent));
  }

  static percentage(value, percentage) {
    return this.formatResult((percentage / 100) * value);
  }

  /**
   * Convert between different number bases
   */
  static convertBase(number, fromBase, toBase) {
    const decimal = parseInt(number, fromBase);
    return decimal.toString(toBase);
  }

  /**
   * Calculate compound interest
   */
  static compoundInterest(principal, rate, time, compound = 1) {
    const amount = principal * Math.pow(1 + rate / compound, compound * time);
    return this.formatResult(amount);
  }
}