import { type NextRequest } from "next/server"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { successResponse, handleRouteError } from "@/lib/api/response"
import { logger } from "@/lib/utils/logger"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const acc = await db.accommodationCategory.findUnique({ where: { id } })
    if (!acc) {
      return successResponse({ error: "Not found" }, 404)
    }

    const updated = await db.accommodationCategory.update({
      where: { id },
      data: { isActive: !acc.isActive },
    })

    logger.info("admin.accommodation.toggled", { id, isActive: updated.isActive })
    revalidatePath("/search")
    revalidatePath("/admin/accommodations")

    return successResponse({ isActive: updated.isActive })
  } catch (error) {
    return handleRouteError(error)
  }
}
