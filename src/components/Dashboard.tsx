import { useState, useEffect } from 'react';
import { TrendingUp, Clock, FileText, Calendar, BarChart3, Crown, Zap, AlertCircle } from 'lucide-react';
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

interface Subscription {
  plan_type: 'starter' | 'unlimited';
  minutes_quota: number | null;
  minutes_used_this_month: number;
  billing_cycle_end: string;
  is_active: boolean;
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
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Charger l'abonnement
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subData) {
        setSubscription(subData);
      }

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
      <div className="min-h-screen bg-gradient-to-br from-peach-50 via-white to-coral-50 flex items-center justify-center">
        <div className="text-cocoa-600">Chargement des statistiques...</div>
      </div>
    );
  }

  const minutesRemaining = subscription?.plan_type === 'starter' && subscription?.minutes_quota
    ? subscription.minutes_quota - subscription.minutes_used_this_month
    : null;

  const usagePercentage = subscription?.plan_type === 'starter' && subscription?.minutes_quota
    ? (subscription.minutes_used_this_month / subscription.minutes_quota) * 100
    : 0;

  const isNearLimit = subscription?.plan_type === 'starter' && usagePercentage >= 80;

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 via-white to-coral-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cocoa-900 mb-2">Tableau de bord</h1>
          <p className="text-cocoa-600">Vue d'ensemble de votre utilisation</p>
        </div>

        {/* Carte d'abonnement */}
        {subscription && (
          <div className={`mb-8 rounded-2xl shadow-xl border-2 p-6 ${
            subscription.plan_type === 'unlimited'
              ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-amber-300'
              : 'bg-gradient-to-br from-coral-50 via-peach-50 to-sunset-50 border-coral-300'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {subscription.plan_type === 'unlimited' ? (
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl shadow-lg">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                ) : (
                  <div className="p-3 bg-gradient-to-br from-coral-500 to-sunset-500 rounded-xl shadow-lg">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-cocoa-900">
                    {subscription.plan_type === 'unlimited' ? 'Formule Illimitée' : 'Formule Starter'}
                  </h2>
                  <p className="text-cocoa-600">
                    {subscription.plan_type === 'unlimited' ? '39€/mois' : '29€/mois - 600 minutes'}
                  </p>
                </div>
              </div>
              {isNearLimit && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-100 border border-red-300 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-semibold text-red-700">Quota bientôt atteint</span>
                </div>
              )}
            </div>

            {subscription.plan_type === 'starter' && subscription.minutes_quota && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-cocoa-700">Minutes utilisées ce mois</span>
                  <span className="text-lg font-bold text-coral-600">
                    {subscription.minutes_used_this_month} / {subscription.minutes_quota} min
                  </span>
                </div>
                <div className="w-full bg-coral-100 rounded-full h-4 shadow-inner">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 shadow-sm ${
                      isNearLimit
                        ? 'bg-gradient-to-r from-red-500 to-orange-500'
                        : 'bg-gradient-to-r from-coral-500 to-sunset-500'
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-cocoa-600">
                    {minutesRemaining !== null && minutesRemaining > 0
                      ? `${minutesRemaining} minutes restantes`
                      : 'Quota atteint'}
                  </span>
                  <span className="text-cocoa-500">
                    Renouvellement le {new Date(subscription.billing_cycle_end).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            )}

            {subscription.plan_type === 'unlimited' && (
              <div className="bg-white/50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6 text-amber-600" />
                  <div>
                    <p className="font-semibold text-cocoa-900">Réunions illimitées</p>
                    <p className="text-sm text-cocoa-600">
                      {subscription.minutes_used_this_month} minutes utilisées ce mois
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border-2 border-coral-200 p-6 hover:shadow-xl hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-coral-100 to-coral-50 rounded-xl">
                <FileText className="w-6 h-6 text-coral-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-cocoa-600">Total de réunions</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-coral-600 to-sunset-600 bg-clip-text text-transparent">{stats.totalMeetings}</p>
              <p className="text-xs text-cocoa-500">Depuis le début</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border-2 border-sunset-200 p-6 hover:shadow-xl hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-sunset-100 to-sunset-50 rounded-xl">
                <Clock className="w-6 h-6 text-sunset-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-cocoa-600">Minutes utilisées</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-sunset-600 to-coral-600 bg-clip-text text-transparent">{stats.totalMinutes}</p>
              <p className="text-xs text-cocoa-500">Au total</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border-2 border-peach-300 p-6 hover:shadow-xl hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-peach-100 to-peach-50 rounded-xl">
                <Calendar className="w-6 h-6 text-coral-600" />
              </div>
              <span className="text-xs font-medium text-coral-600 bg-coral-50 px-2 py-1 rounded-lg">Ce mois</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-cocoa-600">Réunions ce mois</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-coral-600 to-peach-600 bg-clip-text text-transparent">{stats.thisMonthMeetings}</p>
              <p className="text-xs text-cocoa-500">{stats.thisMonthMinutes} minutes</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border-2 border-coral-200 p-6 hover:shadow-xl hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-coral-100 to-sunset-50 rounded-xl">
                <BarChart3 className="w-6 h-6 text-sunset-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-cocoa-600">Durée moyenne</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-sunset-600 to-coral-600 bg-clip-text text-transparent">{stats.averageDuration}</p>
              <p className="text-xs text-cocoa-500">minutes par réunion</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border-2 border-coral-200 p-6">
            <h2 className="text-lg font-semibold text-cocoa-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-coral-600" />
              Activité récente (7 derniers jours)
            </h2>
            {stats.recentActivity.length === 0 ? (
              <p className="text-cocoa-500 text-center py-8">Aucune activité récente</p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-peach-50 to-coral-50 hover:from-coral-100 hover:to-sunset-100 transition-all border border-coral-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral-500 to-sunset-500 flex items-center justify-center shadow-md">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-cocoa-900">{formatDate(activity.date)}</p>
                        <p className="text-sm text-cocoa-600">{activity.meetings} réunion{activity.meetings > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl text-coral-600">{activity.minutes}</p>
                      <p className="text-xs text-cocoa-500">minutes</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg border-2 border-coral-200 p-6">
            <h2 className="text-lg font-semibold text-cocoa-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-coral-600" />
              Statistiques d'utilisation
            </h2>
            <div className="space-y-4">
              <div className="border-b border-coral-200 pb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-cocoa-600">Minutes ce mois</span>
                  <span className="text-sm font-bold text-coral-600">{stats.thisMonthMinutes} / {subscription?.monthly_minutes || 600} min</span>
                </div>
                <div className="w-full bg-coral-100 rounded-full h-3 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-coral-500 to-sunset-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${Math.min((stats.thisMonthMinutes / (subscription?.monthly_minutes || 600)) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-cocoa-500 mt-1">Facturation basée sur l'utilisation</p>
              </div>

              <div className="border-b border-coral-200 pb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-cocoa-600">Réunions ce mois</span>
                  <span className="text-sm font-bold text-sunset-600">{stats.thisMonthMeetings}</span>
                </div>
                <div className="w-full bg-sunset-100 rounded-full h-3 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-sunset-500 to-coral-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${stats.thisMonthMeetings > 0 ? Math.min((stats.thisMonthMeetings / Math.max(stats.thisMonthMeetings, 10)) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-cocoa-600">Durée moyenne</span>
                  <span className="text-sm font-bold text-peach-600">{stats.averageDuration} min</span>
                </div>
                <div className="w-full bg-peach-100 rounded-full h-3 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-peach-500 to-coral-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${Math.min((stats.averageDuration / 60) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-gradient-to-r from-coral-50 via-peach-50 to-sunset-50 border-2 border-coral-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-coral-500 to-sunset-500 rounded-xl shadow-md">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-cocoa-900 mb-1">Facturation à la minute</h3>
              <p className="text-sm text-cocoa-700 mb-2">
                Vous êtes facturé uniquement pour les minutes réellement utilisées.
                Ce mois-ci, vous avez utilisé <span className="font-bold text-coral-600">{stats.thisMonthMinutes} minutes</span>
                {stats.thisMonthMeetings > 0 && ` sur ${stats.thisMonthMeetings} réunion${stats.thisMonthMeetings > 1 ? 's' : ''}`}.
              </p>
              <p className="text-xs text-cocoa-600">
                Profitez d'une tarification transparente et flexible adaptée à vos besoins.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
