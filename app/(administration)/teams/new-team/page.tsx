// app/(administration)/teams/new-team/page.tsx - PAGE DE CRÉATION D'ÉQUIPE COMPLÈTE
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Save, ArrowLeft, Users, Shield, UserPlus } from 'lucide-react';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  onlineStatus: string;
}

// Validation schema
const teamSchema = z.object({
  name: z.string().min(2, 'Le nom de l\'équipe doit contenir au moins 2 caractères'),
  description: z.string().optional(),
  memberIds: z.array(z.string()).min(1, 'Sélectionnez au moins un membre pour l\'équipe'),
});

type TeamFormValues = z.infer<typeof teamSchema>;

export default function NewTeamPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      memberIds: [],
    },
  });

  // Fetch available users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const users = await response.json();
          setAvailableUsers(users);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Erreur lors du chargement des utilisateurs');
      }
    };

    fetchUsers();
  }, []);

  // Handle member selection
  const handleMemberToggle = (userId: string, checked: boolean) => {
    let newSelectedMembers;
    if (checked) {
      newSelectedMembers = [...selectedMembers, userId];
    } else {
      newSelectedMembers = selectedMembers.filter(id => id !== userId);
    }
    
    setSelectedMembers(newSelectedMembers);
    setValue('memberIds', newSelectedMembers);
  };

  // Submit handler
  const onSubmit = async (data: TeamFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          memberIds: data.memberIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Erreur lors de la création de l\'équipe');
      }

      await response.json();
      toast.success('Équipe créée avec succès !');
      router.push('/teams');
      router.refresh();

    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    const roleConfig = {
      'TEAM_LEADER': { color: 'bg-purple-100 text-purple-800', label: 'Chef d\'équipe' },
      'TECHNICIAN': { color: 'bg-blue-100 text-blue-800', label: 'Technicien' },
      'ADMIN': { color: 'bg-red-100 text-red-800', label: 'Admin' },
      'MANAGER': { color: 'bg-orange-100 text-orange-800', label: 'Manager' },
      'AGENT': { color: 'bg-cyan-100 text-cyan-800', label: 'Agent' },
    };

    const config = roleConfig[role as keyof typeof roleConfig] || { color: 'bg-gray-100 text-gray-800', label: role };
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'TEAM_LEADER': 
        return <Shield className="w-4 h-4 text-purple-600" />;
      case 'TECHNICIAN': 
        return <Users className="w-4 h-4 text-blue-600" />;
      default: 
        return <UserPlus className="w-4 h-4 text-gray-600" />;
    }
  };

  // Group users by role for better organization
  const usersByRole = availableUsers.reduce((acc, user) => {
    const role = user.role;
    if (!acc[role]) {
      acc[role] = [];
    }
    // TypeScript is now certain acc[role] is an array
    acc[role].push(user);
    return acc;
  }, {} as Record<string, User[]>);

  // Role order for display
  const roleOrder = ['TEAM_LEADER', 'MANAGER', 'AGENT', 'TECHNICIAN', 'ADMIN'];
  const sortedRoles = roleOrder.filter(role => usersByRole[role]);

  return (
    <div className="main-content space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/teams')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Nouvelle Équipe</h1>
          <p className="text-muted-foreground mt-1">Créez une nouvelle équipe et sélectionnez ses membres</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Team Information */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Informations de l'Équipe</CardTitle>
            <CardDescription>Définissez les détails de base de votre équipe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nom de l'équipe *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Ex: Équipe Nettoyage Résidentiel"
                className="mt-1"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Description de l'équipe et de ses responsabilités..."
                rows={3}
                className="mt-1"
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Member Selection */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Sélection des Membres</CardTitle>
            <CardDescription>
              Choisissez les utilisateurs qui feront partie de cette équipe. 
              Au moins un chef d'équipe est recommandé.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedMembers.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  Membres sélectionnés ({selectedMembers.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map(memberId => {
                    const user = availableUsers.find(u => u.id === memberId);
                    return user ? (
                      <div key={user.id} className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={user.image} alt={user.name} />
                          <AvatarFallback className="text-xs">{user.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.name}</span>
                        {getRoleBadge(user.role)}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {availableUsers.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Aucun utilisateur disponible</p>
                <p className="text-sm text-gray-400">Créez d'abord des utilisateurs pour former une équipe</p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedRoles.map((role) => {
                  const usersInRole = usersByRole[role];
                  if (!usersInRole) return null; // Safety check

                  return (
                    <div key={role} className="space-y-3">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        {getRoleIcon(role)}
                        {role === 'TEAM_LEADER' ? 'Chefs d\'équipe' :
                        role === 'MANAGER' ? 'Managers' :
                        role === 'AGENT' ? 'Agents' :
                        role === 'TECHNICIAN' ? 'Techniciens' :
                        role === 'ADMIN' ? 'Administrateurs' : role}
                        <Badge variant="outline">{usersInRole.length}</Badge>
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {usersInRole.map((user) => (
                          <div
                            key={user.id}
                            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedMembers.includes(user.id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Checkbox
                              checked={selectedMembers.includes(user.id)}
                              onCheckedChange={(checked) => handleMemberToggle(user.id, !!checked)}
                              className="mr-3"
                            />
                            
                            <Avatar className="w-10 h-10 mr-3">
                              <AvatarImage src={user.image} alt={user.name} />
                              <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h5 className="font-medium text-gray-900 truncate">{user.name}</h5>
                                <div className={`w-2 h-2 rounded-full ${
                                  user.onlineStatus === 'ONLINE' ? 'bg-green-500' : 'bg-gray-400'
                                }`} />
                              </div>
                              <p className="text-sm text-gray-500 truncate">{user.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {getRoleBadge(user.role)}
                                <span className="text-xs text-gray-400">
                                  {user.onlineStatus === 'ONLINE' ? 'En ligne' : 'Hors ligne'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {errors.memberIds && (
              <p className="text-red-500 text-sm">{errors.memberIds.message}</p>
            )}

            {/* Summary and Recommendations */}
            {selectedMembers.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <h4 className="font-medium text-gray-900">Recommandations</h4>
                {!selectedMembers.some(id => {
                  const user = availableUsers.find(u => u.id === id);
                  return user?.role === 'TEAM_LEADER';
                }) && (
                  <div className="flex items-center gap-2 text-amber-700">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm">
                      Il est recommandé d'avoir au moins un chef d'équipe pour diriger cette équipe.
                    </span>
                  </div>
                )}
                
                {selectedMembers.length > 10 && (
                  <div className="flex items-center gap-2 text-blue-700">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">
                      Cette équipe compte {selectedMembers.length} membres. 
                      Considérez diviser en plusieurs équipes plus petites pour une meilleure gestion.
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/teams')}
            disabled={isLoading}
          >
            Annuler
          </Button>
          
          <Button 
            type="submit" 
            disabled={isLoading || selectedMembers.length === 0}
            className="bg-enarva-gradient"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Créer l'Équipe
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}