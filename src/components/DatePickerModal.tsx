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
    <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 text-neutral-100">
      <div className="w-full max-w-sm bg-[#282c34] border border-[#3a3f4b] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#3a3f4b] mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#323640] border border-[#3a3f4b] text-neutral-200 flex items-center justify-center">
              <CalendarIcon size={18} />
            </div>
            <h3 className="text-base font-extrabold text-white">Chọn ngày giao dịch</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#323640] hover:bg-[#3c414f] text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Month Navigation (< Tháng M, YYYY >) */}
        <div className="flex items-center justify-between px-2 py-2.5 mb-2.5 bg-[#313540] border border-[#3a3f4b] rounded-2xl">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-9 h-9 rounded-xl bg-[#3c414f] hover:bg-[#464c5d] active:scale-90 text-neutral-200 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Tháng trước"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-white tracking-wide">
              {formatMonthVN(viewYear, viewMonth)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="w-9 h-9 rounded-xl bg-[#3c414f] hover:bg-[#464c5d] active:scale-90 text-neutral-200 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Tháng sau"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2 px-1">
          {weekHeaders.map((header, idx) => (
            <div
              key={header}
              className={`text-xs font-black py-1 ${
                idx === 6 ? 'text-rose-400' : 'text-neutral-300'
              }`}
            >
              {header}
            </div>
          ))}
        </div>

        {/* Calendar Matrix */}
        <div className="grid grid-cols-7 gap-1.5 p-1">
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
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs sm:text-sm font-bold relative transition-all active:scale-90 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-400 text-black font-black shadow-md'
                    : cell.isCurrentMonth
                    ? isToday
                      ? 'bg-white/20 border border-white/30 text-white font-extrabold'
                      : 'text-neutral-100 hover:bg-[#323640]'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#323640]/50'
                }`}
              >
                <span>{cell.day}</span>
                {isToday && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5 absolute bottom-1.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick select "Hôm nay" button */}
        <div className="mt-3.5 pt-3.5 border-t border-[#3a3f4b] flex items-center justify-between">
          <button
            type="button"
            onClick={handleSelectToday}
            className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
          >
            Hôm nay ({todayStr.split('-').slice(1).reverse().join('/')})
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-[#323640] hover:bg-[#3c414f] text-xs sm:text-sm font-bold text-neutral-200 hover:text-white transition-all active:scale-95 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
