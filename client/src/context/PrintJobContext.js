import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const PrintJobContext = createContext();

export const usePrintJob = () => {
  const context = useContext(PrintJobContext);
  if (!context) {
    throw new Error('usePrintJob must be used within a PrintJobProvider');
  }
  return context;
};

export const PrintJobProvider = ({ children }) => {
  const [currentJob, setCurrentJob] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedPages, setSelectedPages] = useState([]);
  const [printOptions, setPrintOptions] = useState({
    color: false,
    doubleSided: false,
    copies: 1
  });
  const [pricing, setPricing] = useState({
    bwPages: 0,
    colorPages: 0,
    totalPages: 0,
    subtotal: 0,
    maintenanceFee: 0,
    total: 0
  });

  // Pricing constants
  const PRICING = {
    BW_PRICE: 1,
    COLOR_PRICE: 2,
    MAINTENANCE_FEE: 0.20
  };

  // Calculate pricing based on selections
  const calculatePricing = (pages, options) => {
    if (!pages || pages.length === 0) {
      return {
        bwPages: 0,
        colorPages: 0,
        totalPages: 0,
        subtotal: 0,
        maintenanceFee: 0,
        total: 0
      };
    }

    const { color, copies } = options;
    const totalPages = pages.length * copies;
    const bwPages = color ? 0 : totalPages;
    const colorPages = color ? totalPages : 0;
    
    const bwCost = bwPages * PRICING.BW_PRICE;
    const colorCost = colorPages * PRICING.COLOR_PRICE;
    const subtotal = bwCost + colorCost;
    const maintenanceFee = totalPages * PRICING.MAINTENANCE_FEE;
    const total = subtotal + maintenanceFee;

    return {
      bwPages,
      colorPages,
      totalPages,
      subtotal,
      maintenanceFee,
      total
    };
  };

  // Update pricing when selections change
  const updatePricing = () => {
    if (selectedPages.length > 0) {
      const newPricing = calculatePricing(selectedPages, printOptions);
      setPricing(newPricing);
    } else {
      setPricing({
        bwPages: 0,
        colorPages: 0,
        totalPages: 0,
        subtotal: 0,
        maintenanceFee: 0,
        total: 0
      });
    }
  };

  // Update pricing whenever selectedPages or printOptions change
  useEffect(() => {
    updatePricing();
  }, [selectedPages, printOptions]);

  // Handle file upload
  const handleFileUpload = (file) => {
    if (!file) return false;

    // Validate file type
    const allowedTypes = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      toast.error('Invalid file type. Please upload PDF, DOC, DOCX, JPG, JPEG, or PNG files.');
      return false;
    }

    // Validate file size (25MB)
    const maxSize = 25 * 1024 * 1024; // 25MB in bytes
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 25MB.');
      return false;
    }

    setUploadedFile(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);
    
    // Reset selections
    setSelectedPages([]);
    setPrintOptions({
      color: false,
      doubleSided: false,
      copies: 1
    });
    
    toast.success('File uploaded successfully!');
    return true;
  };

  // Handle page selection
  const togglePageSelection = (pageIndex) => {
    setSelectedPages(prev => {
      const newSelection = prev.includes(pageIndex)
        ? prev.filter(p => p !== pageIndex)
        : [...prev, pageIndex].sort((a, b) => a - b);
      return newSelection;
    });
  };

  // Select all pages
  const selectAllPages = (pageCount) => {
    const allPages = Array.from({ length: pageCount }, (_, i) => i);
    setSelectedPages(allPages);
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedPages([]);
  };

  // Handle print options change
  const updatePrintOptions = (newOptions) => {
    setPrintOptions(prev => {
      const updated = { ...prev, ...newOptions };
      return updated;
    });
  };

  // Clear current job
  const clearJob = () => {
    setCurrentJob(null);
    setUploadedFile(null);
    setFilePreview(null);
    setSelectedPages([]);
    setPrintOptions({
      color: false,
      doubleSided: false,
      copies: 1
    });
    setPricing({
      bwPages: 0,
      colorPages: 0,
      totalPages: 0,
      subtotal: 0,
      maintenanceFee: 0,
      total: 0
    });
  };

  // Set current job (for thank you page)
  const setJob = (jobData) => {
    setCurrentJob(jobData);
  };

  const value = {
    currentJob,
    uploadedFile,
    filePreview,
    selectedPages,
    printOptions,
    pricing,
    PRICING,
    handleFileUpload,
    togglePageSelection,
    selectAllPages,
    clearAllSelections,
    updatePrintOptions,
    clearJob,
    setJob,
    updatePricing
  };

  return (
    <PrintJobContext.Provider value={value}>
      {children}
    </PrintJobContext.Provider>
  );
}; 