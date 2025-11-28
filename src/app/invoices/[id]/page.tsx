"use client";

import { useState, useEffect, useCallback, use } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PaymentIcon from "@mui/icons-material/Payment";
import PrintIcon from "@mui/icons-material/Print";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/common/StatusBadge";
import { Invoice, Client } from "@/types";
import ReceivePaymentDialog from "@/components/dialogs/ReceivePaymentDialog";

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch invoice");
      }
      const data = await response.json();
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    fetchInvoice();
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !invoice) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error">{error || "Invoice not found"}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.back()}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}
        className="no-print"
      >
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            {invoice.invoiceNumber}
          </Typography>
          <Typography color="text.secondary">
            {new Date(invoice.invoiceDate).toLocaleDateString()}
          </Typography>
        </Box>
        <StatusBadge status={invoice.status} size="medium" />
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          Print
        </Button>
        {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
          <Button
            variant="contained"
            color="success"
            startIcon={<PaymentIcon />}
            onClick={() => setShowPaymentDialog(true)}
          >
            Receive Payment
          </Button>
        )}
      </Box>

      {/* Invoice Content */}
      <Paper sx={{ p: 4, mb: 3 }} className="print-content">
        {/* Company Header */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" color="primary">
            PANAFLEX HOUSE
          </Typography>
          <Typography color="text.secondary">
            Professional Printing & Design Services
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Invoice Header */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Bill To:
            </Typography>
            <Typography variant="h6" fontWeight={500}>
              {invoice.client?.name}
            </Typography>
            <Typography>{invoice.client?.clientId}</Typography>
            <Typography>{invoice.client?.phone}</Typography>
            {invoice.client?.address && (
              <Typography>{invoice.client.address}</Typography>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: { md: "right" } }}>
            <Typography variant="h5" fontWeight="bold">
              INVOICE
            </Typography>
            <Typography>
              <strong>Invoice #:</strong> {invoice.invoiceNumber}
            </Typography>
            <Typography>
              <strong>Date:</strong>{" "}
              {new Date(invoice.invoiceDate).toLocaleDateString()}
            </Typography>
            {invoice.dueDate && (
              <Typography>
                <strong>Due Date:</strong>{" "}
                {new Date(invoice.dueDate).toLocaleDateString()}
              </Typography>
            )}
          </Grid>
        </Grid>

        {/* Items Table */}
        <TableContainer sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell sx={{ fontWeight: "bold" }}>S.No</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Item</TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="right">
                  Width
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="right">
                  Height
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="right">
                  Qty
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="right">
                  SQF
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="right">
                  Rate
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="right">
                  Amount
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.sNo}</TableCell>
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell align="right">{item.width}</TableCell>
                  <TableCell align="right">{item.height}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">{item.sqf.toFixed(2)}</TableCell>
                  <TableCell align="right">{item.rate}</TableCell>
                  <TableCell align="right">
                    {item.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Totals */}
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Box sx={{ minWidth: 300 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography>Subtotal:</Typography>
              <Typography>Rs. {invoice.subtotal.toLocaleString()}</Typography>
            </Box>
            {invoice.previousBalance > 0 && (
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography color="error.main">Previous Balance:</Typography>
                <Typography color="error.main">
                  Rs. {invoice.previousBalance.toLocaleString()}
                </Typography>
              </Box>
            )}
            <Divider sx={{ my: 1 }} />
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6" fontWeight="bold">
                Rs. {invoice.totalAmount.toLocaleString()}
              </Typography>
            </Box>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography color="success.main">Paid:</Typography>
              <Typography color="success.main">
                Rs. {invoice.paidAmount.toLocaleString()}
              </Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="h6" color="error.main">
                Balance Due:
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="error.main">
                Rs. {invoice.balanceDue.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Box>

        {invoice.notes && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Notes:
            </Typography>
            <Typography>{invoice.notes}</Typography>
          </Box>
        )}

        {/* Previous Invoice Reference */}
        {invoice.previousInvoice && (
          <Box sx={{ mt: 3 }}>
            <Chip
              label={`Previous balance from: ${invoice.previousInvoice.invoiceNumber}`}
              color="warning"
              size="small"
            />
          </Box>
        )}
      </Paper>

      {/* Payment History */}
      <Paper sx={{ p: 3 }} className="no-print">
        <Typography variant="h6" gutterBottom>
          Payment History
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Receipt #</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Method</TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="right">
                  Amount
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Received By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!invoice.paymentsReceived ||
              invoice.paymentsReceived.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No payments received yet
                  </TableCell>
                </TableRow>
              ) : (
                invoice.paymentsReceived.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.receiptNumber}</TableCell>
                    <TableCell>
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                    <TableCell align="right" sx={{ color: "success.main" }}>
                      Rs. {payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{payment.createdBy?.name || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Payment Dialog */}
      {showPaymentDialog && invoice.client && (
        <ReceivePaymentDialog
          open={showPaymentDialog}
          onClose={() => setShowPaymentDialog(false)}
          client={invoice.client as Client}
          invoice={invoice}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-content {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </Box>
  );
}
