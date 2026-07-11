import "server-only";
import { assertPermission } from "@/modules/hr/shared/authorize";
import { logHrAudit } from "@/modules/hr/shared/audit";
import { ConflictError, NotFoundError, toHrError } from "@/modules/hr/errors";
import {
  updateEmployeeHrInfoSchema,
  type UpdateEmployeeHrInfoInput,
} from "@/modules/hr/schemas/employee-schema";
import { employeeRepository, type EmployeeRow } from "@/modules/hr/repositories/employee-repository";
import {
  createLeaveRequestSchema,
  setLeaveRequestStatusSchema,
  type CreateLeaveRequestInput,
  type SetLeaveRequestStatusInput,
} from "@/modules/hr/schemas/leave-request-schema";
import { leaveRequestRepository, type LeaveRequestRow } from "@/modules/hr/repositories/leave-request-repository";
import {
  createPayrollRecordSchema,
  setPayrollRecordStatusSchema,
  type CreatePayrollRecordInput,
  type SetPayrollRecordStatusInput,
} from "@/modules/hr/schemas/payroll-record-schema";
import {
  payrollRecordRepository,
  type PayrollRecordRow,
} from "@/modules/hr/repositories/payroll-record-repository";
import {
  createPerformanceReviewSchema,
  type CreatePerformanceReviewInput,
} from "@/modules/hr/schemas/performance-review-schema";
import {
  performanceReviewRepository,
  type PerformanceReviewRow,
} from "@/modules/hr/repositories/performance-review-repository";

// Leave requests and payroll records are straightforward approval pipelines, not
// physical-state machines -- same proportionate-scope decision made throughout this codebase's
// other status pipelines.
const LEAVE_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "rejected", "cancelled"],
  approved: ["cancelled"],
  rejected: [],
  cancelled: [],
};

const PAYROLL_TRANSITIONS: Record<string, string[]> = {
  draft: ["approved"],
  approved: ["paid"],
  paid: [],
};

async function requireEmployee(id: string): Promise<EmployeeRow> {
  const employee = await employeeRepository.findById(id);
  if (!employee) throw new NotFoundError("Employee");
  return employee;
}

async function getEmployee(id: string): Promise<{
  employee: EmployeeRow;
  leaveRequests: LeaveRequestRow[];
  payrollRecords: PayrollRecordRow[];
  performanceReviews: PerformanceReviewRow[];
}> {
  await assertPermission("hr.view");
  const employee = await requireEmployee(id);
  const [leaveRequests, payrollRecords, performanceReviews] = await Promise.all([
    leaveRequestRepository.findByCrewMember(id),
    payrollRecordRepository.findByCrewMember(id),
    performanceReviewRepository.findByCrewMember(id),
  ]);
  return { employee, leaveRequests, payrollRecords, performanceReviews };
}

async function listEmployees(): Promise<EmployeeRow[]> {
  await assertPermission("hr.view");
  return employeeRepository.list();
}

async function updateEmployeeHrInfo(id: string, input: UpdateEmployeeHrInfoInput): Promise<EmployeeRow> {
  const userId = await assertPermission("hr.manage");
  const parsed = updateEmployeeHrInfoSchema.parse(input);
  await requireEmployee(id);

  try {
    const employee = await employeeRepository.updateHrInfo(id, parsed, userId);
    await logHrAudit("employee.hr_info_updated", "crew_members", id, parsed);
    return employee;
  } catch (error) {
    throw toHrError(error, "Employee");
  }
}

async function requireLeaveRequest(id: string): Promise<LeaveRequestRow> {
  const request = await leaveRequestRepository.findById(id);
  if (!request) throw new NotFoundError("Leave request");
  return request;
}

async function listLeaveRequests(): Promise<LeaveRequestRow[]> {
  await assertPermission("hr.view");
  return leaveRequestRepository.list();
}

async function createLeaveRequest(
  employeeId: string,
  input: CreateLeaveRequestInput
): Promise<LeaveRequestRow> {
  const userId = await assertPermission("hr.manage");
  const parsed = createLeaveRequestSchema.parse(input);
  await requireEmployee(employeeId);

  try {
    const request = await leaveRequestRepository.create(employeeId, parsed, userId);
    await logHrAudit("leave_request.created", "leave_requests", request.id, { employeeId });
    return request;
  } catch (error) {
    throw toHrError(error, "Leave request");
  }
}

async function setLeaveRequestStatus(
  id: string,
  input: SetLeaveRequestStatusInput
): Promise<LeaveRequestRow> {
  const userId = await assertPermission("hr.manage");
  const parsed = setLeaveRequestStatusSchema.parse(input);
  const request = await requireLeaveRequest(id);

  if (!LEAVE_TRANSITIONS[request.status]?.includes(parsed.status)) {
    throw new ConflictError(`Cannot move a "${request.status}" leave request to "${parsed.status}".`);
  }

  try {
    const updated = await leaveRequestRepository.setStatus(id, parsed.status, userId);
    await logHrAudit(`leave_request.${parsed.status}`, "leave_requests", id);
    return updated;
  } catch (error) {
    throw toHrError(error, "Leave request");
  }
}

async function requirePayrollRecord(id: string): Promise<PayrollRecordRow> {
  const record = await payrollRecordRepository.findById(id);
  if (!record) throw new NotFoundError("Payroll record");
  return record;
}

async function createPayrollRecord(
  employeeId: string,
  input: CreatePayrollRecordInput
): Promise<PayrollRecordRow> {
  const userId = await assertPermission("hr.payroll.manage");
  const parsed = createPayrollRecordSchema.parse(input);
  await requireEmployee(employeeId);

  try {
    const record = await payrollRecordRepository.create(employeeId, parsed, userId);
    await logHrAudit("payroll_record.created", "payroll_records", record.id, { employeeId });
    return record;
  } catch (error) {
    throw toHrError(error, "Payroll record");
  }
}

async function setPayrollRecordStatus(
  id: string,
  input: SetPayrollRecordStatusInput
): Promise<PayrollRecordRow> {
  const userId = await assertPermission("hr.payroll.manage");
  const parsed = setPayrollRecordStatusSchema.parse(input);
  const record = await requirePayrollRecord(id);

  if (!PAYROLL_TRANSITIONS[record.status]?.includes(parsed.status)) {
    throw new ConflictError(`Cannot move a "${record.status}" payroll record to "${parsed.status}".`);
  }

  try {
    const updated = await payrollRecordRepository.setStatus(id, parsed.status, userId);
    await logHrAudit(`payroll_record.${parsed.status}`, "payroll_records", id);
    return updated;
  } catch (error) {
    throw toHrError(error, "Payroll record");
  }
}

async function addPerformanceReview(
  employeeId: string,
  input: CreatePerformanceReviewInput
): Promise<PerformanceReviewRow> {
  const userId = await assertPermission("hr.manage");
  const parsed = createPerformanceReviewSchema.parse(input);
  await requireEmployee(employeeId);

  try {
    const review = await performanceReviewRepository.create(employeeId, parsed, userId);
    await logHrAudit("performance_review.added", "performance_reviews", review.id, { employeeId });
    return review;
  } catch (error) {
    throw toHrError(error, "Performance review");
  }
}

export const employeeService = {
  getEmployee,
  listEmployees,
  updateEmployeeHrInfo,
  listLeaveRequests,
  createLeaveRequest,
  setLeaveRequestStatus,
  createPayrollRecord,
  setPayrollRecordStatus,
  addPerformanceReview,
};
