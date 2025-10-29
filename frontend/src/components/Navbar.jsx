import React from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import InputBase from '@mui/material/InputBase'
import Paper from '@mui/material/Paper'
import { Link as RouterLink } from 'react-router-dom'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import { useAuth } from '../store/AuthContext'
import { useColorMode } from '../store/ThemeContext'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import SearchIcon from '@mui/icons-material/Search'
import DashboardIcon from '@mui/icons-material/Dashboard'
import MapIcon from '@mui/icons-material/Map'
import AgricultureIcon from '@mui/icons-material/Agriculture'
import ScienceIcon from '@mui/icons-material/Science'
import ThunderstormIcon from '@mui/icons-material/Thunderstorm'
import PersonIcon from '@mui/icons-material/Person'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { token, logout } = useAuth()
  const { mode, toggleColorMode } = useColorMode()
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const qParam = params.get('q') || ''

  function onSearchChange(e) {
    const q = e.target.value
    const next = new URLSearchParams(location.search)
    if (q) next.set('q', q); else next.delete('q')
    navigate({ pathname: '/', search: next.toString() })
  }
  return (
    <AppBar position="sticky">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          <Link component={RouterLink} to="/" color="inherit" underline="none">ML-Assisted Farming</Link>
        </Typography>
        {token && (
          <Paper component="form" onSubmit={(e) => e.preventDefault()} sx={{ mr: 2, px: 1, py: 0.25, display: { xs: 'none', sm: 'flex' }, alignItems: 'center', width: 260 }}>
            <SearchIcon fontSize="small" />
            <InputBase sx={{ ml: 1, flex: 1 }} placeholder="Search plots, activities..." value={qParam} onChange={onSearchChange} />
          </Paper>
        )}
        <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <IconButton color="inherit" onClick={toggleColorMode} sx={{ mr: 1 }}>
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
        {token ? (
          <Stack direction="row" spacing={2}>
            <Button color="inherit" component={RouterLink} to="/"><DashboardIcon sx={{ mr: 0.5 }} />Dashboard</Button>
            <Button color="inherit" component={RouterLink} to="/land-selection"><MapIcon sx={{ mr: 0.5 }} />Land</Button>
            <Button color="inherit" component={RouterLink} to="/crop-recommendation"><AgricultureIcon sx={{ mr: 0.5 }} />Crop</Button>
            <Button color="inherit" component={RouterLink} to="/cost-estimation"><ScienceIcon sx={{ mr: 0.5 }} />Cost</Button>
            <Button color="inherit" component={RouterLink} to="/disease-detection"><ScienceIcon sx={{ mr: 0.5 }} />Disease</Button>
            <Button color="inherit" component={RouterLink} to="/weather-alerts"><ThunderstormIcon sx={{ mr: 0.5 }} />Weather</Button>
            <Button color="inherit" component={RouterLink} to="/profile"><PersonIcon sx={{ mr: 0.5 }} />Profile</Button>
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
