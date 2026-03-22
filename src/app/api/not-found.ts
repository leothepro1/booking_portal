import { errorResponse } from "@/lib/api/response"

export default function notFound(): Response {
  return errorResponse(
    {
      code: "NOT_FOUND",
      message: "Endpoint not found",
      userMessage: "Endpoint finns inte.",
      retryable: false,
    },
    404
  )
}
