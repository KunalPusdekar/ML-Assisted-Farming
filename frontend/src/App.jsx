import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Container from '@mui/material/Container'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Signup from './pages/Signup'
import CropRecommendation from './pages/CropRecommendation'
import CostEstimation from './pages/CostEstimation'
import DiseaseDetection from './pages/DiseaseDetection'
import WeatherAlerts from './pages/WeatherAlerts'
import Profile from './pages/Profile'
import ProtectedRoute from './components/ProtectedRoute'
import LandSelection from './pages/LandSelection'

export default function App() {
  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ minHeight: '80vh', mt: 4 }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<ProtectedRoute />}> 
            <Route path="/" element={<Dashboard />} />
            <Route path="/land-selection" element={<LandSelection />} />
            <Route path="/crop-recommendation" element={<CropRecommendation />} />
            <Route path="/cost-estimation" element={<CostEstimation />} />
            <Route path="/disease-detection" element={<DiseaseDetection />} />
            <Route path="/weather-alerts" element={<WeatherAlerts />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
      <Footer />
    </>
  )
}
