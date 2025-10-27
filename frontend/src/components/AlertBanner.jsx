import React from 'react'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'

export default function AlertBanner({ severity = 'info', title, children, sx }) {
  return (
    <Alert severity={severity} sx={sx}>
      {title && <AlertTitle>{title}</AlertTitle>}
      {children}
    </Alert>
  )
}
