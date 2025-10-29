import React, { useEffect, useMemo, useState } from 'react'
import { Box, Grid, Paper, Typography, Button, Chip, Stack, Grow, Divider, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Accordion, AccordionSummary, AccordionDetails, Alert } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import MapIcon from '@mui/icons-material/Map'
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt'
import AgricultureIcon from '@mui/icons-material/Agriculture'
import ScienceIcon from '@mui/icons-material/Science'
import ThunderstormIcon from '@mui/icons-material/Thunderstorm'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import EditIcon from '@mui/icons-material/Edit'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

const COLORS = ['#2f855a', '#2b6cb0', '#dd6b20', '#805ad5']

export default function Dashboard() {
  const [history, setHistory] = useState([])
  const [plots, setPlots] = useState([])
  const navigate = useNavigate()
  const location = useLocation()
  const { user, setUser } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [weather, setWeather] = useState(null)
  const [weatherErr, setWeatherErr] = useState('')
  const [fertN, setFertN] = useState('')
  const [fertP, setFertP] = useState('')
  const [fertK, setFertK] = useState('')
  const [fertPh, setFertPh] = useState('')
  const [fertLoading, setFertLoading] = useState(false)
  const [fertError, setFertError] = useState('')
  const [fertResult, setFertResult] = useState(null)

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await api.get('/user_history')
        setHistory(data)
      } catch (e) { /* ignore */ }
    }
    run()
  }, [])

  useEffect(() => {
    const loadPlots = async () => {
      try {
        const { data } = await api.get('/plots')
        setPlots(data)
      } catch (e) { /* ignore */ }
    }
    loadPlots()
  }, [])

  // Weather widget - use first plot center if available
  useEffect(() => {
    async function loadWeather() {
      if (!plots.length) return
      try {
        const coords = plots[0].coordinates || []
        if (!coords.length) return
        const lat = coords.reduce((a, c) => a + c.lat, 0) / coords.length
        const lng = coords.reduce((a, c) => a + c.lng, 0) / coords.length
        const today = new Date()
        const start = new Date(today); start.setDate(today.getDate() - 2)
        const fmt = (d) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
        const { data } = await api.post('/weather_alerts', { latitude: lat, longitude: lng, start: fmt(start), end: fmt(today) })
        setWeather(data)
      } catch (e) { setWeatherErr('Weather unavailable') }
    }
    loadWeather()
  }, [plots])

  const summary = useMemo(() => {
    const map = history.reduce((acc, h) => {
      acc[h.type] = (acc[h.type] || 0) + 1
      return acc
    }, {})
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [history])

  const q = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return (params.get('q') || '').toLowerCase()
  }, [location.search])

  const filteredPlots = useMemo(() => (
    q ? plots.filter(p => p.name.toLowerCase().includes(q)) : plots
  ), [plots, q])

  const filteredHistory = useMemo(() => (
    q ? history.filter(h => h.type.toLowerCase().includes(q)) : history
  ), [history, q])

  async function saveProfile() {
    try {
      const { data } = await api.put('/profile', { full_name: fullName })
      setUser((u) => ({ ...(u || {}), full_name: data.full_name }))
      setProfileOpen(false)
    } catch {}
  }

  async function runFertilizer() {
    try {
      setFertError('')
      setFertResult(null)
      const N = parseFloat(fertN)
      const P = parseFloat(fertP)
      const K = parseFloat(fertK)
      const pH = fertPh ? parseFloat(fertPh) : undefined
      if (![N, P, K].every((v) => Number.isFinite(v))) {
        setFertError('Enter valid N, P, K values')
        return
      }
      setFertLoading(true)
      const { data } = await api.post('/fertilizer_recommendation', { nitrogen: N, phosphorus: P, potassium: K, ph: pH })
      setFertResult(data)
    } catch (e) {
      setFertError(e?.response?.data?.detail || e.message || 'Failed')
    } finally {
      setFertLoading(false)
    }
  }

  // Reusable rectangular card style with pretty hover effects
  const cardSx = {
    p: 2,
    borderRadius: 1.5,
    border: '1px solid',
    borderColor: 'divider',
    transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
    backgroundImage: theme => theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0))'
      : 'linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0))',
    '&:hover': {
      transform: 'translateY(-6px)',
      boxShadow: 8,
      borderColor: theme => (theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light')
    }
  }

  return (
    <Box>
      <Typography variant="h5" mb={1}>Dashboard</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>A quick overview of your farm insights and tools</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Grow in timeout={400}>
            <Paper sx={cardSx}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <SatelliteAltIcon color="primary" />
                  <Typography variant="subtitle1">User Activity</Typography>
                </Stack>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={summary} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {summary.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grow>
        </Grid>
        <Grid item xs={12} md={4}>
          <Grow in timeout={500}>
            <Paper sx={cardSx}>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <ScienceIcon color="secondary" />
                <Typography variant="subtitle1">Recent Activity</Typography>
              </Stack>
              <Divider sx={{ mb: 1 }} />
              {filteredHistory.slice(0, 6).map(h => (
                <Box key={h.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: theme => `1px solid ${theme.palette.divider}`, cursor: 'pointer' }} onClick={() => {
                  const route = h.type.includes('crop') ? '/crop-recommendation' : h.type.includes('cost') ? '/cost-estimation' : h.type.includes('disease') ? '/disease-detection' : h.type.includes('weather') ? '/weather-alerts' : '/'
                  navigate(route)
                }}>
                  <Typography variant="body2">{h.type}</Typography>
                  <Typography variant="body2" color="text.secondary">{new Date(h.created_at).toLocaleString()}</Typography>
                </Box>
              ))}
              {filteredHistory.length === 0 && <Typography variant="body2">No activity yet.</Typography>}
            </Paper>
          </Grow>
        </Grid>

        <Grid item xs={12} md={4}>
          <Grow in timeout={450}>
            <Paper sx={cardSx}>
              <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                <Avatar>{(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}</Avatar>
                <Box>
                  <Typography variant="subtitle1">{user?.full_name || user?.email || 'User'}</Typography>
                  <Chip label="Online" color="success" size="small" />
                </Box>
                <Box sx={{ flexGrow: 1 }} />
                <Button size="small" startIcon={<EditIcon />} onClick={() => setProfileOpen(true)}>Edit</Button>
              </Stack>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Help & Tips</AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    - Use Land to draw your farm polygon and save.
                    <br />- Check Quick Actions to run analyses.
                    <br />- Use the search bar to find plots and activities.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Paper>
          </Grow>
        </Grid>

        <Grid item xs={12} md={8}>
          <Grow in timeout={500}>
            <Paper sx={cardSx}>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <ThunderstormIcon color="primary" />
                <Typography variant="subtitle1">Weather</Typography>
              </Stack>
              <Divider sx={{ mb: 1 }} />
              {weatherErr && <Alert severity="warning" sx={{ mb: 1 }}>{weatherErr}</Alert>}
              {weather ? (
                <Typography variant="body2">{weather.alerts?.length || 0} alerts; data loaded.</Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">Weather will appear once you add a plot.</Typography>
              )}
            </Paper>
          </Grow>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Fertilizer Recommendation</Typography>
          <Grow in timeout={550}>
            <Paper sx={{ p: 2, borderRadius: 3, boxShadow: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Nitrogen (N)" type="number" value={fertN} onChange={(e) => setFertN(e.target.value)} />
                <TextField label="Phosphorus (P)" type="number" value={fertP} onChange={(e) => setFertP(e.target.value)} />
                <TextField label="Potassium (K)" type="number" value={fertK} onChange={(e) => setFertK(e.target.value)} />
                <TextField label="pH (optional)" type="number" value={fertPh} onChange={(e) => setFertPh(e.target.value)} />
                <Button variant="contained" onClick={runFertilizer} disabled={fertLoading}>{fertLoading ? 'Running...' : 'Get Recommendation'}</Button>
              </Stack>
              {fertError && <Alert severity="error" sx={{ mt: 2 }}>{fertError}</Alert>}
              {fertResult && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Recommendation: <strong>{fertResult.label}</strong>{fertResult.confidence != null ? ` (confidence ${Math.round(fertResult.confidence * 100)}%)` : ''}
                </Alert>
              )}
            </Paper>
          </Grow>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>My Plots</Typography>
          <Grid container spacing={2}>
            {filteredPlots.map((p, idx) => (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <Grow in timeout={300 + idx * 100}>
                  <Paper
                    sx={{ ...cardSx, cursor: 'pointer' }}
                    onClick={() => navigate('/land-selection')}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack>
                        <Typography variant="subtitle1">{p.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{p.area_hectares} ha</Typography>
                      </Stack>
                      <Chip label="Active" color="success" size="small" />
                    </Stack>
                    <Stack direction="row" spacing={1} mt={2}>
                      <Button startIcon={<MapIcon />} size="small" onClick={(e) => { e.stopPropagation(); navigate('/land-selection') }}>Open</Button>
                      <Button startIcon={<SatelliteAltIcon />} size="small" onClick={(e) => { e.stopPropagation(); navigate('/land-selection') }}>Satellite</Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Soil health: {p.organic_matter != null ? `${p.organic_matter}% OM` : '—'} • pH: {p.ph != null ? p.ph : '—'}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Created {new Date(p.created_at).toLocaleDateString()}</Typography>
                  </Paper>
                </Grow>
              </Grid>
            ))}
            {plots.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, borderRadius: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No plots yet. Create one in Land Selection.</Typography>
                  <Button variant="contained" sx={{ mt: 1 }} startIcon={<MapIcon />} onClick={() => navigate('/land-selection')}>Create Plot</Button>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Quick Actions</Typography>
          <Grid container spacing={2}>
            {[{ label: 'Crop Recommendation', icon: <AgricultureIcon />, to: '/crop-recommendation' }, { label: 'Cost Estimation', icon: <ScienceIcon />, to: '/cost-estimation' }, { label: 'Disease Detection', icon: <ScienceIcon />, to: '/disease-detection' }, { label: 'Weather Alerts', icon: <ThunderstormIcon />, to: '/weather-alerts' }].map((item, idx) => (
              <Grid item xs={12} sm={6} md={3} key={item.label}>
                <Grow in timeout={400 + idx * 100}>
                  <Paper onClick={() => navigate(item.to)} sx={{ p: 2, borderRadius: 3, textAlign: 'center', cursor: 'pointer', transition: 'transform 200ms ease, box-shadow 200ms ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
                    <Box sx={{ fontSize: 0, mb: 1 }}>{item.icon}</Box>
                    <Typography>{item.label}</Typography>
                  </Paper>
                </Grow>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>

      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveProfile}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
