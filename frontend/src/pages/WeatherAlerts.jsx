import React, { useState } from 'react'
import { Box, Button, Grid, Paper, Stack, TextField, Typography, Chip } from '@mui/material'
import api from '../services/api'
import AlertBanner from '../components/AlertBanner'

const severityColor = (sev) => {
  switch (sev) {
    case 'high': return 'error'
    case 'medium': return 'warning'
    default: return 'info'
  }
}

export default function WeatherAlerts() {
  const [form, setForm] = useState({ latitude: '', longitude: '', start: '', end: '' })
  const [alerts, setAlerts] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) }
      const { data } = await api.post('/weather_alerts', payload)
      setAlerts(data.alerts || [])
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to fetch alerts')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" mb={3}>Weather Alerts</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <form onSubmit={onSubmit}>
              <Stack spacing={2}>
                <TextField label="Latitude" name="latitude" type="number" value={form.latitude} onChange={handleChange} required />
                <TextField label="Longitude" name="longitude" type="number" value={form.longitude} onChange={handleChange} required />
                <TextField label="Start (YYYYMMDD)" name="start" value={form.start} onChange={handleChange} required />
                <TextField label="End (YYYYMMDD)" name="end" value={form.end} onChange={handleChange} required />
                {error && <AlertBanner severity="error">{error}</AlertBanner>}
                <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Loading...' : 'Fetch Alerts'}</Button>
              </Stack>
            </form>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Stack spacing={2}>
            {alerts.map((a, idx) => (
              <Paper key={idx} sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1">{a.type}</Typography>
                  <Chip label={a.severity?.toUpperCase()} color={severityColor(a.severity)} />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{a.message}</Typography>
              </Paper>
            ))}
            {alerts.length === 0 && <Typography variant="body2">No alerts yet. Submit the form.</Typography>}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}
