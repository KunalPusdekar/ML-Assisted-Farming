import React from 'react'
import { Paper, Typography } from '@mui/material'

export default function InfoCard({ title, value, subtext, sx }) {
  return (
    <Paper sx={{ p: 2, ...sx }}>
      <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
      <Typography variant="h5" sx={{ my: 0.5 }}>{value}</Typography>
      {subtext && <Typography variant="body2" color="text.secondary">{subtext}</Typography>}
    </Paper>
  )
}
