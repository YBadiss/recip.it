import React from 'react';
import { Container } from 'react-bootstrap';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <Container className="loading-spinner">
      <div className="text-center">
        <div
          style={{
            width: '450px',
            height: '450px',
            margin: '0 auto 1.5rem',
            overflow: 'hidden',
            borderRadius: '50%',
            backgroundColor: '#f0f5e8',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '3px solid #dce7c8',
          }}
        >
          <img
            src="/images/loading.gif"
            alt="Loading - Pear taking notes"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
        <p className="mt-2 fs-4">{message}</p>
      </div>
    </Container>
  );
};

export default LoadingSpinner;
