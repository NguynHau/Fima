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
    <header className="pt-[max(env(safe-area-inset-top,0px),16px)] pb-3 px-4 bg-black/95 backdrop-blur-md sticky top-0 z-30 border-b border-neutral-900">
      {/* Top greeting & avatar row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs sm:text-sm font-semibold text-neutral-400 leading-tight">
            {getGreeting()}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white leading-tight flex items-center gap-1.5 mt-0.5">
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
            <div className="w-[65px] h-[65px] rounded-full p-[2px] bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 shadow-md flex items-center justify-center">
              <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center">
                {avatarDataUrl ? (
                  <img
                    src={avatarDataUrl}
                    alt={nickname || 'Avatar'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-purple-500/20 text-fuchsia-300 flex items-center justify-center font-black text-sm uppercase">
                    {nickname ? nickname.charAt(0) : 'F'}
                  </div>
                )}
              </div>
            </div>
          </button>
        </div>
      </div>

    </header>
  );
};
