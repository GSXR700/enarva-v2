'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Clock, MapPin, User, Users, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface Quote {
  id: string
  quoteNumber: string
  finalPrice: number
  surface?: number
  propertyType?: string
  lead: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email?: string
    address?: string
    company?: string
  }
}

interface TeamLeader {
  id: string
  name: string
  email: string
  phone?: string
  experience: string
  availability: string
  user?: {
    id: string
    name: string
    email: string
  }
}

interface MissionFormData {
  leadId: string
  leadName: string
  quoteId: string
  teamLeaderId: string
  address: string
  coordinates: string
  scheduledDate: string
  estimatedDuration: string
  priority: string
  type: string
  accessNotes: string
  adminNotes: string
}

export default function NewMissionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // FIX: Safe parameter extraction
  const preselectedQuoteId = searchParams?.get('quoteId') || ''
  const missionType = searchParams?.get('type') || 'SERVICE'

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([])
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<MissionFormData>({
    leadId: '',
    leadName: '',
    quoteId: preselectedQuoteId,
    teamLeaderId: '',
    address: '',
    coordinates: '',
    scheduledDate: '',
    estimatedDuration: '4',
    priority: 'NORMAL',
    type: missionType,
    accessNotes: '',
    adminNotes: ''
  })

  // Fetch quotes and team leaders
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch accepted quotes with real-time data
        const quotesResponse = await fetch('/api/quotes?status=ACCEPTED', {
          cache: 'no-store', // Ensure fresh data
          headers: {
            'Cache-Control': 'no-cache',
          }
        })
        
        if (quotesResponse.ok) {
          const quotesData = await quotesResponse.json()
          console.log('📋 Fetched quotes:', quotesData.length)
          // FIX: Handle both array and object responses
          const quotesArray = Array.isArray(quotesData) ? quotesData : (quotesData.quotes || quotesData.data || [])
          setQuotes(quotesArray)
          
          // Auto-select preselected quote if provided
          if (preselectedQuoteId) {
            const preselectedQuote = quotesArray.find((q: Quote) => q.id === preselectedQuoteId)
            if (preselectedQuote) {
              selectQuote(preselectedQuote)
            }
          }
        } else {
          console.error('Failed to fetch quotes:', quotesResponse.status)
          toast.error('Erreur lors du chargement des devis')
        }

        // FIX: Enhanced team leaders fetching with fallback
        try {
          const teamResponse = await fetch('/api/team-members?role=TEAM_LEADER&availability=AVAILABLE')
          if (teamResponse.ok) {
            const teamData = await teamResponse.json()
            // FIX: Handle different response structures
            const teamArray = Array.isArray(teamData) ? teamData : (teamData.teamMembers || teamData.data || [])
            setTeamLeaders(teamArray)
          } else {
            // FIX: Fallback to users endpoint if team-members fails
            const usersResponse = await fetch('/api/users?role=TEAM_LEADER')
            if (usersResponse.ok) {
              const usersData = await usersResponse.json()
              const usersArray = Array.isArray(usersData) ? usersData : (usersData.users || usersData.data || [])
              setTeamLeaders(usersArray)
            } else {
              toast.error('Erreur lors du chargement des chefs d\'équipe')
            }
          }
        } catch (teamError) {
          console.error('Error fetching team leaders:', teamError)
          toast.error('Erreur lors du chargement des chefs d\'équipe')
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Erreur lors du chargement des données')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [preselectedQuoteId])

  // Auto-prefill form when quote is selected
  const selectQuote = (quote: Quote) => {
    if (!quote) return // FIX: Safety check
    
    console.log('🎯 Selected quote:', quote)
    setSelectedQuote(quote)
    
    // FIX: Safe property access
    const lead = quote.lead || {}
    const firstName = lead.firstName || ''
    const lastName = lead.lastName || ''
    const company = lead.company ? ` (${lead.company})` : ''
    
    // Auto-prefill form with quote data
    setFormData(prev => ({
      ...prev,
      quoteId: quote.id || '',
      leadId: lead.id || '',
      leadName: `${firstName} ${lastName}${company}`.trim() || 'Client inconnu',
      address: lead.address || '',
      // Set default duration based on quote surface
      estimatedDuration: quote.surface ? Math.max(2, Math.ceil(quote.surface / 50)).toString() : '4'
    }))

    toast.success(`Informations du devis ${quote.quoteNumber} pré-remplies`)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (field: keyof MissionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Handle quote selection
    if (field === 'quoteId' && value) {
      const quote = quotes.find(q => q.id === value)
      if (quote) {
        selectQuote(quote)
      }
    }
  }

  const validateForm = () => {
    const errors: string[] = []

    if (missionType === 'SERVICE' && !formData.quoteId) {
      errors.push('Veuillez sélectionner un devis')
    }
    if (!formData.teamLeaderId) {
      errors.push('Veuillez sélectionner un chef d\'équipe')
    }
    if (!formData.address.trim()) {
      errors.push('Veuillez indiquer l\'adresse d\'intervention')
    }
    if (!formData.scheduledDate) {
      errors.push('Veuillez indiquer la date et l\'heure prévues')
    }
    if (!formData.estimatedDuration || parseFloat(formData.estimatedDuration) < 0.5) {
      errors.push('La durée estimée doit être d\'au moins 30 minutes')
    }

    if (errors.length > 0) {
      toast.error(`Erreurs de validation:\n${errors.join('\n')}`)
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const missionData = {
        ...formData,
        estimatedDuration: parseFloat(formData.estimatedDuration),
        // Convert to ISO string for the API
        scheduledDate: new Date(formData.scheduledDate).toISOString(),
      }

      console.log('📤 Submitting mission data:', missionData)

      const response = await fetch('/api/missions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(missionData),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || 'Failed to create mission')
      }

      console.log('✅ Mission created successfully:', responseData)
      toast.success('Mission créée avec succès!')
      
      router.push(`/missions/${responseData.id}`)

    } catch (error) {
      console.error('❌ Error creating mission:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création de la mission')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getQuoteStatusBadge = (quote: Quote) => {
    if (!quote) return null // FIX: Safety check
    
    return (
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline" className="text-green-600 border-green-200">
          Accepté
        </Badge>
        <span className="text-gray-500">•</span>
        <span className="font-medium text-green-600">{formatCurrency(quote.finalPrice)}</span>
        {quote.surface && (
          <>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">{quote.surface}m²</span>
          </>
        )}
      </div>
    )
  }

  const getTeamLeaderBadge = (leader: TeamLeader) => {
    if (!leader) return null // FIX: Safety check
    
    const colors = {
      JUNIOR: 'bg-blue-100 text-blue-800',
      INTERMEDIATE: 'bg-yellow-100 text-yellow-800', 
      SENIOR: 'bg-green-100 text-green-800',
      EXPERT: 'bg-purple-100 text-purple-800'
    }
    
    return (
      <Badge variant="outline" className={colors[leader.experience as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {leader.experience}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold">
                {missionType === 'TECHNICAL_VISIT' ? 'Nouvelle Visite Technique' : 'Nouvelle Mission'}
              </h1>
              <p className="text-gray-600">
                {missionType === 'TECHNICAL_VISIT' 
                  ? 'Planifier une visite technique sur site'
                  : 'Créer une mission à partir d\'un devis accepté'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quote Selection */}
          {missionType === 'SERVICE' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Sélection du Devis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Chargement des devis...</p>
                  </div>
                ) : quotes.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun devis accepté</h3>
                    <p className="text-gray-600 mb-4">
                      Il n'y a actuellement aucun devis accepté pour créer une mission.
                    </p>
                    <Button onClick={() => router.push('/quotes')} variant="outline">
                      Voir tous les devis
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="quoteId">Devis Accepté * ({quotes.length} disponible{quotes.length > 1 ? 's' : ''})</Label>
                      <Select 
                        value={formData.quoteId} 
                        onValueChange={(value) => handleSelectChange('quoteId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un devis accepté..." />
                        </SelectTrigger>
                        <SelectContent>
                          {quotes.map(quote => (
                            <SelectItem key={quote.id} value={quote.id}>
                              <div className="flex flex-col">
                                <div className="font-medium">
                                  {quote.quoteNumber} - {quote.lead?.firstName || ''} {quote.lead?.lastName || ''}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {formatCurrency(quote.finalPrice)} • {quote.lead?.address || 'Adresse à définir'}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Selected Quote Preview */}
                    {selectedQuote && selectedQuote.lead && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Devis sélectionné</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Client</div>
                            <div className="font-medium">
                              {selectedQuote.lead.firstName} {selectedQuote.lead.lastName}
                            </div>
                            {selectedQuote.lead.company && (
                              <div className="text-gray-600">{selectedQuote.lead.company}</div>
                            )}
                          </div>
                          <div>
                            <div className="text-gray-600">Contact</div>
                            <div className="font-medium">{selectedQuote.lead.phone}</div>
                            {selectedQuote.lead.email && (
                              <div className="text-gray-600">{selectedQuote.lead.email}</div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3">
                          {getQuoteStatusBadge(selectedQuote)}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Mission Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Détails de la Mission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Info */}
                <div>
                  <Label>Client</Label>
                  <Input 
                    value={formData.leadName} 
                    disabled 
                    placeholder="Sélectionnez un devis pour voir le client..."
                    className="bg-gray-50"
                  />
                </div>

                {/* Team Leader */}
                <div>
                  <Label htmlFor="teamLeaderId">Chef d'Équipe *</Label>
                  <Select 
                    value={formData.teamLeaderId} 
                    onValueChange={(value) => handleSelectChange('teamLeaderId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un chef d'équipe..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teamLeaders.length === 0 ? (
                        <SelectItem value="no-leaders" disabled>
                          Aucun chef d'équipe disponible
                        </SelectItem>
                      ) : (
                        teamLeaders.map(leader => {
                          // FIX: Handle different response structures for team leaders
                          const leaderId = leader.id || leader.user?.id || ''
                          const leaderName = leader.name || leader.user?.name || 'Chef d\'équipe'
                          const leaderEmail = leader.email || leader.user?.email || ''
                          
                          return (
                            <SelectItem key={leaderId} value={leaderId}>
                              <div className="flex items-center justify-between w-full">
                                <div>
                                  <div className="font-medium">{leaderName}</div>
                                  <div className="text-sm text-gray-500">{leaderEmail}</div>
                                </div>
                                {getTeamLeaderBadge(leader)}
                              </div>
                            </SelectItem>
                          )
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <Label htmlFor="address">Adresse d'Intervention *</Label>
                  <Input 
                    id="address" 
                    value={formData.address} 
                    onChange={handleChange} 
                    placeholder="Adresse sera remplie automatiquement avec le devis..."
                    className={formData.address ? 'bg-white' : 'bg-gray-50'}
                  />
                </div>

                {/* Coordinates */}
                <div className="md:col-span-2">
                  <Label htmlFor="coordinates">Coordonnées GPS (optionnel)</Label>
                  <Input 
                    id="coordinates" 
                    value={formData.coordinates} 
                    onChange={handleChange} 
                    placeholder="Latitude, Longitude (ex: 33.5731, -7.5898)"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Planification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="scheduledDate">Date et Heure *</Label>
                  <Input 
                    id="scheduledDate" 
                    type="datetime-local" 
                    value={formData.scheduledDate} 
                    onChange={handleChange} 
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                <div>
                  <Label htmlFor="estimatedDuration">Durée Estimée (heures) *</Label>
                  <Input 
                    id="estimatedDuration" 
                    type="number" 
                    value={formData.estimatedDuration} 
                    onChange={handleChange} 
                    min="0.5" 
                    max="24" 
                    step="0.5"
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priorité</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value) => handleSelectChange('priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Faible</SelectItem>
                      <SelectItem value="NORMAL">Normale</SelectItem>
                      <SelectItem value="HIGH">Haute</SelectItem>
                      <SelectItem value="CRITICAL">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Notes Additionnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="accessNotes">Instructions d'Accès</Label>
                <Textarea 
                  id="accessNotes" 
                  value={formData.accessNotes} 
                  onChange={handleChange} 
                  placeholder="Code d'accès, étage, instructions spéciales..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="adminNotes">Notes Administratives</Label>
                <Textarea 
                  id="adminNotes" 
                  value={formData.adminNotes} 
                  onChange={handleChange} 
                  placeholder="Notes internes pour l'équipe..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (missionType === 'SERVICE' && quotes.length === 0)}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Création...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Créer la Mission
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}