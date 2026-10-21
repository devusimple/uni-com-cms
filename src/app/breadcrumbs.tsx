import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface Crumb {
  label: string
  href?: string
}

const labels: Record<string, string> = {
  orders: 'Orders',
  products: 'Products',
  categories: 'Categories',
  coupons: 'Coupons',
  customers: 'Customers',
  media: 'Media',
  settings: 'Settings',
  forbidden: 'Access denied',
}

const detailParents: Record<string, string> = {
  orders: 'Order details',
  products: 'Product details',
}

function specialCrumbs(pathname: string): Crumb[] | null {
  if (pathname === '/products/new') {
    return [
      { label: 'Products', href: '/products' },
      { label: 'New product' },
    ]
  }

  if (pathname === '/categories/new') {
    return [
      { label: 'Categories', href: '/categories' },
      { label: 'New category' },
    ]
  }

  if (pathname === '/coupons/new') {
    return [
      { label: 'Coupons', href: '/coupons' },
      { label: 'New coupon' },
    ]
  }

  const productMatch = pathname.match(/^\/products\/([^/]+)(\/.*)?$/)
  if (productMatch) {
    const productHref = `/products/${productMatch[1]}`
    const suffix = productMatch[2] ?? ''
    const productCrumbs: Crumb[] = [
      { label: 'Products', href: '/products' },
      { label: 'Product details', href: productHref },
    ]

    if (suffix === '/edit') {
      return [...productCrumbs, { label: 'Edit product' }]
    }
    if (suffix === '/variations/new') {
      return [...productCrumbs, { label: 'New variation' }]
    }
    if (/^\/variations\/[^/]+\/edit$/.test(suffix)) {
      return [...productCrumbs, { label: 'Edit variation' }]
    }
  }

  const couponMatch = pathname.match(/^\/coupons\/[^/]+\/edit$/)
  if (couponMatch) {
    return [
      { label: 'Coupons', href: '/coupons' },
      { label: 'Edit coupon' },
    ]
  }

  return null
}

export function AppBreadcrumbs() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Overview</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  const special = specialCrumbs(pathname)
  const crumbs: Crumb[] =
    special ??
    segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join('/')}`
      const parent = segments[index - 1]
      const dynamicLabel = parent ? detailParents[parent] : undefined
      const label = dynamicLabel ?? labels[segment] ?? segment.replace(/-/g, ' ')
      return {
        href: index === segments.length - 1 ? undefined : href,
        label,
      }
    })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={`${crumb.label}-${index}`}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {crumb.href ? (
                <BreadcrumbLink asChild className="capitalize">
                  <Link to={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="capitalize">{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
