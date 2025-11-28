"use client";

import { useState } from "react";
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

interface ReceivePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  client: Client;
  invoice: Invoice;
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
  const [amount, setAmount] = useState(invoice.balanceDue.toString());
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const paymentAmount = parseFloat(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (paymentAmount > invoice.balanceDue) {
      setError(
        `Amount cannot exceed balance due (Rs. ${invoice.balanceDue.toLocaleString()})`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments-received", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          invoiceId: invoice.id,
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
      toast.success("Payment Received Successfully!", {
        description: `Receipt: ${
          data.receiptNumber
        } | Amount: Rs. ${paymentAmount.toLocaleString()}`,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error("Failed to receive payment", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

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

          <Box sx={{ bgcolor: "grey.100", p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Invoice
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
            helperText={`Max: Rs. ${invoice.balanceDue.toLocaleString()}`}
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
