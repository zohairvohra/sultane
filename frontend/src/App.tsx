import { useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Layout from './components/Layout'

import Home from './pages/Home'
import Shop from './pages/Shop'
import Collections from './pages/Collections'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import CustomizeExisting from './pages/CustomizeExisting'
import NewCustomDesign from './pages/NewCustomDesign'
import EnquiryConfirmation from './pages/EnquiryConfirmation'
import Verify from './pages/Verify'
import VerifyResult from './pages/VerifyResult'
import About from './pages/About'
import Care from './pages/Care'
import TrackOrder from './pages/TrackOrder'

import AdminLogin from './pages/admin/AdminLogin'
import AdminOrders from './pages/admin/AdminOrders'
import AdminEnquiries from './pages/admin/AdminEnquiries'
import AdminPlaceholder from './pages/admin/AdminPlaceholder'
import RequireAdmin from './components/admin/RequireAdmin'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/admin" element={<Navigate to="/admin/orders" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/orders" element={<RequireAdmin><AdminOrders /></RequireAdmin>} />
        <Route path="/admin/enquiries" element={<RequireAdmin><AdminEnquiries /></RequireAdmin>} />
        <Route
          path="/admin/overview"
          element={<RequireAdmin><AdminPlaceholder title="Overview" crumb="Workspace / Overview" note="A combined snapshot across orders, enquiries and the article registry." /></RequireAdmin>}
        />
        <Route
          path="/admin/catalogue"
          element={<RequireAdmin><AdminPlaceholder title="Catalogue" crumb="Workspace / Catalogue" note="Add, edit, publish and price products without touching code." /></RequireAdmin>}
        />
        <Route
          path="/admin/registry"
          element={<RequireAdmin><AdminPlaceholder title="Article registry" crumb="Workspace / Article registry" note="Generate and manage unique article numbers once payment is verified." /></RequireAdmin>}
        />
        <Route
          path="/admin/settings"
          element={<RequireAdmin><AdminPlaceholder title="Settings" crumb="Workspace / Settings" note="Delivery charges, policies, WhatsApp number and promotional rules." /></RequireAdmin>}
        />

        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/collections" element={<Collections />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-confirmation" element={<OrderConfirmation />} />
                <Route path="/customize/:slug" element={<CustomizeExisting />} />
                <Route path="/custom-jewellery" element={<NewCustomDesign />} />
                <Route path="/custom-jewellery/confirmation" element={<EnquiryConfirmation />} />
                <Route path="/verify" element={<Verify />} />
                <Route path="/verify/result" element={<VerifyResult />} />
                <Route path="/about" element={<About />} />
                <Route path="/care" element={<Care />} />
                <Route path="/track-order" element={<TrackOrder />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </>
  )
}
