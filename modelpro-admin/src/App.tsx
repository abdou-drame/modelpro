import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Users from '@/pages/Users'
import Artisans from '@/pages/Artisans'
import Orders from '@/pages/Orders'
import Catalogue from '@/pages/Catalogue'
import Appointments from '@/pages/Appointments'
import Payments from '@/pages/Payments'
import Claims from '@/pages/Claims'
import Metiers from '@/pages/Metiers'
import Reviews from '@/pages/Reviews'
import ArtisanProfile from '@/pages/ArtisanProfile'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="artisans" element={<Artisans />} />
          <Route path="artisans/:id" element={<ArtisanProfile />} />
          <Route path="orders" element={<Orders />} />
          <Route path="catalogue" element={<Catalogue />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="payments" element={<Payments />} />
          <Route path="claims" element={<Claims />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="metiers" element={<Metiers />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
