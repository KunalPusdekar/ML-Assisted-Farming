import React, { useEffect, useMemo, useState } from 'react'
import { Box, Grid, Paper, Typography } from '@mui/material'
import api from '../services/api'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#2f855a', '#2b6cb0', '#dd6b20', '#805ad5']

export default function Dashboard() {
  const [history, setHistory] = useState([])

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await api.get('/user_history')
        setHistory(data)
      } catch (e) { /* ignore */ }
    }
    run()
  }, [])

  const summary = useMemo(() => {
    const map = history.reduce((acc, h) => {
      acc[h.type] = (acc[h.type] || 0) + 1
      return acc
    }, {})
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [history])

  return (
    <Box>
      <Typography variant="h5" mb={3}>Overview</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>User Activity</Typography>
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
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Recent Activity</Typography>
            {history.slice(0, 6).map(h => (
              <Box key={h.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #eee' }}>
                <Typography variant="body2">{h.type}</Typography>
                <Typography variant="body2" color="text.secondary">{new Date(h.created_at).toLocaleString()}</Typography>
              </Box>
            ))}
            {history.length === 0 && <Typography variant="body2">No activity yet.</Typography>}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
