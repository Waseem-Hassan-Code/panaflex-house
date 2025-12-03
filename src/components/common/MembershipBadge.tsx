"use client";

import { Chip, Tooltip, Box, Typography } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Client } from "@/types";

interface MembershipBadgeProps {
  membershipType?: "FIXED" | "PERCENTAGE" | null;
  membershipDiscount?: number | null;
  size?: "small" | "medium";
  showDiscount?: boolean;
  // New props for client-based usage
  client?: Client;
  showName?: boolean;
}

export default function MembershipBadge({
  membershipType,
  membershipDiscount,
  size = "small",
  showDiscount = true,
  client,
  showName = false,
}: MembershipBadgeProps) {
  // If client is provided, use client's membership info
  const type = client?.membershipType || membershipType;
  const discount = client?.membershipDiscount || membershipDiscount;
  const hasMembership = client?.hasMembership || (!!type && !!discount);

  // Check if membership is valid (not expired)
  const isMembershipValid =
    hasMembership &&
    (!client?.membershipEndDate ||
      new Date(client.membershipEndDate) >= new Date());

  // If showName is true, render name with optional membership badge
  if (showName && client) {
    const isUnverified = client.isVerified === false;

    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography variant="body2">{client.name}</Typography>
        {isUnverified && (
          <Tooltip title="Unverified - Missing phone number" arrow>
            <WarningAmberIcon
              sx={{
                fontSize: 16,
                color: "#ff9800",
              }}
            />
          </Tooltip>
        )}
        {isMembershipValid && (
          <StarIcon
            sx={{
              fontSize: 16,
              color: "#FFD700",
              filter: "drop-shadow(0 0 2px rgba(255, 215, 0, 0.8))",
            }}
          />
        )}
      </Box>
    );
  }

  // Original behavior: just show badge
  if (!isMembershipValid || !type || !discount) return null;

  const discountText =
    type === "PERCENTAGE" ? `${discount}% OFF` : `Rs. ${discount} OFF`;

  return (
    <Tooltip title={`Member Discount: ${discountText}`} arrow>
      <Chip
        icon={<WorkspacePremiumIcon />}
        label={showDiscount ? discountText : "Member"}
        size={size}
        sx={{
          background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
          color: "#000",
          fontWeight: 700,
          fontSize: size === "small" ? "0.7rem" : "0.85rem",
          border: "1px solid #DAA520",
          "& .MuiChip-icon": {
            color: "#B8860B",
          },
          animation: "shimmer 2s infinite",
          "@keyframes shimmer": {
            "0%": { boxShadow: "0 0 5px rgba(255, 215, 0, 0.5)" },
            "50%": { boxShadow: "0 0 15px rgba(255, 215, 0, 0.8)" },
            "100%": { boxShadow: "0 0 5px rgba(255, 215, 0, 0.5)" },
          },
        }}
      />
    </Tooltip>
  );
}

// Inline badge for displaying next to name
export function MembershipInlineBadge({
  hasMembership,
}: {
  hasMembership?: boolean;
}) {
  if (!hasMembership) return null;

  return (
    <Tooltip title="Premium Member" arrow>
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          ml: 0.5,
          verticalAlign: "middle",
        }}
      >
        <StarIcon
          sx={{
            fontSize: 18,
            color: "#FFD700",
            filter: "drop-shadow(0 0 2px rgba(255, 215, 0, 0.8))",
          }}
        />
      </Box>
    </Tooltip>
  );
}
