import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  SetDepreciationPolicyInput,
  UpdateDepreciationPolicyInput,
} from "@/modules/inventory/schemas/depreciation-schema";

export type EquipmentDepreciationPolicyRow = {
  id: string;
  item_id: string;
  purchase_cost: number;
  purchase_currency: string;
  salvage_value: number;
  salvage_currency: string;
  useful_life_months: number;
  method: string;
  start_date: string;
};

const COLUMNS =
  "id, item_id, purchase_cost, purchase_currency, salvage_value, salvage_currency, useful_life_months, method, start_date";

export const depreciationRepository = {
  async findByItemId(itemId: string): Promise<EquipmentDepreciationPolicyRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_depreciation_policies")
      .select(COLUMNS)
      .eq("item_id", itemId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // "Set" = create-or-replace, since item_id is unique — one policy per item.
  async upsert(
    input: SetDepreciationPolicyInput,
    userId: string
  ): Promise<EquipmentDepreciationPolicyRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_depreciation_policies")
      .upsert(
        {
          item_id: input.itemId,
          purchase_cost: input.purchaseCost,
          purchase_currency: input.purchaseCurrency,
          salvage_value: input.salvageValue,
          salvage_currency: input.salvageCurrency,
          useful_life_months: input.usefulLifeMonths,
          method: input.method,
          start_date: input.startDate,
          created_by: userId,
          updated_by: userId,
        },
        { onConflict: "item_id" }
      )
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    itemId: string,
    input: UpdateDepreciationPolicyInput,
    userId: string
  ): Promise<EquipmentDepreciationPolicyRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_depreciation_policies")
      .update({
        purchase_cost: input.purchaseCost,
        purchase_currency: input.purchaseCurrency,
        salvage_value: input.salvageValue,
        salvage_currency: input.salvageCurrency,
        useful_life_months: input.usefulLifeMonths,
        method: input.method,
        start_date: input.startDate,
        updated_by: userId,
      })
      .eq("item_id", itemId)
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
