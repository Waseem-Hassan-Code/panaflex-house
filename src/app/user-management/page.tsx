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
  MenuItem,
  Switch,
  FormControlLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTranslation } from "react-i18next";
import DataGrid, { Column } from "@/components/common/DataGrid";
import StatusBadge from "@/components/common/StatusBadge";
import { User, Role } from "@/types";

const roles: Role[] = ["ADMIN", "MANAGER", "OPERATOR", "VIEWER"];

export default function UserManagementPage() {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "VIEWER" as Role,
    phone: "",
    address: "",
    isActive: true,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchUsers = async (params: {
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

    const response = await fetch(`/api/users?${queryParams}`);
    return response.json();
  };

  const columns: Column<User>[] = [
    {
      id: "name",
      label: t("common.name"),
      minWidth: 150,
    },
    {
      id: "email",
      label: t("common.email"),
      minWidth: 200,
    },
    {
      id: "role",
      label: "Role",
      minWidth: 120,
      format: (value) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color:
              value === "ADMIN"
                ? "error.main"
                : value === "MANAGER"
                ? "warning.main"
                : "text.primary",
          }}
        >
          {value as string}
        </Typography>
      ),
    },
    {
      id: "phone",
      label: t("common.phone"),
      minWidth: 130,
    },
    {
      id: "isActive",
      label: t("common.status"),
      minWidth: 100,
      format: (value) => <StatusBadge status={value ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      id: "createdByUser.name",
      label: "Created By",
      minWidth: 120,
      sortable: false,
    },
    {
      id: "createdAt",
      label: "Created",
      minWidth: 100,
      format: (value) => new Date(value as string).toLocaleDateString(),
    },
    {
      id: "actions",
      label: t("common.actions"),
      minWidth: 120,
      align: "center",
      sortable: false,
      format: (_, row) => (
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
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
          <Tooltip title={row.isActive ? "Deactivate" : "Activate"}>
            <IconButton
              size="small"
              color={row.isActive ? "error" : "success"}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleActive(row);
              }}
            >
              {row.isActive ? (
                <BlockIcon fontSize="small" />
              ) : (
                <CheckCircleIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const handleOpenDialog = () => {
    setEditUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "VIEWER",
      phone: "",
      address: "",
      isActive: true,
    });
    setOpenDialog(true);
  };

  const handleEdit = (user: User) => {
    setEditUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      phone: user.phone || "",
      address: user.address || "",
      isActive: user.isActive,
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditUser(null);
  };

  const handleToggleActive = async (user: User) => {
    try {
      await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Error toggling user status:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
      const method = editUser ? "PUT" : "POST";

      const data = { ...formData };
      if (editUser && !data.password) {
        // Don't send empty password for updates
        const { password, ...rest } = data;
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rest),
        });

        if (response.ok) {
          handleCloseDialog();
          setRefreshKey((k) => k + 1);
        }
      } else {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          handleCloseDialog();
          setRefreshKey((k) => k + 1);
        }
      }
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            User Management
          </Typography>
          <Typography color="text.secondary">
            Manage application users and their permissions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Add User
        </Button>
      </Box>

      <DataGrid
        key={refreshKey}
        columns={columns}
        fetchData={fetchUsers}
        searchPlaceholder="Search by name or email..."
      />

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editUser ? "Edit User" : "Add New User"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label={t("common.name")}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              fullWidth
            />
            <TextField
              label={t("common.email")}
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              fullWidth
              disabled={!!editUser}
            />
            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required={!editUser}
              fullWidth
              helperText={
                editUser ? "Leave blank to keep current password" : ""
              }
            />
            <TextField
              select
              label="Role"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value as Role })
              }
              fullWidth
            >
              {roles.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t("common.phone")}
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              fullWidth
            />
            <TextField
              label={t("common.address")}
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              multiline
              rows={2}
              fullWidth
            />
            {editUser && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                  />
                }
                label="Active"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              !formData.name ||
              !formData.email ||
              (!editUser && !formData.password)
            }
          >
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
