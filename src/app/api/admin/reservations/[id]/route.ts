import { type NextRequest } from "next/server"
import { cancelBooking } from "@/lib/services/booking.service"
import { revalidatePath } from "next/cache"
import { successResponse, handleRouteError } from "@/lib/api/response"
import { logger } from "@/lib/utils/logger"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params

    logger.info("admin.reservation.cancel", { id })
    await cancelBooking(id, "admin_cancelled")

    revalidatePath("/admin/reservations")
    revalidatePath("/search")

    return successResponse({ cancelled: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
