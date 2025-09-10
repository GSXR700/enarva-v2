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


// --- Validation Schemas ---
const teamMemberSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  role: z.nativeEnum(UserRole),
  specialties: z.array(z.nativeEnum(TeamSpecialty)).default([]),
  experience: z.nativeEnum(ExperienceLevel).default(ExperienceLevel.JUNIOR),
  availability: z.nativeEnum(TeamAvailability).default(TeamAvailability.AVAILABLE),
});

const teamSchema = z.object({
  name: z.string().min(2, 'Le nom de l\'équipe doit contenir au moins 2 caractères'),
  description: z.string().optional(),
  members: z.array(teamMemberSchema),
});

type TeamFormValues = z.infer<typeof teamSchema>;

// --- Component ---
const NewTeamPage = () => {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      description: '',
      members: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'members',
  });

  const onSubmit = async (data: TeamFormValues) => {
    setIsSaving(true);
    try {
      // Étape 1: Créer l'équipe pour obtenir un teamId
      const teamResponse = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, description: data.description }),
      });

      if (!teamResponse.ok) {
        throw new Error('La création de l\'équipe a échoué.');
      }

      const newTeam = await teamResponse.json();
      const teamId = newTeam.id;
      toast.success('Équipe créée avec succès !');

      // Étape 2: Créer chaque membre et les associer avec le nouveau teamId
      if (data.members && data.members.length > 0) {
        for (const member of data.members) {
          const memberResponse = await fetch('/api/team-members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...member,
              teamId: teamId,
            }),
          });
          
          if (!memberResponse.ok) {
             const errorData = await memberResponse.json();
             throw new Error(`Échec de l'ajout du membre ${member.name}: ${errorData.message}`);
          }
        }
        toast.success(`${data.members.length} membre(s) ajouté(s) à l'équipe.`);
      }

      router.push('/teams');
      router.refresh();

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux équipes
      </Button>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Créer une nouvelle équipe</CardTitle>
            <CardDescription>
              Commencez par donner un nom et une description à votre équipe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nom de l'équipe</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Ex: Équipe Alpha, Brigade de nettoyage"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description (Optionnel)</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Décrivez le but ou la spécialité de l'équipe."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ajouter des membres</CardTitle>
            <CardDescription>
              Ajoutez les premiers membres à cette nouvelle équipe. Vous pourrez en ajouter d'autres plus tard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg relative space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
                
                {/* Informations de base */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom complet</Label>
                    <Input {...register(`members.${index}.name`)} />
                    {errors.members?.[index]?.name && <p className="text-red-500 text-sm mt-1">{errors.members[index]?.name?.message}</p>}
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" {...register(`members.${index}.email`)} />
                    {errors.members?.[index]?.email && <p className="text-red-500 text-sm mt-1">{errors.members[index]?.email?.message}</p>}
                  </div>
                  <div>
                    <Label>Mot de passe</Label>
                    <Input type="password" {...register(`members.${index}.password`)} />
                     {errors.members?.[index]?.password && <p className="text-red-500 text-sm mt-1">{errors.members[index]?.password?.message}</p>}
                  </div>
                  <div>
                    <Label>Rôle</Label>
                    <Controller
                      control={control}
                      name={`members.${index}.role`}
                      defaultValue={UserRole.TECHNICIAN}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(userRoleTranslations).map(([key, value]) => (
                              <SelectItem key={key} value={key}>{value}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                     {errors.members?.[index]?.role && <p className="text-red-500 text-sm mt-1">{errors.members[index]?.role?.message}</p>}
                  </div>
                </div>

                {/* Détails supplémentaires */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                        <Label>Niveau d'expérience</Label>
                        <Controller
                            control={control}
                            name={`members.${index}.experience`}
                            defaultValue={ExperienceLevel.JUNIOR}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Sélectionner un niveau" /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(experienceLevelTranslations).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>{value}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                    <div>
                        <Label>Disponibilité</Label>
                        <Controller
                            control={control}
                            name={`members.${index}.availability`}
                            defaultValue={TeamAvailability.AVAILABLE}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Sélectionner une disponibilité" /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(teamAvailabilityTranslations).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>{value}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                </div>
                
                <div>
                    <Label>Spécialités</Label>
                    <Controller
                        control={control}
                        name={`members.${index}.specialties`}
                        defaultValue={[]}
                        render={({ field }) => (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-md mt-2">
                                {Object.entries(teamSpecialtyTranslations).map(([key, value]) => (
                                    <div key={key} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`${field.name}-${key}`}
                                            checked={field.value?.includes(key as TeamSpecialty)}
                                            onCheckedChange={(checked) => {
                                                const currentValues = field.value || [];
                                                const keyAsSpecialty = key as TeamSpecialty;
                                                return checked
                                                    ? field.onChange([...currentValues, keyAsSpecialty])
                                                    : field.onChange(currentValues.filter(v => v !== keyAsSpecialty));
                                            }}
                                        />
                                        <label htmlFor={`${field.name}-${key}`} className="text-sm font-medium leading-none">
                                            {value}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ name: '', email: '', password: '', role: UserRole.TECHNICIAN, specialties: [], experience: ExperienceLevel.JUNIOR, availability: TeamAvailability.AVAILABLE })}
              className="mt-4"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Ajouter un membre
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push('/teams')}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Créer l'équipe
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewTeamPage;