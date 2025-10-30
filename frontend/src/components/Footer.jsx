import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Link from '@mui/material/Link'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import FacebookIcon from '@mui/icons-material/Facebook'
import TwitterIcon from '@mui/icons-material/Twitter'
import InstagramIcon from '@mui/icons-material/Instagram'
import AgricultureIcon from '@mui/icons-material/Agriculture'
import MemoryIcon from '@mui/icons-material/Memory'
import { Link as RouterLink } from 'react-router-dom'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [snackOpen, setSnackOpen] = useState(false)
  const [snackMsg, setSnackMsg] = useState('')

  function handleSubscribe(e) {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSnackMsg('Please enter a valid email address')
      setSnackOpen(true)
      return
    }
    // In a real app, call backend to save subscription
    setSnackMsg('Thanks for subscribing! 🌱')
    setSnackOpen(true)
    setEmail('')
  }

  return (
    <Box component="footer" sx={{ mt: 6, px: 2 }}>
      <Divider />
      <Box sx={{ py: 4, textAlign: 'center', bgcolor: theme => theme.palette.mode === 'dark' ? 'background.default' : 'grey.100', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ maxWidth: 1100, mx: 'auto', px: 2 }}>
          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' }, gap: 1 }}>
              <AgricultureIcon color="primary" /> ML-Assisted Farming
            </Typography>
            <Typography variant="body2" color="text.secondary">Smart insights for sustainable agriculture 🌱🌾</Typography>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'center', md: 'flex-start' }} sx={{ mt: 1 }}>
              <IconButton color="primary" aria-label="Facebook" sx={{ transition: 'transform 200ms ease', '&:hover': { transform: 'scale(1.1)' } }}><FacebookIcon /></IconButton>
              <IconButton color="primary" aria-label="Twitter" sx={{ transition: 'transform 200ms ease', '&:hover': { transform: 'scale(1.1)' } }}><TwitterIcon /></IconButton>
              <IconButton color="primary" aria-label="Instagram" sx={{ transition: 'transform 200ms ease', '&:hover': { transform: 'scale(1.1)' } }}><InstagramIcon /></IconButton>
            </Stack>
          </Box>

          <Stack spacing={0.5} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="subtitle2">Links</Typography>
            <Link component={RouterLink} to="/about" underline="hover" color="inherit">About Us</Link>
            <Link component={RouterLink} to="/contact" underline="hover" color="inherit">Contact</Link>
            <Link component={RouterLink} to="/privacy" underline="hover" color="inherit">Privacy Policy</Link>
            <Link component={RouterLink} to="/terms" underline="hover" color="inherit">Terms of Service</Link>
          </Stack>

          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Subscribe for tips and updates 🌦️</Typography>
            <Box component="form" onSubmit={handleSubscribe} sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'center', md: 'flex-start' } }}>
              <TextField size="small" type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ width: { xs: '70%', md: 240 } }} />
              <Button variant="contained" type="submit">Subscribe</Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>We care about your privacy. No spam, ever.</Typography>
          </Box>

          <Stack spacing={0.5} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MemoryIcon fontSize="small" /> Credits
            </Typography>
            <Typography variant="body2" color="text.secondary">Powered by Machine Learning for Smart Farming 🤖🌾</Typography>
            <Typography variant="caption" color="text.secondary">Models and analytics enhance crop and soil decisions.</Typography>
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" alignItems="center" sx={{ mt: 3 }}>
          <Link component={RouterLink} to="/" underline="hover" color="inherit">Dashboard</Link>
          <Link component={RouterLink} to="/land-selection" underline="hover" color="inherit">Land</Link>
          <Link component={RouterLink} to="/crop-recommendation" underline="hover" color="inherit">Crop</Link>
          <Link component={RouterLink} to="/cost-estimation" underline="hover" color="inherit">Cost</Link>
          <Link component={RouterLink} to="/weather-alerts" underline="hover" color="inherit">Weather</Link>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          © {new Date().getFullYear()} ML-Assisted Farming
        </Typography>
      </Box>

      <Snackbar open={snackOpen} autoHideDuration={3000} onClose={() => setSnackOpen(false)} message={snackMsg} />
    </Box>
  )
}
