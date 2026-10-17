import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import type { Category } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Tag,
  PlusCircle,
  Edit2,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
];

export default function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory } = useData();
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form
  const [name, setName] = useState('');
  const [color, setColor] = useState('#14b8a6');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setColor(activeTab === 'expense' ? '#ef4444' : '#10b981');
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setColor(cat.color || '#14b8a6');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: name.trim(),
          color,
        });
        toast.success('Category updated');
      } else {
        await addCategory({
          name: name.trim(),
          type: activeTab,
          color,
          icon: 'Tag',
          sort_order: filteredCategories.length,
          is_default: false,
        });
        toast.success('Category created');
      }
      setModalOpen(false);
    } catch {
      toast.error('Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCategory(deleteId);
      toast.success('Category deleted');
    } catch {
      toast.error('Failed to delete category');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Customizable Categories
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Organize your finances with custom income and expense categories.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={openCreateModal}
          leftIcon={<PlusCircle className="h-4 w-4" />}
        >
          Add Category
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-gray-100 p-1 dark:bg-gray-800 max-w-sm">
        <button
          onClick={() => setActiveTab('expense')}
          className={clsx(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all sm:text-sm',
            activeTab === 'expense'
              ? 'bg-white text-rose-600 shadow-xs dark:bg-gray-750 dark:text-rose-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          )}
        >
          <TrendingDown className="h-4 w-4" />
          <span>Expense Categories</span>
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={clsx(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all sm:text-sm',
            activeTab === 'income'
              ? 'bg-white text-emerald-600 shadow-xs dark:bg-gray-750 dark:text-emerald-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          )}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Income Categories</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-xs transition-all hover:shadow-sm dark:border-gray-800 dark:bg-gray-800/90"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${cat.color || '#14b8a6'}20`, color: cat.color || '#14b8a6' }}
              >
                <Tag className="h-4 w-4" />
              </span>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                  {cat.name}
                </span>
                {cat.is_default && (
                  <span className="ml-2 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    Default
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => openEditModal(cat)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                title="Edit"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeleteId(cat.id)}
                className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Edit Category' : `New ${activeTab === 'expense' ? 'Expense' : 'Income'} Category`}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Category Name *"
            placeholder="e.g. Groceries, Freelancing, Rent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-300">
              Color Tag
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={clsx(
                    'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                    color === c ? 'border-gray-900 ring-2 ring-teal-500 dark:border-white' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? Associated transactions will remain recorded."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
