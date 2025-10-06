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
import { Plus, X, Save, Search, User, Package, Wrench, Building2, FileText } from 'lucide-react'

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
  estimatedSurface?: number
  status: string
  displayName: string
  typeLabel: string
  iceNumber?: string
  activitySector?: string
  contactPosition?: string
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
  serviceType?: string
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

const LEAD_TYPES = [
  { value: 'PARTICULIER', label: 'Particulier' },
  { value: 'PROFESSIONNEL', label: 'Professionnel' },
  { value: 'PUBLIC', label: 'Public' },
  { value: 'NGO', label: 'ONG' },
  { value: 'SYNDIC', label: 'Syndic' },
  { value: 'OTHER', label: 'Autre' }
]

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
    company: '',
    leadType: 'PARTICULIER',
    iceNumber: '',
    activitySector: '',
    contactPosition: '',
    department: ''
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
  const [deliveryType, setDeliveryType] = useState<string>('STANDARD_DELIVERY')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')

  // Purchase Order (Bon de Commande) state
  const [enablePurchaseOrder, setEnablePurchaseOrder] = useState(false)
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('')
  const [orderedBy, setOrderedBy] = useState('')

  // Common quote state
  const [expiresAt, setExpiresAt] = useState(
    new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
  )

  // Final price override
  const [finalPriceOverride, setFinalPriceOverride] = useState<number | null>(null)
  const [enablePriceOverride, setEnablePriceOverride] = useState(false)

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Check if client is B2B
  const isB2BClient = useMemo(() => {
    if (selectedLead) {
      return selectedLead.leadType !== 'PARTICULIER'
    }
    return newClientData.leadType !== 'PARTICULIER'
  }, [selectedLead, newClientData.leadType])

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
        editable: true,
        serviceType: service.type
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
    
    const allLineItems = [...baseQuote.lineItems, ...editableLineItems]
    const subTotalHT = allLineItems.reduce((acc, item) => acc + item.totalPrice, 0)
    const vatAmount = subTotalHT * 0.20
    let totalTTC = subTotalHT + vatAmount
    if (totalTTC < 500) totalTTC = 500
    
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

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    const hasSelectedLead = selectedLead && selectedLead.id
    const hasNewClientName = newClientData.name.trim()
    const hasNewClientPhone = newClientData.phone.trim()

    if (!hasSelectedLead && !hasNewClientName) {
      newErrors.client = "Veuillez sélectionner un client existant ou entrer le nom d'un nouveau client"
    }

    if (!hasSelectedLead && hasNewClientName && !hasNewClientPhone) {
      newErrors.phone = "Le numéro de téléphone est requis pour un nouveau client"
    }

    // B2B validation
    if (!hasSelectedLead && newClientData.leadType !== 'PARTICULIER') {
      if (!newClientData.company.trim()) {
        newErrors.company = "Le nom de l'entreprise est requis pour un client professionnel"
      }
      if (newClientData.iceNumber.trim() && newClientData.iceNumber.trim().length !== 15) {
        newErrors.iceNumber = "Le numéro ICE doit contenir exactement 15 chiffres"
      }
    }

    if (businessType === 'SERVICE') {
      const hasValidService = services.some(s => s.surface > 0 && s.type.trim())
      if (!hasValidService) {
        newErrors.services = "Veuillez configurer au moins un service avec une surface valide"
      }
    } else if (businessType === 'PRODUCT') {
      const hasValidProduct = productItems.some(p => p.name.trim() && p.qty > 0 && p.unitPrice > 0)
      if (!hasValidProduct) {
        newErrors.products = "Veuillez ajouter au moins un produit valide"
      }

      if (enablePurchaseOrder) {
        if (!purchaseOrderNumber.trim()) {
          newErrors.purchaseOrderNumber = "Le numéro de bon de commande est requis"
        }
        if (!orderedBy.trim()) {
          newErrors.orderedBy = "Le nom du commanditaire est requis"
        }
      }
    }

    if (finalQuote.lineItems.length === 0) {
      newErrors.lineItems = "Aucun élément dans le devis. Veuillez ajouter des services ou produits."
    }

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
    setNewClientData({ name: '', email: '', phone: '', address: '', company: '', leadType: 'PARTICULIER', iceNumber: '', activitySector: '', contactPosition: '', department: '' })
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors.client
      delete newErrors.phone
      delete newErrors.name
      delete newErrors.email
      delete newErrors.company
      delete newErrors.iceNumber
      return newErrors
    })
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
    if (field === 'company' && value.trim()) {
      setErrors(prev => ({ ...prev, company: '' }))
    }
    if (field === 'iceNumber' && value.trim()) {
      setErrors(prev => ({ ...prev, iceNumber: '' }))
    }
  }

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error("Veuillez corriger les erreurs dans le formulaire")
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

      const quotePayload: any = {
        quoteNumber,
        businessType,
        lineItems: finalQuote.lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          serviceType: item.serviceType
        })),
        subTotalHT: finalQuote.subTotalHT,
        vatAmount: finalQuote.vatAmount,
        totalTTC: finalQuote.totalTTC,
        finalPrice: finalQuote.finalPrice,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }

      // Handle client data
      if (selectedLead && selectedLead.id) {
        quotePayload.leadId = selectedLead.id
        console.log('📋 Using existing lead:', selectedLead.id)
      } else if (newClientData.name.trim() && newClientData.phone.trim()) {
        quotePayload.newClientName = newClientData.name.trim()
        quotePayload.newClientPhone = newClientData.phone.trim()
        quotePayload.newClientEmail = newClientData.email.trim() || null
        quotePayload.newClientAddress = newClientData.address.trim() || null
        quotePayload.newClientLeadType = newClientData.leadType
        
        // B2B specific fields
        if (newClientData.leadType !== 'PARTICULIER') {
          quotePayload.newClientCompany = newClientData.company.trim() || null
          quotePayload.newClientIceNumber = newClientData.iceNumber.trim() || null
          quotePayload.newClientActivitySector = newClientData.activitySector.trim() || null
          quotePayload.newClientContactPosition = newClientData.contactPosition.trim() || null
          quotePayload.newClientDepartment = newClientData.department.trim() || null
        }
        
        console.log('👤 Creating new client:', newClientData.name.trim(), '- Type:', newClientData.leadType)
      } else {
        throw new Error('Client information is incomplete')
      }

      // Add business-specific data
      if (businessType === 'SERVICE') {
        quotePayload.type = quoteType
        
        const totalSurface = services.reduce((acc, s) => acc + (s.surface * s.levels), 0)
        quotePayload.surface = totalSurface
        quotePayload.levels = services.reduce((acc, s) => Math.max(acc, s.levels), 1)
        
        // Extract serviceType from first line item
        const firstService = finalQuote.lineItems.find(item => item.serviceType)
        if (firstService && firstService.serviceType) {
          quotePayload.serviceType = firstService.serviceType
          console.log('🎯 Adding serviceType to quote:', firstService.serviceType)
        }
        
        // Use Lead data if selected, otherwise auto-detect
        if (selectedLead && selectedLead.propertyType) {
          quotePayload.propertyType = selectedLead.propertyType
          console.log('🏠 Using propertyType from selected Lead:', selectedLead.propertyType)
        } else {
          // Fallback: Auto-detect based on services
          const hasApartment = services.some(s => s.type.toLowerCase().includes('appartement'))
          const hasVilla = services.some(s => s.type.toLowerCase().includes('villa') || s.type.toLowerCase().includes('maison'))
          const hasCommercial = services.some(s => s.type.toLowerCase().includes('bureau') || s.type.toLowerCase().includes('commercial'))
          
          let propertyType = 'OTHER'
          
          if (hasApartment) {
            if (totalSurface <= 50) propertyType = 'APARTMENT_SMALL'
            else if (totalSurface <= 100) propertyType = 'APARTMENT_MEDIUM'
            else if (totalSurface <= 150) propertyType = 'APARTMENT_LARGE'
            else propertyType = 'APARTMENT_MULTI'
          } else if (hasVilla) {
            if (totalSurface <= 100) propertyType = 'VILLA_SMALL'
            else if (totalSurface <= 200) propertyType = 'VILLA_MEDIUM'
            else propertyType = 'VILLA_LARGE'
          } else if (hasCommercial) {
            propertyType = services.some(s => s.type.toLowerCase().includes('bureau')) ? 'OFFICE' : 'COMMERCIAL'
          }
          
          quotePayload.propertyType = propertyType
          console.log('🏠 Auto-detected propertyType:', propertyType)
        }
        
        // If Lead has surface, use it
        if (selectedLead && selectedLead.estimatedSurface) {
          quotePayload.surface = selectedLead.estimatedSurface
          console.log('📐 Using surface from selected Lead:', selectedLead.estimatedSurface)
        }
        
      } else {
        quotePayload.productCategory = productCategory || 'OTHER'
        quotePayload.productDetails = {
          items: productItems.filter(item => item.name.trim()),
          category: productCategory
        }
        quotePayload.deliveryType = deliveryType || 'STANDARD_DELIVERY'
        quotePayload.deliveryAddress = deliveryAddress || null
        quotePayload.deliveryNotes = deliveryNotes || null

        // Purchase order data - using dedicated fields
        if (enablePurchaseOrder) {
          quotePayload.purchaseOrderNumber = purchaseOrderNumber.trim()
          quotePayload.orderedBy = orderedBy.trim()
        }
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
    <div className="min-h-screen bg-background">
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">Nouveau Devis</h1>
                <p className="text-xs md:text-sm text-muted-foreground">Créer un devis pour un client</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1 md:flex-none text-sm"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-sm"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      <span className="hidden sm:inline">Création...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Créer le Devis</span>
                      <span className="sm:hidden">Créer</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-3 md:px-4 max-w-4xl pb-6 md:pb-8">
          <div className="space-y-4 md:space-y-6">
            {/* Business Type Selection */}
            <Card>
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Wrench className="h-4 w-4 md:h-5 md:w-5" />
                  Type de Devis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div
                    className={`relative cursor-pointer rounded-xl border-2 p-4 md:p-6 transition-all duration-200 ${
                      businessType === 'SERVICE'
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-border bg-card hover:border-primary/50 hover:shadow-md'
                    }`}
                    onClick={() => setBusinessType('SERVICE')}
                  >
                    <div className="flex flex-col items-center text-center space-y-2 md:space-y-3">
                      <div className={`p-2 md:p-3 rounded-full ${
                        businessType === 'SERVICE' ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Wrench className={`h-6 w-6 md:h-8 md:w-8 ${
                          businessType === 'SERVICE' ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div>
                        <h3 className={`text-base md:text-lg font-semibold ${
                          businessType === 'SERVICE' ? 'text-primary' : 'text-foreground'
                        }`}>
                          Devis de Service
                        </h3>
                        <p className={`text-xs md:text-sm ${
                          businessType === 'SERVICE' ? 'text-primary/80' : 'text-muted-foreground'
                        }`}>
                          Nettoyage, maintenance
                        </p>
                      </div>
                    </div>
                    {businessType === 'SERVICE' && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className={`relative cursor-pointer rounded-xl border-2 p-4 md:p-6 transition-all duration-200 ${
                      businessType === 'PRODUCT'
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-border bg-card hover:border-primary/50 hover:shadow-md'
                    }`}
                    onClick={() => setBusinessType('PRODUCT')}
                  >
                    <div className="flex flex-col items-center text-center space-y-2 md:space-y-3">
                      <div className={`p-2 md:p-3 rounded-full ${
                        businessType === 'PRODUCT' ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Package className={`h-6 w-6 md:h-8 md:w-8 ${
                          businessType === 'PRODUCT' ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div>
                        <h3 className={`text-base md:text-lg font-semibold ${
                          businessType === 'PRODUCT' ? 'text-primary' : 'text-foreground'
                        }`}>
                          Devis de Produit
                        </h3>
                        <p className={`text-xs md:text-sm ${
                          businessType === 'PRODUCT' ? 'text-primary/80' : 'text-muted-foreground'
                        }`}>
                          Vente de produits
                        </p>
                      </div>
                    </div>
                    {businessType === 'PRODUCT' && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
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
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <User className="h-4 w-4 md:h-5 md:w-5" />
                Sélection du Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedLead ? (
                <div className="flex items-center justify-between p-3 md:p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm md:text-base text-foreground truncate">{selectedLead.displayName}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">{selectedLead.phone}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {selectedLead.typeLabel}
                      </Badge>
                      {selectedLead.iceNumber && (
                        <Badge variant="secondary" className="text-xs">
                          ICE: {selectedLead.iceNumber}
                        </Badge>
                      )}
                      {selectedLead.propertyType && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedLead.propertyType}
                        </Badge>
                      )}
                      {selectedLead.estimatedSurface && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedLead.estimatedSurface}m²
                        </Badge>
                      )}
                    </div>
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
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input
                      placeholder="Rechercher un client existant..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 text-sm"
                    />
                  </div>

                  {showSearchResults && (
                    <div className="border border-border rounded-lg bg-card shadow-sm max-h-64 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Recherche en cours...
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((lead) => (
                          <div
                            key={lead.id}
                            className="p-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-b-0"
                            onClick={() => selectLead(lead)}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm text-foreground truncate">{lead.displayName}</h4>
                                <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
                              </div>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {lead.typeLabel}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Aucun client trouvé
                        </div>
                      )}
                    </div>
                  )}

                  {/* New Client Form */}
                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium mb-3 text-sm md:text-base text-foreground">Ou créer un nouveau client</h3>
                    
                    <div className="mb-4">
                      <Label htmlFor="leadType" className="text-sm">Type de client *</Label>
                      <Select 
                        value={newClientData.leadType} 
                        onValueChange={(value) => updateNewClientData('leadType', value)}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value} className="text-sm">
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <Label htmlFor="clientName" className="text-sm">Nom complet *</Label>
                        <Input
                          id="clientName"
                          value={newClientData.name}
                          onChange={(e) => updateNewClientData('name', e.target.value)}
                          placeholder="Nom et prénom du client"
                          className={`text-sm ${errors.client ? 'border-destructive' : ''}`}
                        />
                        {errors.client && <p className="text-destructive text-xs mt-1">{errors.client}</p>}
                      </div>
                      <div>
                        <Label htmlFor="clientPhone" className="text-sm">Téléphone *</Label>
                        <Input
                          id="clientPhone"
                          value={newClientData.phone}
                          onChange={(e) => updateNewClientData('phone', e.target.value)}
                          placeholder="+212 6XX XXX XXX"
                          className={`text-sm ${errors.phone ? 'border-destructive' : ''}`}
                        />
                        {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone}</p>}
                      </div>
                      <div>
                        <Label htmlFor="clientEmail" className="text-sm">Email</Label>
                        <Input
                          id="clientEmail"
                          type="email"
                          value={newClientData.email}
                          onChange={(e) => updateNewClientData('email', e.target.value)}
                          placeholder="email@exemple.com"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientAddress" className="text-sm">Adresse</Label>
                        <Input
                          id="clientAddress"
                          value={newClientData.address}
                          onChange={(e) => updateNewClientData('address', e.target.value)}
                          placeholder="Adresse complète"
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* B2B FIELDS */}
                    {newClientData.leadType !== 'PARTICULIER' && (
                      <div className="mt-4 p-3 md:p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100">Informations Entreprise</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="md:col-span-2">
                            <Label htmlFor="clientCompany" className="text-sm">Nom de l'entreprise *</Label>
                            <Input
                              id="clientCompany"
                              value={newClientData.company}
                              onChange={(e) => updateNewClientData('company', e.target.value)}
                              placeholder="Nom de la société"
                              className={`text-sm ${errors.company ? 'border-destructive' : ''}`}
                            />
                            {errors.company && <p className="text-destructive text-xs mt-1">{errors.company}</p>}
                          </div>
                          
                          <div>
                            <Label htmlFor="clientICE" className="text-sm">Numéro ICE</Label>
                            <Input
                              id="clientICE"
                              value={newClientData.iceNumber}
                              onChange={(e) => updateNewClientData('iceNumber', e.target.value)}
                              placeholder="000000000000000 (15 chiffres)"
                              maxLength={15}
                              className={`text-sm ${errors.iceNumber ? 'border-destructive' : ''}`}
                            />
                            {errors.iceNumber && <p className="text-destructive text-xs mt-1">{errors.iceNumber}</p>}
                          </div>
                          
                          <div>
                            <Label htmlFor="activitySector" className="text-sm">Secteur d'activité</Label>
                            <Input
                              id="activitySector"
                              value={newClientData.activitySector}
                              onChange={(e) => updateNewClientData('activitySector', e.target.value)}
                              placeholder="Ex: Industrie, Commerce..."
                              className="text-sm"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="contactPosition" className="text-sm">Fonction du contact</Label>
                            <Input
                              id="contactPosition"
                              value={newClientData.contactPosition}
                              onChange={(e) => updateNewClientData('contactPosition', e.target.value)}
                              placeholder="Ex: Directeur, Responsable..."
                              className="text-sm"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="department" className="text-sm">Département</Label>
                            <Input
                              id="department"
                              value={newClientData.department}
                              onChange={(e) => updateNewClientData('department', e.target.value)}
                              placeholder="Ex: Achats, RH..."
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Service Configuration */}
          {businessType === 'SERVICE' && (
            <Card>
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-base md:text-lg">Configuration des Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm">Type de Devis</Label>
                  <Select value={quoteType} onValueChange={(value: any) => setQuoteType(value)}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXPRESS" className="text-sm">Express (Intervention rapide)</SelectItem>
                      <SelectItem value="STANDARD" className="text-sm">Standard (Délai normal)</SelectItem>
                      <SelectItem value="PREMIUM" className="text-sm">Premium (Service haut de gamme)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  {services.map((service, index) => (
                    <div key={service.id} className="p-3 md:p-4 border border-border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm md:text-base text-foreground">Service {index + 1}</h4>
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
                        <div className="md:col-span-3">
                          <Label className="text-sm">Type de Service</Label>
                          <Select
                            value={service.type}
                            onValueChange={(value) => updateService(service.id, 'type', value)}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ENARVA_SERVICES.map((serviceType) => (
                                <SelectItem key={serviceType} value={serviceType} className="text-sm">
                                  {serviceType}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm">Surface (m²)</Label>
                          <Input
                            type="number"
                            value={service.surface}
                            onChange={(e) => updateService(service.id, 'surface', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.1"
                            className="text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Niveaux</Label>
                          <Input
                            type="number"
                            value={service.levels}
                            onChange={(e) => updateService(service.id, 'levels', parseInt(e.target.value) || 1)}
                            min="1"
                            max="10"
                            className="text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Distance (km)</Label>
                          <Input
                            type="number"
                            value={service.distance}
                            onChange={(e) => updateService(service.id, 'distance', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.1"
                            className="text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Étage</Label>
                          <Select
                            value={service.etage}
                            onValueChange={(value: any) => updateService(service.id, 'etage', value)}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RDC" className="text-sm">Rez-de-chaussée</SelectItem>
                              <SelectItem value="AvecAscenseur" className="text-sm">Avec ascenseur</SelectItem>
                              <SelectItem value="SansAscenseur" className="text-sm">Sans ascenseur</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm">Délai</Label>
                          <Select
                            value={service.delai}
                            onValueChange={(value: any) => updateService(service.id, 'delai', value)}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="STANDARD" className="text-sm">Standard</SelectItem>
                              <SelectItem value="URGENT" className="text-sm">Urgent (+40%)</SelectItem>
                              <SelectItem value="IMMEDIAT" className="text-sm">Immédiat (+80%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm">Difficulté</Label>
                          <Select
                            value={service.difficulte}
                            onValueChange={(value: any) => updateService(service.id, 'difficulte', value)}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="STANDARD" className="text-sm">Standard</SelectItem>
                              <SelectItem value="DIFFICILE" className="text-sm">Difficile (+20%)</SelectItem>
                              <SelectItem value="EXTREME" className="text-sm">Extrême (+50%)</SelectItem>
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
                    className="w-full text-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un Service
                  </Button>
                </div>

                {errors.services && (
                  <p className="text-destructive text-sm">{errors.services}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Product Configuration */}
          {businessType === 'PRODUCT' && (
            <Card>
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-base md:text-lg">Configuration des Produits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm">Catégorie de Produit</Label>
                  <Select value={productCategory} onValueChange={setProductCategory}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EQUIPMENT" className="text-sm">Équipement</SelectItem>
                      <SelectItem value="CONSUMABLES" className="text-sm">Consommables</SelectItem>
                      <SelectItem value="FURNITURE" className="text-sm">Mobilier</SelectItem>
                      <SelectItem value="ELECTRONICS" className="text-sm">Électronique</SelectItem>
                      <SelectItem value="DECORATION" className="text-sm">Décoration</SelectItem>
                      <SelectItem value="TEXTILES" className="text-sm">Textiles</SelectItem>
                      <SelectItem value="LIGHTING" className="text-sm">Éclairage</SelectItem>
                      <SelectItem value="STORAGE" className="text-sm">Rangement</SelectItem>
                      <SelectItem value="KITCHEN_ITEMS" className="text-sm">Articles de cuisine</SelectItem>
                      <SelectItem value="BATHROOM_ITEMS" className="text-sm">Articles de salle de bain</SelectItem>
                      <SelectItem value="OFFICE_SUPPLIES" className="text-sm">Fournitures de bureau</SelectItem>
                      <SelectItem value="OTHER" className="text-sm">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  {productItems.map((product, index) => (
                    <div key={product.id} className="p-3 md:p-4 border border-border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm md:text-base text-foreground">Produit {index + 1}</h4>
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
                        <div className="md:col-span-2 lg:col-span-3">
                          <Label className="text-sm">Nom du Produit</Label>
                          <Input
                            value={product.name}
                            onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                            placeholder="Nom du produit"
                            className="text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Quantité</Label>
                          <Input
                            type="number"
                            value={product.qty}
                            onChange={(e) => updateProduct(product.id, 'qty', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.1"
                            className="text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Prix Unitaire (MAD)</Label>
                          <Input
                            type="number"
                            value={product.unitPrice}
                            onChange={(e) => updateProduct(product.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Total</Label>
                          <Input
                            value={`${(product.qty * product.unitPrice).toFixed(2)} MAD`}
                            disabled
                            className="bg-muted text-sm"
                          />
                        </div>

                        <div className="md:col-span-2 lg:col-span-2">
                          <Label className="text-sm">Description</Label>
                          <Input
                            value={product.description || ''}
                            onChange={(e) => updateProduct(product.id, 'description', e.target.value)}
                            placeholder="Description du produit"
                            className="text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Référence</Label>
                          <Input
                            value={product.reference || ''}
                            onChange={(e) => updateProduct(product.id, 'reference', e.target.value)}
                            placeholder="REF-001"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addProduct}
                    className="w-full text-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un Produit
                  </Button>
                </div>

                {/* PURCHASE ORDER SECTION */}
                {isB2BClient && (
                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <h4 className="font-medium text-sm text-foreground">Bon de Commande</h4>
                      </div>
                      <Switch
                        id="enable-purchase-order"
                        checked={enablePurchaseOrder}
                        onCheckedChange={setEnablePurchaseOrder}
                      />
                    </div>
                    
                    {enablePurchaseOrder && (
                      <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Ces informations apparaîtront sur le devis et la facture
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="purchaseOrderNumber" className="text-sm">N° Bon de Commande *</Label>
                            <Input
                              id="purchaseOrderNumber"
                              value={purchaseOrderNumber}
                              onChange={(e) => {
                                setPurchaseOrderNumber(e.target.value)
                                if (e.target.value.trim()) setErrors(prev => ({ ...prev, purchaseOrderNumber: '' }))
                              }}
                              placeholder="BC-2025-001"
                              className={`text-sm ${errors.purchaseOrderNumber ? 'border-destructive' : ''}`}
                            />
                            {errors.purchaseOrderNumber && <p className="text-destructive text-xs mt-1">{errors.purchaseOrderNumber}</p>}
                          </div>
                          
                          <div>
                            <Label htmlFor="orderedBy" className="text-sm">Commandé par *</Label>
                            <Input
                              id="orderedBy"
                              value={orderedBy}
                              onChange={(e) => {
                                setOrderedBy(e.target.value)
                                if (e.target.value.trim()) setErrors(prev => ({ ...prev, orderedBy: '' }))
                              }}
                              placeholder="Nom du responsable"
                              className={`text-sm ${errors.orderedBy ? 'border-destructive' : ''}`}
                            />
                            {errors.orderedBy && <p className="text-destructive text-xs mt-1">{errors.orderedBy}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Delivery Information */}
                <div className="border-t border-border pt-4 space-y-3">
                  <h3 className="font-medium text-sm text-foreground">Informations de Livraison</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Type de Livraison</Label>
                      <Select value={deliveryType} onValueChange={setDeliveryType}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STANDARD_DELIVERY" className="text-sm">Livraison standard</SelectItem>
                          <SelectItem value="EXPRESS_DELIVERY" className="text-sm">Livraison express</SelectItem>
                          <SelectItem value="PICKUP" className="text-sm">Retrait sur site</SelectItem>
                          <SelectItem value="SCHEDULED_DELIVERY" className="text-sm">Livraison planifiée</SelectItem>
                          <SelectItem value="WHITE_GLOVE" className="text-sm">Service premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm">Adresse de Livraison</Label>
                      <Input
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Adresse de livraison"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Notes de Livraison</Label>
                    <Textarea
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Instructions spéciales pour la livraison..."
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                </div>

                {errors.products && (
                  <p className="text-destructive text-sm">{errors.products}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Custom Line Items */}
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-base md:text-lg">Éléments Personnalisés</CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground">
                Ajoutez des services ou produits personnalisés au devis
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {editableLineItems.map((item) => (
                <div key={item.id} className="p-3 md:p-4 border border-border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm text-foreground">Élément personnalisé</h4>
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
                    <div className="md:col-span-2">
                      <Label className="text-sm">Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateEditableLineItem(item.id, 'description', e.target.value)}
                        placeholder="Description du service/produit"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Quantité</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateEditableLineItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                        min="0"
                        step="0.1"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Prix Unitaire (MAD)</Label>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateEditableLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label className="text-sm">Détails</Label>
                    <Textarea
                      value={item.detail || ''}
                      onChange={(e) => updateEditableLineItem(item.id, 'detail', e.target.value)}
                      placeholder="Détails supplémentaires..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>

                  <div className="mt-2 text-right">
                    <span className="text-sm font-medium text-foreground">
                      Total: {item.totalPrice.toFixed(2)} MAD
                    </span>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addEditableLineItem}
                className="w-full text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un Élément Personnalisé
              </Button>
            </CardContent>
          </Card>

          {/* Quote Summary with Price Override */}
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-base md:text-lg">Récapitulatif du Devis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-foreground">Éléments du devis :</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {finalQuote.lineItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs md:text-sm py-1 border-b border-border">
                        <div className="flex-1 min-w-0 pr-2">
                          <span className="font-medium text-foreground block truncate">{item.description}</span>
                          {item.detail && <span className="text-muted-foreground block truncate">({item.detail})</span>}
                        </div>
                        <span className="font-medium text-foreground shrink-0">{item.totalPrice.toFixed(2)} MAD</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-foreground">
                    <span>Sous-total HT :</span>
                    <span>{finalQuote.subTotalHT.toFixed(2)} MAD</span>
                  </div>
                  <div className="flex justify-between text-sm text-foreground">
                    <span>TVA (20%) :</span>
                    <span>{finalQuote.vatAmount.toFixed(2)} MAD</span>
                  </div>
                  <div className="flex justify-between font-medium text-sm md:text-base text-foreground">
                    <span>Total TTC :</span>
                    <span>{finalQuote.totalTTC.toFixed(2)} MAD</span>
                  </div>
                  
                  <div className="border-t border-border pt-3 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="price-override"
                        checked={enablePriceOverride}
                        onCheckedChange={setEnablePriceOverride}
                      />
                      <Label htmlFor="price-override" className="text-xs md:text-sm">
                        Modifier le prix final manuellement
                      </Label>
                    </div>

                    {enablePriceOverride ? (
                      <div className="space-y-2">
                        <Label htmlFor="final-price-override" className="text-sm">Prix final personnalisé (MAD)</Label>
                        <Input
                          id="final-price-override"
                          type="number"
                          value={finalPriceOverride || ''}
                          onChange={(e) => setFinalPriceOverride(parseFloat(e.target.value) || null)}
                          placeholder={`Prix calculé: ${finalQuote.calculatedPrice} MAD`}
                          min="0"
                          step="0.01"
                          className="text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Prix calculé automatiquement : {finalQuote.calculatedPrice.toFixed(2)} MAD
                        </p>
                      </div>
                    ) : null}

                    <div className="flex justify-between text-base md:text-lg font-bold text-primary">
                      <span>Prix final :</span>
                      <span>{finalQuote.finalPrice.toFixed(2)} MAD</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <Label htmlFor="expiresAt" className="text-sm">Date d'expiration du devis</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`text-sm ${errors.expiresAt ? 'border-destructive' : ''}`}
                  />
                  {errors.expiresAt && (
                    <p className="text-destructive text-xs mt-1">{errors.expiresAt}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Section */}
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex flex-col gap-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-sm md:text-base"
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

                <div className="text-xs text-muted-foreground space-y-1 text-center">
                  <p>• Le devis sera automatiquement sauvegardé</p>
                  <p>• Le statut du lead sera mis à jour vers "Devis envoyé"</p>
                  <p>• Une notification sera envoyée à l'équipe</p>
                </div>
              </div>

              {Object.keys(errors).length > 0 && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <h4 className="text-destructive font-medium mb-2 text-sm">Erreurs à corriger :</h4>
                  <ul className="text-destructive/80 text-xs space-y-1">
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