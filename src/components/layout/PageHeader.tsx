import { type ReactNode, type ElementType } from 'react';
import { ChevronRight } from 'lucide-react';

interface PageHeaderProps {
  /** Small module label above the title — e.g. "Fleet Management" */
  module: string;
  /** Main page title — e.g. "Aircraft Registry" */
  title: string;
  /** Optional subtitle shown below the title */
  description?: string;
  /** Optional Lucide icon shown as a badge next to the title */
  icon?: ElementType;
  /** Right-side content: stat counters, action buttons, date pickers, etc. */
  children?: ReactNode;
}

/**
 * Shared white page header used across all modules.
 * Sits flush beneath the global dark header, providing a clean
 * "body header" zone that separates branding/nav from workspace content.
 */
export function PageHeader({ module, title, description, icon: Icon, children }: PageHeaderProps) {
  return (
    <div className="shrink-0 bg-gradient-to-r from-blue-50/50 to-white border-b border-slate-200 border-l-4 border-l-blue-600 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5">
        {/* Left: icon badge + module + title */}
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-2 shrink-0">
              <Icon className="w-5 h-5 text-blue-600" />
            </div>
          )}
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Operations</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest">{module}</span>
            </div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">{title}</h1>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>

        {/* Right: slot for stats, buttons, controls */}
        {children && (
          <div className="flex items-center gap-4 shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
