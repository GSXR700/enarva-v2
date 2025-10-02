// app/(administration)/field-reports/new/page.tsx - FIXED MOBILE SIGNATURES
"use client"

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Camera, Save, Trash2, PenTool, RotateCcw, Check } from 'lucide-react'
import { toast } from 'sonner'

interface SignaturePadProps {
  onSignature: (signature: string) => void
  label: string
  existingSignature?: string
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSignature, label, existingSignature }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(!!existingSignature)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // FIXED: Responsive canvas sizing
    const updateCanvasSize = () => {
      const container = containerRef.current
      if (!container) return

      const containerWidth = container.clientWidth - 32 // Account for padding
      const width = Math.min(containerWidth, 600)
      const height = 200

      // Set actual canvas size
      canvas.width = width
      canvas.height = height

      // Set display size
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      // Redraw background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Set drawing styles
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Load existing signature if provided
      if (existingSignature && hasSignature) {
        const img = new Image()
        img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        img.src = existingSignature
      }
    }

    updateCanvasSize()

    // Handle window resize
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [existingSignature, hasSignature])

  // FIXED: Universal coordinate getter with proper type safety
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    
    if ('touches' in e) {
      // Touch event - FIXED: Proper null check
      const touch = e.touches[0] || e.changedTouches[0]
      if (!touch) return { x: 0, y: 0 }
      
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      }
    } else {
      // Mouse event
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault() // CRITICAL: Prevent scrolling on touch
    setIsDrawing(true)
    
    const canvas = canvasRef.current
    if (!canvas) return

    const coords = getCoordinates(e)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault() // CRITICAL: Prevent scrolling on touch
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const coords = getCoordinates(e)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
  }

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing) return
    
    setIsDrawing(false)
    setHasSignature(true)
    
    const canvas = canvasRef.current
    if (!canvas) return

    // Convert to base64 and notify parent
    const signatureData = canvas.toDataURL('image/png')
    onSignature(signatureData)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onSignature('')
  }

  return (
    <div ref={containerRef} className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
        <canvas
          ref={canvasRef}
          className="border border-gray-200 rounded cursor-crosshair bg-white w-full touch-none"
          style={{ touchAction: 'none' }}
          // Mouse events
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          // Touch events - FIXED FOR MOBILE
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
          <p className="text-xs text-gray-500">
            Cliquez et glissez pour signer (ou utilisez votre doigt sur mobile)
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSignature}
              className="text-red-600 hover:text-red-700"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Effacer
            </Button>
            {hasSignature && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <Check className="w-3 h-3 mr-1" />
                Signé
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface Mission {
  id: string
  missionNumber: string
  lead: {
    firstName: string
    lastName: string
  }
}

export default function EnhancedFieldReportForm() {
  const router = useRouter()
  const [missions, setMissions] = useState<Mission[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [beforePhotos, setBeforePhotos] = useState<File[]>([])
  const [afterPhotos, setAfterPhotos] = useState<File[]>([])
  const [clientSignature, setClientSignature] = useState('')
  const [teamLeadSignature, setTeamLeadSignature] = useState('')

  const [formData, setFormData] = useState({
    missionId: '',
    hoursWorked: '',
    generalObservations: '',
    clientFeedback: '',
    issuesEncountered: '',
    materialsUsed: '',
    additionalNotes: ''
  })

  useEffect(() => {
    fetchMissions()
  }, [])

  const fetchMissions = async () => {
    try {
      const response = await fetch('/api/missions?status=IN_PROGRESS,QUALITY_CHECK')
      if (!response.ok) throw new Error('Failed to fetch missions')
      const data = await response.json()
      setMissions(data)
    } catch (error) {
      toast.error('Impossible de charger les missions')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleSelectChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const files = Array.from(e.target.files || [])
    if (type === 'before') {
      setBeforePhotos(prev => [...prev, ...files])
    } else {
      setAfterPhotos(prev => [...prev, ...files])
    }
  }

  const removePhoto = (index: number, type: 'before' | 'after') => {
    if (type === 'before') {
      setBeforePhotos(prev => prev.filter((_, i) => i !== index))
    } else {
      setAfterPhotos(prev => prev.filter((_, i) => i !== index))
    }
  }

  const uploadPhotos = async (photos: File[]): Promise<string[]> => {
    const uploadPromises = photos.map(async (photo) => {
      const formData = new FormData()
      formData.append('file', photo)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Upload failed')
      const result = await response.json()
      return result.url
    })

    return await Promise.all(uploadPromises)
  }

  const uploadSignature = async (signatureData: string): Promise<string> => {
    if (!signatureData) return ''
    
    // Convert base64 to blob
    const response = await fetch(signatureData)
    const blob = await response.blob()
    
    const formData = new FormData()
    formData.append('file', blob, 'signature.png')
    
    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    
    if (!uploadResponse.ok) throw new Error('Signature upload failed')
    const result = await uploadResponse.json()
    return result.url
  }

  const validateForm = (): boolean => {
    if (!formData.missionId) {
      toast.error('Veuillez sélectionner une mission')
      return false
    }
    if (!formData.hoursWorked || parseFloat(formData.hoursWorked) <= 0) {
      toast.error('Veuillez indiquer le nombre d\'heures travaillées')
      return false
    }
    if (!clientSignature) {
      toast.error('La signature du client est requise')
      return false
    }
    if (!teamLeadSignature) {
      toast.error('La signature du chef d\'équipe est requise')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)

    try {
      // Upload photos
      const beforePhotosUrls = beforePhotos.length > 0 ? await uploadPhotos(beforePhotos) : []
      const afterPhotosUrls = afterPhotos.length > 0 ? await uploadPhotos(afterPhotos) : []
      
      // Upload signatures
      const clientSignatureUrl = await uploadSignature(clientSignature)
      const teamLeadSignatureUrl = await uploadSignature(teamLeadSignature)

      const reportData = {
        ...formData,
        hoursWorked: parseFloat(formData.hoursWorked),
        materialsUsed: formData.materialsUsed ? JSON.parse(formData.materialsUsed) : null,
        beforePhotos: beforePhotosUrls,
        afterPhotos: afterPhotosUrls,
        clientSignatureUrl,
        teamLeadSignatureUrl
      }

      const response = await fetch('/api/field-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      })

      if (!response.ok) throw new Error('Failed to create field report')

      toast.success('Rapport de terrain créé avec succès!')
      router.push('/field-reports')
    } catch (error) {
      toast.error('Erreur lors de la création du rapport')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="main-content space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/field-reports">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Nouveau Rapport de Terrain
          </h1>
          <p className="text-muted-foreground mt-1">
            Créez un rapport détaillé avec signatures et photos
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mission Selection */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Sélection de la Mission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mission">Mission *</Label>
              <Select onValueChange={(value) => handleSelectChange('missionId', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une mission..." />
                </SelectTrigger>
                <SelectContent>
                  {missions.map((mission) => (
                    <SelectItem key={mission.id} value={mission.id}>
                      {mission.missionNumber} - {mission.lead.firstName} {mission.lead.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* General Information */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Informations Générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="hoursWorked">Heures travaillées *</Label>
              <Input
                id="hoursWorked"
                type="number"
                step="0.5"
                min="0"
                value={formData.hoursWorked}
                onChange={handleChange}
                required
                placeholder="Ex: 4.5"
              />
            </div>
            
            <div>
              <Label htmlFor="generalObservations">Observations générales</Label>
              <Textarea
                id="generalObservations"
                value={formData.generalObservations}
                onChange={handleChange}
                rows={4}
                placeholder="Décrivez le déroulement de la mission..."
              />
            </div>

            <div>
              <Label htmlFor="materialsUsed">Matériaux utilisés (JSON)</Label>
              <Textarea
                id="materialsUsed"
                value={formData.materialsUsed}
                onChange={handleChange}
                placeholder='{"produit_vitres": "5L", "chiffons_microfibre": "10 unités"}'
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Format JSON pour les matériaux utilisés
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Client Feedback */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Retour Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clientFeedback">Commentaires du client</Label>
              <Textarea
                id="clientFeedback"
                value={formData.clientFeedback}
                onChange={handleChange}
                rows={3}
                placeholder="Retours, suggestions ou remarques du client..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Photos de la Mission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Photos Avant</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={(e) => handlePhotoUpload(e, 'before')}
                className="mt-2"
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {beforePhotos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Before ${index + 1}`}
                      className="w-full h-32 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removePhoto(index, 'before')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Photos Après</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={(e) => handlePhotoUpload(e, 'after')}
                className="mt-2"
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {afterPhotos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`After ${index + 1}`}
                      className="w-full h-32 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removePhoto(index, 'after')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signatures - FULLY FIXED FOR MOBILE */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="w-5 h-5" />
              Signatures Obligatoires
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SignaturePad
              onSignature={setClientSignature}
              label="Signature du client *"
            />
            
            <SignaturePad
              onSignature={setTeamLeadSignature}
              label="Signature du chef d'équipe *"
            />
          </CardContent>
        </Card>

        {/* Issues and Notes */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Problèmes et Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="issuesEncountered">Problèmes rencontrés</Label>
              <Textarea
                id="issuesEncountered"
                value={formData.issuesEncountered}
                onChange={handleChange}
                rows={3}
                placeholder="Décrivez les difficultés ou problèmes rencontrés..."
              />
            </div>

            <div>
              <Label htmlFor="additionalNotes">Notes supplémentaires</Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={handleChange}
                rows={3}
                placeholder="Toute information supplémentaire pertinente..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Section */}
        <div className="flex justify-end gap-4 pb-6">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || !formData.missionId || !formData.hoursWorked || !clientSignature || !teamLeadSignature}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Création en cours...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Créer le Rapport
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}