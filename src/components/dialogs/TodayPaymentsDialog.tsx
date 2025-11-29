"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
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
  Chip,
  CircularProgress,
  Avatar,
  Tooltip,
} from "@mui/material";
import {
  Close as CloseIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Phone as PhoneIcon,
  Today as TodayIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

interface Payment {
  id: string;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceTotal: number;
  invoicePaid: number;
  invoiceRemaining: number;
}

interface TodayPaymentsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function TodayPaymentsDialog({
  open,
  onClose,
}: TodayPaymentsDialogProps) {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (open) {
      fetchTodayPayments();
    }
  }, [open]);

  const fetchTodayPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/today-payments");
      if (response.ok) {
        const data = await response.json();
        setPayments(data.data || []);
        setTotalAmount(data.summary?.totalAmount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch today's payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewClient = (clientId: string) => {
    onClose();
    router.push(`/clients/${clientId}`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              width: 48,
              height: 48,
            }}
          >
            <TodayIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Today's Payments
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Total Received
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              Rs. {totalAmount.toLocaleString()}
            </Typography>
          </Box>
          <Chip
            label={`${payments.length} Payments`}
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              color: "white",
              fontWeight: 600,
            }}
          />
          <IconButton onClick={onClose} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 8,
            }}
          >
            <CircularProgress sx={{ color: "#4caf50" }} />
          </Box>
        ) : payments.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              py: 8,
              color: "text.secondary",
            }}
          >
            <TodayIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
            <Typography variant="h6">No payments received today</Typography>
            <Typography variant="body2">
              Payments will appear here once received
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                  <TableCell sx={{ fontWeight: 700, color: "#1a237e" }}>
                    Client
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#1a237e" }}>
                    Phone
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#1a237e" }}>
                    Receipt #
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 700, color: "#1a237e" }}
                  >
                    Paid Amount
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 700, color: "#1a237e" }}
                  >
                    Remaining
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: 700, color: "#1a237e" }}
                  >
                    Status
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: 700, color: "#1a237e" }}
                  >
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment, index) => (
                  <TableRow
                    key={payment.id}
                    sx={{
                      "&:hover": { bgcolor: "#f8faf8" },
                      borderLeft:
                        payment.invoiceRemaining > 0
                          ? "4px solid #f44336"
                          : "4px solid #4caf50",
                    }}
                  >
                    <TableCell>
                      <Box>
                        <Typography fontWeight={600}>
                          {payment.clientName}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            bgcolor: "#e3f2fd",
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                          }}
                        >
                          {payment.invoiceNumber}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <PhoneIcon
                          sx={{ fontSize: 16, color: "text.secondary" }}
                        />
                        <Typography>{payment.clientPhone}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={500}>
                        {payment.receiptNumber}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 0.5,
                        }}
                      >
                        <TrendingUpIcon
                          sx={{ color: "#4caf50", fontSize: 20 }}
                        />
                        <Typography
                          fontWeight={700}
                          sx={{ color: "#4caf50", fontSize: "1.1rem" }}
                        >
                          Rs. {payment.amount.toLocaleString()}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {payment.invoiceRemaining > 0 ? (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 0.5,
                          }}
                        >
                          <TrendingDownIcon
                            sx={{ color: "#f44336", fontSize: 20 }}
                          />
                          <Typography
                            fontWeight={700}
                            sx={{ color: "#f44336", fontSize: "1.1rem" }}
                          >
                            Rs. {payment.invoiceRemaining.toLocaleString()}
                          </Typography>
                        </Box>
                      ) : (
                        <Chip
                          label="Cleared"
                          size="small"
                          sx={{
                            bgcolor: "#e8f5e9",
                            color: "#2e7d32",
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {payment.invoiceRemaining > 0 ? (
                        <Chip
                          label="Has Dues"
                          size="small"
                          sx={{
                            bgcolor: "#ffebee",
                            color: "#c62828",
                            fontWeight: 600,
                          }}
                        />
                      ) : (
                        <Chip
                          label="All Clear"
                          size="small"
                          sx={{
                            bgcolor: "#e8f5e9",
                            color: "#2e7d32",
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Client Profile">
                        <IconButton
                          onClick={() => handleViewClient(payment.clientId)}
                          sx={{
                            bgcolor: "#e3f2fd",
                            "&:hover": { bgcolor: "#bbdefb" },
                          }}
                        >
                          <ViewIcon sx={{ color: "#1a237e" }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}
