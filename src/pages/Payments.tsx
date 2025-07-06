import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Clock, DollarSign, Calendar, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  paypal_order_id: string | null;
  session_id: string;
  tutoring_sessions: {
    title: string;
    scheduled_start: string;
  };
}

const Payments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('payments')
          .select(`
            *,
            tutoring_sessions!inner(title, scheduled_start)
          `)
          .eq('payer_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPayments(data || []);
      } catch (error) {
        console.error('Error fetching payments:', error);
        toast({
          title: "Error",
          description: "Failed to load payment history",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user, toast]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'refunded':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading payments...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment History</h1>
          <p className="text-muted-foreground">
            View your payment history and transaction details.
          </p>
        </div>

        {payments.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Payments Found</CardTitle>
              <CardDescription>
                You haven't made any payments yet. Book a tutoring session to get started!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>Find Tutors</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <Card key={payment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {payment.tutoring_sessions.title}
                      </CardTitle>
                      <CardDescription className="flex items-center space-x-4 mt-2">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(payment.tutoring_sessions.scheduled_start)}
                        </span>
                        <span className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {payment.amount} {payment.currency}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(payment.status)}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Payment Date:</span>
                      <span>{formatDate(payment.created_at)}</span>
                    </div>
                    {payment.processed_at && (
                      <div className="flex justify-between">
                        <span>Processed:</span>
                        <span>{formatDate(payment.processed_at)}</span>
                      </div>
                    )}
                    {payment.paypal_order_id && (
                      <div className="flex justify-between">
                        <span>PayPal Order ID:</span>
                        <span className="font-mono text-xs">{payment.paypal_order_id}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Payments;