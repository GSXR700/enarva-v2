// app/(administration)/field-reports/new/page.tsx - ENHANCED WITH INVENTORY SELECTOR
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, Camera, Save, Trash2, PenTool, RotateCcw, Check, Plus, Minus, Package, Search, X, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

// ========== SIGNATURE PAD COMPONENT (UNCHANGED) ==========
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

    const updateCanvasSize = () => {
      const container = containerRef.current
      if (!container) return

      const containerWidth = container.clientWidth - 32
      const width = Math.min(containerWidth, 600)
      const height = 200

      canvas.width = width
      canvas.height = height

      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (existingSignature && hasSignature) {
        const img = new Image()
        img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        img.src = existingSignature
      }
    }

    updateCanvasSize()

    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [existingSignature, hasSignature])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      if (!touch) return { x: 0, y: 0 }
      
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      }
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
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
    e.preventDefault()
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
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
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

// ========== INVENTORY SELECTOR COMPONENT (NEW) ==========
interface InventoryItem {
  id: string
  name: string
  category: string
  unit: string
  currentStock: number | string
}

interface SelectedMaterial {
  itemId: string
  name: string
  quantity: number
  unit: string
}

interface InventorySelectorProps {
  selectedMaterials: SelectedMaterial[]
  onMaterialsChange: (materials: SelectedMaterial[]) => void
}

