import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function Footer() {
  return (
    <Box component="footer" sx={{ py: 3, textAlign: 'center', bgcolor: 'grey.100', mt: 4 }}>
      <Typography variant="body2" color="text.secondary">
        © {new Date().getFullYear()} ML-Assisted Farming
      </Typography>
    </Box>
  )
}
