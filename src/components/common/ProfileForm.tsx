"use client";

import React, { useState, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Avatar,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
} from "@mui/material";
import {
  PhotoCamera as PhotoCameraIcon,
  Save as SaveIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "@/store";
import { updateUserAvatar, setUser } from "@/store/authSlice";

export default function ProfileForm() {
  const { t } = useTranslation("common");
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleAvatarUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB");
        return;
      }

      setUploadingAvatar(true);
      setError("");

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        const { url } = await response.json();

        // Update user avatar in database
        const updateResponse = await fetch(`/api/users/${user?.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: url }),
        });

        if (!updateResponse.ok) {
          throw new Error("Failed to update profile");
        }

        dispatch(updateUserAvatar(url));
        setSuccess("Avatar updated successfully!");
      } catch (err) {
        setError("Failed to upload avatar. Please try again.");
      } finally {
        setUploadingAvatar(false);
      }
    },
    [dispatch, user?.id]
  );

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/users/${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const { user: updatedUser } = await response.json();
      dispatch(
        setUser({
          ...user!,
          name: updatedUser.name,
        })
      );
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/users/${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!response.ok) {
        throw new Error("Failed to change password");
      }

      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: "#1a237e",
          mb: 4,
        }}
      >
        {t("profile.title")}
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Avatar Upload Card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
          >
            <CardContent sx={{ textAlign: "center", py: 4 }}>
              <Box sx={{ position: "relative", display: "inline-block" }}>
                <Avatar
                  src={user?.avatar || undefined}
                  alt={user?.name || "User"}
                  sx={{
                    width: 150,
                    height: 150,
                    fontSize: "3rem",
                    border: "4px solid #1a237e",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  }}
                >
                  {user?.name?.charAt(0) || "U"}
                </Avatar>
                <input
                  accept="image/*"
                  style={{ display: "none" }}
                  id="avatar-upload"
                  type="file"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
                <label htmlFor="avatar-upload">
                  <IconButton
                    component="span"
                    disabled={uploadingAvatar}
                    sx={{
                      position: "absolute",
                      bottom: 5,
                      right: 5,
                      backgroundColor: "#1a237e",
                      color: "#fff",
                      "&:hover": {
                        backgroundColor: "#283593",
                      },
                      width: 40,
                      height: 40,
                    }}
                  >
                    {uploadingAvatar ? (
                      <CircularProgress size={20} sx={{ color: "#fff" }} />
                    ) : (
                      <PhotoCameraIcon fontSize="small" />
                    )}
                  </IconButton>
                </label>
              </Box>
              <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>
                {user?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  backgroundColor: "#1a237e",
                  color: "#fff",
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  display: "inline-block",
                  mt: 1,
                }}
              >
                {user?.role}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Form */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card
            sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                {t("profile.update_profile")}
              </Typography>
              <form onSubmit={handleProfileUpdate}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label={t("profile.name")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label={t("profile.email")}
                      value={user?.email}
                      disabled
                      helperText="Email cannot be changed"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label={t("profile.phone")}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label={t("profile.role")}
                      value={user?.role}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label={t("profile.address")}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      multiline
                      rows={2}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      startIcon={<SaveIcon />}
                      sx={{
                        background:
                          "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
                        px: 4,
                        py: 1.2,
                        borderRadius: 2,
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={20} sx={{ color: "#fff" }} />
                      ) : (
                        t("common.save")
                      )}
                    </Button>
                  </Grid>
                </Grid>
              </form>

              <Divider sx={{ my: 4 }} />

              {/* Change Password Section */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                {t("profile.change_password")}
              </Typography>
              <form onSubmit={handlePasswordChange}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      type="password"
                      label={t("profile.current_password")}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="password"
                      label={t("profile.new_password")}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="password"
                      label={t("profile.confirm_password")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button
                      type="submit"
                      variant="outlined"
                      disabled={loading}
                      startIcon={<LockIcon />}
                      sx={{
                        borderColor: "#1a237e",
                        color: "#1a237e",
                        px: 4,
                        py: 1.2,
                        borderRadius: 2,
                        "&:hover": {
                          borderColor: "#283593",
                          backgroundColor: "rgba(26, 35, 126, 0.04)",
                        },
                      }}
                    >
                      {t("profile.change_password")}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
