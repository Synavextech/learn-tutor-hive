import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock, User, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';

interface Session {
  id: string;
  title: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  learner_id: string;
  tutor_id: string;
  subject: {
    name: string;
  };
  learner_profile?: {
    first_name: string;
    last_name: string;
  };
  tutor_profile?: {
    first_name: string;
    last_name: string;
  };
}

const Calendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      // Fetch sessions where user is learner
      const { data: learnerSessions, error: learnerError } = await supabase
        .from('tutoring_sessions')
        .select(`
          *,
          subject:subjects(name),
          tutor:tutors!inner(user_id),
          tutor_profile:tutors(user_id, profiles!inner(first_name, last_name))
        `)
        .eq('learner_id', user!.id)
        .order('scheduled_start', { ascending: true });

      if (learnerError) throw learnerError;

      // Fetch sessions where user is tutor
      const { data: tutorData, error: tutorError } = await supabase
        .from('tutors')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      let tutorSessions: any[] = [];
      if (!tutorError && tutorData) {
        const { data, error } = await supabase
          .from('tutoring_sessions')
          .select(`
            *,
            subject:subjects(name),
            learner_profile:profiles!tutoring_sessions_learner_id_fkey(first_name, last_name)
          `)
          .eq('tutor_id', tutorData.id)
          .order('scheduled_start', { ascending: true });

        if (!error) {
          tutorSessions = data || [];
        }
      }

      // Combine sessions
      const allSessions = [...(learnerSessions || []), ...tutorSessions];
      const uniqueSessions = allSessions.filter((session, index, self) => 
        index === self.findIndex(s => s.id === session.id)
      );

      setSessions(uniqueSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar events.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentWeek);
    const end = endOfWeek(currentWeek);
    return eachDayOfInterval({ start, end });
  };

  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => 
      isSameDay(parseISO(session.scheduled_start), date)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'in_progress': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getOtherParticipant = (session: Session) => {
    if (session.learner_id === user?.id) {
      const tutor = session.tutor_profile;
      return tutor ? `${tutor.first_name || ''} ${tutor.last_name || ''}`.trim() || 'Tutor' : 'Tutor';
    } else {
      const learner = session.learner_profile;
      return learner ? `${learner.first_name || ''} ${learner.last_name || ''}`.trim() || 'Student' : 'Student';
    }
  };

  const weekDays = getWeekDays();
  const selectedDateSessions = getSessionsForDate(selectedDate);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage your tutoring sessions and schedule</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5" />
                  <span>{format(currentWeek, 'MMMM yyyy')}</span>
                </CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeek(new Date(currentWeek.setDate(currentWeek.getDate() - 7)))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeek(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeek(new Date(currentWeek.setDate(currentWeek.getDate() + 7)))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium p-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {weekDays.map(day => {
                  const daySessions = getSessionsForDate(day);
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        min-h-24 p-2 border rounded-lg cursor-pointer transition-colors
                        ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}
                        ${isToday && !isSelected ? 'border-primary' : ''}
                      `}
                    >
                      <div className="text-sm font-medium mb-1">
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {daySessions.slice(0, 2).map(session => (
                          <div
                            key={session.id}
                            className={`text-xs p-1 rounded text-white ${getStatusColor(session.status)}`}
                          >
                            {format(parseISO(session.scheduled_start), 'HH:mm')}
                          </div>
                        ))}
                        {daySessions.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{daySessions.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Daily Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>
                {format(selectedDate, 'EEEE, MMMM d')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateSessions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sessions scheduled</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateSessions.map(session => (
                    <div key={session.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{session.title}</h4>
                        <Badge className={`${getStatusColor(session.status)} text-white`}>
                          {session.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {format(parseISO(session.scheduled_start), 'HH:mm')} - {format(parseISO(session.scheduled_end), 'HH:mm')}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{getOtherParticipant(session)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span>{session.subject?.name}</span>
                      </div>
                      
                      {session.description && (
                        <p className="text-sm text-muted-foreground">
                          {session.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Calendar;