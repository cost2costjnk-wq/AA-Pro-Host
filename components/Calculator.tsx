
import React, { useState, useEffect, useRef } from 'react';
import { X, Delete } from 'lucide-react';

interface CalculatorProps {
  onClose: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ onClose }) => {
  const [input, setInput] = useState('0');
  const [expression, setExpression] = useState('');
  const [isResult, setIsResult] = useState(false);
  const calculatorRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calculatorRef.current && !calculatorRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (/[0-9.]/.test(key)) handleNumber(key);
      if (['+', '-', '*', '/'].includes(key)) handleOperator(key);
      if (key === 'Enter' || key === '=') handleEqual();
      if (key === 'Backspace') handleDelete();
      if (key === 'Escape') handleClear();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [input, expression]);

  const handleNumber = (num: string) => {
    if (isResult) {
      setInput(num);
      setIsResult(false);
    } else {
      if (num === '.' && input.includes('.')) return;
      setInput(input === '0' && num !== '.' ? num : input + num);
    }
  };

  const handleOperator = (op: string) => {
    setExpression(input + ' ' + op + ' ');
    setIsResult(false);
    setInput('0');
  };

  const handleEqual = () => {
    try {
      const fullExpression = expression + input;
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + fullExpression)();
      const formattedResult = String(Math.round(result * 10000) / 10000); // Prevent long decimals
      
      setInput(formattedResult);
      setExpression('');
      setIsResult(true);
    } catch (e) {
      setInput('Error');
      setIsResult(true);
    }
  };

  const handleClear = () => {
    setInput('0');
    setExpression('');
    setIsResult(false);
  };

  const handleDelete = () => {
    if (isResult) {
        handleClear();
        return;
    }
    if (input.length === 1) {
      setInput('0');
    } else {
      setInput(input.slice(0, -1));
    }
  };

  const handlePercent = () => {
    const val = parseFloat(input);
    setInput((val / 100).toString());
    setIsResult(true);
  };

  const btnClass = "h-12 w-12 rounded-full font-bold text-lg transition-all active:scale-95 flex items-center justify-center shadow-sm";
  const numBtn = `${btnClass} bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600`;
  const opBtn = `${btnClass} bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400`;
  const actionBtn = `${btnClass} bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200`;
  const equalsBtn = `${btnClass} bg-brand-500 text-white hover:bg-brand-600 w-full rounded-2xl`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
      <div 
        ref={calculatorRef}
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 w-[320px] p-5 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-500 dark:text-gray-400 text-sm tracking-widest uppercase">Calculator</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display */}
        <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl p-4 mb-5 text-right h-24 flex flex-col justify-end">
          <div className="text-xs text-gray-400 h-4">{expression}</div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white truncate tracking-wider">{input}</div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-3">
          <button onClick={handleClear} className={actionBtn}>C</button>
          <button onClick={handleDelete} className={actionBtn}><Delete className="w-5 h-5" /></button>
          <button onClick={handlePercent} className={actionBtn}>%</button>
          <button onClick={() => handleOperator('/')} className={opBtn}>÷</button>

          <button onClick={() => handleNumber('7')} className={numBtn}>7</button>
          <button onClick={() => handleNumber('8')} className={numBtn}>8</button>
          <button onClick={() => handleNumber('9')} className={numBtn}>9</button>
          <button onClick={() => handleOperator('*')} className={opBtn}>×</button>

          <button onClick={() => handleNumber('4')} className={numBtn}>4</button>
          <button onClick={() => handleNumber('5')} className={numBtn}>5</button>
          <button onClick={() => handleNumber('6')} className={numBtn}>6</button>
          <button onClick={() => handleOperator('-')} className={opBtn}>-</button>

          <button onClick={() => handleNumber('1')} className={numBtn}>1</button>
          <button onClick={() => handleNumber('2')} className={numBtn}>2</button>
          <button onClick={() => handleNumber('3')} className={numBtn}>3</button>
          <button onClick={() => handleOperator('+')} className={opBtn}>+</button>

          <button onClick={() => handleNumber('0')} className={`${numBtn} col-span-2 w-full rounded-2xl`}>0</button>
          <button onClick={() => handleNumber('.')} className={numBtn}>.</button>
          <button onClick={handleEqual} className={`${opBtn} bg-brand-500 text-white hover:bg-brand-600 dark:bg-brand-600 dark:text-white`}>=</button>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
