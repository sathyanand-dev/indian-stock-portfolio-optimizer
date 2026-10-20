import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

/** True below the `md` breakpoint — the phone/small-tablet layout. */
export function useIsMobile() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('md'));
}

/** True below `sm` — narrow phones, where labels usually have to go. */
export function useIsCompact() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
}

export default useIsMobile;
