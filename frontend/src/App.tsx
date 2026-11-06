import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Layout from './components/Layout'

import Home from './pages/Home'
import Shop, { CategoryPage, MensPage, PremiumPage } from './pages/Shop'
import Collections, { CollectionLanding } from './pages/Collections'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import CustomizeExisting from './pages/CustomizeExisting'
import NewCustomDesign from './pages/NewCustomDesign'
import EnquiryConfirmation from './pages/EnquiryConfirmation'
import Verify from './pages/Verify'
import TrackOrder from './pages/TrackOrder'
import Account, { AccountOrder } from './pages/Account'
import { About, Care, Contact, Faq, Policy } from './pages/Info'

import RequireAdmin from './components/admin/RequireAdmin'
import AdminLogin from './pages/admin/AdminLogin'

// The owner's dashboard is loaded on demand so shoppers never download it.
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminEnquiries = lazy(() => import('./pages/admin/AdminEnquiries'))
const AdminCatalogue = lazy(() => import('./pages/admin/AdminCatalogue'))
const AdminRegistry = lazy(() => import('./pages/admin/AdminRegistry'))
const AdminPromotions = lazy(() => import('./pages/admin/AdminPromotions'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

const admin = (el: React.ReactNode) => (
  <RequireAdmin>
    <Suspense fallback={<div className="p-10 text-stone">Loading…</div>}>{el}</Suspense>
  </RequireAdmin>
)

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/overview" element={admin(<AdminOverview />)} />
        <Route path="/admin/orders" element={admin(<AdminOrders />)} />
        <Route path="/admin/orders/:ref" element={admin(<AdminOrders />)} />
        <Route path="/admin/enquiries" element={admin(<AdminEnquiries />)} />
        <Route path="/admin/enquiries/:ref" element={admin(<AdminEnquiries />)} />
        <Route path="/admin/catalogue" element={admin(<AdminCatalogue />)} />
        <Route path="/admin/catalogue/:id" element={admin(<AdminCatalogue />)} />
        <Route path="/admin/registry" element={admin(<AdminRegistry />)} />
        <Route path="/admin/promotions" element={admin(<AdminPromotions />)} />
        <Route path="/admin/settings" element={admin(<AdminSettings />)} />

        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/necklaces" element={<CategoryPage key="n" category="Necklaces" />} />
                <Route path="/earrings" element={<CategoryPage key="e" category="Earrings" />} />
                <Route path="/bracelets" element={<CategoryPage key="b" category="Bracelets" />} />
                <Route path="/rings" element={<CategoryPage key="r" category="Rings" />} />
                <Route path="/chains" element={<CategoryPage key="c" category="Chains" />} />
                <Route path="/pendants" element={<CategoryPage key="p" category="Pendants" />} />
                <Route path="/mens" element={<MensPage />} />
                <Route path="/mens/:category" element={<MensPage />} />
                <Route path="/premium" element={<PremiumPage />} />
                <Route path="/collections" element={<Collections />} />
                <Route path="/collections/:slug" element={<CollectionLanding />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route path="/customize/:slug" element={<CustomizeExisting />} />
                <Route path="/custom-jewellery" element={<NewCustomDesign />} />
                <Route path="/custom-jewellery/confirmation" element={<EnquiryConfirmation />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order/:ref" element={<OrderConfirmation />} />
                <Route path="/track-order" element={<TrackOrder />} />
                <Route path="/account" element={<Account />} />
                <Route path="/account/orders/:ref" element={<AccountOrder />} />
                <Route path="/verify" element={<Verify />} />
                <Route path="/verify/:code" element={<Verify />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/care" element={<Care />} />
                <Route path="/policies/:slug" element={<Policy />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </>
  )
}
