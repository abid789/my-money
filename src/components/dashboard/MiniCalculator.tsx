import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { X, Copy, Check, Calculator as CalcIcon, Delete } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// ─── Safe Math Evaluator (NO eval) ──────────────────────────────────────────

/**
 * Eliminates floating-point artifacts like 0.1 + 0.2 = 0.30000000000000004
 */
function cleanFloat(num: number): number {
  return Number(Math.round(Number(num + 'e+10')) + 'e-10');
}

/**
 * Safely evaluates arithmetic expressions with standard operator precedence.
 * Supports +, -, *, /, % and decimal numbers.
 * Never uses eval() or new Function().
 */
export function safeEvaluate(expression: string): { result?: number; error?: string } {
  try {
    // Sanitize: allow only digits, decimal point, operators and spaces
    const clean = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').trim();
    if (!clean) return { result: 0 };

    // Tokenize
    const tokens: string[] = [];
    let currentNum = '';

    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];

      if ((char >= '0' && char <= '9') || char === '.') {
        currentNum += char;
      } else if (['+', '-', '*', '/', '%'].includes(char)) {
        // Handle unary minus at start or after operator
        if (char === '-' && (tokens.length === 0 || ['+', '-', '*', '/', '%'].includes(tokens[tokens.length - 1])) && !currentNum) {
          currentNum = '-';
          continue;
        }

        if (currentNum) {
          tokens.push(currentNum);
          currentNum = '';
        }
        tokens.push(char);
      }
    }
    if (currentNum) {
      tokens.push(currentNum);
    }

    if (tokens.length === 0) return { result: 0 };

    // Handle percentage: convert tokens like ['50', '%'] or ['100', '+', '10', '%']
    // Step 1: Pre-process %
    const processedTokens: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === '%') {
        if (processedTokens.length > 0) {
          const prev = parseFloat(processedTokens.pop()!);
          // If followed by addition/subtraction, like 100 + 10%, calculate percentage of base
          if (processedTokens.length >= 2 && ['+', '-'].includes(processedTokens[processedTokens.length - 1])) {
            const base = parseFloat(processedTokens[processedTokens.length - 2]);
            processedTokens.push(String(cleanFloat((base * prev) / 100)));
          } else {
            processedTokens.push(String(cleanFloat(prev / 100)));
          }
        }
      } else {
        processedTokens.push(tokens[i]);
      }
    }

    // Step 2: Shunting-yard Algorithm for Operator Precedence (+, - vs *, /)
    const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
    const outputQueue: string[] = [];
    const operatorStack: string[] = [];

    for (const token of processedTokens) {
      if (!isNaN(Number(token))) {
        outputQueue.push(token);
      } else if (token in precedence) {
        while (
          operatorStack.length > 0 &&
          precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]
        ) {
          outputQueue.push(operatorStack.pop()!);
        }
        operatorStack.push(token);
      }
    }

    while (operatorStack.length > 0) {
      outputQueue.push(operatorStack.pop()!);
    }

    // Step 3: Evaluate Reverse Polish Notation (RPN)
    const evalStack: number[] = [];

    for (const token of outputQueue) {
      if (!isNaN(Number(token))) {
        evalStack.push(parseFloat(token));
      } else {
        const b = evalStack.pop();
        const a = evalStack.pop();

        if (a === undefined || b === undefined) {
          return { error: 'Invalid expression' };
        }

        let res = 0;
        switch (token) {
          case '+':
            res = a + b;
            break;
          case '-':
            res = a - b;
            break;
          case '*':
            res = a * b;
            break;
          case '/':
            if (b === 0) {
              return { error: 'Cannot divide by zero' };
            }
            res = a / b;
            break;
          default:
            return { error: 'Unknown operator' };
        }
        evalStack.push(cleanFloat(res));
      }
    }

    if (evalStack.length !== 1 || isNaN(evalStack[0])) {
      return { error: 'Invalid calculation' };
    }

    return { result: cleanFloat(evalStack[0]) };
  } catch {
    return { error: 'Calculation error' };
  }
}

// ─── Component Props ────────────────────────────────────────────────────────

interface MiniCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MiniCalculator({ isOpen, onClose }: MiniCalculatorProps) {
  const { language } = useLanguage();
  const { activeTheme } = useTheme();

