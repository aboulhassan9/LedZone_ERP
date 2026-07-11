// Structured domain errors for the Reports module's one mutation (generating a financial
// snapshot). Mirrors modules/crm/errors.ts's shape exactly -- Reports was read-only through
// Module 12 and skipped this, but a real write needs the same typed-error discipline as every
// other module.

export type ReportsErrorCode = "VALIDATION_ERROR" | "PERMISSION_DENIED" | "NOT_FOUND" | "CONFLICT";

export class ReportsError extends Error {
  readonly code: ReportsErrorCode;

  constructor(code: ReportsErrorCode, message: string) {
    super(message);
    this.name = "ReportsError";
    this.code = code;
  }
}

export class ValidationError extends ReportsError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
    this.name = "ValidationError";
  }
}

export class PermissionDeniedError extends ReportsError {
  constructor(message = "You don't have permission to perform this action.") {
    super("PERMISSION_DENIED", message);
    this.name = "PermissionDeniedError";
  }
}

export class NotFoundError extends ReportsError {
  constructor(entity: string) {
    super("NOT_FOUND", `${entity} not found.`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends ReportsError {
  constructor(message: string) {
    super("CONFLICT", message);
    this.name = "ConflictError";
  }
}

export function toReportsError(error: unknown, entity: string): ReportsError {
  if (error instanceof ReportsError) return error;

  const pgError = error as { code?: string; message?: string } | null;

  if (pgError?.code === "23505") {
    return new ConflictError(`A report for this period and currency already exists.`);
  }
  if (pgError?.code === "23503") {
    return new ConflictError(`${entity} references a record that doesn't exist.`);
  }
  if (pgError?.code === "23514" || pgError?.message?.includes("check constraint")) {
    return new ConflictError(pgError.message ?? `${entity} violates a business rule.`);
  }
  if (pgError?.message?.includes("Permission denied")) {
    return new PermissionDeniedError();
  }
  if (pgError?.message?.includes("not found") || pgError?.message?.includes("does not exist")) {
    return new NotFoundError(entity);
  }

  throw error;
}
