"use client";

import React, { forwardRef } from "react";
import { Box, Typography, Divider } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";

interface MembershipCardProps {
  clientId: string;
  clientName: string;
  phone: string;
  membershipCardId: string;
  membershipType: "FIXED" | "PERCENTAGE";
  membershipDiscount: number;
  membershipStartDate?: Date | string | null;
  membershipEndDate?: Date | string | null;
}

const MembershipCard = forwardRef<HTMLDivElement, MembershipCardProps>(
  (
    {
      clientId,
      clientName,
      phone,
      membershipCardId,
      membershipType,
      membershipDiscount,
      membershipStartDate,
      membershipEndDate,
    },
    ref
  ) => {
    const discountText =
      membershipType === "PERCENTAGE"
        ? `${membershipDiscount}%`
        : `Rs. ${membershipDiscount}`;

    // Generate QR code data - contains membership card ID for scanning
    const qrData = JSON.stringify({
      type: "MEMBERSHIP",
      cardId: membershipCardId,
      clientId: clientId,
    });

    const formatDate = (date: Date | string | null | undefined) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    return (
      <Box
        ref={ref}
        sx={{
          width: "400px",
          height: "250px",
          background:
            "linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #1565c0 100%)",
          borderRadius: "16px",
          padding: "20px",
          color: "white",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          fontFamily: "'Segoe UI', sans-serif",
          // Decorative elements
          "&::before": {
            content: '""',
            position: "absolute",
            top: "-50%",
            right: "-50%",
            width: "100%",
            height: "100%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
            borderRadius: "50%",
          },
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: "-30%",
            left: "-30%",
            width: "60%",
            height: "60%",
            background:
              "radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)",
            borderRadius: "50%",
          },
          "@media print": {
            boxShadow: "none",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
            >
              <WorkspacePremiumIcon sx={{ color: "#FFD700", fontSize: 28 }} />
              <Typography
                sx={{
                  fontSize: "14pt",
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                }}
              >
                Premium Member
              </Typography>
            </Box>
            <Typography
              sx={{
                fontSize: "10pt",
                opacity: 0.8,
                letterSpacing: "1px",
              }}
            >
              KHARAIAN ADVERTISING AGENCY
            </Typography>
          </Box>

          {/* Discount Badge */}
          <Box
            sx={{
              background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
              color: "#000",
              padding: "8px 16px",
              borderRadius: "20px",
              fontWeight: 800,
              fontSize: "12pt",
              boxShadow: "0 4px 15px rgba(255,215,0,0.4)",
            }}
          >
            {discountText} OFF
          </Box>
        </Box>

        {/* Member Details */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            mt: 3,
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: "16pt",
                fontWeight: 700,
                mb: 0.5,
                textShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              {clientName}
            </Typography>
            <Typography sx={{ fontSize: "10pt", opacity: 0.9 }}>
              ID: {clientId}
            </Typography>
            <Typography sx={{ fontSize: "10pt", opacity: 0.9 }}>
              📞 {phone}
            </Typography>

            <Box sx={{ mt: 1.5, display: "flex", gap: 3 }}>
              <Box>
                <Typography sx={{ fontSize: "8pt", opacity: 0.7 }}>
                  VALID FROM
                </Typography>
                <Typography sx={{ fontSize: "9pt", fontWeight: 600 }}>
                  {formatDate(membershipStartDate)}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: "8pt", opacity: 0.7 }}>
                  VALID UNTIL
                </Typography>
                <Typography sx={{ fontSize: "9pt", fontWeight: 600 }}>
                  {membershipEndDate
                    ? formatDate(membershipEndDate)
                    : "Lifetime"}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* QR Code */}
          <Box
            sx={{
              background: "white",
              padding: "8px",
              borderRadius: "8px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
            }}
          >
            <QRCodeSVG
              value={qrData}
              size={80}
              level="H"
              includeMargin={false}
            />
          </Box>
        </Box>

        {/* Card Number */}
        <Box
          sx={{
            position: "absolute",
            bottom: "12px",
            left: "20px",
            right: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <Typography
            sx={{
              fontSize: "8pt",
              opacity: 0.6,
              letterSpacing: "2px",
            }}
          >
            CARD ID: {membershipCardId}
          </Typography>
        </Box>
      </Box>
    );
  }
);

MembershipCard.displayName = "MembershipCard";

export default MembershipCard;
