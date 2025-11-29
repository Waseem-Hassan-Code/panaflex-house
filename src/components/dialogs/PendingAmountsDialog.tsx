"use client";

import { useState, useEffect, useCallback } from "react";
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
  TablePagination,
  TextField,
  InputAdornment,
} from "@mui/material";
import {
  Close as CloseIcon,
  Visibility as ViewIcon,
  TrendingDown as TrendingDownIcon,
  Phone as PhoneIcon,
  AccountBalance as AccountBalanceIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

interface PendingClient {
  id: string;
  clientId: string;
  name: string;
  phone: string;
  email: string | null;
  totalPending: number;
  pendingInvoiceCount: number;
  daysOverdue: number;
  oldestInvoiceDate: string | null;
}

interface PendingAmountsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function PendingAmountsDialog({
  open,
  onClose,
}: PendingAmountsDialogProps) {
  const router = useRouter();
  const [clients, setClients] = useState<PendingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [search, setSearch] = useState("");

  const fetchPendingAmounts = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
      });
      const response = await fetch(
        `/api/dashboard/pending-amounts?${queryParams}`
      );
      if (response.ok) {
        const data = await response.json();
        setClients(data.data || []);
        setTotal(data.pagination?.totalCount || 0);
        setTotalPending(data.summary?.grandTotalPending || 0);
      }
    } catch (error) {
      console.error("Failed to fetch pending amounts:", error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    if (open) {
      fetchPendingAmounts();
    }
  }, [open, fetchPendingAmounts]);

  const handleViewClient = (clientId: string) => {
    onClose();
    router.push(`/clients/${clientId}`);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getOverdueColor = (days: number) => {
    if (days > 30)
      return { bg: "#ffebee", color: "#c62828", label: "Critical" };
    if (days > 14) return { bg: "#fff3e0", color: "#e65100", label: "Warning" };
    return { bg: "#fff8e1", color: "#f57c00", label: "Pending" };
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
          maxHeight: "90vh",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          background: "linear-gradient(135deg, #f44336 0%, #c62828 100%)",
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
            <AccountBalanceIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Pending Amounts
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              All clients with outstanding balances
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Total Pending
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              Rs. {totalPending.toLocaleString()}
            </Typography>
          </Box>
          <Chip
            label={`${total} Clients`}
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
        {/* Search Bar */}
        <Box sx={{ p: 2, bgcolor: "#f5f7fa" }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, phone, or client ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              bgcolor: "white",
              borderRadius: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
        </Box>

        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 8,
            }}
          >
            <CircularProgress sx={{ color: "#f44336" }} />
          </Box>
        ) : clients.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              py: 8,
              color: "text.secondary",
            }}
          >
            <AccountBalanceIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
            <Typography variant="h6">No pending amounts</Typography>
            <Typography variant="body2">
              All clients have cleared their dues
            </Typography>
          </Box>
        ) : (
          <>
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
                    <TableCell
                      align="center"
                      sx={{ fontWeight: 700, color: "#1a237e" }}
                    >
                      Invoices
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: "#1a237e" }}
                    >
                      Pending Amount
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontWeight: 700, color: "#1a237e" }}
                    >
                      Last Invoice
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
                  {clients.map((client) => {
                    const daysOverdue = client.daysOverdue || 0;
                    const overdueStyle = getOverdueColor(daysOverdue);
                    return (
                      <TableRow
                        key={client.id}
                        sx={{
                          "&:hover": { bgcolor: "#fff5f5" },
                          borderLeft: `4px solid ${
                            daysOverdue > 30
                              ? "#c62828"
                              : daysOverdue > 14
                              ? "#e65100"
                              : "#f57c00"
                          }`,
                        }}
                      >
                        <TableCell>
                          <Box>
                            <Typography fontWeight={600}>
                              {client.name}
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
                              {client.clientId}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <PhoneIcon
                              sx={{ fontSize: 16, color: "text.secondary" }}
                            />
                            <Typography>{client.phone}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${client.pendingInvoiceCount} unpaid`}
                            size="small"
                            sx={{
                              bgcolor: "#e3f2fd",
                              color: "#1a237e",
                              fontWeight: 600,
                            }}
                          />
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
                            <TrendingDownIcon
                              sx={{ color: "#f44336", fontSize: 20 }}
                            />
                            <Typography
                              fontWeight={700}
                              sx={{ color: "#f44336", fontSize: "1.1rem" }}
                            >
                              Rs. {client.totalPending.toLocaleString()}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" color="text.secondary">
                            {client.oldestInvoiceDate
                              ? new Date(
                                  client.oldestInvoiceDate
                                ).toLocaleDateString()
                              : "-"}
                          </Typography>
                          {daysOverdue > 0 && (
                            <Typography
                              variant="caption"
                              sx={{ color: overdueStyle.color }}
                            >
                              {daysOverdue} days ago
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={
                              daysOverdue > 30 ? (
                                <WarningIcon sx={{ fontSize: 16 }} />
                              ) : undefined
                            }
                            label={overdueStyle.label}
                            size="small"
                            sx={{
                              bgcolor: overdueStyle.bg,
                              color: overdueStyle.color,
                              fontWeight: 600,
                              "& .MuiChip-icon": {
                                color: overdueStyle.color,
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Client Profile">
                            <IconButton
                              onClick={() => handleViewClient(client.id)}
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
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={pageSize}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50]}
              sx={{ borderTop: "1px solid #e0e0e0" }}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
