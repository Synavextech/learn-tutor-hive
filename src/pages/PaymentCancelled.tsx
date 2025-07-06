import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import { AppLayout } from '@/components/Layout/AppLayout';

const PaymentCancelled = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-600">Payment Cancelled</CardTitle>
            <CardDescription>
              Your payment was cancelled and no charges were made.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>You can try the payment again when you're ready.</p>
              <p className="mt-2">No charges have been made to your account.</p>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate(-1)} 
                className="w-full"
              >
                Try Payment Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PaymentCancelled;