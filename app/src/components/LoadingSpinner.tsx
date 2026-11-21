import { Container } from 'react-bootstrap'

export function LoadingSpinner({
  message = 'Loading...',
}: {
  message?: string
}) {
  return (
    <Container className="loading-spinner">
      <div className="text-center">
        <div className="loading-spinner-frame">
          <img src="/images/loading.gif" alt="Loading - Pear taking notes" />
        </div>
        <p className="mt-2 fs-4">{message}</p>
      </div>
    </Container>
  )
}
