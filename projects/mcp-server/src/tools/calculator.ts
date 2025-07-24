interface CalculatorArgs {
  expression: string;
}

export async function calculatorTool(args: CalculatorArgs) {
  const { expression } = args;
  
  try {
    // Simple and safe calculator using Function constructor with limited scope
    // Only allow basic math operations
    const sanitizedExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
    
    if (sanitizedExpression !== expression) {
      throw new Error('Invalid characters in expression. Only numbers and basic operators (+, -, *, /, ()) are allowed.');
    }
    
    // Evaluate the expression safely
    const result = Function(`"use strict"; return (${sanitizedExpression})`)();
    
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Expression did not evaluate to a valid number');
    }
    
    return {
      content: [
        {
          type: "text" as const,
          text: `🧮 Calculation Result:
Expression: ${expression}
Result: ${result}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `❌ Calculation Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
} 