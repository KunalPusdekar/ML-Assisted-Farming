import React, { useState } from 'react'
import { Box, Button, Grid, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material'
import api from '../services/api'
import AlertBanner from '../components/AlertBanner'

export default function CropRecommendation() {
  const [form, setForm] = useState({ nitrogen: '', phosphorus: '', potassium: '', ph: '', rainfall: '', temperature: '', humidity: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recs, setRecs] = useState([])

  // Location & fetching states
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [locationError, setLocationError] = useState('')
  const [fetchingEnv, setFetchingEnv] = useState(false)
  const [missingFields, setMissingFields] = useState([])

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

  // Try to get browser geolocation
  const useMyLocation = () => {
    setLocationError('')
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLon(pos.coords.longitude.toFixed(6))
      },
      (err) => setLocationError(err.message || 'Unable to retrieve your location')
    )
  }

  // Fetch weather (Open-Meteo) and soil (SoilGrids) data for given lat/lon
  const fetchEnvironmentalData = async (useLat = lat, useLon = lon) => {
    setFetchingEnv(true)
    setLocationError('')
    setMissingFields([])
    try {
      const latitude = Number(useLat)
      const longitude = Number(useLon)
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        setLocationError('Please provide valid numeric latitude and longitude')
        return
      }
      // We'll build a new form object from current values and merge API results into it,
      // then set it once at the end and compute missing fields reliably.
      const newForm = { ...form }

      // 1) Fetch weather from Open-Meteo (no API key)
      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=relativehumidity_2m,precipitation&current_weather=true&timezone=UTC`
        const wRes = await fetch(weatherUrl)
        if (wRes.ok) {
          const wJson = await wRes.json()
          if (wJson.current_weather && typeof wJson.current_weather.temperature !== 'undefined') {
            newForm.temperature = Number(wJson.current_weather.temperature).toFixed(2)
          }
          if (wJson.hourly && Array.isArray(wJson.hourly.time)) {
            const times = wJson.hourly.time
            const nowIso = new Date().toISOString().slice(0,13)
            let idx = times.findIndex(t => t.startsWith(nowIso))
            if (idx === -1) idx = times.length - 1
            const humidity = wJson.hourly.relativehumidity_2m?.[idx]
            const precipitation = wJson.hourly.precipitation?.[idx]
            if (typeof humidity !== 'undefined') newForm.humidity = Number(humidity).toFixed(2)
            if (typeof precipitation !== 'undefined') newForm.rainfall = Number(precipitation).toFixed(2)
          }
        }
      } catch (e) {
        console.warn('Weather fetch failed', e)
      }

      // 2) Attempt SoilGrids
      try {
        const soilUrl = `https://rest.soilgrids.org/soilgrids/v2.0/properties/query?lat=${latitude}&lon=${longitude}`
        const sRes = await fetch(soilUrl)
        if (sRes.ok) {
          const sJson = await sRes.json()
          const props = sJson?.properties || {}
          const phVal = props?.phh2o?.m?.[0]?.v ?? props?.phh2o?.mean ?? null
          if (phVal !== null && typeof phVal !== 'undefined') newForm.ph = Number(phVal).toFixed(2)
          const nitrogen = props?.nitrogen?.m?.[0]?.v ?? props?.nitrogen?.mean ?? null
          const phosphorus = props?.phosphorus?.m?.[0]?.v ?? props?.phosphorus?.mean ?? null
          const potassium = props?.potassium?.m?.[0]?.v ?? props?.potassium?.mean ?? null
          if (nitrogen !== null && typeof nitrogen !== 'undefined') newForm.nitrogen = Number(nitrogen).toFixed(2)
          if (phosphorus !== null && typeof phosphorus !== 'undefined') newForm.phosphorus = Number(phosphorus).toFixed(2)
          if (potassium !== null && typeof potassium !== 'undefined') newForm.potassium = Number(potassium).toFixed(2)
        }
      } catch (e) {
        console.warn('Soil fetch failed', e)
      }

      // commit the collected values to state and compute missing fields
      setForm(newForm)
      const required = ['nitrogen','phosphorus','potassium','ph','rainfall','temperature','humidity']
      const missing = required.filter(key => newForm[key] === '' || newForm[key] === null || typeof newForm[key] === 'undefined')
      setMissingFields(missing)
      if (missing.length > 0) {
        setLocationError("We couldn't fetch some of the required data. Please enter the missing values manually.")
      }
    } finally {
      setFetchingEnv(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" mb={3}>Crop Recommendation</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Box>
              <Stack spacing={2}>
                <Typography variant="subtitle1">Location (to auto-fill environmental data)</Typography>
                <Stack direction="row" spacing={1}>
                  <TextField label="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} size="small" />
                  <TextField label="Longitude" value={lon} onChange={(e) => setLon(e.target.value)} size="small" />
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" onClick={useMyLocation}>Use my location</Button>
                  <Button variant="contained" onClick={() => fetchEnvironmentalData()} disabled={fetchingEnv}>{fetchingEnv ? 'Fetching...' : 'Fetch data'}</Button>
                </Stack>
                {locationError && <AlertBanner severity="warning">{locationError}</AlertBanner>}
              </Stack>
            </Box>

            <Box component="form" onSubmit={onSubmit} sx={{ mt: 2 }}>
              <Stack spacing={2}>
                <TextField label="Nitrogen" name="nitrogen" type="number" value={form.nitrogen} onChange={handleChange} required />
                <TextField label="Phosphorus" name="phosphorus" type="number" value={form.phosphorus} onChange={handleChange} required />
                <TextField label="Potassium" name="potassium" type="number" value={form.potassium} onChange={handleChange} required />
                <TextField label="pH" name="ph" type="number" value={form.ph} onChange={handleChange} required />
                <TextField label="Rainfall (mm)" name="rainfall" type="number" value={form.rainfall} onChange={handleChange} required />
                <TextField label="Temperature (°C)" name="temperature" type="number" value={form.temperature} onChange={handleChange} required />
                <TextField label="Humidity (%)" name="humidity" type="number" value={form.humidity} onChange={handleChange} required />
                {locationError && missingFields.length > 0 && (
                  <AlertBanner severity="info">We couldn't fetch some values. Please enter missing values manually (highlighted fields).</AlertBanner>
                )}
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
