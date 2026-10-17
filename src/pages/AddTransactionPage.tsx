import { useSearchParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function AddTransactionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { transactions } = useData();

  const editId = searchParams.get('edit');
  const typeParam = searchParams.get('type') as any;
  const transactionToEdit = editId
    ? transactions.find((t) => t.id === editId)
    : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            {transactionToEdit ? 'Edit Transaction' : 'Record Transaction'}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {transactionToEdit
              ? 'Update the details of your recorded financial transaction.'
              : 'Add an income, expense, transfer, or refund to keep your records up to date.'}
          </p>
        </div>
      </div>

      <Card>
        <CardBody className="p-6">
          <TransactionForm
            initialData={transactionToEdit}
            isEdit={!!transactionToEdit}
            defaultType={typeParam === 'income' || typeParam === 'expense' || typeParam === 'transfer' ? typeParam : undefined}
            onSuccess={() => navigate('/transactions')}
            onCancel={() => navigate(-1)}
          />
        </CardBody>
      </Card>
    </div>
  );
}
