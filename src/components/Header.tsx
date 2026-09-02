import React from 'react';
import { Wallet, Building2, Settings as SettingsIcon, WifiOff } from 'lucide-react';
import { type BalancesSummary } from '../types';
import { formatVND } from '../utils/formatters';

interface HeaderProps {
  balances: BalancesSummary;
  onOpenSettings: () => void;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  balances,
  onOpenSettings,
  isOnline,
}) => {
  return (
    <header className="pt-2.5 pb-2 px-3.5 bg-[#0a0a0a]/95 backdrop-blur-md sticky top-0 z-30 border-b border-[#262626]">
      {/* Top action row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Fima Logo"
            className="w-7 h-7 rounded-lg object-cover border border-[#333333] shadow-xs shrink-0"
          />
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white leading-none">
              Fima
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isOnline && (
            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-semibold">
              <WifiOff size={11} className="text-amber-400" />
              <span>Offline</span>
            </div>
          )}

          <button
            id="btn-open-settings"
            onClick={onOpenSettings}
            className="w-7 h-7 rounded-lg bg-[#171717] text-neutral-400 hover:text-white hover:bg-[#222222] border border-[#262626] flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            aria-label="Cài đặt"
          >
            <SettingsIcon size={14} />
          </button>
        </div>
      </div>

      {/* Total Net Worth & Accounts Card */}
      <div className="rounded-2xl bg-[#121212] border border-[#262626] p-3 text-white shadow-md">
        {/* Row 1: Total Assets (Full width on top) */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold leading-none">
              Tổng tài sản
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono mt-1 break-all">
              {formatVND(balances.totalAssets)}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 text-neutral-200 flex items-center justify-center shrink-0">
            <span className="font-bold text-sm">₫</span>
          </div>
        </div>

        {/* Row 2: 2 boxes for Wallet and Bank underneath */}
        <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-[#222222]">
          {/* Wallet Balance Box */}
          <div className="bg-[#181818] border border-[#282828] rounded-xl px-2.5 py-1.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Wallet size={13} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] text-neutral-400 uppercase font-semibold leading-none">
                Ví
              </div>
              <div className="text-xs font-bold text-neutral-100 font-mono leading-tight mt-0.5 truncate">
                {formatVND(balances.walletBalance)}
              </div>
            </div>
          </div>

          {/* Bank Balance Box */}
          <div className="bg-[#181818] border border-[#282828] rounded-xl px-2.5 py-1.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Building2 size={13} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] text-neutral-400 uppercase font-semibold leading-none">
                Bank
              </div>
              <div className="text-xs font-bold text-neutral-100 font-mono leading-tight mt-0.5 truncate">
                {formatVND(balances.bankBalance)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
