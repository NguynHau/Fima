import React from 'react';
import { Layers, PieChart, Plus, Settings, User } from 'lucide-react';
import { type ActiveTab } from '../types';
import { motion } from 'motion/react';

interface BottomNavigationProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onOpenAddTransaction: () => void;
}

const TAB_ORDER: ActiveTab[] = ['flow', 'statistics', 'settings', 'profile'];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onChangeTab,
  onOpenAddTransaction,
}) => {
  // Handle swipe gestures on the tab bar
  const handlePanEnd = (event: any, info: any) => {
    const swipeThreshold = 40;
    if (info.offset.x > swipeThreshold) {
      // Swipe right -> Go to previous tab
      const currentIndex = TAB_ORDER.indexOf(activeTab);
      if (currentIndex > 0) onChangeTab(TAB_ORDER[currentIndex - 1]);
    } else if (info.offset.x < -swipeThreshold) {
      // Swipe left -> Go to next tab
      const currentIndex = TAB_ORDER.indexOf(activeTab);
      if (currentIndex < TAB_ORDER.length - 1) onChangeTab(TAB_ORDER[currentIndex + 1]);
    }
  };

  const NavItem = ({ tab, Icon, label }: { tab: ActiveTab; Icon: any; label: string }) => {
    const isActive = activeTab === tab;
    return (
      <motion.button
        id={`nav-btn-${tab}`}
        onClick={() => onChangeTab(tab)}
        whileTap={{ scale: 0.88 }}
        className="relative flex items-center justify-center flex-1 h-11 cursor-pointer outline-none touch-manipulation z-0"
        aria-label={label}
        title={label}
      >
        {/* LIQUID GLASS INDICATOR (CAPSULE SHAPE) */}
        {isActive && (
          <motion.div
            layoutId="liquid-glass-indicator"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/[0.12] backdrop-blur-xl border border-white/15 rounded-full shadow-[inset_0_0_10px_rgba(255,255,255,0.08),0_0_15px_rgba(255,255,255,0.08)] -z-10"
            style={{ height: '60px', width: '83px' }}
            transition={{
              type: 'spring',
              bounce: 0.35,
              duration: 0.5,
            }}
          />
        )}

        <motion.div
          animate={{ scale: isActive ? 1.12 : 1 }}
          transition={{ type: 'spring', bounce: 0.5, duration: 0.4 }}
          className={`p-1.5 transition-colors ${
            isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
        </motion.div>
      </motion.button>
    );
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
    >
      <motion.nav
        onPanEnd={handlePanEnd}
        className="w-full border rounded-full touch-none pointer-events-auto p-2.5 transition-all flex items-center"
        style={{
          width: '541px',
          height: '88.4432px',
          maxWidth: '100%',
          backgroundColor: 'rgba(255, 255, 255, var(--glass-bg-opacity))',
          backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
          WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
          borderColor: 'rgba(255, 255, 255, var(--glass-border-opacity))',
          boxShadow: '0 15px 35px rgba(0, 0, 0, var(--glass-shadow-opacity)), inset 0 1px 1px rgba(255, 255, 255, var(--glass-inner-reflection)), 0 0 var(--glass-glow-size) var(--glass-glow-color)',
          transform: 'scale(var(--island-scale))',
        }}
      >
        <div className="flex items-center justify-between relative px-2 w-full">
          <NavItem tab="flow" Icon={Layers} label="Dòng tiền" />
          <NavItem tab="statistics" Icon={PieChart} label="Thống kê" />

          {/* Center Prominent Add (+) Button */}
          <div className="flex-1 flex justify-center z-10 relative">
            <motion.button
              id="nav-btn-add-transaction"
              onClick={onOpenAddTransaction}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="w-11 h-11 rounded-full bg-white hover:bg-neutral-200 text-black shadow-[0_0_18px_rgba(255,255,255,0.2)] flex items-center justify-center cursor-pointer outline-none touch-manipulation"
              aria-label="Thêm giao dịch mới"
              title="Thêm giao dịch mới"
            >
              <Plus size={22} strokeWidth={3.5} />
            </motion.button>
          </div>

          <NavItem tab="settings" Icon={Settings} label="Cài đặt" />
          <NavItem tab="profile" Icon={User} label="Cá nhân" />
        </div>
      </motion.nav>
    </div>
  );
};
