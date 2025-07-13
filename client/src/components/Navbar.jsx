import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Button, NavDropdown } from 'react-bootstrap';
import { FaUniversity, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const NavigationBar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setExpanded(false);
  };

  const handleNavClick = () => {
    setExpanded(false);
  };

  return (
    <Navbar 
      bg="white" 
      expand="lg" 
      className="shadow-sm border-bottom"
      expanded={expanded}
      onToggle={(expanded) => setExpanded(expanded)}
    >
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold text-primary">
          <FaUniversity className="me-2" />
          Print Repository
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link 
              as={Link} 
              to="/" 
              active={location.pathname === '/'}
              onClick={handleNavClick}
            >
              Home
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/print-job" 
              active={location.pathname === '/print-job'}
              onClick={handleNavClick}
            >
              Print Job
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/tracking" 
              active={location.pathname === '/tracking'}
              onClick={handleNavClick}
            >
              Track Order
            </Nav.Link>
          </Nav>

          <Nav className="ms-auto">
            {isAuthenticated ? (
              <NavDropdown 
                title={
                  <span>
                    <FaUser className="me-1" />
                    {user?.username || 'Admin'}
                  </span>
                } 
                id="admin-dropdown"
              >
                <NavDropdown.Item as={Link} to="/admin" onClick={handleNavClick}>
                  Admin Dashboard
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>
                  <FaSignOutAlt className="me-2" />
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <Button 
                variant="outline-primary" 
                as={Link} 
                to="/admin"
                onClick={handleNavClick}
              >
                <FaUser className="me-1" />
                Admin Login
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavigationBar; 