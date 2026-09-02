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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-[#262626] pb-[max(env(safe-area-inset-bottom),8px)] pt-1 px-4 shadow-2xl">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Left: Dòng tiền */}
        <button
          id="nav-btn-calendar"
          onClick={() => onChangeTab('calendar')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 cursor-pointer ${
            activeTab === 'calendar'
              ? 'text-white font-bold'
              : 'text-neutral-500 hover:text-neutral-300 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg transition-colors ${activeTab === 'calendar' ? 'bg-white/15 text-white' : ''}`}>
            <Layers size={18} strokeWidth={activeTab === 'calendar' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Dòng tiền</span>
        </button>

        {/* Center: Prominent Add (+) Button */}
        <div className="flex-1 flex justify-center -mt-5">
          <div className="p-1 rounded-full bg-[#0a0a0a] border border-[#262626] shadow-xl">
            <button
              id="nav-btn-add-transaction"
              onClick={onOpenAddTransaction}
              className="w-11 h-11 rounded-full bg-neutral-200 hover:bg-white active:scale-90 text-black shadow-lg shadow-white/10 flex items-center justify-center transition-all transform hover:-translate-y-0.5 cursor-pointer"
              aria-label="Thêm giao dịch mới"
            >
              <Plus size={22} strokeWidth={3} />
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
              : 'text-neutral-500 hover:text-neutral-300 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg transition-colors ${activeTab === 'statistics' ? 'bg-white/15 text-white' : ''}`}>
            <PieChart size={18} strokeWidth={activeTab === 'statistics' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Thống kê</span>
        </button>
      </div>
    </nav>
  );
};
