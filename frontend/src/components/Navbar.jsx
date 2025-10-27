import React from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { Link as RouterLink } from 'react-router-dom'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import { useAuth } from '../store/AuthContext'

export default function Navbar() {
  const { token, logout } = useAuth()
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          <Link component={RouterLink} to="/" color="inherit" underline="none">ML-Assisted Farming</Link>
        </Typography>
        {token ? (
          <Stack direction="row" spacing={2}>
            <Button color="inherit" component={RouterLink} to="/crop-recommendation">Crop</Button>
            <Button color="inherit" component={RouterLink} to="/cost-estimation">Cost</Button>
            <Button color="inherit" component={RouterLink} to="/disease-detection">Disease</Button>
            <Button color="inherit" component={RouterLink} to="/weather-alerts">Weather</Button>
            <Button color="inherit" component={RouterLink} to="/profile">Profile</Button>
            <Button color="inherit" onClick={logout}>Logout</Button>
          </Stack>
        ) : (
          <Stack direction="row" spacing={2}>
            <Button color="inherit" component={RouterLink} to="/login">Login</Button>
            <Button color="inherit" component={RouterLink} to="/signup">Signup</Button>
          </Stack>
        )}
      </Toolbar>
    </AppBar>
  )
}
