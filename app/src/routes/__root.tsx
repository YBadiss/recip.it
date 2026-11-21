import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { Container } from 'react-bootstrap'
import { ToastContainer } from 'react-toastify'
import { Footer } from '#/components/Footer'
import { Header } from '#/components/Header'
import { currentUserQuery } from '#/lib/queries'
import appCss from '#/styles/app.css?url'
import type { QueryClient } from '@tanstack/react-query'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    beforeLoad: async ({ context }) => ({
      user: await context.queryClient.ensureQueryData(currentUserQuery),
    }),
    head: () => ({
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: 'Recip.it - Your Recipe Collection' },
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        { rel: 'icon', type: 'image/png', href: '/images/favicon.png' },
      ],
    }),
    shellComponent: RootDocument,
    component: RootLayout,
  },
)

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <Container className="flex-grow-1 pt-6 pb-4 main-content">
        <Outlet />
      </Container>
      <Footer />
      <ToastContainer position="bottom-right" autoClose={1500} />
    </div>
  )
}
