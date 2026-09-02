import React, { useState } from 'react';
import { Wallet, Building2, Check, Sparkles } from 'lucide-react';
import { updateUserSettings } from '../db/database';
import { parseAmountInput } from '../utils/formatters';
import appLogo from '../assets/logo.png';

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 text-neutral-100">
      <div className="w-full max-w-sm bg-[#202328] border border-[#3a3f4b] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center justify-center mx-auto mb-3">
          <img
            src={appLogo}
            alt="Fima Logo"
            className="w-16 h-16 rounded-2xl object-cover border border-[#4a5060] shadow-lg mb-2.5"
          />
          <h2 className="text-lg font-extrabold text-white text-center tracking-tight">
            Chào mừng đến với Fima
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-neutral-300 text-center mt-1 mb-5 leading-relaxed font-medium">
          Nhập số dư hiện có để bắt đầu theo dõi thu chi hàng ngày. Bạn có thể điều chỉnh lại bất kỳ lúc nào.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          {/* Wallet Balance Input */}
          <div className="bg-[#282c34] p-3 rounded-2xl border border-[#3a3f4b]">
            <label htmlFor="initial-wallet-input" className="block text-xs sm:text-sm font-bold text-neutral-200 mb-1.5 flex items-center gap-2">
              <Wallet size={16} className="text-amber-400" />
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
                className="w-full text-base sm:text-lg font-bold text-white font-mono bg-[#313540] border border-[#3e4350] rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-400"
              />
              <span className="absolute right-3.5 text-sm font-bold text-neutral-400">₫</span>
            </div>
          </div>

          {/* Bank Balance Input */}
          <div className="bg-[#282c34] p-3 rounded-2xl border border-[#3a3f4b]">
            <label htmlFor="initial-bank-input" className="block text-xs sm:text-sm font-bold text-neutral-200 mb-1.5 flex items-center gap-2">
              <Building2 size={16} className="text-blue-400" />
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
                className="w-full text-base sm:text-lg font-bold text-white font-mono bg-[#313540] border border-[#3e4350] rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-400"
              />
              <span className="absolute right-3.5 text-sm font-bold text-neutral-400">₫</span>
            </div>
          </div>

          <button
            id="btn-start-app"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all mt-1 cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check size={18} strokeWidth={3} />
                Bắt đầu sử dụng
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
