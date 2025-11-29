"use client";

import React, { forwardRef } from "react";
import { Box, Typography, Divider } from "@mui/material";

interface InvoiceItem {
  sNo: number;
  itemName: string;
  width: number;
  height: number;
  quantity: number;
  sqf: number;
  rate: number;
  amount: number;
}

interface PaymentRecord {
  receiptNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
}

interface PrintInvoiceProps {
  invoiceNumber: string;
  invoiceDate: string;
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  previousBalance: number;
  totalAmount: number;
  paidAmount: number;
  discount?: number;
  balanceDue: number;
  payments?: PaymentRecord[];
  notes?: string;
  showPaymentHistory?: boolean;
}

const PrintInvoice = forwardRef<HTMLDivElement, PrintInvoiceProps>(
  (
    {
      invoiceNumber,
      invoiceDate,
      clientName,
      clientPhone,
      clientAddress,
      items,
      subtotal,
      previousBalance,
      totalAmount,
      paidAmount,
      discount = 0,
      balanceDue,
      payments = [],
      notes,
      showPaymentHistory = true,
    },
    ref
  ) => {
    const totalQty = items.reduce((sum, item) => sum + item.sqf, 0);

    return (
      <Box
        ref={ref}
        sx={{
          width: "210mm",
          minHeight: "297mm",
          padding: "10mm",
          bgcolor: "white",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          fontSize: "11pt",
          color: "#000",
          "@media print": {
            width: "100%",
            padding: "5mm",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "3px solid #1a237e",
            paddingBottom: "10px",
            marginBottom: "15px",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: "28pt",
                fontWeight: 800,
                color: "#1a237e",
                letterSpacing: "-1px",
              }}
            >
              INVOICE
            </Typography>
            <Box sx={{ display: "flex", gap: 3, mt: 1 }}>
              <Box>
                <Typography sx={{ fontSize: "9pt", color: "#666" }}>
                  Date
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{invoiceDate}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: "9pt", color: "#666" }}>
                  INVOICE NO
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {invoiceNumber}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography
              sx={{ fontSize: "16pt", fontWeight: 700, color: "#1a237e" }}
            >
              Kharian Advertising Agency
            </Typography>
            <Typography sx={{ fontSize: "10pt", color: "#555" }}>
              Near Soneri Bank, G.T Road Kharian
            </Typography>
            <Typography sx={{ fontSize: "10pt", color: "#555" }}>
              ✉ kharianadvertising@gmail.com
            </Typography>
            <Typography sx={{ fontSize: "10pt", color: "#555" }}>
              📞 0300-6313350 &nbsp;&nbsp; 0331-6313350
            </Typography>
          </Box>
        </Box>

        {/* Bill To Section */}
        <Box
          sx={{
            border: "1px solid #ddd",
            padding: "10px 15px",
            marginBottom: "15px",
            bgcolor: "#f9f9f9",
          }}
        >
          <Typography
            sx={{ fontSize: "10pt", fontWeight: 600, color: "#666", mb: 0.5 }}
          >
            Bill To
          </Typography>
          <Box sx={{ display: "flex", gap: 4 }}>
            <Box>
              <Typography sx={{ fontSize: "9pt", color: "#888" }}>
                Name:
              </Typography>
              <Typography sx={{ fontWeight: 600, fontSize: "12pt" }}>
                {clientName}
              </Typography>
            </Box>
            {clientAddress && (
              <Box>
                <Typography sx={{ fontSize: "9pt", color: "#888" }}>
                  Address:
                </Typography>
                <Typography>{clientAddress}</Typography>
              </Box>
            )}
            <Box>
              <Typography sx={{ fontSize: "9pt", color: "#888" }}>
                Phone:
              </Typography>
              <Typography sx={{ fontWeight: 500 }}>{clientPhone}</Typography>
            </Box>
          </Box>
        </Box>

        {/* Description Table */}
        <Typography
          sx={{
            fontSize: "11pt",
            fontWeight: 600,
            bgcolor: "#f0f0f0",
            padding: "5px 10px",
            marginBottom: "0",
          }}
        >
          Description
        </Typography>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "15px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "center",
                  fontWeight: 600,
                  width: "50px",
                }}
              >
                S No.
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "left",
                  fontWeight: 600,
                }}
              >
                Items
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "center",
                  fontWeight: 600,
                  width: "60px",
                }}
              >
                Width
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "center",
                  fontWeight: 600,
                  width: "60px",
                }}
              >
                Height
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "center",
                  fontWeight: 600,
                  width: "50px",
                }}
              >
                Qty
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "right",
                  fontWeight: 600,
                  width: "70px",
                  color: "#4caf50",
                }}
              >
                SQF
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "right",
                  fontWeight: 600,
                  width: "60px",
                }}
              >
                Rate
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "right",
                  fontWeight: 600,
                  width: "90px",
                }}
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "6px 8px",
                    textAlign: "center",
                  }}
                >
                  {item.sNo}
                </td>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "6px 8px",
                  }}
                >
                  {item.itemName}
                </td>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "6px 8px",
                    textAlign: "center",
                  }}
                >
                  {item.width || ""}
                </td>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "6px 8px",
                    textAlign: "center",
                  }}
                >
                  {item.height || ""}
                </td>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "6px 8px",
                    textAlign: "center",
                  }}
                >
                  {item.quantity || ""}
                </td>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "6px 8px",
                    textAlign: "right",
                    color: "#4caf50",
                  }}
                >
                  {item.sqf > 0 ? item.sqf.toFixed(2) : "0"}
                </td>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "6px 8px",
                    textAlign: "right",
                  }}
                >
                  {item.rate || ""}
                </td>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "6px 8px",
                    textAlign: "right",
                    fontWeight: 500,
                  }}
                >
                  {item.amount > 0 ? item.amount.toLocaleString() : "0"}
                </td>
              </tr>
            ))}
            {/* Empty rows to fill up to 11 rows */}
            {Array.from({ length: Math.max(0, 11 - items.length) }).map(
              (_, i) => (
                <tr key={`empty-${i}`}>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "6px 8px",
                      textAlign: "center",
                      height: "28px",
                    }}
                  >
                    {items.length + i + 1}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "6px 8px" }}>
                    &nbsp;
                  </td>
                  <td
                    style={{ border: "1px solid #ddd", padding: "6px 8px" }}
                  ></td>
                  <td
                    style={{ border: "1px solid #ddd", padding: "6px 8px" }}
                  ></td>
                  <td
                    style={{ border: "1px solid #ddd", padding: "6px 8px" }}
                  ></td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "6px 8px",
                      textAlign: "right",
                      color: "#4caf50",
                    }}
                  >
                    0
                  </td>
                  <td
                    style={{ border: "1px solid #ddd", padding: "6px 8px" }}
                  ></td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "6px 8px",
                      textAlign: "right",
                    }}
                  >
                    0
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        {/* Bottom Section - Two Columns */}
        <Box sx={{ display: "flex", gap: 2 }}>
          {/* Left Column - Bank Details & Payment History */}
          <Box sx={{ flex: 1 }}>
            {/* Bank Details */}
            <Box
              sx={{
                border: "1px solid #ddd",
                padding: "10px",
                marginBottom: "10px",
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: "10pt", mb: 0.5 }}>
                Saghir Abbas
              </Typography>
              <Typography sx={{ fontSize: "10pt" }}>0713 214023659</Typography>
              <Typography sx={{ fontSize: "10pt" }}>Bank UBL</Typography>
            </Box>

            {/* Payment History */}
            {showPaymentHistory && payments.length > 0 && (
              <Box sx={{ border: "1px solid #ddd", padding: "10px" }}>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "10pt",
                    mb: 1,
                    color: "#1a237e",
                  }}
                >
                  Payment History
                </Typography>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "9pt",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#e8f5e9" }}>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "4px",
                          textAlign: "left",
                        }}
                      >
                        Receipt #
                      </th>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "4px",
                          textAlign: "center",
                        }}
                      >
                        Date
                      </th>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "4px",
                          textAlign: "center",
                        }}
                      >
                        Method
                      </th>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "4px",
                          textAlign: "right",
                        }}
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment, index) => (
                      <tr key={index}>
                        <td
                          style={{ border: "1px solid #ddd", padding: "4px" }}
                        >
                          {payment.receiptNumber}
                        </td>
                        <td
                          style={{
                            border: "1px solid #ddd",
                            padding: "4px",
                            textAlign: "center",
                          }}
                        >
                          {new Date(payment.paymentDate).toLocaleDateString(
                            "en-GB"
                          )}
                        </td>
                        <td
                          style={{
                            border: "1px solid #ddd",
                            padding: "4px",
                            textAlign: "center",
                          }}
                        >
                          {payment.paymentMethod}
                        </td>
                        <td
                          style={{
                            border: "1px solid #ddd",
                            padding: "4px",
                            textAlign: "right",
                            color: "#4caf50",
                            fontWeight: 500,
                          }}
                        >
                          {payment.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}
          </Box>

          {/* Right Column - Totals */}
          <Box sx={{ width: "220px" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "6px 10px",
                      fontWeight: 500,
                    }}
                  >
                    Total QTY
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "6px 10px",
                      textAlign: "right",
                    }}
                  >
                    {totalQty.toFixed(2)}
                  </td>
                </tr>
                <tr style={{ backgroundColor: "#e3f2fd" }}>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "6px 10px",
                      fontWeight: 600,
                    }}
                  >
                    Total Amount
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "6px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                    }}
                  >
                    {subtotal.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "6px 10px",
                    }}
                  >
                    Date
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "6px 10px",
                      textAlign: "right",
                    }}
                  >
                    {invoiceDate}
                  </td>
                </tr>
                {previousBalance > 0 && (
                  <tr>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "6px 10px",
                        color: "#c62828",
                      }}
                    >
                      Prv. Balance
                    </td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "6px 10px",
                        textAlign: "right",
                        color: "#c62828",
                      }}
                    >
                      {previousBalance.toLocaleString()}
                    </td>
                  </tr>
                )}
                <tr>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "6px 10px",
                    }}
                  >
                    Sub Total
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "6px 10px",
                      textAlign: "right",
                    }}
                  >
                    {totalAmount.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "6px 10px",
                      color: "#2e7d32",
                    }}
                  >
                    Paid
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "6px 10px",
                      textAlign: "right",
                      color: "#2e7d32",
                    }}
                  >
                    {paidAmount.toLocaleString()}
                  </td>
                </tr>
                {discount > 0 && (
                  <tr>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "6px 10px",
                      }}
                    >
                      Discount
                    </td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "6px 10px",
                        textAlign: "right",
                      }}
                    >
                      {discount.toLocaleString()}
                    </td>
                  </tr>
                )}
                <tr style={{ backgroundColor: "#ffebee" }}>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "8px 10px",
                      fontWeight: 700,
                    }}
                  >
                    Balance
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "8px 10px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: balanceDue > 0 ? "#c62828" : "#2e7d32",
                    }}
                  >
                    {balanceDue.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </Box>
        </Box>

        {/* Notes */}
        {notes && (
          <Box
            sx={{
              mt: 2,
              p: 1,
              bgcolor: "#fffde7",
              border: "1px solid #fff59d",
            }}
          >
            <Typography sx={{ fontSize: "9pt", color: "#666" }}>
              <strong>Note:</strong> {notes}
            </Typography>
          </Box>
        )}

        {/* Footer */}
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography sx={{ fontSize: "9pt", color: "#888" }}>
            Note*If you have any query about this invoice please contact us at
          </Typography>
          <Typography
            sx={{ fontSize: "14pt", fontWeight: 600, mt: 1, color: "#1a237e" }}
          >
            Thanks for your Cooperation!
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              mt: 2,
              pt: 2,
              borderTop: "1px solid #ddd",
            }}
          >
            <Box sx={{ textAlign: "center", width: "200px" }}>
              <Box sx={{ borderTop: "1px solid #000", pt: 0.5, mt: 3 }}>
                <Typography sx={{ fontSize: "10pt" }}>
                  Signature and Seal
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }
);

PrintInvoice.displayName = "PrintInvoice";

export default PrintInvoice;
