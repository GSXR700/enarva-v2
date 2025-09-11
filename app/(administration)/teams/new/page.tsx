// app/(administration)/teams/new/page.tsx - COMPLETE FIXED VERSION
'use client';

import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, ArrowLeft, UserPlus, Trash2 } from 'lucide-react';
import { UserRole, TeamSpecialty, ExperienceLevel, TeamAvailability } from '@prisma/client';

// --- Dictionnaires de traduction en français ---
const userRoleTranslations: { [key in UserRole]: string } = {
  [UserRole.ADMIN]: 'Administrateur',
  [UserRole.MANAGER]: 'Manager',
  [UserRole.AGENT]: 'Agent',
  [UserRole.TEAM_LEADER]: 'Chef d\'équipe',
  [UserRole.TECHNICIAN]: 'Technicien',
};

const experienceLevelTranslations: { [key in ExperienceLevel]: string } = {
  [ExperienceLevel.JUNIOR]: 'Junior',
  [ExperienceLevel.INTERMEDIATE]: 'Intermédiaire',
  [ExperienceLevel.SENIOR]: 'Senior',
  [ExperienceLevel.EXPERT]: 'Expert',
};

const teamAvailabilityTranslations: { [key in TeamAvailability]: string } = {
  [TeamAvailability.AVAILABLE]: 'Disponible',
  [TeamAvailability.BUSY]: 'Occupé',
  [TeamAvailability.OFF_DUTY]: 'En repos',
  [TeamAvailability.VACATION]: 'En congé',
};

const teamSpecialtyTranslations: { [key in TeamSpecialty]: string } = {
  [TeamSpecialty.GENERAL_CLEANING]: 'Nettoyage général',
  [TeamSpecialty.WINDOW_SPECIALIST]: 'Spécialiste vitres',
  [TeamSpecialty.FLOOR_SPECIALIST]: 'Spécialiste sols',
  [TeamSpecialty.LUXURY_SURFACES]: 'Surfaces de luxe',
  [TeamSpecialty.EQUIPMENT_HANDLING]: 'Manipulation d\'équipement',
  [TeamSpecialty.TEAM_MANAGEMENT]: 'Gestion d\'équipe',
  [TeamSpecialty.QUALITY_CONTROL]: 'Contrôle qualité',
  [TeamSpecialty.DETAIL_FINISHING]: 'Finitions détaillées',
};

// --- FIXED Validation Schemas ---
const teamMemberSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  role: z.nativeEnum(UserRole),
  specialties: z.array(z.nativeEnum(TeamSpecialty)).default([]),
  experience: z.nativeEnum(ExperienceLevel),
  availability: z.nativeEnum(TeamAvailability).default(TeamAvailability.AVAILABLE),
  hourlyRate: z.number().min(0, 'Le taux horaire doit être positif').optional(),
});

const teamSchema = z.object({
  name: z.string().min(2, 'Le nom de l\'équipe doit contenir au moins 2 caractères'),
  description: z.string().optional(),
  members: z.array(teamMemberSchema).optional(),
});

type TeamFormValues = z.infer<typeof teamSchema>;

