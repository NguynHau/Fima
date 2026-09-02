import React from 'react';
import { X, Share, PlusSquare, Smartphone, CheckCircle } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

interface IOSInstallGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallGuide: React.FC<IOSInstallGuideProps> = ({ isOpen, onClose }) => {
  const { isInstallable, triggerInstall } = usePWA();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0f0f0f] border border-[#262626] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Fima"
              className="w-8 h-8 rounded-xl object-cover border border-[#333333] shadow-xs shrink-0"
            />
            <h3 className="text-base font-bold text-white">
              Cài Fima lên điện thoại
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1c1c1c] text-neutral-400 hover:text-white hover:bg-[#262626] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {isInstallable ? (
          <div className="space-y-4 text-center">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Trình duyệt của bạn hỗ trợ cài đặt trực tiếp. Nhấn nút bên dưới để thêm Fima vào màn hình chính.
            </p>
            <button
              onClick={async () => {
                await triggerInstall();
                onClose();
              }}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle size={18} />
              Cài đặt ứng dụng ngay
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Để trải nghiệm ứng dụng như app gốc trên <strong className="text-white">iPhone (Safari)</strong>:
            </p>

            <div className="space-y-3 bg-[#161616] p-3.5 rounded-2xl border border-[#262626] text-xs">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    Nhấn nút Chia sẻ (Share) <Share size={13} className="text-blue-400" />
                  </div>
                  <div className="text-neutral-400 text-[11px] mt-0.5">
                    Nằm ở thanh công cụ dưới cùng trên Safari iPhone.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    Chọn &ldquo;Thêm vào MH chính&rdquo; <PlusSquare size={13} className="text-neutral-300" />
                  </div>
                  <div className="text-neutral-400 text-[11px] mt-0.5">
                    (Add to Home Screen) trong danh sách menu.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div>
                  <div className="font-bold text-white">
                    Mở từ Màn hình chính
                  </div>
                  <div className="text-neutral-400 text-[11px] mt-0.5">
                    Ứng dụng sẽ hoạt động toàn màn hình và offline 100%.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-[#262626] hover:bg-[#333333] text-neutral-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
