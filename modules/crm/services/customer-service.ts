import "server-only";
import { assertAnyPermission } from "@/modules/crm/shared/authorize";
import { logCrmAudit } from "@/modules/crm/shared/audit";
import { ConflictError, NotFoundError, toCrmError } from "@/modules/crm/errors";
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersSchema,
  createCustomerContactSchema,
  updateCustomerContactSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type ListCustomersInput,
  type CreateCustomerContactInput,
  type UpdateCustomerContactInput,
} from "@/modules/crm/schemas/customer-schema";
import {
  customerRepository,
  type CustomerRow,
  type CustomerContactRow,
} from "@/modules/crm/repositories/customer-repository";

async function requireCustomer(id: string): Promise<CustomerRow> {
  const customer = await customerRepository.findById(id);
  if (!customer) throw new NotFoundError("Customer");
  return customer;
}

async function createCustomer(input: CreateCustomerInput): Promise<CustomerRow> {
  const userId = await assertAnyPermission(["crm.manage", "crm.create"]);
  const parsed = createCustomerSchema.parse(input);

  try {
    const customer = await customerRepository.create(parsed, userId);
    await logCrmAudit("customer.created", "customers", customer.id, {
      customerType: parsed.customerType,
      lifecycleStage: parsed.lifecycleStage,
    });
    return customer;
  } catch (error) {
    throw toCrmError(error, "Customer");
  }
}

async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<CustomerRow> {
  const userId = await assertAnyPermission(["crm.manage", "crm.update"]);
  const parsed = updateCustomerSchema.parse(input);
  await requireCustomer(id);

  try {
    const customer = await customerRepository.update(id, parsed, userId);
    await logCrmAudit("customer.updated", "customers", id, parsed);
    return customer;
  } catch (error) {
    throw toCrmError(error, "Customer");
  }
}

async function getCustomer(id: string): Promise<CustomerRow> {
  await assertAnyPermission(["crm.manage", "crm.view"]);
  return requireCustomer(id);
}

async function listCustomers(filters: ListCustomersInput): Promise<CustomerRow[]> {
  await assertAnyPermission(["crm.manage", "crm.view"]);
  const parsed = listCustomersSchema.parse(filters);
  return customerRepository.list(parsed);
}

async function deleteCustomer(id: string): Promise<void> {
  const userId = await assertAnyPermission(["crm.manage", "crm.delete"]);
  await requireCustomer(id);

  try {
    await customerRepository.softDelete(id, userId);
    await logCrmAudit("customer.deleted", "customers", id);
  } catch (error) {
    throw toCrmError(error, "Customer");
  }
}

async function listContacts(customerId: string): Promise<CustomerContactRow[]> {
  await assertAnyPermission(["crm.manage", "crm.view"]);
  return customerRepository.findContacts(customerId);
}

async function addContact(
  customerId: string,
  input: CreateCustomerContactInput
): Promise<CustomerContactRow> {
  const userId = await assertAnyPermission(["crm.manage", "crm.create", "crm.update"]);
  const parsed = createCustomerContactSchema.parse(input);
  await requireCustomer(customerId);

  try {
    const contact = await customerRepository.createContact(customerId, parsed, userId);
    await logCrmAudit("customer_contact.added", "customer_contacts", contact.id, { customerId });
    return contact;
  } catch (error) {
    const pgError = error as { code?: string } | null;
    if (pgError?.code === "23505") {
      throw new ConflictError("This customer already has a primary contact.");
    }
    throw toCrmError(error, "Customer contact");
  }
}

async function updateContact(
  id: string,
  input: UpdateCustomerContactInput
): Promise<CustomerContactRow> {
  const userId = await assertAnyPermission(["crm.manage", "crm.update"]);
  const parsed = updateCustomerContactSchema.parse(input);

  try {
    const contact = await customerRepository.updateContact(id, parsed, userId);
    await logCrmAudit("customer_contact.updated", "customer_contacts", id, parsed);
    return contact;
  } catch (error) {
    throw toCrmError(error, "Customer contact");
  }
}

async function removeContact(id: string): Promise<void> {
  await assertAnyPermission(["crm.manage", "crm.update"]);
  await customerRepository.deleteContact(id);
  await logCrmAudit("customer_contact.removed", "customer_contacts", id);
}

export const customerService = {
  createCustomer,
  updateCustomer,
  getCustomer,
  listCustomers,
  deleteCustomer,
  listContacts,
  addContact,
  updateContact,
  removeContact,
};
