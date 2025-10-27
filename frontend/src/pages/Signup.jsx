import React, { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Link, Stack, TextField, Typography, Paper } from '@mui/material'
import { useAuth } from '../store/AuthContext'

export default function Signup() {
  const { signup } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup(email, password, fullName)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack alignItems="center" mt={6}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 480 }}>
        <Typography variant="h5" mb={2}>Create an account</Typography>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
            <TextField label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
            <TextField label="Password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
            {error && <Typography color="error">{error}</Typography>}
            <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Creating...' : 'Sign Up'}</Button>
            <Typography variant="body2">Already have an account? <Link component={RouterLink} to="/login">Login</Link></Typography>
          </Stack>
        </Box>
      </Paper>
    </Stack>
  )
}
