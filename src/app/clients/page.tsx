"use client";

import { useState, useCallback, useMemo } from "react";
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import DataGrid, { Column } from "@/components/common/DataGrid";
import StatusBadge from "@/components/common/StatusBadge";
import MembershipBadge from "@/components/common/MembershipBadge";
import { PhoneInput, CNICInput } from "@/components/common/MaskedInput";
import { MainLayout } from "@/components/layout";
import ManageMembershipDialog from "@/components/dialogs/ManageMembershipDialog";
import UploadRecordsDialog from "@/components/dialogs/UploadRecordsDialog";
import { Client } from "@/types";

export default function ClientsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [openDialog, setOpenDialog] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [membershipClient, setMembershipClient] = useState<Client | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    cnic: "",
    previousBalance: "",
    voucherNumber: "",
  });
  const [previousBalanceExpanded, setPreviousBalanceExpanded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchClients = useCallback(
    async (params: {
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
    },
    []
  );

  const handleEdit = useCallback((client: Client) => {
    setEditClient(client);
    setFormData({
      name: client.name,
      email: client.email || "",
      phone: client.phone,
      address: client.address || "",
      cnic: client.cnic || "",
      previousBalance: "",
      voucherNumber: "",
    });
    setPreviousBalanceExpanded(false);
    setOpenDialog(true);
  }, []);

  const columns: Column<Client>[] = useMemo(
    () => [
      {
        id: "clientId",
        label: "Client ID",
        minWidth: 120,
      },
      {
        id: "name",
        label: "Name",
        minWidth: 180,
        format: (_, row) => <MembershipBadge client={row} showName />,
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
        format: (value) => (
          <StatusBadge status={value ? "ACTIVE" : "INACTIVE"} />
        ),
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
        minWidth: 140,
        align: "center",
        sortable: false,
        format: (_, row) => (
          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
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
            <Tooltip title="Membership">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setMembershipClient(row);
                }}
                sx={{
                  color: row.hasMembership ? "warning.main" : "inherit",
                }}
              >
                <CardMembershipIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [router, handleEdit]
  );

  const handleOpenDialog = () => {
    setEditClient(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      cnic: "",
      previousBalance: "",
      voucherNumber: "",
    });
    setPreviousBalanceExpanded(false);
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

      // Build request body - include previousBalance only for new clients
      const requestBody = {
        ...formData,
        previousBalance:
          !editClient && formData.previousBalance
            ? parseFloat(formData.previousBalance)
            : undefined,
        voucherNumber:
          !editClient && formData.previousBalance
            ? formData.voucherNumber || undefined
            : undefined,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        handleCloseDialog();
        setRefreshKey((k) => k + 1);
        toast.success(
          editClient
            ? `Client "${formData.name}" updated successfully!`
            : `Client "${data.clientId}" created successfully!`,
          {
            description: editClient
              ? "The client information has been updated."
              : `Name: ${formData.name} | Phone: ${formData.phone}`,
          }
        );
      } else {
        const error = await response.json();
        toast.error("Failed to save client", {
          description:
            error.error || "An unexpected error occurred. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error("Connection Error", {
        description:
          "Unable to connect to the server. Please check your connection.",
      });
    }
  };

  return (
    <MainLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          {t("clients.title", "Clients")}
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
            sx={{ borderColor: "#1a237e", color: "#1a237e" }}
          >
            Upload Records
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            {t("clients.addNew", "Add Client")}
          </Button>
        </Box>
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
        onKeyDown={(e) => e.stopPropagation()}
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

            {/* Previous Balance Section - Only show for new clients */}
            {!editClient && (
              <Accordion
                expanded={previousBalanceExpanded}
                onChange={(_, expanded) => setPreviousBalanceExpanded(expanded)}
                sx={{
                  mt: 1,
                  boxShadow: "none",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "8px !important",
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: 48,
                    "& .MuiAccordionSummary-content": { my: 1 },
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Previous Balance (Optional)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <TextField
                      label="Previous Balance"
                      type="number"
                      value={formData.previousBalance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          previousBalance: e.target.value,
                        })
                      }
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">Rs.</InputAdornment>
                        ),
                      }}
                      placeholder="Enter previous balance amount"
                      fullWidth
                    />
                    <TextField
                      label="Voucher Number"
                      value={formData.voucherNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          voucherNumber: e.target.value,
                        })
                      }
                      placeholder="Leave empty for auto-generated"
                      helperText="If left empty, a voucher number will be automatically generated"
                      fullWidth
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
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

      {/* Membership Management Dialog */}
      <ManageMembershipDialog
        open={!!membershipClient}
        client={membershipClient}
        onClose={() => setMembershipClient(null)}
        onSave={() => {
          setRefreshKey((k) => k + 1);
          setMembershipClient(null);
        }}
      />

      {/* Upload Records Dialog */}
      <UploadRecordsDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onSuccess={() => {
          setRefreshKey((k) => k + 1);
          setUploadDialogOpen(false);
        }}
      />
    </MainLayout>
  );
}
