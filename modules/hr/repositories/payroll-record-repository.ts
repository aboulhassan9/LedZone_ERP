import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreatePayrollRecordInput } from "@/modules/hr/schemas/payroll-record-schema";

export type PayrollRecordRow = {
  id: string;
  crew_member_id: string;
  pay_period_start: string;
  pay_period_end: string;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  currency_code: string;
  status: string;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const PAYROLL_COLUMNS =
  "id, crew_member_id, pay_period_start, pay_period_end, gross_amount, deductions, net_amount, currency_code, status, payment_date, notes, created_at, updated_at";

export const payrollRecordRepository = {
  async findById(id: string): Promise<PayrollRecordRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payroll_records")
      .select(PAYROLL_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findByCrewMember(crewMemberId: string): Promise<PayrollRecordRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payroll_records")
      .select(PAYROLL_COLUMNS)
      .eq("crew_member_id", crewMemberId)
      .order("pay_period_start", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(
    crewMemberId: string,
    input: CreatePayrollRecordInput,
    userId: string
  ): Promise<PayrollRecordRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payroll_records")
      .insert({
        crew_member_id: crewMemberId,
        pay_period_start: input.payPeriodStart,
        pay_period_end: input.payPeriodEnd,
        gross_amount: input.grossAmount,
        deductions: input.deductions,
        net_amount: input.grossAmount - input.deductions,
        currency_code: input.currencyCode,
        notes: input.notes ?? null,
        status: "draft",
        created_by: userId,
        updated_by: userId,
      })
      .select(PAYROLL_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async setStatus(id: string, status: string, userId: string): Promise<PayrollRecordRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { status, updated_by: userId };
    if (status === "paid") patch.payment_date = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("payroll_records")
      .update(patch)
      .eq("id", id)
      .select(PAYROLL_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
