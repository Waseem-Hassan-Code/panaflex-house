"use client";

import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTranslation } from "react-i18next";

interface PaymentChartProps {
  data: { date: string; amount: number }[];
}

export default function PaymentChart({ data }: PaymentChartProps) {
  const { t } = useTranslation("common");

  // Format data for display
  const formattedData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

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
            mb: 3,
          }}
        >
          {t("dashboard.daily_payment_trend")}
        </Typography>
        <Box sx={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#666" }}
                axisLine={{ stroke: "#e0e0e0" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#666" }}
                axisLine={{ stroke: "#e0e0e0" }}
                tickFormatter={(value) => `Rs ${value / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "none",
                  borderRadius: 8,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                }}
                formatter={(value: number) => [
                  `Rs ${value.toLocaleString()}`,
                  "Amount",
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#1a237e"
                strokeWidth={3}
                dot={{ fill: "#1a237e", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#283593" }}
                name="Payment Amount"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
