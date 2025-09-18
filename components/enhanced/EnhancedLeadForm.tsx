// components/enhanced/EnhancedLeadForm.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { MapPin, Star, Building, Phone } from 'lucide-react'
import { Lead, LeadStatus, LeadType, PropertyType, AccessibilityLevel, UrgencyLevel, Frequency, ContractType, ProviderType, LeadCanal, EnarvaRole } from '@prisma/client'

interface EnhancedLeadFormProps {
  lead?: Partial<Lead>
  onSubmit: (data: any) => void
  isLoading?: boolean
}

export function EnhancedLeadForm({ lead, onSubmit, isLoading = false }: EnhancedLeadFormProps) {
  const [formData, setFormData] = useState({
    // Basic Information
    firstName: lead?.firstName || '',
    lastName: lead?.lastName || '',
    phone: lead?.phone || '',
    email: lead?.email || '',
    address: lead?.address || '',
    gpsLocation: lead?.gpsLocation || '',
    status: lead?.status || LeadStatus.NEW,
    score: lead?.score || 0,
    
    // Professional Details
    leadType: lead?.leadType || LeadType.PARTICULIER,
    company: lead?.company || '',
    iceNumber: lead?.iceNumber || '',
    activitySector: lead?.activitySector || '',
    contactPosition: lead?.contactPosition || '',
    department: lead?.department || '',
    
    // Request Details
    propertyType: lead?.propertyType || PropertyType.APARTMENT_MEDIUM,
    estimatedSurface: lead?.estimatedSurface || '',
    accessibility: lead?.accessibility || AccessibilityLevel.EASY,
    urgencyLevel: lead?.urgencyLevel || UrgencyLevel.NORMAL,
    budgetRange: lead?.budgetRange || '',
    frequency: lead?.frequency || Frequency.PONCTUEL,
    contractType: lead?.contractType || ContractType.INTERVENTION_UNIQUE,
    
    // Products & Equipment
    needsProducts: lead?.needsProducts || false,
    needsEquipment: lead?.needsEquipment || false,
    providedBy: lead?.providedBy || ProviderType.ENARVA,
    
    // Lead Origin
    channel: lead?.channel || LeadCanal.WHATSAPP,
    source: lead?.source || '',
    hasReferrer: lead?.hasReferrer || false,
    referrerContact: lead?.referrerContact || '',
    enarvaRole: lead?.enarvaRole || EnarvaRole.PRESTATAIRE_PRINCIPAL,
    
    // Follow-up
    originalMessage: lead?.originalMessage || '',
    assignedToId: lead?.assignedToId || '',
    
    // Materials (JSON field)
    materials: {
      marble: false,
      parquet: false,
      tiles: false,
      carpet: false,
      concrete: false,
      other: ''
    }
  })

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleMaterialChange = (material: string, value: boolean | string) => {
    setFormData(prev => ({
      ...prev,
      materials: { ...prev.materials, [material]: value }
    }))
  }

  const handleScoreChange = (value: number[]) => {
    // Fixed: Ensure the score value is always a number, not undefined
    const scoreValue = value[0] ?? 0
    setFormData(prev => ({ ...prev, score: scoreValue }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clean and prepare data
    const submitData = {
      ...formData,
      estimatedSurface: formData.estimatedSurface ? parseInt(formData.estimatedSurface.toString()) : null,
      materials: Object.entries(formData.materials).some(([key, value]) => 
        key !== 'other' ? value : value !== ''
      ) ? formData.materials : null
    }
    
    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Enhanced Basic Information with Score */}
      <Card className="thread-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Informations Générales & Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Statut du Lead</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">Nouveau</SelectItem>
                  <SelectItem value="CONTACTED">Contacté</SelectItem>
                  <SelectItem value="QUALIFIED">Qualifié</SelectItem>
                  <SelectItem value="QUOTED">Devisé</SelectItem>
                  <SelectItem value="CONVERTED">Converti</SelectItem>
                  <SelectItem value="LOST">Perdu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address">Adresse</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="pl-10"
                  placeholder="Adresse complète"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="gpsLocation">Coordonnées GPS</Label>
              <Input
                id="gpsLocation"
                value={formData.gpsLocation}
                onChange={(e) => handleChange('gpsLocation', e.target.value)}
                placeholder="lat, lng"
              />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Score du Lead: {formData.score}
            </Label>
            <Slider
              value={[formData.score]}
              onValueChange={handleScoreChange}
              max={100}
              step={1}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Professional Details */}
      <Card className="thread-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Détails Professionnels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="leadType">Type de lead</Label>
            <Select value={formData.leadType} onValueChange={(value) => handleChange('leadType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PARTICULIER">Particulier</SelectItem>
                <SelectItem value="PROFESSIONNEL">Professionnel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company">Entreprise</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="iceNumber">Numéro ICE</Label>
              <Input
                id="iceNumber"
                value={formData.iceNumber}
                onChange={(e) => handleChange('iceNumber', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="activitySector">Secteur d'activité</Label>
              <Input
                id="activitySector"
                value={formData.activitySector}
                onChange={(e) => handleChange('activitySector', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="contactPosition">Poste du contact</Label>
              <Input
                id="contactPosition"
                value={formData.contactPosition}
                onChange={(e) => handleChange('contactPosition', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="department">Département/Service</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Request Details with Materials */}
      <Card className="thread-card">
        <CardHeader>
          <CardTitle>Détails de la Demande</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="propertyType">Type de propriété</Label>
              <Select value={formData.propertyType} onValueChange={(value) => handleChange('propertyType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APARTMENT_SMALL">Appartement petit</SelectItem>
                  <SelectItem value="APARTMENT_MEDIUM">Appartement moyen</SelectItem>
                  <SelectItem value="APARTMENT_LARGE">Grand appartement</SelectItem>
                  <SelectItem value="VILLA_SMALL">Petite villa</SelectItem>
                  <SelectItem value="VILLA_LARGE">Grande villa</SelectItem>
                  <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                  <SelectItem value="OFFICE">Bureau</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="estimatedSurface">Surface estimée (m²)</Label>
              <Input
                id="estimatedSurface"
                type="number"
                value={formData.estimatedSurface}
                onChange={(e) => handleChange('estimatedSurface', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="accessibility">Accessibilité</Label>
              <Select value={formData.accessibility} onValueChange={(value) => handleChange('accessibility', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASY">Facile</SelectItem>
                  <SelectItem value="MEDIUM">Moyenne</SelectItem>
                  <SelectItem value="DIFFICULT">Difficile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Materials Selection */}
          <div>
            <Label>Matériaux à nettoyer</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="marble"
                  checked={formData.materials.marble}
                  onCheckedChange={(checked) => handleMaterialChange('marble', !!checked)}
                />
                <Label htmlFor="marble">Marbre</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="parquet"
                  checked={formData.materials.parquet}
                  onCheckedChange={(checked) => handleMaterialChange('parquet', !!checked)}
                />
                <Label htmlFor="parquet">Parquet</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tiles"
                  checked={formData.materials.tiles}
                  onCheckedChange={(checked) => handleMaterialChange('tiles', !!checked)}
                />
                <Label htmlFor="tiles">Carrelage</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="carpet"
                  checked={formData.materials.carpet}
                  onCheckedChange={(checked) => handleMaterialChange('carpet', !!checked)}
                />
                <Label htmlFor="carpet">Moquette</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="concrete"
                  checked={formData.materials.concrete}
                  onCheckedChange={(checked) => handleMaterialChange('concrete', !!checked)}
                />
                <Label htmlFor="concrete">Béton</Label>
              </div>
              <div>
                <Label htmlFor="other">Autre</Label>
                <Input
                  id="other"
                  value={formData.materials.other}
                  onChange={(e) => handleMaterialChange('other', e.target.value)}
                  placeholder="Préciser..."
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="urgencyLevel">Niveau d'urgence</Label>
              <Select value={formData.urgencyLevel} onValueChange={(value) => handleChange('urgencyLevel', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Faible</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">Élevé</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="budgetRange">Fourchette budgétaire</Label>
              <Input
                id="budgetRange"
                value={formData.budgetRange}
                onChange={(e) => handleChange('budgetRange', e.target.value)}
                placeholder="ex: 500-1000 MAD"
              />
            </div>
            <div>
              <Label htmlFor="frequency">Fréquence</Label>
              <Select value={formData.frequency} onValueChange={(value) => handleChange('frequency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PONCTUEL">Ponctuel</SelectItem>
                  <SelectItem value="HEBDOMADAIRE">Hebdomadaire</SelectItem>
                  <SelectItem value="MENSUEL">Mensuel</SelectItem>
                  <SelectItem value="TRIMESTRIEL">Trimestriel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products & Equipment */}
      <Card className="thread-card">
        <CardHeader>
          <CardTitle>Produits & Équipements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="needsProducts"
                checked={formData.needsProducts}
                onCheckedChange={(checked) => handleChange('needsProducts', !!checked)}
              />
              <Label htmlFor="needsProducts">Besoin de produits</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="needsEquipment"
                checked={formData.needsEquipment}
                onCheckedChange={(checked) => handleChange('needsEquipment', !!checked)}
              />
              <Label htmlFor="needsEquipment">Besoin d'équipements</Label>
            </div>
            <div>
              <Label htmlFor="providedBy">Fourni par</Label>
              <Select value={formData.providedBy} onValueChange={(value) => handleChange('providedBy', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENARVA">Enarva</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="MIXTE">Mixte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Origin */}
      <Card className="thread-card">
        <CardHeader>
          <CardTitle>Origine du Lead</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="channel">Canal d'acquisition</Label>
              <Select value={formData.channel} onValueChange={(value) => handleChange('channel', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="FACEBOOK">Facebook</SelectItem>
                  <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                  <SelectItem value="GOOGLE_SEARCH">Recherche Google</SelectItem>
                  <SelectItem value="SITE_WEB">Site web</SelectItem>
                  <SelectItem value="RECOMMANDATION_CLIENT">Recommandation client</SelectItem>
                  <SelectItem value="APPEL_TELEPHONIQUE">Appel téléphonique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="source">Source précise</Label>
              <Input
                id="source"
                value={formData.source}
                onChange={(e) => handleChange('source', e.target.value)}
                placeholder="URL, nom de la campagne..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="hasReferrer"
                  checked={formData.hasReferrer}
                  onCheckedChange={(checked) => handleChange('hasReferrer', !!checked)}
                />
                <Label htmlFor="hasReferrer">A un référent</Label>
              </div>
              {formData.hasReferrer && (
                <Input
                  id="referrerContact"
                  value={formData.referrerContact}
                  onChange={(e) => handleChange('referrerContact', e.target.value)}
                  placeholder="Contact du référent"
                />
              )}
            </div>
            <div>
              <Label htmlFor="enarvaRole">Rôle d'Enarva</Label>
              <Select value={formData.enarvaRole} onValueChange={(value) => handleChange('enarvaRole', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESTATAIRE_PRINCIPAL">Prestataire principal</SelectItem>
                  <SelectItem value="SOUS_TRAITANT">Sous-traitant</SelectItem>
                  <SelectItem value="PARTENAIRE">Partenaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Follow-up & Assignment */}
      <Card className="thread-card">
        <CardHeader>
          <CardTitle>Suivi & Attribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="originalMessage">Message original *</Label>
            <Textarea
              id="originalMessage"
              value={formData.originalMessage}
              onChange={(e) => handleChange('originalMessage', e.target.value)}
              placeholder="Décrivez la demande du client..."
              rows={4}
              required
            />
          </div>

          <div>
            <Label htmlFor="assignedToId">Assigné à</Label>
            <Input
              id="assignedToId"
              value={formData.assignedToId}
              onChange={(e) => handleChange('assignedToId', e.target.value)}
              placeholder="ID de l'utilisateur assigné"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" disabled={isLoading}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Enregistrement...' : lead ? 'Mettre à jour' : 'Créer le lead'}
        </Button>
      </div>
    </form>
  )
}