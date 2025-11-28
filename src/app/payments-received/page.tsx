"use client";

import { Box, Typography, MenuItem, TextField } from "@mui/material";
import { useState } from "react";
import { useRouter } from "next/navigation";
import DataGrid, { Column } from "@/components/common/DataGrid";
import { PaymentReceived } from "@/types";

export default function PaymentsReceivedPage() {
  const router = useRouter();
  const [methodFilter, setMethodFilter] = useState<string>("");

  const fetchPayments = async (params: {
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

    const response = await fetch(`/api/payments-received?${queryParams}`);
    return response.json();
  };

  const columns: Column<PaymentReceived>[] = [
    {
      id: "receiptNumber",
      label: "Receipt #",
      minWidth: 120,
    },
    {
      id: "paymentDate",
      label: "Date",
      minWidth: 100,
      format: (value) => new Date(value as string).toLocaleDateString(),
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
      id: "invoice.invoiceNumber",
      label: "Invoice #",
      minWidth: 120,
      sortable: false,
    },
    {
      id: "paymentMethod",
      label: "Method",
      minWidth: 100,
    },
    {
      id: "amount",
      label: "Amount",
      minWidth: 120,
      align: "right",
      format: (value) => (
        <Typography color="success.main" fontWeight={500}>
          Rs. {(value as number).toLocaleString()}
        </Typography>
      ),
    },
    {
      id: "createdBy.name",
      label: "Received By",
      minWidth: 120,
      sortable: false,
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Payments Received
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            select
            size="small"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            sx={{ minWidth: 150 }}
            label="Filter by Method"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="CASH">Cash</MenuItem>
            <MenuItem value="BANK">Bank</MenuItem>
            <MenuItem value="CHEQUE">Cheque</MenuItem>
            <MenuItem value="ONLINE">Online</MenuItem>
          </TextField>
        </Box>
      </Box>

      <DataGrid
        key={methodFilter}
        columns={columns}
        fetchData={fetchPayments}
        onRowClick={(row) => router.push(`/invoices/${row.invoiceId}`)}
        searchPlaceholder="Search by receipt #, client name..."
      />
    </Box>
  );
}
