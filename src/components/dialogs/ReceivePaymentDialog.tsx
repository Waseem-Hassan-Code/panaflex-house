"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  MenuItem,
  Alert,
  Divider,
} from "@mui/material";
import { toast } from "sonner";
import { Client, Invoice } from "@/types";
import PaymentAllocationAnimation from "@/components/payments/PaymentAllocationAnimation";

interface ReceivePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  client: Client;
  invoice?: Invoice; // Optional: if not provided, payment will be allocated FIFO to all unpaid invoices
  onSuccess: () => void;
}

const paymentMethods = ["CASH", "BANK", "CHEQUE", "ONLINE"];

export default function ReceivePaymentDialog({
  open,
  onClose,
  client,
  invoice,
  onSuccess,
}: ReceivePaymentDialogProps) {
  const [amount, setAmount] = useState(
    invoice?.balanceDue.toString() || "0"
  );
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllocation, setShowAllocation] = useState(false);
  const [allocationData, setAllocationData] = useState<{
    allocations: Array<{
      invoiceId: string;
      invoiceNumber: string;
      amountApplied: number;
      previousBalance: number;
      newBalance: number;
      newStatus: string;
    }>;
    totalAllocated: number;
    creditAdded: number;
  } | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setAmount(invoice?.balanceDue.toString() || "0");
      setShowAllocation(false);
      setAllocationData(null);
      setError(null);
    }
  }, [open, invoice]);

  const handleSubmit = async () => {
    const paymentAmount = parseFloat(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    // Allow overpayments - they will be added to client's credit balance
    // Removed validation that prevented overpayments

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments-received", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          invoiceId: invoice?.id, // Optional: for backward compatibility
          amount: paymentAmount,
          paymentMethod,
          reference,
          notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to receive payment");
      }

      const data = await response.json();
      
      // Show allocation animation if there are allocations
      if (data.allocations && data.allocations.length > 0) {
        setAllocationData({
          allocations: data.allocations,
          totalAllocated: data.totalAllocated || 0,
          creditAdded: data.creditAdded || 0,
        });
        setShowAllocation(true);
      } else {
        toast.success("Payment Received Successfully!", {
          description: `Receipt: ${
            data.payment?.receiptNumber || data.receiptNumber
          } | Amount: Rs. ${paymentAmount.toLocaleString()}${
            data.creditAdded > 0
              ? ` | Credit: Rs. ${data.creditAdded.toLocaleString()}`
              : ""
          }`,
        });
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error("Failed to receive payment", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAllocationComplete = () => {
    toast.success("Payment Received Successfully!", {
      description: `Receipt: ${
        allocationData?.allocations[0]?.invoiceNumber || "Payment"
      } | Amount: Rs. ${parseFloat(amount).toLocaleString()}${
        allocationData && allocationData.creditAdded > 0
          ? ` | Credit: Rs. ${allocationData.creditAdded.toLocaleString()}`
          : ""
      }`,
    });
    onSuccess();
    setTimeout(() => {
      onClose();
    }, 500);
  };

  if (showAllocation && allocationData) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Payment Allocation</DialogTitle>
        <DialogContent>
          <PaymentAllocationAnimation
            allocations={allocationData.allocations}
            totalAllocated={allocationData.totalAllocated}
            creditAdded={allocationData.creditAdded}
            totalAmount={parseFloat(amount)}
            onComplete={handleAllocationComplete}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Receive Payment</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ bgcolor: "grey.100", p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Client
            </Typography>
            <Typography fontWeight={500}>
              {client.clientId} - {client.name}
            </Typography>
          </Box>

          {invoice && (
            <Box sx={{ bgcolor: "grey.100", p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Invoice (Optional - Payment will be allocated FIFO to all unpaid
                invoices)
              </Typography>
              <Typography fontWeight={500}>{invoice.invoiceNumber}</Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Total Amount:</Typography>
                <Typography variant="body2" fontWeight={500}>
                  Rs. {invoice.totalAmount.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Paid Amount:</Typography>
                <Typography variant="body2" color="success.main">
                  Rs. {invoice.paidAmount.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" fontWeight={500}>
                  Balance Due:
                </Typography>
                <Typography variant="body2" color="error.main" fontWeight={500}>
                  Rs. {invoice.balanceDue.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}

          {!invoice && (
            <Alert severity="info">
              Payment will be allocated to unpaid invoices using FIFO (First-In-First-Out)
              method, starting from the oldest invoice.
            </Alert>
          )}

          <TextField
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            fullWidth
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>Rs.</Typography>,
            }}
            helperText={
              invoice
                ? `Balance: Rs. ${invoice.balanceDue.toLocaleString()} (overpayments will be added to credit balance)`
                : "Payment will be allocated to unpaid invoices (FIFO). Overpayments will be added to credit balance."
            }
          />

          <TextField
            select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            fullWidth
          >
            {paymentMethods.map((method) => (
              <MenuItem key={method} value={method}>
                {method}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Reference (Cheque #, Transaction ID, etc.)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            fullWidth
          />

          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmit}
          disabled={loading || !amount}
        >
          {loading ? "Processing..." : "Receive Payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
