import React, { useState } from 'react'
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import api from '../services/api'
import AlertBanner from '../components/AlertBanner'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function CostEstimation() {
  const [form, setForm] = useState({
    state: 'Gujarat',
    district: 'Amreli',
    market: 'Damnagar',
    commodity: 'Cabbage',
    variety: 'Cabbage',
    grade: 'FAQ',
    min_price: 3350,
    max_price: 4000,
    day: 27,
    month: 7,
    year: 2028,
  })

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/estimate_cost', {
        ...form,
        min_price: Number(form.min_price),
        max_price: Number(form.max_price),
        day: Number(form.day),
        month: Number(form.month),
        year: Number(form.year),
      })
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to estimate cost')
    } finally {
      setLoading(false)
    }
  }

  // Generate mock trend data for visualization
  const chartData = result
    ? Array.from({ length: 7 }, (_, i) => ({
        day: `Day ${i + 1}`,
        modalPrice: Math.round(
          result.Predicted_modal_Price_in_rupees_per_quintal * (0.9 + Math.random() * 0.2)
        ),
      }))
    : []

  return (
    <Box>
      <Typography variant="h5" mb={3}>Cost Estimation (Modal Price Prediction)</Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* LEFT PANEL - Form */}
        <Paper sx={{ p: 2, flex: 1 }}>
          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2}>
              {Object.entries(form).map(([key, value]) => (
                <TextField
                  key={key}
                  name={key}
                  label={key.replaceAll('_', ' ')}
                  value={value}
                  onChange={handleChange}
                  required
                />
              ))}
              {error && <AlertBanner severity="error">{error}</AlertBanner>}
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? 'Predicting...' : 'Predict Modal Price'}
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* RIGHT PANEL - Result + Graph */}
        <Paper sx={{ p: 2, flex: 1 }}>
          {result ? (
            <>
              <Typography variant="h6" gutterBottom>Prediction Result</Typography>
              <Stack spacing={1} mb={2}>
                <Typography>Crop: <b>{result.Crop}</b></Typography>
                <Typography>State: <b>{result.State}</b></Typography>
                <Typography>District: <b>{result.District}</b></Typography>
                <Typography>
                  Predicted Modal Price in Rupees per Quintal: <b>{result.Predicted_modal_Price_in_rupees_per_quintal}</b>
                </Typography>
              </Stack>

              
            </>
          ) : (
            <Typography variant="body2">Submit the form to get modal price prediction.</Typography>
          )}
        </Paper>
      </Stack>
    </Box>
  )
}
