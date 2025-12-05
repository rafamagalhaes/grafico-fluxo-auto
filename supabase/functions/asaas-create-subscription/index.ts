import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ASAAS_API_URL = 'https://api.asaas.com/v3'

// Input validation schema
const creditCardSchema = z.object({
  holder_name: z.string().min(1).max(100),
  number: z.string().regex(/^\d{13,19}$/, 'Número do cartão inválido'),
  expiry_month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Mês de expiração inválido'),
  expiry_year: z.string().regex(/^\d{4}$/, 'Ano de expiração inválido'),
  ccv: z.string().regex(/^\d{3,4}$/, 'CVV inválido'),
})

const creditCardHolderInfoSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email('E-mail inválido'),
  cpf_cnpj: z.string().min(11).max(18),
  postal_code: z.string().min(8).max(9),
  address_number: z.string().min(1).max(10),
  phone: z.string().min(10).max(15),
})

const subscriptionRequestSchema = z.object({
  plan_id: z.string().uuid('ID do plano inválido'),
  payment_method: z.enum(['CREDIT_CARD', 'PIX'], { errorMap: () => ({ message: 'Método de pagamento inválido' }) }),
  customer_name: z.string().min(1).max(100).optional(),
  customer_email: z.string().email('E-mail inválido').optional(),
  customer_cpf_cnpj: z.string().min(11).max(18).optional(),
  credit_card: creditCardSchema.optional(),
  credit_card_holder_info: creditCardHolderInfoSchema.optional(),
}).refine((data) => {
  // If payment method is CREDIT_CARD, credit_card is required
  if (data.payment_method === 'CREDIT_CARD') {
    return !!data.credit_card
  }
  return true
}, { message: 'Dados do cartão de crédito são obrigatórios para pagamento com cartão', path: ['credit_card'] })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Usuário não autenticado')
    }

    // Get user's company
    const { data: userCompany, error: companyError } = await supabase
      .from('user_companies')
      .select('company_id, companies(*)')
      .eq('user_id', user.id)
      .single()

    if (companyError || !userCompany) {
      throw new Error('Empresa não encontrada')
    }

    const company = userCompany.companies as any
    
    // Parse and validate request body
    const rawBody = await req.json()
    const parseResult = subscriptionRequestSchema.safeParse(rawBody)
    
    if (!parseResult.success) {
      console.error('Validation errors:', parseResult.error.errors)
      const errorMessages = parseResult.error.errors.map(e => e.message).join(', ')
      return new Response(JSON.stringify({ error: `Dados inválidos: ${errorMessages}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    const body = parseResult.data

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', body.plan_id)
      .single()

    if (planError || !plan) {
      throw new Error('Plano não encontrado')
    }

    console.log('Creating subscription for company:', company.id, 'plan:', plan.name)

    // Create or get Asaas customer
    let asaasCustomerId = company.asaas_customer_id

    if (!asaasCustomerId) {
      console.log('Creating new Asaas customer')
      
      const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': asaasApiKey,
        },
        body: JSON.stringify({
          name: body.customer_name || company.name,
          email: body.customer_email || user.email,
          cpfCnpj: body.customer_cpf_cnpj || company.document,
          externalReference: company.id,
        }),
      })

      const customerData = await customerResponse.json()
      console.log('Asaas customer response:', customerData)

      if (customerData.errors) {
        throw new Error(`Erro ao criar cliente: ${customerData.errors[0]?.description || 'Erro desconhecido'}`)
      }

      asaasCustomerId = customerData.id

      // Save customer ID to company
      await supabase
        .from('companies')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', company.id)
    }

    // Calculate next due date (first day of next month or today + 1 day)
    const nextDueDate = new Date()
    nextDueDate.setDate(nextDueDate.getDate() + 1)
    const dueDateStr = nextDueDate.toISOString().split('T')[0]

    // Determine billing type and cycle
    const billingType = body.payment_method
    const cycle = plan.duration_months === 1 ? 'MONTHLY' : 'YEARLY'

    let subscriptionPayload: any = {
      customer: asaasCustomerId,
      billingType: billingType,
      value: plan.price,
      nextDueDate: dueDateStr,
      cycle: cycle,
      description: `Assinatura ${plan.name}`,
      externalReference: company.id,
    }

    // Add credit card info if payment method is CREDIT_CARD
    if (billingType === 'CREDIT_CARD' && body.credit_card) {
      subscriptionPayload.creditCard = {
        holderName: body.credit_card.holder_name,
        number: body.credit_card.number,
        expiryMonth: body.credit_card.expiry_month,
        expiryYear: body.credit_card.expiry_year,
        ccv: body.credit_card.ccv,
      }

      if (body.credit_card_holder_info) {
        subscriptionPayload.creditCardHolderInfo = {
          name: body.credit_card_holder_info.name,
          email: body.credit_card_holder_info.email,
          cpfCnpj: body.credit_card_holder_info.cpf_cnpj,
          postalCode: body.credit_card_holder_info.postal_code,
          addressNumber: body.credit_card_holder_info.address_number,
          phone: body.credit_card_holder_info.phone,
        }
      }
    }

    console.log('Creating Asaas subscription with payload:', { ...subscriptionPayload, creditCard: '[REDACTED]' })

    // Create subscription in Asaas
    const subscriptionResponse = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify(subscriptionPayload),
    })

    const subscriptionData = await subscriptionResponse.json()
    console.log('Asaas subscription response:', subscriptionData)

    if (subscriptionData.errors) {
      throw new Error(`Erro ao criar assinatura: ${subscriptionData.errors[0]?.description || 'Erro desconhecido'}`)
    }

    // Calculate end date based on plan duration
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + plan.duration_months)

    // Create subscription record in database
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        company_id: company.id,
        plan_id: plan.id,
        status: 'pending',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        payment_method: billingType.toLowerCase(),
        asaas_subscription_id: subscriptionData.id,
      })
      .select()
      .single()

    if (subscriptionError) {
      console.error('Error creating subscription record:', subscriptionError)
      throw new Error('Erro ao salvar assinatura')
    }

    // Return payment info
    let paymentInfo: any = {
      subscription_id: subscription.id,
      asaas_subscription_id: subscriptionData.id,
      status: subscriptionData.status,
    }

    // If PIX, get the first payment to retrieve PIX code
    if (billingType === 'PIX') {
      // Get the first payment of the subscription
      const paymentsResponse = await fetch(
        `${ASAAS_API_URL}/subscriptions/${subscriptionData.id}/payments`,
        {
          headers: {
            'access_token': asaasApiKey,
          },
        }
      )

      const paymentsData = await paymentsResponse.json()
      console.log('Subscription payments:', paymentsData)

      if (paymentsData.data && paymentsData.data.length > 0) {
        const firstPayment = paymentsData.data[0]
        
        // Get PIX QR Code
        const pixResponse = await fetch(
          `${ASAAS_API_URL}/payments/${firstPayment.id}/pixQrCode`,
          {
            headers: {
              'access_token': asaasApiKey,
            },
          }
        )

        const pixData = await pixResponse.json()
        console.log('PIX QR Code response:', pixData)

        paymentInfo.pix = {
          payment_id: firstPayment.id,
          qr_code: pixData.encodedImage,
          copy_paste: pixData.payload,
          expiration_date: pixData.expirationDate,
        }
      }
    }

    return new Response(JSON.stringify(paymentInfo), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error creating subscription:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
