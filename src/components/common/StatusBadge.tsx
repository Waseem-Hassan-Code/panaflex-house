"use client";

import { Chip, Box, Tooltip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

type StatusType =
  | "UNPAID"
  | "PARTIAL"
  | "PAID"
  | "CANCELLED"
  | "ACTIVE"
  | "INACTIVE";

const statusColors: Record<
  StatusType,
  "error" | "warning" | "success" | "default"
> = {
  UNPAID: "error",
  PARTIAL: "warning",
  PAID: "success",
  CANCELLED: "default",
  ACTIVE: "success",
  INACTIVE: "default",
};

interface StatusBadgeProps {
  status: string;
  size?: "small" | "medium";
  balancePaidFromFutureInvoice?: boolean; // Show indicator if balance was paid from a later invoice
}

export default function StatusBadge({
  status,
  size = "small",
  balancePaidFromFutureInvoice = false,
}: StatusBadgeProps) {
  const color = statusColors[status as StatusType] || "default";

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Chip
        label={status}
        color={color}
        size={size}
        sx={{
          fontWeight: 500,
          textTransform: "capitalize",
        }}
      />
      {balancePaidFromFutureInvoice && (
        <Tooltip title="Balance paid from a future invoice">
          <CheckCircleIcon
            sx={{
              color: "success.main",
              fontSize: size === "medium" ? 20 : 16,
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
}
