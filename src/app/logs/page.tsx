"use client";

import { Box, Typography, MenuItem, TextField, Chip } from "@mui/material";
import { useState } from "react";
import DataGrid, { Column } from "@/components/common/DataGrid";
import { TransactionLog } from "@/types";

const entityTypeColors = {
  CLIENT: "primary",
  INVOICE: "secondary",
  PAYMENT: "success",
  USER: "warning",
} as const;

const actionColors = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "error",
  PAYMENT_RECEIVED: "success",
  STATUS_CHANGE: "warning",
  ACTIVATE: "success",
  DEACTIVATE: "error",
} as const;

export default function TransactionLogsPage() {
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("");

  const fetchLogs = async (params: {
    page: number;
    pageSize: number;
    search: string;
    sortBy: string;
    sortOrder: "asc" | "desc";
  }) => {
    const queryParams = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      sortOrder: params.sortOrder,
    });

    if (entityTypeFilter) {
      queryParams.append("entityType", entityTypeFilter);
    }

    const response = await fetch(`/api/logs?${queryParams}`);
    return response.json();
  };

  const columns: Column<TransactionLog>[] = [
    {
      id: "createdAt",
      label: "Date & Time",
      minWidth: 150,
      format: (value) => {
        const date = new Date(value as string);
        return (
          <Box>
            <Typography variant="body2">{date.toLocaleDateString()}</Typography>
            <Typography variant="caption" color="text.secondary">
              {date.toLocaleTimeString()}
            </Typography>
          </Box>
        );
      },
    },
    {
      id: "entityType",
      label: "Entity Type",
      minWidth: 120,
      format: (value) => (
        <Chip
          label={value as string}
          size="small"
          color={
            entityTypeColors[value as keyof typeof entityTypeColors] ||
            "default"
          }
          variant="outlined"
        />
      ),
    },
    {
      id: "action",
      label: "Action",
      minWidth: 150,
      format: (value) => (
        <Chip
          label={(value as string).replace("_", " ")}
          size="small"
          color={actionColors[value as keyof typeof actionColors] || "default"}
        />
      ),
    },
    {
      id: "details",
      label: "Details",
      minWidth: 300,
      sortable: false,
      format: (value) => {
        const details = value as Record<string, unknown>;
        return (
          <Box>
            {Object.entries(details)
              .slice(0, 3)
              .map(([key, val]) => (
                <Typography key={key} variant="body2">
                  <strong>{key}:</strong> {String(val)}
                </Typography>
              ))}
          </Box>
        );
      },
    },
    {
      id: "user.name",
      label: "User",
      minWidth: 130,
      sortable: false,
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Transaction Logs
          </Typography>
          <Typography color="text.secondary">
            View all system activity and changes
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            select
            size="small"
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            sx={{ minWidth: 150 }}
            label="Filter by Type"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="CLIENT">Client</MenuItem>
            <MenuItem value="INVOICE">Invoice</MenuItem>
            <MenuItem value="PAYMENT">Payment</MenuItem>
            <MenuItem value="USER">User</MenuItem>
          </TextField>
        </Box>
      </Box>

      <DataGrid
        key={entityTypeFilter}
        columns={columns}
        fetchData={fetchLogs}
        searchPlaceholder="Logs are read-only"
        initialSortBy="createdAt"
        initialSortOrder="desc"
      />
    </Box>
  );
}
