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
  TextField,
  InputAdornment,
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
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Receipt as ReceiptIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout";
import { useAppSelector } from "@/store";
import { hasPermission, Permission } from "@/lib/permissions";

interface Payment {
  id: string;
  amount: number;
  status: string;
  voucherNumber: string;
  paymentDate: string;
  dueDate?: string;
  description?: string;
  customer: { name: string; phone: string };
  createdBy: { name: string };
}

interface Customer {
  id: string;
  name: string;
}

export default function PaymentsPage() {
  const { t } = useTranslation("common");
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    customerId: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    description: "",
    status: "PENDING",
  });

  const canCreate =
    currentUser?.role &&
    hasPermission(currentUser.role, Permission.CREATE_PAYMENT);

  const fetchPayments = async () => {
    try {
      const response = await fetch(`/api/payments?page=${page}`);
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
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
    fetchPayments();
    fetchCustomers();
  }, [page]);

  const handleSubmit = async () => {
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setDialogOpen(false);
        setFormData({
          customerId: "",
          amount: "",
          paymentDate: new Date().toISOString().split("T")[0],
          dueDate: "",
          description: "",
          status: "PENDING",
        });
        fetchPayments();
      }
    } catch (error) {
      console.error("Failed to create payment:", error);
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: "#ff9800",
    PAID: "#4caf50",
    OVERDUE: "#f44336",
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
            {t("payments.title")}
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
              {t("payments.create_payment")}
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
                        <TableCell>{t("payments.voucher_number")}</TableCell>
                        <TableCell>{t("payments.customer")}</TableCell>
                        <TableCell>{t("payments.amount")}</TableCell>
                        <TableCell>{t("payments.payment_date")}</TableCell>
                        <TableCell>{t("payments.status")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <ReceiptIcon
                                sx={{ color: "#1a237e", fontSize: 20 }}
                              />
                              {payment.voucherNumber}
                            </Box>
                          </TableCell>
                          <TableCell>{payment.customer.name}</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "#1a237e" }}>
                            Rs {payment.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={t(
                                `payments.${payment.status.toLowerCase()}`
                              )}
                              size="small"
                              sx={{
                                backgroundColor: statusColors[payment.status],
                                color: "#fff",
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {payments.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
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

        {/* Add Payment Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{t("payments.create_payment")}</DialogTitle>
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
                  label={t("payments.amount")}
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  select
                  label={t("payments.status")}
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <MenuItem value="PENDING">{t("payments.pending")}</MenuItem>
                  <MenuItem value="PAID">{t("payments.paid")}</MenuItem>
                  <MenuItem value="OVERDUE">{t("payments.overdue")}</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={t("payments.payment_date")}
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentDate: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={t("payments.due_date")}
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label={t("payments.description")}
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
