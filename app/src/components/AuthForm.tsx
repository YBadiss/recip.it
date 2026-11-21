import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap'

interface Field {
  name: string
  label: string
  type: 'text' | 'password'
  placeholder: string
  autoComplete: string
}

/** Login and register share this card: fields, an error, a submit button and a link to the other page. */
export function AuthForm({
  title,
  fields,
  submitLabel,
  pendingLabel,
  footer,
  onSubmit,
}: {
  title: string
  fields: Field[]
  submitLabel: string
  pendingLabel: string
  footer: {
    text: string
    linkLabel: string
    to: '/login' | '/register'
    search?: { redirect?: string }
  }
  onSubmit: (values: Record<string, string>) => Promise<void>
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await onSubmit(values)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Row className="justify-content-center mt-5">
      <Col md={6}>
        <Card>
          <Card.Header as="h4" className="text-center">
            {title}
          </Card.Header>
          <Card.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
              {fields.map((field) => (
                <Form.Group
                  key={field.name}
                  className="mb-3"
                  controlId={field.name}
                >
                  <Form.Label>{field.label}</Form.Label>
                  <Form.Control
                    type={field.type}
                    placeholder={field.placeholder}
                    autoComplete={field.autoComplete}
                    value={values[field.name] ?? ''}
                    onChange={(e) =>
                      setValues({ ...values, [field.name]: e.target.value })
                    }
                    disabled={pending}
                    required
                  />
                </Form.Group>
              ))}
              <div className="d-grid gap-2">
                <Button variant="primary" type="submit" disabled={pending}>
                  {pending ? pendingLabel : submitLabel}
                </Button>
              </div>
            </Form>
          </Card.Body>
          <Card.Footer className="text-center">
            {footer.text}{' '}
            <Link to={footer.to} search={footer.search ?? {}}>
              {footer.linkLabel}
            </Link>
          </Card.Footer>
        </Card>
      </Col>
    </Row>
  )
}