export default function NewTeamPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      members: [
        {
          name: '',
          email: '',
          password: '',
          role: UserRole.TECHNICIAN,
          specialties: [],
          experience: ExperienceLevel.JUNIOR,
          availability: TeamAvailability.AVAILABLE,
          hourlyRate: undefined,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'members',
  });

  const onSubmit = async (data: TeamFormValues) => {
    setIsLoading(true);
    try {
      // First, create the team
      const teamResponse = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description || '',
        }),
      });

      if (!teamResponse.ok) {
        throw new Error('Échec de la création de l\'équipe');
      }

      const newTeam = await teamResponse.json();
      toast.success(`Équipe "${data.name}" créée avec succès!`);

      // Then, create team members if any
      if (data.members && data.members.length > 0) {
        for (const member of data.members) {
          if (member.name && member.email && member.password) {
            const memberResponse = await fetch('/api/team-members', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...member,
                teamId: newTeam.id,
                hourlyRate: member.hourlyRate || null,
              }),
            });

            if (!memberResponse.ok) {
              const errorData = await memberResponse.json();
              throw new Error(`Échec de l'ajout du membre ${member.name}: ${errorData.message || 'Erreur inconnue'}`);
            }
            toast.success(`Membre ${member.name} ajouté avec succès!`);
          }
        }
      }

      router.push('/teams');
    } catch (error: any) {
      toast.error(error.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/teams')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Nouvelle Équipe</h1>
          <p className="text-muted-foreground mt-1">Créez une nouvelle équipe et ajoutez des membres</p>
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
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Membres de l'Équipe</CardTitle>
            <CardDescription>Ajoutez des membres à votre équipe. Vous pouvez créer plusieurs comptes en une fois.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Membre {index + 1}</h4>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom complet *</Label>
                    <Input {...register(`members.${index}.name`)} placeholder="Nom et prénom" />
                    {errors.members?.[index]?.name && <p className="text-red-500 text-sm mt-1">{errors.members[index]?.name?.message}</p>}
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" {...register(`members.${index}.email`)} placeholder="email@example.com" />
                    {errors.members?.[index]?.email && <p className="text-red-500 text-sm mt-1">{errors.members[index]?.email?.message}</p>}
                  </div>
                  <div>
                    <Label>Mot de passe *</Label>
                    <Input type="password" {...register(`members.${index}.password`)} placeholder="Minimum 8 caractères" />
                    {errors.members?.[index]?.password && <p className="text-red-500 text-sm mt-1">{errors.members[index]?.password?.message}</p>}
                  </div>
                  <div>
                    <Label>Rôle *</Label>
                    <Controller
                      name={`members.${index}.role`}
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un rôle" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(userRoleTranslations).map(([role, translation]) => (
                              <SelectItem key={role} value={role}>{translation}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.members?.[index]?.role && <p className="text-red-500 text-sm mt-1">{errors.members[index]?.role?.message}</p>}
                  </div>
                  <div>
                    <Label>Niveau d'expérience *</Label>
                    <Controller
                      name={`members.${index}.experience`}
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Niveau d'expérience" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(experienceLevelTranslations).map(([level, translation]) => (
                              <SelectItem key={level} value={level}>{translation}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.members?.[index]?.experience && <p className="text-red-500 text-sm mt-1">{errors.members[index]?.experience?.message}</p>}
                  </div>
                  <div>
                    <Label>Disponibilité</Label>
                    <Controller
                      name={`members.${index}.availability`}
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Statut de disponibilité" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(teamAvailabilityTranslations).map(([status, translation]) => (
                              <SelectItem key={status} value={status}>{translation}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Taux horaire (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`members.${index}.hourlyRate`, { valueAsNumber: true })}
                      placeholder="15.00"
                    />
                    {errors.members?.[index]?.hourlyRate && <p className="text-red-500 text-sm mt-1">{errors.members[index]?.hourlyRate?.message}</p>}
                  </div>
                </div>

                {/* Specialties */}
                <div>
                  <Label>Spécialités</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {Object.entries(teamSpecialtyTranslations).map(([specialty, translation]) => (
                      <div key={specialty} className="flex items-center space-x-2">
                        <Checkbox
                          id={`member-${index}-specialty-${specialty}`}
                          checked={watch(`members.${index}.specialties`)?.includes(specialty as TeamSpecialty) || false}
                          onCheckedChange={(checked) => {
                            const currentSpecialties = watch(`members.${index}.specialties`) || [];
                            if (checked) {
                              setValue(`members.${index}.specialties`, [...currentSpecialties, specialty as TeamSpecialty]);
                            } else {
                              setValue(`members.${index}.specialties`, currentSpecialties.filter(s => s !== specialty));
                            }
                          }}
                        />
                        <Label htmlFor={`member-${index}-specialty-${specialty}`} className="text-sm">
                          {translation}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({
                  name: '',
                  email: '',
                  password: '',
                  role: UserRole.TECHNICIAN,
                  specialties: [],
                  experience: ExperienceLevel.JUNIOR,
                  availability: TeamAvailability.AVAILABLE,
                  hourlyRate: undefined,
                })
              }
              className="mt-4"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Ajouter un autre membre
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push('/teams')}>
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Créer l'Équipe
          </Button>
        </div>
      </form>
    </div>
  );
}