import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink, Loader2 } from 'lucide-react';

interface PayPalCheckoutProps {
  sessionId: string;
  amount: number;
  currency?: string;
  sessionTitle: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const PayPalCheckout = ({ 
  sessionId, 
  amount, 
  currency = 'USD', 
  sessionTitle,
  onSuccess,
  onCancel 
}: PayPalCheckoutProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePayPalCheckout = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('paypal-checkout', {
        body: {
          sessionId,
          amount,
          currency,
        },
      });

      if (error) throw error;

      if (data.approvalUrl) {
        // Open PayPal checkout in a new tab
        const paypalWindow = window.open(data.approvalUrl, '_blank');
        
        if (paypalWindow) {
          // Monitor when the PayPal window is closed
          const checkClosed = setInterval(() => {
            if (paypalWindow.closed) {
              clearInterval(checkClosed);
              // Check payment status after window closes
              checkPaymentStatus(data.orderId);
            }
          }, 1000);
        } else {
          toast({
            title: "Popup Blocked",
            description: "Please allow popups and try again.",
            variant: "destructive",
          });
        }
      } else {
        throw new Error('No approval URL received from PayPal');
      }
    } catch (error) {
      console.error('PayPal checkout error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate PayPal checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (orderId: string) => {
    try {
      // Check if payment was completed by querying our database
      const { data: payment, error } = await supabase
        .from('payments')
        .select('status')
        .eq('paypal_order_id', orderId)
        .single();

      if (error) throw error;

      if (payment.status === 'completed') {
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully!",
        });
        onSuccess?.();
      } else if (payment.status === 'failed') {
        toast({
          title: "Payment Failed",
          description: "Your payment was not completed. Please try again.",
          variant: "destructive",
        });
        onCancel?.();
      } else {
        // Payment still pending - might need to wait or refresh
        toast({
          title: "Payment Pending",
          description: "Your payment is being processed. Please check back in a few minutes.",
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast({
        title: "Error",
        description: "Unable to verify payment status. Please check your payment history.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Payment</CardTitle>
        <CardDescription>
          Secure payment processing through PayPal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Session:</span>
            <span className="font-medium">{sessionTitle}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount:</span>
            <span className="font-medium">{amount} {currency}</span>
          </div>
        </div>
        
        <Button 
          onClick={handlePayPalCheckout}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Pay with PayPal
            </>
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          You will be redirected to PayPal to complete your payment securely.
        </p>
      </CardContent>
    </Card>
  );
};