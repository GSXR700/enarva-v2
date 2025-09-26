//app/(administration)/expenses/page.tsx
'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Receipt, 
  Trash2, 
  Edit, 
  Search, 
  Filter,
  Calendar,
  Building,
  User,
  FileText,
  ExternalLink,
  Eye,
  Download,
  TrendingDown,
  Clock,
  MapPin
} from 'lucide-react';
import { Expense, ExpenseCategory, PaymentMethod } from '@prisma/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { toast } from 'sonner';

type ExpenseWithDetails = Expense & { 
  mission?: { missionNumber: string; address: string };
  lead?: { firstName: string; lastName: string };
  user: { name: string | null; image?: string | null };
};

const categoryIcons: Record<ExpenseCategory, React.ElementType> = {
  OPERATIONS: Receipt,
  REVENTE_NEGOCE: Building,
  RESSOURCES_HUMAINES: User,
  ADMINISTRATIF_FINANCIER: FileText,
  MARKETING_COMMERCIAL: TrendingDown,
  LOGISTIQUE_MOBILITE: MapPin,
  INFRASTRUCTURES_LOCAUX: Building,
  LOCATIONS: Clock,
  EXCEPTIONNELLES_DIVERSES: FileText,
};

const paymentMethodColors: Record<PaymentMethod, string> = {
  CASH: 'bg-green-100 text-green-800 border-green-200',
  VIREMENT: 'bg-blue-100 text-blue-800 border-blue-200',
  CARTE: 'bg-purple-100 text-purple-800 border-purple-200',
  CHEQUE: 'bg-orange-100 text-orange-800 border-orange-200',
  MOBILE: 'bg-pink-100 text-pink-800 border-pink-200',
  AUTRE: 'bg-gray-100 text-gray-800 border-gray-200',
};

