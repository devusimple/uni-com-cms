import { lazy, Suspense, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/app/app-shell'
import { RequireAuth, RequireRole } from '@/app/guards'

const CategoriesPage = lazy(() =>
  import('@/pages/categories').then((module) => ({ default: module.CategoriesPage })),
)
const CategoryCreatePage = lazy(() =>
  import('@/pages/category-create-page').then((module) => ({
    default: module.CategoryCreatePage,
  })),
)
const CouponCreatePage = lazy(() =>
  import('@/pages/coupon-create-page').then((module) => ({
    default: module.CouponCreatePage,
  })),
)
const CouponEditPage = lazy(() =>
  import('@/pages/coupon-edit-page').then((module) => ({
    default: module.CouponEditPage,
  })),
)
const CouponsPage = lazy(() =>
  import('@/pages/coupons').then((module) => ({ default: module.CouponsPage })),
)
const CustomersPage = lazy(() =>
  import('@/pages/customers').then((module) => ({ default: module.CustomersPage })),
)
const DashboardPage = lazy(() =>
  import('@/pages/dashboard').then((module) => ({ default: module.DashboardPage })),
)
const ForbiddenPage = lazy(() =>
  import('@/pages/forbidden').then((module) => ({ default: module.ForbiddenPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/login').then((module) => ({ default: module.LoginPage })),
)
const MediaPage = lazy(() =>
  import('@/pages/media').then((module) => ({ default: module.MediaPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/not-found').then((module) => ({ default: module.NotFoundPage })),
)
const OrdersPage = lazy(() =>
  import('@/pages/orders').then((module) => ({ default: module.OrdersPage })),
)
const CreateProductPage = lazy(() =>
  import('@/pages/products/create-product-page').then((module) => ({
    default: module.CreateProductPage,
  })),
)
const EditProductPage = lazy(() =>
  import('@/pages/products/edit-product-page').then((module) => ({
    default: module.EditProductPage,
  })),
)
const ProductDetailPage = lazy(() =>
  import('@/pages/products/product-detail-page').then((module) => ({
    default: module.ProductDetailPage,
  })),
)
const ProductsPage = lazy(() =>
  import('@/pages/products/products-page').then((module) => ({
    default: module.ProductsPage,
  })),
)
const VariationFormPage = lazy(() =>
  import('@/pages/products/variation-form-page').then((module) => ({
    default: module.VariationFormPage,
  })),
)
const SettingsPage = lazy(() =>
  import('@/pages/settings').then((module) => ({ default: module.SettingsPage })),
)

function RouteLoader({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      className={
        fullScreen
          ? 'flex min-h-svh items-center justify-center bg-background'
          : 'flex min-h-[40vh] items-center justify-center'
      }
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading…
      </div>
    </div>
  )
}

function LazyRoute({ children, fullScreen = false }: { children: ReactNode; fullScreen?: boolean }) {
  return <Suspense fallback={<RouteLoader fullScreen={fullScreen} />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <LazyRoute fullScreen>
        <LoginPage />
      </LazyRoute>
    ),
  },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: (
              <LazyRoute>
                <DashboardPage />
              </LazyRoute>
            ),
          },
          {
            path: 'orders',
            element: (
              <LazyRoute>
                <OrdersPage />
              </LazyRoute>
            ),
          },
          {
            path: 'products',
            element: (
              <LazyRoute>
                <ProductsPage />
              </LazyRoute>
            ),
          },
          {
            element: <RequireRole roles={['admin']} />,
            children: [
              {
                path: 'products/new',
                element: (
                  <LazyRoute>
                    <CreateProductPage />
                  </LazyRoute>
                ),
              },
            ],
          },
          {
            path: 'products/:id',
            element: (
              <LazyRoute>
                <ProductDetailPage />
              </LazyRoute>
            ),
          },
          {
            path: 'products/:id/edit',
            element: (
              <LazyRoute>
                <EditProductPage />
              </LazyRoute>
            ),
          },
          {
            path: 'products/:id/variations/new',
            element: (
              <LazyRoute>
                <VariationFormPage />
              </LazyRoute>
            ),
          },
          {
            path: 'products/:id/variations/:variationId/edit',
            element: (
              <LazyRoute>
                <VariationFormPage />
              </LazyRoute>
            ),
          },
          {
            path: 'media',
            element: (
              <LazyRoute>
                <MediaPage />
              </LazyRoute>
            ),
          },
          {
            path: 'settings',
            element: (
              <LazyRoute>
                <SettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: 'forbidden',
            element: (
              <LazyRoute>
                <ForbiddenPage />
              </LazyRoute>
            ),
          },
          {
            element: <RequireRole roles={['admin']} />,
            children: [
              {
                path: 'categories',
                element: (
                  <LazyRoute>
                    <CategoriesPage />
                  </LazyRoute>
                ),
              },
              {
                path: 'categories/new',
                element: (
                  <LazyRoute>
                    <CategoryCreatePage />
                  </LazyRoute>
                ),
              },
              {
                path: 'coupons',
                element: (
                  <LazyRoute>
                    <CouponsPage />
                  </LazyRoute>
                ),
              },
              {
                path: 'coupons/new',
                element: (
                  <LazyRoute>
                    <CouponCreatePage />
                  </LazyRoute>
                ),
              },
              {
                path: 'coupons/:id/edit',
                element: (
                  <LazyRoute>
                    <CouponEditPage />
                  </LazyRoute>
                ),
              },
            ],
          },
          {
            element: <RequireRole roles={['admin']} />,
            children: [
              {
                path: 'customers',
                element: (
                  <LazyRoute>
                    <CustomersPage />
                  </LazyRoute>
                ),
              },
            ],
          },
          {
            path: '*',
            element: (
              <LazyRoute>
                <NotFoundPage />
              </LazyRoute>
            ),
          },
        ],
      },
    ],
  },
])
