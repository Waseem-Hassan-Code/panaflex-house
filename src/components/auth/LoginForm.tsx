"use client";

import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

export default function LoginForm() {
  const router = useRouter();
  const { t } = useTranslation("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)",
        padding: 3,
      }}
    >
      <Card
        sx={{
          maxWidth: 420,
          width: "100%",
          borderRadius: 4,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
            py: 4,
            px: 3,
            textAlign: "center",
          }}
        >
          <Typography
            variant="h4"
            sx={{
              color: "#fff",
              fontWeight: 700,
              mb: 1,
            }}
          >
            Panaflex House
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "rgba(255,255,255,0.8)",
            }}
          >
            {t("auth.login_subtitle")}
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: "#1a237e",
              mb: 3,
              textAlign: "center",
            }}
          >
            {t("auth.welcome_back")}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={t("auth.email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: "#1a237e" }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label={t("auth.password")}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: "#1a237e" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{
                py: 1.5,
                fontSize: "1rem",
                fontWeight: 600,
                background: "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
                borderRadius: 2,
                boxShadow: "0 4px 15px rgba(26, 35, 126, 0.4)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #283593 0%, #3949ab 100%)",
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: "#fff" }} />
              ) : (
                t("auth.sign_in")
              )}
            </Button>
          </form>

          <Typography
            variant="body2"
            sx={{
              mt: 3,
              textAlign: "center",
              color: "text.secondary",
            }}
          >
            Default: admin@panaflex.com / admin123
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
