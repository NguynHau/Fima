import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#121212] border border-[#262626] rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h1 className="text-lg font-bold text-white mb-2">Đã xảy ra lỗi khởi động</h1>
            <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
              Trình duyệt gặp sự cố khi khởi động ứng dụng. Vui lòng bấm nút bên dưới để tải lại.
            </p>
            {this.state.error && (
              <div className="bg-[#181818] p-3 rounded-lg text-left text-[11px] text-rose-300/80 font-mono mb-6 overflow-auto max-h-32 border border-[#262626]">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <RefreshCw size={14} />
              <span>Tải lại ứng dụng</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
