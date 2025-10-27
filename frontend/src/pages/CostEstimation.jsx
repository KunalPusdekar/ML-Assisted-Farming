import React, { useState } from 'react'
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import api from '../services/api'
import AlertBanner from '../components/AlertBanner'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const CROPS = ['Rice', 'Wheat', 'Maize', 'Cotton']
const COLORS = ['#2f855a', '#e53e3e']

export default function CostEstimation() {
  const [crop, setCrop] = useState('Rice')
  const [area, setArea] = useState('1')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/estimate_cost', { crop, area_hectares: Number(area) })
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to estimate cost')
    } finally {
      setLoading(false)
    }
  }

  const chartData = result ? [
    { name: 'Investment', value: result.investment },
    { name: 'Profit', value: Math.max(result.expected_profit, 0) },
  ] : []

  return (
    <Box>
      <Typography variant="h5" mb={3}>Cost Estimation</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField select label="Crop" value={crop} onChange={(e) => setCrop(e.target.value)}>
                {CROPS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField label="Area (hectares)" type="number" value={area} onChange={(e) => setArea(e.target.value)} required />
              {error && <AlertBanner severity="error">{error}</AlertBanner>}
              <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Calculating...' : 'Calculate'}</Button>
            </Stack>
          </Box>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle1" gutterBottom>Investment vs Profit</Typography>
          <Box sx={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          {result && (
            <Stack spacing={0.5} mt={2}>
              <Typography>Crop: <b>{result.crop}</b></Typography>
              <Typography>Area: <b>{result.area_hectares} ha</b></Typography>
              <Typography>Expected Yield: <b>{result.expected_yield_tons} tons</b></Typography>
              <Typography>Market Price/Ton: <b>${result.market_price_per_ton}</b></Typography>
              <Typography>Expected Revenue: <b>${result.expected_revenue}</b></Typography>
              <Typography>Investment: <b>${result.investment}</b></Typography>
              <Typography>Expected Profit: <b>${result.expected_profit}</b></Typography>
            </Stack>
          )}
          {!result && <Typography variant="body2">Submit the form to see results.</Typography>}
        </Paper>
      </Stack>
    </Box>
  )
}
