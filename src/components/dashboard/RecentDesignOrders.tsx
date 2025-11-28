"use client";

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Box,
} from "@mui/material";
import { DesignServices as DesignIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

interface DesignOrder {
  id: string;
  orderNumber: string;
  squareFeet: number;
  totalAmount: number;
  status: string;
  designDate: string;
  customer: { name: string };
}

interface RecentDesignOrdersProps {
  orders: DesignOrder[];
}

const statusColors: Record<string, string> = {
  PENDING: "#ff9800",
  IN_PROGRESS: "#2196f3",
  COMPLETED: "#4caf50",
  CANCELLED: "#9e9e9e",
};

export default function RecentDesignOrders({
  orders,
}: RecentDesignOrdersProps) {
  const { t } = useTranslation("common");

  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        height: "100%",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: "#1a237e",
            mb: 2,
          }}
        >
          {t("dashboard.recent_design_orders")}
        </Typography>
        {orders.length === 0 ? (
          <Box
            sx={{
              py: 4,
              textAlign: "center",
              color: "text.secondary",
            }}
          >
            {t("common.no_data")}
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {orders.map((order) => (
              <ListItem
                key={order.id}
                sx={{
                  px: 2,
                  py: 1.5,
                  mb: 1,
                  backgroundColor: "#f5f7fa",
                  borderRadius: 2,
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      backgroundColor:
                        (statusColors[order.status] || "#2196f3") + "20",
                      color: statusColors[order.status] || "#2196f3",
                    }}
                  >
                    <DesignIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {order.customer.name}
                      </Typography>
                      <Chip
                        label={order.status}
                        size="small"
                        sx={{
                          backgroundColor:
                            statusColors[order.status] || "#2196f3",
                          color: "#fff",
                          fontSize: "0.7rem",
                          height: 20,
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {order.orderNumber} • {order.squareFeet} sq ft
                    </Typography>
                  }
                />
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    color: "#1a237e",
                  }}
                >
                  Rs {order.totalAmount.toLocaleString()}
                </Typography>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
