'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/Switch'
import { Plus, X, Save, Search, User, Package, Wrench } from 'lucide-react'

// Types
interface ServiceInput {
  type: string
  surface: number
  levels: number
  distance: number
  etage: 'RDC' | 'AvecAscenseur' | 'SansAscenseur'
  delai: 'IMMEDIAT' | 'URGENT' | 'STANDARD'
  difficulte: 'STANDARD' | 'DIFFICILE' | 'EXTREME'
}

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

// Complete list of Enarva services
const ENARVA_SERVICES = [
  'Grand Ménage',
  'Fin de chantier', 
  'Nettoyage Standard',
  'Nettoyage Express',
  'Nettoyage Vitres',
  'Nettoyage Post-Travaux',
  'Nettoyage Bureaux',
  'Nettoyage Commercial',
  'Entretien Régulier',
  'Cristallisation Marbre',
  'Ménage Régulier',
  'Nettoyage Industriel',
  'Remise en état',
  'Maintenance'
] as const

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
    { id: Date.now(), type: 'Grand Ménage', surface: 50, levels: 1, distance: 5, etage: 'RDC', delai: 'STANDARD', difficulte: 'STANDARD' }
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

  // NEW: Final price override
  const [finalPriceOverride, setFinalPriceOverride] = useState<number | null>(null)
  const [enablePriceOverride, setEnablePriceOverride] = useState(false)

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({})

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
          typeLabel: lead.leadType === 'PARTICULIER' ? 'Particulier' : 'Entreprise'
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
      searchLeads(searchQuery)
    }, 300)

    setSearchTimeoutId(timeoutId)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchLeads])

  // Service quote calculation
  const serviceQuoteCalculation = useMemo(() => {
    if (businessType !== 'SERVICE') return { lineItems: [], subTotalHT: 0, vatAmount: 0, totalTTC: 0, finalPrice: 0 }

    const lineItems: LineItem[] = services.map(service => {
      const surface = service.surface * service.levels
      let baseRate = 20

      // Service-specific base rates
      switch (service.type) {
        case 'Grand Ménage': baseRate = 25; break
        case 'Fin de chantier': baseRate = 35; break
        case 'Nettoyage Standard': baseRate = 15; break
        case 'Nettoyage Express': baseRate = 12; break
        case 'Nettoyage Vitres': baseRate = 8; break
        case 'Cristallisation Marbre': baseRate = 40; break
        case 'Nettoyage Post-Travaux': baseRate = 30; break
        case 'Nettoyage Bureaux': baseRate = 18; break
        case 'Nettoyage Commercial': baseRate = 22; break
        case 'Entretien Régulier': baseRate = 14; break
        default: baseRate = 20
      }

      // Apply coefficients
      let coefficient = 1.0
      if (service.distance > 10) coefficient *= 1.15
      if (service.etage === 'SansAscenseur') coefficient *= 1.3
      else if (service.etage === 'AvecAscenseur') coefficient *= 1.1
      if (service.delai === 'IMMEDIAT') coefficient *= 1.8
      else if (service.delai === 'URGENT') coefficient *= 1.4
      if (service.difficulte === 'EXTREME') coefficient *= 1.5
      else if (service.difficulte === 'DIFFICILE') coefficient *= 1.2

      const amount = Math.round(surface * baseRate * coefficient)

      return {
        id: `service-${service.id}`,
        description: service.type,
        detail: `${surface}m²${service.levels > 1 ? ` • ${service.levels} niveaux` : ''}${service.distance > 10 ? ` • ${service.distance}km` : ''}`,
        amount,
        quantity: 1,
        unitPrice: amount,
        totalPrice: amount,
        editable: true
      }
    })

    const subTotalHT = lineItems.reduce((acc, item) => acc + item.totalPrice, 0)
    const vatAmount = subTotalHT * 0.20
    let totalTTC = subTotalHT + vatAmount
    if (totalTTC < 500) totalTTC = 500
    const finalPrice = Math.round(totalTTC / 10) * 10

    return { lineItems, subTotalHT, vatAmount, totalTTC, finalPrice }
  }, [services, businessType])

  // Product quote calculation
  const productQuoteCalculation = useMemo(() => {
    if (businessType !== 'PRODUCT') return { lineItems: [], subTotalHT: 0, vatAmount: 0, totalTTC: 0, finalPrice: 0 }

    const lineItems: LineItem[] = productItems
      .filter(item => item.name.trim() && item.qty > 0 && item.unitPrice > 0)
      .map(item => ({
        id: `product-${item.id}`,
        description: item.name,
        detail: `${item.description ? item.description : ''}${item.reference ? ` (Réf: ${item.reference})` : ''}`,
        amount: item.qty * item.unitPrice,
        quantity: item.qty,
        unitPrice: item.unitPrice,
        totalPrice: item.qty * item.unitPrice,
        editable: true
      }))

    const subTotalHT = lineItems.reduce((acc, item) => acc + item.totalPrice, 0)
    const vatAmount = subTotalHT * 0.20
    let totalTTC = subTotalHT + vatAmount
    if (totalTTC < 500) totalTTC = 500
    const finalPrice = Math.round(totalTTC / 10) * 10

    return { lineItems, subTotalHT, vatAmount, totalTTC, finalPrice }
  }, [productItems, businessType])

  // Final quote calculation with override
  const finalQuote = useMemo(() => {
    const baseQuote = businessType === 'SERVICE' ? serviceQuoteCalculation : productQuoteCalculation
    
    // Add custom editable line items
    const allLineItems = [...baseQuote.lineItems, ...editableLineItems]
    const subTotalHT = allLineItems.reduce((acc, item) => acc + item.totalPrice, 0)
    const vatAmount = subTotalHT * 0.20
    let totalTTC = subTotalHT + vatAmount
    if (totalTTC < 500) totalTTC = 500
    
    // Use override price if enabled, otherwise use calculated price
    const calculatedFinalPrice = Math.round(totalTTC / 10) * 10
    const finalPrice = enablePriceOverride && finalPriceOverride !== null ? finalPriceOverride : calculatedFinalPrice

    return { 
      lineItems: allLineItems, 
      subTotalHT, 
      vatAmount, 
      totalTTC, 
      finalPrice,
      calculatedPrice: calculatedFinalPrice
    }
  }, [serviceQuoteCalculation, productQuoteCalculation, editableLineItems, businessType, enablePriceOverride, finalPriceOverride])

  // Form validation - FIXED with better logic
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // CLIENT VALIDATION - Must have either selected lead OR complete new client data
    const hasSelectedLead = selectedLead && selectedLead.id
    const hasNewClientName = newClientData.name.trim()
    const hasNewClientPhone = newClientData.phone.trim()

    if (!hasSelectedLead && !hasNewClientName) {
      newErrors.client = "Veuillez sélectionner un client existant ou entrer le nom d'un nouveau client"
    }

    // If creating new client, phone is required
    if (hasNewClientName && !hasNewClientPhone) {
      newErrors.phone = "Le numéro de téléphone est requis pour un nouveau client"
    }

    // BUSINESS TYPE SPECIFIC VALIDATION
    if (businessType === 'SERVICE') {
      // Must have at least one valid service
      const hasValidService = services.some(s => s.surface > 0 && s.type.trim())
      if (!hasValidService) {
        newErrors.services = "Veuillez configurer au moins un service avec une surface valide"
      }
    } else if (businessType === 'PRODUCT') {
      // Must have at least one valid product
      const hasValidProduct = productItems.some(p => p.name.trim() && p.qty > 0 && p.unitPrice > 0)
      if (!hasValidProduct) {
        newErrors.products = "Veuillez ajouter au moins un produit valide"
      }
    }

    // FINAL QUOTE VALIDATION - Must have line items
    if (finalQuote.lineItems.length === 0) {
      newErrors.lineItems = "Aucun élément dans le devis. Veuillez ajouter des services ou produits."
    }

    // EXPIRATION DATE VALIDATION
    if (!expiresAt) {
      newErrors.expiresAt = "La date d'expiration est requise"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle service changes
  const updateService = (id: number, field: keyof ServiceInput, value: any) => {
    setServices(current =>
      current.map(service =>
        service.id === id ? { ...service, [field]: value } : service
      )
    )
  }

  const addService = () => {
    const newService: ServiceInputState = {
      id: Date.now(),
      type: 'Grand Ménage',
      surface: 50,
      levels: 1,
      distance: 5,
      etage: 'RDC',
      delai: 'STANDARD',
      difficulte: 'STANDARD'
    }
    setServices(current => [...current, newService])
  }

  const removeService = (id: number) => {
    setServices(current => current.filter(service => service.id !== id))
  }

  // Handle product changes
  const updateProduct = (id: string, field: keyof ProductItem, value: any) => {
    setProductItems(current =>
      current.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  const addProduct = () => {
    const newProduct: ProductItem = {
      id: Date.now().toString(),
      name: '',
      qty: 1,
      unitPrice: 0,
      description: '',
      reference: ''
    }
    setProductItems(current => [...current, newProduct])
  }

  const removeProduct = (id: string) => {
    setProductItems(current => current.filter(item => item.id !== id))
  }

  // Handle editable line items
  const updateEditableLineItem = (id: string, field: keyof LineItem, value: any) => {
    setEditableLineItems(current =>
      current.map(item =>
        item.id === id ? { 
          ...item, 
          [field]: value,
          ...(field === 'quantity' || field === 'unitPrice' ? 
            { totalPrice: (field === 'quantity' ? value : item.quantity) * (field === 'unitPrice' ? value : item.unitPrice) } : 
            {}
          )
        } : item
      )
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

  // Form submission - FIXED with better payload structure
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error("Veuillez corriger les erreurs dans le formulaire")
      // Scroll to first error
      const firstErrorElement = document.querySelector('.border-red-500')
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    setIsLoading(true)
    console.log('🚀 Starting quote creation process...')

    try {
      const quoteNumber = `DV-${businessType.substring(0, 3)}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

      // CRITICAL: Build proper payload structure matching API expectations
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
        // FIXED: Handle undefined expiresAt properly
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }

      // CRITICAL: Handle client data properly - either leadId OR new client fields
      if (selectedLead && selectedLead.id) {
        quotePayload.leadId = selectedLead.id
        console.log('📋 Using existing lead:', selectedLead.id)
      } else if (newClientData.name.trim() && newClientData.phone.trim()) {
        // ALL required fields for new client
        quotePayload.newClientName = newClientData.name.trim()
        quotePayload.newClientPhone = newClientData.phone.trim()
        quotePayload.newClientEmail = newClientData.email.trim() || null
        quotePayload.newClientAddress = newClientData.address.trim() || null
        console.log('👤 Creating new client:', newClientData.name.trim())
      } else {
        throw new Error('Client information is incomplete')
      }

      // Add business-specific data
      if (businessType === 'SERVICE') {
        quotePayload.type = quoteType
        quotePayload.surface = services.reduce((acc, s) => acc + (s.surface * s.levels), 0)
        quotePayload.levels = services.reduce((acc, s) => Math.max(acc, s.levels), 1)
        
        // FIXED: Determine property type from services with correct enum values
        const totalSurface = services.reduce((acc, s) => acc + (s.surface * s.levels), 0)
        
        // Map service types to proper property type enum values
        const hasApartment = services.some(s => s.type.toLowerCase().includes('appartement'))
        const hasVilla = services.some(s => s.type.toLowerCase().includes('villa') || s.type.toLowerCase().includes('maison'))
        const hasCommercial = services.some(s => s.type.toLowerCase().includes('bureau') || s.type.toLowerCase().includes('commercial'))
        
        let propertyType = 'OTHER' // Default to OTHER (correct enum value)
        
        if (hasApartment) {
          // Determine apartment size based on surface
          if (totalSurface <= 50) propertyType = 'APARTMENT_SMALL'
          else if (totalSurface <= 100) propertyType = 'APARTMENT_MEDIUM'
          else if (totalSurface <= 150) propertyType = 'APARTMENT_LARGE'
          else propertyType = 'APARTMENT_MULTI'
        } else if (hasVilla) {
          // Determine villa size based on surface
          if (totalSurface <= 100) propertyType = 'VILLA_SMALL'
          else if (totalSurface <= 200) propertyType = 'VILLA_MEDIUM'
          else propertyType = 'VILLA_LARGE'
        } else if (hasCommercial) {
          // Determine commercial type
          if (services.some(s => s.type.toLowerCase().includes('bureau'))) {
            propertyType = 'OFFICE'
          } else {
            propertyType = 'COMMERCIAL'
          }
        }
        
        quotePayload.propertyType = propertyType
      } else {
        quotePayload.productCategory = productCategory || 'OTHER'
        quotePayload.productDetails = {
          items: productItems.filter(item => item.name.trim()),
          category: productCategory
        }
        quotePayload.deliveryType = deliveryType || 'STANDARD'
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
        
        // Show specific validation errors if available
        if (responseData.details) {
          const errorMessages = Object.entries(responseData.details).map(([field, messages]: [string, any]) => 
            `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`
          ).join('\n')
          toast.error(`Erreurs de validation:\n${errorMessages}`)
        } else {
          toast.error(responseData.message || 'Erreur lors de la création du devis')
        }
        return
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

  return (
    <div className="min-h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Nouveau Devis</h1>
                <p className="text-gray-600">Créer un devis pour un client</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Création...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Créer le Devis
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-4xl pb-8">
          <div className="space-y-6">
            {/* Business Type Selection - REDESIGNED */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Type de Devis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 ${
                      businessType === 'SERVICE'
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}
                    onClick={() => setBusinessType('SERVICE')}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className={`p-3 rounded-full ${
                        businessType === 'SERVICE' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Wrench className={`h-8 w-8 ${
                          businessType === 'SERVICE' ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className={`text-lg font-semibold ${
                          businessType === 'SERVICE' ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          Devis de Service
                        </h3>
                        <p className={`text-sm ${
                          businessType === 'SERVICE' ? 'text-blue-700' : 'text-gray-600'
                        }`}>
                          Nettoyage, maintenance, intervention
                        </p>
                      </div>
                    </div>
                    {businessType === 'SERVICE' && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-blue-600 text-white rounded-full p-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 ${
                      businessType === 'PRODUCT'
                        ? 'border-green-500 bg-green-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}
                    onClick={() => setBusinessType('PRODUCT')}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className={`p-3 rounded-full ${
                        businessType === 'PRODUCT' ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Package className={`h-8 w-8 ${
                          businessType === 'PRODUCT' ? 'text-green-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className={`text-lg font-semibold ${
                          businessType === 'PRODUCT' ? 'text-green-900' : 'text-gray-900'
                        }`}>
                          Devis de Produit
                        </h3>
                        <p className={`text-sm ${
                          businessType === 'PRODUCT' ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          Vente de produits, équipements
                        </p>
                      </div>
                    </div>
                    {businessType === 'PRODUCT' && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-green-600 text-white rounded-full p-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
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
              {/* Selected Lead Display */}
              {selectedLead ? (
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <h3 className="font-medium">{selectedLead.displayName}</h3>
                    <p className="text-sm text-gray-600">{selectedLead.phone}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {selectedLead.typeLabel}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSelectedLead}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  {/* Search Field */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      placeholder="Rechercher un client existant..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Search Results */}
                  {showSearchResults && (
                    <div className="border rounded-lg bg-white shadow-sm max-h-64 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-4 text-center text-gray-500">
                          Recherche en cours...
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((lead) => (
                          <div
                            key={lead.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => selectLead(lead)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-sm">{lead.displayName}</h4>
                                <p className="text-xs text-gray-600">{lead.phone}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {lead.typeLabel}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          Aucun client trouvé
                        </div>
                      )}
                    </div>
                  )}

                  {/* New Client Form */}
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-3">Ou créer un nouveau client</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="clientName">Nom complet *</Label>
                        <Input
                          id="clientName"
                          value={newClientData.name}
                          onChange={(e) => updateNewClientData('name', e.target.value)}
                          placeholder="Nom et prénom du client"
                          className={errors.client ? 'border-red-500' : ''}
                        />
                        {errors.client && <p className="text-red-500 text-xs mt-1">{errors.client}</p>}
                      </div>
                      <div>
                        <Label htmlFor="clientPhone">Téléphone *</Label>
                        <Input
                          id="clientPhone"
                          value={newClientData.phone}
                          onChange={(e) => updateNewClientData('phone', e.target.value)}
                          placeholder="+212 6XX XXX XXX"
                          className={errors.phone ? 'border-red-500' : ''}
                        />
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                      </div>
                      <div>
                        <Label htmlFor="clientEmail">Email</Label>
                        <Input
                          id="clientEmail"
                          type="email"
                          value={newClientData.email}
                          onChange={(e) => updateNewClientData('email', e.target.value)}
                          placeholder="email@exemple.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientAddress">Adresse</Label>
                        <Input
                          id="clientAddress"
                          value={newClientData.address}
                          onChange={(e) => updateNewClientData('address', e.target.value)}
                          placeholder="Adresse complète"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Service Configuration */}
          {businessType === 'SERVICE' && (
            <Card>
              <CardHeader>
                <CardTitle>Configuration des Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quote Type */}
                <div>
                  <Label>Type de Devis</Label>
                  <Select value={quoteType} onValueChange={(value: any) => setQuoteType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXPRESS">Express (Intervention rapide)</SelectItem>
                      <SelectItem value="STANDARD">Standard (Délai normal)</SelectItem>
                      <SelectItem value="PREMIUM">Premium (Service haut de gamme)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Services List */}
                <div className="space-y-3">
                  {services.map((service, index) => (
                    <div key={service.id} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Service {index + 1}</h4>
                        {services.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeService(service.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label>Type de Service</Label>
                          <Select
                            value={service.type}
                            onValueChange={(value) => updateService(service.id, 'type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ENARVA_SERVICES.map((serviceType) => (
                                <SelectItem key={serviceType} value={serviceType}>
                                  {serviceType}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Surface (m²)</Label>
                          <Input
                            type="number"
                            value={service.surface}
                            onChange={(e) => updateService(service.id, 'surface', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.1"
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
                            onChange={(e) => updateService(service.id, 'distance', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.1"
                          />
                        </div>

                        <div>
                          <Label>Étage</Label>
                          <Select
                            value={service.etage}
                            onValueChange={(value: any) => updateService(service.id, 'etage', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RDC">Rez-de-chaussée</SelectItem>
                              <SelectItem value="AvecAscenseur">Avec ascenseur</SelectItem>
                              <SelectItem value="SansAscenseur">Sans ascenseur</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Délai</Label>
                          <Select
                            value={service.delai}
                            onValueChange={(value: any) => updateService(service.id, 'delai', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="STANDARD">Standard</SelectItem>
                              <SelectItem value="URGENT">Urgent (+40%)</SelectItem>
                              <SelectItem value="IMMEDIAT">Immédiat (+80%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Difficulté</Label>
                          <Select
                            value={service.difficulte}
                            onValueChange={(value: any) => updateService(service.id, 'difficulte', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="STANDARD">Standard</SelectItem>
                              <SelectItem value="DIFFICILE">Difficile (+20%)</SelectItem>
                              <SelectItem value="EXTREME">Extrême (+50%)</SelectItem>
                            </SelectContent>
                          </Select>
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
                </div>

                {errors.services && (
                  <p className="text-red-500 text-sm">{errors.services}</p>
                )}
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
                {/* Product Category */}
                <div>
                  <Label>Catégorie de Produit</Label>
                  <Select value={productCategory} onValueChange={setProductCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EQUIPEMENT">Équipement de nettoyage</SelectItem>
                      <SelectItem value="PRODUIT_CHIMIQUE">Produits chimiques</SelectItem>
                      <SelectItem value="ACCESSOIRE">Accessoires</SelectItem>
                      <SelectItem value="CONSOMMABLE">Consommables</SelectItem>
                      <SelectItem value="AUTRE">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Products List */}
                <div className="space-y-3">
                  {productItems.map((product, index) => (
                    <div key={product.id} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Produit {index + 1}</h4>
                        {productItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProduct(product.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <Label>Nom du Produit</Label>
                          <Input
                            value={product.name}
                            onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                            placeholder="Nom du produit"
                          />
                        </div>

                        <div>
                          <Label>Quantité</Label>
                          <Input
                            type="number"
                            value={product.qty}
                            onChange={(e) => updateProduct(product.id, 'qty', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.1"
                          />
                        </div>

                        <div>
                          <Label>Prix Unitaire (MAD)</Label>
                          <Input
                            type="number"
                            value={product.unitPrice}
                            onChange={(e) => updateProduct(product.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div>
                          <Label>Description</Label>
                          <Input
                            value={product.description || ''}
                            onChange={(e) => updateProduct(product.id, 'description', e.target.value)}
                            placeholder="Description du produit"
                          />
                        </div>

                        <div>
                          <Label>Référence</Label>
                          <Input
                            value={product.reference || ''}
                            onChange={(e) => updateProduct(product.id, 'reference', e.target.value)}
                            placeholder="REF-001"
                          />
                        </div>

                        <div className="flex items-end">
                          <div className="w-full">
                            <Label>Total</Label>
                            <Input
                              value={`${(product.qty * product.unitPrice).toFixed(2)} MAD`}
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addProduct}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un Produit
                  </Button>
                </div>

                {/* Delivery Information */}
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-medium">Informations de Livraison</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Type de Livraison</Label>
                      <Select value={deliveryType} onValueChange={setDeliveryType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STANDARD">Livraison standard</SelectItem>
                          <SelectItem value="EXPRESS">Livraison express</SelectItem>
                          <SelectItem value="RETRAIT">Retrait sur site</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Adresse de Livraison</Label>
                      <Input
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Adresse de livraison"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Notes de Livraison</Label>
                    <Textarea
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Instructions spéciales pour la livraison..."
                      rows={3}
                    />
                  </div>
                </div>

                {errors.products && (
                  <p className="text-red-500 text-sm">{errors.products}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Custom Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Éléments Personnalisés</CardTitle>
              <p className="text-sm text-gray-600">
                Ajoutez des services ou produits personnalisés au devis
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {editableLineItems.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Élément personnalisé</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEditableLineItem(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateEditableLineItem(item.id, 'description', e.target.value)}
                        placeholder="Description du service/produit"
                      />
                    </div>

                    <div>
                      <Label>Quantité</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateEditableLineItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                        min="0"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <Label>Prix Unitaire (MAD)</Label>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateEditableLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <Label>Total</Label>
                      <Input
                        value={`${item.totalPrice.toFixed(2)} MAD`}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label>Détails</Label>
                    <Textarea
                      value={item.detail || ''}
                      onChange={(e) => updateEditableLineItem(item.id, 'detail', e.target.value)}
                      placeholder="Détails supplémentaires..."
                      rows={2}
                    />
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

          {/* Quote Summary with Price Override */}
          <Card>
            <CardHeader>
              <CardTitle>Récapitulatif du Devis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Line Items Preview */}
                <div className="space-y-2">
                  <h4 className="font-medium">Éléments du devis :</h4>
                  {finalQuote.lineItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm py-1 border-b">
                      <div className="flex-1">
                        <span className="font-medium">{item.description}</span>
                        {item.detail && <span className="text-gray-600 ml-2">({item.detail})</span>}
                      </div>
                      <span className="font-medium">{item.totalPrice.toFixed(2)} MAD</span>
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Sous-total HT :</span>
                    <span>{finalQuote.subTotalHT.toFixed(2)} MAD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA (20%) :</span>
                    <span>{finalQuote.vatAmount.toFixed(2)} MAD</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total TTC :</span>
                    <span>{finalQuote.totalTTC.toFixed(2)} MAD</span>
                  </div>
                  
                  {/* Price Override Section */}
                  <div className="border-t pt-3 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="price-override"
                        checked={enablePriceOverride}
                        onCheckedChange={setEnablePriceOverride}
                      />
                      <Label htmlFor="price-override" className="text-sm">
                        Modifier le prix final manuellement
                      </Label>
                    </div>

                    {enablePriceOverride ? (
                      <div className="space-y-2">
                        <Label htmlFor="final-price-override">Prix final personnalisé (MAD)</Label>
                        <Input
                          id="final-price-override"
                          type="number"
                          value={finalPriceOverride || ''}
                          onChange={(e) => setFinalPriceOverride(parseFloat(e.target.value) || null)}
                          placeholder={`Prix calculé: ${finalQuote.calculatedPrice} MAD`}
                          min="0"
                          step="0.01"
                        />
                        <p className="text-xs text-gray-600">
                          Prix calculé automatiquement : {finalQuote.calculatedPrice.toFixed(2)} MAD
                        </p>
                      </div>
                    ) : (
                      <div className="flex justify-between text-lg font-bold text-blue-600">
                        <span>Prix final :</span>
                        <span>{finalQuote.finalPrice.toFixed(2)} MAD</span>
                      </div>
                    )}

                    {enablePriceOverride && (
                      <div className="flex justify-between text-lg font-bold text-blue-600">
                        <span>Prix final :</span>
                        <span>{finalQuote.finalPrice.toFixed(2)} MAD</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expiration Date */}
                <div className="border-t pt-3">
                  <Label htmlFor="expiresAt">Date d'expiration du devis</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={errors.expiresAt ? 'border-red-500' : ''}
                  />
                  {errors.expiresAt && (
                    <p className="text-red-500 text-xs mt-1">{errors.expiresAt}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <Button
                  type="submit"
                  disabled={isLoading}
                  size="lg"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
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
                <div className="text-xs text-gray-500 space-y-1 text-center sm:text-right">
                  <p>• Le devis sera automatiquement sauvegardé</p>
                  <p>• Le statut du lead sera mis à jour vers "Devis envoyé"</p>
                  <p>• Une notification sera envoyée à l'équipe</p>
                </div>
              </div>

              {/* Error Display */}
              {Object.keys(errors).length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="text-red-800 font-medium mb-2">Erreurs à corriger :</h4>
                  <ul className="text-red-700 text-sm space-y-1">
                    {Object.entries(errors).map(([field, message]) => (
                      <li key={field}>• {message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </form>
    </div>
  )
}

export default NewQuoteForm