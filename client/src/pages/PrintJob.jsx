import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Modal } from 'react-bootstrap';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { usePrintJob } from '../context/PrintJobContext';
import { toast } from 'react-toastify';
import { FaUpload, FaFilePdf, FaPrint, FaCalculator, FaEye, FaCheck, FaTimes } from 'react-icons/fa';
import { convertDocxToPreview, convertDocToPreview, getFileTypeInfo } from '../utils/documentConverter';

// Add custom styles for page preview
const pagePreviewStyles = `
  .page-thumbnail {
    transition: all 0.2s ease;
    border: 2px solid #e9ecef;
    border-radius: 8px;
    padding: 8px;
    background: white;
  }
  
  .page-thumbnail:hover {
    border-color: #007bff;
    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
    transform: translateY(-2px);
  }
  
  .page-thumbnail.selected {
    border-color: #007bff;
    background-color: rgba(0, 123, 255, 0.1);
  }
  
  .page-thumbnail img {
    transition: transform 0.2s ease;
    border-radius: 4px;
  }
  
  .page-thumbnail:hover img {
    transform: scale(1.05);
  }
  
  .preview-container {
    max-height: 400px;
    overflow-y: auto;
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;
  }
  
  .page-preview-modal .modal-body {
    background-color: #f8f9fa;
    text-align: center;
  }
  
  .page-preview-modal img {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-width: 100%;
    max-height: 70vh;
  }
  
  .file-type-icon {
    font-size: 2rem;
    margin-bottom: 8px;
  }
  
  .image-preview {
    max-width: 100%;
    max-height: 120px;
    object-fit: contain;
    border-radius: 4px;
  }
`;

