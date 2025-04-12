import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer mt-auto">
      <Container>
        <Row>
          <Col className="text-center py-1">
            <p className="mb-0 text-light">© {year} Recip.it</p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
