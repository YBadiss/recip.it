import { Link, useRouter } from '@tanstack/react-router'
import { Button, Card, Container, Image } from 'react-bootstrap'

export function NotFound() {
  const router = useRouter()
  return (
    <Container className="py-5 text-center">
      <Card className="border-0 shadow-sm p-4">
        <Card.Body>
          <Image
            src="/images/404.png"
            alt="Page not found"
            className="img-fluid mb-4"
            style={{ maxHeight: '300px' }}
          />
          <h2 className="mb-3 text-primary">
            Oops! It seems you&apos;ve wandered off the path
          </h2>
          <p className="text-muted mb-4">
            Don&apos;t worry, we all get lost sometimes. The recipe you&apos;re
            looking for might be taking a break.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/">
              <Button variant="success">Return to Your Recipes</Button>
            </Link>
            <Button
              variant="outline-secondary"
              onClick={() => router.history.back()}
            >
              Go Back
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  )
}
