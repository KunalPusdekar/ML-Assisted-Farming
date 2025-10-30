import React, { useState } from 'react'
import { Box, Button, Grid, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material'
import api from '../services/api'
import AlertBanner from '../components/AlertBanner'

export default function CropRecommendation() {
  const [form, setForm] = useState({ nitrogen: '', phosphorus: '', potassium: '', ph: '', rainfall: '', temperature: '', humidity: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recs, setRecs] = useState([])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k,v]) => [k, Number(v)]))
      const { data } = await api.post('/predict_crop', payload)
      setRecs(data.recommendations)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to get recommendations')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" mb={3}>Crop Recommendation</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Box component="form" onSubmit={onSubmit}>
              <Stack spacing={2}>
                <TextField label="Nitrogen" name="nitrogen" type="number" value={form.nitrogen} onChange={handleChange} required />
                <TextField label="Phosphorus" name="phosphorus" type="number" value={form.phosphorus} onChange={handleChange} required />
                <TextField label="Potassium" name="potassium" type="number" value={form.potassium} onChange={handleChange} required />
                <TextField label="pH" name="ph" type="number" value={form.ph} onChange={handleChange} required />
                <TextField label="Rainfall (mm)" name="rainfall" type="number" value={form.rainfall} onChange={handleChange} required />
                <TextField label="Temperature (°C)" name="temperature" type="number" value={form.temperature} onChange={handleChange} required />
                <TextField label="Humidity (%)" name="humidity" type="number" value={form.humidity} onChange={handleChange} required />
                {error && <AlertBanner severity="error">{error}</AlertBanner>}
                <Button variant="contained" type="submit" disabled={loading}>{loading ? 'Predicting...' : 'Predict'}</Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Stack spacing={2}>
            {recs.map((r, idx) => (
              <Paper key={idx} sx={{ p: 2 }}>
                <Typography variant="subtitle1">{r.crop}</Typography>
                {typeof r.confidence === 'number' ? (
                  <>
                    <LinearProgress variant="determinate" value={Math.round(r.confidence * 100)} sx={{ my: 1 }} />
                    <Typography variant="body2" color="text.secondary">Confidence: {(r.confidence * 100).toFixed(1)}%</Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">Confidence unavailable</Typography>
                )}
              </Paper>
            ))}
            {!loading && recs.length === 0 && <Typography variant="body2">No recommendations yet. Submit the form.</Typography>}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}
