// app/(administration)/quotes/new/NewQuoteForm.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Minus, Package, Wrench, User, Calendar, Save } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, generateQuote, ServiceInput } from '@/lib/utils'

interface Lead {
  id: string
  firstName: string
  lastName: string
  company?: string
  email?: string
  phone: string
  leadType: string
  address?: string
  propertyType?: string
  status: string
  displayName: string
  typeLabel: string
}

interface ProductItem {
  id: string
  name: string
  qty: number
  unitPrice: number
  description?: string
  reference?: string
}

interface LineItem {
  id: string
  description: string
  detail?: string
  amount: number
  editable: boolean
}

type ServiceInputState = ServiceInput & { id: number }
type QuoteBusinessType = 'SERVICE' | 'PRODUCT'

const NewQuoteForm = () => {
  const router = useRouter()
  
  // Core form state
  const [businessType, setBusinessType] = useState<QuoteBusinessType>('SERVICE')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [newClientName, setNewClientName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Lead[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTimeoutId, setSearchTimeoutId] = useState<NodeJS.Timeout | null>(null)

  // Service-specific state
  const [services, setServices] = useState<ServiceInputState[]>([
    { id: Date.now(), type: 'GrandMénage', surface: 50, levels: 1, distance: 5, etage: 'RDC', delai: 'STANDARD', difficulte: 'STANDARD' }
  ])
  const [quoteType, setQuoteType] = useState<'EXPRESS' | 'STANDARD' | 'PREMIUM'>('STANDARD')
  const [editableLineItems, setEditableLineItems] = useState<LineItem[]>([])

  // Product-specific state
  const [productCategory, setProductCategory] = useState<string>('')
  const [productItems, setProductItems] = useState<ProductItem[]>([
    { id: '1', name: '', qty: 1, unitPrice: 0, description: '', reference: '' }
  ])
  const [deliveryType, setDeliveryType] = useState<string>('STANDARD_DELIVERY')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')

  // Common quote state
  const [expiresAt, setExpiresAt] = useState(
    new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
  )

  // Manual debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/leads/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const results = await response.json()
        setSearchResults(results)
        setShowSearchResults(true)
      }
    } catch (error) {
      console.error('Erreur de recherche:', error)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Handle search input changes with manual debouncing
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    
    // Clear existing timeout
    if (searchTimeoutId) {
      clearTimeout(searchTimeoutId)
    }
    
    // Set new timeout for search
    const timeoutId = setTimeout(() => {
      performSearch(value)
    }, 300)
    
    setSearchTimeoutId(timeoutId)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutId) {
        clearTimeout(searchTimeoutId)
      }
    }
  }, [searchTimeoutId])

  // Calculate quote for services
  const serviceQuoteCalculation = useMemo(() => {
    if (businessType === 'SERVICE') {
      return generateQuote(services)
    }
    return { lineItems: [], subTotalHT: 0, vatAmount: 0, totalTTC: 0, finalPrice: 0 }
  }, [services, businessType])

  // Calculate quote for products
  const productQuoteCalculation = useMemo(() => {
    if (businessType === 'PRODUCT') {
      const subTotalHT = productItems.reduce((acc, item) => acc + (item.qty * item.unitPrice), 0)
      const vatAmount = subTotalHT * 0.20
      let totalTTC = subTotalHT + vatAmount
      if (totalTTC < 500) totalTTC = 500 // Minimum quote amount
      const finalPrice = Math.round(totalTTC / 10) * 10

      const lineItems: LineItem[] = productItems
        .filter(item => item.name && item.qty > 0 && item.unitPrice > 0)
        .map(item => ({
          id: item.id,
          description: item.name,
          detail: `${item.qty} × ${formatCurrency(item.unitPrice)} MAD${item.reference ? ` (Réf: ${item.reference})` : ''}`,
          amount: item.qty * item.unitPrice,
          editable: true
        }))

      return { lineItems, subTotalHT, vatAmount, totalTTC, finalPrice }
    }
    return { lineItems: [], subTotalHT: 0, vatAmount: 0, totalTTC: 0, finalPrice: 0 }
  }, [productItems, businessType])

  // Update editable line items when calculations change
  useEffect(() => {
    if (businessType === 'SERVICE') {
      setEditableLineItems(serviceQuoteCalculation.lineItems)
    } else {
      setEditableLineItems(productQuoteCalculation.lineItems)
    }
  }, [serviceQuoteCalculation, productQuoteCalculation, businessType])

  // Final quote calculation
  const finalQuote = useMemo(() => {
    const subTotalHT = editableLineItems.reduce((acc, item) => acc + item.amount, 0)
    const vatAmount = subTotalHT * 0.20
    let totalTTC = subTotalHT + vatAmount
    if (totalTTC < 500) totalTTC = 500
    const finalPrice = Math.round(totalTTC / 10) * 10
    return { lineItems: editableLineItems, subTotalHT, vatAmount, totalTTC, finalPrice }
  }, [editableLineItems])

  // Handle client selection
  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead)
    setSearchQuery(lead.displayName)
    setNewClientName('')
    setShowSearchResults(false)
  }

  const handleNewClient = () => {
    setSelectedLead(null)
    setNewClientName(searchQuery)
    setShowSearchResults(false)
  }

  // Service handlers
  const handleServiceChange = (id: number, field: keyof ServiceInputState, value: string | number) => {
    setServices(currentServices =>
      currentServices.map(s => s.id === id ? { ...s, [field]: value } : s)
    )
  }

  const addService = () => {
    setServices([...services, { 
      id: Date.now(), 
      type: 'GrandMénage', 
      surface: 50, 
      levels: 1, 
      distance: 5, 
      etage: 'RDC', 
      delai: 'STANDARD', 
      difficulte: 'STANDARD' 
    }])
  }

  const removeService = (id: number) => {
    setServices(services.filter(s => s.id !== id))
  }

  // Product handlers
  const handleProductChange = (id: string, field: keyof ProductItem, value: string | number) => {
    setProductItems(currentItems =>
      currentItems.map(item => item.id === id ? { ...item, [field]: value } : item)
    )
  }

  const addProductItem = () => {
    setProductItems([...productItems, {
      id: Date.now().toString(),
      name: '',
      qty: 1,
      unitPrice: 0,
      description: '',
      reference: ''
    }])
  }

  const removeProductItem = (id: string) => {
    setProductItems(productItems.filter(item => item.id !== id))
  }

  // Line item editor
  const handleLineItemChange = (id: string, newAmount: number) => {
    setEditableLineItems(currentItems =>
      currentItems.map(item => item.id === id ? { ...item, amount: newAmount } : item)
    )
  }

  // IMPROVED Form submission with better error handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation initiale
    if (!selectedLead && !newClientName.trim()) {
      toast.error("Veuillez sélectionner un client existant ou entrer le nom d'un nouveau client.")
      return
    }

    if (finalQuote.lineItems.length === 0) {
      toast.error("Veuillez ajouter au moins un élément au devis.")
      return
    }

    setIsLoading(true)
    console.log('🚀 Starting quote creation process...')

    try {
      // Préparation du payload de base
      const quotePayload: any = {
        quoteNumber: `DV-${businessType.substring(0, 3)}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        businessType,
        lineItems: finalQuote.lineItems,
        subTotalHT: finalQuote.subTotalHT,
        vatAmount: finalQuote.vatAmount,
        totalTTC: finalQuote.totalTTC,
        finalPrice: finalQuote.finalPrice,
        expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours par défaut
      }

      // Gestion client existant vs nouveau client
      if (selectedLead) {
        quotePayload.leadId = selectedLead.id
        console.log('📋 Using existing lead:', selectedLead.id)
      } else {
        quotePayload.newClientName = newClientName.trim()
        console.log('👤 Creating new client:', newClientName.trim())
      }

      // Données spécifiques au type de business
      if (businessType === 'SERVICE') {
        quotePayload.type = quoteType
        quotePayload.surface = services.reduce((acc, s) => acc + (s.surface * s.levels), 0)
        quotePayload.levels = services.reduce((acc, s) => Math.max(acc, s.levels), 1)
        quotePayload.propertyType = selectedLead?.propertyType || 'OTHER'
        console.log('🔧 Service quote configuration:', {
          type: quoteType,
          surface: quotePayload.surface,
          levels: quotePayload.levels
        })
      } else {
        quotePayload.productCategory = productCategory
        quotePayload.productDetails = {
          items: productItems.filter(item => item.name && item.qty > 0),
          delivery: {
            type: deliveryType,
            address: deliveryAddress,
            notes: deliveryNotes
          }
        }
        quotePayload.deliveryType = deliveryType
        quotePayload.deliveryAddress = deliveryAddress
        quotePayload.deliveryNotes = deliveryNotes
        console.log('📦 Product quote configuration:', {
          category: productCategory,
          itemsCount: quotePayload.productDetails.items.length,
          deliveryType
        })
      }

      console.log('📤 Sending quote payload:', JSON.stringify(quotePayload, null, 2))

      // Appel API
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(quotePayload),
      })

      console.log('📨 API Response status:', response.status)
      console.log('📨 API Response headers:', Object.fromEntries(response.headers.entries()))

      // Gestion des erreurs HTTP
      if (!response.ok) {
        let errorMessage = `Erreur HTTP ${response.status}`
        
        try {
          const errorData = await response.text()
          console.error('❌ API Error response:', errorData)
          
          // Tenter de parser le JSON si possible
          try {
            const parsedError = JSON.parse(errorData)
            errorMessage = parsedError.message || parsedError.error || errorMessage
          } catch {
            // Si ce n'est pas du JSON, utiliser le texte brut
            errorMessage = errorData || errorMessage
          }
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError)
        }
        
        throw new Error(errorMessage)
      }

      // Traitement de la réponse de succès
      const responseText = await response.text()
      console.log('✅ API Success response:', responseText)
      
      let newQuote
      try {
        newQuote = JSON.parse(responseText)
      } catch (parseError) {
        console.error('❌ Failed to parse success response:', parseError)
        throw new Error('Réponse invalide du serveur')
      }

      // Succès
      const successMessage = businessType === 'SERVICE' 
        ? `Devis de service ${newQuote.quoteNumber} créé avec succès!`
        : `Devis de produit ${newQuote.quoteNumber} créé avec succès!`
      
      toast.success(successMessage, {
        description: newClientName ? `Client "${newClientName}" créé automatiquement` : undefined,
        duration: 4000
      })
      console.log('✅ Quote created successfully:', newQuote)

      // Redirection vers le devis créé
      setTimeout(() => {
        router.push(`/quotes/${newQuote.id}`)
      }, 1000)

    } catch (error) {
      console.error('❌ Quote creation failed:', error)
      
      // Gestion d'erreur détaillée
      let errorMessage = 'Échec de la création du devis'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }

      // Affichage de l'erreur à l'utilisateur
      toast.error(errorMessage, {
        description: 'Vérifiez vos données et réessayez. Si le problème persiste, contactez le support.',
        duration: 5000
      })

    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nouveau Devis</h1>
        <p className="text-gray-600 mt-2">
          Créez un devis pour services ou produits avec un client existant ou nouveau
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Client & Type Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Type de Devis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setBusinessType('SERVICE')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      businessType === 'SERVICE'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Wrench className="h-8 w-8" />
                      <span className="font-medium">Service</span>
                      <span className="text-sm text-gray-600">Nettoyage, maintenance, etc.</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusinessType('PRODUCT')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      businessType === 'PRODUCT'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8" />
                      <span className="font-medium">Produit</span>
                      <span className="text-sm text-gray-600">Mobilier, équipements, etc.</span>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Client Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Sélection du Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Rechercher un client existant ou entrer un nouveau nom..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="border rounded-lg bg-white shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => handleSelectLead(lead)}
                        className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{lead.displayName}</p>
                            <p className="text-sm text-gray-600">
                              {lead.phone} {lead.email && `• ${lead.email}`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={lead.leadType === 'PARTICULIER' ? 'default' : 'secondary'}>
                              {lead.typeLabel}
                            </Badge>
                            <span className="text-xs text-gray-500">{lead.status}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* New Client Option */}
                {searchQuery && !selectedLead && searchResults.length === 0 && !isSearching && (
                  <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                    <p className="text-sm text-blue-800 mb-2">Aucun client trouvé.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleNewClient}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer nouveau client: "{searchQuery}"
                    </Button>
                  </div>
                )}

                {/* Selected Client Display */}
                {selectedLead && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-800">{selectedLead.displayName}</p>
                        <p className="text-sm text-green-600">Client sélectionné</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLead(null)
                          setSearchQuery('')
                        }}
                        className="text-green-700 hover:bg-green-100"
                      >
                        Changer
                      </Button>
                    </div>
                  </div>
                )}

                {/* New Client Display */}
                {newClientName && !selectedLead && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-800">Nouveau client: {newClientName}</p>
                        <p className="text-sm text-blue-600">Sera créé avec le devis</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNewClientName('')
                          setSearchQuery('')
                        }}
                        className="text-blue-700 hover:bg-blue-100"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Configuration */}
            {businessType === 'SERVICE' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      Configuration des Services
                    </div>
                    <Button type="button" onClick={addService} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Service
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <Label htmlFor="quoteType">Type de Devis</Label>
                      <Select value={quoteType} onValueChange={(value: any) => setQuoteType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXPRESS">Express</SelectItem>
                          <SelectItem value="STANDARD">Standard</SelectItem>
                          <SelectItem value="PREMIUM">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {services.map((service, index) => (
                    <div key={service.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Service {index + 1}</h4>
                        {services.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeService(service.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Type de Service</Label>
                          <Select 
                            value={service.type} 
                            onValueChange={(value) => handleServiceChange(service.id, 'type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GrandMénage">Grand Ménage</SelectItem>
                              <SelectItem value="MénageRégulier">Ménage Régulier</SelectItem>
                              <SelectItem value="NettoyageVitre">Nettoyage Vitres</SelectItem>
                              <SelectItem value="NettoyageBureau">Nettoyage Bureau</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Surface (m²)</Label>
                          <Input
                            type="number"
                            value={service.surface}
                            onChange={(e) => handleServiceChange(service.id, 'surface', parseInt(e.target.value) || 0)}
                            min="1"
                          />
                        </div>
                        
                        <div>
                          <Label>Niveaux</Label>
                          <Input
                            type="number"
                            value={service.levels}
                            onChange={(e) => handleServiceChange(service.id, 'levels', parseInt(e.target.value) || 1)}
                            min="1"
                          />
                        </div>
                        
                        <div>
                          <Label>Distance (km)</Label>
                          <Input
                            type="number"
                            value={service.distance}
                            onChange={(e) => handleServiceChange(service.id, 'distance', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Product Configuration */}
            {businessType === 'PRODUCT' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Configuration des Produits
                    </div>
                    <Button type="button" onClick={addProductItem} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Produit
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="productCategory">Catégorie de Produits</Label>
                      <Select value={productCategory} onValueChange={setProductCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FURNITURE">Mobilier</SelectItem>
                          <SelectItem value="EQUIPMENT">Équipements</SelectItem>
                          <SelectItem value="ELECTRONICS">Électronique</SelectItem>
                          <SelectItem value="DECORATION">Décoration</SelectItem>
                          <SelectItem value="TEXTILES">Textiles</SelectItem>
                          <SelectItem value="LIGHTING">Éclairage</SelectItem>
                          <SelectItem value="STORAGE">Rangement</SelectItem>
                          <SelectItem value="KITCHEN_ITEMS">Articles de cuisine</SelectItem>
                          <SelectItem value="BATHROOM_ITEMS">Articles salle de bain</SelectItem>
                          <SelectItem value="OFFICE_SUPPLIES">Fournitures bureau</SelectItem>
                          <SelectItem value="OTHER">Autres</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="deliveryType">Type de Livraison</Label>
                      <Select value={deliveryType} onValueChange={setDeliveryType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PICKUP">Récupération</SelectItem>
                          <SelectItem value="STANDARD_DELIVERY">Livraison standard</SelectItem>
                          <SelectItem value="EXPRESS_DELIVERY">Livraison express</SelectItem>
                          <SelectItem value="SCHEDULED_DELIVERY">Livraison programmée</SelectItem>
                          <SelectItem value="WHITE_GLOVE">Service premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {deliveryType !== 'PICKUP' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="deliveryAddress">Adresse de Livraison</Label>
                        <Input
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Adresse de livraison"
                        />
                      </div>
                      <div>
                        <Label htmlFor="deliveryNotes">Notes de Livraison</Label>
                        <Input
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="Instructions spéciales..."
                        />
                      </div>
                    </div>
                  )}

                  {productItems.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Produit {index + 1}</h4>
                        {productItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProductItem(item.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Nom du Produit</Label>
                          <Input
                            value={item.name}
                            onChange={(e) => handleProductChange(item.id, 'name', e.target.value)}
                            placeholder="Ex: Table en bois"
                          />
                        </div>
                        
                        <div>
                          <Label>Quantité</Label>
                          <Input
                            type="number"
                            value={item.qty}
                            onChange={(e) => handleProductChange(item.id, 'qty', parseInt(e.target.value) || 1)}
                            min="1"
                          />
                        </div>
                        
                        <div>
                          <Label>Prix Unitaire (MAD)</Label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleProductChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        
                        <div>
                          <Label>Référence</Label>
                          <Input
                            value={item.reference}
                            onChange={(e) => handleProductChange(item.id, 'reference', e.target.value)}
                            placeholder="Réf. produit"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={item.description}
                          onChange={(e) => handleProductChange(item.id, 'description', e.target.value)}
                          placeholder="Description détaillée du produit..."
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Quote Summary */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Récapitulatif du Devis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="expiresAt">Date d'Expiration</Label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  {finalQuote.lineItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-900">{item.description}</p>
                        <p className="text-xs text-slate-500">{item.detail}</p>
                      </div>
                      <div className="text-right">
                        <Input
                          type="number"
                          value={item.amount}
                          onChange={(e) => handleLineItemChange(item.id, parseFloat(e.target.value) || 0)}
                          className="w-20 h-8 text-right text-sm"
                          step="0.01"
                        />
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total HT</span>
                      <span className="font-medium">{formatCurrency(finalQuote.subTotalHT)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">TVA (20%)</span>
                      <span className="font-medium">{formatCurrency(finalQuote.vatAmount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-blue-600 pt-2 border-t">
                      <span>Total TTC</span>
                      <span>{formatCurrency(finalQuote.finalPrice)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <Button 
                  type="submit" 
                  disabled={isLoading || (!selectedLead && !newClientName.trim()) || finalQuote.lineItems.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Créer le Devis {businessType === 'SERVICE' ? 'de Service' : 'de Produit'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}

export default NewQuoteForm