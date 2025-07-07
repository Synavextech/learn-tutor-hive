import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, User, BookOpen, MessageCircle, CheckCircle, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TeachingSession {
  id: string;
  title: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  rating: number | null;
  feedback: string | null;
  session_notes: string | null;
  learner_id: string;
  subject: {
    name: string;
    category: string;
  };
  learner_profile: {
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
  payment?: {
    status: string;
    amount: number;
  };
}

const TeachingSessions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      // First get the tutor ID
      const { data: tutorData, error: tutorError } = await supabase
        .from('tutors')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (tutorError) throw tutorError;

      // Fetch sessions
      const { data, error } = await supabase
        .from('tutoring_sessions')
        .select(`
          *,
          subject:subjects(name, category),
          learner_profile:profiles!tutoring_sessions_learner_id_fkey(first_name, last_name, avatar_url),
          payment:payments(status, amount)
        `)
        .eq('tutor_id', tutorData.id)
        .order('scheduled_start', { ascending: false });

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load your teaching sessions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSessionStatus = async (sessionId: string, status: string) => {
    try {
      const updates: any = { status };
      
      if (status === 'in_progress') {
        updates.actual_start = new Date().toISOString();
      } else if (status === 'completed') {
        updates.actual_end = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tutoring_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) throw error;

      fetchSessions();
      toast({
        title: "Session Updated",
        description: `Session marked as ${status.replace('_', ' ')}.`,
      });
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "Error",
        description: "Failed to update session status.",
        variant: "destructive",
      });
    }
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

  const getStudentName = (session: TeachingSession) => {
    const profile = session.learner_profile;
    return `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Student';
  };

  const filterSessions = (status: string) => {
    switch (status) {
      case 'upcoming':
        return sessions.filter(s => s.status === 'scheduled');
      case 'in_progress':
        return sessions.filter(s => s.status === 'in_progress');
      case 'completed':
        return sessions.filter(s => s.status === 'completed');
      case 'cancelled':
        return sessions.filter(s => s.status === 'cancelled');
      default:
        return sessions;
    }
  };

  const SessionCard = ({ session }: { session: TeachingSession }) => (
    <Card key={session.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{session.title}</CardTitle>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className={`${getStatusColor(session.status)} text-white`}>
                {session.status.replace('_', ' ')}
              </Badge>
              {session.payment?.status === 'completed' && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Paid
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            {session.payment && (
              <>
                <div className="text-lg font-bold text-primary">
                  ${session.payment.amount}
                </div>
                <div className="text-sm text-muted-foreground">
                  {session.payment.status}
                </div>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={session.learner_profile?.avatar_url} />
            <AvatarFallback>
              {getStudentName(session)[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{getStudentName(session)}</div>
            <div className="text-sm text-muted-foreground">{session.subject.name}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(parseISO(session.scheduled_start), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(parseISO(session.scheduled_start), 'HH:mm')} - {format(parseISO(session.scheduled_end), 'HH:mm')}
            </span>
          </div>
        </div>

        {session.description && (
          <p className="text-sm text-muted-foreground">{session.description}</p>
        )}

        {session.status === 'completed' && session.rating && (
          <div className="flex items-center space-x-2">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="text-sm">Student rated {session.rating}/5</span>
          </div>
        )}

        {session.feedback && (
          <div className="bg-muted p-3 rounded-lg">
            <div className="text-sm font-medium mb-1">Student Feedback:</div>
            <div className="text-sm text-muted-foreground">{session.feedback}</div>
          </div>
        )}

        <div className="flex space-x-2 pt-2">
          <Button variant="outline" size="sm">
            <MessageCircle className="mr-2 h-4 w-4" />
            Message
          </Button>
          
          {session.status === 'scheduled' && (
            <Button 
              size="sm"
              onClick={() => updateSessionStatus(session.id, 'in_progress')}
            >
              Start Session
            </Button>
          )}
          
          {session.status === 'in_progress' && (
            <Button 
              size="sm"
              onClick={() => updateSessionStatus(session.id, 'completed')}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <BookOpen className="h-8 w-8 animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Teaching Sessions</h1>
          <p className="text-muted-foreground">Manage your tutoring sessions and track student progress</p>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Sessions ({sessions.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({filterSessions('upcoming').length})</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress ({filterSessions('in_progress').length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({filterSessions('completed').length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({filterSessions('cancelled').length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sessions.map(session => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filterSessions('upcoming').map(session => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="in_progress" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filterSessions('in_progress').map(session => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filterSessions('completed').map(session => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filterSessions('cancelled').map(session => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          </TabsContent>

          {sessions.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No teaching sessions yet</h3>
              <p className="text-muted-foreground">Sessions will appear here when students book with you</p>
            </div>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default TeachingSessions;