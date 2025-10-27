import React, { useState } from 'react'
import { Link as RouterLink, useLocation, Navigate } from 'react-router-dom'
import { Box, Button, Link, Stack, TextField, Typography, Paper } from '@mui/material'
import { useAuth } from '../store/AuthContext'

export default function Login() {
  const { login, token } = useAuth()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to={from} replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack alignItems="center" mt={6}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" mb={2}>Login</Typography>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
            <TextField label="Password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
            {error && <Typography color="error">{error}</Typography>}
            <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</Button>
            <Typography variant="body2">Don't have an account? <Link component={RouterLink} to="/signup">Sign up</Link></Typography>
          </Stack>
        </Box>
      </Paper>
    </Stack>
  )
}
