import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer mt-auto">
      <Container>
        <Row className="py-3">
          <Col md={4} className="mb-4 mb-md-0">
            <h5 className="text-white mb-3">Recip.it</h5>
            <p className="mb-0 text-light">Your personal recipe collection app.</p>
            <p className="small mb-0 text-light">Organize and enjoy your favorite recipes.</p>
          </Col>
          <Col md={4} className="mb-4 mb-md-0">
            <h5 className="text-white mb-3">Quick Links</h5>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link to="/" className="text-light">
                  Home
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/import" className="text-light">
                  Import Recipe
                </Link>
              </li>
            </ul>
          </Col>
          <Col md={4}>
            <h5 className="text-white mb-3">Contact</h5>
            <p className="text-light mb-1">
              <i className="me-2">📧</i> support@recip.it
            </p>
            <p className="text-light">
              <i className="me-2">📱</i> (123) 456-7890
            </p>
          </Col>
        </Row>
        <Row>
          <Col className="text-center border-top border-light border-opacity-25 pt-3 mt-3">
            <p className="mb-0 text-light">© {year} Recip.it - All Rights Reserved</p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
