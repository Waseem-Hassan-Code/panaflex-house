"use client";

import { useState } from "react";
import { Box, Button, Typography, MenuItem, TextField } from "@mui/material";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import DataGrid, { Column } from "@/components/common/DataGrid";
import StatusBadge from "@/components/common/StatusBadge";
import { MainLayout } from "@/components/layout";
import { Invoice } from "@/types";

export default function InvoicesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchInvoices = async (params: {
    page: number;
    pageSize: number;
    search: string;
    sortBy: string;
    sortOrder: "asc" | "desc";
  }) => {
    const queryParams = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    });

    if (statusFilter) {
      queryParams.append("status", statusFilter);
    }

    const response = await fetch(`/api/invoices?${queryParams}`);
    return response.json();
  };

  const columns: Column<Invoice>[] = [
    {
      id: "invoiceNumber",
      label: "Invoice #",
      minWidth: 120,
    },
    {
      id: "client.clientId",
      label: "Client ID",
      minWidth: 120,
      sortable: false,
    },
    {
      id: "client.name",
      label: "Client Name",
      minWidth: 150,
      sortable: false,
    },
    {
      id: "invoiceDate",
      label: "Date",
      minWidth: 100,
      format: (value) => new Date(value as string).toLocaleDateString(),
    },
    {
      id: "totalAmount",
      label: "Total",
      minWidth: 120,
      align: "right",
      format: (value) => `Rs. ${(value as number).toLocaleString()}`,
    },
    {
      id: "paidAmount",
      label: "Paid",
      minWidth: 120,
      align: "right",
      format: (value) => (
        <Typography color="success.main">
          Rs. {(value as number).toLocaleString()}
        </Typography>
      ),
    },
    {
      id: "balanceDue",
      label: "Balance",
      minWidth: 120,
      align: "right",
      format: (value) => (
        <Typography
          color={(value as number) > 0 ? "error.main" : "success.main"}
        >
          Rs. {(value as number).toLocaleString()}
        </Typography>
      ),
    },
    {
      id: "status",
      label: "Status",
      minWidth: 100,
      format: (value) => <StatusBadge status={value as string} />,
    },
    {
      id: "createdBy.name",
      label: "Created By",
      minWidth: 120,
      sortable: false,
    },
  ];

  return (
    <MainLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Invoices
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
            label="Filter by Status"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="UNPAID">Unpaid</MenuItem>
            <MenuItem value="PARTIAL">Partial</MenuItem>
            <MenuItem value="PAID">Paid</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
          </TextField>
        </Box>
      </Box>

      <DataGrid
        key={statusFilter}
        columns={columns}
        fetchData={fetchInvoices}
        onRowClick={(row) => router.push(`/invoices/${row.id}`)}
        searchPlaceholder="Search by invoice #, client name..."
      />
    </MainLayout>
  );
}
