import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Container,
  Form,
  Image,
  InputGroup,
  Nav,
  NavDropdown,
  Navbar,
} from 'react-bootstrap'
import { logout } from '#/functions/auth.functions'
import { useCurrentUser, useSetCurrentUser } from '#/lib/auth'

function SearchBar() {
  const navigate = useNavigate()
  const routeQuery = useRouterState({
    select: (s) =>
      s.location.pathname === '/'
        ? String((s.location.search as { q?: string }).q ?? '')
        : '',
  })
  const [query, setQuery] = useState(routeQuery)

  useEffect(() => setQuery(routeQuery), [routeQuery])

  const search = (q: string) => {
    setQuery(q)
    void navigate({ to: '/', search: q.trim() ? { q } : {}, replace: true })
  }

  return (
    <Form
      className="search-bar-form"
      onSubmit={(e) => {
        e.preventDefault()
        search(query)
      }}
    >
      <InputGroup>
        <InputGroup.Text className="search-icon">
          <i className="bi bi-search"></i>
        </InputGroup.Text>
        <Form.Control
          type="search"
          placeholder="Search recipes..."
          value={query}
          onChange={(e) => search(e.target.value)}
          aria-label="Search recipes"
          className="search-input"
        />
      </InputGroup>
    </Form>
  )
}

export function Header() {
  const user = useCurrentUser()
  const setCurrentUser = useSetCurrentUser()
  const navigate = useNavigate()
  const [isHidden, setIsHidden] = useState(false)

  // Hide the header when scrolling down, show it again when scrolling up.
  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y > lastY && y > 150) setIsHidden(true)
      else if (y < lastY - 10) setIsHidden(false)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = async () => {
    await logout()
    await setCurrentUser(null)
    await navigate({ to: '/' })
  }

  return (
    <header className={`header-container ${isHidden ? 'header-hidden' : ''}`}>
      <Navbar expand="lg" variant="dark" className="py-0">
        <Container>
          <Navbar.Brand as={Link} to="/">
            <Image
              src="/images/header.png"
              alt="Recip.it logo"
              className="header-logo me-2"
              width="40"
              height="40"
            />
            <span className="brand-text">Recip.it</span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-navbar" />
          <Navbar.Collapse id="main-navbar">
            <Nav className="me-auto d-none d-lg-flex">
              <span className="nav-tagline text-light d-flex align-items-center">
                Your personal recipe collection app
              </span>
            </Nav>

            <div className="header-search-container me-3 d-flex">
              <SearchBar />
            </div>

            <Link
              to="/add"
              className="btn btn-primary btn-sm px-3 me-3 new-recipe-btn"
            >
              <span className="me-1">+</span> Add Recipe
            </Link>

            {user ? (
              <NavDropdown
                title={<i className="bi bi-person-circle fs-5"></i>}
                id="user-dropdown"
                align="end"
              >
                <NavDropdown.Item disabled className="text-muted">
                  {user.username}
                </NavDropdown.Item>
                {user.isAdmin && (
                  <NavDropdown.Item as={Link} to="/admin">
                    <i className="bi bi-gear me-2"></i>
                    Admin
                  </NavDropdown.Item>
                )}
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-2"></i>
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <Nav>
                <Nav.Link as={Link} to="/login" className="me-2">
                  Login
                </Nav.Link>
              </Nav>
            )}
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  )
}
