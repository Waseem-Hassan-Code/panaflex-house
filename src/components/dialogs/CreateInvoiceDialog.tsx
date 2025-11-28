"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { toast } from "sonner";
import { Client } from "@/types";

interface InvoiceItem {
  itemName: string;
  width: number;
  height: number;
  quantity: number;
  rate: number;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  client: Client;
  onSuccess: () => void;
}

const emptyItem: InvoiceItem = {
  itemName: "",
  width: 0,
  height: 0,
  quantity: 1,
  rate: 0,
};

export default function CreateInvoiceDialog({
  open,
  onClose,
  client,
  onSuccess,
}: CreateInvoiceDialogProps) {
  const [items, setItems] = useState<InvoiceItem[]>([{ ...emptyItem }]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate previous balance from unpaid invoices
  const previousBalance =
    client.invoices?.reduce((sum, inv) => {
      if (inv.status !== "PAID" && inv.status !== "CANCELLED") {
        return sum + inv.balanceDue;
      }
      return sum;
    }, 0) || 0;

  const calculateItemSqf = (item: InvoiceItem) => {
    return item.width * item.height * item.quantity;
  };

  const calculateItemAmount = (item: InvoiceItem) => {
    return calculateItemSqf(item) * item.rate;
  };

  const subtotal = items.reduce(
    (sum, item) => sum + calculateItemAmount(item),
    0
  );
  const totalAmount = subtotal + previousBalance;

  const handleAddItem = () => {
    setItems([...items, { ...emptyItem }]);
  };

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

  const handleSubmit = async () => {
    // Validate items
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
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          items: validItems,
          notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create invoice");
      }

      const data = await response.json();
      toast.success("Invoice Created Successfully!", {
        description: `Invoice: ${
          data.invoiceNumber
        } | Total: Rs. ${totalAmount.toLocaleString()}`,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error("Failed to create invoice", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Create Invoice</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ bgcolor: "grey.100", p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Client
            </Typography>
            <Typography fontWeight={500}>
              {client.clientId} - {client.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {client.phone}
            </Typography>
          </Box>

          <Typography variant="h6">Invoice Items</Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.100" }}>
                  <TableCell sx={{ fontWeight: "bold" }}>S.No</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Item</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    Width (ft)
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    Height (ft)
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
                  <TableCell align="center" sx={{ width: 50 }}></TableCell>
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
                          placeholder="Item name"
                          value={item.itemName}
                          onChange={(e) =>
                            handleItemChange(index, "itemName", e.target.value)
                          }
                          sx={{ minWidth: 150 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={item.width || ""}
                          onChange={(e) =>
                            handleItemChange(index, "width", e.target.value)
                          }
                          sx={{ width: 80 }}
                          inputProps={{ min: 0, step: 0.5 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={item.height || ""}
                          onChange={(e) =>
                            handleItemChange(index, "height", e.target.value)
                          }
                          sx={{ width: 80 }}
                          inputProps={{ min: 0, step: 0.5 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", e.target.value)
                          }
                          sx={{ width: 60 }}
                          inputProps={{ min: 1 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={500}>
                          {sqf.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={item.rate || ""}
                          onChange={(e) =>
                            handleItemChange(index, "rate", e.target.value)
                          }
                          sx={{ width: 80 }}
                          inputProps={{ min: 0 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={500}>
                          {amount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
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
              </TableBody>
            </Table>
          </TableContainer>

          <Button
            startIcon={<AddIcon />}
            onClick={handleAddItem}
            variant="outlined"
            sx={{ alignSelf: "flex-start" }}
          >
            Add Item
          </Button>

          <Divider />

          {/* Totals */}
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Box sx={{ minWidth: 300 }}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography>Subtotal:</Typography>
                <Typography fontWeight={500}>
                  Rs. {subtotal.toLocaleString()}
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
                  <Typography color="error.main">Previous Balance:</Typography>
                  <Typography color="error.main" fontWeight={500}>
                    Rs. {previousBalance.toLocaleString()}
                  </Typography>
                </Box>
              )}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" fontWeight="bold">
                  Rs. {totalAmount.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </Box>

          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? "Creating..." : "Create Invoice"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
