"use client";

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  SxProps,
  Theme,
  Chip,
} from "@mui/material";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  count?: number;
  countLabel?: string;
  onClick?: () => void;
  clickable?: boolean;
  sx?: SxProps<Theme>;
}

export default function StatCard({
  title,
  value,
  icon,
  color,
  trend,
  count,
  countLabel,
  onClick,
  clickable = false,
  sx,
}: StatCardProps) {
  return (
    <Card
      onClick={clickable ? onClick : undefined}
      sx={{
        borderRadius: 3,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        height: "100%",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: clickable ? "pointer" : "default",
        position: "relative",
        overflow: "visible",
        "&:hover": {
          transform: clickable ? "translateY(-6px)" : "translateY(-4px)",
          boxShadow: clickable
            ? `0 12px 40px ${color}30`
            : "0 8px 30px rgba(0,0,0,0.12)",
        },
        ...sx,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Count Badge in Corner */}
        {count !== undefined && (
          <Chip
            label={`${count} ${countLabel || ""}`}
            size="small"
            sx={{
              position: "absolute",
              top: -10,
              right: 16,
              bgcolor: color,
              color: "white",
              fontWeight: 600,
              fontSize: "0.75rem",
              height: 24,
              boxShadow: `0 2px 8px ${color}60`,
              "& .MuiChip-label": {
                px: 1.5,
              },
            }}
          />
        )}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontWeight: 500,
                mb: 1,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: "#1a237e",
              }}
            >
              {value}
            </Typography>
            {trend && (
              <Typography
                variant="caption"
                sx={{
                  color: trend.isPositive ? "#4caf50" : "#f44336",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  mt: 1,
                }}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                <span style={{ color: "#666", marginLeft: 4, fontWeight: 400 }}>
                  vs last month
                </span>
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${color}20 0%, ${color}40 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
