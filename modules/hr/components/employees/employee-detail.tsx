"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HrStatusBadge, LeaveStatusBadge, PayrollStatusBadge } from "@/modules/hr/components/status-badge";
import { EmployeeHrInfoDialog, type CurrencyOption } from "@/modules/hr/components/employees/employee-hr-info-dialog";
import { LeaveRequestDialog } from "@/modules/hr/components/employees/leave-request-dialog";
import { PayrollRecordDialog } from "@/modules/hr/components/employees/payroll-record-dialog";
import { PerformanceReviewDialog } from "@/modules/hr/components/employees/performance-review-dialog";
import { formatMoney } from "@/lib/currency";
import { useAuth } from "@/providers/auth-provider";
import {
  setLeaveRequestStatusAction,
  setPayrollRecordStatusAction,
} from "@/modules/hr/actions/employee-actions";
import type { EmployeeRow } from "@/modules/hr/repositories/employee-repository";
import type { LeaveRequestRow } from "@/modules/hr/repositories/leave-request-repository";
import type { PayrollRecordRow } from "@/modules/hr/repositories/payroll-record-repository";
import type { PerformanceReviewRow } from "@/modules/hr/repositories/performance-review-repository";

export function EmployeeDetail({
  employee,
  leaveRequests,
  payrollRecords,
  performanceReviews,
  currencies,
}: {
  employee: EmployeeRow;
  leaveRequests: LeaveRequestRow[];
  payrollRecords: PayrollRecordRow[];
  performanceReviews: PerformanceReviewRow[];
  currencies: CurrencyOption[];
}) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage = hasPermission("hr.manage");
  const canManagePayroll = hasPermission("hr.payroll.manage");

  function afterMutation() {
    queryClient.invalidateQueries({ queryKey: ["employee", employee.id] });
    router.refresh();
  }

  const setLeaveStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" | "cancelled" }) =>
      setLeaveRequestStatusAction(id, employee.id, { status }),
    onSuccess: (result) => {
      if (result.success) afterMutation();
      else toast.error(result.error.message);
    },
  });

  const setPayrollStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "paid" }) =>
      setPayrollRecordStatusAction(id, employee.id, { status }),
    onSuccess: (result) => {
      if (result.success) afterMutation();
      else toast.error(result.error.message);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {employee.full_name}
            <HrStatusBadge status={employee.hr_status} />
          </CardTitle>
          {canManage && <EmployeeHrInfoDialog employee={employee} currencies={currencies} />}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium">{employee.role ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Employee #</dt>
              <dd className="font-medium">{employee.employee_number ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Employment type</dt>
              <dd className="font-medium capitalize">{employee.employment_type?.replace(/_/g, " ") ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Hired</dt>
              <dd className="font-medium">{employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Base salary</dt>
              <dd className="font-medium">
                {employee.base_salary != null && employee.salary_currency_code
                  ? formatMoney(employee.base_salary, employee.salary_currency_code)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{employee.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{employee.phone ?? "—"}</dd>
            </div>
          </dl>
          {employee.notes && <p className="text-muted-foreground mt-4 text-sm">{employee.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Leave requests</CardTitle>
          {canManage && <LeaveRequestDialog employeeId={employee.id} />}
        </CardHeader>
        <CardContent>
          {leaveRequests.length === 0 ? (
            <p className="text-muted-foreground text-sm">No leave requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveRequests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="capitalize">{r.leave_type}</TableCell>
                    <TableCell>
                      {new Date(r.start_date).toLocaleDateString()} – {new Date(r.end_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <LeaveStatusBadge status={r.status} />
                    </TableCell>
                    {canManage && (
                      <TableCell className="flex justify-end gap-1">
                        {r.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={setLeaveStatusMutation.isPending}
                              onClick={() => setLeaveStatusMutation.mutate({ id: r.id, status: "approved" })}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={setLeaveStatusMutation.isPending}
                              onClick={() => setLeaveStatusMutation.mutate({ id: r.id, status: "rejected" })}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {["pending", "approved"].includes(r.status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={setLeaveStatusMutation.isPending}
                            onClick={() => setLeaveStatusMutation.mutate({ id: r.id, status: "cancelled" })}
                          >
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Payroll</CardTitle>
          {canManagePayroll && <PayrollRecordDialog employeeId={employee.id} currencies={currencies} />}
        </CardHeader>
        <CardContent>
          {payrollRecords.length === 0 ? (
            <p className="text-muted-foreground text-sm">No payroll records yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                  {canManagePayroll && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRecords.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {new Date(p.pay_period_start).toLocaleDateString()} – {new Date(p.pay_period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{formatMoney(p.gross_amount, p.currency_code)}</TableCell>
                    <TableCell>{formatMoney(p.deductions, p.currency_code)}</TableCell>
                    <TableCell>{formatMoney(p.net_amount, p.currency_code)}</TableCell>
                    <TableCell>
                      <PayrollStatusBadge status={p.status} />
                    </TableCell>
                    {canManagePayroll && (
                      <TableCell className="flex justify-end gap-1">
                        {p.status === "draft" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={setPayrollStatusMutation.isPending}
                            onClick={() => setPayrollStatusMutation.mutate({ id: p.id, status: "approved" })}
                          >
                            Approve
                          </Button>
                        )}
                        {p.status === "approved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={setPayrollStatusMutation.isPending}
                            onClick={() => setPayrollStatusMutation.mutate({ id: p.id, status: "paid" })}
                          >
                            Mark paid
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Performance reviews</CardTitle>
          {canManage && <PerformanceReviewDialog employeeId={employee.id} />}
        </CardHeader>
        <CardContent>
          {performanceReviews.length === 0 ? (
            <p className="text-muted-foreground text-sm">No performance reviews yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceReviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.review_date).toLocaleDateString()}</TableCell>
                    <TableCell>{r.rating != null ? `${r.rating} / 5` : "—"}</TableCell>
                    <TableCell>{r.comments ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
