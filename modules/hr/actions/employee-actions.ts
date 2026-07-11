"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/hr/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { employeeService } from "@/modules/hr/services/employee-service";
import type { UpdateEmployeeHrInfoInput } from "@/modules/hr/schemas/employee-schema";
import type {
  CreateLeaveRequestInput,
  SetLeaveRequestStatusInput,
} from "@/modules/hr/schemas/leave-request-schema";
import type {
  CreatePayrollRecordInput,
  SetPayrollRecordStatusInput,
} from "@/modules/hr/schemas/payroll-record-schema";
import type { CreatePerformanceReviewInput } from "@/modules/hr/schemas/performance-review-schema";
import type { EmployeeRow } from "@/modules/hr/repositories/employee-repository";
import type { LeaveRequestRow } from "@/modules/hr/repositories/leave-request-repository";
import type { PayrollRecordRow } from "@/modules/hr/repositories/payroll-record-repository";
import type { PerformanceReviewRow } from "@/modules/hr/repositories/performance-review-repository";

function revalidateHr(id?: string) {
  revalidatePath("/hr");
  if (id) revalidatePath(`/hr/${id}`);
}

export async function getEmployeeAction(id: string): Promise<
  ActionResult<{
    employee: EmployeeRow;
    leaveRequests: LeaveRequestRow[];
    payrollRecords: PayrollRecordRow[];
    performanceReviews: PerformanceReviewRow[];
  }>
> {
  return runAction(() => employeeService.getEmployee(id));
}

export async function listEmployeesAction(): Promise<ActionResult<EmployeeRow[]>> {
  return runAction(() => employeeService.listEmployees());
}

export async function updateEmployeeHrInfoAction(
  id: string,
  input: UpdateEmployeeHrInfoInput
): Promise<ActionResult<EmployeeRow>> {
  const result = await runAction(() => employeeService.updateEmployeeHrInfo(id, input));
  revalidateHr(id);
  return result;
}

export async function listLeaveRequestsAction(): Promise<ActionResult<LeaveRequestRow[]>> {
  return runAction(() => employeeService.listLeaveRequests());
}

export async function createLeaveRequestAction(
  employeeId: string,
  input: CreateLeaveRequestInput
): Promise<ActionResult<LeaveRequestRow>> {
  const result = await runAction(() => employeeService.createLeaveRequest(employeeId, input));
  revalidateHr(employeeId);
  return result;
}

export async function setLeaveRequestStatusAction(
  id: string,
  employeeId: string,
  input: SetLeaveRequestStatusInput
): Promise<ActionResult<LeaveRequestRow>> {
  const result = await runAction(() => employeeService.setLeaveRequestStatus(id, input));
  revalidateHr(employeeId);
  return result;
}

export async function createPayrollRecordAction(
  employeeId: string,
  input: CreatePayrollRecordInput
): Promise<ActionResult<PayrollRecordRow>> {
  const result = await runAction(() => employeeService.createPayrollRecord(employeeId, input));
  revalidateHr(employeeId);
  return result;
}

export async function setPayrollRecordStatusAction(
  id: string,
  employeeId: string,
  input: SetPayrollRecordStatusInput
): Promise<ActionResult<PayrollRecordRow>> {
  const result = await runAction(() => employeeService.setPayrollRecordStatus(id, input));
  revalidateHr(employeeId);
  return result;
}

export async function addPerformanceReviewAction(
  employeeId: string,
  input: CreatePerformanceReviewInput
): Promise<ActionResult<PerformanceReviewRow>> {
  const result = await runAction(() => employeeService.addPerformanceReview(employeeId, input));
  revalidateHr(employeeId);
  return result;
}