  const [expression, setExpression] = useState<string>('');
  const [currentDisplay, setCurrentDisplay] = useState<string>('0');
  const [isNewNumber, setIsNewNumber] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear everything
  const handleClear = useCallback(() => {
    setExpression('');
    setCurrentDisplay('0');
    setIsNewNumber(true);
  }, []);

  // Backspace / Delete last digit
  const handleDeleteDigit = useCallback(() => {
    if (currentDisplay.length > 1) {
      setCurrentDisplay((prev) => prev.slice(0, -1));
    } else {
      setCurrentDisplay('0');
      setIsNewNumber(true);
    }
  }, [currentDisplay]);

  // Input Digit
  const handleDigit = useCallback(
    (digit: string) => {
      if (isNewNumber || currentDisplay === '0') {
        setCurrentDisplay(digit);
        setIsNewNumber(false);
      } else {
        // Prevent exceeding 14 digits
        if (currentDisplay.replace(/[^0-9]/g, '').length >= 14) return;
        setCurrentDisplay((prev) => prev + digit);
      }
    },
    [currentDisplay, isNewNumber]
  );

  // Decimal Point
  const handleDecimal = useCallback(() => {
    if (isNewNumber) {
      setCurrentDisplay('0.');
      setIsNewNumber(false);
    } else if (!currentDisplay.includes('.')) {
      setCurrentDisplay((prev) => prev + '.');
    }
  }, [currentDisplay, isNewNumber]);

  // Sign toggle (+/-)
  const handleToggleSign = useCallback(() => {
    if (currentDisplay === '0') return;
    if (currentDisplay.startsWith('-')) {
      setCurrentDisplay((prev) => prev.slice(1));
    } else {
      setCurrentDisplay((prev) => '-' + prev);
    }
  }, [currentDisplay]);

  // Operator (+, −, ×, ÷)
  const handleOperator = useCallback(
    (op: string) => {
      let currentVal = currentDisplay;

      if (expression && !isNewNumber) {
        // Evaluate previous running expression
        const evalRes = safeEvaluate(`${expression} ${currentVal}`);
        if (evalRes.result !== undefined) {
          currentVal = String(evalRes.result);
          setCurrentDisplay(currentVal);
        }
      }

      setExpression(`${currentVal} ${op}`);
      setIsNewNumber(true);
    },
    [currentDisplay, expression, isNewNumber]
  );

  // Percentage
  const handlePercentage = useCallback(() => {
    const num = parseFloat(currentDisplay);
    if (!isNaN(num)) {
      if (expression) {
        // If there's an ongoing expression, calculate % of the base number
        const parts = expression.trim().split(' ');
        const baseNum = parseFloat(parts[0]);
        if (!isNaN(baseNum)) {
          const pctVal = cleanFloat((baseNum * num) / 100);
          setCurrentDisplay(String(pctVal));
          return;
        }
      }
      setCurrentDisplay(String(cleanFloat(num / 100)));
    }
  }, [currentDisplay, expression]);

  // Equals (=)
  const handleEquals = useCallback(() => {
    if (!expression) return;

    const fullExp = `${expression} ${currentDisplay}`;
    const { result, error } = safeEvaluate(fullExp);

    if (error) {
      toast.error(error);
      return;
    }

    if (result !== undefined) {
      setExpression(`${fullExp} =`);
      setCurrentDisplay(String(result));
      setIsNewNumber(true);
    }
  }, [expression, currentDisplay]);

  // Copy result
  const handleCopyResult = useCallback(() => {
    const textToCopy = currentDisplay.replace(/,/g, '');
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    toast.success(
      language === 'bn'
        ? `৳${textToCopy} কপি করা হয়েছে!`
        : `Copied ৳${textToCopy} to clipboard!`
    );
    setTimeout(() => setIsCopied(false), 2000);
  }, [currentDisplay, language]);

