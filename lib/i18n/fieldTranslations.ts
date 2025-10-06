// lib/i18n/fieldTranslations.ts
export type LanguageCode = 'fr' | 'ar';

export const fieldTranslations = {
  fr: {
    // Dashboard
    dashboard: {
      title: 'Tableau de Bord Terrain',
      welcome: 'Bienvenue',
      stats: {
        activeMissions: 'Missions Actives',
        completedToday: 'Terminées Aujourd\'hui',
        pendingTasks: 'Tâches en Attente',
        teamEfficiency: 'Efficacité Équipe'
      }
    },
    // Missions
    missions: {
      title: 'Mes Missions',
      myMissions: 'Mes Missions',
      allMissions: 'Toutes les Missions',
      noMissions: 'Aucune mission disponible',
      startMission: 'Démarrer la Mission',
      viewDetails: 'Voir Détails',
      address: 'Adresse',
      scheduledFor: 'Planifiée pour',
      progress: 'Progrès',
      tasks: 'Tâches',
      status: {
        SCHEDULED: 'Planifiée',
        IN_PROGRESS: 'En Cours',
        COMPLETED: 'Terminée',
        CANCELLED: 'Annulée',
        QUALITY_CHECK: 'Contrôle Qualité',
        CLIENT_VALIDATION: 'Validation Client',
        VALIDATED: 'Validée',
        REJECTED: 'Rejetée'
      },
      priority: {
        LOW: 'Basse',
        NORMAL: 'Normale',
        HIGH: 'Haute',
        CRITICAL: 'Critique'
      }
    },
    // Tasks
    tasks: {
      title: 'Tâches',
      myTasks: 'Mes Tâches',
      allTasks: 'Toutes les Tâches',
      noTasks: 'Aucune tâche',
      startTask: 'Démarrer',
      completeTask: 'Terminer',
      updateTime: 'Modifier le Temps',
      estimatedTime: 'Temps Estimé',
      actualTime: 'Temps Réel',
      assignedTo: 'Assignée à',
      notes: 'Notes',
      status: {
        ASSIGNED: 'Assignée',
        IN_PROGRESS: 'En Cours',
        COMPLETED: 'Terminée',
        VALIDATED: 'Validée',
        REJECTED: 'Rejetée',
        BLOCKED: 'Bloquée'
      },
      category: {
        GENERAL: 'Général',
        EXTERIOR_FACADE: 'Façade Extérieure',
        WALLS_BASEBOARDS: 'Murs et Plinthes',
        FLOORS: 'Sols',
        STAIRS: 'Escaliers',
        WINDOWS_JOINERY: 'Fenêtres et Menuiserie',
        KITCHEN: 'Cuisine',
        BATHROOM_SANITARY: 'Salle de Bain',
        LIVING_SPACES: 'Espaces de Vie',
        LOGISTICS_ACCESS: 'Logistique et Accès'
      }
    },
    // Common
    common: {
      loading: 'Chargement...',
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      view: 'Voir',
      back: 'Retour',
      confirm: 'Confirmer',
      close: 'Fermer',
      search: 'Rechercher',
      filter: 'Filtrer',
      actions: 'Actions',
      minutes: 'minutes',
      hours: 'heures',
      today: 'Aujourd\'hui',
      yesterday: 'Hier',
      thisWeek: 'Cette Semaine'
    },
    // Notifications
    notifications: {
      missionStarted: 'Mission démarrée avec succès',
      taskStarted: 'Tâche démarrée',
      taskCompleted: 'Tâche terminée',
      timeUpdated: 'Temps estimé mis à jour',
      error: 'Une erreur s\'est produite',
      success: 'Opération réussie'
    }
  },
  ar: {
    // Dashboard - Arabic
    dashboard: {
      title: 'لوحة القيادة الميدانية',
      welcome: 'مرحباً',
      stats: {
        activeMissions: 'المهام النشطة',
        completedToday: 'المنجزة اليوم',
        pendingTasks: 'المهام المعلقة',
        teamEfficiency: 'كفاءة الفريق'
      }
    },
    // Missions - Arabic
    missions: {
      title: 'مهامي',
      myMissions: 'مهامي',
      allMissions: 'جميع المهام',
      noMissions: 'لا توجد مهام متاحة',
      startMission: 'بدء المهمة',
      viewDetails: 'عرض التفاصيل',
      address: 'العنوان',
      scheduledFor: 'مجدولة لـ',
      progress: 'التقدم',
      tasks: 'المهام',
      status: {
        SCHEDULED: 'مجدولة',
        IN_PROGRESS: 'قيد التنفيذ',
        COMPLETED: 'مكتملة',
        CANCELLED: 'ملغاة',
        QUALITY_CHECK: 'فحص الجودة',
        CLIENT_VALIDATION: 'تأكيد العميل',
        VALIDATED: 'موثقة',
        REJECTED: 'مرفوضة'
      },
      priority: {
        LOW: 'منخفضة',
        NORMAL: 'عادية',
        HIGH: 'عالية',
        CRITICAL: 'حرجة'
      }
    },
    // Tasks - Arabic
    tasks: {
      title: 'المهام',
      myTasks: 'مهامي',
      allTasks: 'جميع المهام',
      noTasks: 'لا توجد مهام',
      startTask: 'بدء',
      completeTask: 'إنهاء',
      updateTime: 'تعديل الوقت',
      estimatedTime: 'الوقت المقدر',
      actualTime: 'الوقت الفعلي',
      assignedTo: 'مسندة إلى',
      notes: 'ملاحظات',
      status: {
        ASSIGNED: 'مسندة',
        IN_PROGRESS: 'قيد التنفيذ',
        COMPLETED: 'مكتملة',
        VALIDATED: 'موثقة',
        REJECTED: 'مرفوضة',
        BLOCKED: 'محظورة'
      },
      category: {
        GENERAL: 'عام',
        EXTERIOR_FACADE: 'الواجهة الخارجية',
        WALLS_BASEBOARDS: 'الجدران والألواح',
        FLOORS: 'الأرضيات',
        STAIRS: 'السلالم',
        WINDOWS_JOINERY: 'النوافذ والنجارة',
        KITCHEN: 'المطبخ',
        BATHROOM_SANITARY: 'الحمام والصرف الصحي',
        LIVING_SPACES: 'مساحات المعيشة',
        LOGISTICS_ACCESS: 'الخدمات اللوجستية والوصول'
      }
    },
    // Common - Arabic
    common: {
      loading: 'جاري التحميل...',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      view: 'عرض',
      back: 'رجوع',
      confirm: 'تأكيد',
      close: 'إغلاق',
      search: 'بحث',
      filter: 'تصفية',
      actions: 'إجراءات',
      minutes: 'دقائق',
      hours: 'ساعات',
      today: 'اليوم',
      yesterday: 'أمس',
      thisWeek: 'هذا الأسبوع'
    },
    // Notifications - Arabic
    notifications: {
      missionStarted: 'تم بدء المهمة بنجاح',
      taskStarted: 'تم بدء المهمة',
      taskCompleted: 'تم إنهاء المهمة',
      timeUpdated: 'تم تحديث الوقت المقدر',
      error: 'حدث خطأ',
      success: 'تمت العملية بنجاح'
    }
  }
} as const;

export type TranslationKey = keyof typeof fieldTranslations.fr;