const InventorySelector: React.FC<InventorySelectorProps> = ({ selectedMaterials, onMaterialsChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(false)

  const categoryTranslations: Record<string, string> = {
    'CLEANING_PRODUCTS': 'Produits',
    'EQUIPMENT': 'Équipement',
    'CONSUMABLES': 'Consommables',
    'PROTECTIVE_GEAR': 'Protection'
  }

  const categoryColors: Record<string, string> = {
    'CLEANING_PRODUCTS': 'bg-blue-100 text-blue-800',
    'EQUIPMENT': 'bg-purple-100 text-purple-800',
    'CONSUMABLES': 'bg-green-100 text-green-800',
    'PROTECTIVE_GEAR': 'bg-orange-100 text-orange-800'
  }

  useEffect(() => {
    if (isOpen) {
      fetchInventory()
    }
  }, [isOpen])

  const fetchInventory = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/inventory')
      if (!response.ok) throw new Error('Failed to fetch inventory')
      const data = await response.json()
      const items = Array.isArray(data) ? data : (data.items || [])
      setInventory(items.filter((item: InventoryItem) => Number(item.currentStock) > 0))
    } catch (error) {
      toast.error('Erreur lors du chargement de l\'inventaire')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const addMaterial = (item: InventoryItem) => {
    const existing = selectedMaterials.find(m => m.itemId === item.id)
    if (existing) {
      toast.info('Cet article est déjà ajouté')
      return
    }
    
    const newMaterial: SelectedMaterial = {
      itemId: item.id,
      name: item.name,
      quantity: 1,
      unit: item.unit
    }
    
    onMaterialsChange([...selectedMaterials, newMaterial])
    toast.success(`${item.name} ajouté`)
  }

  const updateQuantity = (itemId: string, change: number) => {
    const updated = selectedMaterials.map(m => {
      if (m.itemId === itemId) {
        const newQty = Math.max(0, m.quantity + change)
        return { ...m, quantity: newQty }
      }
      return m
    }).filter(m => m.quantity > 0)
    
    onMaterialsChange(updated)
  }

  const removeMaterial = (itemId: string) => {
    onMaterialsChange(selectedMaterials.filter(m => m.itemId !== itemId))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Matériaux et Équipements Utilisés</Label>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] p-0">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Sélectionner depuis l'Inventaire
              </DialogTitle>
            </DialogHeader>
            
            <div className="px-6 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un article..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                <Button
                  type="button"
                  variant={categoryFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter('all')}
                >
                  Tous
                </Button>
                {Object.entries(categoryTranslations).map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    variant={categoryFilter === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Inventory List */}
            <ScrollArea className="h-[400px] px-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredInventory.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Aucun article disponible</p>
                </div>
              ) : (
                <div className="grid gap-3 pb-6">
                  {filteredInventory.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{item.name}</h4>
                          <Badge variant="outline" className={categoryColors[item.category]}>
                            {categoryTranslations[item.category]}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          Stock: {item.currentStock} {item.unit}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => addMaterial(item)}
                        disabled={selectedMaterials.some(m => m.itemId === item.id)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="p-6 pt-4 border-t">
              <Button type="button" onClick={() => setIsOpen(false)} className="w-full">
                Fermer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selected Materials */}
      {selectedMaterials.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Package className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Aucun matériel sélectionné</p>
          <p className="text-xs text-gray-400 mt-1">Cliquez sur "Ajouter" pour sélectionner depuis l'inventaire</p>
        </div>
      ) : (
        <div className="space-y-2">
          {selectedMaterials.map(material => (
            <div key={material.itemId} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{material.name}</p>
                <p className="text-xs text-gray-500">{material.unit}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(material.itemId, -1)}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-12 text-center font-medium">{material.quantity}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(material.itemId, 1)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-600"
                  onClick={() => removeMaterial(material.itemId)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ========== MAIN COMPONENT ==========
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
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([])

  const [formData, setFormData] = useState({
    missionId: '',
    hoursWorked: '',
    generalObservations: '',
    clientFeedback: '',
    issuesEncountered: '',
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
      const missions = Array.isArray(data) ? data : (data.missions || [])
      setMissions(missions)
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
      const beforePhotosUrls = beforePhotos.length > 0 ? await uploadPhotos(beforePhotos) : []
      const afterPhotosUrls = afterPhotos.length > 0 ? await uploadPhotos(afterPhotos) : []
      
      const clientSignatureUrl = await uploadSignature(clientSignature)
      const teamLeadSignatureUrl = await uploadSignature(teamLeadSignature)

      // Convert selected materials to JSON format
      const materialsUsed = selectedMaterials.reduce((acc, material) => {
        acc[material.name] = `${material.quantity} ${material.unit}`
        return acc
      }, {} as Record<string, string>)

      const reportData = {
        ...formData,
        hoursWorked: parseFloat(formData.hoursWorked),
        materialsUsed: Object.keys(materialsUsed).length > 0 ? materialsUsed : null,
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

  const triggerFileInput = (inputId: string) => {
    document.getElementById(inputId)?.click()
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

            {/* ENHANCED: Inventory Selector instead of JSON */}
            <InventorySelector
              selectedMaterials={selectedMaterials}
              onMaterialsChange={setSelectedMaterials}
            />
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

        {/* ENHANCED: Photos Section */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Photos de la Mission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Before Photos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Photos Avant</Label>
                <Badge variant="outline">{beforePhotos.length}</Badge>
              </div>
              
              <input
                id="before-photos-input"
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={(e) => handlePhotoUpload(e, 'before')}
                className="hidden"
              />
              
              <Button
                type="button"
                variant="outline"
                className="w-full h-24 border-2 border-dashed hover:border-primary/50 transition-colors"
                onClick={() => triggerFileInput('before-photos-input')}
              >
                <div className="flex flex-col items-center gap-2">
                  <Camera className="w-8 h-8 text-gray-400" />
                  <span className="text-sm font-medium">Prendre ou Ajouter des Photos</span>
                  <span className="text-xs text-gray-500">Avant le travail</span>
                </div>
              </Button>
              
              {beforePhotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  {beforePhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Avant ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removePhoto(index, 'before')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Badge className="absolute top-2 left-2 bg-blue-600 text-white">
                        {index + 1}
                      </Badge>
                      </div>
                  ))}
                </div>
              )}
            </div>

            {/* After Photos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Photos Après</Label>
                <Badge variant="outline">{afterPhotos.length}</Badge>
              </div>
              
              <input
                id="after-photos-input"
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={(e) => handlePhotoUpload(e, 'after')}
                className="hidden"
              />
              
              <Button
                type="button"
                variant="outline"
                className="w-full h-24 border-2 border-dashed hover:border-primary/50 transition-colors"
                onClick={() => triggerFileInput('after-photos-input')}
              >
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                  <span className="text-sm font-medium">Prendre ou Ajouter des Photos</span>
                  <span className="text-xs text-gray-500">Après le travail</span>
                </div>
              </Button>
              
              {afterPhotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  {afterPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Après ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removePhoto(index, 'after')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Badge className="absolute top-2 left-2 bg-green-600 text-white">
                        {index + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Signatures - UNCHANGED (PERFECT) */}
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