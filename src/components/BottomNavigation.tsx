import React, { useEffect, useRef, useState } from 'react';
import { Layers, PieChart, Plus, Settings, User } from 'lucide-react';
import { type ActiveTab } from '../types';
import { motion, useMotionValue, useSpring, useVelocity, useTransform } from 'motion/react';

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
  const navRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const isInitialRender = useRef(true);

  const [isPressing, setIsPressing] = useState(false);

  // 1. Core X Position
  const blobX = useMotionValue(0);
  const animatedX = useSpring(blobX, { stiffness: 280, damping: 28, mass: 0.8 });
  const velocityX = useVelocity(animatedX);

  // 2. Velocity-based deformation (stretch in direction of movement)
  const velScaleX = useTransform(velocityX, [-1200, 0, 1200], [1.25, 1, 1.25]);
  const velScaleY = useTransform(velocityX, [-1200, 0, 1200], [0.85, 1, 0.85]);

  // 3. Press-based "Swell" deformation (swells up/down more to overflow slightly)
  const pressScaleX = useSpring(isPressing ? 1.2 : 1, { stiffness: 300, damping: 20 });
  const pressScaleY = useSpring(isPressing ? 1.65 : 1, { stiffness: 300, damping: 20 });

  // 4. Combined Scale outputs
  const finalScaleX = useMotionValue(1);
  const finalScaleY = useMotionValue(1);

  // Sync combined scales
  useEffect(() => {
    const update = () => {
      finalScaleX.set(pressScaleX.get() * velScaleX.get());
      finalScaleY.set(pressScaleY.get() * velScaleY.get());
    };
    
    const unsub1 = pressScaleX.on('change', update);
    const unsub2 = velScaleX.on('change', update);
    const unsub3 = pressScaleY.on('change', update);
    const unsub4 = velScaleY.on('change', update);
    
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [pressScaleX, velScaleX, pressScaleY, velScaleY, finalScaleX, finalScaleY]);

  const updateBlobPosition = (tab: ActiveTab) => {
    const el = tabsRef.current[tab];
    const navEl = navRef.current;
    if (el && navEl) {
      const rect = el.getBoundingClientRect();
      const navRect = navEl.getBoundingClientRect();
      const centerX = rect.left - navRect.left + rect.width / 2;
      
      if (isInitialRender.current) {
        blobX.set(centerX);
        animatedX.set(centerX); // Jump instantly on mount
        isInitialRender.current = false;
      } else {
        blobX.set(centerX);
      }
    }
  };

  useEffect(() => {
    if (!isPressing) {
      requestAnimationFrame(() => updateBlobPosition(activeTab));
    }
  }, [activeTab, isPressing]);

  useEffect(() => {
    const handleResize = () => updateBlobPosition(activeTab);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('#nav-btn-add-transaction')) return;
    
    setIsPressing(true);
    const navEl = navRef.current;
    if (!navEl) return;
    const navRect = navEl.getBoundingClientRect();
    const touchX = e.clientX - navRect.left;
    
    blobX.set(touchX);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPressing) return;
    const navEl = navRef.current;
    if (!navEl) return;
    const navRect = navEl.getBoundingClientRect();
    const touchX = e.clientX - navRect.left;
    
    const clampedX = Math.max(10, Math.min(navRect.width - 10, touchX));
    blobX.set(clampedX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPressing) return;
    setIsPressing(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    const navEl = navRef.current;
    if (!navEl) return;
    const navRect = navEl.getBoundingClientRect();
    const touchX = e.clientX - navRect.left;
    
    let nearestTab = activeTab;
    let minDistance = Infinity;
    
    TAB_ORDER.forEach(tab => {
      const el = tabsRef.current[tab];
      if (el) {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left - navRect.left + rect.width / 2;
        const dist = Math.abs(centerX - touchX);
        if (dist < minDistance) {
          minDistance = dist;
          nearestTab = tab;
        }
      }
    });
    
    if (nearestTab !== activeTab) {
      onChangeTab(nearestTab);
    } else {
      updateBlobPosition(activeTab); // snap back
    }
  };

  const NavItem = ({ tab, Icon, label }: { tab: ActiveTab; Icon: any; label: string }) => {
    const isActive = activeTab === tab;
    return (
      <button
        ref={(el) => { tabsRef.current[tab] = el; }}
        id={`nav-btn-${tab}`}
        onClick={() => onChangeTab(tab)}
        className="relative flex items-center justify-center flex-1 h-11 cursor-pointer outline-none touch-manipulation z-10"
        aria-label={label}
        title={label}
      >
        <motion.div
          animate={{ scale: isActive ? 1.12 : 1 }}
          transition={{ type: 'spring', bounce: 0.5, duration: 0.4 }}
          className={`p-1.5 transition-colors ${
            isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
        </motion.div>
      </button>
    );
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
    >
      {/* Container to handle overall scale and positioning */}
      <div 
        ref={navRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative flex items-center w-full touch-none pointer-events-auto transition-transform"
        style={{
          width: '541px',
          height: '88.4432px',
          maxWidth: '100%',
          transform: 'scale(var(--island-scale))',
          transformOrigin: 'bottom center',
        }}
      >
        {/* 1. Island Background (with backdrop filter, etc.) */}
        <div 
          className="absolute inset-0 rounded-full border transition-colors"
          style={{
            backgroundColor: 'rgba(255, 255, 255, var(--glass-bg-opacity))',
            backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
            WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
            borderColor: 'rgba(255, 255, 255, var(--glass-border-opacity))',
            boxShadow: '0 15px 35px rgba(0, 0, 0, var(--glass-shadow-opacity)), inset 0 1px 1px rgba(255, 255, 255, var(--glass-inner-reflection)), 0 0 var(--glass-glow-size) var(--glass-glow-color)',
          }}
        />

        {/* 2. Liquid Blob (Can freely overflow the Island Background) */}
        <motion.div
          style={{
            x: animatedX,
            scaleX: finalScaleX,
            scaleY: finalScaleY,
            width: 77,
            height: 60,
            willChange: 'transform',
          }}
          className="absolute top-1/2 left-0 -mt-[30px] -ml-[38.5px] rounded-full z-10 pointer-events-none"
        >
          {/* Base Translucent Water Layer */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(180, 240, 255, 0.1) 0%, rgba(180, 240, 255, 0.01) 100%)',
              backdropFilter: 'blur(16px) brightness(1.08) saturate(1.1)',
              WebkitBackdropFilter: 'blur(16px) brightness(1.08) saturate(1.1)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              borderTopColor: 'rgba(255,255,255,0.4)',
              borderBottomColor: 'rgba(255,255,255,0.05)',
              boxShadow: 'inset 0 4px 12px rgba(255,255,255,0.3), inset 0 -4px 10px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.15)',
            }}
          />
          {/* Soft Highlight / Reflection */}
          <motion.div 
             className="absolute inset-0 rounded-full opacity-90"
             style={{
               background: 'radial-gradient(ellipse 65% 40% at 50% 15%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 100%)',
               x: useTransform(velocityX, [-1200, 1200], [-8, 8]),
             }}
          />
        </motion.div>

        {/* 3. Navigation Items (Must sit on top of both) */}
        <nav className="relative z-20 flex items-center justify-between w-full px-2 p-2.5 pointer-events-none">
          <div className="flex-1 flex justify-center pointer-events-auto"><NavItem tab="flow" Icon={Layers} label="Dòng tiền" /></div>
          <div className="flex-1 flex justify-center pointer-events-auto"><NavItem tab="statistics" Icon={PieChart} label="Thống kê" /></div>

          {/* Center Prominent Add (+) Button */}
          <div className="flex-[1.2] flex justify-center relative pointer-events-auto">
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

          <div className="flex-1 flex justify-center pointer-events-auto"><NavItem tab="settings" Icon={Settings} label="Cài đặt" /></div>
          <div className="flex-1 flex justify-center pointer-events-auto"><NavItem tab="profile" Icon={User} label="Cá nhân" /></div>
        </nav>
      </div>
    </div>
  );
};

