"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  CircularProgress,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import {
  Payment as PaymentIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  AccountBalance as AccountBalanceIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout";
import { StatCard, PaymentChart } from "@/components/dashboard";
import StatusBadge from "@/components/common/StatusBadge";
import { DashboardStats } from "@/types";

export default function DashboardPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "60vh",
          }}
        >
          <CircularProgress sx={{ color: "#1a237e" }} />
        </Box>
      </MainLayout>
    );
  }

  // Demo data for charts if no real data
  const demoPaymentData = stats?.dailyPayments?.length
    ? stats.dailyPayments
    : Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        amount: Math.floor(Math.random() * 50000) + 10000,
      }));

  return (
    <MainLayout>
      <Box>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: "#1a237e",
            mb: 4,
          }}
        >
          {t("dashboard.title")}
        </Typography>

        {/* Stat Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Today's Payments"
              value={`Rs ${(stats?.totalPaymentsToday || 0).toLocaleString()}`}
              icon={<PaymentIcon sx={{ fontSize: 28 }} />}
              color="#4caf50"
              trend={{ value: 12, isPositive: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="This Month's Payments"
              value={`Rs ${(
                stats?.totalPaymentsThisMonth || 0
              ).toLocaleString()}`}
              icon={<PaymentIcon sx={{ fontSize: 28 }} />}
              color="#1a237e"
              trend={{ value: 8, isPositive: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Pending Amount"
              value={`Rs ${(stats?.pendingAmount || 0).toLocaleString()}`}
              icon={<AccountBalanceIcon sx={{ fontSize: 28 }} />}
              color="#f44336"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Active Clients"
              value={stats?.activeClients || 0}
              icon={<PeopleIcon sx={{ fontSize: 28 }} />}
              color="#ff9800"
            />
          </Grid>
        </Grid>

        {/* Charts Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <PaymentChart data={demoPaymentData} />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>
                Quick Stats
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography color="text.secondary">Invoices Today</Typography>
                  <Typography fontWeight={500}>
                    {stats?.totalInvoicesToday || 0}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography color="text.secondary">
                    Invoices This Month
                  </Typography>
                  <Typography fontWeight={500}>
                    {stats?.totalInvoicesThisMonth || 0}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => router.push("/clients")}
                  sx={{ mb: 1 }}
                >
                  Manage Clients
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => router.push("/invoices")}
                >
                  View Invoices
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Recent Activity Row */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Typography variant="h6">Recent Invoices</Typography>
                <Button size="small" onClick={() => router.push("/invoices")}>
                  View All
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(stats?.recentInvoices || [])
                      .slice(0, 5)
                      .map((invoice) => (
                        <TableRow
                          key={invoice.id}
                          hover
                          sx={{ cursor: "pointer" }}
                          onClick={() => router.push(`/invoices/${invoice.id}`)}
                        >
                          <TableCell>{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.client?.name}</TableCell>
                          <TableCell align="right">
                            Rs. {invoice.totalAmount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={invoice.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    {(!stats?.recentInvoices ||
                      stats.recentInvoices.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No invoices yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Typography variant="h6">Recent Payments</Typography>
                <Button
                  size="small"
                  onClick={() => router.push("/payments-received")}
                >
                  View All
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Receipt #</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(stats?.recentPayments || [])
                      .slice(0, 5)
                      .map((payment) => (
                        <TableRow key={payment.id} hover>
                          <TableCell>{payment.receiptNumber}</TableCell>
                          <TableCell>{payment.client?.name}</TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: "success.main" }}
                          >
                            Rs. {payment.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    {(!stats?.recentPayments ||
                      stats.recentPayments.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No payments yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
}
