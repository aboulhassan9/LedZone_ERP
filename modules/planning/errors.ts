// Structured domain errors for the Planning Service Layer (Module 4). Mirrors
// modules/warehouse/errors.ts's shape exactly — a third copy of the established pattern
// (see modules/planning/shared/*.ts for the matching decision on authorize/audit/run-action).

export type PlanningErrorCode =
  | "VALIDATION_ERROR"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_PLAN_STATE";

export class PlanningError extends Error {
  readonly code: PlanningErrorCode;

  constructor(code: PlanningErrorCode, message: string) {
    super(message);
    this.name = "PlanningError";
    this.code = code;
  }
}

export class ValidationError extends PlanningError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
    this.name = "ValidationError";
  }
}

export class PermissionDeniedError extends PlanningError {
  constructor(message = "You don't have permission to perform this action.") {
    super("PERMISSION_DENIED", message);
    this.name = "PermissionDeniedError";
  }
}

export class NotFoundError extends PlanningError {
  constructor(entity: string) {
    super("NOT_FOUND", `${entity} not found.`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends PlanningError {
  constructor(message: string) {
    super("CONFLICT", message);
    this.name = "ConflictError";
  }
}

// A workflow transition was attempted from a status that doesn't allow it (e.g. approving a
// plan that isn't ready, preparing one that isn't approved).
export class InvalidPlanStateError extends PlanningError {
  constructor(message: string) {
    super("INVALID_PLAN_STATE", message);
    this.name = "InvalidPlanStateError";
  }
}

// Narrows a Postgres/PostgREST error into the right PlanningError so services never leak raw
// driver errors. Anything unrecognized is re-thrown as-is (a genuine bug to surface). Mirrors
// modules/warehouse/errors.ts's toWarehouseError exactly.
export function toPlanningError(error: unknown, entity: string): PlanningError {
  if (error instanceof PlanningError) return error;

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
  if (
    pgError?.message?.includes("not approved") ||
    pgError?.message?.includes("not ready") ||
    pgError?.message?.includes("not prepared") ||
    pgError?.message?.includes("not loaded") ||
    pgError?.message?.includes("already")
  ) {
    return new InvalidPlanStateError(pgError.message ?? `${entity}'s status doesn't allow this.`);
  }
  if (pgError?.message?.includes("not found") || pgError?.message?.includes("does not exist")) {
    return new NotFoundError(entity);
  }

  throw error;
}
