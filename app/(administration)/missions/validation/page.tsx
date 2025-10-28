// app/(administration)/missions/validation/page.tsx - CORRECTED
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Star, 
  MapPin, 
  User,
  Camera,
  MessageSquare,
  Calendar,
  ThumbsUp
} from 'lucide-react'
import { Mission, Lead, Task, User as PrismaUser } from '@prisma/client'
import { formatDate, formatCurrency, translate } from '@/lib/utils'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton' // Import skeleton

type TaskWithDetails = Task & {
  beforePhotos?: string[];
  afterPhotos?: string[];
  clientApproved?: boolean;
  clientFeedback?: string;
};

// CORRECTED: teamLeader can be null
type MissionForValidation = Mission & {
  lead: Lead;
  teamLeader: PrismaUser | null; // <-- FIX: teamLeader is optional in schema
  tasks: TaskWithDetails[];
  quote?: { finalPrice: number | null }; // Allow finalPrice to be null
};

export default function MissionValidationPage() {
  const [missions, setMissions] = useState<MissionForValidation[]>([])
  const [selectedMission, setSelectedMission] = useState<MissionForValidation | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isValidating, setIsValidating] = useState(false)
  
  // Validation form data
  const [adminNotes, setAdminNotes] = useState('')
  const [qualityScore, setQualityScore] = useState<number>(8) // Default to a good score
  const [issuesFound, setIssuesFound] = useState('')
  const [correctionNeeded, setCorrectionNeeded] = useState(false)

  const fetchPendingMissions = useCallback(async () => {
    setIsLoading(true); // Set loading true at the start of fetch
    try {
      // Fetch missions with status QUALITY_CHECK or CLIENT_VALIDATION
      const response = await fetch('/api/missions?status=QUALITY_CHECK&status=CLIENT_VALIDATION')
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch missions');
      }
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data.data)) {
         setMissions(data.data); // Assuming API returns { data: [...] }
      } else if (Array.isArray(data)) {
         setMissions(data); // Fallback if API returns [...]
      } else {
         console.error("Fetched data is not an array:", data);
         setMissions([]); // Set to empty array on invalid data
      }

    } catch (error: any) {
      toast.error(`Impossible de charger les missions: ${error.message}`);
      setMissions([]); // Set to empty array on error
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPendingMissions()
  }, [fetchPendingMissions])

  const approveMission = async (missionId: string) => {
    setIsValidating(true)
    try {
      const response = await fetch(`/api/missions/${missionId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: true,
          adminNotes,
          qualityScore,
          status: 'COMPLETED' // Set status to COMPLETED on approval
        })
      })

      if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || 'Failed to approve mission');
      }
      
      toast.success('Mission approuvée avec succès!')
      setSelectedMission(null)
      setAdminNotes('')
      setQualityScore(8)
      setIssuesFound('') // Clear issues field
      setCorrectionNeeded(false) // Reset checkbox
      await fetchPendingMissions() // Refresh list
    } catch (error: any) {
      toast.error(`Impossible d'approuver la mission: ${error.message}`)
    } finally {
      setIsValidating(false)
    }
  }

  const rejectMission = async (missionId: string) => {
    if (!issuesFound.trim()) {
      toast.error('Veuillez spécifier les problèmes identifiés pour un rejet')
      return
    }

    setIsValidating(true)
    try {
      const response = await fetch(`/api/missions/${missionId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: false,
          adminNotes: adminNotes || 'Rejeté (voir problèmes)', // Ensure notes aren't empty
          qualityScore,
          issuesFound,
          correctionNeeded,
          // If correction is needed, send back to IN_PROGRESS
          // Otherwise, it stays in QUALITY_CHECK for review
          status: correctionNeeded ? 'IN_PROGRESS' : 'QUALITY_CHECK' 
        })
      })

      if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || 'Failed to reject mission');
      }
      
      toast.success('Mission rejetée. Équipe notifiée.')
      setSelectedMission(null)
      setAdminNotes('')
      setIssuesFound('')
      setCorrectionNeeded(false)
      setQualityScore(8)
      await fetchPendingMissions() // Refresh list
    } catch (error: any) {
      toast.error(`Impossible de rejeter la mission: ${error.message}`)
    } finally {
      setIsValidating(false)
    }
  }

  const getTaskCompletionStats = (mission: MissionForValidation) => {
    const total = mission.tasks?.length || 0; // Handle missing tasks array
    if (total === 0) return { total: 0, validated: 0, withPhotos: 0, clientApproved: 0 };
    
    const validated = mission.tasks.filter(t => t.status === 'VALIDATED').length
    const withPhotos = mission.tasks.filter(t => 
      (t.beforePhotos && t.beforePhotos.length > 0) || 
      (t.afterPhotos && t.afterPhotos.length > 0)
    ).length
    const clientApproved = mission.tasks.filter(t => t.clientApproved).length

    return { total, validated, withPhotos, clientApproved }
  }

  if (isLoading) {
    return (
        <div className="main-content p-6">
            <TableSkeleton 
                title="Validation des Missions"
                description="Chargement des missions en attente de validation..."
            />
        </div>
    )
  }

  return (
    <div className="main-content space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Validation des Missions</h1>
        <p className="text-muted-foreground mt-1">
          {missions.length} mission(s) en attente de validation administrative
        </p>
      </div>

      {missions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune mission en attente</h3>
            <p className="text-muted-foreground">
              Toutes les missions ont été validées!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {missions.map((mission) => {
            // Safety checks for mission object
            if (!mission || !mission.lead) {
                console.warn("Skipping rendering mission with missing data:", mission?.id);
                return null; // Don't render card if essential data is missing
            }
            
            const stats = getTaskCompletionStats(mission)
            const completionRate = (stats.total > 0) ? Math.round((stats.validated / stats.total) * 100) : 0;
            
            return (
              <Card key={mission.id} className="thread-card hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{mission.missionNumber}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {mission.lead.firstName} {mission.lead.lastName}
                      </p>
                    </div>
                    <Badge className={`px-2 py-1 text-xs font-medium ${
                      mission.status === 'QUALITY_CHECK' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {translate(mission.status)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Mission Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {/* CORRECTED: Use optional chaining and provide fallback */}
                      <span>Chef: {mission.teamLeader?.name ?? 'Non assigné'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{mission.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{formatDate(mission.scheduledDate)}</span>
                    </div>
                    {/* Corrected: Check quote and finalPrice existence */}
                    {mission.quote && mission.quote.finalPrice != null && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-enarva-start">
                          {formatCurrency(Number(mission.quote.finalPrice))}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Completion Stats */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tâches validées</span>
                      <span className="font-medium">{stats.validated}/{stats.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all" 
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Quality Indicators */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      <span>{stats.withPhotos} tâches avec photos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{stats.clientApproved} approuvées client</span>
                    </div>
                  </div>

                  {/* Client Feedback */}
                  {/* Cast to any to access fields not in official type (if they exist) */}
                  {(mission as any).clientRating && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">{(mission as any).clientRating}/5</span>
                      {(mission as any).clientFeedback && (
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  )}

                  <Button 
                    onClick={() => {
                        // Reset form fields when selecting a new mission
                        setAdminNotes(mission.adminNotes || '');
                        setQualityScore(mission.qualityScore || 8);
                        setIssuesFound(mission.issuesFound || '');
                        setCorrectionNeeded(mission.correctionRequired || false);
                        setSelectedMission(mission);
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Examiner & Valider
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Mission Validation Dialog */}
      {selectedMission && (
        <Dialog open={!!selectedMission} onOpenChange={() => setSelectedMission(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                Validation: {selectedMission.missionNumber}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Mission Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Aperçu de la Mission
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Client:</strong> {selectedMission.lead.firstName} {selectedMission.lead.lastName}</div>
                  {/* CORRECTED: Use optional chaining and provide fallback */}
                  <div><strong>Chef d'équipe:</strong> {selectedMission.teamLeader?.name ?? 'Non assigné'}</div>
                  <div><strong>Date:</strong> {formatDate(selectedMission.scheduledDate)}</div>
                  <div><strong>Adresse:</strong> {selectedMission.address}</div>
                  {/* Corrected: Check quote and finalPrice existence */}
                  {selectedMission.quote && selectedMission.quote.finalPrice != null && (
                    <div><strong>Montant:</strong> {formatCurrency(Number(selectedMission.quote.finalPrice))}</div>
                  )}
                </CardContent>
              </Card>

              {/* Tasks Review */}
              <Card>
                <CardHeader>
                  <CardTitle>Tâches Réalisées ({selectedMission.tasks?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Corrected: Add safety check for tasks array */}
                  {selectedMission.tasks && selectedMission.tasks.length > 0 ? (
                    selectedMission.tasks.map((task, index) => (
                      <div key={task.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">
                            {index + 1}. {task.title}
                          </h4>
                          <Badge className={`text-xs ${
                            task.status === 'VALIDATED' ? 'bg-green-100 text-green-800' :
                            task.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {translate(task.status)}
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-2">
                          {translate(task.category)}
                        </p>

                        {task.notes && (
                          <p className="text-sm mb-2">
                            <strong>Notes:</strong> {task.notes}
                          </p>
                        )}

                        {task.clientApproved && (
                          <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
                            <ThumbsUp className="w-4 h-4" />
                            <span>Approuvé par le client</span>
                          </div>
                        )}

                        {task.clientFeedback && (
                          <p className="text-sm mb-2">
                            <strong>Feedback client:</strong> {task.clientFeedback}
                          </p>
                        )}

                        <div className="flex gap-2">
                          {(task.beforePhotos && task.beforePhotos.length > 0) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedTask(task)}
                            >
                              <Camera className="w-3 h-3 mr-1" />
                              Photos avant ({task.beforePhotos.length})
                            </Button>
                          )}
                          {(task.afterPhotos && task.afterPhotos.length > 0) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedTask(task)}
                            >
                              <Camera className="w-3 h-3 mr-1" />
                              Photos après ({task.afterPhotos.length})
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                     <p className="text-sm text-muted-foreground text-center">Aucune tâche n'a été trouvée pour cette mission.</p>
                  )}
                </CardContent>
              </Card>

              {/* Validation Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Validation Administrative</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="qualityScore">Score Qualité (1-10)</Label>
                    <Input
                      id="qualityScore"
                      type="number"
                      min="1"
                      max="10"
                      value={qualityScore}
                      onChange={(e) => setQualityScore(Math.max(1, Math.min(10, Number(e.target.value))))} // Clamp value
                    />
                  </div>

                  <div>
                    <Label htmlFor="adminNotes">Notes Administratives</Label>
                    <Textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Commentaires sur la qualité, points d'amélioration..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="issuesFound">Problèmes Identifiés (pour rejet)</Label>
                    <Textarea
                      id="issuesFound"
                      value={issuesFound}
                      onChange={(e) => setIssuesFound(e.target.value)}
                      placeholder="Détaillez les problèmes qui nécessitent un rejet..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Using basic input checkbox, replace with shadcn Checkbox if available */}
                    <input
                      type="checkbox"
                      id="correctionNeeded"
                      checked={correctionNeeded}
                      onChange={(e) => setCorrectionNeeded(e.target.checked)}
                      className="form-checkbox h-4 w-4 text-primary"
                    />
                    <Label htmlFor="correctionNeeded" className="mb-0">Correction requise (retourner en 'En cours')</Label>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button
                      onClick={() => approveMission(selectedMission.id)}
                      disabled={isValidating}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {isValidating ? 'Validation...' : 'Approuver'}
                    </Button>
                    <Button
                      onClick={() => rejectMission(selectedMission.id)}
                      disabled={isValidating || !issuesFound.trim()}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {isValidating ? 'Rejet...' : 'Rejeter'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Task Photos Dialog */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Photos: {selectedTask.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1"> {/* Added scroll */}
              {selectedTask.beforePhotos && selectedTask.beforePhotos.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Photos Avant</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTask.beforePhotos.map((photo, index) => (
                      // Added Link to open image in new tab
                      <a href={photo} target="_blank" rel="noopener noreferrer" key={`before-${index}`}>
                        <img
                          src={photo}
                          alt={`Avant ${index + 1}`}
                          className="w-full h-40 object-cover rounded"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {selectedTask.afterPhotos && selectedTask.afterPhotos.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Photos Après</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTask.afterPhotos.map((photo, index) => (
                       <a href={photo} target="_blank" rel="noopener noreferrer" key={`after-${index}`}>
                          <img
                            key={index}
                            src={photo}
                            alt={`Après ${index + 1}`}
                            className="w-full h-40 object-cover rounded"
                          />
                       </a>
                    ))}
                  </div>
                </div>
              )}
               {(!selectedTask.beforePhotos || selectedTask.beforePhotos.length === 0) &&
                (!selectedTask.afterPhotos || selectedTask.afterPhotos.length === 0) && (
                   <p className="text-muted-foreground text-center">Aucune photo disponible pour cette tâche.</p>
               )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}