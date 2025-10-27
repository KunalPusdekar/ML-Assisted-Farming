import React, { useState } from 'react'
import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import AlertBanner from '../components/AlertBanner'
import api from '../services/api'

export default function DiseaseDetection() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onFile = (e) => {
    const f = e.target.files?.[0]
    setFile(f || null)
    if (f) setPreview(URL.createObjectURL(f))
    else setPreview('')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/predict_disease', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to detect disease')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" mb={3}>Disease Detection</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <form onSubmit={onSubmit}>
            <Stack spacing={2}>
              <input type="file" accept="image/*" onChange={onFile} />
              {error && <AlertBanner severity="error">{error}</AlertBanner>}
              <Button type="submit" variant="contained" disabled={!file || loading}>{loading ? 'Analyzing...' : 'Analyze'}</Button>
            </Stack>
          </form>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle1" gutterBottom>Preview</Typography>
          {preview ? (
            <img src={preview} alt="preview" style={{ maxWidth: '100%', borderRadius: 8 }} />
          ) : (
            <Typography variant="body2">Upload a leaf image to preview.</Typography>
          )}
          {result && (
            <Box mt={2}>
              <Typography variant="subtitle1">Result</Typography>
              <Typography>Label: <b>{result.label}</b></Typography>
              <Typography>Confidence: <b>{Math.round((result.confidence || 0) * 100)}%</b></Typography>
              {result.treatment && <Typography>Suggestion: {result.treatment}</Typography>}
            </Box>
          )}
        </Paper>
      </Stack>
    </Box>
  )
}
