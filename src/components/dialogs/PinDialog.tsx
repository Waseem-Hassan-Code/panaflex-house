"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  Typography,
  IconButton,
  Alert,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

interface PinDialogProps {
  open: boolean;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

// Default PIN - can be changed in settings
const DEFAULT_PIN = "1234";
const PIN_STORAGE_KEY = "dashboard_pin";
const PIN_VERIFIED_KEY = "pin_verified";
const PIN_EXPIRY_MINUTES = 30; // PIN verification expires after 30 minutes

export function getStoredPin(): string {
  if (typeof window === "undefined") return DEFAULT_PIN;
  return localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_PIN;
}

export function setStoredPin(pin: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(PIN_STORAGE_KEY, pin);
  }
}

export function isPinVerified(): boolean {
  if (typeof window === "undefined") return false;
  const verified = localStorage.getItem(PIN_VERIFIED_KEY);
  if (!verified) return false;

  const verifiedTime = parseInt(verified, 10);
  const now = Date.now();
  const expiryTime = PIN_EXPIRY_MINUTES * 60 * 1000;

  if (now - verifiedTime > expiryTime) {
    localStorage.removeItem(PIN_VERIFIED_KEY);
    return false;
  }
  return true;
}

export function setPinVerified(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(PIN_VERIFIED_KEY, Date.now().toString());
  }
}

export function clearPinVerification(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(PIN_VERIFIED_KEY);
  }
}

export default function PinDialog({
  open,
  onSuccess,
  title = "Enter PIN",
  subtitle = "Please enter your PIN to access the dashboard",
}: PinDialogProps) {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setPin(["", "", "", ""]);
      setError(null);
      // Focus first input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [open]);

  const handlePinChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(null);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check PIN when all digits entered
    if (newPin.every((d) => d !== "")) {
      const enteredPin = newPin.join("");
      const storedPin = getStoredPin();

      if (enteredPin === storedPin) {
        setPinVerified();
        onSuccess();
      } else {
        setError("Incorrect PIN");
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPin(["", "", "", ""]);
          inputRefs.current[0]?.focus();
        }, 500);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 4);
    if (/^\d+$/.test(pastedData)) {
      const newPin = pastedData.split("").concat(["", "", "", ""]).slice(0, 4);
      setPin(newPin);

      // Check if complete
      if (newPin.every((d) => d !== "")) {
        const enteredPin = newPin.join("");
        const storedPin = getStoredPin();

        if (enteredPin === storedPin) {
          setPinVerified();
          onSuccess();
        } else {
          setError("Incorrect PIN");
          setShake(true);
          setTimeout(() => {
            setShake(false);
            setPin(["", "", "", ""]);
            inputRefs.current[0]?.focus();
          }, 500);
        }
      }
    }
  };

  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      <Box
        sx={{
          background: "linear-gradient(135deg, #1a237e 0%, #3949ab 100%)",
          py: 3,
          px: 2,
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
          }}
        >
          <LockIcon sx={{ fontSize: 30, color: "white" }} />
        </Box>
        <Typography variant="h5" fontWeight="bold" color="white">
          {title}
        </Typography>
        <Typography
          variant="body2"
          color="rgba(255,255,255,0.8)"
          sx={{ mt: 1 }}
        >
          {subtitle}
        </Typography>
      </Box>

      <DialogContent sx={{ py: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 2,
            mb: 3,
            animation: shake ? "shake 0.5s" : "none",
            "@keyframes shake": {
              "0%, 100%": { transform: "translateX(0)" },
              "25%": { transform: "translateX(-10px)" },
              "75%": { transform: "translateX(10px)" },
            },
          }}
          onPaste={handlePaste}
        >
          {pin.map((digit, index) => (
            <TextField
              key={index}
              inputRef={(el) => (inputRefs.current[index] = el)}
              value={showPin ? digit : digit ? "•" : ""}
              onChange={(e) => handlePinChange(index, e.target.value.slice(-1))}
              onKeyDown={(e) => handleKeyDown(index, e)}
              inputProps={{
                maxLength: 1,
                style: {
                  textAlign: "center",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  padding: "12px",
                },
                inputMode: "numeric",
              }}
              sx={{
                width: 56,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#1a237e",
                      borderWidth: 2,
                    },
                  },
                },
              }}
            />
          ))}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <IconButton
            onClick={() => setShowPin(!showPin)}
            size="small"
            sx={{ color: "text.secondary" }}
          >
            {showPin ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ ml: 1, alignSelf: "center" }}
          >
            {showPin ? "Hide PIN" : "Show PIN"}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", textAlign: "center", mt: 2 }}
        >
          Default PIN: 1234 (Change in Profile settings)
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
