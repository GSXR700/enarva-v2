// app/(administration)/analytics/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, DollarSign, CheckSquare } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton' // Re-using for similar layout

type AnalyticsStats = {
  totalLeads: number;
  conversionRate: string;
  totalRevenue: number;
  completedMissions: number;
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/analytics/stats');
        if (!response.ok) throw new Error('Impossible de charger les statistiques.');
        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <div className="main-content text-center p-10 text-red-500">Erreur: {error}</div>;
  }
  
  const statsCards = [
      { title: 'Total des Leads', value: stats?.totalLeads.toString() || '0', icon: Users },
      { title: 'Missions Terminées', value: stats?.completedMissions.toString() || '0', icon: CheckSquare },
      { title: 'Chiffre d\'Affaires Total', value: formatCurrency(stats?.totalRevenue || 0), icon: DollarSign },
      { title: 'Taux de Conversion', value: `${stats?.conversionRate || '0'}%`, icon: TrendingUp },
  ];

  return (
    <div className="main-content space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Analytics & Rapports</h1>
        <p className="text-muted-foreground mt-1">Analyse des performances de votre entreprise.</p>
      </div>

      <div className="responsive-grid">
        {statsCards.map((stat) => {
            const Icon = stat.icon;
            return (
                <Card key={stat.title} className="thread-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                        <Icon className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-enarva-start">{stat.value}</div>
                    </CardContent>
                </Card>
            )
        })}
      </div>
      
       <Card className="thread-card">
        <CardHeader><CardTitle>Performances à venir</CardTitle></CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground">Des graphiques sur les revenus et les leads seront affichés ici.</p>
        </CardContent>
      </Card>
    </div>
  )
}