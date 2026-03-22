import { type NextRequest } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { successResponse, handleRouteError, errorResponse, formatZodError } from "@/lib/api/response"
import { logger } from "@/lib/utils/logger"

const inventorySchema = z.object({
  categoryId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  availableUnits: z.number().int().min(0).max(20),
})

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const raw: unknown = await request.json()
    const result = inventorySchema.safeParse(raw)

    if (!result.success) {
      return errorResponse({ code: "VALIDATION_ERROR", message: "Invalid", userMessage: formatZodError(result.error), retryable: false }, 400)
    }

    const { categoryId, date, availableUnits } = result.data
    const dateObj = new Date(date)

    const inv = await db.inventory.upsert({
      where: { categoryId_date: { categoryId, date: dateObj } },
      update: { availableUnits },
      create: { categoryId, date: dateObj, availableUnits, totalUnits: availableUnits },
    })

    logger.info("admin.inventory.updated", { categoryId, date, availableUnits })
    revalidatePath("/search")

    return successResponse(inv)
  } catch (error) {
    return handleRouteError(error)
  }
}
