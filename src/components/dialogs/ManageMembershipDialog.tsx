"use client";

import { useState, useEffect, useRef } from "react";
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
  FormControlLabel,
  Switch,
  Typography,
  Divider,
  InputAdornment,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { Client } from "@/types";
import MembershipCard from "@/components/print/MembershipCard";

interface ManageMembershipDialogProps {
  open: boolean;
  onClose: () => void;
  client: Client | null;
  onSave?: () => void;
  onSuccess?: () => void;
}

export default function ManageMembershipDialog({
  open,
  onClose,
  client,
  onSave,
  onSuccess,
}: ManageMembershipDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    hasMembership: false,
    membershipType: "PERCENTAGE" as "FIXED" | "PERCENTAGE",
    membershipDiscount: 0,
    membershipEndDate: "",
  });

  useEffect(() => {
    if (client) {
      setFormData({
        hasMembership: client.hasMembership || false,
        membershipType:
          (client.membershipType as "FIXED" | "PERCENTAGE") || "PERCENTAGE",
        membershipDiscount: client.membershipDiscount || 0,
        membershipEndDate: client.membershipEndDate
          ? new Date(client.membershipEndDate).toISOString().split("T")[0]
          : "",
      });
    }
  }, [client]);

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!client) return;

    if (formData.hasMembership && formData.membershipDiscount <= 0) {
      setError("Please enter a valid discount amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasMembership: formData.hasMembership,
          membershipType: formData.membershipType,
          membershipDiscount: formData.membershipDiscount,
          membershipEndDate: formData.membershipEndDate || null,
          membershipStartDate:
            formData.hasMembership && !client.membershipStartDate
              ? new Date().toISOString()
              : client.membershipStartDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update membership");
      }

      toast.success(
        formData.hasMembership
          ? "Membership activated successfully!"
          : "Membership deactivated"
      );
      onSave?.();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update membership"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Membership_Card_${client?.clientId}`,
  });

  const discountPreview =
    formData.membershipType === "PERCENTAGE"
      ? `${formData.membershipDiscount}% off on all purchases`
      : `Rs. ${formData.membershipDiscount} off on all purchases`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WorkspacePremiumIcon sx={{ color: "#FFD700" }} />
          <span>Manage Membership - {client?.name}</span>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", gap: 3, mt: 2 }}>
          {/* Form Section */}
          <Box sx={{ flex: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.hasMembership}
                  onChange={(e) =>
                    handleChange("hasMembership", e.target.checked)
                  }
                  color="warning"
                />
              }
              label={
                <Typography fontWeight={600}>
                  {formData.hasMembership
                    ? "Membership Active"
                    : "Activate Membership"}
                </Typography>
              }
            />

            {formData.hasMembership && (
              <Box
                sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 2 }}
              >
                <FormControl fullWidth>
                  <InputLabel>Discount Type</InputLabel>
                  <Select
                    value={formData.membershipType}
                    label="Discount Type"
                    onChange={(e) =>
                      handleChange("membershipType", e.target.value)
                    }
                  >
                    <MenuItem value="PERCENTAGE">Percentage (%)</MenuItem>
                    <MenuItem value="FIXED">Fixed Amount (Rs.)</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label={
                    formData.membershipType === "PERCENTAGE"
                      ? "Discount Percentage"
                      : "Discount Amount"
                  }
                  type="number"
                  value={formData.membershipDiscount}
                  onChange={(e) =>
                    handleChange(
                      "membershipDiscount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {formData.membershipType === "PERCENTAGE" ? "%" : "Rs."}
                      </InputAdornment>
                    ),
                  }}
                  helperText={discountPreview}
                />

                <TextField
                  label="Membership End Date (Optional)"
                  type="date"
                  value={formData.membershipEndDate}
                  onChange={(e) =>
                    handleChange("membershipEndDate", e.target.value)
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  helperText="Leave empty for lifetime membership"
                />
              </Box>
            )}
          </Box>

          {/* Card Preview Section */}
          {formData.hasMembership && formData.membershipDiscount > 0 && (
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Card Preview
              </Typography>
              <Box
                sx={{
                  transform: "scale(0.85)",
                  transformOrigin: "top left",
                }}
              >
                <Box ref={printRef}>
                  <MembershipCard
                    clientId={client?.clientId || ""}
                    clientName={client?.name || ""}
                    phone={client?.phone || ""}
                    membershipCardId={
                      client?.membershipCardId || `MEM-${Date.now()}`
                    }
                    membershipType={formData.membershipType}
                    membershipDiscount={formData.membershipDiscount}
                    membershipStartDate={new Date()}
                    membershipEndDate={
                      formData.membershipEndDate
                        ? new Date(formData.membershipEndDate)
                        : null
                    }
                  />
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        {formData.hasMembership && client?.membershipCardId && (
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => handlePrint()}
          >
            Print Card
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
          color={formData.hasMembership ? "warning" : "primary"}
        >
          {formData.hasMembership ? "Save Membership" : "Remove Membership"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
