"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  Alert,
  Chip,
  CircularProgress,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Print as PrintIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Receipt as ReceiptIcon,
  History as HistoryIcon,
  AccountBalance as AccountBalanceIcon,
} from "@mui/icons-material";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout";
import { useReactToPrint } from "react-to-print";
import PrintInvoice from "@/components/print/PrintInvoice";
import { formatPhoneWithDash } from "@/lib/phoneUtils";

interface InvoiceItem {
  itemName: string;
  width: number;
  height: number;
  quantity: number;
  rate: number;
}

interface LabourCost {
  description: string;
  amount: number;
}

interface ClientData {
  id: string;
  clientId: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  pendingBalance: number;
  lastInvoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    balanceDue: number;
    createdAt: string;
  } | null;
}

interface InvoiceHistory {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  createdAt: string;
  items: {
    sNo: number;
    itemName: string;
    width: number;
    height: number;
    quantity: number;
    sqf: number;
    rate: number;
    amount: number;
  }[];
  paymentsReceived: {
    id: string;
    receiptNumber: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
  }[];
}

const emptyItem: InvoiceItem = {
  itemName: "",
  width: 0,
  height: 0,
  quantity: 1,
  rate: 0,
};

const emptyLabour: LabourCost = {
  description: "",
  amount: 0,
};

