// app/(administration)/expenses/new/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus } from 'lucide-react';
import { Lead, Mission } from '@prisma/client';
import { toast } from 'sonner';
import { useEdgeStore } from '@/lib/edgestore';
import { cleanExpenseData } from '@/lib/validation';

// Define expense structure for categories and subcategories
const expenseStructure = {
  OPERATIONS: ["Produits de nettoyage", "Consommables", "Matériel & outils", "Produits jardinage", "Produits piscine", "Produits antinuisible", "Sous-traitance", "Énergie & fluides"],
  REVENTE_NEGOCE: ["Achats pour revente", "Transport & logistique", "Stockage & emballage", "Commissions"],
  RESSOURCES_HUMAINES: ["Main-d'œuvre journalière", "Salaires mensuels", "Primes et commissions", "Frais de mission", "Formations", "Uniformes & EPI"],
  ADMINISTRATIF_FINANCIER: ["Honoraires", "Frais bancaires", "Impôts et taxes", "Assurances", "Licences & abonnements"],
  MARKETING_COMMERCIAL: ["Publicité en ligne", "Supports physiques", "Événements & réseautage", "Site web & maintenance"],
  LOGISTIQUE_MOBILITE: ["Carburant", "Maintenance véhicules", "Location ou achat véhicules", "Frais de déplacement"],
  INFRASTRUCTURES_LOCAUX: ["Loyer", "Charges locales", "Aménagement & entretien"],
  LOCATIONS: ["Location de matériel", "Caution", "Frais de livraison", "Assurance matériel"],
  EXCEPTIONNELLES_DIVERSES: ["Investissements lourds", "Petits achats quotidiens", "Cadeaux clients", "Amendes", "Donations"],
};

