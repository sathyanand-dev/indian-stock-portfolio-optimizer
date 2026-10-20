import { useEffect, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { getMarketIndices } from '../../api/data.api';
import { formatNumber } from '../../shared/utils/formatters';

const REFRESH_MS = 60_000;

export default function LiveIndexTicker() {
  const [indices, setIndices] = useState([]);
  const [marketOpen, setMarketOpen] = useState(false);

  const load = async () => {
    try {
      const data = await getMarketIndices();
      const valid = (data.indices || []).filter(
        (item) => Number.isFinite(item.price) && item.price > 0
      );
      if (valid.length > 0) {
        setIndices(valid);
        setMarketOpen(Boolean(data.market_open));
      }
    } catch {
      // Keep last known values on refresh failure
    }
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  if (indices.length === 0) {
    return (
      <Box
        sx={{
          bgcolor: '#1A252F',
          color: 'rgba(255,255,255,0.7)',
          py: 0.75,
          px: 2,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Typography variant="caption">Loading Indian market indices…</Typography>
      </Box>
    );
  }

  const loop = [...indices, ...indices];

  return (
    <Box
      sx={{
        overflow: 'hidden',
        bgcolor: '#1A252F',
        color: 'white',
        py: 0.75,
        position: 'relative',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        zIndex: (theme) => theme.zIndex.drawer + 2,
      }}
    >
      <Chip
        label={marketOpen ? 'LIVE' : 'LAST'}
        size="small"
        sx={{
          ml: 1.5,
          mr: 1,
          height: 22,
          fontWeight: 700,
          fontSize: '0.65rem',
          bgcolor: marketOpen ? '#27AE60' : '#7F8C8D',
          color: 'white',
          flexShrink: 0,
        }}
      />
      <Box sx={{ overflow: 'hidden', flex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            width: 'max-content',
            animation: 'indexScroll 45s linear infinite',
            '@keyframes indexScroll': {
              '0%': { transform: 'translateX(0)' },
              '100%': { transform: 'translateX(-50%)' },
            },
            '&:hover': { animationPlayState: 'paused' },
          }}
        >
          {loop.map((item, index) => {
            const up = item.change > 0;
            const flat = item.change === 0;
            return (
              <Box
                key={`${item.symbol}-${index}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 0.75, sm: 1 },
                  px: { xs: 1.5, sm: 2.5 },
                  whiteSpace: 'nowrap',
                  borderRight: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
                  {item.name}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.95 }}>
                  {formatNumber(item.price)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: flat ? '#BDC3C7' : up ? '#2ECC71' : '#E74C3C',
                  }}
                >
                  {flat
                    ? '0.00%'
                    : `${up ? '+' : ''}${Number(item.change_percent).toFixed(2)}%`}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
