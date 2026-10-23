import { Check, X } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Quotation } from "@/types";

interface QuotationCardProps {
  quotation: Quotation;
  actions?: React.ReactNode;
}

export function QuotationCard({ quotation, actions }: QuotationCardProps) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 pt-0">
      <span className="role-gradient block h-1 w-full" aria-hidden />
      <CardHeader className="flex-row items-center justify-between space-y-0 pt-5">
        <div>
          <CardTitle className="text-base tracking-tight">
            {quotation.professionalName}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Valid until {formatDate(quotation.validUntil)}
          </p>
        </div>
        <StatusBadge status={quotation.status} kind="quotation" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotation.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.description}</TableCell>
                <TableCell className="text-right">{line.quantity}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(line.unitPrice)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(line.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="space-y-1.5 rounded-xl bg-muted/40 p-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(quotation.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Transport</span>
            <span>{formatCurrency(quotation.transportFee)}</span>
          </div>
          <div className="flex justify-between border-t border-border/70 pt-2 font-semibold text-foreground">
            <span>Total</span>
            <span className="text-base tracking-tight">
              {formatCurrency(quotation.total)}
            </span>
          </div>
        </div>

        {quotation.notes ? (
          <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
            {quotation.notes}
          </p>
        ) : null}

        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}

export function QuotationActions({
  onAccept,
  onReject,
  disabled,
}: {
  onAccept: () => void;
  onReject: () => void;
  disabled?: boolean;
}) {
  return (
    <>
      <Button size="sm" disabled={disabled} onClick={onAccept}>
        <Check className="size-4" aria-hidden />
        Accept
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={onReject}
      >
        <X className="size-4" aria-hidden />
        Decline
      </Button>
    </>
  );
}
