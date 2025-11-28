"use client";

import React from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  Divider,
  ListItemIcon,
  Select,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Translate as TranslateIcon,
} from "@mui/icons-material";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/store";
import { toggleSidebar, setLanguage } from "@/store/uiSlice";
import GlobalSearch from "@/components/common/GlobalSearch";

const drawerWidth = 280;

export default function Topbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation("common");
  const { sidebarOpen, language } = useAppSelector((state) => state.ui);
  const { user } = useAppSelector((state) => state.auth);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleMenuClose();
    router.push("/profile");
  };

  const handleLogout = async () => {
    handleMenuClose();
    await signOut({ redirect: true, callbackUrl: "/login" });
  };

  const handleLanguageChange = (lang: "en" | "ur") => {
    dispatch(setLanguage(lang));
    i18n.changeLanguage(lang);
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : "100%",
        ml: sidebarOpen ? `${drawerWidth}px` : 0,
        background: "linear-gradient(90deg, #1a237e 0%, #283593 100%)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        transition: "all 0.3s ease",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        {/* Left Side */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            onClick={() => dispatch(toggleSidebar())}
            sx={{ color: "#fff" }}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        {/* Center - Global Search */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            flex: 1,
            justifyContent: "center",
            maxWidth: 500,
          }}
        >
          <GlobalSearch />
        </Box>

        {/* Right Side */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Language Switcher */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: 2,
              px: 1,
              py: 0.5,
            }}
          >
            <TranslateIcon sx={{ color: "#fff", fontSize: 20, mr: 1 }} />
            <Select
              value={language}
              onChange={(e) =>
                handleLanguageChange(e.target.value as "en" | "ur")
              }
              size="small"
              variant="standard"
              disableUnderline
              sx={{
                fontSize: "0.875rem",
                color: "#fff",
                "& .MuiSelect-select": {
                  py: 0,
                  pr: 3,
                },
                "& .MuiSelect-icon": {
                  color: "#fff",
                },
              }}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="ur">اردو</MenuItem>
            </Select>
          </Box>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton sx={{ color: "#fff" }}>
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Menu */}
          <Tooltip title="Account">
            <IconButton onClick={handleMenuOpen} sx={{ p: 0, ml: 1 }}>
              <Avatar
                src={user?.avatar || undefined}
                alt={user?.name || "User"}
                sx={{
                  width: 40,
                  height: 40,
                  border: "2px solid #1a237e",
                }}
              >
                {user?.name?.charAt(0) || "U"}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* User Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 200,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            borderRadius: 2,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {user?.name || "User"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email || "user@email.com"}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              backgroundColor: "#1a237e",
              color: "#fff",
              px: 1,
              py: 0.25,
              borderRadius: 1,
              display: "inline-block",
              mt: 0.5,
            }}
          >
            {user?.role || "VIEWER"}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          {t("common.profile")}
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          {t("common.settings")}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          {t("common.logout")}
        </MenuItem>
      </Menu>
    </AppBar>
  );
}
