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
  Area,
  AreaChart,
} from "recharts";

interface PaymentChartProps {
  data: { date: string; amount: number }[];
  title?: string;
  color?: string;
}

export default function PaymentChart({
  data,
  title = "Daily Payments",
  color = "#1a237e",
}: PaymentChartProps) {
  // Format data for display
  const formattedData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  // Calculate total for display
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        height: "100%",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: color,
            }}
          >
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total:{" "}
            <strong style={{ color }}>Rs. {total.toLocaleString()}</strong>
          </Typography>
        </Box>
        <Box sx={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={formattedData}>
              <defs>
                <linearGradient
                  id={`gradient-${color.replace("#", "")}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#666" }}
                axisLine={{ stroke: "#e0e0e0" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#666" }}
                axisLine={{ stroke: "#e0e0e0" }}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "none",
                  borderRadius: 8,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                }}
                formatter={(value: number) => [
                  `Rs. ${value.toLocaleString()}`,
                  "Amount",
                ]}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${color.replace("#", "")})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
