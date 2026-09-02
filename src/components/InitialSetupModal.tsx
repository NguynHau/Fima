import React, { useState } from 'react';
import { Wallet, Building2, Check, User } from 'lucide-react';
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
  const [nickname, setNickname] = useState('');
  const [walletStr, setWalletStr] = useState('');
  const [bankStr, setBankStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const walletNum = parseAmountInput(walletStr);
  const bankNum = parseAmountInput(bankStr);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalNickname = nickname.trim();
    try {
      setIsSubmitting(true);
      await updateUserSettings({
        nickname: finalNickname,
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
      <div className="w-full max-w-sm bg-[#121212] border border-neutral-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center justify-center mx-auto mb-2 text-center">
          <img
            src={appLogo}
            alt="Fima Logo"
            className="w-14 h-14 rounded-2xl object-cover border border-neutral-800 shadow-lg mb-2"
          />
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-1.5">
            <span>Chào bạn</span>
            <span>👋</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 font-medium leading-relaxed">
            Bạn muốn chúng tôi gọi bạn là gì?
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5 mt-4">
          {/* Nickname Input */}
          <div className="bg-[#1a1a1a] p-3.5 rounded-2xl border border-neutral-800">
            <label htmlFor="initial-nickname-input" className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-2">
              <User size={15} className="text-white" />
              Biệt danh / Nickname
            </label>
            <input
              id="initial-nickname-input"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nhập biệt danh của bạn..."
              className="w-full text-base sm:text-lg font-bold text-white bg-[#222222] border border-neutral-700 rounded-xl px-3.5 py-2.5 outline-none focus:border-white"
            />
          </div>

          {/* Wallet Balance Input */}
          <div className="bg-[#1a1a1a] p-3 rounded-2xl border border-neutral-800">
            <label htmlFor="initial-wallet-input" className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-2">
              <Wallet size={15} className="text-amber-400" />
              Số dư Ví ban đầu (Tùy chọn)
            </label>
            <div className="relative flex items-center">
              <input
                id="initial-wallet-input"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={walletNum > 0 ? walletNum.toLocaleString('vi-VN') : ''}
                onChange={(e) => setWalletStr(e.target.value)}
                className="w-full text-sm sm:text-base font-bold text-white font-mono bg-[#222222] border border-neutral-700 rounded-xl px-3.5 py-2 outline-none focus:border-amber-400"
              />
              <span className="absolute right-3.5 text-xs font-bold text-neutral-400">₫</span>
            </div>
          </div>

          {/* Bank Balance Input */}
          <div className="bg-[#1a1a1a] p-3 rounded-2xl border border-neutral-800">
            <label htmlFor="initial-bank-input" className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-2">
              <Building2 size={15} className="text-blue-400" />
              Số dư Ngân hàng ban đầu (Tùy chọn)
            </label>
            <div className="relative flex items-center">
              <input
                id="initial-bank-input"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={bankNum > 0 ? bankNum.toLocaleString('vi-VN') : ''}
                onChange={(e) => setBankStr(e.target.value)}
                className="w-full text-sm sm:text-base font-bold text-white font-mono bg-[#222222] border border-neutral-700 rounded-xl px-3.5 py-2 outline-none focus:border-blue-400"
              />
              <span className="absolute right-3.5 text-xs font-bold text-neutral-400">₫</span>
            </div>
          </div>

          <button
            id="btn-start-app"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all mt-2 cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check size={18} strokeWidth={3} />
                Tiếp tục
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
