import { useState, useEffect } from 'react';
import { useDataSync, useObjectDataSync } from '../hooks/useDataSync';
import { DATA_KEYS } from '../utils/dataSync';
import CompanySettings from './CompanySettings';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import './Sales.css';

const Sales = ({ userRole }) => {
  // Use synchronized data
  const { data: companyInfo, updateData: setCompanyInfo } = useObjectDataSync(DATA_KEYS.COMPANY_INFO, null);
  const { data: customers, updateData: setCustomers } = useObjectDataSync(DATA_KEYS.CUSTOMERS, {
    '27AABCU9603R1ZM': {
      name: 'ABC Construction Pvt Ltd',
      gstin: '27AABCU9603R1ZM',
      phone: '+91 9876543210',
      email: 'contact@abcconstruction.com',
      address: '123 Business Park, Mumbai, Maharashtra - 400001',
      state: 'Maharashtra',
      totalInvoices: 1,
      totalAmount: 206882,
      lastInvoiceDate: '2026-01-06'
    },
    '29AABCU9603R1ZN': {
      name: 'Green Landscapes Inc',
      gstin: '29AABCU9603R1ZN',
      phone: '+91 9876543211',
      email: 'info@greenlandscapes.com',
      address: '456 Garden Street, Bangalore, Karnataka - 560001',
      state: 'Karnataka',
      totalInvoices: 1,
      totalAmount: 366172,
      lastInvoiceDate: '2026-01-05'
    }
  });
  const { data: inventory } = useDataSync(DATA_KEYS.INVENTORY, []);
  const { 
    data: orders, 
    updateData: setOrders, 
    addItem: addOrder, 
    updateItem: updateOrder, 
    removeItem: removeOrder 
  } = useDataSync(DATA_KEYS.ORDERS, []);
  const { 
    data: invoices, 
    updateData: setInvoices, 
    addItem: addInvoice, 
    updateItem: updateInvoice, 
    removeItem: removeInvoice 
  } = useDataSync(DATA_KEYS.INVOICES, [
    {
      id: 'INV-2026-001',
      date: '2026-01-06',
      customer: 'ABC Construction Pvt Ltd',
      gstin: '27AABCU9603R1ZM',
      state: 'Maharashtra',
      placeOfSupply: 'Maharashtra',
      phone: '+91 9876543210',
      email: 'contact@abcconstruction.com',
      address: '123 Business Park, Mumbai, Maharashtra - 400001',
      items: [
        { name: 'Plastiwood Deck Board 2x6', hsn: '39259099', qty: 50, rate: 3499, gst: 18 }
      ],
      status: 'paid',
      paidAmount: 206882,
      totalAmount: 206882,
      orderId: 'ORD-2026-001' // Link to corresponding order
    },
    {
      id: 'INV-2026-002',
      date: '2026-01-05',
      customer: 'Green Landscapes Inc',
      gstin: '29AABCU9603R1ZN',
      state: 'Karnataka',
      placeOfSupply: 'Karnataka',
      phone: '+91 9876543211',
      email: 'info@greenlandscapes.com',
      address: '456 Garden Street, Bangalore, Karnataka - 560001',
      items: [
        { name: 'Garden Edging 10ft', hsn: '39259099', qty: 100, rate: 1899, gst: 18 },
        { name: 'Composite Planter Box', hsn: '39269099', qty: 25, rate: 6099, gst: 18 }
      ],
      status: 'partial',
      paidAmount: 200000,
      totalAmount: 366172,
      orderId: 'ORD-2026-002' // Link to corresponding order
    }
  ]);

  const [showSettings, setShowSettings] = useState(false);
  const [showCustomerReport, setShowCustomerReport] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // New filter state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [partialPayment, setPartialPayment] = useState(0); // New partial payment state
  const [newInvoice, setNewInvoice] = useState({
    customer: '',
    gstin: '',
    phone: '',
    email: '',
    address: '',
    state: 'Maharashtra',
    placeOfSupply: 'Maharashtra',
    items: [{ product: '', hsn: '39259099', qty: 1, rate: 0, gst: 18 }]
  });

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  const calculateInvoice = (items, billingState, supplyState) => {
    let subtotal = 0;
    let totalGST = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    items.forEach(item => {
      const itemTotal = item.qty * item.rate;
      subtotal += itemTotal;
      const gstAmount = (itemTotal * item.gst) / 100;
      totalGST += gstAmount;

      if (billingState === supplyState) {
        cgst += gstAmount / 2;
        sgst += gstAmount / 2;
      } else {
        igst += gstAmount;
      }
    });

    return {
      subtotal: subtotal.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      igst: igst.toFixed(2),
      totalGST: totalGST.toFixed(2),
      grandTotal: (subtotal + totalGST).toFixed(2)
    };
  };

  // Autofill customer details when GSTIN is selected
  const handleCustomerGSTINChange = (gstin) => {
    setNewInvoice({ ...newInvoice, gstin });
    
    // Find customer in existing customers database
    const existingCustomer = customers[gstin];
    if (existingCustomer) {
      setNewInvoice({
        ...newInvoice,
        gstin,
        customer: existingCustomer.name,
        phone: existingCustomer.phone || '',
        email: existingCustomer.email || '',
        address: existingCustomer.address || '',
        state: existingCustomer.state || 'Maharashtra',
        placeOfSupply: existingCustomer.state || 'Maharashtra'
      });
    }
  };

  // Autofill customer details when customer name is selected
  const handleCustomerNameChange = (customerName) => {
    setNewInvoice({ ...newInvoice, customer: customerName });
    
    // Find customer by name in existing customers database
    const customerEntry = Object.entries(customers).find(([gstin, customer]) => 
      customer.name.toLowerCase() === customerName.toLowerCase()
    );
    
    if (customerEntry) {
      const [gstin, customerData] = customerEntry;
      setNewInvoice({
        ...newInvoice,
        customer: customerName,
        gstin,
        phone: customerData.phone || '',
        email: customerData.email || '',
        address: customerData.address || '',
        state: customerData.state || 'Maharashtra',
        placeOfSupply: customerData.state || 'Maharashtra'
      });
    }
  };

  // Autofill item details when product is selected
  const handleProductChange = (index, productName) => {
    const items = [...newInvoice.items];
    items[index].product = productName;
    
    // Find product in inventory
    const inventoryItem = inventory.find(item => 
      item.name.toLowerCase() === productName.toLowerCase()
    );
    
    if (inventoryItem) {
      items[index] = {
        ...items[index],
        product: inventoryItem.name,
        hsn: inventoryItem.hsn || '39259099',
        rate: inventoryItem.price || 0,
        gst: inventoryItem.gst || 18
      };
    }
    
    setNewInvoice({ ...newInvoice, items });
  };

  // Get unique customer names for datalist
  const getCustomerNames = () => {
    return Object.values(customers).map(customer => customer.name);
  };

  // Get unique customer GSTINs for datalist
  const getCustomerGSTINs = () => {
    return Object.keys(customers);
  };

  // Get inventory product names for datalist
  const getProductNames = () => {
    return inventory.map(item => item.name);
  };

  const addInvoiceItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { product: '', hsn: '39259099', qty: 1, rate: 0, gst: 18 }]
    });
  };

  const removeInvoiceItem = (index) => {
    const items = newInvoice.items.filter((_, i) => i !== index);
    setNewInvoice({ ...newInvoice, items });
  };

  const updateInvoiceItem = (index, field, value) => {
    const items = [...newInvoice.items];
    items[index][field] = value;
    setNewInvoice({ ...newInvoice, items });
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const count = (invoices || []).length + 1;
    return `INV-${year}-${String(count).padStart(3, '0')}`;
  };

  const generateOrderNumber = () => {
    const year = new Date().getFullYear();
    const count = (orders || []).length + 1;
    return `ORD-${year}-${String(count).padStart(3, '0')}`;
  };

  const handleGenerateInvoice = () => {
    if (!newInvoice.customer || !newInvoice.gstin) {
      alert('Please fill in all required customer details');
      return;
    }

    if (newInvoice.items.some(item => !item.product || item.qty <= 0 || item.rate <= 0)) {
      alert('Please fill in all item details correctly');
      return;
    }

    const invoiceId = generateInvoiceNumber();
    const orderId = generateOrderNumber();
    const currentDate = new Date().toISOString().split('T')[0];
    const invoiceTotal = parseFloat(calculateInvoice(newInvoice.items, newInvoice.state, newInvoice.placeOfSupply).grandTotal);

    // Create the invoice
    const invoice = {
      id: invoiceId,
      date: currentDate,
      customer: newInvoice.customer,
      gstin: newInvoice.gstin,
      phone: newInvoice.phone,
      email: newInvoice.email,
      address: newInvoice.address,
      state: newInvoice.state,
      placeOfSupply: newInvoice.placeOfSupply,
      items: newInvoice.items.map(item => ({
        name: item.product,
        hsn: item.hsn,
        qty: item.qty,
        rate: item.rate,
        gst: item.gst
      })),
      status: 'pending',
      paidAmount: 0,
      totalAmount: invoiceTotal,
      orderId: orderId // Link to corresponding order
    };

    // Create corresponding order
    const order = {
      id: orderId,
      orderDate: currentDate,
      customerName: newInvoice.customer,
      customerPhone: newInvoice.phone,
      customerEmail: newInvoice.email,
      shippingAddress: newInvoice.address,
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      status: 'pending', // Start with pending status
      items: newInvoice.items.map(item => ({
        productName: item.product,
        quantity: item.qty,
        price: item.rate
      })),
      invoiceId: invoiceId, // Link to corresponding invoice
      createdFrom: 'sales' // Track that this order was created from sales
    };

    // Add both invoice and order
    addInvoice(invoice);
    addOrder(order);
    
    // Save complete customer information
    const customerKey = newInvoice.gstin;
    const customerInvoiceTotal = parseFloat(calculateInvoice(newInvoice.items, newInvoice.state, newInvoice.placeOfSupply).grandTotal);
    
    const updatedCustomers = { ...customers };
    if (!updatedCustomers[customerKey]) {
      updatedCustomers[customerKey] = {
        name: newInvoice.customer,
        gstin: newInvoice.gstin,
        phone: newInvoice.phone,
        email: newInvoice.email,
        address: newInvoice.address,
        state: newInvoice.state,
        totalInvoices: 1,
        totalAmount: customerInvoiceTotal,
        lastInvoiceDate: currentDate
      };
    } else {
      updatedCustomers[customerKey] = {
        ...updatedCustomers[customerKey],
        name: newInvoice.customer, // Update name in case it changed
        phone: newInvoice.phone || updatedCustomers[customerKey].phone,
        email: newInvoice.email || updatedCustomers[customerKey].email,
        address: newInvoice.address || updatedCustomers[customerKey].address,
        state: newInvoice.state,
        totalInvoices: updatedCustomers[customerKey].totalInvoices + 1,
        totalAmount: updatedCustomers[customerKey].totalAmount + customerInvoiceTotal,
        lastInvoiceDate: currentDate
      };
    }
    setCustomers(updatedCustomers);
    
    setShowInvoiceForm(false);
    setNewInvoice({
      customer: '',
      gstin: '',
      phone: '',
      email: '',
      address: '',
      state: 'Maharashtra',
      placeOfSupply: 'Maharashtra',
      items: [{ product: '', hsn: '39259099', qty: 1, rate: 0, gst: 18 }]
    });
    alert(`Invoice ${invoiceId} and Order ${orderId} generated successfully!`);
  };

  const handleDownloadPDF = (invoice) => {
    if (!companyInfo) {
      if (userRole === 'owner') {
        alert('Please configure company settings first!');
        setShowSettings(true);
      } else {
        alert('Company settings not configured. Please contact the owner to set up company information.');
      }
      return;
    }

    const calculations = calculateInvoice(invoice.items, companyInfo.state, invoice.placeOfSupply);
    generateInvoicePDF(invoice, companyInfo, calculations);
  };

  const handleCompanyInfoSave = (info) => {
    setCompanyInfo(info);
    setShowSettings(false);
  };

  const handleViewDetails = (invoice) => {
    if (!invoice || !invoice.items) return;
    setViewingInvoice(invoice);
    setShowViewModal(true);
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setShowEditModal(true);
  };

  const handleUpdateStatus = (newStatus, paymentAmount = null) => {
    if (!editingInvoice) return;
    
    let updatedInvoice = { ...editingInvoice };
    
    if (newStatus === 'partial' && paymentAmount !== null) {
      updatedInvoice.paidAmount = parseFloat(paymentAmount);
      updatedInvoice.status = paymentAmount >= editingInvoice.totalAmount ? 'paid' : 'partial';
    } else if (newStatus === 'paid') {
      updatedInvoice.paidAmount = editingInvoice.totalAmount;
      updatedInvoice.status = 'paid';
    } else if (newStatus === 'pending') {
      updatedInvoice.paidAmount = 0;
      updatedInvoice.status = 'pending';
    }
    
    updateInvoice(editingInvoice.id, updatedInvoice);
    
    // Update corresponding order status if linked
    if (editingInvoice.orderId) {
      const linkedOrder = orders.find(order => order.id === editingInvoice.orderId);
      if (linkedOrder) {
        let orderStatus = linkedOrder.status;
        
        // Update order status based on invoice status
        if (updatedInvoice.status === 'paid' && linkedOrder.status === 'pending') {
          orderStatus = 'processing'; // Move to processing when payment is received
        }
        
        updateOrder(editingInvoice.orderId, { status: orderStatus });
      }
    }
    
    // Update customer information if status changed
    const customerKey = editingInvoice.gstin;
    if (customers[customerKey]) {
      // Recalculate customer totals from all their invoices
      const customerInvoices = invoices.filter(inv => inv && inv.gstin === customerKey);
      const totalAmount = customerInvoices.reduce((sum, inv) => {
        return sum + parseFloat(calculateInvoice(inv.items, inv.state || 'Maharashtra', inv.placeOfSupply || inv.state).grandTotal);
      }, 0);
      
      const updatedCustomers = { ...customers };
      updatedCustomers[customerKey] = {
        ...updatedCustomers[customerKey],
        totalAmount: totalAmount
      };
      setCustomers(updatedCustomers);
    }
    
    setEditingInvoice(updatedInvoice);
  };

  const handleDeleteInvoice = () => {
    if (!editingInvoice) return;
    if (window.confirm(`Are you sure you want to delete invoice ${editingInvoice.id}? This action cannot be undone.`)) {
      const customerKey = editingInvoice.gstin;
      const invoiceTotal = parseFloat(calculateInvoice(editingInvoice.items, editingInvoice.state || 'Maharashtra', editingInvoice.placeOfSupply || editingInvoice.state).grandTotal);
      
      // Update customer information
      if (customers[customerKey]) {
        const updatedCustomers = { ...customers };
        updatedCustomers[customerKey] = {
          ...updatedCustomers[customerKey],
          totalInvoices: updatedCustomers[customerKey].totalInvoices - 1,
          totalAmount: updatedCustomers[customerKey].totalAmount - invoiceTotal
        };
        
        // Remove customer if no more invoices
        if (updatedCustomers[customerKey].totalInvoices === 0) {
          delete updatedCustomers[customerKey];
        }
        
        setCustomers(updatedCustomers);
      }
      
      // Delete corresponding order if it exists and was created from sales
      if (editingInvoice.orderId) {
        const linkedOrder = orders.find(order => order.id === editingInvoice.orderId);
        if (linkedOrder && linkedOrder.createdFrom === 'sales') {
          removeOrder(editingInvoice.orderId);
        }
      }
      
      removeInvoice(editingInvoice.id);
      setShowEditModal(false);
      setEditingInvoice(null);
      alert('Invoice and corresponding order deleted successfully!');
    }
  };

  const handleDeleteCustomer = (gstin, customerName) => {
    if (window.confirm(`Are you sure you want to delete customer "${customerName}"? This will remove all their information but keep existing invoice records.`)) {
      const updatedCustomers = { ...customers };
      delete updatedCustomers[gstin];
      setCustomers(updatedCustomers);
      alert(`Customer "${customerName}" deleted successfully!`);
    }
  };

  const generateCustomerPDF = (gstin, customer) => {
    const customerInvoices = invoices.filter(inv => inv.gstin === gstin);
    
    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Customer Report - ${customer.name}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 30px;
            color: #2c3e50;
            background: #ffffff;
            line-height: 1.6;
          }
          .document-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          .header-banner {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 40px;
            position: relative;
            overflow: hidden;
          }
          .header-banner::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -10%;
            width: 300px;
            height: 300px;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
          }
          .header-content {
            position: relative;
            z-index: 1;
          }
          .company-logo {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
          }
          .logo-circle {
            width: 60px;
            height: 60px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: #11998e;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          }
          .company-name {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .report-title {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
          }
          .report-subtitle {
            font-size: 16px;
            opacity: 0.9;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .content-wrapper {
            padding: 40px;
          }
          .info-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            border-left: 5px solid #11998e;
          }
          .info-card h2 {
            color: #2c3e50;
            font-size: 22px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .info-card h2::before {
            content: '👤';
            font-size: 24px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
          .info-item {
            background: white;
            padding: 15px 20px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            transition: transform 0.2s;
          }
          .info-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .info-label {
            font-weight: 600;
            color: #5a6c7d;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-value {
            color: #2c3e50;
            font-weight: 700;
            font-size: 16px;
          }
          .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 40px 0 20px 0;
            padding-bottom: 15px;
            border-bottom: 3px solid #11998e;
          }
          .section-header h2 {
            color: #2c3e50;
            font-size: 24px;
            font-weight: 700;
          }
          .section-icon {
            font-size: 28px;
          }
          .table-container {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            margin-bottom: 30px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          }
          th {
            color: white;
            padding: 16px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          tbody tr {
            border-bottom: 1px solid #e8ecef;
            transition: background 0.2s;
          }
          tbody tr:hover {
            background: #f8f9fa;
          }
          tbody tr:last-child {
            border-bottom: none;
          }
          td {
            padding: 14px 16px;
            font-size: 14px;
            color: #2c3e50;
          }
          .amount {
            text-align: right;
            font-weight: 600;
            font-family: 'Courier New', monospace;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .status-paid {
            background: #d4edda;
            color: #155724;
          }
          .status-pending {
            background: #fff3cd;
            color: #856404;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin: 30px 0;
          }
          .summary-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            border-top: 4px solid #11998e;
            transition: transform 0.2s;
          }
          .summary-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.12);
          }
          .summary-card:nth-child(2) {
            border-top-color: #27ae60;
          }
          .summary-card:nth-child(3) {
            border-top-color: #f39c12;
          }
          .summary-card:nth-child(4) {
            border-top-color: #3498db;
          }
          .summary-icon {
            font-size: 32px;
            margin-bottom: 10px;
          }
          .summary-label {
            font-size: 12px;
            color: #7f8c8d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .summary-value {
            font-size: 28px;
            font-weight: 700;
            color: #2c3e50;
            font-family: 'Courier New', monospace;
          }
          .summary-subtext {
            font-size: 11px;
            color: #95a5a6;
            margin-top: 5px;
          }
          .footer {
            background: #f8f9fa;
            padding: 30px 40px;
            margin-top: 40px;
            border-top: 3px solid #e8ecef;
          }
          .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 20px;
          }
          .footer-left {
            flex: 1;
          }
          .footer-company {
            font-weight: 700;
            color: #2c3e50;
            font-size: 16px;
            margin-bottom: 5px;
          }
          .footer-details {
            font-size: 12px;
            color: #7f8c8d;
            line-height: 1.8;
          }
          .footer-right {
            text-align: right;
          }
          .footer-label {
            font-size: 11px;
            color: #95a5a6;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .footer-value {
            font-size: 13px;
            color: #2c3e50;
            font-weight: 600;
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            color: rgba(0,0,0,0.03);
            font-weight: 900;
            z-index: -1;
            pointer-events: none;
          }
          @media print {
            body {
              padding: 0;
            }
            .document-container {
              box-shadow: none;
            }
            .summary-card:hover,
            .info-item:hover,
            tbody tr:hover {
              transform: none;
              box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            }
          }
        </style>
      </head>
      <body>
        <div class="watermark">CUSTOMER REPORT</div>
        <div class="document-container">
          <div class="header-banner">
            <div class="header-content">
              <div class="company-logo">
                <div class="logo-circle">${companyInfo?.name ? companyInfo.name.charAt(0).toUpperCase() : 'P'}</div>
                <div class="company-name">${companyInfo?.name || 'Windowers Plastiwood'}</div>
              </div>
              <div class="report-title">Customer Report</div>
              <div class="report-subtitle">
                <span>📅 Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                <span style="margin-left: 20px;">⏰ ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          <div class="content-wrapper">
            <div class="info-card">
              <h2>Customer Information</h2>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Customer Name</span>
                  <span class="info-value">${customer.name}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Phone Number</span>
                  <span class="info-value">${customer.phone || 'N/A'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">GSTIN</span>
                  <span class="info-value">${gstin}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">State</span>
                  <span class="info-value">${customer.state}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Invoices</span>
                  <span class="info-value">${customer.totalInvoices} Bills</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Amount</span>
                  <span class="info-value">₹${customer.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Last Invoice</span>
                  <span class="info-value">${new Date(customer.lastInvoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Report ID</span>
                  <span class="info-value">CR-${Date.now().toString().slice(-8)}</span>
                </div>
              </div>
            </div>

            <div class="summary-cards">
              <div class="summary-card">
                <div class="summary-icon">📄</div>
                <div class="summary-label">Total Invoices</div>
                <div class="summary-value">${customerInvoices.length}</div>
                <div class="summary-subtext">Sales invoices</div>
              </div>
              <div class="summary-card">
                <div class="summary-icon">✅</div>
                <div class="summary-label">Paid Amount</div>
                <div class="summary-value">₹${customerInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + parseFloat(calculateInvoice(inv.items, companyInfo?.state || 'Maharashtra', inv.placeOfSupply || inv.state).grandTotal), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <div class="summary-subtext">${customerInvoices.filter(inv => inv.status === 'paid').length} invoices paid</div>
              </div>
              <div class="summary-card">
                <div class="summary-icon">⏳</div>
                <div class="summary-label">Pending Amount</div>
                <div class="summary-value">₹${customerInvoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + parseFloat(calculateInvoice(inv.items, companyInfo?.state || 'Maharashtra', inv.placeOfSupply || inv.state).grandTotal), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <div class="summary-subtext">${customerInvoices.filter(inv => inv.status !== 'paid').length} invoices pending</div>
              </div>
              <div class="summary-card">
                <div class="summary-icon">💰</div>
                <div class="summary-label">Total Revenue</div>
                <div class="summary-value">₹${customer.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <div class="summary-subtext">Lifetime value</div>
              </div>
            </div>

            <div class="section-header">
              <span class="section-icon">📊</span>
              <h2>Invoice History</h2>
            </div>

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Invoice No.</th>
                    <th>Date</th>
                    <th>Place of Supply</th>
                    <th>Items</th>
                    <th>Subtotal (₹)</th>
                    <th>GST (₹)</th>
                    <th>Total (₹)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${customerInvoices.map(invoice => {
                    const calc = calculateInvoice(invoice.items, companyInfo?.state || 'Maharashtra', invoice.placeOfSupply || invoice.state);
                    return `
                      <tr>
                        <td><strong>${invoice.id}</strong></td>
                        <td>${new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td>${invoice.placeOfSupply || invoice.state}</td>
                        <td>${invoice.items.length} items</td>
                        <td class="amount">₹${parseFloat(calc.subtotal).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td class="amount">₹${parseFloat(calc.totalGST).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td class="amount">₹${parseFloat(calc.grandTotal).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td>
                          <span class="status-badge status-${invoice.status}">
                            ${invoice.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="footer">
            <div class="footer-content">
              <div class="footer-left">
                <div class="footer-company">${companyInfo?.name || 'Windowers Plastiwood'}</div>
                <div class="footer-details">
                  ${companyInfo?.address ? companyInfo.address + '<br>' : ''}
                  ${companyInfo?.gstin ? 'GSTIN: ' + companyInfo.gstin + ' | ' : ''}
                  ${companyInfo?.pan ? 'PAN: ' + companyInfo.pan : ''}
                </div>
              </div>
              <div class="footer-right">
                <div class="footer-label">Report Generated</div>
                <div class="footer-value">${new Date().toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const filteredInvoices = (invoices || []).filter(invoice => {
    if (!invoice) return false;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      (invoice.id || '').toLowerCase().includes(searchLower) ||
      (invoice.customer || '').toLowerCase().includes(searchLower) ||
      (invoice.phone || '').toLowerCase().includes(searchLower) ||
      (invoice.gstin || '').toLowerCase().includes(searchLower)
    );
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="sales">
      <div className="sales-header">
        <div>
          <h1>Sales & Invoicing</h1>
          <p className="subtitle">GST compliant invoicing system</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {userRole === 'owner' && (
            <button className="btn-secondary" onClick={() => setShowSettings(true)}>
              ⚙️ Company Settings
            </button>
          )}
          <button className="btn-secondary" onClick={() => setShowCustomerReport(true)}>
            📊 Customer Report
          </button>
          <button className="btn-primary" onClick={() => setShowInvoiceForm(!showInvoiceForm)}>
            {showInvoiceForm ? '← Back to Invoices' : '+ Create New Invoice'}
          </button>
        </div>
      </div>

      {showSettings && (
        <CompanySettings
          onClose={() => setShowSettings(false)}
          onSave={handleCompanyInfoSave}
        />
      )}

      {showViewModal && viewingInvoice && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <div className="edit-modal-header">
              <h2>Invoice Details - {viewingInvoice.id}</h2>
              <button className="btn-close" onClick={() => setShowViewModal(false)}>✕</button>
            </div>

            <div className="edit-modal-body">
              <div className="invoice-summary-section">
                <h3>Customer Information</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Customer Name:</span>
                    <span className="summary-value">{viewingInvoice.customer}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">GSTIN:</span>
                    <span className="summary-value">{viewingInvoice.gstin}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">State:</span>
                    <span className="summary-value">{viewingInvoice.state}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Place of Supply:</span>
                    <span className="summary-value">{viewingInvoice.placeOfSupply || viewingInvoice.state}</span>
                  </div>
                </div>
              </div>

              <div className="invoice-summary-section">
                <h3>Invoice Information</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Invoice Number:</span>
                    <span className="summary-value">{viewingInvoice.id}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Invoice Date:</span>
                    <span className="summary-value">{new Date(viewingInvoice.date).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Payment Status:</span>
                    <span className={`status-badge ${viewingInvoice.status}`}>
                      {viewingInvoice.status === 'paid' ? '✅ Paid' : 
                       viewingInvoice.status === 'partial' ? '🔄 Partial Payment' : '⏳ Pending'}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Total Items:</span>
                    <span className="summary-value">{viewingInvoice.items.length} products</span>
                  </div>
                </div>
              </div>

              <div className="items-detail-section">
                <h3>Invoice Items</h3>
                <table className="items-detail-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Product</th>
                      <th>HSN</th>
                      <th>Qty</th>
                      <th>Rate (₹)</th>
                      <th>GST %</th>
                      <th>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{item.name}</td>
                        <td>{item.hsn}</td>
                        <td>{item.qty}</td>
                        <td>₹{item.rate.toFixed(2)}</td>
                        <td>{item.gst}%</td>
                        <td>₹{(item.qty * item.rate).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="invoice-summary-section" style={{ background: '#e8f5e9', borderLeft: '4px solid #27ae60' }}>
                <h3>Payment Summary</h3>
                {(() => {
                  const calc = calculateInvoice(viewingInvoice.items, companyInfo?.state || 'Maharashtra', viewingInvoice.placeOfSupply || viewingInvoice.state);
                  const totalAmount = viewingInvoice.totalAmount || parseFloat(calc.grandTotal);
                  const paidAmount = viewingInvoice.paidAmount || 0;
                  const pendingAmount = totalAmount - paidAmount;
                  const isInterState = (companyInfo?.state || 'Maharashtra') !== (viewingInvoice.placeOfSupply || viewingInvoice.state);
                  
                  return (
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span className="summary-label">Subtotal:</span>
                        <span className="summary-value">₹{calc.subtotal}</span>
                      </div>
                      {isInterState ? (
                        <div className="summary-item">
                          <span className="summary-label">IGST (18%):</span>
                          <span className="summary-value">₹{calc.igst}</span>
                        </div>
                      ) : (
                        <>
                          <div className="summary-item">
                            <span className="summary-label">CGST (9%):</span>
                            <span className="summary-value">₹{calc.cgst}</span>
                          </div>
                          <div className="summary-item">
                            <span className="summary-label">SGST (9%):</span>
                            <span className="summary-value">₹{calc.sgst}</span>
                          </div>
                        </>
                      )}
                      <div className="summary-item">
                        <span className="summary-label">Total GST:</span>
                        <span className="summary-value">₹{calc.totalGST}</span>
                      </div>
                      <div className="summary-item" style={{ gridColumn: '1 / -1' }}>
                        <span className="summary-label" style={{ fontSize: '1.25rem' }}>Grand Total:</span>
                        <span className="summary-value total-amount" style={{ fontSize: '1.5rem' }}>₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Paid Amount:</span>
                        <span className="summary-value" style={{ color: '#27ae60' }}>₹{paidAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Pending Amount:</span>
                        <span className="summary-value" style={{ color: '#e74c3c' }}>₹{pendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="edit-modal-footer">
              <button className="btn-secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
              <button className="btn-primary" onClick={() => {
                setShowViewModal(false);
                handleDownloadPDF(viewingInvoice);
              }}>
                📄 Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingInvoice && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <div className="edit-modal-header">
              <h2>Edit Invoice - {editingInvoice.id}</h2>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <div className="edit-modal-body">
              <div className="invoice-summary-section">
                <h3>Invoice Summary</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Customer:</span>
                    <span className="summary-value">{editingInvoice.customer}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Date:</span>
                    <span className="summary-value">{new Date(editingInvoice.date).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">GSTIN:</span>
                    <span className="summary-value">{editingInvoice.gstin}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">State:</span>
                    <span className="summary-value">{editingInvoice.state}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Items:</span>
                    <span className="summary-value">{editingInvoice.items.length} products</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Total Amount:</span>
                    <span className="summary-value total-amount">
                      ₹{calculateInvoice(editingInvoice.items, companyInfo?.state || 'Maharashtra', editingInvoice.placeOfSupply || editingInvoice.state).grandTotal}
                    </span>
                  </div>
                </div>
              </div>

              <div className="items-detail-section">
                <h3>Invoice Items</h3>
                <table className="items-detail-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>HSN</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>GST %</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.name}</td>
                        <td>{item.hsn}</td>
                        <td>{item.qty}</td>
                        <td>₹{item.rate}</td>
                        <td>{item.gst}%</td>
                        <td>₹{(item.qty * item.rate).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="payment-status-section">
                <h3>Payment Status</h3>
                <div className="payment-info">
                  <div className="payment-amounts">
                    <div className="amount-item">
                      <span className="amount-label">Total Amount:</span>
                      <span className="amount-value total-amount">
                        ₹{(editingInvoice.totalAmount || parseFloat(calculateInvoice(editingInvoice.items, companyInfo?.state || 'Maharashtra', editingInvoice.placeOfSupply || editingInvoice.state).grandTotal)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="amount-item">
                      <span className="amount-label">Paid Amount:</span>
                      <span className="amount-value paid-amount">
                        ₹{(editingInvoice.paidAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="amount-item">
                      <span className="amount-label">Pending Amount:</span>
                      <span className="amount-value pending-amount">
                        ₹{((editingInvoice.totalAmount || parseFloat(calculateInvoice(editingInvoice.items, companyInfo?.state || 'Maharashtra', editingInvoice.placeOfSupply || editingInvoice.state).grandTotal)) - (editingInvoice.paidAmount || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="status-options">
                  <label className={`status-option ${editingInvoice.status === 'pending' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="status"
                      value="pending"
                      checked={editingInvoice.status === 'pending'}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                    />
                    <span className="status-radio-label">
                      <span className="status-icon">⏳</span>
                      <span>Pending Payment</span>
                    </span>
                  </label>
                  <label className={`status-option ${editingInvoice.status === 'partial' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="status"
                      value="partial"
                      checked={editingInvoice.status === 'partial'}
                      onChange={() => {}} // Handled by partial payment input
                    />
                    <span className="status-radio-label">
                      <span className="status-icon">🔄</span>
                      <span>Partial Payment</span>
                    </span>
                  </label>
                  <label className={`status-option ${editingInvoice.status === 'paid' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="status"
                      value="paid"
                      checked={editingInvoice.status === 'paid'}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                    />
                    <span className="status-radio-label">
                      <span className="status-icon">✅</span>
                      <span>Paid</span>
                    </span>
                  </label>
                </div>
                
                <div className="partial-payment-section">
                  <h4>Add Partial Payment</h4>
                  <div className="partial-payment-input">
                    <input
                      type="number"
                      placeholder="Enter payment amount"
                      value={partialPayment}
                      onChange={(e) => setPartialPayment(e.target.value)}
                      min="0"
                      max={editingInvoice.totalAmount || parseFloat(calculateInvoice(editingInvoice.items, companyInfo?.state || 'Maharashtra', editingInvoice.placeOfSupply || editingInvoice.state).grandTotal)}
                      step="0.01"
                    />
                    <button 
                      className="btn-partial-payment"
                      onClick={() => {
                        if (partialPayment > 0) {
                          const currentPaid = editingInvoice.paidAmount || 0;
                          const newPaidAmount = currentPaid + parseFloat(partialPayment);
                          handleUpdateStatus('partial', newPaidAmount);
                          setPartialPayment(0);
                        }
                      }}
                    >
                      Add Payment
                    </button>
                  </div>
                </div>
              </div>

              <div className="danger-zone">
                <h3>Danger Zone</h3>
                <p>Once you delete an invoice, there is no going back. Please be certain.</p>
                <button className="btn-delete" onClick={handleDeleteInvoice}>
                  🗑️ Delete Invoice
                </button>
              </div>
            </div>

            <div className="edit-modal-footer">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>
                Close
              </button>
              <button className="btn-primary" onClick={() => handleDownloadPDF(editingInvoice)}>
                📄 Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {!showInvoiceForm ? (
        <>
          <div className="sales-stats">
            <div className="stat-card blue">
              <div className="stat-icon">📄</div>
              <div className="stat-content">
                <h3>{(invoices || []).length}</h3>
                <p>Total Invoices</p>
              </div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h3>{(invoices || []).filter(inv => inv && inv.status === 'paid').length}</h3>
                <p>Paid Invoices</p>
              </div>
            </div>
            <div className="stat-card orange">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <h3>₹{(invoices || []).filter(inv => inv && (inv.status === 'pending' || inv.status === 'partial')).reduce((sum, inv) => {
                  const totalAmount = inv.totalAmount || parseFloat(calculateInvoice(inv.items, companyInfo?.state || 'Maharashtra', inv.placeOfSupply || inv.state).grandTotal);
                  const paidAmount = inv.paidAmount || 0;
                  return sum + (totalAmount - paidAmount);
                }, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
                <p>Pending Amount</p>
              </div>
            </div>
            <div className="stat-card purple">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>₹{(invoices || []).reduce((sum, inv) => {
                  if (!inv || !inv.items) return sum;
                  const calc = calculateInvoice(inv.items, companyInfo?.state || 'Maharashtra', inv.placeOfSupply || inv.state);
                  return sum + parseFloat(calc.grandTotal);
                }, 0).toFixed(2)}</h3>
                <p>Total Revenue</p>
              </div>
            </div>
          </div>

          <div className="search-section">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by invoice number, customer name, phone, or GSTIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-section">
              <select
                className="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Invoices</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial Payment</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="invoices-table-container">
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>GSTIN</th>
                  <th>State</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Paid Amount</th>
                  <th>Pending Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map(invoice => {
                    if (!invoice || !invoice.items) return null;
                    const calc = calculateInvoice(invoice.items, companyInfo?.state || 'Maharashtra', invoice.placeOfSupply || invoice.state);
                    const totalAmount = invoice.totalAmount || parseFloat(calc.grandTotal);
                    const paidAmount = invoice.paidAmount || 0;
                    const pendingAmount = totalAmount - paidAmount;
                    
                    return (
                      <tr key={invoice.id}>
                        <td className="invoice-number">{invoice.id}</td>
                        <td>{new Date(invoice.date).toLocaleDateString('en-IN')}</td>
                        <td className="customer-name">{invoice.customer}</td>
                        <td className="phone-cell">{invoice.phone || 'N/A'}</td>
                        <td className="gstin-cell">{invoice.gstin}</td>
                        <td>{invoice.state}</td>
                        <td className="text-center">{invoice.items.length}</td>
                        <td className="amount total">₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td className="amount paid">₹{paidAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td className="amount pending">₹{pendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td>
                          <span className={`status-badge ${invoice.status}`}>
                            {invoice.status === 'paid' ? '✅ Paid' : 
                             invoice.status === 'partial' ? '🔄 Partial' : '⏳ Pending'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button 
                              className="btn-icon" 
                              title="View Details"
                              onClick={() => handleViewDetails(invoice)}
                            >
                              👁️
                            </button>
                            <button 
                              className="btn-icon" 
                              title="Edit Invoice"
                              onClick={() => handleEditInvoice(invoice)}
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn-icon" 
                              title="Download PDF"
                              onClick={() => handleDownloadPDF(invoice)}
                            >
                              📄
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="12" className="no-results">
                      No invoices found matching your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredInvoices.length > 0 && (
            <div className="table-footer">
              <p>Showing {filteredInvoices.length} of {(invoices || []).length} invoices</p>
            </div>
          )}
        </>
      ) : (
        <div className="invoice-form">
          <div className="form-card">
            <h2>Create New Invoice</h2>
            
            <div className="form-section">
              <h3>Customer Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    placeholder="Enter customer name"
                    value={newInvoice.customer}
                    onChange={(e) => handleCustomerNameChange(e.target.value)}
                    list="customer-names"
                  />
                  <datalist id="customer-names">
                    {getCustomerNames().map((name, idx) => (
                      <option key={idx} value={name} />
                    ))}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>GSTIN *</label>
                  <input
                    type="text"
                    placeholder="27AABCU9603R1ZM"
                    value={newInvoice.gstin}
                    onChange={(e) => handleCustomerGSTINChange(e.target.value)}
                    list="customer-gstins"
                  />
                  <datalist id="customer-gstins">
                    {getCustomerGSTINs().map((gstin, idx) => (
                      <option key={idx} value={gstin} />
                    ))}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={newInvoice.phone}
                    onChange={(e) => setNewInvoice({...newInvoice, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={newInvoice.email}
                    onChange={(e) => setNewInvoice({...newInvoice, email: e.target.value})}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Address</label>
                  <textarea
                    placeholder="Enter complete address"
                    value={newInvoice.address}
                    onChange={(e) => setNewInvoice({...newInvoice, address: e.target.value})}
                    rows="2"
                  />
                </div>
                <div className="form-group">
                  <label>Billing State *</label>
                  <select
                    value={newInvoice.state}
                    onChange={(e) => setNewInvoice({...newInvoice, state: e.target.value})}
                  >
                    {indianStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Place of Supply *</label>
                  <select
                    value={newInvoice.placeOfSupply}
                    onChange={(e) => setNewInvoice({...newInvoice, placeOfSupply: e.target.value})}
                  >
                    {indianStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <h3>Invoice Items</h3>
                <button className="btn-add-item" onClick={addInvoiceItem}>+ Add Item</button>
              </div>
              
              {newInvoice.items.map((item, index) => (
                <div key={index} className="item-form">
                  <div className="item-form-grid">
                    <div className="form-group">
                      <label>Product Name</label>
                      <input
                        type="text"
                        placeholder="Product name"
                        value={item.product}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        list="product-names"
                      />
                      <datalist id="product-names">
                        {getProductNames().map((name, idx) => (
                          <option key={idx} value={name} />
                        ))}
                      </datalist>
                    </div>
                    <div className="form-group">
                      <label>HSN Code</label>
                      <input
                        type="text"
                        value={item.hsn}
                        onChange={(e) => updateInvoiceItem(index, 'hsn', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Quantity</label>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateInvoiceItem(index, 'qty', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Rate (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateInvoiceItem(index, 'rate', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label>GST %</label>
                      <select
                        value={item.gst}
                        onChange={(e) => updateInvoiceItem(index, 'gst', parseFloat(e.target.value))}
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Amount</label>
                      <input
                        type="text"
                        value={`₹${(item.qty * item.rate).toFixed(2)}`}
                        disabled
                      />
                    </div>
                  </div>
                  {newInvoice.items.length > 1 && (
                    <button className="btn-remove" onClick={() => removeInvoiceItem(index)}>
                      🗑️ Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="invoice-summary">
              {(() => {
                const calc = calculateInvoice(newInvoice.items, newInvoice.state, newInvoice.placeOfSupply);
                return (
                  <>
                    <div className="summary-row">
                      <span>Subtotal:</span>
                      <span>₹{calc.subtotal}</span>
                    </div>
                    {newInvoice.state === newInvoice.placeOfSupply ? (
                      <>
                        <div className="summary-row">
                          <span>CGST (9%):</span>
                          <span>₹{calc.cgst}</span>
                        </div>
                        <div className="summary-row">
                          <span>SGST (9%):</span>
                          <span>₹{calc.sgst}</span>
                        </div>
                      </>
                    ) : (
                      <div className="summary-row">
                        <span>IGST (18%):</span>
                        <span>₹{calc.igst}</span>
                      </div>
                    )}
                    <div className="summary-row total">
                      <span>Grand Total:</span>
                      <span>₹{calc.grandTotal}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setShowInvoiceForm(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleGenerateInvoice}>
                Generate Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Report Modal */}
      {showCustomerReport && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <div className="edit-modal-header">
              <h2>Customer Report</h2>
              <button className="btn-close" onClick={() => setShowCustomerReport(false)}>✕</button>
            </div>

            <div className="edit-modal-body">
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Phone</th>
                      <th>GSTIN</th>
                      <th>State</th>
                      <th>Total Invoices</th>
                      <th>Total Amount (₹)</th>
                      <th>Last Invoice Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(customers).length > 0 ? (
                      Object.entries(customers).map(([gstin, customer]) => (
                        <tr key={gstin}>
                          <td className="customer-name">{customer.name}</td>
                          <td className="phone-cell">{customer.phone || 'N/A'}</td>
                          <td className="gstin-cell">{gstin}</td>
                          <td>{customer.state}</td>
                          <td className="text-center">{customer.totalInvoices}</td>
                          <td className="amount total">₹{customer.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          <td>{new Date(customer.lastInvoiceDate).toLocaleDateString('en-IN')}</td>
                          <td>
                            <button 
                              className="btn-icon" 
                              title="Generate PDF Report"
                              onClick={() => generateCustomerPDF(gstin, customer)}
                            >
                              📄
                            </button>
                            <button 
                              className="btn-icon delete-btn" 
                              title="Delete Customer"
                              onClick={() => handleDeleteCustomer(gstin, customer.name)}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="no-results">
                          No customer data available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {Object.keys(customers).length > 0 && (
                <div className="report-summary">
                  <h3>Summary</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Total Customers:</span>
                      <span className="summary-value">{Object.keys(customers).length}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Total Sales Amount:</span>
                      <span className="summary-value total-amount">
                        ₹{Object.values(customers).reduce((sum, c) => sum + c.totalAmount, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="edit-modal-footer">
              <button className="btn-secondary" onClick={() => setShowCustomerReport(false)}>
                Close
              </button>
              <button className="btn-primary" onClick={() => window.print()}>
                🖨️ Print Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
