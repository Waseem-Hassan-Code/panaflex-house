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
  FormControlLabel,
  Switch,
} from "@mui/material";
import { toast } from "sonner";
import { Client } from "@/types";

interface EditClientDialogProps {
  open: boolean;
  onClose: () => void;
  client: Client;
  onSuccess: () => void;
}

export default function EditClientDialog({
  open,
  onClose,
  client,
  onSuccess,
}: EditClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    cnic: "",
    isActive: true,
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || "",
        phone: client.phone || "",
        email: client.email || "",
        address: client.address || "",
        cnic: client.cnic || "",
        isActive: client.isActive,
      });
    }
  }, [client]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      setError("Name and phone are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update client");
      }

      toast.success("Client updated successfully");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Client - {client?.clientId}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextField
            label="Name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Phone"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            fullWidth
          />
          <TextField
            label="Address"
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
          <TextField
            label="CNIC"
            value={formData.cnic}
            onChange={(e) => handleChange("cnic", e.target.value)}
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => handleChange("isActive", e.target.checked)}
              />
            }
            label="Active"
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
