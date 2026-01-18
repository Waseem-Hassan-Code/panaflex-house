"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Fade,
  Zoom,
  Chip,
} from "@mui/material";
import { CheckCircle, Receipt } from "@mui/icons-material";

interface AllocationItem {
  invoiceId: string;
  invoiceNumber: string;
  amountApplied: number;
  previousBalance: number;
  newBalance: number;
  newStatus: string;
}

interface PaymentAllocationAnimationProps {
  allocations: AllocationItem[];
  totalAllocated: number;
  creditAdded: number;
  totalAmount: number;
  onComplete?: () => void;
}

export default function PaymentAllocationAnimation({
  allocations,
  totalAllocated,
  creditAdded,
  totalAmount,
  onComplete,
}: PaymentAllocationAnimationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedInvoices, setCompletedInvoices] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (allocations.length === 0) {
      onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      if (currentIndex < allocations.length) {
        const allocation = allocations[currentIndex];
        setCompletedInvoices((prev) => new Set(prev).add(allocation.invoiceId));
        setCurrentIndex((prev) => prev + 1);
      } else {
        clearInterval(timer);
        setTimeout(() => {
          onComplete?.();
        }, 1000);
      }
    }, 800); // Show each invoice clearing every 800ms

    return () => clearInterval(timer);
  }, [currentIndex, allocations.length, onComplete]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "success";
      case "PARTIAL":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PAID":
        return "Paid";
      case "PARTIAL":
        return "Partially Paid";
      default:
        return "Unpaid";
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Payment Allocation (FIFO)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Payment of Rs. {totalAmount.toLocaleString()} being allocated to invoices
        (oldest first)
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
        {allocations.map((allocation, index) => {
          const isCompleted = completedInvoices.has(allocation.invoiceId);
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <Fade
              in={index <= currentIndex}
              key={allocation.invoiceId}
              timeout={500}
            >
              <Card
                sx={{
                  position: "relative",
                  border: isCurrent
                    ? "2px solid"
                    : isCompleted
                    ? "2px solid"
                    : "1px solid",
                  borderColor: isCurrent
                    ? "primary.main"
                    : isCompleted
                    ? "success.main"
                    : "divider",
                  bgcolor: isCurrent
                    ? "action.selected"
                    : isCompleted
                    ? "success.light"
                    : "background.paper",
                  transition: "all 0.3s ease",
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Receipt color="primary" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        {allocation.invoiceNumber}
                      </Typography>
                    </Box>
                    {isCompleted && (
                      <Zoom in={isCompleted} timeout={300}>
                        <CheckCircle color="success" />
                      </Zoom>
                    )}
                    {isCurrent && !isCompleted && (
                      <Chip
                        label="Processing..."
                        color="primary"
                        size="small"
                      />
                    )}
                    {isPending && (
                      <Chip label="Pending" size="small" variant="outlined" />
                    )}
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Previous Balance:
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      Rs. {allocation.previousBalance.toLocaleString()}
                    </Typography>
                  </Box>

                  {isCurrent && (
                    <Fade in={isCurrent} timeout={300}>
                      <Box sx={{ mb: 1 }}>
                        <LinearProgress
                          variant="indeterminate"
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    </Fade>
                  )}

                  {isCompleted && (
                    <Zoom in={isCompleted} timeout={400}>
                      <Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 1,
                          }}
                        >
                          <Typography
                            variant="body2"
                            color="success.main"
                            fontWeight={500}
                          >
                            Amount Applied:
                          </Typography>
                          <Typography
                            variant="body2"
                            color="success.main"
                            fontWeight={600}
                          >
                            Rs. {allocation.amountApplied.toLocaleString()}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            New Balance:
                          </Typography>
                          <Chip
                            label={getStatusLabel(allocation.newStatus)}
                            color={getStatusColor(allocation.newStatus)}
                            size="small"
                          />
                          <Typography
                            variant="body2"
                            fontWeight={500}
                            color={
                              allocation.newBalance === 0
                                ? "success.main"
                                : "text.primary"
                            }
                          >
                            Rs. {allocation.newBalance.toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                    </Zoom>
                  )}
                </CardContent>
              </Card>
            </Fade>
          );
        })}
      </Box>

      {currentIndex >= allocations.length && (
        <Fade in={currentIndex >= allocations.length} timeout={500}>
          <Card sx={{ bgcolor: "success.light", mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="success.dark">
                Payment Allocation Complete!
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="body2">Total Allocated:</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    Rs. {totalAllocated.toLocaleString()}
                  </Typography>
                </Box>
                {creditAdded > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography variant="body2">Added to Credit:</Typography>
                    <Typography variant="body2" fontWeight={600} color="info.main">
                      Rs. {creditAdded.toLocaleString()}
                    </Typography>
                  </Box>
                )}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    pt: 1,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="body1" fontWeight={600}>
                    Total Payment:
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    Rs. {totalAmount.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Fade>
      )}
    </Box>
  );
}