const categoryColors: Record<ExpenseCategory, string> = {
  OPERATIONS: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REVENTE_NEGOCE: 'bg-blue-100 text-blue-800 border-blue-200',
  RESSOURCES_HUMAINES: 'bg-purple-100 text-purple-800 border-purple-200',
  ADMINISTRATIF_FINANCIER: 'bg-orange-100 text-orange-800 border-orange-200',
  MARKETING_COMMERCIAL: 'bg-pink-100 text-pink-800 border-pink-200',
  LOGISTIQUE_MOBILITE: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  INFRASTRUCTURES_LOCAUX: 'bg-amber-100 text-amber-800 border-amber-200',
  LOCATIONS: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  EXCEPTIONNELLES_DIVERSES: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'ALL'>('ALL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/expenses');
      if (!response.ok) throw new Error('Impossible de charger les dépenses.');
      const data = await response.json();
      setExpenses(data);
      setFilteredExpenses(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Filter and sort expenses
  useEffect(() => {
    let filtered = expenses.filter(expense => {
      const matchesSearch = searchTerm === '' || 
        expense.subCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.user.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'ALL' || expense.category === selectedCategory;
      const matchesPaymentMethod = selectedPaymentMethod === 'ALL' || expense.paymentMethod === selectedPaymentMethod;
      
      return matchesSearch && matchesCategory && matchesPaymentMethod;
    });

    // Sort expenses
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'amount') {
        comparison = Number(a.amount) - Number(b.amount);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredExpenses(filtered);
  }, [expenses, searchTerm, selectedCategory, selectedPaymentMethod, sortBy, sortOrder]);

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
      fetchExpenses();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  if (isLoading) {
    return <TableSkeleton title="Gestion des Dépenses" />;
  }

  if (error) {
    return <div className="main-content text-center p-10 text-red-500">{error}</div>;
  }

  return (
    <div className="main-content space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestion des Dépenses</h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-muted-foreground">{filteredExpenses.length} dépenses trouvées</p>
            <Badge variant="outline" className="font-semibold text-red-600 border-red-200 bg-red-50">
              Total: {formatCurrency(totalAmount)}
            </Badge>
          </div>
        </div>
        <Link href="/expenses/new">
          <Button className="gap-2 bg-enarva-gradient rounded-lg hover:shadow-lg transition-all duration-200">
            <Plus className="w-4 h-4" />
            Nouvelle Dépense
          </Button>
        </Link>
      </div>

      {/* Filters Section */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-white to-gray-50/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filtres et Recherche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as ExpenseCategory | 'ALL')}>
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes les catégories</SelectItem>
                <SelectItem value="OPERATIONS">Opérations</SelectItem>
                <SelectItem value="REVENTE_NEGOCE">Revente & Négoce</SelectItem>
                <SelectItem value="RESSOURCES_HUMAINES">Ressources Humaines</SelectItem>
                <SelectItem value="ADMINISTRATIF_FINANCIER">Administratif & Financier</SelectItem>
                <SelectItem value="MARKETING_COMMERCIAL">Marketing & Commercial</SelectItem>
                <SelectItem value="LOGISTIQUE_MOBILITE">Logistique & Mobilité</SelectItem>
                <SelectItem value="INFRASTRUCTURES_LOCAUX">Infrastructures & Locaux</SelectItem>
                <SelectItem value="LOCATIONS">Locations</SelectItem>
                <SelectItem value="EXCEPTIONNELLES_DIVERSES">Exceptionnelles & Diverses</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Method Filter */}
            <Select value={selectedPaymentMethod} onValueChange={(value) => setSelectedPaymentMethod(value as PaymentMethod | 'ALL')}>
              <SelectTrigger>
                <SelectValue placeholder="Mode de paiement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les modes</SelectItem>
                <SelectItem value="CASH">Espèces</SelectItem>
                <SelectItem value="VIREMENT">Virement</SelectItem>
                <SelectItem value="CARTE">Carte</SelectItem>
                <SelectItem value="CHEQUE">Chèque</SelectItem>
                <SelectItem value="MOBILE">Mobile</SelectItem>
                <SelectItem value="AUTRE">Autre</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'date' | 'amount')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Trier par date</SelectItem>
                <SelectItem value="amount">Trier par montant</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Plus récent d'abord</SelectItem>
                <SelectItem value="asc">Plus ancien d'abord</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Grid */}
      {filteredExpenses.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Receipt className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Aucune dépense trouvée</h3>
            <p className="text-muted-foreground mb-6">
              {expenses.length === 0 
                ? "Commencez par ajouter votre première dépense" 
                : "Essayez de modifier vos filtres de recherche"
              }
            </p>
            <Link href="/expenses/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Ajouter une dépense
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredExpenses.map((expense) => {
            const IconComponent = categoryIcons[expense.category];
            return (
              <Card key={expense.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground line-clamp-1">{expense.subCategory}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-xs font-medium border ${categoryColors[expense.category]}`}>
                            {expense.category.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-red-600 mb-1">
                        {formatCurrency(Number(expense.amount))}
                      </div>
                      <Badge className={`text-xs font-medium border ${paymentMethodColors[expense.paymentMethod]}`}>
                        {expense.paymentMethod}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Date and User */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(expense.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={expense.user.image || undefined} />
                        <AvatarFallback className="text-xs">
                          {expense.user.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{expense.user.name}</span>
                    </div>
                  </div>

                  {/* Vendor */}
                  {expense.vendor && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{expense.vendor}</span>
                    </div>
                  )}

                  {/* Mission or Lead */}
                  {(expense.mission || expense.lead) && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <div>
                        {expense.mission ? (
                          <div>
                            <span className="font-medium">Mission #{expense.mission.missionNumber}</span>
                            <br />
                            <span className="text-muted-foreground text-xs">{expense.mission.address}</span>
                          </div>
                        ) : expense.lead ? (
                          <span className="font-medium">
                            {expense.lead.firstName} {expense.lead.lastName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Général</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rental Period */}
                  {expense.rentalStartDate && expense.rentalEndDate && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
                        <Clock className="w-4 h-4" />
                        Période de location
                      </div>
                      <div className="text-xs text-blue-600">
                        {formatDate(expense.rentalStartDate)} → {formatDate(expense.rentalEndDate)}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {expense.description && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <FileText className="w-4 h-4" />
                        Description
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{expense.description}</p>
                    </div>
                  )}

                  {/* Proof Document */}
                  {expense.proofUrl && (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-800">
                        <Eye className="w-4 h-4" />
                        Justificatif disponible
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600 hover:text-green-800 hover:bg-green-100">
                          <a href={expense.proofUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600 hover:text-green-800 hover:bg-green-100">
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <Link href={`/expenses/${expense.id}/edit`}>
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                        <Edit className="w-3 h-3" />
                        Modifier
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(expense.id)}
                      className="h-8 gap-1 text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}