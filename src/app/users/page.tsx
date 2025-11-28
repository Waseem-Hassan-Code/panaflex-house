"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  CircularProgress,
  Pagination,
} from "@mui/material";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout";
import { useAppSelector } from "@/store";
import { hasPermission, Permission } from "@/lib/permissions";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const { t } = useTranslation("common");
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "VIEWER",
    phone: "",
  });

  const canCreate =
    currentUser?.role &&
    hasPermission(currentUser.role, Permission.CREATE_USER);
  const canEdit =
    currentUser?.role &&
    hasPermission(currentUser.role, Permission.UPDATE_USER);
  const canDelete =
    currentUser?.role &&
    hasPermission(currentUser.role, Permission.DELETE_USER);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/users?page=${page}&search=${search}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role,
        phone: user.phone || "",
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "VIEWER",
        phone: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async () => {
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      const body = editingUser
        ? {
            name: formData.name,
            role: formData.role,
            phone: formData.phone,
            ...(formData.password && { password: formData.password }),
          }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        handleCloseDialog();
        fetchUsers();
      }
    } catch (error) {
      console.error("Failed to save user:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
        if (response.ok) {
          fetchUsers();
        }
      } catch (error) {
        console.error("Failed to delete user:", error);
      }
    }
  };

  const roleColors: Record<string, string> = {
    ADMIN: "#f44336",
    MANAGER: "#ff9800",
    OPERATOR: "#2196f3",
    VIEWER: "#9e9e9e",
  };

  return (
    <MainLayout>
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#1a237e" }}>
            {t("common.users")}
          </Typography>
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{
                background: "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
                borderRadius: 2,
              }}
            >
              Add User
            </Button>
          )}
        </Box>

        <Card
          sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
        >
          <CardContent>
            <TextField
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ mb: 3, width: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        {(canEdit || canDelete) && (
                          <TableCell align="right">Actions</TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={user.role}
                              size="small"
                              sx={{
                                backgroundColor: roleColors[user.role],
                                color: "#fff",
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.isActive ? "Active" : "Inactive"}
                              size="small"
                              sx={{
                                backgroundColor: user.isActive
                                  ? "#4caf50"
                                  : "#9e9e9e",
                                color: "#fff",
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          {(canEdit || canDelete) && (
                            <TableCell align="right">
                              {canEdit && (
                                <IconButton
                                  onClick={() => handleOpenDialog(user)}
                                  size="small"
                                >
                                  <EditIcon />
                                </IconButton>
                              )}
                              {canDelete && user.id !== currentUser?.id && (
                                <IconButton
                                  onClick={() => handleDelete(user.id)}
                                  size="small"
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                  />
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={!!editingUser}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label={
                    editingUser
                      ? "New Password (leave blank to keep)"
                      : "Password"
                  }
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  select
                  label="Role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  <MenuItem value="ADMIN">Admin</MenuItem>
                  <MenuItem value="MANAGER">Manager</MenuItem>
                  <MenuItem value="OPERATOR">Operator</MenuItem>
                  <MenuItem value="VIEWER">Viewer</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>
              {editingUser ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
