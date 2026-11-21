import { Link } from '@tanstack/react-router'
import { Col, Container, Row } from 'react-bootstrap'

export function Footer() {
  return (
    <footer className="footer mt-auto">
      <Container>
        <Row>
          <Col className="text-center py-1">
            <p className="mb-0 text-light">
              © {new Date().getFullYear()} Recip.it |{' '}
              <Link to="/privacy-policy" className="text-light">
                Privacy Policy
              </Link>
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  )
}
