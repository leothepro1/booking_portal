import { type NextRequest } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { successResponse, handleRouteError, errorResponse, formatZodError } from "@/lib/api/response"
import { logger } from "@/lib/utils/logger"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  type: z.enum(["CAMPING", "APARTMENT", "HOTEL", "CABIN"]).optional(),
  basePricePerNight: z.number().positive().optional(),
  maxGuests: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const raw: unknown = await request.json()
    const result = updateSchema.safeParse(raw)

    if (!result.success) {
      return errorResponse(
        { code: "VALIDATION_ERROR", message: "Invalid", userMessage: formatZodError(result.error), retryable: false },
        400
      )
    }

    // Build update data — strip undefined values for exactOptionalPropertyTypes
    const parsed = result.data
    const data: Record<string, string | number | boolean> = {}
    if (parsed.name !== undefined) data["name"] = parsed.name
    if (parsed.description !== undefined) data["description"] = parsed.description
    if (parsed.type !== undefined) data["type"] = parsed.type
    if (parsed.basePricePerNight !== undefined) data["basePricePerNight"] = Math.round(parsed.basePricePerNight * 100)
    if (parsed.maxGuests !== undefined) data["maxGuests"] = parsed.maxGuests
    if (parsed.isActive !== undefined) data["isActive"] = parsed.isActive

    const updated = await db.accommodationCategory.update({ where: { id }, data })

    logger.info("admin.accommodation.updated", { id })
    revalidatePath("/search")
    revalidatePath("/admin/accommodations")

    return successResponse(updated)
  } catch (error) {
    return handleRouteError(error)
  }
}
