import { Resend } from "resend"
import { logger } from "@/lib/utils/logger"
import { formatSwedishDate } from "@/lib/utils/dates"
import { formatSEK } from "@/lib/utils/currency"
import type { BookingConfirmationParams } from "@/types/booking"

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    logger.warn("mail.resend.notConfigured", {
      reason: "RESEND_API_KEY is not set — emails will not be sent",
    })
    return null
  }
  return new Resend(apiKey)
}

function buildConfirmationHtml(params: BookingConfirmationParams): string {
  const {
    guestName,
    bookingToken,
    accommodationName,
    checkIn,
    checkOut,
    nights,
    totalAmount,
    addons,
  } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const bookingUrl = `${appUrl}/bokning/${bookingToken}`

  const addonsHtml =
    addons.length > 0
      ? addons
          .map(
            (a) =>
              `<tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${a.name} (x${String(a.quantity)})</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #333;">${formatSEK(a.price * a.quantity)}</td>
              </tr>`
          )
          .join("")
      : `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;" colspan="2">Inga tillägg</td>
        </tr>`

  return `<!DOCTYPE html>
<html lang="sv">
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 8px 0;">Din bokning är bekräftad</h1>
        <p style="color: #666; font-size: 14px; margin: 0;">Tack för din bokning, ${guestName}!</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 600; color: #333;">Boende</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; color: #333;">${accommodationName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 600; color: #333;">Incheckning</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; color: #333;">${formatSwedishDate(checkIn)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 600; color: #333;">Utcheckning</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; color: #333;">${formatSwedishDate(checkOut)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 600; color: #333;">Antal nätter</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; color: #333;">${String(nights)}</td>
        </tr>
      </table>

      <h3 style="color: #1a1a1a; font-size: 16px; margin: 0 0 8px 0;">Tillägg</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        ${addonsHtml}
      </table>

      <div style="background-color: #f0f9f0; border-radius: 6px; padding: 16px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 4px 0; font-size: 14px; color: #666;">Totalt att betala</p>
        <p style="margin: 0; font-size: 28px; font-weight: 700; color: #1a1a1a;">${formatSEK(totalAmount)}</p>
      </div>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${bookingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 14px;">Visa din bokning</a>
      </div>

      <div style="background-color: #fef3c7; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: #92400e;">
          <strong>Spara denna länk</strong> — du behöver den för att hantera din bokning:
          <br><a href="${bookingUrl}" style="color: #92400e;">${bookingUrl}</a>
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

      <div style="text-align: center;">
        <p style="font-size: 12px; color: #999; margin: 0 0 4px 0;">Vid frågor, kontakta oss:</p>
        <p style="font-size: 12px; color: #999; margin: 0;">E-post: info@campingen.se | Tel: 070-123 45 67</p>
      </div>

    </div>
  </div>
</body>
</html>`
}

export async function sendBookingConfirmation(
  params: BookingConfirmationParams
): Promise<void> {
  const resend = getResendClient()

  if (!resend) {
    logger.warn("mail.bookingConfirmation.skipped", {
      bookingToken: params.bookingToken,
      reason: "Resend not configured",
    })
    return
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "bokningar@example.se"

  try {
    await resend.emails.send({
      from: fromEmail,
      to: params.guestEmail,
      subject: `Bokningsbekräftelse — ${params.accommodationName}`,
      html: buildConfirmationHtml(params),
    })

    logger.info("mail.bookingConfirmation.sent", {
      bookingToken: params.bookingToken,
    })
  } catch (error) {
    logger.error("mail.bookingConfirmation.failed", error, {
      bookingToken: params.bookingToken,
    })
    // Kastar aldrig fel — mail är inte blocking
  }
}
