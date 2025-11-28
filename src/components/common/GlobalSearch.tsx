"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TextField,
  InputAdornment,
  Autocomplete,
  Paper,
  Box,
  Typography,
  Chip,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PaymentIcon from "@mui/icons-material/Payment";
import { useRouter } from "next/navigation";

interface SearchResult {
  type: "client" | "invoice" | "payment";
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

const typeIcons = {
  client: <PersonIcon fontSize="small" />,
  invoice: <ReceiptIcon fontSize="small" />,
  payment: <PaymentIcon fontSize="small" />,
};

const typeColors = {
  client: "primary",
  invoice: "secondary",
  payment: "success",
} as const;

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const searchFn = useCallback(async (query: string) => {
    if (query.length < 2) {
      setOptions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setOptions(data.results || []);
    } catch (error) {
      console.error("Search error:", error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchFn(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, searchFn]);

  const handleSelect = (
    event: React.SyntheticEvent,
    value: SearchResult | null
  ) => {
    if (value) {
      router.push(value.url);
      setInputValue("");
      setOpen(false);
    }
  };

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      inputValue={inputValue}
      onInputChange={(event, newValue) => setInputValue(newValue)}
      onChange={handleSelect}
      options={options}
      loading={loading}
      getOptionLabel={(option) => option.title}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      filterOptions={(x) => x} // Disable built-in filtering
      sx={{ width: 350 }}
      PaperComponent={({ children }) => (
        <Paper elevation={8} sx={{ mt: 1 }}>
          {children}
        </Paper>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search clients, invoices, payments..."
          size="small"
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {loading ? (
                  <CircularProgress color="inherit" size={20} />
                ) : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "rgba(255,255,255,0.15)",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.25)",
              },
              "& fieldset": {
                borderColor: "rgba(255,255,255,0.3)",
              },
              "&:hover fieldset": {
                borderColor: "rgba(255,255,255,0.5)",
              },
            },
            "& input": {
              color: "white",
              "&::placeholder": {
                color: "rgba(255,255,255,0.7)",
              },
            },
          }}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <Box
            component="li"
            key={key}
            {...rest}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              py: 1.5,
              px: 2,
            }}
          >
            <Chip
              icon={typeIcons[option.type]}
              label={option.type}
              size="small"
              color={typeColors[option.type]}
              sx={{ textTransform: "capitalize" }}
            />
            <Box>
              <Typography variant="body2" fontWeight={500}>
                {option.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {option.subtitle}
              </Typography>
            </Box>
          </Box>
        );
      }}
      noOptionsText={
        inputValue.length < 2
          ? "Type at least 2 characters to search"
          : "No results found"
      }
    />
  );
}
