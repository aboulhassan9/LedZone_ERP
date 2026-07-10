"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LifecycleStageBadge, QuoteStatusBadge } from "@/modules/crm/components/status-badge";
import { CustomerFormDialog } from "@/modules/crm/components/customers/customer-form-dialog";
import { ContactFormDialog } from "@/modules/crm/components/customers/contact-form-dialog";
import { useAuth } from "@/providers/auth-provider";
import type { CustomerRow, CustomerContactRow } from "@/modules/crm/repositories/customer-repository";
import type { QuoteRow } from "@/modules/crm/repositories/quote-repository";

export function CustomerDetail({
  customer,
  contacts,
  quotes,
}: {
  customer: CustomerRow;
  contacts: CustomerContactRow[];
  quotes: QuoteRow[];
}) {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("crm.manage") || hasPermission("crm.update");
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {customer.company_name ?? customer.full_name}
            <LifecycleStageBadge stage={customer.lifecycle_stage} />
          </CardTitle>
          {canUpdate && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium">{customer.customer_type === "company" ? "Company" : "Individual"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{customer.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{customer.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Source</dt>
              <dd className="font-medium capitalize">{customer.source?.replace(/_/g, " ") ?? "—"}</dd>
            </div>
          </dl>
          {customer.billing_address && (
            <p className="text-muted-foreground mt-4 text-sm">{customer.billing_address}</p>
          )}
          {customer.notes && <p className="text-muted-foreground mt-2 text-sm">{customer.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Contacts</CardTitle>
          {canUpdate && <ContactFormDialog customerId={customer.id} />}
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No contacts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.role ?? "—"}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{c.is_primary && <Badge variant="outline">Primary</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No quotes yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Valid until</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Link href={`/crm/quotes/${q.id}`} className="font-medium hover:underline">
                        {q.quote_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <QuoteStatusBadge status={q.status} />
                    </TableCell>
                    <TableCell>{q.currency_code}</TableCell>
                    <TableCell>{q.valid_until ? new Date(q.valid_until).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CustomerFormDialog customer={customer} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
