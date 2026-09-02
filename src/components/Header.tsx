import React from 'react';
import { Wallet, Building2, WifiOff } from 'lucide-react';
import { type BalancesSummary } from '../types';
import { formatVND } from '../utils/formatters';

interface HeaderProps {
  balances: BalancesSummary;
  nickname?: string;
  avatarDataUrl?: string;
  onNavigateToProfile: () => void;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  balances,
  nickname,
  avatarDataUrl,
  onNavigateToProfile,
  isOnline,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng,';
    if (hour < 18) return 'Chào buổi chiều,';
    return 'Chào buổi tối,';
  };

  return (
    <header className="pt-[max(env(safe-area-inset-top,0px),16px)] pb-3 px-4 bg-[#202328]/95 backdrop-blur-md sticky top-0 z-30 border-b border-[#333842]">
      {/* Top greeting & avatar row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs sm:text-sm font-semibold text-neutral-400 leading-tight">
            {getGreeting()}
          </p>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight flex items-center gap-1.5 mt-0.5">
            <span className="truncate max-w-[200px] sm:max-w-[260px]">{nickname || 'Bạn'}</span>
            <span>👋</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {!isOnline && (
            <div className="flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-bold">
              <WifiOff size={13} className="text-amber-400" />
              <span>Offline</span>
            </div>
          )}

          <button
            id="header-btn-profile-avatar"
            onClick={onNavigateToProfile}
            className="relative cursor-pointer active:scale-95 transition-transform"
            aria-label="Cá nhân"
          >
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-emerald-400 p-0.5 bg-[#282c34] shadow-md hover:border-emerald-300 transition-colors flex items-center justify-center">
              {avatarDataUrl ? (
                <img
                  src={avatarDataUrl}
                  alt={nickname || 'Avatar'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-sm uppercase">
                  {nickname ? nickname.charAt(0) : 'F'}
                </div>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Total Net Worth & Accounts Card */}
      <div className="rounded-2xl bg-[#282c34] border border-[#3a3f4b] p-4 sm:p-5 text-white shadow-md">
        {/* Row 1: Total Assets (Full width on top) */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs sm:text-sm uppercase tracking-wider text-neutral-300 font-bold leading-none">
              Tổng tài sản
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono mt-2 break-all">
              {formatVND(balances.totalAssets)}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 text-neutral-100 flex items-center justify-center shrink-0">
            <span className="font-black text-lg sm:text-xl">₫</span>
          </div>
        </div>

        {/* Row 2: 2 boxes for Wallet and Bank underneath */}
        <div className="grid grid-cols-2 gap-3 mt-3.5 pt-3.5 border-t border-[#3a3f4b]/80">
          {/* Wallet Balance Box */}
          <div className="bg-[#323640] border border-[#424754] rounded-xl px-3.5 py-2.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Wallet size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-neutral-300 uppercase font-bold leading-none">
                Ví
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono leading-tight mt-1 truncate">
                {formatVND(balances.walletBalance)}
              </div>
            </div>
          </div>

          {/* Bank Balance Box */}
          <div className="bg-[#323640] border border-[#424754] rounded-xl px-3.5 py-2.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Building2 size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-neutral-300 uppercase font-bold leading-none">
                Bank
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono leading-tight mt-1 truncate">
                {formatVND(balances.bankBalance)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
