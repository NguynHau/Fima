import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Pencil, 
  Trash2, 
  DollarSign, 
  Check, 
  CreditCard,
  Building2,
  Wallet,
  X
} from 'lucide-react';
import { type Debt } from '../types';
import { getDebts, createDebt, updateDebt, deleteDebt } from '../db/database';
import { formatVND } from '../utils/formatters';
import { DebtFormModal } from './DebtFormModal';

interface DebtsViewProps {
  onRefreshStats?: () => void;
  // Trigger external add debt modal state
  triggerAddDebtCount: number;
}

export const DebtsView: React.FC<DebtsViewProps> = ({ 
  onRefreshStats,
  triggerAddDebtCount 
}) => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lend' | 'borrow'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partially_paid' | 'paid'>('all');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | undefined>(undefined);

  // Quick Payment state
  const [quickPayDebt, setQuickPayDebt] = useState<Debt | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState('');

  const fetchDebts = async () => {
    setIsLoading(true);
    try {
      const data = await getDebts();
      setDebts(data);
    } catch (err) {
      console.error('Error fetching debts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, []);

  // Listen to external trigger for "+" button
  useEffect(() => {
    if (triggerAddDebtCount > 0) {
      setEditingDebt(undefined);
      setIsModalOpen(true);
    }
  }, [triggerAddDebtCount]);

  const handleOpenAddModal = () => {
    setEditingDebt(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (debt: Debt) => {
    setEditingDebt(debt);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (data: {
    name: string;
    amount: number;
    paidAmount: number;
    date: string;
    type: 'lend' | 'borrow';
    note?: string;
  }) => {
    try {
      if (editingDebt) {
        await updateDebt(editingDebt.id, data);
      } else {
        await createDebt({
          ...data,
          status: data.paidAmount >= data.amount ? 'paid' : data.paidAmount > 0 ? 'partially_paid' : 'unpaid',
        });
      }
      setIsModalOpen(false);
      setEditingDebt(undefined);
      await fetchDebts();
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error('Lỗi khi lưu công nợ:', err);
      alert('Không thể lưu công nợ, vui lòng thử lại.');
    }
  };

  const handleDeleteDebt = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khoản công nợ này?')) {
      try {
        await deleteDebt(id);
        await fetchDebts();
        if (onRefreshStats) onRefreshStats();
      } catch (err) {
        console.error('Lỗi khi xóa nợ:', err);
      }
    }
  };

  const handleQuickPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayDebt) return;

    const amountToPay = parseInt(quickPayAmount, 10);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    const remaining = quickPayDebt.amount - quickPayDebt.paidAmount;
    const newPaidAmount = Math.min(quickPayDebt.paidAmount + amountToPay, quickPayDebt.amount);

    try {
      await updateDebt(quickPayDebt.id, {
        paidAmount: newPaidAmount,
      });
      setQuickPayDebt(null);
      setQuickPayAmount('');
      await fetchDebts();
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error('Lỗi khi trả nợ nhanh:', err);
    }
  };

  const handleMarkAsFullyPaid = async (debt: Debt) => {
    try {
      await updateDebt(debt.id, {
        paidAmount: debt.amount,
        status: 'paid',
      });
      await fetchDebts();
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error('Lỗi khi cập nhật thanh toán:', err);
    }
  };

  // Calculations for Summary Cards
  const totalLend = debts.filter(d => d.type === 'lend').reduce((sum, d) => sum + d.amount, 0);
  const totalLendPaid = debts.filter(d => d.type === 'lend').reduce((sum, d) => sum + d.paidAmount, 0);
  const totalLendRemaining = totalLend - totalLendPaid;

  const totalBorrow = debts.filter(d => d.type === 'borrow').reduce((sum, d) => sum + d.amount, 0);
  const totalBorrowPaid = debts.filter(d => d.type === 'borrow').reduce((sum, d) => sum + d.paidAmount, 0);
  const totalBorrowRemaining = totalBorrow - totalBorrowPaid;

  // Filter and search debts
  const filteredDebts = debts.filter((debt) => {
    const matchesSearch = debt.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (debt.note && debt.note.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || debt.type === typeFilter;
    
    const matchesStatus = statusFilter === 'all' || debt.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="w-full flex flex-col min-h-0 bg-black text-white p-4 pb-28">
      {/* 1. Header with Stats Summary (Gray Theme) */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Users size={20} className="text-neutral-400" />
              Sổ Công nợ
            </h1>
            <p className="text-xs font-semibold text-neutral-400 mt-1">
              Quản lý độc lập nợ cho vay & đi vay của bạn
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-white font-extrabold text-xs rounded-2xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <Plus size={14} />
            Thêm nợ
          </button>
        </div>

        {/* Gray Theme Summary Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Box 1: Người khác nợ mình (Lend) */}
          <div className="bg-[#121212] rounded-2xl p-4 border border-neutral-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300 border border-neutral-700">
                  <ArrowUpRight size={14} />
                </div>
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Người khác nợ mình
                </span>
              </div>
              <span className="text-[10px] font-bold text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                {debts.filter(d => d.type === 'lend' && d.status !== 'paid').length} khoản
              </span>
            </div>
            
            <div className="mt-1">
              <div className="text-2xl font-black text-neutral-100 font-mono tracking-tight truncate">
                {formatVND(totalLendRemaining)}
              </div>
              <div className="text-[11px] font-semibold text-neutral-400 mt-1 flex justify-between">
                <span>Tổng cho vay: {formatVND(totalLend)}</span>
                <span>Đã thu: {formatVND(totalLendPaid)}</span>
              </div>
            </div>
          </div>

          {/* Box 2: Mình nợ người khác (Borrow) */}
          <div className="bg-[#121212] rounded-2xl p-4 border border-neutral-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300 border border-neutral-700">
                  <ArrowDownLeft size={14} />
                </div>
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Mình nợ người khác
                </span>
              </div>
              <span className="text-[10px] font-bold text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                {debts.filter(d => d.type === 'borrow' && d.status !== 'paid').length} khoản
              </span>
            </div>

            <div className="mt-1">
              <div className="text-2xl font-black text-neutral-100 font-mono tracking-tight truncate">
                {formatVND(totalBorrowRemaining)}
              </div>
              <div className="text-[11px] font-semibold text-neutral-400 mt-1 flex justify-between">
                <span>Tổng đi vay: {formatVND(totalBorrow)}</span>
                <span>Đã trả: {formatVND(totalBorrowPaid)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Box */}
      <div className="mb-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc ghi chú..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121212] rounded-2xl border border-neutral-800/80 py-3 pl-10 pr-4 text-xs sm:text-sm text-white font-semibold focus:outline-none focus:border-neutral-500 transition-all placeholder-neutral-500"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Type Filter */}
          <div className="flex gap-1 bg-[#121212] p-1 rounded-xl border border-neutral-800/80 self-start">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === 'all' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setTypeFilter('lend')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === 'lend' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Cho vay
            </button>
            <button
              onClick={() => setTypeFilter('borrow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === 'borrow' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Đi vay
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex gap-1 bg-[#121212] p-1 rounded-xl border border-neutral-800/80 self-start overflow-x-auto max-w-full">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'all' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Mọi trạng thái
            </button>
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'unpaid' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Chưa trả
            </button>
            <button
              onClick={() => setStatusFilter('partially_paid')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'partially_paid' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Đã trả một phần
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'paid' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Đã trả xong
            </button>
          </div>
        </div>
      </div>

      {/* 3. Debts List Grid */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-neutral-700 border-t-white rounded-full animate-spin" />
          <span className="text-xs font-bold text-neutral-400">Đang tải sổ công nợ...</span>
        </div>
      ) : filteredDebts.length === 0 ? (
        <div className="bg-[#121212] border border-neutral-800 rounded-3xl py-12 px-4 text-center">
          <p className="text-sm font-extrabold text-neutral-300">Sổ công nợ trống</p>
          <p className="text-xs text-neutral-400 mt-1 max-w-[260px] mx-auto">
            {searchQuery ? 'Không tìm thấy khoản nợ nào khớp với tìm kiếm.' : 'Hãy tạo một khoản ghi nợ đầu tiên để theo dõi.'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Thêm ghi nợ mới
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDebts.map((debt) => {
            const isLend = debt.type === 'lend';
            const remaining = Math.max(0, debt.amount - debt.paidAmount);
            const isPaid = debt.status === 'paid';
            const isPartiallyPaid = debt.status === 'partially_paid';

            return (
              <div 
                key={debt.id} 
                className={`bg-[#121212] border border-neutral-800 rounded-2xl p-4 shadow-xs transition-all relative ${
                  isPaid ? 'opacity-65' : ''
                }`}
              >
                {/* Upper row: Status badge + Partner Name & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Arrow badge */}
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs ${
                      isLend ? 'bg-neutral-700 text-neutral-200 border border-neutral-600' : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                    }`}>
                      {isLend ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                    </div>

                    <div>
                      <span className="text-xs font-black text-neutral-200 tracking-tight block max-w-[160px] truncate">
                        {debt.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-semibold">
                        {isLend ? 'Người khác nợ mình' : 'Mình nợ người khác'} • {debt.date}
                      </span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(debt)}
                      className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                      title="Sửa"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteDebt(debt.id)}
                      className="w-7 h-7 rounded-lg bg-rose-950/30 border border-rose-900/30 hover:bg-rose-900/40 text-rose-300 hover:text-rose-200 flex items-center justify-center transition-all cursor-pointer"
                      title="Xóa"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Middle row: Money displays */}
                <div className="my-3 py-2 border-y border-neutral-800/50 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                      Còn nợ
                    </span>
                    <span className="text-base sm:text-lg font-black text-white font-mono tracking-tight block">
                      {formatVND(remaining)}
                    </span>
                  </div>

                  <div className="text-right space-y-0.5">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                      Gốc: {formatVND(debt.amount)}
                    </span>
                    <span className="text-[10px] font-semibold text-neutral-400 block">
                      Đã trả: {formatVND(debt.paidAmount)}
                    </span>
                  </div>
                </div>

                {/* Lower row: note & quick action */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                  {/* Note info */}
                  <p className="text-[11px] font-semibold text-neutral-400 max-w-xs truncate italic">
                    {debt.note ? `“${debt.note}”` : 'Không có ghi chú'}
                  </p>

                  {/* Status pills or quick paying */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    {/* Status pill */}
                    {isPaid ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-800 text-[10px] font-bold text-neutral-400 border border-neutral-700">
                        <CheckCircle2 size={10} /> Đã trả hết
                      </span>
                    ) : isPartiallyPaid ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-800 text-[10px] font-bold text-neutral-300 border border-neutral-700">
                        <Clock size={10} /> Đã trả một phần
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-900 text-[10px] font-bold text-neutral-400 border border-neutral-800">
                        <AlertCircle size={10} /> Chưa thanh toán
                      </span>
                    )}

                    {/* Quick payment button */}
                    {!isPaid && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setQuickPayDebt(debt);
                            setQuickPayAmount('');
                          }}
                          className="px-2.5 py-1 rounded-full bg-neutral-700 hover:bg-neutral-600 text-[10px] font-extrabold text-white transition-all cursor-pointer"
                        >
                          Trả bớt
                        </button>
                        <button
                          onClick={() => handleMarkAsFullyPaid(debt)}
                          className="px-2.5 py-1 rounded-full bg-neutral-200 hover:bg-white text-[10px] font-extrabold text-black transition-all cursor-pointer flex items-center gap-0.5"
                          title="Đánh dấu đã trả xong"
                        >
                          <Check size={10} strokeWidth={3} /> Xong
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Pay Dialog Popover */}
      {quickPayDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-[#161616] border border-neutral-800 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Thu hồi / Trả bớt
              </h3>
              <button
                onClick={() => setQuickPayDebt(null)}
                className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleQuickPaySubmit} className="space-y-3">
              <div className="text-xs font-semibold text-neutral-400">
                Ghi nhận số tiền mới thanh toán cho: <span className="font-extrabold text-white">{quickPayDebt.name}</span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-xs">
                  ₫
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={quickPayAmount ? parseInt(quickPayAmount, 10).toLocaleString('vi-VN') : ''}
                  onChange={(e) => {
                    const numeric = e.target.value.replace(/\D/g, '');
                    setQuickPayAmount(numeric);
                  }}
                  className="w-full bg-[#1e1e1e] rounded-xl border border-neutral-800 py-2.5 pl-6 pr-3 text-xs text-white font-mono font-bold focus:outline-none focus:border-neutral-500"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickPayDebt(null)}
                  className="flex-1 py-2 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-xl text-xs font-bold"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-white text-black rounded-xl text-xs font-extrabold"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Debt Form Modal */}
      <DebtFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDebt(undefined);
        }}
        onSubmit={handleModalSubmit}
        debt={editingDebt}
      />
    </div>
  );
};
