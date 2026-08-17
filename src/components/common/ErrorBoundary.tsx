import * as React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 [SPEX ErrorBoundary caught an error]:', error, errorInfo);
  }

  private handleReload = () => {
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 dir-rtl text-right font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              !
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">حدث خطأ أثناء تحميل الواجهة</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                قد يكون هناك تحديث جديد للنسخة أو تعذّر تحميل ملفات العرض. يُرجى إعادة تحديث الصفحة.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-slate-400 text-left overflow-x-auto max-h-32 dir-ltr">
                {this.state.error.toString()}
              </div>
            )}
            <div className="pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg transition duration-200 active:scale-95"
              >
                تحديث الصفحة وإعادة التحميل
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
