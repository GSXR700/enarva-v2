// app/(administration)/analytics/page.tsx - ENHANCED APPLE-STYLE DESIGN
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, DollarSign, CheckSquare, BarChart3, PieChart, Activity } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { PageSkeleton } from '@/components/skeletons/PageSkeleton'
import { motion } from 'framer-motion'

type AnalyticsStats = {
  totalLeads: number
  conversionRate: string
  totalRevenue: number
  completedMissions: number
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/analytics/stats')
        if (!response.ok) throw new Error('Impossible de charger les statistiques.')
        const data = await response.json()
        setStats(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (isLoading) {
    return <PageSkeleton showHeader showStats statsCount={4} showCards cardsCount={3} />
  }

  if (error) {
    return (
      <div className="main-content">
        <div className="apple-card p-8 text-center">
          <div className="text-destructive font-medium">Erreur: {error}</div>
        </div>
      </div>
    )
  }

  const statsCards = [
    {
      title: 'Total des Leads',
      value: stats?.totalLeads.toString() || '0',
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Missions Terminées',
      value: stats?.completedMissions.toString() || '0',
      icon: CheckSquare,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: "Chiffre d'Affaires Total",
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      title: 'Taux de Conversion',
      value: `${stats?.conversionRate || '0'}%`,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
  ]

  const chartCards = [
    {
      title: 'Évolution des Revenus',
      icon: BarChart3,
      description: 'Analyse mensuelle du chiffre d\'affaires'
    },
    {
      title: 'Répartition des Leads',
      icon: PieChart,
      description: 'Distribution par source et statut'
    },
    {
      title: 'Performance des Équipes',
      icon: Activity,
      description: 'Taux de complétion et qualité'
    }
  ]

  return (
    <div className="main-content space-y-6 animate-fade-in">
      {/* Page Header - Apple Style */}
      <div className="page-header">
        <h1 className="page-title">Analytics & Rapports</h1>
        <p className="page-subtitle">
          Analyse approfondie des performances de votre entreprise
        </p>
      </div>

      {/* Stats Cards - Apple Style with animations */}
      <div className="responsive-grid">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, type: 'spring', stiffness: 300 }}
            >
              <Card className="apple-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Charts Section - Apple Style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {chartCards.map((chart, index) => {
          const Icon = chart.icon
          return (
            <motion.div
              key={chart.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1, type: 'spring', stiffness: 300 }}
            >
              <Card className="apple-card h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{chart.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {chart.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-muted rounded-full mx-auto flex items-center justify-center">
                      <Icon className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Graphique à venir
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Detailed Analytics Section */}
      <Card className="apple-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Analyses Détaillées
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-muted rounded-full mx-auto flex items-center justify-center mb-4">
              <BarChart3 className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Tableaux de bord Power BI</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Des visualisations interactives et des rapports détaillés seront bientôt disponibles 
              pour vous aider à prendre des décisions éclairées.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}