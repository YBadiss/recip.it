import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { Nav } from 'react-bootstrap'

// UX guard only: every admin server function checks the role itself (requireAdmin).
export const Route = createFileRoute('/admin')({
  beforeLoad: ({ context, location }) => {
    if (!context.user)
      throw redirect({ to: '/login', search: { redirect: location.href } })
    if (!context.user.isAdmin) throw redirect({ to: '/' })
  },
  head: () => ({ meta: [{ title: 'Admin - Recip.it' }] }),
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="py-3">
      <h1 className="mb-3">Admin</h1>
      <Nav variant="tabs" className="mb-4">
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/admin"
            activeOptions={{ exact: true }}
            activeProps={{ className: 'active' }}
          >
            <i className="bi bi-people me-2"></i>Users
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/admin/recipes"
            activeProps={{ className: 'active' }}
          >
            <i className="bi bi-journal-text me-2"></i>Recipes
          </Nav.Link>
        </Nav.Item>
      </Nav>
      <Outlet />
    </div>
  )
}
