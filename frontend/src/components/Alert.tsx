import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  onClose,
}) => {
  const styles = {
    success: 'bg-emerald-50 border-emerald-500 text-emerald-950',
    error: 'bg-rose-50 border-rose-500 text-rose-950',
    warning: 'bg-amber-50 border-amber-500 text-amber-950',
    info: 'bg-zinc-100 border-zinc-900 text-zinc-950',
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-zinc-800 flex-shrink-0" />,
  };

  return (
    <div className={`border-l-4 border rounded-none p-3.5 mb-4 flex items-start gap-3 text-xs ${styles[type]}`}>
      {icons[type]}
      <div className="flex-1">
        {title && <div className="font-bold uppercase tracking-wider text-[11px] mb-0.5">{title}</div>}
        <div className="font-mono">{message}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-[11px] font-mono uppercase tracking-wider font-bold hover:underline ml-2"
        >
          [Dismiss]
        </button>
      )}
    </div>
  );
};
