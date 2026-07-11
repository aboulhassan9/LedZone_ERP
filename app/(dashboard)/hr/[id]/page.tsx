import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { EmployeeDetail } from "@/modules/hr/components/employees/employee-detail";
import type { EmployeeRow } from "@/modules/hr/repositories/employee-repository";
import type { LeaveRequestRow } from "@/modules/hr/repositories/leave-request-repository";
import type { PayrollRecordRow } from "@/modules/hr/repositories/payroll-record-repository";
import type { PerformanceReviewRow } from "@/modules/hr/repositories/performance-review-repository";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("hr.view");
  const { id } = await params;

  const supabase = await createClient();
  const { data: employee } = await supabase
    .from("crew_members")
    .select(
      "id, full_name, role, phone, email, is_active, employee_number, hire_date, employment_type, base_salary, salary_currency_code, hr_status, termination_date, notes, created_at, updated_at"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!employee) notFound();

  const [{ data: leaveRequests }, { data: payrollRecords }, { data: performanceReviews }, { data: currencies }] =
    await Promise.all([
      supabase
        .from("leave_requests")
        .select("id, crew_member_id, leave_type, start_date, end_date, status, reason, notes, created_at, updated_at")
        .eq("crew_member_id", id)
        .order("start_date", { ascending: false }),
      supabase
        .from("payroll_records")
        .select("id, crew_member_id, pay_period_start, pay_period_end, gross_amount, deductions, net_amount, currency_code, status, payment_date, notes, created_at, updated_at")
        .eq("crew_member_id", id)
        .order("pay_period_start", { ascending: false }),
      supabase
        .from("performance_reviews")
        .select("id, crew_member_id, review_date, reviewer_id, rating, comments, created_at")
        .eq("crew_member_id", id)
        .order("review_date", { ascending: false }),
      supabase.from("currencies").select("code, name").eq("is_active", true).order("code"),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Employee</h1>
        <p className="text-muted-foreground text-sm">HR record, leave, payroll, and performance history.</p>
      </div>
      <EmployeeDetail
        employee={employee as EmployeeRow}
        leaveRequests={(leaveRequests ?? []) as LeaveRequestRow[]}
        payrollRecords={(payrollRecords ?? []) as PayrollRecordRow[]}
        performanceReviews={(performanceReviews ?? []) as PerformanceReviewRow[]}
        currencies={(currencies ?? []).map((c) => ({ code: c.code, label: `${c.code} — ${c.name}` }))}
      />
    </div>
  );
}
