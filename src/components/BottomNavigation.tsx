import React from 'react';
import { Layers, PieChart, Plus } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'calendar' | 'statistics';
  onChangeTab: (tab: 'calendar' | 'statistics') => void;
  onOpenAddTransaction: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onChangeTab,
  onOpenAddTransaction,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#202328]/95 backdrop-blur-lg border-t border-[#333842] pb-[max(env(safe-area-inset-bottom),10px)] pt-1.5 px-4 shadow-2xl">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Left: Dòng tiền */}
        <button
          id="nav-btn-calendar"
          onClick={() => onChangeTab('calendar')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 cursor-pointer ${
            activeTab === 'calendar'
              ? 'text-white font-bold'
              : 'text-neutral-400 hover:text-neutral-200 font-medium'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'calendar' ? 'bg-white/20 text-white' : ''}`}>
            <Layers size={22} strokeWidth={activeTab === 'calendar' ? 2.5 : 2} />
          </div>
          <span className="text-xs mt-1 tracking-tight font-bold">Dòng tiền</span>
        </button>

        {/* Center: Prominent Add (+) Button */}
        <div className="flex-1 flex justify-center -mt-6">
          <div className="p-1.5 rounded-full bg-[#202328] border border-[#333842] shadow-2xl">
            <button
              id="nav-btn-add-transaction"
              onClick={onOpenAddTransaction}
              className="w-14 h-14 rounded-full bg-emerald-400 hover:bg-emerald-300 active:scale-90 text-black shadow-lg shadow-emerald-500/20 flex items-center justify-center transition-all transform hover:-translate-y-0.5 cursor-pointer"
              aria-label="Thêm giao dịch mới"
            >
              <Plus size={28} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Right: Thống kê */}
        <button
          id="nav-btn-statistics"
          onClick={() => onChangeTab('statistics')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 cursor-pointer ${
            activeTab === 'statistics'
              ? 'text-white font-bold'
              : 'text-neutral-400 hover:text-neutral-200 font-medium'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'statistics' ? 'bg-white/20 text-white' : ''}`}>
            <PieChart size={22} strokeWidth={activeTab === 'statistics' ? 2.5 : 2} />
          </div>
          <span className="text-xs mt-1 tracking-tight font-bold">Thống kê</span>
        </button>
      </div>
    </nav>
  );
};
