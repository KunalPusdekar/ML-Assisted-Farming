import React, { useEffect, useState } from 'react'
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import AlertBanner from '../components/AlertBanner'
import api from '../services/api'

export default function Profile() {
  const [fullName, setFullName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // No dedicated profile GET; infer from last update via user object stored client-side
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)
    try {
      const { data } = await api.put('/profile', { full_name: fullName })
      setMessage('Profile updated')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" mb={3}>Profile</Typography>
      <Paper sx={{ p: 2, maxWidth: 560 }}>
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            {message && <AlertBanner severity="success">{message}</AlertBanner>}
            {error && <AlertBanner severity="error">{error}</AlertBanner>}
            <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  )
}
