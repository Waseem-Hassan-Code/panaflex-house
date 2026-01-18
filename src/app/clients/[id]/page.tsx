"use client";

import { useState, useEffect, useCallback, use } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import PaymentIcon from "@mui/icons-material/Payment";
import ReceiptIcon from "@mui/icons-material/Receipt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import StatusBadge from "@/components/common/StatusBadge";
import { MainLayout } from "@/components/layout";
import { Client, Invoice, PaymentReceived } from "@/types";
import ReceivePaymentDialog from "@/components/dialogs/ReceivePaymentDialog";
import CreateInvoiceDialog from "@/components/dialogs/CreateInvoiceDialog";
import EditPaymentDialog from "@/components/dialogs/EditPaymentDialog";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { toast } from "sonner";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showEditPaymentDialog, setShowEditPaymentDialog] = useState(false);
  const [showDeletePaymentDialog, setShowDeletePaymentDialog] = useState(false);
  const [showNoBalanceDialog, setShowNoBalanceDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentReceived | null>(null);
  const [paymentToDelete, setPaymentToDelete] =
    useState<PaymentReceived | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClient = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/clients/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch client");
      }
      const data = await response.json();
      setClient(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const handleReceivePayment = (invoice: Invoice) => {
    // Check if invoice has actual balance due and is not paid from future invoice
    if (
      invoice.balanceDue <= 0 ||
      invoice.balancePaidFromFutureInvoice ||
      invoice.status === "PAID" ||
      invoice.status === "CANCELLED"
    ) {
      setShowNoBalanceDialog(true);
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setShowNoBalanceDialog(false);
      }, 3000);
      return;
    }
    setSelectedInvoice(invoice);
    setShowPaymentDialog(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    setSelectedInvoice(null);
    fetchClient();
  };

  const handleEditPayment = (payment: PaymentReceived) => {
    setSelectedPayment(payment);
    setShowEditPaymentDialog(true);
  };

  const handleEditPaymentSuccess = () => {
    setShowEditPaymentDialog(false);
    setSelectedPayment(null);
    fetchClient();
  };

  const handleDeletePayment = (payment: PaymentReceived) => {
    setPaymentToDelete(payment);
    setShowDeletePaymentDialog(true);
  };

  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/payments-received/${paymentToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete payment");
      }

      toast.success("Payment deleted successfully");
      setShowDeletePaymentDialog(false);
      setPaymentToDelete(null);
      fetchClient();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete payment"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleInvoiceSuccess = () => {
    setShowInvoiceDialog(false);
    fetchClient();
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error || !client) {
    return (
      <MainLayout>
        <Box sx={{ py: 4 }}>
          <Alert severity="error">{error || "Client not found"}</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.back()}
            sx={{ mt: 2 }}
          >
            Go Back
          </Button>
        </Box>
      </MainLayout>
    );
  }

  // Build ledger data (combined invoices and payments)
  const ledgerData: Array<{
    date: Date;
    type: "INVOICE" | "PAYMENT";
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }> = [];

  let runningBalance = 0;

  // Combine and sort by date
  const allTransactions = [
    ...(client.invoices || []).map((inv) => ({
      date: new Date(inv.invoiceDate),
      type: "INVOICE" as const,
      reference: inv.invoiceNumber,
      description: `Invoice - ${inv.items?.length || 0} items`,
      amount: inv.totalAmount,
      id: inv.id,
    })),
    ...(client.paymentsReceived || []).map((pay) => ({
      date: new Date(pay.paymentDate),
      type: "PAYMENT" as const,
      reference: pay.receiptNumber,
      description: `Payment - ${pay.paymentMethod}`,
      amount: pay.amount,
      id: pay.id,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  allTransactions.forEach((tx) => {
    if (tx.type === "INVOICE") {
      runningBalance += tx.amount;
      ledgerData.push({
        date: tx.date,
        type: tx.type,
        reference: tx.reference,
        description: tx.description,
        debit: tx.amount,
        credit: 0,
        balance: runningBalance,
      });
    } else {
      runningBalance -= tx.amount;
      ledgerData.push({
        date: tx.date,
        type: tx.type,
        reference: tx.reference,
        description: tx.description,
        debit: 0,
        credit: tx.amount,
        balance: runningBalance,
      });
    }
  });

  return (
    <MainLayout>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            {client.name}
          </Typography>
          <Typography color="text.secondary">{client.clientId}</Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<PaymentIcon />}
          onClick={() => {
            // Find invoice with actual balance due that's not paid from future invoice
            const unpaidInvoice = client.invoices?.find(
              (inv) =>
                inv.status !== "PAID" &&
                inv.status !== "CANCELLED" &&
                inv.balanceDue > 0 &&
                !inv.balancePaidFromFutureInvoice
            );
            if (unpaidInvoice) {
              handleReceivePayment(unpaidInvoice);
            } else {
              // No invoice with balance due
              setShowNoBalanceDialog(true);
              setTimeout(() => {
                setShowNoBalanceDialog(false);
              }, 3000);
            }
          }}
          disabled={
            !client.invoices?.some(
              (inv) =>
                inv.status !== "PAID" &&
                inv.status !== "CANCELLED" &&
                inv.balanceDue > 0 &&
                !inv.balancePaidFromFutureInvoice
            )
          }
        >
          Receive Payment
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowInvoiceDialog(true)}
        >
          Create Invoice
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Invoiced
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                Rs.{" "}
                {(
                  client.invoices?.reduce(
                    (sum, inv) => sum + inv.totalAmount,
                    0
                  ) || 0
                ).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Paid
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                Rs.{" "}
                {(
                  client.paymentsReceived?.reduce(
                    (sum, pay) => sum + pay.amount,
                    0
                  ) || 0
                ).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Balance Due
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={client.totalBalance! > 0 ? "error.main" : "success.main"}
              >
                Rs. {(client.totalBalance || 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Status
              </Typography>
              <StatusBadge
                status={client.isActive ? "ACTIVE" : "INACTIVE"}
                size="medium"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Client Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Client Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography color="text.secondary">Phone</Typography>
            <Typography fontWeight={500}>{client.phone}</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography color="text.secondary">Email</Typography>
            <Typography fontWeight={500}>{client.email || "-"}</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography color="text.secondary">CNIC</Typography>
            <Typography fontWeight={500}>{client.cnic || "-"}</Typography>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography color="text.secondary">Address</Typography>
            <Typography fontWeight={500}>{client.address || "-"}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ p: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Ledger" />
          <Tab label="Invoices" />
          <Tab label="Payments" />
        </Tabs>

        {/* Ledger Tab */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Reference</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    Debit
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    Credit
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    Balance
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ledgerData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No transactions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgerData.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{entry.date.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={entry.reference}
                          size="small"
                          color={
                            entry.type === "INVOICE" ? "primary" : "success"
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell align="right">
                        {entry.debit > 0
                          ? `Rs. ${entry.debit.toLocaleString()}`
                          : "-"}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "success.main" }}>
                        {entry.credit > 0
                          ? `Rs. ${entry.credit.toLocaleString()}`
                          : "-"}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: "bold",
                          color:
                            entry.balance > 0 ? "error.main" : "success.main",
                        }}
                      >
                        Rs. {entry.balance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Invoices Tab */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Invoice #</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    Total
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    Paid
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    Balance
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!client.invoices || client.invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No invoices yet
                    </TableCell>
                  </TableRow>
                ) : (
                  client.invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Typography fontWeight={500}>
                          {invoice.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        Rs. {invoice.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "success.main" }}>
                        Rs. {invoice.paidAmount.toLocaleString()}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color:
                            invoice.balanceDue > 0
                              ? "error.main"
                              : "success.main",
                        }}
                      >
                        Rs. {invoice.balanceDue.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={invoice.status}
                          balancePaidFromFutureInvoice={
                            invoice.balancePaidFromFutureInvoice
                          }
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            justifyContent: "center",
                          }}
                        >
                          <Tooltip title="View Invoice">
                            <IconButton
                              size="small"
                              onClick={() =>
                                router.push(`/invoices/${invoice.id}`)
                              }
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {invoice.status !== "PAID" &&
                            invoice.status !== "CANCELLED" &&
                            !invoice.balancePaidFromFutureInvoice && (
                              <Tooltip title="Receive Payment">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleReceivePayment(invoice)}
                                >
                                  <PaymentIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Payments Tab */}
        <TabPanel value={tabValue} index={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Receipt #</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Invoice</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Method</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    Amount
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Received By</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!client.paymentsReceived ||
                client.paymentsReceived.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No payments yet
                    </TableCell>
                  </TableRow>
                ) : (
                  client.paymentsReceived.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Typography fontWeight={500}>
                          {payment.receiptNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={payment.invoice?.invoiceNumber || "-"}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: "success.main", fontWeight: 500 }}
                      >
                        Rs. {payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{payment.createdBy?.name || "-"}</TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            gap: 0.5,
                            justifyContent: "center",
                          }}
                        >
                          <Tooltip title="Edit Payment">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditPayment(payment)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Payment">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeletePayment(payment)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Dialogs */}
      {showPaymentDialog && selectedInvoice && (
        <ReceivePaymentDialog
          open={showPaymentDialog}
          onClose={() => {
            setShowPaymentDialog(false);
            setSelectedInvoice(null);
          }}
          client={client}
          invoice={selectedInvoice}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {showInvoiceDialog && (
        <CreateInvoiceDialog
          open={showInvoiceDialog}
          onClose={() => setShowInvoiceDialog(false)}
          client={client}
          onSuccess={handleInvoiceSuccess}
        />
      )}

      {showEditPaymentDialog && selectedPayment && (
        <EditPaymentDialog
          open={showEditPaymentDialog}
          onClose={() => {
            setShowEditPaymentDialog(false);
            setSelectedPayment(null);
          }}
          payment={selectedPayment}
          onSuccess={handleEditPaymentSuccess}
        />
      )}

      <ConfirmDialog
        open={showDeletePaymentDialog}
        title="Delete Payment"
        message={`Are you sure you want to delete payment ${paymentToDelete?.receiptNumber}? This will update the invoice balance and cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDeletePayment}
        onCancel={() => {
          setShowDeletePaymentDialog(false);
          setPaymentToDelete(null);
        }}
        loading={deleting}
        confirmColor="error"
      />

      {/* No Balance Dialog */}
      <Dialog
        open={showNoBalanceDialog}
        onClose={() => setShowNoBalanceDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          },
        }}
      >
        <DialogTitle
          sx={{
            textAlign: "center",
            pb: 1,
            pt: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: "success.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PaymentIcon sx={{ fontSize: 32, color: "success.main" }} />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center", pb: 4 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            No Balance to Pay
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            All invoices for this client have been fully paid. There is no
            outstanding balance to receive payment for.
          </Typography>
          <Box
            sx={{
              mt: 3,
              p: 2,
              bgcolor: "success.light",
              borderRadius: 2,
              display: "inline-block",
            }}
          >
            <Typography variant="h6" color="success.dark" fontWeight="bold">
              All Clear! ✓
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
