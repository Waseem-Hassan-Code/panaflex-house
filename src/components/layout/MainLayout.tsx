"use client";

import React, { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import { setUser } from "@/store/authSlice";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const drawerWidth = 280;

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { sidebarOpen } = useAppSelector((state) => state.ui);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      dispatch(
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.name || "",
          role: session.user.role || "VIEWER",
          avatar: session.user.avatar,
        })
      );
    }
  }, [session, dispatch]);

  if (status === "loading") {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f5f7fa",
        }}
      >
        <CircularProgress size={50} sx={{ color: "#1a237e" }} />
      </Box>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <Box
      sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f7fa" }}
    >
      <Sidebar />
      <Topbar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          pt: 10,
          ml: sidebarOpen ? 0 : `-${drawerWidth}px`,
          transition: "margin 0.3s ease",
          width: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : "100%",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
