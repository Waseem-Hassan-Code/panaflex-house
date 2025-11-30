"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PaymentIcon from "@mui/icons-material/Payment";
import PrintIcon from "@mui/icons-material/Print";
import { useRouter } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import StatusBadge from "@/components/common/StatusBadge";
import { MainLayout } from "@/components/layout";
import { Invoice, Client } from "@/types";
import ReceivePaymentDialog from "@/components/dialogs/ReceivePaymentDialog";
import PrintInvoice from "@/components/print/PrintInvoice";

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
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

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

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice_${invoice?.invoiceNumber || "Print"}`,
  });

  const openPrintDialog = () => {
    setShowPrintDialog(true);
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

  if (error || !invoice) {
    return (
      <MainLayout>
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
      </MainLayout>
    );
  }

  return (
    <MainLayout>
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
          onClick={openPrintDialog}
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

      {/* Print Preview Dialog */}
      <Dialog
        open={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Print Invoice</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Preview your invoice before printing
            </Typography>
          </Box>
          <Box
            sx={{
              border: "1px solid #ddd",
              borderRadius: 1,
              overflow: "auto",
              maxHeight: 500,
            }}
          >
            <PrintInvoice
              ref={printRef}
              invoiceNumber={invoice.invoiceNumber}
              invoiceDate={new Date(invoice.invoiceDate).toLocaleDateString()}
              clientName={(invoice.client as Client)?.name || ""}
              clientPhone={(invoice.client as Client)?.phone || ""}
              clientAddress={(invoice.client as Client)?.address || undefined}
              items={(invoice.items || []).map((item, idx) => ({
                sNo: idx + 1,
                itemName: item.itemName,
                width: item.width || 0,
                height: item.height || 0,
                quantity: item.quantity,
                sqf:
                  item.sqf ||
                  (item.width || 0) * (item.height || 0) * item.quantity,
                rate: item.rate,
                amount: item.amount,
              }))}
              itemsSubtotal={invoice.subtotal + (invoice.labourCost || 0)}
              labourCost={invoice.labourCost || 0}
              subtotal={invoice.subtotal}
              previousBalance={invoice.previousBalance || 0}
              totalAmount={invoice.totalAmount}
              paidAmount={invoice.paidAmount}
              discount={invoice.discount || 0}
              balanceDue={invoice.balanceDue}
              payments={(invoice.paymentsReceived || []).map((p) => ({
                receiptNumber: p.receiptNumber || `RCP-${p.id}`,
                amount: p.amount,
                paymentDate: new Date(p.paymentDate).toLocaleDateString(),
                paymentMethod: p.paymentMethod,
              }))}
              showPaymentHistory={true}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPrintDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => {
              handlePrint();
            }}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
