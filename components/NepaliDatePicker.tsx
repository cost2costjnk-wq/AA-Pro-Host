
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import { adToBs, bsToAd, BS_MONTHS, getBsMonthDays, isValidBsDate, formatNepaliDate, getCurrentBsParts } from '../services/nepaliDateService';

interface NepaliDatePickerProps {
  value: string; // ISO AD Date string
  onChange: (isoDate: string) => void;
  placeholder?: string;
  className?: string;
}

const NepaliDatePicker: React.FC<NepaliDatePickerProps> = ({ 
  value, 
  onChange, 
  placeholder = "DD/MM/YYYY",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Internal state for the calendar view (BS)
  const [viewYear, setViewYear] = useState(2081);
  const [viewMonth, setViewMonth] = useState(0); 

  // Sync internal input string with external value (AD ISO -> BS String)
  useEffect(() => {
    if (value) {
      setInputValue(formatNepaliDate(value));
      const bs = adToBs(new Date(value));
      setViewYear(bs.year);
      setViewMonth(bs.month - 1);
    } else {
      setInputValue('');
    }
  }, [value]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d/]/g, ''); // Only digits and slash
    
    // Auto-formatting (DD/MM/YYYY)
    if (val.length === 2 && !val.includes('/')) {
        val = val + '/';
    } else if (val.length === 5 && val.split('/').length === 2) {
        val = val + '/';
    }
    
    setInputValue(val.substring(0, 10)); // Max 10 chars
  };

  const validateAndConfirm = () => {
    if (!inputValue) {
        onChange('');
        return;
    }

    const currentBs = getCurrentBsParts();
    const parts = inputValue.split('/');
    
    let d = parseInt(parts[0]);
    let m = parts.length > 1 && parts[1] !== '' ? parseInt(parts[1]) : currentBs.month;
    let y = parts.length > 2 && parts[2] !== '' ? parseInt(parts[2]) : currentBs.year;

    // Basic logic to handle year abbreviations like '81' for '2081'
    if (y < 100) y = 2000 + y;

    const reconstructed = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

    if (isValidBsDate(reconstructed)) {
        const adDate = bsToAd(y, m, d);
        adDate.setHours(12, 0, 0, 0); 
        onChange(adDate.toISOString());
        setInputValue(reconstructed);
    } else {
        // Reset to original if invalid
        setInputValue(value ? formatNepaliDate(value) : '');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        validateAndConfirm();
        setIsOpen(false);
    }
    if (e.key === 'Escape') {
        setIsOpen(false);
    }
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleDateClick = (day: number) => {
    const adDate = bsToAd(viewYear, viewMonth + 1, day);
    adDate.setHours(12, 0, 0, 0); 
    onChange(adDate.toISOString());
    setIsOpen(false);
  };

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue('');
    onChange('');
  };

  const daysInMonth = getBsMonthDays(viewYear, viewMonth);
  const firstDayAD = bsToAd(viewYear, viewMonth + 1, 1);
  const startDayOfWeek = firstDayAD.getDay();

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const currentDateAD = bsToAd(viewYear, viewMonth + 1, d);
      const isSelected = value && 
        new Date(value).toDateString() === currentDateAD.toDateString();
      const isToday = new Date().toDateString() === currentDateAD.toDateString();

      days.push(
        <button
          key={d}
          type="button"
          onClick={() => handleDateClick(d)}
          className={`h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors
            ${isSelected 
              ? 'bg-brand-500 text-white font-bold' 
              : isToday 
                ? 'bg-brand-50 text-brand-600 font-semibold border border-brand-200'
                : 'hover:bg-gray-100 text-gray-700'
            }
          `}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition-all">
        <div className="p-2.5 text-gray-400">
            <Calendar className="w-4 h-4" />
        </div>
        <input 
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent py-2 px-1 text-sm outline-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-700 dark:text-gray-200"
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={validateAndConfirm}
            onFocus={() => setIsOpen(true)}
        />
        {inputValue && (
            <button 
                type="button"
                onClick={clearDate} 
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        )}
        <button 
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-2.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 border-l border-gray-300 dark:border-gray-600 transition-colors"
        >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 w-72 z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="font-bold text-gray-800 dark:text-gray-200">
              {BS_MONTHS[viewMonth]} {viewYear}
            </div>
            <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 justify-items-center">
            {renderDays()}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between">
            <button 
              type="button"
              onClick={() => { onChange(''); setInputValue(''); setIsOpen(false); }}
              className="text-xs text-red-500 hover:text-red-600 font-medium"
            >
              Clear
            </button>
            <button 
              type="button"
              onClick={() => { onChange(new Date().toISOString()); setIsOpen(false); }}
              className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NepaliDatePicker;
