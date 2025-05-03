import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <Container className="py-4">
      <Row>
        <Col>
          <h1 className="mb-4">Privacy Policy</h1>

          <p>Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="mt-4">1. Introduction</h2>
          <p>
            Welcome to Recip.it. We respect your privacy and are committed to protecting your
            personal data. This privacy policy will inform you about how we look after your personal
            data when you visit our website and tell you about your privacy rights and how the law
            protects you.
          </p>

          <h2 className="mt-4">2. The Data We Collect</h2>
          <p>
            We may collect, use, store and transfer different kinds of personal data about you which
            we have grouped as follows:
          </p>
          <ul>
            <li>
              Technical Data includes internet protocol (IP) address, your login data, browser type
              and version.
            </li>
            <li>Usage Data includes information about how you use our website and services.</li>
          </ul>

          <h2 className="mt-4">3. How We Use Your Data</h2>
          <p>
            We will only use your personal data when the law allows us to. Most commonly, we will
            use your personal data in the following circumstances:
          </p>
          <ul>
            <li>
              Where we need to perform the contract we are about to enter into or have entered into
              with you.
            </li>
            <li>
              Where it is necessary for our legitimate interests and your interests and fundamental
              rights do not override those interests.
            </li>
            <li>Where we need to comply with a legal or regulatory obligation.</li>
          </ul>

          <h2 className="mt-4">4. Data Security</h2>
          <p>
            We have put in place appropriate security measures to prevent your personal data from
            being accidentally lost, used, or accessed in an unauthorized way, altered, or
            disclosed.
          </p>

          <h2 className="mt-4">5. Your Legal Rights</h2>
          <p>
            Under certain circumstances, you have rights under data protection laws in relation to
            your personal data, including the right to:
          </p>
          <ul>
            <li>Request access to your personal data</li>
            <li>Request correction of your personal data</li>
            <li>Request erasure of your personal data</li>
            <li>Object to processing of your personal data</li>
            <li>Request restriction of processing your personal data</li>
            <li>Request transfer of your personal data</li>
            <li>Right to withdraw consent</li>
          </ul>

          <p>
            Reach out to us at <a href="mailto:admin@recipit.me">admin@recipit.me</a> for any
            request regarding your personal data.
          </p>

          <h2 className="mt-4">6. Contact Us</h2>
          <p>
            If you have any questions about this privacy policy or our privacy practices, please
            contact us at:
            <br />
            Email: admin@recipit.me
          </p>
        </Col>
      </Row>
    </Container>
  );
};

export default PrivacyPolicyPage;
