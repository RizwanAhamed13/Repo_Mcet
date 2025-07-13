import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge, Modal, Alert } from 'react-bootstrap';
import { Helmet } from 'react-helmet';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaUsers, FaFileAlt, FaCog, FaSignOutAlt, FaEye, FaEdit, FaCreditCard, FaChartBar, FaFolder } from 'react-icons/fa';
import { apiService } from '../services/api';

const Admin = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({
    paymentEnabled: false,
    paytmMerchantId: '',
    paytmMerchantKey: '',
    paytmEnvironment: 'TEST'
  });
  const [paymentStats, setPaymentStats] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadOrders();
    loadPaymentSettings();
    loadPaymentStats();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await apiService.getOrders();
      if (response.success) {
        setOrders(response.orders);
      } else {
        toast.error('Failed to load orders');
      }
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentSettings = async () => {
    try {
      const response = await apiService.getPaymentSettings();
      if (response.success) {
        setPaymentSettings(response.settings);
      } else {
        toast.error('Failed to load payment settings');
      }
    } catch (error) {
      toast.error('Failed to load payment settings');
    }
  };

  const loadPaymentStats = async () => {
    try {
      const response = await apiService.getPaymentStats();
      if (response.success) {
        setPaymentStats(response.stats);
      } else {
        toast.error('Failed to load payment statistics');
      }
    } catch (error) {
      toast.error('Failed to load payment statistics');
    }
  };

  const loadFiles = async () => {
    try {
      setLoadingFiles(true);
      const response = await apiService.getFiles();
      if (response.success) {
        setFiles(response.files);
      } else {
        toast.error('Failed to load files');
      }
    } catch (error) {
      toast.error('Failed to load files');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handlePaymentSettingsSave = async () => {
    setSavingSettings(true);
    
    try {
      const response = await apiService.updatePaymentSettings(paymentSettings);
      if (response.success) {
        toast.success('Payment settings updated successfully');
        setShowPaymentSettings(false);
      } else {
        toast.error('Failed to update payment settings');
      }
    } catch (error) {
      toast.error('Failed to update payment settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      processing: 'info',
      completed: 'success',
      cancelled: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      paid: 'success',
      failed: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const response = await apiService.updateOrderStatus(orderId, newStatus);
      if (response.success) {
        toast.success('Order status updated successfully');
        loadOrders(); // Reload orders
      } else {
        toast.error('Failed to update order status');
      }
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handleViewFiles = () => {
    setShowFiles(true);
    loadFiles();
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - Print Repository System</title>
      </Helmet>

      <Container fluid className="py-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <h1>Admin Dashboard</h1>
              <div>
                <Button variant="outline-secondary" onClick={logout}>
                  <FaSignOutAlt className="me-2" />
                  Logout
                </Button>
              </div>
            </div>
          </Col>
        </Row>

        {/* Stats Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center border-0 shadow">
              <Card.Body>
                <FaUsers size={32} className="text-primary mb-2" />
                <h4>{orders.length}</h4>
                <p className="text-muted mb-0">Total Orders</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center border-0 shadow">
              <Card.Body>
                <FaFileAlt size={32} className="text-success mb-2" />
                <h4>{orders.filter(o => o.status === 'completed').length}</h4>
                <p className="text-muted mb-0">Completed</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center border-0 shadow">
              <Card.Body>
                <FaCreditCard size={32} className="text-info mb-2" />
                <h4>{paymentStats?.totalRevenue?.toFixed(2) || '0.00'}</h4>
                <p className="text-muted mb-0">Total Revenue</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center border-0 shadow">
              <Card.Body>
                <FaChartBar size={32} className="text-warning mb-2" />
                <h4>{paymentStats?.conversionRate || '0'}%</h4>
                <p className="text-muted mb-0">Payment Rate</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Action Buttons */}
        <Row className="mb-4">
          <Col>
            <Button 
              variant="primary" 
              onClick={() => setShowPaymentSettings(true)}
              className="me-2"
            >
              <FaCog className="me-2" />
              Payment Settings
            </Button>
            <Button 
              variant="outline-primary"
              onClick={handleViewFiles}
              className="me-2"
            >
              <FaFolder className="me-2" />
              View Uploaded Files
            </Button>
            <Button variant="outline-primary">
              <FaChartBar className="me-2" />
              Generate Report
            </Button>
          </Col>
        </Row>

        {/* Orders Table */}
        <Row>
          <Col>
            <Card className="border-0 shadow">
              <Card.Header>
                <h5 className="mb-0">Recent Orders</h5>
              </Card.Header>
              <Card.Body>
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Token</th>
                        <th>Roll Number</th>
                        <th>Pages</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td>{order.token}</td>
                          <td>{order.rollNumber}</td>
                          <td>{order.totalPages}</td>
                          <td>₹{order.price.toFixed(2)}</td>
                          <td>{getStatusBadge(order.status)}</td>
                          <td>{getPaymentStatusBadge(order.paymentStatus)}</td>
                          <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleViewOrder(order)}
                            >
                              <FaEye />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Order Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Order Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <div>
              <Row>
                <Col md={6}>
                  <h6>Order Information</h6>
                  <p><strong>Token:</strong> {selectedOrder.token}</p>
                  <p><strong>Roll Number:</strong> {selectedOrder.rollNumber}</p>
                  <p><strong>Status:</strong> {getStatusBadge(selectedOrder.status)}</p>
                  <p><strong>Payment Status:</strong> {getPaymentStatusBadge(selectedOrder.paymentStatus)}</p>
                  <p><strong>Created:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                </Col>
                <Col md={6}>
                  <h6>Print Details</h6>
                  <p><strong>Total Pages:</strong> {selectedOrder.totalPages}</p>
                  <p><strong>Color Pages:</strong> {selectedOrder.colorPages}</p>
                  <p><strong>B&W Pages:</strong> {selectedOrder.bwPages}</p>
                  <p><strong>Total Cost:</strong> ₹{selectedOrder.price.toFixed(2)}</p>
                </Col>
              </Row>

              <hr />

              <h6>Update Status</h6>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-warning"
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'pending')}
                >
                  Set Pending
                </Button>
                <Button
                  variant="outline-info"
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'processing')}
                >
                  Set Processing
                </Button>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                >
                  Set Completed
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                >
                  Set Cancelled
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Payment Settings Modal */}
      <Modal show={showPaymentSettings} onHide={() => setShowPaymentSettings(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Payment Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Enable Payment Processing"
                checked={paymentSettings.paymentEnabled}
                onChange={(e) => setPaymentSettings(prev => ({ ...prev, paymentEnabled: e.target.checked }))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Paytm Merchant ID</Form.Label>
              <Form.Control
                type="text"
                value={paymentSettings.paytmMerchantId}
                onChange={(e) => setPaymentSettings(prev => ({ ...prev, paytmMerchantId: e.target.value }))}
                placeholder="Enter Paytm Merchant ID"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Paytm Merchant Key</Form.Label>
              <Form.Control
                type="password"
                value={paymentSettings.paytmMerchantKey}
                onChange={(e) => setPaymentSettings(prev => ({ ...prev, paytmMerchantKey: e.target.value }))}
                placeholder="Enter Paytm Merchant Key"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Environment</Form.Label>
              <Form.Select
                value={paymentSettings.paytmEnvironment}
                onChange={(e) => setPaymentSettings(prev => ({ ...prev, paytmEnvironment: e.target.value }))}
              >
                <option value="TEST">Test Environment</option>
                <option value="PROD">Production Environment</option>
              </Form.Select>
            </Form.Group>

            <Alert variant="info">
              <strong>Note:</strong> Payment processing is currently {paymentSettings.paymentEnabled ? 'enabled' : 'disabled'}. 
              {!paymentSettings.paymentEnabled && ' Enable it and configure Paytm credentials to process payments.'}
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentSettings(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handlePaymentSettingsSave}
            disabled={savingSettings}
          >
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Files Modal */}
      <Modal show={showFiles} onHide={() => setShowFiles(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Uploaded Files</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingFiles ? (
            <div className="text-center py-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div>
              <Alert variant="info">
                <strong>Note:</strong> Files are automatically cleaned up after 24 hours.
              </Alert>
              
              {files.length === 0 ? (
                <p className="text-center text-muted">No files found in uploads directory.</p>
              ) : (
                <Table responsive>
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Size (MB)</th>
                      <th>Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file, index) => (
                      <tr key={index}>
                        <td>{file.name}</td>
                        <td>{file.sizeInMB}</td>
                        <td>{new Date(file.modified).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFiles(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={loadFiles}>
            Refresh
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Admin; 