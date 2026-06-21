export const ErrorCode = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  INVALID_OTP: "INVALID_OTP",
  OTP_EXPIRED: "OTP_EXPIRED",
  WEAK_PASSWORD: "WEAK_PASSWORD",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  EMAIL_EXISTS: "EMAIL_EXISTS",
  CONFLICT: "CONFLICT",
  ORDER_ALREADY_PAID: "ORDER_ALREADY_PAID",
  UNPROCESSABLE: "UNPROCESSABLE",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
  UPSTREAM_FAILED: "UPSTREAM_FAILED",
  SALES_DISABLED: "SALES_DISABLED",
  GONE: "GONE",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
