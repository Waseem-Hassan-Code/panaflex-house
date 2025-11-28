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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  CircularProgress,
  Pagination,
  Chip,
  MenuItem,
  TextField,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout";
import { useAppSelector } from "@/store";
import { hasPermission, Permission } from "@/lib/permissions";

interface DesignOrder {
  id: string;
  orderNumber: string;
  squareFeet: number;
  pricePerSqFt: number;
  totalAmount: number;
  status: string;
  designDate: string;
  customer: { name: string; phone: string };
  user: { name: string };
}

interface Customer {
  id: string;
  name: string;
}

export default function DesignOrdersPage() {
  const { t } = useTranslation("common");
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [orders, setOrders] = useState<DesignOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    customerId: "",
    squareFeet: "",
    pricePerSqFt: "",
    designDate: new Date().toISOString().split("T")[0],
    description: "",
    status: "PENDING",
  });

  const canCreate =
    currentUser?.role &&
    hasPermission(currentUser.role, Permission.CREATE_DESIGN_ORDER);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`/api/design-orders?page=${page}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.designOrders);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch design orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers?limit=100");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, [page]);

  const handleSubmit = async () => {
    try {
      const response = await fetch("/api/design-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setDialogOpen(false);
        setFormData({
          customerId: "",
          squareFeet: "",
          pricePerSqFt: "",
          designDate: new Date().toISOString().split("T")[0],
          description: "",
          status: "PENDING",
        });
        fetchOrders();
      }
    } catch (error) {
      console.error("Failed to create design order:", error);
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: "#ff9800",
    IN_PROGRESS: "#2196f3",
    COMPLETED: "#4caf50",
    CANCELLED: "#9e9e9e",
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
            {t("design_orders.title")}
          </Typography>
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              sx={{
                background: "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
                borderRadius: 2,
              }}
            >
              {t("design_orders.create_order")}
            </Button>
          )}
        </Box>

        <Card
          sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
        >
          <CardContent>
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
                        <TableCell>{t("design_orders.order_number")}</TableCell>
                        <TableCell>{t("payments.customer")}</TableCell>
                        <TableCell>{t("design_orders.square_feet")}</TableCell>
                        <TableCell>
                          {t("design_orders.price_per_sqft")}
                        </TableCell>
                        <TableCell>{t("design_orders.total_amount")}</TableCell>
                        <TableCell>{t("design_orders.status")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>{order.customer.name}</TableCell>
                          <TableCell>{order.squareFeet} sq ft</TableCell>
                          <TableCell>Rs {order.pricePerSqFt}</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "#1a237e" }}>
                            Rs {order.totalAmount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.status}
                              size="small"
                              sx={{
                                backgroundColor:
                                  statusColors[order.status] || "#2196f3",
                                color: "#fff",
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {orders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            {t("common.no_data")}
                          </TableCell>
                        </TableRow>
                      )}
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

        {/* Add Design Order Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{t("design_orders.create_order")}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  select
                  label={t("payments.customer")}
                  value={formData.customerId}
                  onChange={(e) =>
                    setFormData({ ...formData, customerId: e.target.value })
                  }
                  required
                >
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={t("design_orders.square_feet")}
                  type="number"
                  value={formData.squareFeet}
                  onChange={(e) =>
                    setFormData({ ...formData, squareFeet: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={t("design_orders.price_per_sqft")}
                  type="number"
                  value={formData.pricePerSqFt}
                  onChange={(e) =>
                    setFormData({ ...formData, pricePerSqFt: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={t("design_orders.design_date")}
                  type="date"
                  value={formData.designDate}
                  onChange={(e) =>
                    setFormData({ ...formData, designDate: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  select
                  label={t("design_orders.status")}
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="contained" onClick={handleSubmit}>
              {t("common.create")}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
