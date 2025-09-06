//app/(administration)/expenses/page.tsx
'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Receipt, Trash2, Edit } from 'lucide-react';
import { Expense } from '@prisma/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { toast } from 'sonner';

type ExpenseWithDetails = Expense & { 
    mission?: { missionNumber: string };
    lead?: { firstName: string, lastName: string };
    user: { name: string | null };
};

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchExpenses = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/expenses');
            if (!response.ok) throw new Error('Impossible de charger les dépenses.');
            const data = await response.json();
            setExpenses(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleDelete = async (expenseId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action est irréversible.")) return;

        try {
            const response = await fetch(`/api/expenses/${expenseId}`, {
                method: 'DELETE',
            });
            if (response.status !== 204) {
                const errorText = await response.text();
                throw new Error(errorText || "La suppression a échoué.");
            }
            toast.success("Dépense supprimée avec succès.");
            fetchExpenses(); // Refresh the list
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    if (isLoading) {
        return <TableSkeleton title="Gestion des Dépenses" />;
    }

    if (error) {
        return <div className="main-content text-center p-10 text-red-500">{error}</div>;
    }

    return (
        <div className="main-content space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestion des Dépenses</h1>
                    <p className="text-muted-foreground mt-1">{expenses.length} dépenses enregistrées.</p>
                </div>
                <Link href="/expenses/new">
                    <Button className="gap-2 bg-enarva-gradient rounded-lg">
                        <Plus className="w-4 h-4" />
                        Dépense
                    </Button>
                </Link>
            </div>
            <Card className="thread-card">
                <CardHeader><CardTitle>Historique des Dépenses</CardTitle></CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Date</th>
                                    <th scope="col" className="px-6 py-3">Sous-Catégorie</th>
                                    <th scope="col" className="px-6 py-3">Agent</th>
                                    <th scope="col" className="px-6 py-3">Lié à</th>
                                    <th scope="col" className="px-6 py-3 text-right">Montant</th>
                                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map(expense => (
                                    <tr key={expense.id} className="bg-card border-b">
                                        <td className="px-6 py-4">{formatDate(expense.date)}</td>
                                        <td className="px-6 py-4 font-medium text-foreground">{expense.subCategory}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{expense.user.name}</td>
                                        <td className="px-6 py-4">{expense.mission?.missionNumber || (expense.lead ? `${expense.lead.firstName} ${expense.lead.lastName}` : 'Général')}</td>
                                        <td className="px-6 py-4 text-right font-bold text-red-500">{formatCurrency(Number(expense.amount))}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/expenses/${expense.id}/edit`}>
                                                    <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
                                                </Link>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     {expenses.length === 0 && (
                        <div className="text-center py-10">
                            <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-2 text-sm font-medium text-foreground">Aucune dépense enregistrée</h3>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}