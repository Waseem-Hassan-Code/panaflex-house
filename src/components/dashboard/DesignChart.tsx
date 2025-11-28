"use client";

import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";

interface DesignChartProps {
  data: { date: string; sqFt: number }[];
}

export default function DesignChart({ data }: DesignChartProps) {
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
          {t("dashboard.daily_design_trend")}
        </Typography>
        <Box sx={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={formattedData}>
              <defs>
                <linearGradient id="colorSqFt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#666" }}
                axisLine={{ stroke: "#e0e0e0" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#666" }}
                axisLine={{ stroke: "#e0e0e0" }}
                tickFormatter={(value) => `${value} sq ft`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "none",
                  borderRadius: 8,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                }}
                formatter={(value: number) => [
                  `${value.toLocaleString()} sq ft`,
                  "Area",
                ]}
              />
              <Area
                type="monotone"
                dataKey="sqFt"
                stroke="#4caf50"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSqFt)"
                name="Square Feet"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
