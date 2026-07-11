import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { EmployeeTable } from "@/modules/hr/components/employees/employee-table";
import type { EmployeeRow } from "@/modules/hr/repositories/employee-repository";

export default async function HrPage() {
  await requirePermission("hr.view");

  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("crew_members")
    .select(
      "id, full_name, role, phone, email, is_active, employee_number, hire_date, employment_type, base_salary, salary_currency_code, hr_status, termination_date, notes, created_at, updated_at"
    )
    .is("deleted_at", null)
    .order("full_name");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">HR</h1>
        <p className="text-muted-foreground text-sm">
          Employee records, leave, payroll, and performance. The directory entry itself
          (name/role/contact) is managed from Planning &rsaquo; Crew.
        </p>
      </div>
      <EmployeeTable employees={(employees ?? []) as EmployeeRow[]} />
    </div>
  );
}
