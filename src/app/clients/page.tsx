"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import DataGrid, { Column } from "@/components/common/DataGrid";
import StatusBadge from "@/components/common/StatusBadge";
import { PhoneInput, CNICInput } from "@/components/common/MaskedInput";
import { MainLayout } from "@/components/layout";
import { Client } from "@/types";

export default function ClientsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [openDialog, setOpenDialog] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    cnic: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchClients = async (params: {
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

    const response = await fetch(`/api/clients?${queryParams}`);
    return response.json();
  };

  const columns: Column<Client>[] = [
    {
      id: "clientId",
      label: "Client ID",
      minWidth: 120,
    },
    {
      id: "name",
      label: "Name",
      minWidth: 150,
    },
    {
      id: "phone",
      label: "Phone",
      minWidth: 130,
    },
    {
      id: "email",
      label: "Email",
      minWidth: 180,
    },
    {
      id: "totalBalance",
      label: "Balance Due",
      minWidth: 120,
      align: "right",
      format: (value) => `Rs. ${((value as number) || 0).toLocaleString()}`,
    },
    {
      id: "isActive",
      label: "Status",
      minWidth: 100,
      format: (value) => <StatusBadge status={value ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      id: "createdBy.name",
      label: "Created By",
      minWidth: 120,
      sortable: false,
    },
    {
      id: "actions",
      label: "Actions",
      minWidth: 100,
      align: "center",
      sortable: false,
      format: (_, row) => (
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/clients/${row.id}`);
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
                handleEdit(row);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const handleOpenDialog = () => {
    setEditClient(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      cnic: "",
    });
    setOpenDialog(true);
  };

  const handleEdit = (client: Client) => {
    setEditClient(client);
    setFormData({
      name: client.name,
      email: client.email || "",
      phone: client.phone,
      address: client.address || "",
      cnic: client.cnic || "",
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditClient(null);
  };

  const handleSubmit = async () => {
    try {
      const url = editClient ? `/api/clients/${editClient.id}` : "/api/clients";
      const method = editClient ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        handleCloseDialog();
        setRefreshKey((k) => k + 1);
      }
    } catch (error) {
      console.error("Error saving client:", error);
    }
  };

  return (
    <MainLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          {t("clients.title", "Clients")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          {t("clients.addNew", "Add Client")}
        </Button>
      </Box>

      <DataGrid
        key={refreshKey}
        columns={columns}
        fetchData={fetchClients}
        onRowClick={(row) => router.push(`/clients/${row.id}`)}
        searchPlaceholder="Search by name, phone, ID..."
      />

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editClient
            ? t("clients.edit", "Edit Client")
            : t("clients.addNew", "Add Client")}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              fullWidth
            />
            <PhoneInput
              label="Phone"
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="example@email.com"
              fullWidth
            />
            <CNICInput
              label="CNIC"
              value={formData.cnic}
              onChange={(value) => setFormData({ ...formData, cnic: value })}
              fullWidth
            />
            <TextField
              label="Address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.name || !formData.phone}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
