import React, { useEffect, useRef, useState } from 'react'
import { Box, Button, Grid, Paper, Stack, TextField, Typography, Alert } from '@mui/material'
import { useAuth } from '../store/AuthContext'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

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
      const map = L.map('land-map').setView([40.7128, -74.006], 10)
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

      // Prepare a polygon drawer we can control with buttons
      polygonDrawerRef.current = new L.Draw.Polygon(map, {
        allowIntersection: false,
        showArea: true,
        shapeOptions: { color: '#2f855a', fillOpacity: 0.3 },
        guidelineDistance: 10,
        metric: true,
        repeatMode: false,
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
    polygonDrawerRef.current.enable()
  }

  function finishDrawing() {
    if (!polygonDrawerRef.current) return
    // complete the current polygon shape (if valid)
    if (typeof polygonDrawerRef.current.completeShape === 'function') {
      polygonDrawerRef.current.completeShape()
    } else {
      // Fallback: Some versions may not expose completeShape; user can double-click to finish
      setError('Double-click on the last point to finish the polygon if it does not close automatically.')
    }
    polygonDrawerRef.current.disable()
  }

  function cancelDrawing() {
    if (!polygonDrawerRef.current) return
    polygonDrawerRef.current.disable()
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
      const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'
      if (!token) {
        throw new Error('You must be logged in to save a plot.')
      }
      const controller = new AbortController()
      const to = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(`${apiBase}/plots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(to)
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try {
          const err = await res.json()
          msg = err.detail || err.error || msg
        } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      // basic success
      setPlotName('')
      setNitrogen(''); setPhosphorus(''); setPotassium(''); setPh(''); setOrganicMatter('')
      alert(`Plot saved! Area: ${data.area_hectares} ha`)
    } catch (e) {
      if (e.name === 'AbortError') {
        setError('Request timed out. Please try again.')
      } else {
        setError(e.message || 'Save failed')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Land Selection</Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper sx={{ p: 2 }}>
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
              <Button variant="contained" onClick={handleSave} disabled={saving}>Save Plot</Button>
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

      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        <Box id="land-map" sx={{ height: 480, width: '100%' }} />
      </Paper>

      {(ndviPreview || moisturePreview) && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Satellite Data Preview (mock)</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">NDVI (last 10 pts)</Typography>
              <pre style={{ margin: 0 }}>{JSON.stringify(ndviPreview, null, 2)}</pre>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Soil Moisture (last 10 pts)</Typography>
              <pre style={{ margin: 0 }}>{JSON.stringify(moisturePreview, null, 2)}</pre>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Stack>
  )
}
