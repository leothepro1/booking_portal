"use client"

import { Suspense, useState } from "react"
import { notFound, useSearchParams } from "next/navigation"
import { formatSEK } from "@/lib/utils/currency"

export default function MockCheckoutPage(): React.ReactElement {
  return <Suspense><MockCheckoutContent /></Suspense>
}

function MockCheckoutContent(): React.ReactElement {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("paymentId")
  const amountStr = searchParams.get("amount")
  const returnUrl = searchParams.get("returnUrl")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (process.env.NEXT_PUBLIC_SWEDBANK_PAY_MOCK !== "true") {
    notFound()
  }

  if (!paymentId || !amountStr || !returnUrl) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <div style={{ backgroundColor: "#fff", borderRadius: "8px", padding: "32px", maxWidth: "400px", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", color: "#dc2626" }}>Felaktiga parametrar</h1>
          <p style={{ color: "#666" }}>Saknar paymentId, amount eller returnUrl.</p>
        </div>
      </div>
    )
  }

  const amount = Number(amountStr)

  async function handlePayment(success: boolean): Promise<void> {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/payment/mock-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, success }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: { message?: string } } | null
        setError(body?.error?.message ?? "Betalningen misslyckades")
        setLoading(false)
        return
      }

      window.location.href = decodeURIComponent(returnUrl ?? "/")
    } catch {
      setError("Nätverksfel — kunde inte nå servern")
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#f5f5f5", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "40px", maxWidth: "420px", width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", textAlign: "center" }}>

        <div style={{ backgroundColor: "#fef3c7", borderRadius: "6px", padding: "12px", marginBottom: "24px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#92400e", fontWeight: "600" }}>
            TESTMILJÖ — Inga riktiga pengar dras
          </p>
        </div>

        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#1a1a1a", margin: "0 0 8px 0" }}>
          Simulerad betalning
        </h1>

        <p style={{ color: "#666", fontSize: "14px", margin: "0 0 32px 0" }}>
          Detta är en testbetalning i utvecklingsmiljön.
        </p>

        <div style={{ backgroundColor: "#f0fdf4", borderRadius: "8px", padding: "20px", marginBottom: "32px" }}>
          <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#666" }}>Att betala</p>
          <p style={{ margin: 0, fontSize: "36px", fontWeight: "700", color: "#1a1a1a" }}>
            {formatSEK(amount)}
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: "#fef2f2", borderRadius: "6px", padding: "12px", marginBottom: "16px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "20px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              border: "3px solid #e5e7eb",
              borderTopColor: "#2563eb",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "#666", fontSize: "14px", marginTop: "12px" }}>Behandlar betalning...</p>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={() => void handlePayment(false)}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #dc2626",
                backgroundColor: "#fff",
                color: "#dc2626",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Avbryt betalning
            </button>
            <button
              type="button"
              onClick={() => void handlePayment(true)}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#16a34a",
                color: "#fff",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Genomför betalning
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
