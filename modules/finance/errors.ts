// Structured domain errors for the Finance Service Layer (Module 8). Mirrors
// modules/crm/errors.ts's shape exactly.

export type FinanceErrorCode = "VALIDATION_ERROR" | "PERMISSION_DENIED" | "NOT_FOUND" | "CONFLICT";

export class FinanceError extends Error {
  readonly code: FinanceErrorCode;

  constructor(code: FinanceErrorCode, message: string) {
    super(message);
    this.name = "FinanceError";
    this.code = code;
  }
}

export class ValidationError extends FinanceError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
    this.name = "ValidationError";
  }
}

export class PermissionDeniedError extends FinanceError {
  constructor(message = "You don't have permission to perform this action.") {
    super("PERMISSION_DENIED", message);
    this.name = "PermissionDeniedError";
  }
}

export class NotFoundError extends FinanceError {
  constructor(entity: string) {
    super("NOT_FOUND", `${entity} not found.`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends FinanceError {
  constructor(message: string) {
    super("CONFLICT", message);
    this.name = "ConflictError";
  }
}

export function toFinanceError(error: unknown, entity: string): FinanceError {
  if (error instanceof FinanceError) return error;

  const pgError = error as { code?: string; message?: string } | null;

  if (pgError?.code === "23505") {
    return new ConflictError(`${entity} already exists (duplicate value).`);
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
