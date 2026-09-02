import React from 'react';
import { X, Share, PlusSquare, Smartphone, CheckCircle } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import appLogo from '../assets/logo.png';

interface IOSInstallGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallGuide: React.FC<IOSInstallGuideProps> = ({ isOpen, onClose }) => {
  const { isInstallable, triggerInstall } = usePWA();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 text-neutral-100">
      <div className="w-full max-w-sm bg-[#121212] border border-neutral-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <img
              src={appLogo}
              alt="Fima Logo"
              className="w-9 h-9 rounded-xl object-cover border border-neutral-800 shadow-xs shrink-0"
            />
            <h3 className="text-base font-extrabold text-white">
              Cài Fima lên điện thoại
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {isInstallable ? (
          <div className="space-y-4 text-center">
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-medium">
              Trình duyệt của bạn hỗ trợ cài đặt trực tiếp. Nhấn nút bên dưới để thêm Fima vào màn hình chính.
            </p>
            <button
              onClick={async () => {
                await triggerInstall();
                onClose();
              }}
              className="w-full py-3.5 bg-white hover:bg-neutral-200 text-black rounded-2xl font-extrabold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle size={20} />
              Cài đặt ứng dụng ngay
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-medium">
              Để trải nghiệm ứng dụng như app gốc trên <strong className="text-white">iPhone (Safari)</strong>:
            </p>

            <div className="space-y-3.5 bg-[#1a1a1a] p-4 rounded-2xl border border-neutral-800 text-xs sm:text-sm">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-white/10 text-white border border-neutral-800 flex items-center justify-center font-extrabold text-xs shrink-0">
                  1
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    Nhấn nút Chia sẻ (Share) <Share size={15} className="text-blue-400" />
                  </div>
                  <div className="text-neutral-300 text-xs mt-0.5 font-medium">
                    Nằm ở thanh công cụ dưới cùng trên Safari iPhone.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-white/10 text-white border border-neutral-800 flex items-center justify-center font-extrabold text-xs shrink-0">
                  2
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    Chọn &ldquo;Thêm vào MH chính&rdquo; <PlusSquare size={15} className="text-neutral-200" />
                  </div>
                  <div className="text-neutral-300 text-xs mt-0.5 font-medium">
                    (Add to Home Screen) trong danh sách menu.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-white/10 text-white border border-neutral-800 flex items-center justify-center font-extrabold text-xs shrink-0">
                  3
                </div>
                <div>
                  <div className="font-bold text-white">
                    Mở từ Màn hình chính
                  </div>
                  <div className="text-neutral-300 text-xs mt-0.5 font-medium">
                    Ứng dụng sẽ hoạt động toàn màn hình và offline 100%.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-100 border border-neutral-800 rounded-2xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-xs"
            >
              Đã hiểu
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
