"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/crm/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { customerService } from "@/modules/crm/services/customer-service";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersInput,
  CreateCustomerContactInput,
  UpdateCustomerContactInput,
} from "@/modules/crm/schemas/customer-schema";
import type { CustomerRow, CustomerContactRow } from "@/modules/crm/repositories/customer-repository";

function revalidateCustomers(id?: string) {
  revalidatePath("/crm/customers");
  if (id) revalidatePath(`/crm/customers/${id}`);
}

export async function createCustomerAction(input: CreateCustomerInput): Promise<ActionResult<CustomerRow>> {
  const result = await runAction(() => customerService.createCustomer(input));
  revalidateCustomers();
  return result;
}

export async function updateCustomerAction(
  id: string,
  input: UpdateCustomerInput
): Promise<ActionResult<CustomerRow>> {
  const result = await runAction(() => customerService.updateCustomer(id, input));
  revalidateCustomers(id);
  return result;
}

export async function getCustomerAction(id: string): Promise<ActionResult<CustomerRow>> {
  return runAction(() => customerService.getCustomer(id));
}

export async function listCustomersAction(
  filters: ListCustomersInput
): Promise<ActionResult<CustomerRow[]>> {
  return runAction(() => customerService.listCustomers(filters));
}

export async function deleteCustomerAction(id: string): Promise<ActionResult<void>> {
  const result = await runAction(() => customerService.deleteCustomer(id));
  revalidateCustomers();
  return result;
}

export async function listContactsAction(customerId: string): Promise<ActionResult<CustomerContactRow[]>> {
  return runAction(() => customerService.listContacts(customerId));
}

export async function addContactAction(
  customerId: string,
  input: CreateCustomerContactInput
): Promise<ActionResult<CustomerContactRow>> {
  const result = await runAction(() => customerService.addContact(customerId, input));
  revalidateCustomers(customerId);
  return result;
}

export async function updateContactAction(
  id: string,
  customerId: string,
  input: UpdateCustomerContactInput
): Promise<ActionResult<CustomerContactRow>> {
  const result = await runAction(() => customerService.updateContact(id, input));
  revalidateCustomers(customerId);
  return result;
}

export async function removeContactAction(id: string, customerId: string): Promise<ActionResult<void>> {
  const result = await runAction(() => customerService.removeContact(id));
  revalidateCustomers(customerId);
  return result;
}
