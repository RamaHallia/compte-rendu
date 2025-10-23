import { useState, useEffect } from 'react';
import { TrendingUp, Clock, FileText, Calendar, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalMeetings: number;
  totalMinutes: number;
  thisMonthMeetings: number;
  thisMonthMinutes: number;
  averageDuration: number;
  recentActivity: {
    date: string;
    meetings: number;
    minutes: number;
  }[];
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMeetings: 0,
    totalMinutes: 0,
    thisMonthMeetings: 0,
    thisMonthMinutes: 0,
    averageDuration: 0,
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: meetings, error } = await supabase
        .from('meetings')
        .select('duration, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!meetings || meetings.length === 0) {
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalMeetings = meetings.length;
      const totalSeconds = meetings.reduce((sum, m) => sum + (m.duration || 0), 0);
      const totalMinutes = Math.round(totalSeconds / 60);

      const thisMonthMeetings = meetings.filter(m =>
        new Date(m.created_at) >= startOfMonth
      );
      const thisMonthSeconds = thisMonthMeetings.reduce((sum, m) => sum + (m.duration || 0), 0);
      const thisMonthMinutes = Math.round(thisMonthSeconds / 60);

      const averageDuration = totalMeetings > 0 ? Math.round(totalSeconds / totalMeetings / 60) : 0;

      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentMeetings = meetings.filter(m => new Date(m.created_at) >= last7Days);

      const activityByDate = recentMeetings.reduce((acc, meeting) => {
        const date = new Date(meeting.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { meetings: 0, seconds: 0 };
        }
        acc[date].meetings += 1;
        acc[date].seconds += meeting.duration || 0;
        return acc;
      }, {} as Record<string, { meetings: number; seconds: number }>);

      const recentActivity = Object.entries(activityByDate)
        .map(([date, data]) => ({
          date,
          meetings: data.meetings,
          minutes: Math.round(data.seconds / 60)
        }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7);

      setStats({
        totalMeetings,
        totalMinutes,
        thisMonthMeetings: thisMonthMeetings.length,
        thisMonthMinutes,
        averageDuration,
        recentActivity
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Chargement des statistiques...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Tableau de bord</h1>
          <p className="text-slate-600">Vue d'ensemble de votre utilisation</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-600">Total de réunions</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalMeetings}</p>
              <p className="text-xs text-slate-500">Depuis le début</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <Clock className="w-6 h-6 text-emerald-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-600">Minutes utilisées</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalMinutes}</p>
              <p className="text-xs text-slate-500">Au total</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-violet-50 rounded-lg">
                <Calendar className="w-6 h-6 text-violet-600" />
              </div>
              <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-1 rounded">Ce mois</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-600">Réunions ce mois</p>
              <p className="text-3xl font-bold text-slate-900">{stats.thisMonthMeetings}</p>
              <p className="text-xs text-slate-500">{stats.thisMonthMinutes} minutes</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <BarChart3 className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-600">Durée moyenne</p>
              <p className="text-3xl font-bold text-slate-900">{stats.averageDuration}</p>
              <p className="text-xs text-slate-500">minutes par réunion</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-600" />
              Activité récente (7 derniers jours)
            </h2>
            {stats.recentActivity.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Aucune activité récente</p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{formatDate(activity.date)}</p>
                        <p className="text-sm text-slate-500">{activity.meetings} réunion{activity.meetings > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{activity.minutes}</p>
                      <p className="text-xs text-slate-500">minutes</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-slate-600" />
              Statistiques d'utilisation
            </h2>
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">Minutes ce mois</span>
                  <span className="text-sm font-semibold text-slate-900">{stats.thisMonthMinutes} min</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((stats.thisMonthMinutes / 1000) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Facturation basée sur l'utilisation</p>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">Réunions ce mois</span>
                  <span className="text-sm font-semibold text-slate-900">{stats.thisMonthMeetings}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((stats.thisMonthMeetings / 50) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">Durée moyenne</span>
                  <span className="text-sm font-semibold text-slate-900">{stats.averageDuration} min</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-violet-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((stats.averageDuration / 60) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Facturation à la minute</h3>
              <p className="text-sm text-blue-700 mb-2">
                Vous êtes facturé uniquement pour les minutes réellement utilisées.
                Ce mois-ci, vous avez utilisé <span className="font-semibold">{stats.thisMonthMinutes} minutes</span>
                {stats.thisMonthMeetings > 0 && ` sur ${stats.thisMonthMeetings} réunion${stats.thisMonthMeetings > 1 ? 's' : ''}`}.
              </p>
              <p className="text-xs text-blue-600">
                Profitez d'une tarification transparente et flexible adaptée à vos besoins.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
