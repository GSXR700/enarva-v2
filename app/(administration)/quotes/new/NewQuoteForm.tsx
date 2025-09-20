// app/(administration)/quotes/new/NewQuoteForm.tsx - PART 1: IMPORTS AND STATE
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
//import { Badge } from '@/components/ui/badge'
import { Search, Plus, Minus, Package, Wrench, User, Calendar, Save, AlertCircle } from 'lucide-react'
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
  quantity: number
  unitPrice: number
  totalPrice: number
  editable: boolean
}

type ServiceInputState = ServiceInput & { id: number }
type QuoteBusinessType = 'SERVICE' | 'PRODUCT'

const NewQuoteForm = () => {
  const router = useRouter()
  
  // Core form state
  const [businessType, setBusinessType] = useState<QuoteBusinessType>('SERVICE')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: ''
  })
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
    { id: Date.now().toString(), name: '', qty: 1, unitPrice: 0, description: '', reference: '' }
  ])
  const [deliveryType, setDeliveryType] = useState<string>('STANDARD')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')

  // Common quote state
  const [expiresAt, setExpiresAt] = useState(
    new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
  )

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({})

  // NewQuoteForm.tsx - PART 2: SEARCH AND CALCULATIONS

  // Search functionality with debouncing
  const searchLeads = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/leads/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const leads = await response.json()
        const processedLeads = leads.map((lead: any) => ({
          ...lead,
          displayName: `${lead.firstName} ${lead.lastName}${lead.company ? ` (${lead.company})` : ''}`,
          typeLabel: lead.leadType === 'PARTICULIER' ? 'Particulier' : 'Professionnel'
        }))
        setSearchResults(processedLeads)
        setShowSearchResults(true)
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Erreur lors de la recherche')
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutId) {
      clearTimeout(searchTimeoutId)
    }

    const timeoutId = setTimeout(() => {
      if (searchQuery && !selectedLead) {
        searchLeads(searchQuery)
      }
    }, 300)

    setSearchTimeoutId(timeoutId)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, selectedLead, searchLeads])

  // Calculate quote for services
  const serviceQuoteCalculation = useMemo(() => {
    if (businessType === 'SERVICE') {
      try {
        const quote = generateQuote(services)
        return {
          lineItems: quote.lineItems.map((item, index) => ({
            id: `service-${index}`,
            description: item.description,
            detail: item.detail || '',
            amount: item.amount,
            quantity: 1,
            unitPrice: item.amount,
            totalPrice: item.amount,
            editable: true
          })),
          subTotalHT: quote.subTotalHT,
          vatAmount: quote.vatAmount,
          totalTTC: quote.totalTTC,
          finalPrice: quote.finalPrice
        }
      } catch (error) {
        console.error('Quote generation error:', error)
        return { lineItems: [], subTotalHT: 0, vatAmount: 0, totalTTC: 0, finalPrice: 0 }
      }
    }
    return { lineItems: [], subTotalHT: 0, vatAmount: 0, totalTTC: 0, finalPrice: 0 }
  }, [services, businessType])

  // Calculate quote for products
  const productQuoteCalculation = useMemo(() => {
    if (businessType === 'PRODUCT') {
      const validItems = productItems.filter(item => item.name.trim() && item.qty > 0 && item.unitPrice > 0)
      const subTotalHT = validItems.reduce((acc, item) => acc + (item.qty * item.unitPrice), 0)
      const vatAmount = subTotalHT * 0.20
      let totalTTC = subTotalHT + vatAmount
      if (totalTTC < 500) totalTTC = 500
      const finalPrice = Math.round(totalTTC / 10) * 10

      const lineItems: LineItem[] = validItems.map(item => ({
        id: item.id,
        description: item.name,
        detail: `${item.qty} × ${formatCurrency(item.unitPrice)}${item.reference ? ` (Réf: ${item.reference})` : ''}`,
        amount: item.qty * item.unitPrice,
        quantity: item.qty,
        unitPrice: item.unitPrice,
        totalPrice: item.qty * item.unitPrice,
        editable: true
      }))

      return { lineItems, subTotalHT, vatAmount, totalTTC, finalPrice }
    }
    return { lineItems: [], subTotalHT: 0, vatAmount: 0, totalTTC: 0, finalPrice: 0 }
  }, [productItems, businessType])

  // Final quote calculation
  const finalQuote = useMemo(() => {
    const baseQuote = businessType === 'SERVICE' ? serviceQuoteCalculation : productQuoteCalculation
    
    // Add custom editable line items
    const allLineItems = [...baseQuote.lineItems, ...editableLineItems]
    const subTotalHT = allLineItems.reduce((acc, item) => acc + item.totalPrice, 0)
    const vatAmount = subTotalHT * 0.20
    let totalTTC = subTotalHT + vatAmount
    if (totalTTC < 500) totalTTC = 500
    const finalPrice = Math.round(totalTTC / 10) * 10

    return { lineItems: allLineItems, subTotalHT, vatAmount, totalTTC, finalPrice }
  }, [serviceQuoteCalculation, productQuoteCalculation, editableLineItems, businessType])

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Client validation
    if (!selectedLead && !newClientData.name.trim()) {
      newErrors.client = "Veuillez sélectionner un client existant ou entrer le nom d'un nouveau client"
    }

    // New client validation
    if (newClientData.name.trim() && !newClientData.phone.trim()) {
      newErrors.phone = "Le numéro de téléphone est requis pour un nouveau client"
    }

    // Line items validation
    if (finalQuote.lineItems.length === 0) {
      newErrors.lineItems = "Veuillez ajouter au moins un élément au devis"
    }

    // Service validation
    if (businessType === 'SERVICE') {
      const hasValidService = services.some(s => s.surface > 0)
      if (!hasValidService) {
        newErrors.services = "Veuillez configurer au moins un service avec une surface valide"
      }
    }

    // Product validation
    if (businessType === 'PRODUCT') {
      const hasValidProduct = productItems.some(p => p.name.trim() && p.qty > 0 && p.unitPrice > 0)
      if (!hasValidProduct) {
        newErrors.products = "Veuillez ajouter au moins un produit valide"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // NewQuoteForm.tsx - PART 3: EVENT HANDLERS

  // Handle service changes
  const updateService = (id: number, field: keyof ServiceInput, value: any) => {
    setServices(current =>
      current.map(service =>
        service.id === id ? { ...service, [field]: value } : service
      )
    )
  }

  const addService = () => {
    setServices(current => [
      ...current,
      { id: Date.now(), type: 'GrandMénage', surface: 50, levels: 1, distance: 5, etage: 'RDC', delai: 'STANDARD', difficulte: 'STANDARD' }
    ])
  }

  const removeService = (id: number) => {
    if (services.length > 1) {
      setServices(current => current.filter(service => service.id !== id))
    }
  }

  // Handle product changes
  const updateProductItem = (id: string, field: keyof ProductItem, value: any) => {
    setProductItems(current =>
      current.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  const addProductItem = () => {
    setProductItems(current => [
      ...current,
      { id: Date.now().toString(), name: '', qty: 1, unitPrice: 0, description: '', reference: '' }
    ])
  }

  const removeProductItem = (id: string) => {
    setProductItems(current => current.filter(item => item.id !== id))
  }

  // Handle editable line items
  const handleLineItemChange = (id: string, field: string, value: number) => {
    setEditableLineItems(current =>
      current.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item }
          
          if (field === 'unitPrice') {
            updatedItem.unitPrice = Math.max(0, value)
            updatedItem.totalPrice = updatedItem.unitPrice * updatedItem.quantity
            updatedItem.amount = updatedItem.totalPrice
          } else if (field === 'quantity') {
            updatedItem.quantity = Math.max(1, value)
            updatedItem.totalPrice = updatedItem.unitPrice * updatedItem.quantity
            updatedItem.amount = updatedItem.totalPrice
          } else if (field === 'amount') {
            updatedItem.amount = Math.max(0, value)
            updatedItem.totalPrice = updatedItem.amount
            if (updatedItem.quantity > 0) {
              updatedItem.unitPrice = updatedItem.totalPrice / updatedItem.quantity
            }
          }
          
          return updatedItem
        }
        return item
      })
    )
  }

  const addEditableLineItem = () => {
    const newItem: LineItem = {
      id: `custom-${Date.now()}`,
      description: 'Service personnalisé',
      detail: '',
      amount: 0,
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      editable: true
    }
    setEditableLineItems(current => [...current, newItem])
  }

  const removeEditableLineItem = (id: string) => {
    setEditableLineItems(current => current.filter(item => item.id !== id))
  }

  // Handle lead selection
  const selectLead = (lead: Lead) => {
    setSelectedLead(lead)
    setSearchQuery('')
    setShowSearchResults(false)
    setNewClientData({ name: '', email: '', phone: '', address: '', company: '' })
    setErrors(prev => ({ ...prev, client: '', phone: '' }))
  }

  const clearSelectedLead = () => {
    setSelectedLead(null)
    setSearchQuery('')
    setShowSearchResults(false)
  }

  // Handle new client data changes
  const updateNewClientData = (field: string, value: string) => {
    setNewClientData(prev => ({ ...prev, [field]: value }))
    if (field === 'name' && value.trim()) {
      setSelectedLead(null)
      setErrors(prev => ({ ...prev, client: '' }))
    }
    if (field === 'phone' && value.trim()) {
      setErrors(prev => ({ ...prev, phone: '' }))
    }
  }

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error("Veuillez corriger les erreurs dans le formulaire")
      return
    }

    setIsLoading(true)
    console.log('🚀 Starting quote creation process...')

    try {
      const quoteNumber = `DV-${businessType.substring(0, 3)}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

      const quotePayload: any = {
        quoteNumber,
        businessType,
        lineItems: finalQuote.lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        subTotalHT: finalQuote.subTotalHT,
        vatAmount: finalQuote.vatAmount,
        totalTTC: finalQuote.totalTTC,
        finalPrice: finalQuote.finalPrice,
        expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }

      // Handle existing vs new client
      if (selectedLead) {
        quotePayload.leadId = selectedLead.id
        console.log('📋 Using existing lead:', selectedLead.id)
      } else {
        quotePayload.newClientName = newClientData.name.trim()
        quotePayload.newClientEmail = newClientData.email.trim() || null
        quotePayload.newClientPhone = newClientData.phone.trim()
        quotePayload.newClientAddress = newClientData.address.trim() || null
        console.log('👤 Creating new client:', newClientData.name.trim())
      }

      // Add business-specific data
      if (businessType === 'SERVICE') {
        quotePayload.type = quoteType
        quotePayload.surface = services.reduce((acc, s) => acc + (s.surface * s.levels), 0)
        quotePayload.levels = services.reduce((acc, s) => Math.max(acc, s.levels), 1)
        
        const hasApartment = services.some(s => s.type.includes('Appartement'))
        const hasMaison = services.some(s => s.type.includes('Maison'))
        quotePayload.propertyType = hasApartment ? 'APPARTEMENT' : hasMaison ? 'MAISON' : 'AUTRE'
      } else {
        quotePayload.productCategory = productCategory || 'AUTRE'
        quotePayload.productDetails = {
          items: productItems.filter(item => item.name.trim()),
          category: productCategory
        }
        quotePayload.deliveryType = deliveryType
        quotePayload.deliveryAddress = deliveryAddress || null
        quotePayload.deliveryNotes = deliveryNotes || null
      }

      console.log('📤 Sending quote payload:', quotePayload)

      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quotePayload),
      })

      const responseData = await response.json()

      if (!response.ok) {
        console.error('❌ Quote creation failed:', responseData)
        throw new Error(responseData.message || responseData.error || 'Failed to create quote')
      }

      console.log('✅ Quote created successfully:', responseData)
      toast.success(`Devis ${quoteNumber} créé avec succès!`)
      
      router.push(`/quotes/${responseData.id}`)

    } catch (error) {
      console.error('❌ Error creating quote:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création du devis')
    } finally {
      setIsLoading(false)
    }
  }

  // NewQuoteForm.tsx - PART 4: MAIN UI JSX

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Nouveau Devis</h1>
        <p className="text-gray-600 mt-2">Créez un devis détaillé pour un client existant ou nouveau</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
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
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      businessType === 'SERVICE' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setBusinessType('SERVICE')}
                  >
                    <div className="flex items-center gap-3">
                      <Wrench className="h-6 w-6 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">Devis de Service</h3>
                        <p className="text-sm text-gray-600">Nettoyage, entretien, maintenance</p>
                      </div>
                    </div>
                  </div>
                  
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      businessType === 'PRODUCT' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setBusinessType('PRODUCT')}
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-6 w-6 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Devis de Produit</h3>
                        <p className="text-sm text-gray-600">Équipements, fournitures, matériel</p>
                      </div>
                    </div>
                  </div>
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
                {errors.client && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {errors.client}
                  </div>
                )}
                
                {selectedLead ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-green-800">
                          {selectedLead.displayName}
                        </h3>
                        <p className="text-sm text-green-600">
                          {selectedLead.phone} • {selectedLead.typeLabel}
                        </p>
                        {selectedLead.email && (
                          <p className="text-sm text-green-600">{selectedLead.email}</p>
                        )}
                        {selectedLead.company && (
                          <p className="text-sm text-green-600">{selectedLead.company}</p>
                        )}
                        {selectedLead.address && (
                          <p className="text-sm text-green-600">{selectedLead.address}</p>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearSelectedLead}
                        disabled={isLoading}
                      >
                        Changer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Rechercher un client par nom, email, téléphone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={isLoading}
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      {isSearching && (
                        <div className="absolute right-10 top-1/2 -translate-y-1/2">
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {searchResults.map(lead => (
                            <div
                              key={lead.id}
                              className="p-3 hover:bg-gray-100 cursor-pointer"
                              onClick={() => selectLead(lead)}
                            >
                              <h4 className="font-medium">{lead.displayName}</h4>
                              <p className="text-sm text-gray-600">
                                {lead.phone} • {lead.typeLabel}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-center text-sm text-gray-500">— OU —</div>

                    <div className="space-y-3">
                      <Label>Nom du Nouveau Client</Label>
                      <Input
                        type="text"
                        placeholder="Nom complet"
                        value={newClientData.name}
                        onChange={(e) => updateNewClientData('name', e.target.value)}
                        disabled={isLoading}
                      />
                      {errors.phone && (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {errors.phone}
                        </div>
                      )}
                      <Label>Contact du Nouveau Client</Label>
                      <Input
                        type="email"
                        placeholder="Email (optionnel)"
                        value={newClientData.email}
                        onChange={(e) => updateNewClientData('email', e.target.value)}
                        disabled={isLoading}
                        className="mb-2"
                      />
                      <Input
                        type="text"
                        placeholder="Téléphone *"
                        value={newClientData.phone}
                        onChange={(e) => updateNewClientData('phone', e.target.value)}
                        disabled={isLoading}
                        className="mb-2"
                      />
                      <Textarea
                        placeholder="Adresse (optionnel)"
                        value={newClientData.address}
                        onChange={(e) => updateNewClientData('address', e.target.value)}
                        disabled={isLoading}
                        className="mb-2"
                        rows={2}
                      />
                      <Textarea
                        placeholder="Société (optionnel)"
                        value={newClientData.company}
                        onChange={(e) => updateNewClientData('company', e.target.value)}
                        disabled={isLoading}
                        className="mb-2"
                        rows={1}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Type Specific Configuration */}

            {/* Service Configuration */}
            {businessType === 'SERVICE' && (
              <Card>
                <CardHeader>
                  <CardTitle>Configuration des Services</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {errors.services && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {errors.services}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Type de Devis</Label>
                    <Select value={quoteType} onValueChange={(value: any) => setQuoteType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXPRESS">Express (+20%)</SelectItem>
                        <SelectItem value="STANDARD">Standard</SelectItem>
                        <SelectItem value="PREMIUM">Premium (+15%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {services.map((service, index) => (
                    <div key={service.id} className="p-4 border border-gray-200 rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Service {index + 1}</h4>
                        {services.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeService(service.id)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Type de service</Label>
                          <Select
                            value={service.type}
                            onValueChange={(value) => updateService(service.id, 'type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GrandMénage">Grand Ménage</SelectItem>
                              <SelectItem value="MénageRégulier">Ménage Régulier</SelectItem>
                              <SelectItem value="NettoyageBureaux">Nettoyage Bureaux</SelectItem>
                              <SelectItem value="NettoyageVitre">Nettoyage Vitres</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Surface (m²)</Label>
                          <Input
                            type="number"
                            value={service.surface}
                            onChange={(e) => updateService(service.id, 'surface', parseInt(e.target.value) || 0)}
                            min="1"
                          />
                        </div>
                        
                        <div>
                          <Label>Niveaux</Label>
                          <Input
                            type="number"
                            value={service.levels}
                            onChange={(e) => updateService(service.id, 'levels', parseInt(e.target.value) || 1)}
                            min="1"
                            max="10"
                          />
                        </div>
                        
                        <div>
                          <Label>Distance (km)</Label>
                          <Input
                            type="number"
                            value={service.distance}
                            onChange={(e) => updateService(service.id, 'distance', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addService}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un Service
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Product Configuration */}
            {businessType === 'PRODUCT' && (
              <Card>
                <CardHeader>
                  <CardTitle>Configuration des Produits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {errors.products && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {errors.products}
                    </div>
                  )}
                  
                  <div>
                    <Label>Catégorie</Label>
                    <Select value={productCategory} onValueChange={setProductCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EQUIPEMENT_NETTOYAGE">Équipement de nettoyage</SelectItem>
                        <SelectItem value="PRODUIT_ENTRETIEN">Produits d'entretien</SelectItem>
                        <SelectItem value="ACCESSOIRE">Accessoires</SelectItem>
                        <SelectItem value="CONSOMMABLE">Consommables</SelectItem>
                        <SelectItem value="AUTRE">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Type de livraison</Label>
                      <Select value={deliveryType} onValueChange={setDeliveryType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STANDARD">Livraison standard</SelectItem>
                          <SelectItem value="EXPRESS">Livraison express</SelectItem>
                          <SelectItem value="PICKUP">Retrait sur place</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {deliveryType !== 'PICKUP' && (
                      <div>
                        <Label>Adresse de livraison</Label>
                        <Input
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Adresse de livraison"
                        />
                      </div>
                    )}
                  </div>

                  {deliveryType !== 'PICKUP' && (
                    <div>
                      <Label>Notes de livraison</Label>
                      <Textarea
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder="Instructions spéciales pour la livraison"
                        rows={2}
                      />
                    </div>
                  )}

                  {productItems.map((item, index) => (
                    <div key={item.id} className="p-4 border border-gray-200 rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Produit {index + 1}</h4>
                        {productItems.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeProductItem(item.id)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Nom du produit</Label>
                          <Input
                            placeholder="Nom du produit"
                            value={item.name}
                            onChange={(e) => updateProductItem(item.id, 'name', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <Label>Quantité</Label>
                          <Input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateProductItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                            min="1"
                          />
                        </div>
                        
                        <div>
                          <Label>Prix unitaire (MAD)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateProductItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            placeholder="Description du produit"
                            value={item.description}
                            onChange={(e) => updateProductItem(item.id, 'description', e.target.value)}
                            rows={2}
                          />
                        </div>
                        
                        <div>
                          <Label>Référence</Label>
                          <Input
                            placeholder="Référence produit"
                            value={item.reference}
                            onChange={(e) => updateProductItem(item.id, 'reference', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addProductItem}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un Produit
                  </Button>
                </CardContent>
              </Card>
            )}
            
            // NewQuoteForm.tsx - PART 6: CUSTOM LINE ITEMS AND SUMMARY

            {/* Custom Line Items */}
            <Card>
              <CardHeader>
                <CardTitle>Éléments Personnalisés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editableLineItems.map((item) => (
                  <div key={item.id} className="p-4 border border-gray-200 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Élément personnalisé</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeEditableLineItem(item.id)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Description</Label>
                        <Input
                          placeholder="Description du service"
                          value={item.description}
                          onChange={(e) => {
                            setEditableLineItems(current =>
                              current.map(i => i.id === item.id ? { ...i, description: e.target.value } : i)
                            )
                          }}
                        />
                      </div>
                      
                      <div>
                        <Label>Quantité</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          min="1"
                        />
                      </div>
                      
                      <div>
                        <Label>Prix unitaire (MAD)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Détails</Label>
                      <Textarea
                        placeholder="Détails supplémentaires"
                        value={item.detail}
                        onChange={(e) => {
                          setEditableLineItems(current =>
                            current.map(i => i.id === item.id ? { ...i, detail: e.target.value } : i)
                          )
                        }}
                        rows={2}
                      />
                    </div>
                    
                    <div className="text-right">
                      <span className="text-lg font-semibold">
                        Total: {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addEditableLineItem}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un Élément Personnalisé
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Résumé du Devis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {errors.lineItems && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {errors.lineItems}
                  </div>
                )}
                
                {/* Line Items Summary */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Éléments du devis</h4>
                  {finalQuote.lineItems.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {finalQuote.lineItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-start text-sm p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <div className="font-medium">{item.description}</div>
                            {item.detail && (
                              <div className="text-gray-600 text-xs">{item.detail}</div>
                            )}
                            <div className="text-gray-500 text-xs">
                              {item.quantity} × {formatCurrency(item.unitPrice)}
                            </div>
                          </div>
                          <div className="font-medium text-right">
                            {formatCurrency(item.totalPrice)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Aucun élément ajouté</p>
                  )}
                </div>

                <Separator />

                {/* Expiration Date */}
                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Date d'expiration</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-gray-500">
                    Par défaut: 30 jours à partir d'aujourd'hui
                  </p>
                </div>

                <Separator />
                        
                {/* Financial Summary */}
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

                <Separator />

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  disabled={isLoading || (!selectedLead && !newClientData.name.trim()) || finalQuote.lineItems.length === 0}
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

                {/* Help Text */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Le devis sera automatiquement sauvegardé en brouillon</p>
                  <p>• Le statut du lead sera mis à jour vers "Devis envoyé"</p>
                  <p>• Une notification sera envoyée à l'équipe</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}

export default NewQuoteForm