export default function NewExpensePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const { edgestore } = useEdgeStore();

  // State for missions, leads, form data, file, loading, and error
  const [missions, setMissions] = useState<Mission[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    category: '',
    subCategory: '',
    paymentMethod: '',
    vendor: '',
    missionId: 'none', // Use 'none' instead of empty string to fix Radix UI issue
    leadId: 'none', // Use 'none' instead of empty string to fix Radix UI issue
    rentalStartDate: '',
    rentalEndDate: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch missions and leads on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [missionsRes, leadsRes] = await Promise.all([
          fetch('/api/missions'),
          fetch('/api/leads'),
        ]);

        if (!missionsRes.ok) throw new Error('Échec du chargement des missions');
        if (!leadsRes.ok) throw new Error('Échec du chargement des leads');

        const missionsData = await missionsRes.json();
        const leadsData = await leadsRes.json();

        // Handle both direct array and wrapped data responses
        setMissions(Array.isArray(missionsData) ? missionsData : (missionsData.data || []));
        setLeads(Array.isArray(leadsData) ? leadsData : (leadsData.data || []));
      } catch (err: any) {
        setError(`Erreur lors du chargement des données : ${err.message}`);
        toast.error(`Erreur lors du chargement des données : ${err.message}`);
        setMissions([]);
        setLeads([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle input changes for text inputs and textareas
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  // Handle select dropdown changes
  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
    
    // Reset subcategory when category changes
    if (id === 'category') {
      setFormData(prev => ({ ...prev, subCategory: '' }));
    }
  };

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that user is authenticated
    if (!currentUserId) {
      toast.error('Vous devez être connecté pour créer une dépense');
      return;
    }

    setIsLoading(true);
    let proofUrl: string | undefined = undefined;

    try {
      // Upload file to EdgeStore if provided
      if (file) {
        const res = await edgestore.publicFiles.upload({ file });
        proofUrl = res.url;
      }

      // Prepare the data using the validation function from lib/validation.ts
      const expenseData = {
        ...formData,
        proofUrl,
        userId: currentUserId,
        // Convert 'none' to empty string for validation processing
        missionId: formData.missionId === 'none' ? '' : formData.missionId,
        leadId: formData.leadId === 'none' ? '' : formData.leadId,
      };

      // Apply the validation/cleaning function
      const cleanedData = cleanExpenseData(expenseData);

      // Submit expense data to API
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Échec de la création de la dépense');
      }

      toast.success('Dépense enregistrée avec succès !');
      router.push('/expenses');
    } catch (err: any) {
      console.error('Error creating expense:', err);
      toast.error(err.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if the category is LOCATIONS to show rental date fields
  const isRental = formData.category === 'LOCATIONS';

  // Show loading state while fetching initial data
  if (isLoading && missions.length === 0 && leads.length === 0) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center gap-4">
        <Link href="/expenses">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Nouvelle Dépense</h1>
          <p className="text-muted-foreground mt-1">Enregistrez une nouvelle sortie de caisse.</p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Expense form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="thread-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Détails de la Dépense
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Date input */}
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" value={formData.date} onChange={handleChange} required />
            </div>

            {/* Amount input */}
            <div>
              <Label htmlFor="amount">Montant (MAD) *</Label>
              <Input 
                id="amount" 
                type="number" 
                step="0.01" 
                min="0"
                value={formData.amount} 
                onChange={handleChange} 
                required 
                placeholder="0.00"
              />
            </div>

            {/* Payment method select */}
            <div>
              <Label htmlFor="paymentMethod">Mode de paiement *</Label>
              <Select value={formData.paymentMethod} onValueChange={(value) => handleSelectChange('paymentMethod', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="VIREMENT">Virement</SelectItem>
                  <SelectItem value="CARTE">Carte</SelectItem>
                  <SelectItem value="CHEQUE">Chèque</SelectItem>
                  <SelectItem value="MOBILE">Mobile</SelectItem>
                  <SelectItem value="AUTRE">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category select */}
            <div>
              <Label htmlFor="category">Catégorie *</Label>
              <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(expenseStructure).map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory select */}
            <div>
              <Label htmlFor="subCategory">Sous-Catégorie *</Label>
              <Select 
                value={formData.subCategory} 
                onValueChange={(value) => handleSelectChange('subCategory', value)} 
                required
                disabled={!formData.category}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.category ? "Choisir..." : "Sélectionnez d'abord une catégorie"} />
                </SelectTrigger>
                <SelectContent>
                  {formData.category && expenseStructure[formData.category as keyof typeof expenseStructure]?.map(subCat => (
                    <SelectItem key={subCat} value={subCat}>
                      {subCat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vendor input */}
            <div>
              <Label htmlFor="vendor">Fournisseur / Payé à</Label>
              <Input 
                id="vendor" 
                value={formData.vendor} 
                onChange={handleChange}
                placeholder="Nom du fournisseur..."
              />
            </div>

            {/* Description textarea */}
            <div className="md:col-span-3">
              <Label htmlFor="description">Description / Notes</Label>
              <Textarea 
                id="description" 
                value={formData.description} 
                onChange={handleChange}
                placeholder="Détails de la dépense..."
                rows={3}
              />
            </div>

            {/* Mission select */}
            <div>
              <Label htmlFor="missionId">Lier à une mission (optionnel)</Label>
              <Select
                value={formData.missionId}
                onValueChange={(value) => handleSelectChange('missionId', value)}
                disabled={missions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={missions.length === 0 ? 'Aucune mission disponible' : 'Sélectionner...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune mission</SelectItem>
                  {missions.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.missionNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lead select */}
            <div>
              <Label htmlFor="leadId">Lier à un lead (optionnel)</Label>
              <Select
                value={formData.leadId}
                onValueChange={(value) => handleSelectChange('leadId', value)}
                disabled={leads.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={leads.length === 0 ? 'Aucun lead disponible' : 'Sélectionner...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun lead</SelectItem>
                  {leads.map(lead => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.firstName} {lead.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File upload */}
            <div>
              <Label htmlFor="proof">Justificatif (optionnel)</Label>
              <Input 
                id="proof" 
                type="file" 
                onChange={handleFileChange}
                accept="image/*,.pdf"
              />
            </div>

            {/* Rental date fields - only show for rental expenses */}
            {isRental && (
              <>
                <div>
                  <Label htmlFor="rentalStartDate">Début location</Label>
                  <Input 
                    id="rentalStartDate" 
                    type="date" 
                    value={formData.rentalStartDate} 
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="rentalEndDate">Fin location</Label>
                  <Input 
                    id="rentalEndDate" 
                    type="date" 
                    value={formData.rentalEndDate} 
                    onChange={handleChange}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            className="bg-enarva-gradient text-white px-8"
            disabled={isLoading}
          >
            {isLoading ? 'Création...' : 'Créer la Dépense'}
          </Button>
        </div>
      </form>
    </div>
  );
}