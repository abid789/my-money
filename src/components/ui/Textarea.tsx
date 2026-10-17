import { clsx } from 'clsx';
import { TextareaHTMLAttributes, forwardRef, useCallback, useEffect, useRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  autoResize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      autoResize = false,
      rows = 3,
      className,
      id,
      onChange,
      ...props
    },
    forwardedRef
  ) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const internalRef = useRef<HTMLTextAreaElement | null>(null);

    const setRef = useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef]
    );

    const adjustHeight = useCallback(() => {
      const el = internalRef.current;
      if (el && autoResize) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }
    }, [autoResize]);

    useEffect(() => {
      adjustHeight();
    }, [adjustHeight]);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}

        <textarea
          ref={setRef}
          id={textareaId}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : helperText
                ? `${textareaId}-helper`
                : undefined
          }
          onChange={(e) => {
            onChange?.(e);
            adjustHeight();
          }}
          className={clsx(
            'block w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors duration-150 placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200 dark:border-red-500 dark:focus:ring-red-500/30'
              : 'border-gray-300 focus:border-teal-500 focus:ring-teal-200 dark:border-gray-600 dark:focus:border-teal-500 dark:focus:ring-teal-500/30',
            autoResize && 'resize-none overflow-hidden',
            props.disabled && 'cursor-not-allowed bg-gray-50 opacity-60 dark:bg-gray-900',
            className
          )}
          {...props}
        />

        {error && (
          <p
            id={`${textareaId}-error`}
            className="mt-1.5 text-xs text-red-500 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}

        {!error && helperText && (
          <p
            id={`${textareaId}-helper`}
            className="mt-1.5 text-xs text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
