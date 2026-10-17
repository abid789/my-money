import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { formatCurrency, calculatePercentageUsed } from '@/lib/utils';
import type { SavingsGoal } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  PiggyBank,
  PlusCircle,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SavingsPage() {
  const {
    savingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addContribution,
  } = useData();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Contribute/Withdraw modal
  const [actionGoal, setActionGoal] = useState<SavingsGoal | null>(null);
  const [actionType, setActionType] = useState<'contribution' | 'withdrawal'>('contribution');
  const [actionAmount, setActionAmount] = useState('');
  const [actionNote, setActionNote] = useState('');

  // Form
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingGoal(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setTargetDate('');
    setMonthlyContribution('');
    setModalOpen(true);
  };

  const openEditModal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(String(goal.target_amount));
    setCurrentAmount(String(goal.current_amount));
    setTargetDate(goal.target_date || '');
    setMonthlyContribution(goal.monthly_contribution ? String(goal.monthly_contribution) : '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount || parseFloat(targetAmount) <= 0) {
      toast.error('Please enter a valid goal name and target amount');
      return;
    }

    try {
      setIsSubmitting(true);
      const goalData: Partial<SavingsGoal> = {
        name: name.trim(),
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount) || 0,
        target_date: targetDate || null,
        monthly_contribution: monthlyContribution ? parseFloat(monthlyContribution) : null,
        icon: 'PiggyBank',
        color: '#14b8a6',
        is_completed: (parseFloat(currentAmount) || 0) >= parseFloat(targetAmount),
      };

      if (editingGoal) {
        await updateSavingsGoal(editingGoal.id, goalData);
        toast.success('Savings goal updated');
      } else {
        await addSavingsGoal(goalData);
        toast.success('Savings goal created');
      }
      setModalOpen(false);
    } catch {
      toast.error('Failed to save savings goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionGoal || !actionAmount || parseFloat(actionAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setIsSubmitting(true);
      await addContribution({
        goal_id: actionGoal.id,
        amount: parseFloat(actionAmount),
        type: actionType,
        note: actionNote.trim() || null,
        date: new Date().toISOString().slice(0, 10),
      });

      toast.success(
        actionType === 'contribution' ? 'Contribution recorded!' : 'Withdrawal recorded!'
      );
      setActionGoal(null);
      setActionAmount('');
      setActionNote('');
    } catch {
      toast.error('Failed to process contribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSavingsGoal(deleteId);
      toast.success('Savings goal deleted');
    } catch {
      toast.error('Failed to delete savings goal');
    } finally {
      setDeleteId(null);
    }
  };

  const totalSaved = savingsGoals.reduce((sum, g) => sum + Number(g.current_amount), 0);
  const totalTarget = savingsGoals.reduce((sum, g) => sum + Number(g.target_amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Savings Goals & Future Funds
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Set targets for emergencies, electronics, travel, or education.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={openCreateModal}
          leftIcon={<PlusCircle className="h-4 w-4" />}
        >
          New Goal
        </Button>
      </div>

      {/* Progress Strip */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-teal-50 p-6 dark:border-indigo-900/40 dark:from-indigo-950/20 dark:to-teal-950/20">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wider dark:text-indigo-300">
              Total Accumulated Savings
            </span>
            <div className="mt-1 text-2xl font-extrabold text-indigo-950 dark:text-white sm:text-3xl">
              {formatCurrency(totalSaved)}{' '}
              <span className="text-xs font-normal text-gray-400">
                of {formatCurrency(totalTarget)} target
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-indigo-600 dark:text-indigo-400">
              {savingsGoals.length} Active Target{savingsGoals.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      {savingsGoals.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
          <EmptyState
            icon={PiggyBank}
            title="No savings goals yet"
            description="Create your first goal, e.g. Emergency Fund of ৳20,000 or New Laptop fund."
            action={{
              label: 'Create Savings Goal',
              onClick: openCreateModal,
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {savingsGoals.map((goal) => {
            const current = Number(goal.current_amount);
            const target = Number(goal.target_amount);
            const pct = calculatePercentageUsed(current, target);
            const remaining = target - current;
            const isCompleted = current >= target;

            return (
              <div
                key={goal.id}
                className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800/90"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-xl bg-teal-50 p-2 text-teal-600 dark:bg-teal-950/60 dark:text-teal-300">
                        <PiggyBank className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {goal.name}
                        </h3>
                        {goal.target_date && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Calendar className="h-3 w-3" /> Target: {goal.target_date}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(goal)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(goal.id)}
                        className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(current)}
                      </span>
                      <span className="text-gray-400">
                        Goal: {formatCurrency(target)}
                      </span>
                    </div>

                    <ProgressBar value={pct} size="md" showPercentage={false} />

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        {isCompleted
                          ? '🎉 Goal Reached!'
                          : `Remaining: ${formatCurrency(remaining)}`}
                      </span>
                      <span className="font-bold text-teal-600 dark:text-teal-400">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActionGoal(goal);
                      setActionType('contribution');
                      setActionAmount('');
                    }}
                    leftIcon={<Plus className="h-3.5 w-3.5 text-emerald-600" />}
                  >
                    Add Money
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setActionGoal(goal);
                      setActionType('withdrawal');
                      setActionAmount('');
                    }}
                    leftIcon={<Minus className="h-3.5 w-3.5 text-rose-600" />}
                  >
                    Withdraw
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Goal Name *"
            placeholder="e.g. Emergency Fund, New Smartphone, Umrah Fund"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <Input
            type="number"
            step="1"
            min="1"
            label="Target Amount (৳ BDT) *"
            placeholder="e.g. 50000"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            required
          />

          {!editingGoal && (
            <Input
              type="number"
              step="1"
              min="0"
              label="Starting Saved Amount (৳ BDT)"
              placeholder="0"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
            />
          )}

          <Input
            type="date"
            label="Target Date (Optional)"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />

          <Input
            type="number"
            step="1"
            min="0"
            label="Planned Monthly Contribution (৳ BDT, Optional)"
            placeholder="e.g. 3000"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {editingGoal ? 'Update Goal' : 'Save Goal'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Withdraw Money Modal */}
      <Modal
        isOpen={!!actionGoal}
        onClose={() => setActionGoal(null)}
        title={
          actionType === 'contribution'
            ? `Add Money to "${actionGoal?.name}"`
            : `Withdraw from "${actionGoal?.name}"`
        }
        size="sm"
      >
        <form onSubmit={handleAction} className="space-y-4">
          <Input
            type="number"
            step="0.01"
            min="1"
            label="Amount (৳ BDT) *"
            placeholder="0.00"
            value={actionAmount}
            onChange={(e) => setActionAmount(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Note (Optional)"
            placeholder="e.g. Eid bonus contribution, Emergency expense"
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActionGoal(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={actionType === 'contribution' ? 'primary' : 'danger'}
              loading={isSubmitting}
            >
              {actionType === 'contribution' ? 'Record Contribution' : 'Record Withdrawal'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Savings Goal"
        message="Are you sure you want to delete this savings goal? Stored amounts won't affect past transaction logs."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
