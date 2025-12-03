"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  InsertDriveFile as FileIcon,
} from "@mui/icons-material";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface UploadRecordsDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRecord {
  voucherNumber?: string;
  name: string;
  balance: number;
  date?: string;
  phone: string;
  isValid: boolean;
  error?: string;
}

export default function UploadRecordsDialog({
  open,
  onClose,
  onSuccess,
}: UploadRecordsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRecord[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseDate = (dateStr: string | number | undefined): Date => {
    if (!dateStr) return new Date();

    const str = String(dateStr).trim();

    // Handle formats like "22-Sept", "02-Dec", "30-11", "30-Sept"
    const monthMap: { [key: string]: number } = {
      jan: 0,
      january: 0,
      feb: 1,
      february: 1,
      mar: 2,
      march: 2,
      apr: 3,
      april: 3,
      may: 4,
      jun: 5,
      june: 5,
      jul: 6,
      july: 6,
      aug: 7,
      august: 7,
      sep: 8,
      sept: 8,
      september: 8,
      oct: 9,
      october: 9,
      nov: 10,
      november: 10,
      dec: 11,
      december: 11,
    };

    // Try "DD-MMM" format (e.g., "22-Sept")
    const dayMonthMatch = str.match(/^(\d{1,2})[-/](\w+)$/i);
    if (dayMonthMatch) {
      const day = parseInt(dayMonthMatch[1]);
      const monthStr = dayMonthMatch[2].toLowerCase();
      const month = monthMap[monthStr];
      if (month !== undefined) {
        return new Date(2025, month, day);
      }
    }

    // Try "DD-MM" format (e.g., "30-11")
    const numericMatch = str.match(/^(\d{1,2})[-/](\d{1,2})$/);
    if (numericMatch) {
      const day = parseInt(numericMatch[1]);
      const month = parseInt(numericMatch[2]) - 1;
      return new Date(2025, month, day);
    }

    // Fallback to default date parsing
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const normalizePhone = (phone: string | number | undefined): string => {
    if (!phone) return "";
    const str = String(phone).replace(/[^0-9]/g, "");
    // Ensure it starts with 0 if it's a Pakistani number
    if (str.length === 10 && !str.startsWith("0")) {
      return "0" + str;
    }
    return str;
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setParsedData([]);
    setUploadResult(null);
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as unknown[][];

      // Find header row (look for "Name" column)
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i] as string[];
        if (row.some((cell) => String(cell).toLowerCase().includes("name"))) {
          headerRowIndex = i;
          break;
        }
      }

      const headerRow = jsonData[headerRowIndex] as string[];

      // Find column indices
      const findColumnIndex = (keywords: string[]): number => {
        return headerRow.findIndex((cell) =>
          keywords.some((kw) =>
            String(cell || "")
              .toLowerCase()
              .includes(kw)
          )
        );
      };

      const voucherIdx = findColumnIndex(["v#", "voucher", "v #"]);
      const nameIdx = findColumnIndex(["name"]);
      const balanceIdx = findColumnIndex(["balance", "amount", "due"]);
      const dateIdx = findColumnIndex(["date"]);
      const phoneIdx = findColumnIndex([
        "mobile",
        "phone",
        "number",
        "contact",
      ]);

      if (nameIdx === -1) {
        throw new Error("Could not find 'Name' column in the Excel file");
      }

      // Parse data rows
      const records: ParsedRecord[] = [];
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i] as (string | number | undefined)[];
        if (!row || row.length === 0) continue;

        const name = String(row[nameIdx] || "").trim();
        if (!name) continue; // Skip empty rows

        const phone = normalizePhone(row[phoneIdx]);
        const balance =
          parseFloat(String(row[balanceIdx] || "0").replace(/[^0-9.-]/g, "")) ||
          0;
        const dateStr = row[dateIdx] ? String(row[dateIdx]) : undefined;
        const voucherNumber = row[voucherIdx]
          ? String(row[voucherIdx])
          : undefined;

        const isValid = name.length > 0;
        const hasPhone = phone.length >= 10;

        records.push({
          voucherNumber,
          name,
          balance,
          date: dateStr,
          phone,
          isValid,
          error: !isValid
            ? "Invalid name"
            : !hasPhone
            ? "Missing/invalid phone (will be marked unverified)"
            : undefined,
        });
      }

      if (records.length === 0) {
        throw new Error("No valid records found in the Excel file");
      }

      setParsedData(records);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse Excel file"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const response = await fetch("/api/clients/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: parsedData.map((r) => ({
            name: r.name,
            phone: r.phone,
            balance: r.balance,
            date: r.date
              ? parseDate(r.date).toISOString()
              : new Date().toISOString(),
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to import records");
      }

      setUploadResult({
        success: result.imported || 0,
        failed: result.failed || 0,
        errors: result.errors || [],
      });

      if (result.imported > 0) {
        toast.success(`Successfully imported ${result.imported} client(s)`);
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload records");
    } finally {
      setUploading(false);
      setUploadProgress(100);
    }
  };

  const handleClose = () => {
    setParsedData([]);
    setFileName("");
    setError(null);
    setUploadResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const validRecords = parsedData.filter((r) => r.isValid);
  const invalidRecords = parsedData.filter((r) => !r.isValid);
  const unverifiedRecords = parsedData.filter(
    (r) => r.isValid && r.phone.length < 10
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <UploadIcon sx={{ color: "#1a237e" }} />
        Upload Client Records
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {uploadResult && (
          <Alert
            severity={uploadResult.failed > 0 ? "warning" : "success"}
            sx={{ mb: 2 }}
          >
            <Typography variant="body2">
              Import completed: {uploadResult.success} successful,{" "}
              {uploadResult.failed} failed
            </Typography>
            {uploadResult.errors.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {uploadResult.errors.slice(0, 5).map((err, i) => (
                  <Typography
                    key={i}
                    variant="caption"
                    display="block"
                    color="error"
                  >
                    • {err}
                  </Typography>
                ))}
                {uploadResult.errors.length > 5 && (
                  <Typography variant="caption" color="text.secondary">
                    ... and {uploadResult.errors.length - 5} more errors
                  </Typography>
                )}
              </Box>
            )}
          </Alert>
        )}

        {/* File Upload Area */}
        {parsedData.length === 0 && !uploadResult && (
          <Box
            sx={{
              border: "2px dashed #ccc",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              backgroundColor: "#fafafa",
              cursor: "pointer",
              "&:hover": {
                borderColor: "#1a237e",
                backgroundColor: "#f5f5f5",
              },
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
            />
            {loading ? (
              <CircularProgress />
            ) : (
              <>
                <UploadIcon sx={{ fontSize: 48, color: "#1a237e", mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Click to upload Excel file
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supported formats: .xlsx, .xls, .csv
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 2, display: "block" }}
                >
                  Excel should have columns: V#, Name, Balance, Date, Mobile
                  Number
                </Typography>
              </>
            )}
          </Box>
        )}

        {/* Preview Table */}
        {parsedData.length > 0 && !uploadResult && (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <FileIcon color="primary" />
              <Typography variant="body1" fontWeight={500}>
                {fileName}
              </Typography>
              <Button
                size="small"
                onClick={() => {
                  setParsedData([]);
                  setFileName("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Change File
              </Button>
            </Box>

            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Chip
                icon={<SuccessIcon />}
                label={`${validRecords.length} Valid`}
                color="success"
                variant="outlined"
              />
              {unverifiedRecords.length > 0 && (
                <Chip
                  label={`${unverifiedRecords.length} Missing Phone (Unverified)`}
                  color="warning"
                  variant="outlined"
                />
              )}
              {invalidRecords.length > 0 && (
                <Chip
                  icon={<ErrorIcon />}
                  label={`${invalidRecords.length} Invalid (will be skipped)`}
                  color="error"
                  variant="outlined"
                />
              )}
            </Box>

            {uploading && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress variant="indeterminate" />
                <Typography variant="caption" color="text.secondary">
                  Importing records...
                </Typography>
              </Box>
            )}

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>#</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="right">
                      Balance
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsedData.map((record, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        backgroundColor: !record.isValid
                          ? "rgba(244, 67, 54, 0.1)"
                          : record.phone.length < 10
                          ? "rgba(255, 152, 0, 0.1)"
                          : "inherit",
                      }}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{record.name}</TableCell>
                      <TableCell>{record.phone || "-"}</TableCell>
                      <TableCell align="right">
                        Rs. {record.balance.toLocaleString()}
                      </TableCell>
                      <TableCell>{record.date || "-"}</TableCell>
                      <TableCell>
                        {!record.isValid ? (
                          <Chip label="Invalid" size="small" color="error" />
                        ) : record.phone.length < 10 ? (
                          <Chip
                            label="Unverified"
                            size="small"
                            color="warning"
                          />
                        ) : (
                          <Chip label="Valid" size="small" color="success" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          {uploadResult ? "Close" : "Cancel"}
        </Button>
        {parsedData.length > 0 && !uploadResult && (
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading || validRecords.length === 0}
            startIcon={
              uploading ? <CircularProgress size={16} /> : <UploadIcon />
            }
            sx={{
              background: "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
            }}
          >
            Import {validRecords.length} Record(s)
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
