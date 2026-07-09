// Structured domain errors for the Inventory Service Layer. Every service function
// throws one of these instead of a generic Error, so callers (Server Actions today,
// Warehouse/Events/Rentals/Finance services tomorrow) can branch on `.code` rather than
// parsing message strings.

export type InventoryErrorCode =
  | "VALIDATION_ERROR"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "CONFLICT";

export class InventoryError extends Error {
  readonly code: InventoryErrorCode;

  constructor(code: InventoryErrorCode, message: string) {
    super(message);
    this.name = "InventoryError";
    this.code = code;
  }
}

export class ValidationError extends InventoryError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
    this.name = "ValidationError";
  }
}

export class PermissionDeniedError extends InventoryError {
  constructor(message = "You don't have permission to perform this action.") {
    super("PERMISSION_DENIED", message);
    this.name = "PermissionDeniedError";
  }
}

export class NotFoundError extends InventoryError {
  constructor(entity: string) {
    super("NOT_FOUND", `${entity} not found.`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends InventoryError {
  constructor(message: string) {
    super("CONFLICT", message);
    this.name = "ConflictError";
  }
}

// Narrows a Postgres/PostgREST error into the right InventoryError so services never leak
// raw driver errors. Anything unrecognized is re-thrown as-is (a genuine bug to surface).
export function toInventoryError(error: unknown, entity: string): InventoryError {
  if (error instanceof InventoryError) return error;

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
  if (
    pgError?.message?.includes("scrapped") ||
    pgError?.message?.includes("Illegal equipment status transition")
  ) {
    return new ConflictError(pgError.message ?? `${entity}'s status transition is not allowed.`);
  }
  if (pgError?.message?.includes("not found")) {
    return new NotFoundError(entity);
  }

  throw error;
}
