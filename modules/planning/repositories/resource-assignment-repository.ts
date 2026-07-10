import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateCrewMemberInput,
  UpdateCrewMemberInput,
  CreateVehicleInput,
  UpdateVehicleInput,
  AssignCrewInput,
  AssignVehicleInput,
} from "@/modules/planning/schemas/resource-assignment-schema";

export type CrewMemberRow = {
  id: string;
  full_name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
};

export type VehicleRow = {
  id: string;
  name: string;
  plate_number: string | null;
  vehicle_type: string | null;
  capacity_notes: string | null;
  is_active: boolean;
};

export type ResourceAssignmentRow = {
  id: string;
  plan_id: string;
  resource_type: "crew" | "vehicle";
  crew_member_id: string | null;
  vehicle_id: string | null;
  role_or_purpose: string | null;
  scheduled_start_at: string;
  scheduled_end_at: string;
  notes: string | null;
};

const CREW_COLUMNS = "id, full_name, role, phone, email, is_active";
const VEHICLE_COLUMNS = "id, name, plate_number, vehicle_type, capacity_notes, is_active";
const ASSIGNMENT_COLUMNS =
  "id, plan_id, resource_type, crew_member_id, vehicle_id, role_or_purpose, scheduled_start_at, scheduled_end_at, notes";

export const resourceAssignmentRepository = {
  async listCrewMembers(): Promise<CrewMemberRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("crew_members")
      .select(CREW_COLUMNS)
      .is("deleted_at", null)
      .order("full_name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async findCrewMember(id: string): Promise<CrewMemberRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("crew_members")
      .select(CREW_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createCrewMember(input: CreateCrewMemberInput, userId: string): Promise<CrewMemberRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("crew_members")
      .insert({
        full_name: input.fullName,
        role: input.role ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        created_by: userId,
        updated_by: userId,
      })
      .select(CREW_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async updateCrewMember(
    id: string,
    input: UpdateCrewMemberInput,
    userId: string
  ): Promise<CrewMemberRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.fullName !== undefined) patch.full_name = input.fullName;
    if (input.role !== undefined) patch.role = input.role;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.email !== undefined) patch.email = input.email;
    if (input.isActive !== undefined) patch.is_active = input.isActive;

    const { data, error } = await supabase
      .from("crew_members")
      .update(patch)
      .eq("id", id)
      .select(CREW_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async listVehicles(): Promise<VehicleRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicles")
      .select(VEHICLE_COLUMNS)
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async findVehicle(id: string): Promise<VehicleRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicles")
      .select(VEHICLE_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createVehicle(input: CreateVehicleInput, userId: string): Promise<VehicleRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        name: input.name,
        plate_number: input.plateNumber ?? null,
        vehicle_type: input.vehicleType ?? null,
        capacity_notes: input.capacityNotes ?? null,
        created_by: userId,
        updated_by: userId,
      })
      .select(VEHICLE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async updateVehicle(id: string, input: UpdateVehicleInput, userId: string): Promise<VehicleRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.name !== undefined) patch.name = input.name;
    if (input.plateNumber !== undefined) patch.plate_number = input.plateNumber;
    if (input.vehicleType !== undefined) patch.vehicle_type = input.vehicleType;
    if (input.capacityNotes !== undefined) patch.capacity_notes = input.capacityNotes;
    if (input.isActive !== undefined) patch.is_active = input.isActive;

    const { data, error } = await supabase
      .from("vehicles")
      .update(patch)
      .eq("id", id)
      .select(VEHICLE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async findByPlan(planId: string): Promise<ResourceAssignmentRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("resource_assignments")
      .select(ASSIGNMENT_COLUMNS)
      .eq("plan_id", planId);
    if (error) throw error;
    return data ?? [];
  },

  async findAssignment(id: string): Promise<ResourceAssignmentRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("resource_assignments")
      .select(ASSIGNMENT_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async assignCrew(planId: string, input: AssignCrewInput, userId: string): Promise<ResourceAssignmentRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("resource_assignments")
      .insert({
        plan_id: planId,
        resource_type: "crew",
        crew_member_id: input.crewMemberId,
        role_or_purpose: input.roleOrPurpose ?? null,
        scheduled_start_at: input.scheduledStartAt,
        scheduled_end_at: input.scheduledEndAt,
        notes: input.notes ?? null,
        created_by: userId,
        updated_by: userId,
      })
      .select(ASSIGNMENT_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async assignVehicle(
    planId: string,
    input: AssignVehicleInput,
    userId: string
  ): Promise<ResourceAssignmentRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("resource_assignments")
      .insert({
        plan_id: planId,
        resource_type: "vehicle",
        vehicle_id: input.vehicleId,
        role_or_purpose: input.roleOrPurpose ?? null,
        scheduled_start_at: input.scheduledStartAt,
        scheduled_end_at: input.scheduledEndAt,
        notes: input.notes ?? null,
        created_by: userId,
        updated_by: userId,
      })
      .select(ASSIGNMENT_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async removeAssignment(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("resource_assignments").delete().eq("id", id);
    if (error) throw error;
  },
};
