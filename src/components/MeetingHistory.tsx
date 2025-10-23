import { Calendar, Clock, FileText, Trash2, Loader2, Search, X } from 'lucide-react';
import { Meeting } from '../lib/supabase';
import { useState, useMemo } from 'react';

interface MeetingHistoryProps {
  meetings: Meeting[];
  onDelete: (id: string) => void;
  onView: (meeting: Meeting) => void;
  isLoading?: boolean;
}

export const MeetingHistory = ({ meetings, onDelete, onView, isLoading = false }: MeetingHistoryProps) => {
  const [searchTitle, setSearchTitle] = useState('');
  const [searchDate, setSearchDate] = useState('');

  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      const matchesTitle = meeting.title.toLowerCase().includes(searchTitle.toLowerCase());

      let matchesDate = true;
      if (searchDate) {
        const meetingDate = new Date(meeting.created_at).toISOString().split('T')[0];
        matchesDate = meetingDate === searchDate;
      }

      return matchesTitle && matchesDate;
    });
  }, [meetings, searchTitle, searchDate]);
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 md:py-16">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-coral-100 to-sunset-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
          <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-coral-500 animate-spin" />
        </div>
        <p className="text-cocoa-600 text-base md:text-lg font-medium">Chargement des réunions...</p>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-12 md:py-16">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-coral-100 to-sunset-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
          <Calendar className="w-10 h-10 md:w-12 md:h-12 text-coral-500" />
        </div>
        <p className="text-cocoa-600 text-base md:text-lg font-medium">Aucune réunion enregistrée</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="bg-gradient-to-br from-white to-orange-50/30 border-2 border-orange-100 rounded-xl md:rounded-2xl p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Search className="w-5 h-5 text-coral-500" />
          <h3 className="font-bold text-cocoa-800 text-base md:text-lg">Filtres de recherche</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher par titre..."
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              className="w-full px-4 py-2.5 md:py-3 pr-10 border-2 border-orange-200 rounded-lg md:rounded-xl focus:outline-none focus:border-coral-400 focus:ring-2 focus:ring-coral-100 transition-all text-sm md:text-base"
            />
            {searchTitle && (
              <button
                onClick={() => setSearchTitle('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-400 hover:text-coral-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-full px-4 py-2.5 md:py-3 pr-10 border-2 border-orange-200 rounded-lg md:rounded-xl focus:outline-none focus:border-coral-400 focus:ring-2 focus:ring-coral-100 transition-all text-sm md:text-base"
            />
            {searchDate && (
              <button
                onClick={() => setSearchDate('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-400 hover:text-coral-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {(searchTitle || searchDate) && (
          <div className="mt-3 flex items-center justify-between text-sm text-cocoa-600">
            <span>
              {filteredMeetings.length} réunion{filteredMeetings.length !== 1 ? 's' : ''} trouvée{filteredMeetings.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => {
                setSearchTitle('');
                setSearchDate('');
              }}
              className="text-coral-500 hover:text-coral-600 font-medium transition-colors"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {filteredMeetings.length === 0 ? (
        <div className="text-center py-12 md:py-16">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-coral-100 to-sunset-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
            <Search className="w-10 h-10 md:w-12 md:h-12 text-coral-500" />
          </div>
          <p className="text-cocoa-600 text-base md:text-lg font-medium">Aucune réunion trouvée</p>
          <p className="text-cocoa-500 text-sm md:text-base mt-2">Essayez de modifier vos critères de recherche</p>
        </div>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {filteredMeetings.map((meeting) => (
        <div
          key={meeting.id}
          className="bg-gradient-to-br from-white to-orange-50/30 border-2 border-orange-100 rounded-xl md:rounded-2xl overflow-hidden hover:border-coral-300 hover:shadow-lg transition-all"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 md:p-5">
            <div
              className="flex items-center gap-3 md:gap-4 flex-1 min-w-0 cursor-pointer hover:bg-orange-50/50 transition-colors -m-4 md:-m-5 p-4 md:p-5 rounded-l-xl md:rounded-l-2xl w-full sm:w-auto"
              onClick={() => onView(meeting)}
            >
              <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-coral-500 to-sunset-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-cocoa-800 text-base md:text-lg truncate mb-1 md:mb-1.5">
                  {meeting.title}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-5">
                  <span className="text-xs md:text-sm text-cocoa-600 font-medium truncate">
                    {formatDate(meeting.created_at)}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs md:text-sm text-cocoa-600 font-medium">
                    <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-sunset-500" />
                    <span>{formatDuration(meeting.duration)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 sm:ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(meeting.id);
                }}
                className="p-2 md:p-2.5 text-cocoa-400 hover:text-coral-500 hover:bg-coral-50 rounded-lg md:rounded-xl transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
        </div>
      )}
    </div>
  );
};
