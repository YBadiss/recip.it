import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="header-container">
      <Navbar expand="lg" variant="dark">
        <Container>
          <Navbar.Brand as={Link} to="/">
            <span role="img" aria-label="recipe" className="me-2">
              🍲
            </span>
            <span className="brand-text">Recip.it</span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/" className="px-3">
                Home
              </Nav.Link>
              <Nav.Link as={Link} to="/import" className="px-3">
                Import Recipe
              </Nav.Link>
            </Nav>
            <Button variant="outline-light" className="px-4" onClick={() => navigate('/import')}>
              <span className="me-2">+</span> New Recipe
            </Button>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
};

export default Header;
