import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge } from 'react-bootstrap';
import { Helmet } from 'react-helmet';
import { FaSearch, FaFileAlt, FaClock, FaCheckCircle, FaTimes } from 'react-icons/fa';

const Tracking = () => {
  const [searchType, setSearchType] = useState('token');
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchValue.trim()) {
      setError('Please enter a search value');
      return;
    }

    setLoading(true);
    setError('');
    setOrderData(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock order data
      const mockOrder = {
        token: searchValue,
        rollNumber: '2023001',
        status: 'processing',
        totalPages: 5,
        colorPages: 2,
        bwPages: 3,
        price: 8.50,
        createdAt: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      };

      setOrderData(mockOrder);
    } catch (error) {
      setError('Order not found. Please check your token or roll number.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: 'warning', icon: FaClock },
      processing: { variant: 'info', icon: FaClock },
      completed: { variant: 'success', icon: FaCheckCircle },
      cancelled: { variant: 'danger', icon: FaTimes }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge bg={config.variant} className="fs-6">
        <Icon className="me-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <>
      <Helmet>
        <title>Track Order - Print Repository System</title>
      </Helmet>

      <Container className="py-5">
        <Row className="justify-content-center">
          <Col lg={8}>
            <h1 className="text-center mb-5">
              <FaSearch className="me-3" />
              Track Your Order
            </h1>

            <Card className="mb-4">
              <Card.Body>
                <Form onSubmit={handleSearch}>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Search By</Form.Label>
                        <Form.Select
                          value={searchType}
                          onChange={(e) => setSearchType(e.target.value)}
                        >
                          <option value="token">Order Token</option>
                          <option value="rollNumber">Roll Number</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          {searchType === 'token' ? 'Order Token' : 'Roll Number'}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          value={searchValue}
                          onChange={(e) => setSearchValue(e.target.value)}
                          placeholder={
                            searchType === 'token' 
                              ? 'Enter your order token' 
                              : 'Enter your roll number'
                          }
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group className="mb-3">
                        <Form.Label>&nbsp;</Form.Label>
                        <Button
                          type="submit"
                          variant="primary"
                          className="w-100"
                          disabled={loading}
                        >
                          {loading ? 'Searching...' : 'Search'}
                        </Button>
                      </Form.Group>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>

            {error && (
              <Alert variant="danger">
                {error}
              </Alert>
            )}

            {orderData && (
              <Card>
                <Card.Header>
                  <h5 className="mb-0">
                    <FaFileAlt className="me-2" />
                    Order Details
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6>Order Information</h6>
                      <p><strong>Token:</strong> {orderData.token}</p>
                      <p><strong>Roll Number:</strong> {orderData.rollNumber}</p>
                      <p><strong>Status:</strong> {getStatusBadge(orderData.status)}</p>
                      <p><strong>Created:</strong> {new Date(orderData.createdAt).toLocaleString()}</p>
                    </Col>
                    <Col md={6}>
                      <h6>Print Details</h6>
                      <p><strong>Total Pages:</strong> {orderData.totalPages}</p>
                      <p><strong>Color Pages:</strong> {orderData.colorPages}</p>
                      <p><strong>B&W Pages:</strong> {orderData.bwPages}</p>
                      <p><strong>Total Cost:</strong> ₹{orderData.price.toFixed(2)}</p>
                    </Col>
                  </Row>

                  {orderData.status === 'processing' && (
                    <Alert variant="info" className="mt-3">
                      <FaClock className="me-2" />
                      Estimated completion: {new Date(orderData.estimatedCompletion).toLocaleString()}
                    </Alert>
                  )}

                  <div className="mt-3">
                    <Button variant="outline-primary" size="sm">
                      Download Bill
                    </Button>
                    <Button variant="outline-secondary" size="sm" className="ms-2">
                      Print Receipt
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default Tracking; 