const PrintJob = () => {
  const navigate = useNavigate();
  const { 
    uploadedFile, 
    selectedPages, 
    printOptions, 
    pricing, 
    handleFileUpload, 
    updatePrintOptions,
    togglePageSelection,
    selectAllPages,
    clearAllSelections
  } = usePrintJob();

  const [rollNumber, setRollNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewPages, setPreviewPages] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPageForPreview, setSelectedPageForPreview] = useState(null);
  const [showPageModal, setShowPageModal] = useState(false);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [fileType, setFileType] = useState('');

  // Load PDF.js dynamically
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        window.pdfjsLib = pdfjsLib;
      } catch (error) {
        console.error('Failed to load PDF.js:', error);
      }
    };
    loadPdfJs();
  }, []);

  const generatePdfPreview = async (file) => {
    if (!window.pdfjsLib) {
      toast.error('PDF preview not available');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDocument(pdf);

      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        pages.push({
          id: i - 1,
          thumbnail: canvas.toDataURL(),
          pageNumber: i,
          selected: false,
          type: 'pdf'
        });
      }

      setPreviewPages(pages);
      setShowPreview(true);
      setFileType('pdf');
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      toast.error('Failed to generate PDF preview');
    }
  };

  const generateImagePreview = async (file) => {
    try {
      const url = URL.createObjectURL(file);
      const pages = [{
        id: 0,
        thumbnail: url,
        pageNumber: 1,
        selected: false,
        type: 'image',
        originalUrl: url
      }];
      
      setPreviewPages(pages);
      setShowPreview(true);
      setFileType('image');
    } catch (error) {
      console.error('Error generating image preview:', error);
      toast.error('Failed to generate image preview');
    }
  };

  const generateDocumentPreview = async (file) => {
    try {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (fileExtension === 'docx') {
        const result = await convertDocxToPreview(file);
        if (result.success) {
          setPreviewPages(result.pages);
          setShowPreview(true);
          setFileType(result.fileType);
        } else {
          toast.error(result.error);
        }
        return;
      }
      
      if (fileExtension === 'doc') {
        const result = await convertDocToPreview(file);
        if (result.success) {
          setPreviewPages(result.pages);
          setShowPreview(true);
          setFileType(result.fileType);
        } else {
          toast.error(result.error);
        }
        return;
      }
      
      // For other documents
      const mockPages = Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => ({
        id: i,
        thumbnail: `https://via.placeholder.com/150x200/6c757d/ffffff?text=Page+${i + 1}`,
        pageNumber: i + 1,
        selected: false,
        type: 'document'
      }));
      
      setPreviewPages(mockPages);
      setShowPreview(true);
      setFileType('document');
    } catch (error) {
      console.error('Error generating document preview:', error);
      toast.error('Failed to generate document preview');
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const success = handleFileUpload(file);
      if (success) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        if (fileExtension === 'pdf') {
          await generatePdfPreview(file);
        } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExtension)) {
          await generateImagePreview(file);
        } else if (fileExtension === 'docx') {
          await generateDocumentPreview(file);
        } else if (fileExtension === 'doc') {
          await generateDocumentPreview(file);
        } else {
          await generateDocumentPreview(file);
        }
      }
    }
  };

  // Handle page selection
  const handlePageSelection = (pageId) => {
    togglePageSelection(pageId);
  };

  // Handle page preview click
  const handlePagePreviewClick = (page) => {
    setSelectedPageForPreview(page);
    setShowPageModal(true);
  };

  // Select all pages
  const handleSelectAllPages = () => {
    selectAllPages(previewPages.length);
  };

  // Clear all selections
  const handleClearAllSelections = () => {
    clearAllSelections();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!uploadedFile) {
      toast.error('Please upload a file first');
      return;
    }

    if (!rollNumber.trim()) {
      toast.error('Please enter your roll number');
      return;
    }

    if (selectedPages.length === 0) {
      toast.error('Please select at least one page');
      return;
    }

    setLoading(true);
    
    try {
      // Simulate API call for now
      const orderData = {
        rollNumber,
        totalPages: selectedPages.length,
        colorPages: printOptions.color ? selectedPages.length : 0,
        bwPages: printOptions.color ? 0 : selectedPages.length,
        price: pricing.total,
        printOptions,
        token: Math.random().toString(36).substr(2, 9).toUpperCase() // Generate token
      };

      // Navigate to thank you page with order data
      navigate('/thank-you', { state: { orderData } });
    } catch (error) {
      toast.error('Failed to create print job');
    } finally {
      setLoading(false);
    }
  };

  const getFileTypeIcon = () => {
    const fileInfo = uploadedFile ? getFileTypeInfo(uploadedFile.name) : null;
    
    if (!fileInfo) return <FaFilePdf className="text-muted" />;
    
    switch (fileInfo.type) {
      case 'pdf':
        return <FaFilePdf className="text-danger" />;
      case 'image':
        return <FaEye className="text-primary" />;
      case 'docx':
        return <FaFilePdf className="text-success" />;
      case 'doc':
        return <FaFilePdf className="text-secondary" />;
      case 'document':
        return <FaFilePdf className="text-secondary" />;
      default:
        return <FaFilePdf className="text-muted" />;
    }
  };

  return (
    <>
      <Helmet>
        <title>Create Print Job - Print Repository System</title>
        <style>{pagePreviewStyles}</style>
      </Helmet>

      <Container className="py-5">
        <Row className="justify-content-center">
          <Col lg={10}>
            <h1 className="text-center mb-5">
              <FaPrint className="me-3" />
              Create Print Job
            </h1>

            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Card className="mb-4">
                    <Card.Header>
                      <h5><FaUpload className="me-2" />Upload Document</h5>
                    </Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Roll Number</Form.Label>
                        <Form.Control
                          type="text"
                          value={rollNumber}
                          onChange={(e) => setRollNumber(e.target.value)}
                          placeholder="Enter your roll number"
                          required
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Upload File</Form.Label>
                        <Form.Control
                          type="file"
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          required
                        />
                        <Form.Text className="text-muted">
                          Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 25MB)
                        </Form.Text>
                      </Form.Group>

                      {uploadedFile && (
                        <Alert variant="success">
                          {getFileTypeIcon()}
                          File uploaded: {uploadedFile.name}
                        </Alert>
                      )}

                      {showPreview && (
                        <div className="mt-3">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6>
                              {getFileTypeIcon()} Document Preview ({fileType.toUpperCase()})
                            </h6>
                            <div>
                              <Button size="sm" variant="outline-primary" onClick={handleSelectAllPages} className="me-2">
                                Select All
                              </Button>
                              <Button size="sm" variant="outline-secondary" onClick={handleClearAllSelections}>
                                Clear All
                              </Button>
                            </div>
                          </div>
                          
                          <div className="preview-container">
                            <Row>
                              {previewPages.map((page) => (
                                <Col key={page.id} xs={6} sm={4} md={3} lg={2} className="mb-2">
                                  <div 
                                    className={`page-thumbnail text-center ${selectedPages.includes(page.id) ? 'selected' : ''}`}
                                  >
                                    <div 
                                      onClick={() => handlePagePreviewClick(page)}
                                      style={{ cursor: 'pointer' }}
                                      title="Click to preview page"
                                    >
                                      <img 
                                        src={page.thumbnail} 
                                        alt={`Page ${page.pageNumber}`}
                                        className="img-fluid mb-1"
                                        style={{ 
                                          maxHeight: '120px', 
                                          width: '100%', 
                                          objectFit: 'contain',
                                          borderRadius: '4px'
                                        }}
                                      />
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                      <small>Page {page.pageNumber}</small>
                                      <div>
                                        <Button
                                          size="sm"
                                          variant={selectedPages.includes(page.id) ? "primary" : "outline-primary"}
                                          onClick={() => handlePageSelection(page.id)}
                                          className="me-1"
                                        >
                                          {selectedPages.includes(page.id) ? <FaCheck size={10} /> : 'Select'}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </Col>
                              ))}
                            </Row>
                          </div>
                          
                          {selectedPages.length > 0 && (
                            <Alert variant="info" className="mt-3">
                              <FaEye className="me-2" />
                              {selectedPages.length} page(s) selected for printing
                            </Alert>
                          )}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="mb-4">
                    <Card.Header>
                      <h5><FaCalculator className="me-2" />Print Options</h5>
                    </Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          label="Color Printing"
                          checked={printOptions.color}
                          onChange={(e) => updatePrintOptions({ color: e.target.checked })}
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          label="Double-sided Printing"
                          checked={printOptions.doubleSided}
                          onChange={(e) => updatePrintOptions({ doubleSided: e.target.checked })}
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Number of Copies</Form.Label>
                        <Form.Control
                          type="number"
                          min="1"
                          max="10"
                          value={printOptions.copies}
                          onChange={(e) => updatePrintOptions({ copies: parseInt(e.target.value) })}
                        />
                      </Form.Group>

                      {pricing.total > 0 && (
                        <Alert variant="info">
                          <strong>Total Cost: ₹{pricing.total.toFixed(2)}</strong>
                          <br />
                          <small>
                            B&W: {pricing.bwPages} pages, Color: {pricing.colorPages} pages
                            <br />
                            Maintenance Fee: ₹{pricing.maintenanceFee.toFixed(2)}
                          </small>
                        </Alert>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <div className="text-center">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading || !uploadedFile || selectedPages.length === 0}
                >
                  {loading ? 'Processing...' : 'Create Print Job'}
                </Button>
              </div>
            </Form>
          </Col>
        </Row>
      </Container>

      {/* Page Preview Modal */}
      <Modal show={showPageModal} onHide={() => setShowPageModal(false)} size="lg" className="page-preview-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            {getFileTypeIcon()} Page {selectedPageForPreview?.pageNumber} Preview
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedPageForPreview && (
            <img 
              src={selectedPageForPreview.thumbnail} 
              alt={`Page ${selectedPageForPreview.pageNumber}`}
              className="img-fluid"
              style={{ maxHeight: '70vh' }}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPageModal(false)}>
            Close
          </Button>
          <Button 
            variant={selectedPages.includes(selectedPageForPreview?.id) ? "outline-primary" : "primary"}
            onClick={() => {
              if (selectedPageForPreview) {
                handlePageSelection(selectedPageForPreview.id);
              }
              setShowPageModal(false);
            }}
          >
            {selectedPages.includes(selectedPageForPreview?.id) ? 'Deselect Page' : 'Select Page'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PrintJob; 