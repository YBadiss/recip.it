import React from 'react';
import { Navbar, Container, Nav, Button, Image } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="header-container">
      <Navbar expand="lg" variant="dark">
        <Container>
          <Navbar.Brand as={Link} to="/">
            <Image 
              src="/images/header.png" 
              alt="Recip.it logo" 
              className="header-logo me-2" 
              width="60" 
              height="60"
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
            <Button variant="primary" size="lg" className="px-4 new-recipe-btn" onClick={() => navigate('/import')}>
              <span className="me-2">+</span> Import Recipe
            </Button>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
};

export default Header;
