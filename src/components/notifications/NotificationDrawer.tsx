import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Wallet,
  User,
  Target,
  Tag,
  Clock,
  CheckCheck,
  Trash2,
  X,
  Bell,
  BellOff,
} from 'lucide-react';
import type { NotificationType } from '@/types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } =
    useNotifications();
  const { language } = useLanguage();

  if (!isOpen) return null;

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'income_added':
      case 'income_updated':
        return <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'income_deleted':
      case 'expense_added':
      case 'expense_updated':
        return <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case 'transfer_added':
        return <ArrowLeftRight className="h-4 w-4 text-sky-600 dark:text-sky-400" />;
      case 'balance_updated':
        return <Wallet className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
      case 'profile_updated':
        return <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case 'budget_updated':
        return <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'category_updated':
        return <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getBadgeStyle = (type: NotificationType) => {
    switch (type) {
      case 'income_added':
      case 'income_updated':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'income_deleted':
      case 'expense_added':
      case 'expense_updated':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      case 'transfer_added':
        return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
      case 'balance_updated':
        return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800';
      case 'profile_updated':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl dark:bg-gray-900 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                  {language === 'bn' ? 'কার্যকলাপ ও নোটিফিকেশন হিস্ট্রি' : 'Activity & Notifications'}
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {unreadCount > 0
                    ? `${unreadCount} ${language === 'bn' ? 'টি অপঠিত নোটিফিকেশন' : 'unread notifications'}`
                    : language === 'bn'
                    ? 'সব নোটিফিকেশন পড়া হয়েছে'
                    : 'All notifications caught up'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Action Bar */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-4 py-2 text-xs dark:border-gray-800 dark:bg-gray-800/40">
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>{language === 'bn' ? 'সব পড়া হয়েছে হিসেবে চিহ্নিত করুন' : 'Mark all read'}</span>
              </button>

              <button
                onClick={clearNotifications}
                className="flex items-center gap-1.5 font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{language === 'bn' ? 'সব মুছুন' : 'Clear all'}</span>
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                  <BellOff className="h-7 w-7" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {language === 'bn' ? 'কোনো নোটিফিকেশন নেই' : 'No notifications yet'}
                </h3>
                <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
                  {language === 'bn'
                    ? 'আয়, ব্যয়, ওয়ালেট ব্যালেন্স বা প্রোফাইল পরিবর্তন করলে এখানে তার বিস্তারিত হিস্ট্রি সংরক্ষিত থাকবে।'
                    : 'When you record income, expenses, balance changes, or profile edits, their full history will appear here.'}
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markAsRead(item.id)}
                  className={`relative rounded-xl border p-3.5 transition-all cursor-pointer ${
                    item.read
                      ? 'border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-800/60 opacity-80'
                      : 'border-teal-200 bg-teal-50/30 dark:border-teal-900/40 dark:bg-teal-950/20 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700/60">
                      {getIcon(item.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getBadgeStyle(
                            item.type
                          )}`}
                        >
                          {item.title}
                        </span>

                        {item.amount !== undefined && (
                          <span
                            className={`text-xs font-bold ${
                              item.type.includes('income')
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : item.type.includes('expense')
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-teal-600 dark:text-teal-400'
                            }`}
                          >
                            {item.type.includes('income')
                              ? `+${formatCurrency(item.amount)}`
                              : item.type.includes('expense')
                              ? `-${formatCurrency(item.amount)}`
                              : formatCurrency(item.amount)}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {item.description}
                      </div>

                      {/* Metadata badges (category, account) */}
                      {(item.category || item.account) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                          {item.category && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
                              {item.category}
                            </span>
                          )}
                          {item.account && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
                              {item.account}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{item.formattedTime}</span>
                      </div>
                    </div>

                    {!item.read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500 ring-2 ring-teal-200 dark:ring-teal-900" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
