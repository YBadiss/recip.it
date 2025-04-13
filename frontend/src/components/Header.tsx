import React, { useState, useEffect } from 'react';
import { Navbar, Container, Nav, Button, Image, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // If scrolled down and not already hidden, hide header
      if (currentScrollY > lastScrollY && currentScrollY > 150 && !isHidden) {
        setIsHidden(true);
      }
      // If scrolled up even slightly and is hidden, show header
      else if (currentScrollY < lastScrollY - 10 && isHidden) {
        setIsHidden(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isHidden, lastScrollY]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

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
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <span className="nav-tagline text-light d-flex align-items-center">
                Your personal recipe collection app
              </span>
            </Nav>

            {isAuthenticated ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  className="px-3 me-3 new-recipe-btn"
                  onClick={() => navigate('/import')}
                >
                  <span className="me-1">+</span> Import Recipe
                </Button>

                <NavDropdown
                  title={<i className="bi bi-person-circle fs-5"></i>}
                  id="user-dropdown"
                  align="end"
                >
                  {user ? (
                    <NavDropdown.Item disabled className="text-muted">
                      {user.username}
                    </NavDropdown.Item>
                  ) : (
                    <NavDropdown.Item disabled className="text-muted">
                      Authenticated User
                    </NavDropdown.Item>
                  )}
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Logout
                  </NavDropdown.Item>
                </NavDropdown>
              </>
            ) : (
              <Nav>
                <Nav.Link as={Link} to="/login" className="me-2">
                  Login
                </Nav.Link>
                <Nav.Link as={Link} to="/register">
                  Register
                </Nav.Link>
              </Nav>
            )}
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
};

export default Header;
