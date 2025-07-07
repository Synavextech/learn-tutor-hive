import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, TrendingUp, Calendar, Clock, User } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface Payment {
  id: string;
  amount: number;
  status: string;
  processed_at: string;
  created_at: string;
  session: {
    title: string;
    scheduled_start: string;
    learner_profile: {
      first_name: string;
      last_name: string;
    };
    subject: {
      name: string;
    };
  };
}

interface EarningsStats {
  totalEarnings: number;
  thisMonthEarnings: number;
  thisYearEarnings: number;
  completedSessions: number;
  pendingPayments: number;
  avgSessionRate: number;
}

const Earnings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    thisMonthEarnings: 0,
    thisYearEarnings: 0,
    completedSessions: 0,
    pendingPayments: 0,
    avgSessionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEarningsData();
    }
  }, [user]);

  const fetchEarningsData = async () => {
    try {
      // First get the tutor ID
      const { data: tutorData, error: tutorError } = await supabase
        .from('tutors')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (tutorError) throw tutorError;

      // Fetch payments with session details
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          session:tutoring_sessions!payments_session_id_fkey(
            title,
            scheduled_start,
            learner_profile:profiles!tutoring_sessions_learner_id_fkey(first_name, last_name),
            subject:subjects(name)
          )
        `)
        .eq('payee_id', user!.id)
        .order('created_at', { ascending: false });

      if (paymentError) throw paymentError;

      const payments = paymentData || [];
      setPayments(payments);

      // Calculate statistics
      const now = new Date();
      const startOfThisMonth = startOfMonth(now);
      const endOfThisMonth = endOfMonth(now);
      const startOfThisYear = startOfYear(now);
      const endOfThisYear = endOfYear(now);

      const completedPayments = payments.filter(p => p.status === 'completed');
      const pendingPayments = payments.filter(p => p.status === 'pending');

      const totalEarnings = completedPayments.reduce((sum, p) => sum + p.amount, 0);
      
      const thisMonthEarnings = completedPayments
        .filter(p => {
          const paymentDate = parseISO(p.processed_at || p.created_at);
          return paymentDate >= startOfThisMonth && paymentDate <= endOfThisMonth;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      const thisYearEarnings = completedPayments
        .filter(p => {
          const paymentDate = parseISO(p.processed_at || p.created_at);
          return paymentDate >= startOfThisYear && paymentDate <= endOfThisYear;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      const avgSessionRate = completedPayments.length > 0 
        ? totalEarnings / completedPayments.length 
        : 0;

      setStats({
        totalEarnings,
        thisMonthEarnings,
        thisYearEarnings,
        completedSessions: completedPayments.length,
        pendingPayments: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
        avgSessionRate,
      });

    } catch (error) {
      console.error('Error fetching earnings data:', error);
      toast({
        title: "Error",
        description: "Failed to load earnings data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'refunded': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStudentName = (payment: Payment) => {
    const profile = payment.session?.learner_profile;
    return profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Student';
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <DollarSign className="h-8 w-8 animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Earnings</h1>
          <p className="text-muted-foreground">Track your tutoring income and payment history</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">${stats.totalEarnings}</div>
                  <div className="text-sm text-muted-foreground">Total Earnings</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">${stats.thisMonthEarnings}</div>
                  <div className="text-sm text-muted-foreground">This Month</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{stats.completedSessions}</div>
                  <div className="text-sm text-muted-foreground">Completed Sessions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">${stats.avgSessionRate.toFixed(0)}</div>
                  <div className="text-sm text-muted-foreground">Avg per Session</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Payments Alert */}
        {stats.pendingPayments > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="font-medium text-yellow-800">
                    ${stats.pendingPayments} in pending payments
                  </div>
                  <div className="text-sm text-yellow-700">
                    These payments are being processed and will be available soon.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No payments yet</h3>
                <p className="text-muted-foreground">
                  Payments will appear here when students pay for your sessions
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map(payment => (
                  <div key={payment.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{getStudentName(payment)}</span>
                        </div>
                        <Badge className={`${getStatusColor(payment.status)} text-white`}>
                          {payment.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          ${payment.amount}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Session:</span> {payment.session?.title}
                      </div>
                      <div>
                        <span className="font-medium">Subject:</span> {payment.session?.subject?.name}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span>{' '}
                        {payment.session?.scheduled_start 
                          ? format(parseISO(payment.session.scheduled_start), 'MMM d, yyyy')
                          : 'N/A'
                        }
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      {payment.status === 'completed' && payment.processed_at ? (
                        <>Processed on {format(parseISO(payment.processed_at), 'MMM d, yyyy HH:mm')}</>
                      ) : (
                        <>Created on {format(parseISO(payment.created_at), 'MMM d, yyyy HH:mm')}</>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Annual Summary */}
        <Card>
          <CardHeader>
            <CardTitle>This Year Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">${stats.thisYearEarnings}</div>
                <div className="text-sm text-muted-foreground">Total Earned This Year</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">{stats.completedSessions}</div>
                <div className="text-sm text-muted-foreground">Sessions Completed</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">
                  ${(stats.thisYearEarnings / 12).toFixed(0)}
                </div>
                <div className="text-sm text-muted-foreground">Monthly Average</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Earnings;