  // Keyboard navigation on desktop
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is inside an input field elsewhere
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        handleDecimal();
      } else if (e.key === '+') {
        e.preventDefault();
        handleOperator('+');
      } else if (e.key === '-') {
        e.preventDefault();
        handleOperator('−');
      } else if (e.key === '*' || e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
      } else if (e.key === '%') {
        e.preventDefault();
        handlePercentage();
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteDigit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    handleDigit,
    handleDecimal,
    handleOperator,
    handlePercentage,
    handleEquals,
    handleDeleteDigit,
    handleClear,
    onClose,
  ]);

  if (!isOpen) return null;

  // Theming classes
  const isIphone = activeTheme === 'iphone';
  const isOneUi = activeTheme === 'one-ui';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        ref={containerRef}
        className={clsx(
          'w-full max-w-[340px] overflow-hidden transition-all duration-200 select-none shadow-2xl',
          // Liquid Glass theme
          isIphone &&
            'rounded-3xl border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-indigo-500/10 dark:shadow-black/50',
          // Samsung One UI theme
          isOneUi &&
            'rounded-[28px] border border-gray-200 bg-[#f4f6fa] dark:border-gray-800 dark:bg-[#000000]',
          // Basic theme
          !isIphone &&
            !isOneUi &&
            'rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
        )}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-2">
            <div
              className={clsx(
                'flex h-7 w-7 items-center justify-center rounded-lg shadow-xs text-xs font-bold text-white',
                isIphone
                  ? 'bg-gradient-to-tr from-indigo-500 to-sky-400'
                  : isOneUi
                  ? 'bg-[#0c66e4]'
                  : 'bg-teal-600'
              )}
            >
              <CalcIcon className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold tracking-tight text-gray-800 dark:text-gray-100">
              {language === 'bn' ? 'মিনি ক্যালকুলেটর' : 'Mini Calculator'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyResult}
              title={language === 'bn' ? 'ফলাফল কপি করুন' : 'Copy result to clipboard'}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">কপি হয়েছে</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>কপি</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Display Screen */}
        <div className="px-4 py-3 bg-gray-50/60 dark:bg-black/30 border-y border-gray-100 dark:border-gray-800/80 text-right">
          <div className="h-5 text-xs font-medium text-gray-400 dark:text-gray-500 tracking-wide overflow-hidden text-ellipsis whitespace-nowrap">
            {expression || '\u00A0'}
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white overflow-hidden text-ellipsis whitespace-nowrap">
            {currentDisplay}
          </div>
        </div>

        {/* Keypad Grid (5 rows × 4 cols) */}
        <div className="p-3.5 grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center justify-center h-12 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70 transition-all active:scale-95"
          >
            AC
          </button>
          <button
            type="button"
            onClick={handleDeleteDigit}
            className="flex items-center justify-center h-12 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750 transition-all active:scale-95"
            title="Backspace"
          >
            <Delete className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleToggleSign}
            className="flex items-center justify-center h-12 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750 transition-all active:scale-95"
          >
            +/−
          </button>
          <button
            type="button"
            onClick={() => handleOperator('÷')}
            className={clsx(
              'flex items-center justify-center h-12 rounded-xl text-sm font-bold text-white transition-all active:scale-95',
              isIphone
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                : isOneUi
                ? 'bg-[#0c66e4] hover:bg-[#0a55be]'
                : 'bg-teal-600 hover:bg-teal-700'
            )}
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => handleDigit('7')}
            className="flex items-center justify-center h-12 rounded-xl text-sm font-semibold bg-white hover:bg-gray-50 border border-gray-200/70 text-gray-900 dark:bg-gray-800/80 dark:border-gray-700/60 dark:text-white dark:hover:bg-gray-750 shadow-2xs transition-all active:scale-95"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => handleDigit('8')}
            className="flex items-center justify-center h-12 rounded-xl text-sm font-semibold bg-white hover:bg-gray-50 border border-gray-200/70 text-gray-900 dark:bg-gray-800/80 dark:border-gray-700/60 dark:text-white dark:hover:bg-gray-750 shadow-2xs transition-all active:scale-95"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => handleDigit('9')}
            className="flex items-center justify-center h-12 rounded-xl text-sm font-semibold bg-white hover:bg-gray-50 border border-gray-200/70 text-gray-900 dark:bg-gray-800/80 dark:border-gray-700/60 dark:text-white dark:hover:bg-gray-750 shadow-2xs transition-all active:scale-95"
          >
            9
          </button>
          <button
            type="button"
            onClick={() => handleOperator('×')}
            className={clsx(
              'flex items-center justify-center h-12 rounded-xl text-sm font-bold text-white transition-all active:scale-95',
              isIphone
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                : isOneUi
                ? 'bg-[#0c66e4] hover:bg-[#0a55be]'
                : 'bg-teal-600 hover:bg-teal-700'
            )}
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onClick={() => handleDigit('4')}
            className="flex items-center justify-center h-12 rounded-xl text-sm font-semibold bg-white hover:bg-gray-50 border border-gray-200/70 text-gray-900 dark:bg-gray-800/80 dark:border-gray-700/60 dark:text-white dark:hover:bg-gray-750 shadow-2xs transition-all active:scale-95"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => handleDigit('5')}
            className="flex items-center justify-center h-12 rounded-xl text-sm font-semibold bg-white hover:bg-gray-50 border border-gray-200/70 text-gray-900 dark:bg-gray-800/80 dark:border-gray-700/60 dark:text-white dark:hover:bg-gray-750 shadow-2xs transition-all active:scale-95"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => handleDigit('6')}
            className="flex items-center justify-center h-12 rounded-xl text-sm font-semibold bg-white hover:bg-gray-50 border border-gray-200/70 text-gray-900 dark:bg-gray-800/80 dark:border-gray-700/60 dark:text-white dark:hover:bg-gray-750 shadow-2xs transition-all active:scale-95"
          >
            6
          </button>
          <button
            type="button"
            onClick={() => handleOperator('−')}
            className={clsx(
              'flex items-center justify-center h-12 rounded-xl text-sm font-bold text-white transition-all active:scale-95',
              isIphone
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                : isOneUi
                ? 'bg-[#0c66e4] hover:bg-[#0a55be]'
                : 'bg-teal-600 hover:bg-teal-700'
            )}
          >
            −
          </button>

          {/* Row 4 */}
          <button
            type="button"
            onClick={() => handleDigit('1')}
            className="flex items-center justify-center h-12 rounded-xl text-sm font-semibold bg-white hover:bg-gray-50 border border-gray-200/70 text-gray-900 dark:bg-gray-800/80 dark:border-gray-700/60 dark:text-white dark:hover:bg-gray-750 shadow-2xs transition-all active:scale-95"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => handleDigit('2')}
            className="flex items-center justify-center h-12 rounded-xl text-sm font-semibold bg-white hover:bg-gray-50 border border-gray-200/70 text-gray-900 dark:bg-gray-800/80 dark:border-gray-700/60 dark:text-white dark:hover:bg-gray-750 shadow-2xs transition-all active:scale-95"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => handleDigit('3')}
            className="flex items-center justify-center h-12 rounded-xl text-sm font-semibold bg-white hover:bg-gray-50 border border-gray-200/70 text-gray-900 dark:bg-gray-800/80 dark:border-gray-700/60 dark:text-white dark:hover:bg-gray-750 shadow-2xs transition-all active:scale-95"
          >
            3
          </button>
          <button
            type="button"
            onClick={() => handleOperator('+')}
            className={clsx(
              'flex items-center justify-center h-12 rounded-xl text-sm font-bold text-white transition-all active:scale-95',
              isIphone
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                : isOneUi
                ? 'bg-[#0c66e4] hover:bg-[#0a55be]'
                : 'bg-teal-600 hover:bg-teal-700'
            )}
          >
            +
          </button>

          {/* Row 5 */}
          <button
            type="button"
            onClick={handlePercentage}
            className="flex items-center justify-center h-12 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750 transition-all active:scale-95"
          >
            %
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="flex items-center justify-center h-12 rounded-xl text-sm font-semibold bg-white hover:bg-gray-50 border border-gray-200/70 text-gray-900 dark:bg-gray-800/80 dark:border-gray-700/60 dark:text-white dark:hover:bg-gray-750 shadow-2xs transition-all active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDecimal}
            className="flex items-center justify-center h-12 rounded-xl text-base font-bold bg-white hover:bg-gray-50 border border-gray-200/70 text-gray-900 dark:bg-gray-800/80 dark:border-gray-700/60 dark:text-white dark:hover:bg-gray-750 shadow-2xs transition-all active:scale-95"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleEquals}
            className={clsx(
              'flex items-center justify-center h-12 rounded-xl text-base font-bold text-white shadow-md transition-all active:scale-95',
              isIphone
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-indigo-500/30'
                : isOneUi
                ? 'bg-[#0c66e4] hover:bg-[#0a55be] shadow-blue-500/30'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'
            )}
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
}
