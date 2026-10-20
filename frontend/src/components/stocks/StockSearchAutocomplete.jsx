import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
  Box,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import { searchSymbols } from '../../api/data.api';

export default function StockSearchAutocomplete({
  selectedSymbols = [],
  onSelect,
  label = 'Search stocks by name or symbol',
  placeholder = 'e.g. Reliance, HDFC Bank, TCS, Gold ETF...',
  disabled = false,
}) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  const selectedSet = useMemo(() => new Set(selectedSymbols), [selectedSymbols]);

  const runSearch = useCallback(
    async (query) => {
      const id = ++requestId.current;
      setLoading(true);
      try {
        const results = await searchSymbols(query.trim(), 25);
        if (id !== requestId.current) return;
        setOptions(results.filter((item) => !selectedSet.has(item.symbol)));
      } catch {
        if (id !== requestId.current) return;
        setOptions([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [selectedSet]
  );

  useEffect(() => {
    if (open && options.length === 0 && !inputValue.trim()) {
      runSearch('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!open) return;
      runSearch(inputValue);
    }, 250);
    return () => clearTimeout(timer);
  }, [inputValue, open, runSearch]);

  return (
    <Autocomplete
      id="stock-search-autocomplete"
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      loading={loading}
      value={null}
      inputValue={inputValue}
      onInputChange={(_event, value, reason) => {
        if (reason === 'input' || reason === 'clear') {
          setInputValue(value);
        }
      }}
      onChange={(_event, value) => {
        if (value && typeof value !== 'string') {
          onSelect(value.symbol, value);
          setInputValue('');
          setOpen(true);
          runSearch('');
        }
      }}
      getOptionLabel={(option) =>
        typeof option === 'string' ? option : `${option.symbol} — ${option.name}`
      }
      isOptionEqualToValue={(option, value) => option.symbol === value.symbol}
      filterOptions={(x) => x}
      noOptionsText={
        loading
          ? 'Searching…'
          : inputValue.trim().length > 0
            ? 'No matching NSE/BSE stocks found'
            : 'Type a company name or symbol'
      }
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.symbol}>
          <Box sx={{ display: 'flex', flexDirection: 'column', py: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {option.symbol}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {option.name} · {option.exchange}
              {option.type && option.type !== 'EQUITY' ? ` · ${option.type}` : ''}
            </Typography>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          disabled={disabled}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
