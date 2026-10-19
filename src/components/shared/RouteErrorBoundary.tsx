import React from 'react';
import { useRouteError, isRouteErrorResponse, Link, useNavigate } from 'react-router-dom';
import { RefreshCw, Home, ArrowLeft, ShieldAlert } from 'lucide-react';

export function RouteErrorBoundary() {
  const error: any = useRouteError();
  const navigate = useNavigate();

  const errorMessage = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error?.message || error?.statusText || 'An unexpected error occurred while loading this page.';

  const isDynamicImportError =
    typeof errorMessage === 'string' &&
    (errorMessage.includes('Failed to fetch dynamically imported module') ||
      errorMessage.includes('dynamically imported module') ||
      errorMessage.includes('Loading chunk') ||
      errorMessage.includes('Failed to load module script'));

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50/50">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center relative overflow-hidden">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500" />

        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/60">
          {isDynamicImportError ? (
            <RefreshCw className="w-8 h-8 animate-spin-reverse text-indigo-600" />
          ) : (
            <ShieldAlert className="w-8 h-8 text-indigo-600" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
          {isDynamicImportError ? 'Updating Page Assets' : 'Something Went Wrong'}
        </h2>

        {/* Description */}
        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          {isDynamicImportError
            ? 'A fresh version of this page is ready. Please click reload to load the latest application assets.'
            : 'We encountered a momentary glitch while displaying this section. Your account and shopping cart are safe.'}
        </p>

        {/* Technical snippet for transparency in dev / debugging */}
        {errorMessage && (
          <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs font-mono text-slate-600 text-left overflow-x-auto max-h-24">
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleReload}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-md hover:shadow-indigo-500/25 hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>

          <button
            onClick={handleGoBack}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          <Link
            to="/"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-semibold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Store Home
          </Link>
        </div>

        {/* RootNexis attribution footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <span>Created with excellence by</span>
          <a
            href="https://rootnexis.kesug.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 font-semibold hover:underline"
          >
            RootNexis
          </a>
        </div>
      </div>
    </div>
  );
}