export default function InstantInvoicePage() {
  // Client fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [searchingClient, setSearchingClient] = useState(false);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [isNewClient, setIsNewClient] = useState(false);

  // Invoice items
  const [items, setItems] = useState<InvoiceItem[]>([{ ...emptyItem }]);
  const [labourCosts, setLabourCosts] = useState<LabourCost[]>([]);
  const [notes, setNotes] = useState("");

  // Invoice history navigation
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceHistory[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // General state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  // Print refs
  const printRef = useRef<HTMLDivElement>(null);
  const historyPrintRef = useRef<HTMLDivElement>(null);

  // Search client by phone number
  const searchClientByPhone = useCallback(async (phoneNumber: string) => {
    if (phoneNumber.length < 7) {
      setClientData(null);
      setIsNewClient(false);
      return;
    }

    setSearchingClient(true);
    try {
      const response = await fetch(
        `/api/clients/search-by-phone?phone=${encodeURIComponent(phoneNumber)}`
      );
      const data = await response.json();

      if (data.found) {
        setClientData(data.client);
        setName(data.client.name);
        setIsNewClient(false);
      } else {
        setClientData(null);
        setIsNewClient(true);
      }
    } catch (error) {
      console.error("Error searching client:", error);
    } finally {
      setSearchingClient(false);
    }
  }, []);

  // Debounced phone search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (phone) {
        searchClientByPhone(phone);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [phone, searchClientByPhone]);

  // Load invoice history for client
  const loadInvoiceHistory = async () => {
    if (!clientData) return;

    setLoadingHistory(true);
    try {
      const response = await fetch(
        `/api/clients/${clientData.id}/invoice-history`
      );
      const data = await response.json();
      setInvoiceHistory(data.invoices || []);
      setCurrentHistoryIndex(0);
      setHistoryDialogOpen(true);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load invoice history");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Calculate item values
  const calculateItemSqf = (item: InvoiceItem) =>
    item.width * item.height * item.quantity;
  const calculateItemAmount = (item: InvoiceItem) =>
    calculateItemSqf(item) * item.rate;

  const subtotal = items.reduce(
    (sum, item) => sum + calculateItemAmount(item),
    0
  );
  const previousBalance = clientData?.pendingBalance || 0;
  const totalLabour = labourCosts.reduce((sum, l) => sum + l.amount, 0);
  const totalAmount = subtotal + previousBalance;
  const totalQty = items.reduce((sum, item) => sum + calculateItemSqf(item), 0);

  // Item handlers
  const handleAddItem = () => setItems([...items, { ...emptyItem }]);
  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };
  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: field === "itemName" ? value : parseFloat(String(value)) || 0,
    };
    setItems(newItems);
  };

  // Labour cost handlers
  const handleAddLabour = () =>
    setLabourCosts([...labourCosts, { ...emptyLabour }]);
  const handleRemoveLabour = (index: number) => {
    setLabourCosts(labourCosts.filter((_, i) => i !== index));
  };
  const handleLabourChange = (
    index: number,
    field: keyof LabourCost,
    value: string | number
  ) => {
    const newLabour = [...labourCosts];
    newLabour[index] = {
      ...newLabour[index],
      [field]: field === "description" ? value : parseFloat(String(value)) || 0,
    };
    setLabourCosts(newLabour);
  };

  // Submit invoice
  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter client name");
      return;
    }
    if (!phone.trim()) {
      setError("Please enter phone number");
      return;
    }

    const validItems = items.filter(
      (item) =>
        item.itemName && item.width > 0 && item.height > 0 && item.rate > 0
    );

    if (validItems.length === 0) {
      setError("Please add at least one valid item");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/instant-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          clientId: clientData?.id,
          items: validItems,
          labourCosts: labourCosts.filter((l) => l.description && l.amount > 0),
          notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create invoice");
      }

      const data = await response.json();
      setCreatedInvoice(data);

      toast.success("Invoice Created Successfully!", {
        description: `Invoice: ${
          data.invoiceNumber
        } | Total: Rs. ${totalAmount.toLocaleString()}`,
      });

      // Reset form
      setItems([{ ...emptyItem }]);
      setLabourCosts([]);
      setNotes("");
      setName("");
      setPhone("");
      setClientData(null);
      setIsNewClient(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error("Failed to create invoice", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentHistoryInvoice = invoiceHistory[currentHistoryIndex];

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice_${createdInvoice?.invoiceNumber || "New"}`,
  });

  // Print history invoice handler
  const handlePrintHistory = useReactToPrint({
    contentRef: historyPrintRef,
    documentTitle: `Invoice_${
      currentHistoryInvoice?.invoiceNumber || "History"
    }`,
  });

  // Open print dialog after creating invoice
  const handlePrintNewInvoice = () => {
    if (createdInvoice) {
      setPrintDialogOpen(true);
    }
  };

  return (
    <MainLayout>
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#1a237e" }}>
            Instant Invoice
          </Typography>
          {clientData && (
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={loadInvoiceHistory}
              disabled={loadingHistory}
            >
              {loadingHistory ? "Loading..." : "View Previous Invoices"}
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Invoice Container */}
        <Paper
          ref={printRef}
          sx={{
            p: 3,
            borderRadius: 2,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          {/* Header Section */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "3px solid #1a237e",
              pb: 2,
              mb: 3,
            }}
          >
            <Box>
              <Typography
                variant="h3"
                sx={{ fontWeight: 800, color: "#1a237e" }}
              >
                INVOICE
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Kharian Advertising Agency
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Near Soneri Bank, G.T Road Kharian
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ✉ kharianadvertising@gmail.com
              </Typography>
              <Typography variant="body2" color="text.secondary">
                📞 0300-6313350 | 0331-6313350
              </Typography>
            </Box>
          </Box>

          {/* Client Section */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 3,
              bgcolor: clientData
                ? "#e8f5e9"
                : isNewClient
                ? "#fff3e0"
                : "#f5f5f5",
              borderColor: clientData
                ? "#4caf50"
                : isNewClient
                ? "#ff9800"
                : "#e0e0e0",
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Bill To
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={phone}
                  onChange={(e) => {
                    // Auto-format phone number with dash
                    const input = e.target.value;
                    const formatted = formatPhoneWithDash(input);
                    setPhone(formatted);
                  }}
                  placeholder="0300-1234567"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchingClient ? (
                      <InputAdornment position="end">
                        <CircularProgress size={20} />
                      </InputAdornment>
                    ) : null,
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Client Name"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                {clientData ? (
                  <Box>
                    <Chip
                      icon={<PersonIcon />}
                      label={`Existing: ${clientData.clientId}`}
                      color="success"
                      sx={{ mb: 1 }}
                    />
                    {clientData.pendingBalance > 0 && (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <AccountBalanceIcon
                          sx={{ color: "#f44336", fontSize: 20 }}
                        />
                        <Typography color="error" fontWeight={600}>
                          Pending: Rs.{" "}
                          {clientData.pendingBalance.toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                    {clientData.lastInvoice && (
                      <Typography variant="caption" color="text.secondary">
                        Last Invoice: {clientData.lastInvoice.invoiceNumber}
                      </Typography>
                    )}
                  </Box>
                ) : isNewClient ? (
                  <Chip
                    icon={<PersonIcon />}
                    label="New Client (will be created)"
                    color="warning"
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Enter phone to search client
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* Description Table */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Description
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                  <TableCell sx={{ fontWeight: "bold", width: 60 }}>
                    S No.
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Items</TableCell>
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
                  <TableCell
                    align="center"
                    sx={{ width: 50 }}
                    className="no-print"
                  ></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => {
                  const sqf = calculateItemSqf(item);
                  const amount = calculateItemAmount(item);
                  return (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          variant="standard"
                          placeholder="Item name"
                          value={item.itemName}
                          onChange={(e) =>
                            handleItemChange(index, "itemName", e.target.value)
                          }
                          fullWidth
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          variant="standard"
                          type="number"
                          value={item.width || ""}
                          onChange={(e) =>
                            handleItemChange(index, "width", e.target.value)
                          }
                          sx={{ width: 70 }}
                          inputProps={{ min: 0, step: 0.5 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          variant="standard"
                          type="number"
                          value={item.height || ""}
                          onChange={(e) =>
                            handleItemChange(index, "height", e.target.value)
                          }
                          sx={{ width: 70 }}
                          inputProps={{ min: 0, step: 0.5 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          variant="standard"
                          type="number"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", e.target.value)
                          }
                          sx={{ width: 50 }}
                          inputProps={{ min: 1 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{ color: "#4caf50", fontWeight: 500 }}
                        >
                          {sqf.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          variant="standard"
                          type="number"
                          value={item.rate || ""}
                          onChange={(e) =>
                            handleItemChange(index, "rate", e.target.value)
                          }
                          sx={{ width: 70 }}
                          inputProps={{ min: 0 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600}>
                          {amount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" className="no-print">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length === 1}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Empty rows for print layout */}
                {Array.from({ length: Math.max(0, 11 - items.length) }).map(
                  (_, i) => (
                    <TableRow key={`empty-${i}`}>
                      <TableCell>{items.length + i + 1}</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell align="right">
                        <Typography sx={{ color: "#4caf50" }}>0</Typography>
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell align="right">0</TableCell>
                      <TableCell className="no-print"></TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Button
            startIcon={<AddIcon />}
            onClick={handleAddItem}
            variant="outlined"
            size="small"
            sx={{ mb: 3 }}
            className="no-print"
          >
            Add Item
          </Button>

          {/* Totals Section */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              {/* Labour Costs Section */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    Labour Cost (Not included in invoice total)
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddLabour}
                    className="no-print"
                  >
                    Add
                  </Button>
                </Box>
                {labourCosts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No labour costs added
                  </Typography>
                ) : (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {labourCosts.map((labour, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <TextField
                          size="small"
                          placeholder="Description"
                          value={labour.description}
                          onChange={(e) =>
                            handleLabourChange(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          size="small"
                          type="number"
                          placeholder="Amount"
                          value={labour.amount || ""}
                          onChange={(e) =>
                            handleLabourChange(index, "amount", e.target.value)
                          }
                          sx={{ width: 120 }}
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveLabour(index)}
                          className="no-print"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    <Divider sx={{ my: 1 }} />
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography fontWeight={600}>Total Labour:</Typography>
                      <Typography fontWeight={600} color="primary">
                        Rs. {totalLabour.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Paper>

              {/* Bank Details */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Saghir Abbas
                </Typography>
                <Typography variant="body2">0713 214023659</Typography>
                <Typography variant="body2">Bank UBL</Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "#fafafa" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography>Total QTY</Typography>
                  <Typography fontWeight={500}>
                    {totalQty.toFixed(2)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                    bgcolor: "#e3f2fd",
                    p: 1,
                    mx: -1,
                  }}
                >
                  <Typography fontWeight={600}>Total Amount</Typography>
                  <Typography fontWeight={700}>
                    {subtotal.toLocaleString()}
                  </Typography>
                </Box>
                {previousBalance > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography color="error">Prv. Balance</Typography>
                    <Typography color="error" fontWeight={500}>
                      {previousBalance.toLocaleString()}
                    </Typography>
                  </Box>
                )}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography>Sub Total</Typography>
                  <Typography fontWeight={500}>
                    {totalAmount.toLocaleString()}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography>Paid</Typography>
                  <Typography fontWeight={500}>0</Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography>Discount</Typography>
                  <Typography fontWeight={500}>-</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    bgcolor: "#ffebee",
                    p: 1,
                    mx: -1,
                  }}
                >
                  <Typography fontWeight={700}>Balance</Typography>
                  <Typography fontWeight={700} color="error">
                    {totalAmount.toLocaleString()}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Notes */}
          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
              className="no-print"
            />
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              Note*If you have any query about this invoice please contact us at
            </Typography>
            <Typography variant="h6" sx={{ mt: 1, fontWeight: 600 }}>
              Thanks for your Cooperation!
            </Typography>
          </Box>
        </Paper>

        {/* Action Buttons */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
            mt: 3,
          }}
          className="no-print"
        >
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrintNewInvoice}
            disabled={!createdInvoice}
          >
            Print Invoice
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            sx={{
              bgcolor: "#1a237e",
              "&:hover": { bgcolor: "#0d47a1" },
              px: 4,
            }}
          >
            {loading ? "Creating..." : "Generate Invoice"}
          </Button>
        </Box>
      </Box>

      {/* Print Dialog for New Invoice */}
      <Dialog
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, maxHeight: "90vh" },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #1a237e 0%, #3949ab 100%)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PrintIcon />
            <Typography variant="h6">Print Invoice</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => handlePrint()}
            sx={{
              bgcolor: "white",
              color: "#1a237e",
              "&:hover": { bgcolor: "#e3f2fd" },
            }}
          >
            Print
          </Button>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: "auto" }}>
          {createdInvoice && (
            <Box ref={printRef} className="print-container">
              <PrintInvoice
                invoiceNumber={createdInvoice.invoiceNumber}
                invoiceDate={new Date().toLocaleDateString("en-GB")}
                clientName={createdInvoice.clientName || name}
                clientPhone={phone}
                items={
                  createdInvoice.items?.map((item: any, index: number) => ({
                    sNo: index + 1,
                    itemName: item.itemName,
                    width: item.width,
                    height: item.height,
                    quantity: item.quantity,
                    sqf: item.sqf || item.width * item.height * item.quantity,
                    rate: item.rate,
                    amount: item.amount || item.sqf * item.rate,
                  })) || []
                }
                subtotal={createdInvoice.subtotal || subtotal}
                previousBalance={createdInvoice.previousBalance || 0}
                totalAmount={createdInvoice.totalAmount || totalAmount}
                paidAmount={0}
                balanceDue={
                  createdInvoice.balanceDue || createdInvoice.totalAmount
                }
                showPaymentHistory={false}
                notes={notes}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Invoice History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #1a237e 0%, #3949ab 100%)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <HistoryIcon />
            <Typography variant="h6">Invoice History</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              onClick={() =>
                setCurrentHistoryIndex(Math.max(0, currentHistoryIndex - 1))
              }
              disabled={currentHistoryIndex === 0}
              sx={{ color: "white" }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Chip
              label={`${currentHistoryIndex + 1} / ${invoiceHistory.length}`}
              sx={{ bgcolor: "white", fontWeight: 600 }}
            />
            <IconButton
              onClick={() =>
                setCurrentHistoryIndex(
                  Math.min(invoiceHistory.length - 1, currentHistoryIndex + 1)
                )
              }
              disabled={currentHistoryIndex === invoiceHistory.length - 1}
              sx={{ color: "white" }}
            >
              <ArrowForwardIcon />
            </IconButton>
            <Button
              variant="contained"
              size="small"
              startIcon={<PrintIcon />}
              onClick={() => handlePrintHistory()}
              sx={{
                ml: 2,
                bgcolor: "white",
                color: "#1a237e",
                "&:hover": { bgcolor: "#e3f2fd" },
              }}
            >
              Print
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {/* Hidden print container for history invoice */}
          {currentHistoryInvoice && (
            <Box sx={{ display: "none" }}>
              <Box ref={historyPrintRef} className="print-container">
                <PrintInvoice
                  invoiceNumber={currentHistoryInvoice.invoiceNumber}
                  invoiceDate={new Date(
                    currentHistoryInvoice.createdAt
                  ).toLocaleDateString("en-GB")}
                  clientName={clientData?.name || name}
                  clientPhone={clientData?.phone || phone}
                  items={currentHistoryInvoice.items}
                  subtotal={currentHistoryInvoice.items.reduce(
                    (sum, item) => sum + item.amount,
                    0
                  )}
                  previousBalance={0}
                  totalAmount={currentHistoryInvoice.totalAmount}
                  paidAmount={currentHistoryInvoice.paidAmount}
                  balanceDue={currentHistoryInvoice.balanceDue}
                  payments={currentHistoryInvoice.paymentsReceived}
                  showPaymentHistory={true}
                />
              </Box>
            </Box>
          )}
          {currentHistoryInvoice ? (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {currentHistoryInvoice.invoiceNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(
                      currentHistoryInvoice.createdAt
                    ).toLocaleDateString()}
                  </Typography>
                </Box>
                <Chip
                  label={currentHistoryInvoice.status}
                  color={
                    currentHistoryInvoice.status === "PAID"
                      ? "success"
                      : currentHistoryInvoice.status === "PARTIAL"
                      ? "warning"
                      : "error"
                  }
                />
              </Box>

              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ mb: 2 }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                      <TableCell>S No.</TableCell>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Width</TableCell>
                      <TableCell align="right">Height</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">SQF</TableCell>
                      <TableCell align="right">Rate</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentHistoryInvoice.items.map((item) => (
                      <TableRow key={item.sNo}>
                        <TableCell>{item.sNo}</TableCell>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell align="right">{item.width}</TableCell>
                        <TableCell align="right">{item.height}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          {item.sqf.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">{item.rate}</TableCell>
                        <TableCell align="right">
                          {item.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Payment History */}
              {currentHistoryInvoice.paymentsReceived.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Payment History
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#e8f5e9" }}>
                          <TableCell>Receipt #</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {currentHistoryInvoice.paymentsReceived.map(
                          (payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>{payment.receiptNumber}</TableCell>
                              <TableCell>
                                {new Date(
                                  payment.paymentDate
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{payment.paymentMethod}</TableCell>
                              <TableCell
                                align="right"
                                sx={{ color: "#4caf50" }}
                              >
                                Rs. {payment.amount.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Totals */}
              <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                <Paper sx={{ p: 2, minWidth: 250, bgcolor: "#fafafa" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography>Total Amount:</Typography>
                    <Typography fontWeight={600}>
                      Rs. {currentHistoryInvoice.totalAmount.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography color="success.main">Paid:</Typography>
                    <Typography fontWeight={600} color="success.main">
                      Rs. {currentHistoryInvoice.paidAmount.toLocaleString()}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography fontWeight={700}>Balance Due:</Typography>
                    <Typography fontWeight={700} color="error">
                      Rs. {currentHistoryInvoice.balanceDue.toLocaleString()}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </Box>
          ) : (
            <Typography color="text.secondary" align="center">
              No invoices found for this client
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </MainLayout>
  );
}
