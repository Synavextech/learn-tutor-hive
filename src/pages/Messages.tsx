import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, Search, MessageSquare } from 'lucide-react';
import { RealTimeChat } from '@/components/RealTimeChat';

interface Session {
  id: string;
  title: string;
  learner_id: string;
  tutor_id: string;
  status: string;
  created_at: string;
  learner_profile?: {
    first_name: string;
    last_name: string;
  };
  tutor_profile?: {
    first_name: string;
    last_name: string;
  };
  tutor?: {
    user_id: string;
  };
}

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      // First get sessions where user is learner
      const { data: learnerSessions, error: learnerError } = await supabase
        .from('tutoring_sessions')
        .select(`
          *,
          tutor:tutors!inner(user_id),
          tutor_profile:tutors(user_id, profiles!inner(first_name, last_name))
        `)
        .eq('learner_id', user!.id);

      if (learnerError) throw learnerError;

      // Then get sessions where user is tutor
      const { data: tutorData, error: tutorDataError } = await supabase
        .from('tutors')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      let tutorSessions: any[] = [];
      if (!tutorDataError && tutorData) {
        const { data, error: tutorSessionsError } = await supabase
          .from('tutoring_sessions')
          .select(`
            *,
            learner_profile:profiles!tutoring_sessions_learner_id_fkey(first_name, last_name)
          `)
          .eq('tutor_id', tutorData.id);

        if (!tutorSessionsError) {
          tutorSessions = data || [];
        }
      }

      // Combine and deduplicate sessions
      const allSessions = [...(learnerSessions || []), ...tutorSessions];
      const uniqueSessions = allSessions.filter((session, index, self) => 
        index === self.findIndex(s => s.id === session.id)
      );

      setSessions(uniqueSessions);
      if (uniqueSessions.length > 0 && !selectedSession) {
        setSelectedSession(uniqueSessions[0]);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(session => {
    const searchLower = searchTerm.toLowerCase();
    return (
      session.title.toLowerCase().includes(searchLower) ||
      session.learner_profile?.first_name?.toLowerCase().includes(searchLower) ||
      session.learner_profile?.last_name?.toLowerCase().includes(searchLower) ||
      session.tutor_profile?.first_name?.toLowerCase().includes(searchLower) ||
      session.tutor_profile?.last_name?.toLowerCase().includes(searchLower)
    );
  });

  const getSessionDisplayName = (session: Session) => {
    if (session.learner_id === user?.id) {
      // User is learner, show tutor name
      const tutor = session.tutor_profile;
      return tutor ? `${tutor.first_name || ''} ${tutor.last_name || ''}`.trim() || 'Tutor' : 'Tutor';
    } else {
      // User is tutor, show learner name
      const learner = session.learner_profile;
      return learner ? `${learner.first_name || ''} ${learner.last_name || ''}`.trim() || 'Student' : 'Student';
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <MessageSquare className="h-8 w-8 animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-8rem)] flex gap-6">
        {/* Conversations List */}
        <Card className="w-1/3">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Messages</span>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              {filteredSessions.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No conversations yet
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                        selectedSession?.id === session.id ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {getSessionDisplayName(session)[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">
                              {getSessionDisplayName(session)}
                            </p>
                            <Badge variant="secondary" className={`${getStatusColor(session.status)} text-white text-xs`}>
                              {session.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {session.title}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1">
          {selectedSession ? (
            <div className="h-full flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>
                      {getSessionDisplayName(selectedSession)[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {getSessionDisplayName(selectedSession)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedSession.title}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <RealTimeChat 
                  sessionId={selectedSession.id} 
                  participantIds={[selectedSession.learner_id, selectedSession.tutor?.user_id || '']}
                />
              </CardContent>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
};

export default Messages;