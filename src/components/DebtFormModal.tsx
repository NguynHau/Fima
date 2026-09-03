import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, DollarSign, User, FileText, CheckCircle2 } from 'lucide-react';
import { type Debt } from '../types';
import { formatVND } from '../utils/formatters';

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    amount: number;
    paidAmount: number;
    date: string;
    type: 'lend' | 'borrow';
    note?: string;
  }) => void;
  debt?: Debt; // If provided, we are in Edit mode
}

export const DebtFormModal: React.FC<DebtFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  debt,
}) => {
  const [type, setType] = useState<'lend' | 'borrow'>('lend');
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paidAmountStr, setPaidAmountStr] = useState('0');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (debt) {
        setType(debt.type);
        setName(debt.name);
        setAmountStr(debt.amount.toString());
        setPaidAmountStr(debt.paidAmount.toString());
        setDate(debt.date || new Date().toISOString().split('T')[0]);
        setNote(debt.note || '');
      } else {
        setType('lend');
        setName('');
        setAmountStr('');
        setPaidAmountStr('0');
        setDate(new Date().toISOString().split('T')[0]);
        setNote('');
      }
    }
  }, [isOpen, debt]);

  if (!isOpen) return null;

  const handleAmountChange = (val: string, setter: (s: string) => void) => {
    const numeric = val.replace(/\D/g, '');
    setter(numeric);
  };

  const formatInputValue = (valStr: string) => {
    if (!valStr) return '';
    const num = parseInt(valStr, 10);
    if (isNaN(num)) return '';
    return num.toLocaleString('vi-VN');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(amountStr, 10);
    const paidAmount = parseInt(paidAmountStr, 10) || 0;

    if (!name.trim()) {
      alert('Vui lòng nhập tên người hoặc nội dung khoản nợ');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    onSubmit({
      name: name.trim(),
      amount,
      paidAmount: Math.min(paidAmount, amount),
      date,
      type,
      note: note.trim(),
    });
  };

  const amountValue = parseInt(amountStr, 10) || 0;
  const paidAmountValue = parseInt(paidAmountStr, 10) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div 
        id="debt-form-modal-container"
        className="w-full max-w-md bg-[#161616] border border-neutral-800 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800/80 flex items-center justify-between shrink-0 bg-[#161616]">
          <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
            {debt ? 'Cập nhật Công nợ' : 'Thêm Công nợ mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white active:scale-90 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Type Selection: Lend vs Borrow */}
          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs font-black text-neutral-400 uppercase tracking-wider block px-0.5">
              Loại công nợ
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[#1e1e1e] p-1 rounded-2xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setType('lend')}
                className={`py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  type === 'lend'
                    ? 'bg-neutral-700 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Người khác nợ mình (Cho vay)
              </button>
              <button
                type="button"
                onClick={() => setType('borrow')}
                className={`py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  type === 'borrow'
                    ? 'bg-neutral-700 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Mình nợ người khác (Đi vay)
              </button>
            </div>
          </div>

          {/* Debt Name / Partner */}
          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs font-black text-neutral-400 uppercase tracking-wider block px-0.5">
              Họ tên / Khoản nợ
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500">
                <User size={16} />
              </span>
              <input
                type="text"
                placeholder="Nhập tên người nợ hoặc lý do..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1e1e1e] rounded-2xl border border-neutral-800 py-3.5 pl-10 pr-4 text-xs sm:text-sm text-white font-semibold focus:outline-none focus:border-neutral-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Amount Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total Amount */}
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-black text-neutral-400 uppercase tracking-wider block px-0.5">
                Số tiền nợ gốc
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-sm">
                  ₫
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatInputValue(amountStr)}
                  onChange={(e) => handleAmountChange(e.target.value, setAmountStr)}
                  className="w-full bg-[#1e1e1e] rounded-2xl border border-neutral-800 py-3.5 pl-8 pr-4 text-xs sm:text-sm text-white font-mono font-bold focus:outline-none focus:border-neutral-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* Paid Amount */}
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-black text-neutral-400 uppercase tracking-wider block px-0.5">
                Số tiền đã thanh toán
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm">
                  ₫
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatInputValue(paidAmountStr)}
                  onChange={(e) => handleAmountChange(e.target.value, setPaidAmountStr)}
                  className="w-full bg-[#1e1e1e] rounded-2xl border border-neutral-800 py-3.5 pl-8 pr-4 text-xs sm:text-sm text-neutral-400 font-mono font-semibold focus:outline-none focus:border-neutral-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs font-black text-neutral-400 uppercase tracking-wider block px-0.5">
              Ngày ghi nhận
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500">
                <CalendarIcon size={16} />
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#1e1e1e] rounded-2xl border border-neutral-800 py-3.5 pl-10 pr-4 text-xs sm:text-sm text-white font-semibold focus:outline-none focus:border-neutral-500 transition-all"
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs font-black text-neutral-400 uppercase tracking-wider block px-0.5">
              Ghi chú thêm (Không bắt buộc)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-neutral-500">
                <FileText size={16} />
              </span>
              <textarea
                placeholder="Ví dụ: Hẹn trả vào cuối tháng này..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full h-20 bg-[#1e1e1e] rounded-2xl border border-neutral-800 py-3 pl-10 pr-4 text-xs sm:text-sm text-white font-semibold focus:outline-none focus:border-neutral-500 transition-all resize-none"
              />
            </div>
          </div>

          {/* Remainder math display */}
          {amountValue > 0 && (
            <div className="p-3.5 bg-neutral-900 rounded-2xl border border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
              <span className="font-semibold">Còn lại cần trả:</span>
              <span className="font-mono font-black text-white text-sm">
                {formatVND(Math.max(0, amountValue - paidAmountValue))}
              </span>
            </div>
          )}
          
          <button type="submit" className="hidden" id="debt-form-submit-hidden" />
        </form>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-neutral-800/80 shrink-0 bg-[#161616] flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all active:scale-95 cursor-pointer text-center"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 bg-white hover:bg-neutral-200 text-black py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-black transition-all active:scale-95 cursor-pointer text-center"
          >
            {debt ? 'Lưu cập nhật' : 'Thêm khoản nợ'}
          </button>
        </div>
      </div>
    </div>
  );
};
