import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayPalAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalOrderRequest {
  sessionId: string;
  amount: number;
  currency?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    
    if (!paypalClientId || !paypalClientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    // Get access token from PayPal
    const auth = btoa(`${paypalClientId}:${paypalClientSecret}`);
    const tokenResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get PayPal access token');
    }

    const tokenData: PayPalAuthResponse = await tokenResponse.json();

    if (req.method === 'POST') {
      const { sessionId, amount, currency = 'USD' }: PayPalOrderRequest = await req.json();

      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('tutoring_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        throw new Error('Session not found');
      }

      // Create PayPal order
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
          description: `Tutoring Session: ${session.title}`,
          custom_id: sessionId,
        }],
        application_context: {
          return_url: `${req.headers.get('origin')}/payment-success`,
          cancel_url: `${req.headers.get('origin')}/payment-cancelled`,
        },
      };

      const orderResponse = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('PayPal order creation failed:', errorText);
        throw new Error('Failed to create PayPal order');
      }

      const order = await orderResponse.json();
      
      // Store payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          session_id: sessionId,
          payer_id: session.learner_id,
          payee_id: session.tutor_id,
          amount: amount,
          currency: currency,
          status: 'pending',
          paypal_order_id: order.id,
        });

      if (paymentError) {
        console.error('Failed to store payment record:', paymentError);
        throw new Error('Failed to store payment record');
      }

      // Return approval URL
      const approvalUrl = order.links.find((link: any) => link.rel === 'approve')?.href;
      
      return new Response(JSON.stringify({ 
        orderId: order.id,
        approvalUrl: approvalUrl 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      // Handle payment capture after user approval
      const url = new URL(req.url);
      const orderId = url.searchParams.get('orderId');
      const paymentId = url.searchParams.get('paymentId');

      if (!orderId) {
        throw new Error('Order ID is required for capture');
      }

      // Capture the payment
      const captureResponse = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!captureResponse.ok) {
        throw new Error('Failed to capture PayPal payment');
      }

      const captureData = await captureResponse.json();
      
      // Update payment record
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          paypal_payment_id: paymentId,
          processed_at: new Date().toISOString(),
        })
        .eq('paypal_order_id', orderId);

      if (updateError) {
        console.error('Failed to update payment record:', updateError);
      }

      return new Response(JSON.stringify({ 
        success: true,
        captureId: captureData.id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('PayPal checkout error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});