import { type NextRequest } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { successResponse, handleRouteError, errorResponse, formatZodError } from "@/lib/api/response"
import { logger } from "@/lib/utils/logger"

const bulkSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  availableUnits: z.number().int().min(0).max(20),
})

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const raw: unknown = await request.json()
    const result = bulkSchema.safeParse(raw)

    if (!result.success) {
      return errorResponse({ code: "VALIDATION_ERROR", message: "Invalid", userMessage: formatZodError(result.error), retryable: false }, 400)
    }

    const { date, availableUnits } = result.data
    const dateObj = new Date(date)

    const categories = await db.accommodationCategory.findMany({ where: { isActive: true, deletedAt: null } })

    let updated = 0
    for (const cat of categories) {
      await db.inventory.upsert({
        where: { categoryId_date: { categoryId: cat.id, date: dateObj } },
        update: { availableUnits },
        create: { categoryId: cat.id, date: dateObj, availableUnits, totalUnits: availableUnits },
      })
      updated++
    }

    logger.info("admin.inventory.bulkSet", { date, availableUnits, updated })
    revalidatePath("/search")

    return successResponse({ updated })
  } catch (error) {
    return handleRouteError(error)
  }
}
