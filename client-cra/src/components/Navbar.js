import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaChevronDown, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import logo from './nialogo-removebg-preview.png';
import './Navbar.css';

const NavigationBar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [navVisible, setNavVisible] = useState(true);
  const navRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setNavVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        setNavVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <>
      <nav 
        ref={navRef}
        className={`navbar ${navVisible ? 'visible' : 'hidden'}`}
        style={{
          transform: navVisible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.3s ease-in-out'
        }}
      >
        <div className="nav-container">
          <Link to="/" className="nav-brand" onClick={handleNavClick}>
            <img src={logo} alt="Logo" className="nav-logo" />
          </Link>

          <div className="nav-content-wrapper">
            <div className="desktop-menu">
              <div className="nav-links">
                <Link to="/" className="nav-link" onClick={handleNavClick}>
                  <span className="link-text">Home</span>
                  <span className="link-underline"></span>
                </Link>
                <Link to="/print-job" className="nav-link" onClick={handleNavClick}>
                  <span className="link-text">Print Job</span>
                  <span className="link-underline"></span>
                </Link>
                <Link to="/tracking" className="nav-link" onClick={handleNavClick}>
                  <span className="link-text">Track Order</span>
                  <span className="link-underline"></span>
                </Link>
                <Link to="/admin" className="nav-link" onClick={handleNavClick}>
                  <span className="link-text">Admin</span>
                  <span className="link-underline"></span>
                </Link>

                <div
                  className="nav-dropdown"
                  onMouseEnter={() => setDropdownOpen(true)}
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <button className="dropdown-toggle">
                    <FaUser className="user-icon" />
                    <span>{isAuthenticated ? user?.username || 'Admin' : 'Admin'}</span>
                    <FaChevronDown className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`} />
                  </button>
                  {dropdownOpen && (
                    <div className="dropdown-menu open">
                      {isAuthenticated ? (
                        <>
                          <Link to="/admin" className="dropdown-item" onClick={handleNavClick}>
                            Admin Dashboard
                          </Link>
                          <button className="dropdown-item" onClick={handleLogout}>
                            <FaSignOutAlt className="me-2" />
                            Logout
                          </button>
                        </>
                      ) : (
                        <Link to="/admin" className="dropdown-item" onClick={handleNavClick}>
                          Admin Login
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              className={`mobile-menu-btn ${mobileMenuOpen ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span className="menu-line top-line"></span>
              <span className="menu-line middle-line"></span>
              <span className="menu-line bottom-line"></span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-menu-content">
            <Link to="/" className="mobile-nav-link" onClick={handleNavClick}>Home</Link>
            <Link to="/print-job" className="mobile-nav-link" onClick={handleNavClick}>Print Job</Link>
            <Link to="/tracking" className="mobile-nav-link" onClick={handleNavClick}>Track Order</Link>
            <div className="mobile-auth-section">
              {isAuthenticated ? (
                <button className="mobile-nav-button" onClick={handleLogout}>
                  <FaSignOutAlt className="user-icon" /> Logout
                </button>
              ) : (
                <Link to="/admin" className="mobile-nav-button" onClick={handleNavClick}>
                  <FaUser className="user-icon" /> Admin Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default NavigationBar;