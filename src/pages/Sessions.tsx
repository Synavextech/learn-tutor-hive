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
import { Calendar, Clock, User, BookOpen, MessageCircle, CreditCard, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PayPalCheckout } from '@/components/PayPalCheckout';

interface Session {
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
  tutor_id: string;
  subject: {
    name: string;
    category: string;
  };
  tutor: {
    hourly_rate: number;
    profile?: {
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    };
  };
  payment?: {
    status: string;
    amount: number;
  } | null;
}

const Sessions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('tutoring_sessions')
        .select(`
          *,
          subject:subjects(name, category),
          tutor:tutors!inner(hourly_rate, user_id),
          payment:payments(status, amount)
        `)
        .eq('learner_id', user!.id)
        .order('scheduled_start', { ascending: false });

      if (error) throw error;

      // Get tutor user IDs to fetch profiles
      const tutorUserIds = data?.map(s => s.tutor?.user_id).filter(Boolean) || [];
      
      let profilesData: any[] = [];
      if (tutorUserIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, avatar_url')
          .in('user_id', tutorUserIds);
        
        if (!profileError) {
          profilesData = profiles || [];
        }
      }

      // Merge profiles with session data and fix payment type
      const sessionsWithProfiles = data?.map(session => ({
        ...session,
        tutor: {
          ...session.tutor,
          profile: profilesData.find(p => p.user_id === session.tutor?.user_id) || null
        },
        payment: Array.isArray(session.payment) ? session.payment[0] || null : session.payment
      })) || [];

      setSessions(sessionsWithProfiles);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load your sessions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const getTutorName = (session: Session) => {
    const tutor = session.tutor.profile;
    return `${tutor?.first_name || ''} ${tutor?.last_name || ''}`.trim() || 'Tutor';
  };

  const getSessionDuration = (start: string, end: string) => {
    const startTime = parseISO(start);
    const endTime = parseISO(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours;
  };

  const calculateSessionCost = (session: Session) => {
    const duration = getSessionDuration(session.scheduled_start, session.scheduled_end);
    return Math.round(duration * session.tutor.hourly_rate);
  };

  const isPaid = (session: Session) => {
    return session.payment && session.payment.status === 'completed';
  };

  const filterSessions = (status: string) => {
    switch (status) {
      case 'upcoming':
        return sessions.filter(s => s.status === 'scheduled');
      case 'completed':
        return sessions.filter(s => s.status === 'completed');
      case 'cancelled':
        return sessions.filter(s => s.status === 'cancelled');
      default:
        return sessions;
    }
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    fetchSessions();
    toast({
      title: "Payment Successful",
      description: "Your session payment has been processed.",
    });
  };

  const SessionCard = ({ session }: { session: Session }) => (
    <Card key={session.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{session.title}</CardTitle>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className={`${getStatusColor(session.status)} text-white`}>
                {session.status.replace('_', ' ')}
              </Badge>
              {!isPaid(session) && session.status === 'scheduled' && (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  Payment Required
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-primary">
              ${calculateSessionCost(session)}
            </div>
            <div className="text-sm text-muted-foreground">
              ${session.tutor.hourly_rate}/hour
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={session.tutor.profile?.avatar_url} />
            <AvatarFallback>
              {getTutorName(session)[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{getTutorName(session)}</div>
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
            <span className="text-sm">Rated {session.rating}/5</span>
          </div>
        )}

        <div className="flex space-x-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <MessageCircle className="mr-2 h-4 w-4" />
            Message
          </Button>
          
          {session.status === 'scheduled' && !isPaid(session) && (
            <Button 
              size="sm"
              onClick={() => {
                setSelectedSession(session);
                setShowPayment(true);
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Pay Now
            </Button>
          )}
          
          {session.status === 'completed' && !session.rating && (
            <Button variant="outline" size="sm">
              <Star className="mr-2 h-4 w-4" />
              Rate
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
          <h1 className="text-3xl font-bold">My Sessions</h1>
          <p className="text-muted-foreground">Track your learning sessions and progress</p>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Sessions ({sessions.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({filterSessions('upcoming').length})</TabsTrigger>
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
              <h3 className="text-lg font-medium mb-2">No sessions yet</h3>
              <p className="text-muted-foreground">Book your first tutoring session to get started</p>
            </div>
          )}
        </Tabs>

        {/* Payment Modal */}
        {showPayment && selectedSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg p-6 max-w-md w-full">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Complete Payment</h3>
                <p className="text-sm text-muted-foreground">
                  Pay for your session with {getTutorName(selectedSession)}
                </p>
              </div>
              
              <PayPalCheckout
                sessionId={selectedSession.id}
                amount={calculateSessionCost(selectedSession)}
                sessionTitle={selectedSession.title}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setShowPayment(false)}
              />
              
              <Button
                variant="outline"
                onClick={() => setShowPayment(false)}
                className="w-full mt-4"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Sessions;