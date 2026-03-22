import { db } from "@/lib/db"
import { createError, isAppError, ERROR_CODES } from "@/lib/errors"
import { logger } from "@/lib/utils/logger"
import { swedbankCircuitBreaker } from "@/lib/circuit-breaker"
import { confirmBooking, cancelBooking } from "./booking.service"
import type { PaymentInitiateParams, PaymentInitiateResult, WebhookPayload } from "@/types/payment"
import { createHmac } from "crypto"

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["AUTHORIZED", "CANCELLED"],
  AUTHORIZED: ["CAPTURED", "CANCELLED"],
  CAPTURED: ["REFUNDED"],
}

function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export async function initiatePayment(
  params: PaymentInitiateParams
): Promise<PaymentInitiateResult> {
  logger.info("payment.initiate.start", {
    bookingId: params.bookingId,
    amount: params.amount,
    currency: params.currency,
  })

  // Check for existing payment (idempotent)
  const existingPayment = await db.payment.findFirst({
    where: {
      bookingId: params.bookingId,
      status: { in: ["PENDING", "AUTHORIZED"] },
    },
  })

  if (existingPayment) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const checkoutUrl =
      process.env.SWEDBANK_PAY_MOCK === "true"
        ? `${appUrl}/mock-checkout?paymentId=${existingPayment.id}&amount=${String(params.amount)}&returnUrl=${encodeURIComponent(params.returnUrl)}`
        : existingPayment.providerRef ?? ""

    logger.info("payment.initiate.existing", {
      paymentId: existingPayment.id,
    })

    return {
      paymentId: existingPayment.id,
      providerRef: existingPayment.providerRef ?? "",
      checkoutUrl,
      idempotencyKey: existingPayment.idempotencyKey,
    }
  }

  // Generate idempotency key
  const idempotencyKey = `pay_${params.bookingId}_${String(Date.now())}`

  // Create Payment
  const payment = await db.payment.create({
    data: {
      bookingId: params.bookingId,
      idempotencyKey,
      amount: params.amount,
      currency: params.currency,
      status: "PENDING",
    },
  })

  // Write audit event
  await db.paymentEvent.create({
    data: {
      paymentId: payment.id,
      type: "payment.initiated",
      payload: {
        bookingId: params.bookingId,
        amount: params.amount,
        currency: params.currency,
        idempotencyKey,
      },
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  // Mock mode
  if (process.env.SWEDBANK_PAY_MOCK === "true") {
    const providerRef = `mock_${crypto.randomUUID()}`
    const checkoutUrl = `${appUrl}/mock-checkout?paymentId=${payment.id}&amount=${String(params.amount)}&returnUrl=${encodeURIComponent(params.returnUrl)}`

    await db.payment.update({
      where: { id: payment.id },
      data: { providerRef },
    })

    logger.info("payment.mock.initiated", {
      paymentId: payment.id,
      providerRef,
      amount: params.amount,
    })

    return {
      paymentId: payment.id,
      providerRef,
      checkoutUrl,
      idempotencyKey,
    }
  }

  // Real Swedbank Pay mode
  const baseUrl = process.env.SWEDBANK_PAY_BASE_URL
  const token = process.env.SWEDBANK_PAY_TOKEN
  const merchantId = process.env.SWEDBANK_PAY_MERCHANT_ID

  if (!baseUrl || !token || !merchantId) {
    throw createError(
      ERROR_CODES.PAYMENT_INITIATION_FAILED,
      "Swedbank Pay credentials not configured",
      "Betalningen kunde inte initieras. Vänligen försök igen.",
      true
    )
  }

  const requestBody = {
    paymentorder: {
      operation: "Purchase",
      currency: params.currency,
      amount: params.amount,
      vatAmount: 0,
      description: params.orderDescription,
      userAgent: "Mozilla/5.0",
      language: "sv-SE",
      urls: {
        hostUrls: [appUrl],
        completeUrl: params.returnUrl,
        cancelUrl: params.cancelUrl,
        callbackUrl: `${appUrl}/api/payment/webhook`,
      },
      payeeInfo: {
        payeeId: merchantId,
        payeeReference: idempotencyKey,
      },
    },
  }

  const swedbankResponse = await swedbankCircuitBreaker.execute(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const res = await fetch(`${baseUrl}/psp/paymentorders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "unknown")
        logger.error("payment.swedbank.httpError", new Error(`HTTP ${String(res.status)}`), {
          status: res.status,
          body: errorBody,
        })
        throw createError(
          ERROR_CODES.PAYMENT_INITIATION_FAILED,
          `Swedbank Pay HTTP ${String(res.status)}`,
          "Betalningen kunde inte initieras. Vänligen försök igen.",
          false
        )
      }

      return res.json() as Promise<{
        paymentOrder?: { id?: string }
        operations?: Array<{ rel: string; href: string }>
      }>
    } catch (error) {
      clearTimeout(timeoutId)
      if (isAppError(error)) throw error
      throw createError(
        ERROR_CODES.PAYMENT_INITIATION_FAILED,
        error instanceof Error ? error.message : "Swedbank Pay request failed",
        "Betalningen kunde inte initieras. Vänligen försök igen.",
        true
      )
    }
  })

  // Extract checkout URL
  const redirectOp = swedbankResponse.operations?.find(
    (op) => op.rel === "redirect-paymentorder"
  )

  if (!redirectOp?.href) {
    throw createError(
      ERROR_CODES.PAYMENT_INITIATION_FAILED,
      "No redirect URL in Swedbank Pay response",
      "Betalningen kunde inte initieras. Vänligen försök igen.",
      false
    )
  }

  const providerRef = swedbankResponse.paymentOrder?.id ?? ""

  await db.payment.update({
    where: { id: payment.id },
    data: { providerRef },
  })

  logger.info("payment.initiated", {
    paymentId: payment.id,
    providerRef,
    amount: params.amount,
  })

  return {
    paymentId: payment.id,
    providerRef,
    checkoutUrl: redirectOp.href,
    idempotencyKey,
  }
}

export async function processWebhook(
  payload: WebhookPayload,
  signature: string
): Promise<void> {
  try {
    // Validate signature in non-mock mode
    if (process.env.SWEDBANK_PAY_MOCK !== "true") {
      const secret = process.env.SWEDBANK_PAY_WEBHOOK_SECRET
      if (secret) {
        const expectedSig = createHmac("sha256", secret)
          .update(JSON.stringify(payload))
          .digest("hex")

        if (signature !== expectedSig) {
          logger.warn("payment.webhook.invalidSignature", {
            payloadType: payload.type,
          })
          return
        }
      }
    }

    // Find payment by providerRef
    const providerRef = payload.payment?.id ? String(payload.payment.id) : null

    if (!providerRef) {
      logger.warn("payment.webhook.noProviderRef", { type: payload.type })
      return
    }

    const payment = await db.payment.findFirst({
      where: { providerRef },
      include: {
        booking: {
          include: { reservation: true },
        },
      },
    })

    if (!payment) {
      logger.warn("payment.webhook.unknown_ref", { providerRef })
      return
    }

    const isCompleted =
      payload.type === "payment.order.completed" ||
      payload.transaction?.state === "Completed"

    const isFailed =
      payload.type === "payment.order.failed" ||
      payload.transaction?.state === "Failed"

    if (isCompleted) {
      if (!isValidTransition(payment.status, "AUTHORIZED")) {
        logger.warn("payment.webhook.invalidTransition", {
          paymentId: payment.id,
          from: payment.status,
          to: "AUTHORIZED",
        })
        return
      }

      await db.payment.update({
        where: { id: payment.id },
        data: { status: "AUTHORIZED", authorizedAt: new Date() },
      })

      await db.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: "payment.authorized",
          payload: JSON.parse(JSON.stringify(payload)) as Record<string, string>,
        },
      })

      // Confirm booking
      if (payment.booking) {
        await confirmBooking({
          reservationId: payment.booking.reservationId,
          paymentId: payment.id,
          guestName: payment.booking.guestName,
          guestEmail: payment.booking.guestEmail,
          guestPhone: payment.booking.guestPhone ?? undefined,
          totalAmount: payment.booking.totalAmount,
        })
      }

      logger.info("payment.webhook.authorized", {
        paymentId: payment.id,
        providerRef,
      })
    } else if (isFailed) {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      })

      await db.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: "payment.failed",
          payload: JSON.parse(JSON.stringify(payload)) as Record<string, string>,
        },
      })

      if (payment.booking) {
        await cancelBooking(payment.booking.reservationId, "payment_failed")
      }

      logger.info("payment.webhook.failed", {
        paymentId: payment.id,
        providerRef,
      })
    } else {
      // Unhandled webhook type
      await db.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: "payment.webhook.unhandled",
          payload: JSON.parse(JSON.stringify(payload)) as Record<string, string>,
        },
      })

      logger.warn("payment.webhook.unhandled", {
        paymentId: payment.id,
        type: payload.type,
      })
    }
  } catch (error) {
    // processWebhook never throws
    logger.error("payment.webhook.processingError", error, {
      payloadType: payload.type,
    })
  }
}

export async function handleMockPayment(
  paymentId: string,
  success: boolean
): Promise<void> {
  logger.info("payment.mock.processing", { paymentId, success })

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      booking: {
        include: { reservation: true },
      },
    },
  })

  if (!payment) {
    throw createError(
      ERROR_CODES.PAYMENT_INITIATION_FAILED,
      `Payment ${paymentId} not found`,
      "Betalningen kunde inte hittas.",
      false
    )
  }

  if (success) {
    if (!isValidTransition(payment.status, "AUTHORIZED")) {
      throw createError(
        ERROR_CODES.PAYMENT_INVALID_STATE_TRANSITION,
        `Cannot transition from ${payment.status} to AUTHORIZED`,
        "Betalningen har redan behandlats.",
        false
      )
    }

    await db.payment.update({
      where: { id: payment.id },
      data: { status: "AUTHORIZED", authorizedAt: new Date() },
    })

    await db.paymentEvent.create({
      data: {
        paymentId: payment.id,
        type: "payment.authorized",
        payload: { mock: true, paymentId, success },
      },
    })

    if (payment.booking) {
      await confirmBooking({
        reservationId: payment.booking.reservationId,
        paymentId: payment.id,
        guestName: payment.booking.guestName,
        guestEmail: payment.booking.guestEmail,
        guestPhone: payment.booking.guestPhone ?? undefined,
        totalAmount: payment.booking.totalAmount,
      })
    }
  } else {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    })

    await db.paymentEvent.create({
      data: {
        paymentId: payment.id,
        type: "payment.failed",
        payload: { mock: true, paymentId, success },
      },
    })

    if (payment.booking) {
      await cancelBooking(payment.booking.reservationId, "payment_cancelled_by_user")
    }
  }

  logger.info("payment.mock.processed", { paymentId, success })
}
