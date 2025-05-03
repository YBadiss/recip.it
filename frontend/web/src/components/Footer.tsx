import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer mt-auto">
      <Container>
        <Row>
          <Col className="text-center py-1">
            <p className="mb-0 text-light">
              © {year} Recip.it |{' '}
              <Link to="/privacy-policy" className="text-light">
                Privacy Policy
              </Link>
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
