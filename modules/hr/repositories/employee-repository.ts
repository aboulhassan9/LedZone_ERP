import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { UpdateEmployeeHrInfoInput } from "@/modules/hr/schemas/employee-schema";

// Reads/writes the shared `crew_members` table Planning's 0050 migration created (and this
// module's 0074 migration extended). HR only ever touches its own additive columns; it never
// writes full_name/role/phone/email/is_active -- those stay Planning's field via its own
// existing repository.
export type EmployeeRow = {
  id: string;
  full_name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  employee_number: string | null;
  hire_date: string | null;
  employment_type: string | null;
  base_salary: number | null;
  salary_currency_code: string | null;
  hr_status: string;
  termination_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const EMPLOYEE_COLUMNS =
  "id, full_name, role, phone, email, is_active, employee_number, hire_date, employment_type, base_salary, salary_currency_code, hr_status, termination_date, notes, created_at, updated_at";

export const employeeRepository = {
  async findById(id: string): Promise<EmployeeRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("crew_members")
      .select(EMPLOYEE_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async list(): Promise<EmployeeRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("crew_members")
      .select(EMPLOYEE_COLUMNS)
      .is("deleted_at", null)
      .order("full_name");
    if (error) throw error;
    return data ?? [];
  },

  async updateHrInfo(id: string, input: UpdateEmployeeHrInfoInput, userId: string): Promise<EmployeeRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.employeeNumber !== undefined) patch.employee_number = input.employeeNumber;
    if (input.hireDate !== undefined) patch.hire_date = input.hireDate;
    if (input.employmentType !== undefined) patch.employment_type = input.employmentType;
    if (input.baseSalary !== undefined) patch.base_salary = input.baseSalary;
    if (input.salaryCurrencyCode !== undefined) patch.salary_currency_code = input.salaryCurrencyCode;
    if (input.hrStatus !== undefined) patch.hr_status = input.hrStatus;
    if (input.terminationDate !== undefined) patch.termination_date = input.terminationDate;
    if (input.notes !== undefined) patch.notes = input.notes;

    const { data, error } = await supabase
      .from("crew_members")
      .update(patch)
      .eq("id", id)
      .select(EMPLOYEE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
