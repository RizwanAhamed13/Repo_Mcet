import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Helmet } from 'react-helmet';
import { FaPrint, FaSearch, FaUniversity, FaClock, FaShieldAlt } from 'react-icons/fa';

const Home = () => {
  const navigate = useNavigate();

  const handleStartPrintJob = () => {
    navigate('/print-job');
  };

  const handleTrackOrder = () => {
    navigate('/tracking');
  };

  return (
    <>
      <Helmet>
        <title>Print Repository System - Home</title>
        <meta name="description" content="Efficient printing management for educational institutions" />
      </Helmet>

      <div className="bg-primary text-white py-5">
        <Container>
          <Row className="justify-content-center text-center">
            <Col md={8}>
              <h1 className="display-4 fw-bold mb-3">
                <FaUniversity className="me-3" />
                Print Repository System
              </h1>
              <p className="lead mb-4">
                Efficient printing management for educational institutions
              </p>
              <p className="mb-0">
                Upload your documents, customize printing options, and track your orders with ease.
              </p>
            </Col>
          </Row>
        </Container>
      </div>

      <Container className="py-5">
        <Row className="justify-content-center">
          <Col lg={8}>
            <Row className="g-4">
              <Col md={6}>
                <Card className="h-100 text-center border-0 shadow-sm">
                  <Card.Body className="p-4">
                    <div className="mb-3">
                      <FaPrint size={48} className="text-primary" />
                    </div>
                    <Card.Title className="h4 mb-3">Start New Print Job</Card.Title>
                    <Card.Text className="text-muted mb-4">
                      Upload your documents, select pages, choose printing options, and complete payment.
                    </Card.Text>
                    <Button 
                      variant="primary" 
                      size="lg" 
                      onClick={handleStartPrintJob}
                      className="w-100"
                    >
                      Start Printing
                    </Button>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="h-100 text-center border-0 shadow-sm">
                  <Card.Body className="p-4">
                    <div className="mb-3">
                      <FaSearch size={48} className="text-success" />
                    </div>
                    <Card.Title className="h4 mb-3">Track Your Order</Card.Title>
                    <Card.Text className="text-muted mb-4">
                      Check the status of your print job using your order token or roll number.
                    </Card.Text>
                    <Button 
                      variant="success" 
                      size="lg" 
                      onClick={handleTrackOrder}
                      className="w-100"
                    >
                      Track Order
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Features Section */}
        <Row className="mt-5 pt-5">
          <Col lg={12}>
            <h2 className="text-center mb-5">Why Choose Our Print Repository?</h2>
          </Col>
        </Row>

        <Row className="g-4">
          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center p-4">
                <FaShieldAlt size={32} className="text-primary mb-3" />
                <Card.Title className="h5">Secure & Safe</Card.Title>
                <Card.Text className="text-muted">
                  All files are scanned for malware and automatically deleted after processing.
                  Your data is protected with industry-standard security measures.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center p-4">
                <FaClock size={32} className="text-success mb-3" />
                <Card.Title className="h5">Fast Processing</Card.Title>
                <Card.Text className="text-muted">
                  Quick file processing with real-time preview and instant payment confirmation.
                  Track your order status in real-time.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center p-4">
                <FaUniversity size={32} className="text-info mb-3" />
                <Card.Title className="h5">Educational Focus</Card.Title>
                <Card.Text className="text-muted">
                  Designed specifically for educational institutions with student-friendly pricing
                  and academic document support.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Pricing Section */}
        <Row className="mt-5 pt-5">
          <Col lg={12}>
            <h2 className="text-center mb-5">Transparent Pricing</h2>
          </Col>
        </Row>

        <Row className="justify-content-center">
          <Col lg={8}>
            <Card className="border-0 shadow">
              <Card.Body className="p-4">
                <Row>
                  <Col md={6}>
                    <h5 className="mb-3">Printing Costs</h5>
                    <ul className="list-unstyled">
                      <li className="mb-2">
                        <strong>Black & White:</strong> ₹1 per page
                      </li>
                      <li className="mb-2">
                        <strong>Color:</strong> ₹2 per page
                      </li>
                      <li className="mb-2">
                        <strong>Maintenance Fee:</strong> ₹0.20 per page
                      </li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <h5 className="mb-3">Supported Formats</h5>
                    <ul className="list-unstyled">
                      <li className="mb-2">PDF Documents</li>
                      <li className="mb-2">Microsoft Word (DOC/DOCX)</li>
                      <li className="mb-2">Image Files (JPG, PNG)</li>
                      <li className="mb-2">Maximum file size: 25MB</li>
                    </ul>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default Home; 