import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validate Asaas webhook signature using HMAC-SHA256
async function validateAsaasSignature(
  payload: string,
  signature: string | null,
  webhookToken: string
): Promise<boolean> {
  if (!signature || !webhookToken) {
    console.error('Missing signature or webhook token')
    return false
  }

  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookToken),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    )
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    // Compare signatures in constant time to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false
    }
    
    let result = 0
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i)
    }
    
    return result === 0
  } catch (error) {
    console.error('Error validating signature:', error)
    return false
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
    
    if (!webhookToken) {
      console.error('ASAAS_WEBHOOK_TOKEN not configured')
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the raw body for signature validation
    const rawBody = await req.text()
    const signature = req.headers.get('asaas-access-token')
    
    console.log('Validating webhook signature...')
    
    // Validate the signature
    const isValid = await validateAsaasSignature(rawBody, signature, webhookToken)
    
    if (!isValid) {
      console.error('Invalid webhook signature')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    console.log('Webhook signature validated successfully')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = JSON.parse(rawBody)
    
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
