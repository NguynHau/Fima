import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react';
import { formatMonthVN, getTodayString } from '../utils/formatters';

interface DatePickerModalProps {
  isOpen: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  selectedDate,
  onSelectDate,
  onClose,
}) => {
  const todayStr = useMemo(() => getTodayString(), []);

  // Parse initial year & month from selectedDate
  const [viewYear, setViewYear] = useState<number>(() => {
    if (selectedDate) {
      const [y] = selectedDate.split('-').map(Number);
      if (!isNaN(y)) return y;
    }
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (selectedDate) {
      const [, m] = selectedDate.split('-').map(Number);
      if (!isNaN(m)) return m;
    }
    return new Date().getMonth() + 1;
  });

  // Sync view when modal opens or selectedDate changes
  useEffect(() => {
    if (isOpen && selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setViewYear(y);
        setViewMonth(m);
      }
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectToday = () => {
    onSelectDate(todayStr);
    onClose();
  };

  // Build calendar matrix (Monday to Sunday)
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0 is Sunday, 1 is Monday
  // In Vietnam, week starts on Monday (1). Sunday is 7.
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Previous month trailing days
  const prevMonthDaysCount = new Date(viewYear, viewMonth - 1, 0).getDate();
  const prevMonthDays = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = prevMonthDaysCount - i;
    const m = viewMonth === 1 ? 12 : viewMonth - 1;
    const y = viewMonth === 1 ? viewYear - 1 : viewYear;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    prevMonthDays.push({ day, dateStr, isCurrentMonth: false });
  }

  // Current month days
  const currentMonthDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    currentMonthDays.push({ day: d, dateStr, isCurrentMonth: true });
  }

  // Next month leading days to complete grid (42 cells or 35 cells)
  const totalSlots = Math.ceil((prevMonthDays.length + currentMonthDays.length) / 7) * 7;
  const nextMonthDaysCount = totalSlots - (prevMonthDays.length + currentMonthDays.length);
  const nextMonthDays = [];
  for (let d = 1; d <= nextMonthDaysCount; d++) {
    const m = viewMonth === 12 ? 1 : viewMonth + 1;
    const y = viewMonth === 12 ? viewYear + 1 : viewYear;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    nextMonthDays.push({ day: d, dateStr, isCurrentMonth: false });
  }

  const allCalendarDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  const weekHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-[#141414] border border-[#282828] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262626] mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 text-neutral-200 flex items-center justify-center">
              <CalendarIcon size={15} />
            </div>
            <h3 className="text-sm font-bold text-white">Chọn ngày giao dịch</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#202020] hover:bg-[#2a2a2a] text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Đóng"
          >
            <X size={15} />
          </button>
        </div>

        {/* Month Navigation (< Tháng M, YYYY >) */}
        <div className="flex items-center justify-between px-1 py-2 mb-2 bg-[#1a1a1a] border border-[#262626] rounded-2xl">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-xl bg-[#222222] hover:bg-[#2c2c2c] active:scale-90 text-neutral-200 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Tháng trước"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">
              {formatMonthVN(viewYear, viewMonth)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-xl bg-[#222222] hover:bg-[#2c2c2c] active:scale-90 text-neutral-200 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Tháng sau"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1.5 px-1">
          {weekHeaders.map((header, idx) => (
            <div
              key={header}
              className={`text-[11px] font-bold py-1 ${
                idx === 6 ? 'text-rose-400' : 'text-neutral-400'
              }`}
            >
              {header}
            </div>
          ))}
        </div>

        {/* Calendar Matrix */}
        <div className="grid grid-cols-7 gap-1 p-1">
          {allCalendarDays.map((cell) => {
            const isSelected = cell.dateStr === selectedDate;
            const isToday = cell.dateStr === todayStr;

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => {
                  onSelectDate(cell.dateStr);
                  onClose();
                }}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-semibold relative transition-all active:scale-90 cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-200 text-black font-black shadow-md shadow-white/10'
                    : cell.isCurrentMonth
                    ? isToday
                      ? 'bg-white/10 border border-white/20 text-white font-bold'
                      : 'text-neutral-200 hover:bg-[#242424]'
                    : 'text-neutral-600 hover:text-neutral-400 hover:bg-[#1a1a1a]'
                }`}
              >
                <span>{cell.day}</span>
                {isToday && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-white mt-0.5 absolute bottom-1.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick select "Hôm nay" button */}
        <div className="mt-3 pt-3 border-t border-[#262626] flex items-center justify-between">
          <button
            type="button"
            onClick={handleSelectToday}
            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-neutral-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            Hôm nay ({todayStr.split('-').slice(1).reverse().join('/')})
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-full bg-[#202020] hover:bg-[#2a2a2a] text-xs font-semibold text-neutral-300 hover:text-white transition-all active:scale-95 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
