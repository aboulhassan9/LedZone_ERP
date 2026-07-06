import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateDamageReportInput,
  CreateLostReportInput,
} from "@/modules/inventory/schemas/incident-schema";

export type EquipmentDamageReportRow = {
  id: string;
  item_id: string;
  description: string;
  severity: string;
  status: string;
  repair_cost: number | null;
  currency_code: string | null;
};

export type EquipmentLostReportRow = {
  id: string;
  item_id: string;
  description: string | null;
  status: string;
  last_known_location_id: string | null;
};

export const incidentRepository = {
  // Both transactional: insert the report AND flip the item's status atomically.
  async createDamageReportViaTransaction(
    input: CreateDamageReportInput
  ): Promise<EquipmentDamageReportRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_damage_report", {
      p_item_id: input.itemId,
      p_description: input.description,
      p_severity: input.severity,
      p_repair_cost: input.repairCost ?? null,
      p_currency_code: input.currencyCode ?? null,
    });
    if (error) throw error;
    return data;
  },

  async createLostReportViaTransaction(
    input: CreateLostReportInput
  ): Promise<EquipmentLostReportRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_lost_report", {
      p_item_id: input.itemId,
      p_description: input.description ?? null,
      p_last_known_location_id: input.lastKnownLocationId ?? null,
    });
    if (error) throw error;
    return data;
  },
};
