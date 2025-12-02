import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = await req.json()
    
    console.log('Asaas webhook received:', JSON.stringify(payload, null, 2))

    const { event, payment } = payload

    // Process payment events
    if (payment) {
      const externalReference = payment.externalReference
      
      if (!externalReference) {
        console.log('No external reference found, skipping')
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Parse external reference (format: subscription_id or company_id)
      console.log('Processing payment for reference:', externalReference)

      switch (event) {
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED': {
          console.log('Payment confirmed/received:', payment.id)
          
          // Update subscription status if needed
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ 
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', externalReference)

          if (updateError) {
            console.error('Error updating subscription:', updateError)
          }
          
          break
        }

        case 'PAYMENT_OVERDUE': {
          console.log('Payment overdue:', payment.id)
          
          // Mark subscription as overdue
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ 
              status: 'overdue',
              updated_at: new Date().toISOString()
            })
            .eq('id', externalReference)

          if (updateError) {
            console.error('Error updating subscription:', updateError)
          }
          
          break
        }

        case 'PAYMENT_DELETED':
        case 'PAYMENT_REFUNDED': {
          console.log('Payment deleted/refunded:', payment.id)
          break
        }

        default:
          console.log('Unhandled event type:', event)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
