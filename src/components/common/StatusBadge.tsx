"use client";

import { Chip } from "@mui/material";

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
}

export default function StatusBadge({
  status,
  size = "small",
}: StatusBadgeProps) {
  const color = statusColors[status as StatusType] || "default";

  return (
    <Chip
      label={status}
      color={color}
      size={size}
      sx={{
        fontWeight: 500,
        textTransform: "capitalize",
      }}
    />
  );
}
