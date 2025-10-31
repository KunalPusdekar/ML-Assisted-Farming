import React, { useEffect, useRef, useState } from 'react'
import { Box, Button, Grid, Paper, Stack, TextField, Typography, Alert, Slide, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar } from '@mui/material'
import { useAuth } from '../store/AuthContext'
import api from '../services/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'

// NOTE: Requires installing deps in frontend:
// npm i leaflet leaflet-draw chart.js
// And include Leaflet CSS in index.html head:
// <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

export default function LandSelection() {
  const { token } = useAuth()
  const mapRef = useRef(null)
  const leafletRef = useRef(null)
  const drawnItemsRef = useRef(null)
  const polygonRef = useRef(null)
  const polygonDrawerRef = useRef(null)

  const [plotName, setPlotName] = useState('')
  const [areaHectares, setAreaHectares] = useState(0)
  const [pointsCount, setPointsCount] = useState(0)
  const [ndviPreview, setNdviPreview] = useState(null)
  const [moisturePreview, setMoisturePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successOpen, setSuccessOpen] = useState(false)
  const [snackOpen, setSnackOpen] = useState(false)
  const [savedPlot, setSavedPlot] = useState(null)
  const [satelliteSeries, setSatelliteSeries] = useState([])

  // Nutrients (optional)
  const [nitrogen, setNitrogen] = useState('')
  const [phosphorus, setPhosphorus] = useState('')
  const [potassium, setPotassium] = useState('')
  const [ph, setPh] = useState('')
  const [organicMatter, setOrganicMatter] = useState('')

  useEffect(() => {
    (async () => {
      const L = (await import('leaflet')).default
      await import('leaflet-draw')
      // Fix default icon paths for Leaflet in Vite
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      leafletRef.current = L
      // Default center: Nagpur, Maharashtra; try user's live location if available
      const defaultCenter = [21.1458, 79.0882]
      const defaultZoom = 11
      const map = L.map('land-map').setView(defaultCenter, defaultZoom)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      const drawnItems = new L.FeatureGroup()
      map.addLayer(drawnItems)
      drawnItemsRef.current = drawnItems

      // Also add the default Leaflet.Draw toolbar for users who prefer UI controls
      const drawControl = new L.Control.Draw({
        draw: {
          polyline: false,
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false,
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: { color: '#2f855a', fillOpacity: 0.3 },
          },
        },
        edit: { featureGroup: drawnItems, remove: true },
      })
      map.addControl(drawControl)

      // Attempt to center to user's live location
      if (navigator && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords
            map.setView([latitude, longitude], defaultZoom)
          },
          () => {
            // On error, keep default Nagpur view
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        )
      }

      // Prepare a polygon drawer we can control with buttons (match satelliteFeature behavior)
      polygonDrawerRef.current = new L.Draw.Polygon(map, {
        allowIntersection: false,
        showArea: true,
        shapeOptions: { color: '#2f855a', fillOpacity: 0.3 },
        metric: true,
      })

      map.on('draw:created', (e) => {
        drawnItems.clearLayers()
        drawnItems.addLayer(e.layer)
        polygonRef.current = e.layer
        updateInfo(e.layer)
        simulateSatellite()
      })

      map.on('draw:edited', (e) => {
        e.layers.eachLayer((layer) => {
          polygonRef.current = layer
          updateInfo(layer)
          simulateSatellite()
        })
      })

      map.on('draw:deleted', () => {
        polygonRef.current = null
        setAreaHectares(0)
        setPointsCount(0)
        setNdviPreview(null)
        setMoisturePreview(null)
      })

      mapRef.current = map
      drawnItemsRef.current = drawnItems
    })()
  }, [])

  function updateInfo(layer) {
    const coords = layer.getLatLngs()[0] || []
    setPointsCount(coords.length)
    setAreaHectares(calcArea(coords))
  }

  function calcArea(coords) {
    // Shoelace with rough conversion to hectares
    if (!coords || coords.length < 3) return 0
    let area = 0
    const n = coords.length
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      area += coords[i].lng * coords[j].lat
      area -= coords[j].lng * coords[i].lat
    }
    area = Math.abs(area) / 2
    return +(area * 111.32 * 111.32).toFixed(2)
  }

  function simulateSatellite() {
    // quick preview placeholders
    const now = new Date()
    const dates = Array.from({ length: 10 }).map((_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (10 - i) * 6)
      return d.toISOString().slice(0, 10)
    })
    const ndvi = dates.map((_, i) => +(0.3 + 0.05 * i).toFixed(3))
    const moisture = dates.map((_, i) => +(40 + 2 * i).toFixed(1))
    setNdviPreview({ dates, values: ndvi })
    setMoisturePreview({ dates, values: moisture })
  }

  function startDrawing() {
    setError('')
    if (!leafletRef.current || !polygonDrawerRef.current) return
    // Disable double-click zoom during drawing to prevent accidental finishes
    if (mapRef.current) {
      mapRef.current.doubleClickZoom.disable()
    }
    polygonDrawerRef.current.enable()
  }

  // Finish is handled by double-click like in satelliteFeature; provide a cancel option only
  function finishDrawing() {
    if (!polygonDrawerRef.current) return
    setError('Double-click the last point to finish the polygon. Use Clear to reset.')
  }

  function cancelDrawing() {
    if (!polygonDrawerRef.current) return
    polygonDrawerRef.current.disable()
    if (mapRef.current) {
      mapRef.current.doubleClickZoom.enable()
    }
  }

  async function handleSave() {
    try {
      setError('')
      if (!polygonRef.current) {
        setError('Please draw a polygon first')
        return
      }
      if (!plotName.trim()) {
        setError('Please enter a plot name')
        return
      }
      const coords = polygonRef.current.getLatLngs()[0].map((p) => ({ lat: p.lat, lng: p.lng }))
      const payload = {
        name: plotName.trim(),
        coordinates: coords,
        nitrogen: nitrogen ? parseFloat(nitrogen) : undefined,
        phosphorus: phosphorus ? parseFloat(phosphorus) : undefined,
        potassium: potassium ? parseFloat(potassium) : undefined,
        ph: ph ? parseFloat(ph) : undefined,
        organic_matter: organicMatter ? parseFloat(organicMatter) : undefined,
      }

      setSaving(true)
      if (!token) {
        throw new Error('You must be logged in to save a plot.')
      }
      const res = await api.post('/plots', payload)
      const data = res.data
      setSavedPlot(data)
      // fetch satellite series for charts
      try {
        const seriesRes = await api.get(`/plots/${data.id}/satellite-data`)
        const series = (seriesRes.data || []).map(d => ({
          date: d.date,
          ndvi: d.ndvi ?? null,
          soil_moisture: d.soil_moisture ?? null,
        }))
        setSatelliteSeries(series)
      } catch {}
      setSnackOpen(true)
      setSuccessOpen(true)
      setPlotName('')
      setNitrogen(''); setPhosphorus(''); setPotassium(''); setPh(''); setOrganicMatter('')
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Slide in direction="down" timeout={400}>
        <Typography variant="h5">Land Selection</Typography>
      </Slide>
      {error && <Alert severity="error">{error}</Alert>}

      <Slide in timeout={500}>
        <Paper sx={{ p: 2, borderRadius: 3, boxShadow: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Plot Name" value={plotName} onChange={(e) => setPlotName(e.target.value)} fullWidth />
              <TextField label="Nitrogen (N)" value={nitrogen} onChange={(e) => setNitrogen(e.target.value)} type="number" />
              <TextField label="Phosphorus (P)" value={phosphorus} onChange={(e) => setPhosphorus(e.target.value)} type="number" />
              <TextField label="Potassium (K)" value={potassium} onChange={(e) => setPotassium(e.target.value)} type="number" />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
              <TextField label="pH" value={ph} onChange={(e) => setPh(e.target.value)} type="number" />
              <TextField label="Organic Matter (%)" value={organicMatter} onChange={(e) => setOrganicMatter(e.target.value)} type="number" />
              <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Plot'}</Button>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
              <Button size="small" variant="outlined" onClick={startDrawing}>Start Drawing</Button>
              <Button size="small" variant="outlined" onClick={finishDrawing}>Finish</Button>
              <Button size="small" variant="outlined" color="secondary" onClick={() => { if (drawnItemsRef.current) drawnItemsRef.current.clearLayers(); polygonRef.current = null; setAreaHectares(0); setPointsCount(0); setNdviPreview(null); setMoisturePreview(null); }}>Clear</Button>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2">Area</Typography>
                <Typography variant="h6">{areaHectares.toFixed(2)} ha</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Points</Typography>
                <Typography variant="h6">{pointsCount}</Typography>
              </Box>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Tip: Click Start Drawing and place any number of points. Click Finish (or double-click the last point) to close the polygon.
            </Typography>
          </Grid>
        </Grid>
        </Paper>
      </Slide>

      <Slide in timeout={600}>
        <Paper sx={{ p: 0, overflow: 'hidden', borderRadius: 3, boxShadow: 4 }}>
          <Box id="land-map" sx={{ height: 480, width: '100%' }} />
        </Paper>
      </Slide>

      {(ndviPreview || moisturePreview) && (
        <Slide in timeout={700}>
          <Paper sx={{ p: 2, borderRadius: 3, boxShadow: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Satellite Data Preview (mock)</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={ndviPreview?.dates.map((d, i) => ({ date: d, ndvi: ndviPreview.values[i] })) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} hide />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="ndvi" stroke="#2b6cb0" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={moisturePreview?.dates.map((d, i) => ({ date: d, moisture: moisturePreview.values[i] })) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} hide />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="moisture" stroke="#2f855a" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </Paper>
        </Slide>
      )}

      <Dialog open={successOpen} onClose={() => setSuccessOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Plot saved successfully</DialogTitle>
        <DialogContent dividers>
          {savedPlot && (
            <Stack spacing={2}>
              <Typography variant="subtitle1">{savedPlot.name}</Typography>
              <Typography variant="body2">Area: {savedPlot.area_hectares} ha</Typography>
              <Typography variant="subtitle2">Satellite Data (generated)</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={satelliteSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} hide />
                  <YAxis yAxisId="left" domain={[0, 1]} tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="ndvi" stroke="#2b6cb0" strokeWidth={2} dot={false} name="NDVI" />
                  <Line yAxisId="right" type="monotone" dataKey="soil_moisture" stroke="#e53e3e" strokeWidth={2} dot={false} name="Soil Moisture (%)" />
                </LineChart>
              </ResponsiveContainer>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccessOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackOpen} autoHideDuration={3000} onClose={() => setSnackOpen(false)} message="Plot saved" />
    </Stack>
  )
}
