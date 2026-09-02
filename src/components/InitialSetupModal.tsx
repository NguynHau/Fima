import React, { useState } from 'react';
import { Wallet, Building2, Check, Sparkles } from 'lucide-react';
import { updateUserSettings } from '../db/database';
import { parseAmountInput } from '../utils/formatters';

interface InitialSetupModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const InitialSetupModal: React.FC<InitialSetupModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const [walletStr, setWalletStr] = useState('');
  const [bankStr, setBankStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const walletNum = parseAmountInput(walletStr);
  const bankNum = parseAmountInput(bankStr);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await updateUserSettings({
        initialWalletBalance: walletNum,
        initialBankBalance: bankNum,
        isInitialSetupDone: true,
      });
      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0f0f0f] border border-[#262626] rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center justify-center mx-auto mb-2.5">
          <img
            src="/logo.png"
            alt="Fima Logo"
            className="w-12 h-12 rounded-2xl object-cover border border-[#333333] shadow-md mb-2"
          />
          <h2 className="text-base font-extrabold text-white text-center tracking-tight">
            Chào mừng đến với Fima
          </h2>
        </div>
        <p className="text-[11px] text-neutral-400 text-center mt-1 mb-4 leading-relaxed">
          Nhập số dư hiện có để bắt đầu theo dõi thu chi hàng ngày. Bạn có thể điều chỉnh lại bất kỳ lúc nào.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          {/* Wallet Balance Input */}
          <div className="bg-[#161616] p-2.5 rounded-xl border border-[#262626]">
            <label htmlFor="initial-wallet-input" className="block text-[11px] font-bold text-neutral-300 mb-1 flex items-center gap-1.5">
              <Wallet size={13} className="text-amber-400" />
              Số dư hiện tại của Ví tiền
            </label>
            <div className="relative flex items-center">
              <input
                id="initial-wallet-input"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={walletNum > 0 ? walletNum.toLocaleString('vi-VN') : ''}
                onChange={(e) => setWalletStr(e.target.value)}
                className="w-full text-base font-bold text-white font-mono bg-[#1f1f1f] border border-[#333333] rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500"
              />
              <span className="absolute right-2.5 text-xs font-bold text-neutral-500">₫</span>
            </div>
          </div>

          {/* Bank Balance Input */}
          <div className="bg-[#161616] p-2.5 rounded-xl border border-[#262626]">
            <label htmlFor="initial-bank-input" className="block text-[11px] font-bold text-neutral-300 mb-1 flex items-center gap-1.5">
              <Building2 size={13} className="text-blue-400" />
              Số dư hiện tại của Ngân hàng
            </label>
            <div className="relative flex items-center">
              <input
                id="initial-bank-input"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={bankNum > 0 ? bankNum.toLocaleString('vi-VN') : ''}
                onChange={(e) => setBankStr(e.target.value)}
                className="w-full text-base font-bold text-white font-mono bg-[#1f1f1f] border border-[#333333] rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500"
              />
              <span className="absolute right-2.5 text-xs font-bold text-neutral-500">₫</span>
            </div>
          </div>

          <button
            id="btn-start-app"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-98 transition-all mt-1 cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check size={16} strokeWidth={2.5} />
                Bắt đầu sử dụng
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
