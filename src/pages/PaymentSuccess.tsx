import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { useToast } from '@/hooks/use-toast';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const orderId = searchParams.get('token'); // PayPal returns token parameter
    const paymentId = searchParams.get('PayerID');

    if (orderId) {
      // Capture the payment
      fetch(`/functions/v1/paypal-checkout?orderId=${orderId}&paymentId=${paymentId}`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            toast({
              title: "Payment Successful",
              description: "Your payment has been processed successfully!",
            });
          }
        })
        .catch(error => {
          console.error('Error capturing payment:', error);
          toast({
            title: "Payment Processing",
            description: "We're processing your payment. You'll receive a confirmation shortly.",
          });
        });
    }
  }, [searchParams, toast]);

  return (
    <AppLayout>
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
            <CardDescription>
              Your payment has been processed successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Thank you for your payment. You will receive a confirmation email shortly.</p>
              <p className="mt-2">Your tutoring session is now confirmed.</p>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/payments')} 
                className="w-full"
              >
                View Payment History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PaymentSuccess;