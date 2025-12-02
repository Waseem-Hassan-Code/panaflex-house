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
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { toast } from "sonner";
import { PaymentReceived } from "@/types";

interface EditPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  payment: PaymentReceived | null;
  onSuccess: () => void;
}

export default function EditPaymentDialog({
  open,
  onClose,
  payment,
  onSuccess,
}: EditPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    paymentMethod: "CASH",
    reference: "",
    notes: "",
  });

  useEffect(() => {
    if (payment) {
      setFormData({
        paymentMethod: payment.paymentMethod || "CASH",
        reference: payment.reference || "",
        notes: payment.notes || "",
      });
    }
  }, [payment]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payments-received/${payment?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update payment");
      }

      toast.success("Payment updated successfully");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Payment - {payment?.receiptNumber}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextField
            label="Amount"
            value={payment?.amount?.toLocaleString() || 0}
            fullWidth
            disabled
            helperText="Amount cannot be changed. Delete and re-create if needed."
          />

          <FormControl fullWidth>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={formData.paymentMethod}
              label="Payment Method"
              onChange={(e) => handleChange("paymentMethod", e.target.value)}
            >
              <MenuItem value="CASH">Cash</MenuItem>
              <MenuItem value="BANK">Bank Transfer</MenuItem>
              <MenuItem value="CHEQUE">Cheque</MenuItem>
              <MenuItem value="ONLINE">Online</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Reference"
            value={formData.reference}
            onChange={(e) => handleChange("reference", e.target.value)}
            fullWidth
            placeholder="Cheque number, transaction ID, etc."
          />

          <TextField
            label="Notes"
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
}
