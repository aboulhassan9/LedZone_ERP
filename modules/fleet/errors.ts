// Structured domain errors for the Fleet Service Layer (Module 9). Mirrors
// modules/crm/errors.ts's shape exactly.

export type FleetErrorCode = "VALIDATION_ERROR" | "PERMISSION_DENIED" | "NOT_FOUND" | "CONFLICT";

export class FleetError extends Error {
  readonly code: FleetErrorCode;

  constructor(code: FleetErrorCode, message: string) {
    super(message);
    this.name = "FleetError";
    this.code = code;
  }
}

export class ValidationError extends FleetError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
    this.name = "ValidationError";
  }
}

export class PermissionDeniedError extends FleetError {
  constructor(message = "You don't have permission to perform this action.") {
    super("PERMISSION_DENIED", message);
    this.name = "PermissionDeniedError";
  }
}

export class NotFoundError extends FleetError {
  constructor(entity: string) {
    super("NOT_FOUND", `${entity} not found.`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends FleetError {
  constructor(message: string) {
    super("CONFLICT", message);
    this.name = "ConflictError";
  }
}

export function toFleetError(error: unknown, entity: string): FleetError {
  if (error instanceof FleetError) return error;

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
