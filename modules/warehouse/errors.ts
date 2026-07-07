// Structured domain errors for the Warehouse Service Layer. Every service function throws
// one of these instead of a generic Error, so callers (Server Actions today, UI/mobile/
// Events/Rentals tomorrow) can branch on `.code` rather than parsing message strings. Mirrors
// modules/inventory/errors.ts's shape, with a few Warehouse-specific subclasses added.

export type WarehouseErrorCode =
  | "VALIDATION_ERROR"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "EQUIPMENT_NOT_AVAILABLE"
  | "LOCATION_NOT_FOUND"
  | "INVALID_TRANSFER_STATE"
  | "INSUFFICIENT_STOCK";

export class WarehouseError extends Error {
  readonly code: WarehouseErrorCode;

  constructor(code: WarehouseErrorCode, message: string) {
    super(message);
    this.name = "WarehouseError";
    this.code = code;
  }
}

export class ValidationError extends WarehouseError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
    this.name = "ValidationError";
  }
}

export class PermissionDeniedError extends WarehouseError {
  constructor(message = "You don't have permission to perform this action.") {
    super("PERMISSION_DENIED", message);
    this.name = "PermissionDeniedError";
  }
}

export class NotFoundError extends WarehouseError {
  constructor(entity: string) {
    super("NOT_FOUND", `${entity} not found.`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends WarehouseError {
  constructor(message: string) {
    super("CONFLICT", message);
    this.name = "ConflictError";
  }
}

// Equipment exists but isn't in a state this operation can act on (wrong current_status,
// already reserved, retired/lost, etc).
export class EquipmentNotAvailableError extends WarehouseError {
  constructor(message: string) {
    super("EQUIPMENT_NOT_AVAILABLE", message);
    this.name = "EquipmentNotAvailableError";
  }
}

// A warehouse_locations node (or its storage_locations bridge) doesn't exist or isn't
// reachable — distinct from NotFoundError so callers can offer "create the bridge" flows.
export class LocationNotFoundError extends WarehouseError {
  constructor(message = "Warehouse location not found.") {
    super("LOCATION_NOT_FOUND", message);
    this.name = "LocationNotFoundError";
  }
}

// A transfer/receiving/dispatch/cycle-count action was attempted from a status that doesn't
// allow it (e.g. approving an already-approved transfer, completing a cancelled one).
export class InvalidTransferStateError extends WarehouseError {
  constructor(message: string) {
    super("INVALID_TRANSFER_STATE", message);
    this.name = "InvalidTransferStateError";
  }
}

export class InsufficientStockError extends WarehouseError {
  constructor(message: string) {
    super("INSUFFICIENT_STOCK", message);
    this.name = "InsufficientStockError";
  }
}

// Narrows a Postgres/PostgREST error into the right WarehouseError so services never leak
// raw driver errors. Anything unrecognized is re-thrown as-is (a genuine bug to surface).
export function toWarehouseError(error: unknown, entity: string): WarehouseError {
  if (error instanceof WarehouseError) return error;

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
  if (pgError?.message?.includes("no bridged storage_locations row")) {
    return new LocationNotFoundError(pgError.message);
  }
  if (pgError?.message?.includes("not found") || pgError?.message?.includes("does not exist")) {
    return new NotFoundError(entity);
  }

  throw error;
}
