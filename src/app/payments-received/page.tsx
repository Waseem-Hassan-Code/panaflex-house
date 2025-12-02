"use client";

import {
  Box,
  Typography,
  MenuItem,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DataGrid, { Column } from "@/components/common/DataGrid";
import { MainLayout } from "@/components/layout";
import EditPaymentDialog from "@/components/dialogs/EditPaymentDialog";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { PaymentReceived } from "@/types";

export default function PaymentsReceivedPage() {
  const router = useRouter();
  const [methodFilter, setMethodFilter] = useState<string>("");
  const [editPayment, setEditPayment] = useState<PaymentReceived | null>(null);
  const [deletePayment, setDeletePayment] = useState<PaymentReceived | null>(
    null
  );
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleDeletePayment = async () => {
    if (!deletePayment) return;

    try {
      const response = await fetch(
        `/api/payments-received/${deletePayment.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success("Payment deleted successfully");
        setRefreshKey((k) => k + 1);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete payment");
      }
    } catch (error) {
      toast.error("Failed to delete payment");
    } finally {
      setDeletePayment(null);
    }
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
    {
      id: "actions",
      label: "Actions",
      minWidth: 120,
      align: "center",
      sortable: false,
      format: (_, row) => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
          <Tooltip title="View Invoice">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/invoices/${row.invoiceId}`);
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setEditPayment(row);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                setDeletePayment(row);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <MainLayout>
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
        key={`${methodFilter}-${refreshKey}`}
        columns={columns}
        fetchData={fetchPayments}
        onRowClick={(row) => router.push(`/invoices/${row.invoiceId}`)}
        searchPlaceholder="Search by receipt #, client name..."
      />

      {/* Edit Payment Dialog */}
      <EditPaymentDialog
        open={!!editPayment}
        payment={editPayment}
        onClose={() => setEditPayment(null)}
        onSuccess={() => {
          setRefreshKey((k) => k + 1);
          setEditPayment(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletePayment}
        title="Delete Payment"
        message={`Are you sure you want to delete payment "${
          deletePayment?.receiptNumber
        }" of Rs. ${deletePayment?.amount?.toLocaleString()}? This will update the invoice balance.`}
        confirmText="Delete"
        confirmColor="error"
        onConfirm={handleDeletePayment}
        onCancel={() => setDeletePayment(null)}
      />
    </MainLayout>
  );
}
