"use client";

import React from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Avatar,
  Typography,
  Divider,
  useTheme,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  ManageAccounts as ManageAccountsIcon,
} from "@mui/icons-material";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/store";
import { hasPermission, Permission } from "@/lib/permissions";

const drawerWidth = 280;

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  permission?: Permission;
}

export default function Sidebar() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation("common");
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  const { user } = useAppSelector((state) => state.auth);

  const menuItems: MenuItem[] = [
    {
      text: t("common.dashboard"),
      icon: <DashboardIcon />,
      path: "/dashboard",
      permission: Permission.VIEW_DASHBOARD,
    },
    {
      text: "Clients",
      icon: <PeopleIcon />,
      path: "/clients",
      permission: Permission.VIEW_CUSTOMERS,
    },
    {
      text: "Invoices",
      icon: <ReceiptIcon />,
      path: "/invoices",
      permission: Permission.VIEW_PAYMENTS,
    },
    {
      text: "Payments Received",
      icon: <PaymentIcon />,
      path: "/payments-received",
      permission: Permission.VIEW_PAYMENTS,
    },
    {
      text: "Transaction Logs",
      icon: <HistoryIcon />,
      path: "/logs",
      permission: Permission.VIEW_DASHBOARD,
    },
    {
      text: "User Management",
      icon: <ManageAccountsIcon />,
      path: "/user-management",
      permission: Permission.VIEW_USERS,
    },
  ];

  const filteredMenuItems = menuItems.filter(
    (item) =>
      !item.permission ||
      (user?.role && hasPermission(user.role, item.permission))
  );

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={sidebarOpen}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          background: "linear-gradient(180deg, #1a237e 0%, #283593 100%)",
          color: "#fff",
          borderRight: "none",
        },
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            background: "linear-gradient(90deg, #fff 0%, #90caf9 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Panaflex House
        </Typography>
      </Box>

      {/* Navigation Items */}
      <Box sx={{ flex: 1, py: 2 }}>
        <List>
          {filteredMenuItems.map((item) => {
            const isActive =
              pathname === item.path || pathname?.startsWith(item.path + "/");
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5, px: 1 }}>
                <ListItemButton
                  onClick={() => router.push(item.path)}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.15)"
                      : "transparent",
                    "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.1)",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? "#90caf9" : "rgba(255,255,255,0.7)",
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: "0.95rem",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#fff" : "rgba(255,255,255,0.9)",
                    }}
                  />
                  {isActive && (
                    <Box
                      sx={{
                        width: 4,
                        height: 20,
                        borderRadius: 2,
                        backgroundColor: "#90caf9",
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

      {/* User Profile Section */}
      <Box
        sx={{
          p: 2,
          cursor: "pointer",
          "&:hover": {
            backgroundColor: "rgba(255,255,255,0.05)",
          },
          transition: "all 0.2s ease",
        }}
        onClick={() => router.push("/profile")}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            src={user?.avatar || undefined}
            alt={user?.name || "User"}
            sx={{
              width: 45,
              height: 45,
              border: "2px solid rgba(255,255,255,0.3)",
            }}
          >
            {user?.name?.charAt(0) || "U"}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: "#fff",
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {user?.name || "User"}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.7)",
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
                display: "block",
              }}
            >
              {user?.email || "user@email.com"}
            </Typography>
          </Box>
          <SettingsIcon sx={{ color: "rgba(255,255,255,0.5)", fontSize: 20 }} />
        </Box>
      </Box>
    </Drawer>
  );
}
