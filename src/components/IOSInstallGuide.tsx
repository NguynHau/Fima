import React from 'react';
import { X, Share, PlusSquare, MoreHorizontal, CheckCircle, Smartphone } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import appLogo from '../assets/logo.png';

interface IOSInstallGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallGuide: React.FC<IOSInstallGuideProps> = ({ isOpen, onClose }) => {
  const { isInstallable, triggerInstall } = usePWA();

  if (!isOpen) return null;

  const handleDismiss = () => {
    localStorage.setItem('fima_has_seen_install_guide', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 text-neutral-100 overflow-y-auto">
      <div className="w-full max-w-sm bg-[#121212] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
        <div className="flex items-center justify-between mb-3.5 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <img
              src={appLogo}
              alt="Fima Logo"
              className="w-9 h-9 rounded-xl object-cover border border-neutral-800 shadow-xs shrink-0"
            />
            <div>
              <h3 className="text-base font-black text-white leading-tight">
                Tải Fima về Màn hình chính
              </h3>
              <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                Dùng như App di động • Hoạt động offline
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5">
          {/* Direct 1-click PWA Install if supported (Chrome/Android/Edge) */}
          {isInstallable && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <Smartphone size={16} className="text-emerald-400" />
                <span>Trình duyệt hỗ trợ cài đặt nhanh:</span>
              </div>
              <button
                onClick={async () => {
                  await triggerInstall();
                  handleDismiss();
                }}
                className="w-full py-3 bg-white hover:bg-neutral-200 text-black rounded-xl font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <CheckCircle size={18} className="text-black" />
                Cài đặt ứng dụng ngay
              </button>
            </div>
          )}

          <p className="text-xs text-neutral-300 leading-relaxed font-medium">
            Thực hiện các bước đơn giản sau trên trình duyệt (Safari / Chrome) để thêm Fima về màn hình chính:
          </p>

          {/* 3 Step Instructions */}
          <div className="space-y-3 bg-[#1a1a1a] p-3.5 rounded-2xl border border-neutral-800 text-xs sm:text-sm">
            {/* Step 1: Chia sẻ */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-white/10 text-white border border-neutral-700 flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>Nhấn nút Chia sẻ</span>
                  <Share size={15} className="text-blue-400 shrink-0" />
                </div>
                <div className="text-neutral-300 text-xs mt-0.5 font-medium leading-normal">
                  Nằm ở thanh công cụ trình duyệt (cuối màn hình Safari hoặc góc trên Chrome).
                </div>
              </div>
            </div>

            {/* Step 2: Xem thêm */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-white/10 text-white border border-neutral-700 flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>Chọn Xem thêm</span>
                  <MoreHorizontal size={15} className="text-amber-400 shrink-0" />
                </div>
                <div className="text-neutral-300 text-xs mt-0.5 font-medium leading-normal">
                  Vuốt danh sách menu tiện ích hoặc chọn <strong className="text-neutral-200">&ldquo;Xem thêm / More&rdquo;</strong> nếu chưa thấy ngay.
                </div>
              </div>
            </div>

            {/* Step 3: Thêm vào màn hình chính */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-white/10 text-white border border-neutral-700 flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>Thêm vào màn hình chính</span>
                  <PlusSquare size={15} className="text-emerald-400 shrink-0" />
                </div>
                <div className="text-neutral-300 text-xs mt-0.5 font-medium leading-normal">
                  Chọn <strong className="text-white">&ldquo;Thêm vào MH chính&rdquo;</strong> (Add to Home Screen) để hoàn tất.
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full py-3 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-100 border border-neutral-800 rounded-2xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-xs active:scale-98"
          >
            Đã hiểu & Trải nghiệm
          </button>
        </div>
      </div>
    </div>
  );
};
