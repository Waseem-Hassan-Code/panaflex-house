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
import { Payment as PaymentIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

interface Payment {
  id: string;
  amount: number;
  status: string;
  voucherNumber: string;
  paymentDate: string;
  customer: { name: string };
}

interface RecentPaymentsProps {
  payments: Payment[];
}

const statusColors: Record<string, string> = {
  PENDING: "#ff9800",
  PAID: "#4caf50",
  OVERDUE: "#f44336",
  CANCELLED: "#9e9e9e",
};

export default function RecentPayments({ payments }: RecentPaymentsProps) {
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
          {t("dashboard.recent_payments")}
        </Typography>
        {payments.length === 0 ? (
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
            {payments.map((payment) => (
              <ListItem
                key={payment.id}
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
                      backgroundColor: statusColors[payment.status] + "20",
                      color: statusColors[payment.status],
                    }}
                  >
                    <PaymentIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {payment.customer.name}
                      </Typography>
                      <Chip
                        label={payment.status}
                        size="small"
                        sx={{
                          backgroundColor: statusColors[payment.status],
                          color: "#fff",
                          fontSize: "0.7rem",
                          height: 20,
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {payment.voucherNumber} •{" "}
                      {new Date(payment.paymentDate).toLocaleDateString()}
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
                  Rs {payment.amount.toLocaleString()}
                </Typography>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
