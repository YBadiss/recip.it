import React, { useState, useEffect, useRef } from 'react';
import { Navbar, Container, Nav, Button, Image, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';

// Extend Window interface to include our custom property
declare global {
  interface Window {
    searchDebounceTimer: number | null;
  }
}

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const searchQueryRef = useRef('');

  // Initialize the global timer
  if (typeof window.searchDebounceTimer === 'undefined') {
    window.searchDebounceTimer = null;
  }

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
      // Logout function in AuthContext now handles the navigation to home page
      await logout();
    } catch (error) {
      // Logout failed, but we don't need to log it here as it's handled in AuthContext
    }
  };

  const handleAddClick = () => {
    // Always navigate directly to the add recipe page without checking authentication
    navigate('/add');
  };

  const handleSubmit = (query: string) => {
    handleSearch(query, true);
  };

  // Handle real-time search updates from SearchBar input change
  const handleSearch = (query: string, isSubmit: boolean = false) => {
    setSearchQuery(query);
    searchQueryRef.current = query;

    // If user starts typing and is not on home page, navigate to home
    if (window.location.pathname !== '/' && query.trim().length > 0) {
      navigate('/');
    }

    // Dispatch a debounced custom event
    if (window.searchDebounceTimer) {
      clearTimeout(window.searchDebounceTimer);
    }

    if (isSubmit) {
      window.searchDebounceTimer = window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('recipe-search', {
            detail: { query },
          })
        );
      }, 50); // 50ms debounce
    } else {
      window.dispatchEvent(
        new CustomEvent('recipe-search', {
          detail: { query },
        })
      );
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
            <Nav className="me-auto d-none d-lg-flex">
              <span className="nav-tagline text-light d-flex align-items-center">
                Your personal recipe collection app
              </span>
            </Nav>

            <div className="header-search-container me-3 d-flex">
              <SearchBar
                onSearch={handleSearch}
                onSubmit={handleSubmit}
                initialValue={searchQuery}
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              className="px-3 me-3 new-recipe-btn"
              onClick={handleAddClick}
            >
              <span className="me-1">+</span> Add Recipe
            </Button>

            {isAuthenticated ? (
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
  );
};

export default Header;
