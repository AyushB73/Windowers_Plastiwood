import { useState, useEffect } from 'react';
import { useDataSync, useObjectDataSync } from '../hooks/useDataSync';
import { DATA_KEYS } from '../utils/dataSync';
import './Purchases.css';

const Purchases = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showSupplierReport, setShowSupplierReport] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);

  // Use synchronized data
  const { data: suppliers, updateData: setSuppliers } = useObjectDataSync(DATA_KEYS.SUPPLIERS, {
    '27AABCS9603R1ZX': {
      name: 'Timber Supplies Ltd',
      gstin: '27AABCS9603R1ZX',
      phone: '+91 9876543220',
      email: 'orders@timbersupplies.com',
      address: '789 Industrial Area, Mumbai, Maharashtra - 400002',
      totalPurchases: 1,
      totalAmount: 295000,
      lastPurchaseDate: '2026-01-05'
    },
    '29AABCS9603R1ZY': {
      name: 'Eco Materials Pvt Ltd',
      gstin: '29AABCS9603R1ZY',
      phone: '+91 9876543221',
      email: 'supply@ecomaterials.com',
      address: '456 Green Zone, Bangalore, Karnataka - 560003',
      totalPurchases: 1,
      totalAmount: 180000,
      lastPurchaseDate: '2026-01-04'
    }
  });
  const { data: inventory, updateData: setInventory } = useDataSync(DATA_KEYS.INVENTORY, []);
  const { 
    data: purchases, 
    updateData: setPurchases, 
    addItem: addPurchase, 
    updateItem: updatePurchase, 
    removeItem: removePurchase 
  } = useDataSync(DATA_KEYS.PURCHASES, [
    {
      id: 'PB-2026-001',
      date: '2026-01-05',
      supplier: 'Plastic Materials Pvt Ltd',
      gstin: '27AABCP5678M1Z2',
      phone: '+91 9876543220',
      email: 'contact@plasticmaterials.com',
      address: '789 Industrial Area, Mumbai, Maharashtra - 400001',
      billNumber: 'SUP/2026/001',
      items: [
        { name: 'Raw Plastic Granules', hsn: '39012000', qty: 1000, size: '25kg bags', color: 'Natural', colorCode: '#F5F5DC', rate: 85, gst: 18 }
      ],
      paymentStatus: 'paid',
      paymentMode: 'Bank Transfer',
      dueDate: '2026-01-20'
    },
    {
      id: 'PB-2026-002',
      date: '2026-01-03',
      supplier: 'Wood Fiber Suppliers',
      gstin: '29AABCW1234N1Z3',
      phone: '+91 9876543221',
      email: 'info@woodfiber.com',
      address: '456 Supplier Street, Bangalore, Karnataka - 560001',
      billNumber: 'WFS/2026/045',
      items: [
        { name: 'Wood Fiber Composite', hsn: '44012100', qty: 500, size: '50kg bags', color: 'Brown', colorCode: '#8B4513', rate: 120, gst: 18 },
        { name: 'Binding Agent', hsn: '35069900', qty: 100, size: '10kg drums', color: 'White', colorCode: '#FFFFFF', rate: 250, gst: 18 }
      ],
      paymentStatus: 'pending',
      paymentMode: 'Credit',
      dueDate: '2026-01-18'
    }
  ]);

  const [formData, setFormData] = useState({
    supplier: '',
    gstin: '',
    phone: '',
    email: '',
    address: '',
    billNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentMode: 'Cash',
    paymentStatus: 'pending',
    items: [{ name: '', hsn: '', qty: 1, size: '', color: '', colorCode: '#808080', rate: 0, gst: 18 }],
    receiptFile: null,
    receiptFileName: '',
    receiptFileData: null
  });

  const calculatePurchase = (items) => {
    let subtotal = 0;
    let totalGST = 0;

    items.forEach(item => {
      const itemTotal = item.qty * item.rate;
      subtotal += itemTotal;
      const gstAmount = (itemTotal * item.gst) / 100;
      totalGST += gstAmount;
    });

    return {
      subtotal: subtotal.toFixed(2),
      totalGST: totalGST.toFixed(2),
      grandTotal: (subtotal + totalGST).toFixed(2)
    };
  };

  const filteredPurchases = (purchases || []).filter(purchase => {
    if (!purchase) return false;
    const searchLower = searchTerm.toLowerCase();
    return (
      (purchase.id || '').toLowerCase().includes(searchLower) ||
      (purchase.supplier || '').toLowerCase().includes(searchLower) ||
      (purchase.phone || '').toLowerCase().includes(searchLower) ||
      (purchase.billNumber || '').toLowerCase().includes(searchLower) ||
      (purchase.gstin || '').toLowerCase().includes(searchLower)
    );
  });

  const handleViewDetails = (purchase) => {
    setViewingPurchase(purchase);
    setShowViewModal(true);
  };

  const handleEditPurchase = (purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      supplier: purchase.supplier,
      gstin: purchase.gstin,
      billNumber: purchase.billNumber,
      date: purchase.date,
      dueDate: purchase.dueDate,
      paymentMode: purchase.paymentMode,
      paymentStatus: purchase.paymentStatus,
      items: [...purchase.items],
      receiptFile: null,
      receiptFileName: purchase.receiptFile?.name || '',
      receiptFileData: purchase.receiptFile?.data || null
    });
    setShowEditModal(true);
  };

  const handleUpdatePurchase = () => {
    if (!formData.supplier || !formData.billNumber || !formData.gstin) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.items.some(item => !item.name || item.qty <= 0 || item.rate <= 0)) {
      alert('Please fill in all item details correctly');
      return;
    }

    // Calculate the difference in quantities for inventory update
    const oldItems = editingPurchase.items;
    const newItems = formData.items.map(item => ({
      ...item,
      qty: parseFloat(item.qty),
      rate: parseFloat(item.rate),
      gst: parseInt(item.gst)
    }));

    // Reverse old purchase from inventory
    const updatedInventory = [...inventory];
    oldItems.forEach(oldItem => {
      const invIndex = updatedInventory.findIndex(
        inv => inv.name.toLowerCase() === oldItem.name.toLowerCase() && inv.hsn === oldItem.hsn
      );
      if (invIndex !== -1) {
        updatedInventory[invIndex].stock -= oldItem.qty;
        updatedInventory[invIndex].quantity -= oldItem.qty;
      }
    });

    // Add new purchase to inventory
    newItems.forEach(newItem => {
      const invIndex = updatedInventory.findIndex(
        inv => inv.name.toLowerCase() === newItem.name.toLowerCase() && inv.hsn === newItem.hsn
      );
      if (invIndex !== -1) {
        updatedInventory[invIndex].stock += newItem.qty;
        updatedInventory[invIndex].quantity += newItem.qty;
        updatedInventory[invIndex].price = newItem.rate;
        updatedInventory[invIndex].size = newItem.size || updatedInventory[invIndex].size;
        updatedInventory[invIndex].color = newItem.color || updatedInventory[invIndex].color;
        updatedInventory[invIndex].colorCode = newItem.colorCode || updatedInventory[invIndex].colorCode;
      } else {
        // New item, add to inventory
        updatedInventory.push({
          id: Math.max(...updatedInventory.map(i => i.id || 0), 0) + 1,
          name: newItem.name,
          hsn: newItem.hsn,
          quantity: newItem.qty,
          size: newItem.size || '',
          stock: newItem.qty,
          color: newItem.color || 'Gray',
          colorCode: newItem.colorCode || '#808080',
          price: newItem.rate,
          gst: newItem.gst
        });
      }
    });

    setInventory(updatedInventory);

    const updatedPurchases = purchases.map(p => 
      p.id === editingPurchase.id ? {
        ...editingPurchase,
        ...formData,
        items: newItems,
        receiptFile: formData.receiptFileData ? {
          name: formData.receiptFileName,
          data: formData.receiptFileData,
          type: formData.receiptFile?.type || editingPurchase.receiptFile?.type || 'unknown',
          uploadDate: formData.receiptFile ? new Date().toISOString() : editingPurchase.receiptFile?.uploadDate
        } : editingPurchase.receiptFile
      } : p
    );

    setPurchases(updatedPurchases);
    
    // Update supplier information
    const supplierKey = formData.gstin;
    const oldSupplierKey = editingPurchase.gstin;
    const newPurchaseTotal = parseFloat(calculatePurchase(newItems).grandTotal);
    const oldPurchaseTotal = parseFloat(calculatePurchase(editingPurchase.items).grandTotal);
    
    // If GSTIN changed, update both old and new supplier
    if (oldSupplierKey !== supplierKey) {
      // Decrease old supplier's totals
      if (suppliers[oldSupplierKey]) {
        setSuppliers({
          ...suppliers,
          [oldSupplierKey]: {
            ...suppliers[oldSupplierKey],
            totalPurchases: suppliers[oldSupplierKey].totalPurchases - 1,
            totalAmount: suppliers[oldSupplierKey].totalAmount - oldPurchaseTotal
          },
          [supplierKey]: suppliers[supplierKey] ? {
            ...suppliers[supplierKey],
            name: formData.supplier,
            phone: formData.phone || suppliers[supplierKey].phone,
            email: formData.email || suppliers[supplierKey].email,
            address: formData.address || suppliers[supplierKey].address,
            totalPurchases: suppliers[supplierKey].totalPurchases + 1,
            totalAmount: suppliers[supplierKey].totalAmount + newPurchaseTotal,
            lastPurchaseDate: formData.date
          } : {
            name: formData.supplier,
            gstin: formData.gstin,
            phone: formData.phone || '',
            email: formData.email || '',
            address: formData.address || '',
            totalPurchases: 1,
            totalAmount: newPurchaseTotal,
            lastPurchaseDate: formData.date
          }
        });
      }
    } else {
      // Same supplier, just update the amount difference
      if (suppliers[supplierKey]) {
        setSuppliers({
          ...suppliers,
          [supplierKey]: {
            ...suppliers[supplierKey],
            name: formData.supplier, // Update name in case it changed
            phone: formData.phone || suppliers[supplierKey].phone,
            email: formData.email || suppliers[supplierKey].email,
            address: formData.address || suppliers[supplierKey].address,
            totalAmount: suppliers[supplierKey].totalAmount - oldPurchaseTotal + newPurchaseTotal,
            lastPurchaseDate: formData.date
          }
        });
      }
    }
    
    setShowEditModal(false);
    setEditingPurchase(null);
    resetForm();
    alert('Purchase bill updated successfully and inventory updated!');
  };

  const handleDeletePurchase = (id) => {
    if (window.confirm('Are you sure you want to delete this purchase bill?')) {
      const purchaseToDelete = purchases.find(p => p.id === id);
      if (purchaseToDelete) {
        // Update inventory - remove purchased quantities
        const updatedInventory = [...inventory];
        purchaseToDelete.items.forEach(item => {
          const invIndex = updatedInventory.findIndex(
            inv => inv.name.toLowerCase() === item.name.toLowerCase() && inv.hsn === item.hsn
          );
          if (invIndex !== -1) {
            updatedInventory[invIndex].stock -= item.qty;
            updatedInventory[invIndex].quantity -= item.qty;
            // Remove from inventory if stock becomes 0 or negative
            if (updatedInventory[invIndex].stock <= 0) {
              updatedInventory.splice(invIndex, 1);
            }
          }
        });
        setInventory(updatedInventory);
        
        // Update supplier information
        const supplierKey = purchaseToDelete.gstin;
        const purchaseTotal = parseFloat(calculatePurchase(purchaseToDelete.items).grandTotal);
        
        if (suppliers[supplierKey]) {
          const updatedSuppliers = { ...suppliers };
          updatedSuppliers[supplierKey] = {
            ...updatedSuppliers[supplierKey],
            totalPurchases: updatedSuppliers[supplierKey].totalPurchases - 1,
            totalAmount: updatedSuppliers[supplierKey].totalAmount - purchaseTotal
          };
          
          // Remove supplier if no more purchases
          if (updatedSuppliers[supplierKey].totalPurchases === 0) {
            delete updatedSuppliers[supplierKey];
          }
          
          setSuppliers(updatedSuppliers);
        }
      }
      
      setPurchases(purchases.filter(p => p.id !== id));
      alert('Purchase bill deleted successfully and inventory updated!');
    }
  };

  const handleDeleteSupplier = (gstin, supplierName) => {
    if (window.confirm(`Are you sure you want to delete supplier "${supplierName}"? This will remove all their information but keep existing purchase records.`)) {
      const updatedSuppliers = { ...suppliers };
      delete updatedSuppliers[gstin];
      setSuppliers(updatedSuppliers);
      alert(`Supplier "${supplierName}" deleted successfully!`);
    }
  };

  const handleViewReceipt = (receiptFile) => {
    if (!receiptFile || !receiptFile.data) {
      alert('No receipt file available');
      return;
    }

    // Create a new window to display the receipt
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert('Please allow popups to view the receipt');
      return;
    }

    const isPDF = receiptFile.type === 'application/pdf' || receiptFile.name.toLowerCase().includes('.pdf');
    
    if (isPDF) {
      // For PDF files, embed in an iframe
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${receiptFile.name}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { color: #2c3e50; margin-bottom: 5px; }
            .header p { color: #7f8c8d; margin: 0; }
            iframe { width: 100%; height: calc(100vh - 100px); border: 1px solid #ddd; }
            .download-btn { 
              background: #3498db; color: white; padding: 10px 20px; 
              border: none; border-radius: 5px; cursor: pointer; margin: 10px;
            }
            .download-btn:hover { background: #2980b9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📄 Receipt Document</h1>
            <p>File: ${receiptFile.name} | Uploaded: ${new Date(receiptFile.uploadDate).toLocaleDateString('en-IN')}</p>
            <button class="download-btn" onclick="downloadFile()">⬇️ Download</button>
          </div>
          <iframe src="${receiptFile.data}" type="application/pdf"></iframe>
          <script>
            function downloadFile() {
              const link = document.createElement('a');
              link.href = '${receiptFile.data}';
              link.download = '${receiptFile.name}';
              link.click();
            }
          </script>
        </body>
        </html>
      `);
    } else {
      // For image files, display directly
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${receiptFile.name}</title>
          <style>
            body { 
              margin: 0; padding: 20px; font-family: Arial, sans-serif; 
              background: #f8f9fa; text-align: center;
            }
            .header { margin-bottom: 20px; }
            .header h1 { color: #2c3e50; margin-bottom: 5px; }
            .header p { color: #7f8c8d; margin: 0; }
            .image-container { 
              background: white; padding: 20px; border-radius: 8px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1); display: inline-block;
            }
            img { 
              max-width: 90vw; max-height: 80vh; 
              border: 1px solid #ddd; border-radius: 4px;
            }
            .download-btn { 
              background: #3498db; color: white; padding: 10px 20px; 
              border: none; border-radius: 5px; cursor: pointer; margin: 10px;
            }
            .download-btn:hover { background: #2980b9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🖼️ Receipt Image</h1>
            <p>File: ${receiptFile.name} | Uploaded: ${new Date(receiptFile.uploadDate).toLocaleDateString('en-IN')}</p>
            <button class="download-btn" onclick="downloadFile()">⬇️ Download</button>
          </div>
          <div class="image-container">
            <img src="${receiptFile.data}" alt="Receipt" />
          </div>
          <script>
            function downloadFile() {
              const link = document.createElement('a');
              link.href = '${receiptFile.data}';
              link.download = '${receiptFile.name}';
              link.click();
            }
          </script>
        </body>
        </html>
      `);
    }
    
    newWindow.document.close();
  };

  const generateSupplierPDF = (gstin, supplier) => {
    const supplierPurchases = purchases.filter(p => p.gstin === gstin);
    const companyData = JSON.parse(localStorage.getItem('companyInfo') || '{}');
    
    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Supplier Report - ${supplier.name}</title>
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            color: #667eea;
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
            border-left: 5px solid #667eea;
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
            content: '📋';
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
            border-bottom: 3px solid #667eea;
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          .status-overdue {
            background: #f8d7da;
            color: #721c24;
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
            border-top: 4px solid #667eea;
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
            border-top-color: #e74c3c;
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
        <div class="watermark">SUPPLIER REPORT</div>
        <div class="document-container">
          <div class="header-banner">
            <div class="header-content">
              <div class="company-logo">
                <div class="logo-circle">${companyData.name ? companyData.name.charAt(0).toUpperCase() : 'P'}</div>
                <div class="company-name">${companyData.name || 'Windowers Plastiwood'}</div>
              </div>
              <div class="report-title">Supplier Report</div>
              <div class="report-subtitle">
                <span>📅 Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                <span style="margin-left: 20px;">⏰ ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          <div class="content-wrapper">
            <div class="info-card">
              <h2>Supplier Information</h2>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Supplier Name</span>
                  <span class="info-value">${supplier.name}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Phone Number</span>
                  <span class="info-value">${supplier.phone || 'N/A'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">GSTIN</span>
                  <span class="info-value">${gstin}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Purchases</span>
                  <span class="info-value">${supplier.totalPurchases} Bills</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Amount</span>
                  <span class="info-value">₹${supplier.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Last Purchase</span>
                  <span class="info-value">${new Date(supplier.lastPurchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Report ID</span>
                  <span class="info-value">SR-${Date.now().toString().slice(-8)}</span>
                </div>
              </div>
            </div>

            <div class="summary-cards">
              <div class="summary-card">
                <div class="summary-icon">📦</div>
                <div class="summary-label">Total Purchases</div>
                <div class="summary-value">${supplierPurchases.length}</div>
                <div class="summary-subtext">Purchase bills</div>
              </div>
              <div class="summary-card">
                <div class="summary-icon">✅</div>
                <div class="summary-label">Paid Amount</div>
                <div class="summary-value">₹${supplierPurchases.filter(p => p.paymentStatus === 'paid').reduce((sum, p) => sum + parseFloat(calculatePurchase(p.items).grandTotal), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <div class="summary-subtext">${supplierPurchases.filter(p => p.paymentStatus === 'paid').length} bills paid</div>
              </div>
              <div class="summary-card">
                <div class="summary-icon">⏳</div>
                <div class="summary-label">Pending Amount</div>
                <div class="summary-value">₹${supplierPurchases.filter(p => p.paymentStatus === 'pending').reduce((sum, p) => sum + parseFloat(calculatePurchase(p.items).grandTotal), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <div class="summary-subtext">${supplierPurchases.filter(p => p.paymentStatus === 'pending').length} bills pending</div>
              </div>
              <div class="summary-card">
                <div class="summary-icon">⚠️</div>
                <div class="summary-label">Overdue Amount</div>
                <div class="summary-value">₹${supplierPurchases.filter(p => p.paymentStatus === 'overdue').reduce((sum, p) => sum + parseFloat(calculatePurchase(p.items).grandTotal), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <div class="summary-subtext">${supplierPurchases.filter(p => p.paymentStatus === 'overdue').length} bills overdue</div>
              </div>
            </div>

            <div class="section-header">
              <span class="section-icon">📊</span>
              <h2>Purchase History</h2>
            </div>

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Purchase ID</th>
                    <th>Date</th>
                    <th>Bill Number</th>
                    <th>Items</th>
                    <th>Amount (₹)</th>
                    <th>Payment Mode</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${supplierPurchases.map(purchase => {
                    const calc = calculatePurchase(purchase.items);
                    return `
                      <tr>
                        <td><strong>${purchase.id}</strong></td>
                        <td>${new Date(purchase.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td>${purchase.billNumber}</td>
                        <td>${purchase.items.length} items</td>
                        <td class="amount">₹${parseFloat(calc.grandTotal).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td>${purchase.paymentMode}</td>
                        <td>${new Date(purchase.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td>
                          <span class="status-badge status-${purchase.paymentStatus}">
                            ${purchase.paymentStatus === 'paid' ? '✓ Paid' : 
                              purchase.paymentStatus === 'pending' ? '⏳ Pending' : '⚠ Overdue'}
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
                <div class="footer-company">${companyData.name || 'Windowers Plastiwood'}</div>
                <div class="footer-details">
                  ${companyData.address ? companyData.address + '<br>' : ''}
                  ${companyData.gstin ? 'GSTIN: ' + companyData.gstin + ' | ' : ''}
                  ${companyData.pan ? 'PAN: ' + companyData.pan : ''}
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

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', hsn: '', qty: 1, size: '', color: '', colorCode: '#808080', rate: 0, gst: 18 }]
    });
  };

  const handleRemoveItem = (index) => {
    const items = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items });
  };

  const handleItemChange = (index, field, value) => {
    const items = [...formData.items];
    items[index][field] = value;
    setFormData({ ...formData, items });
  };

  const handleFormChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }
      
      // Check file type (allow images and PDFs)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload only images (JPEG, PNG, GIF) or PDF files');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({
          ...formData,
          receiptFile: file,
          receiptFileName: file.name,
          receiptFileData: event.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReceiptFile = () => {
    setFormData({
      ...formData,
      receiptFile: null,
      receiptFileName: '',
      receiptFileData: null
    });
  };

  const generatePurchaseNumber = () => {
    const year = new Date().getFullYear();
    const count = (purchases || []).length + 1;
    return `PB-${year}-${String(count).padStart(3, '0')}`;
  };

  const updateInventoryFromPurchase = (items) => {
    const updatedInventory = [...inventory];
    
    items.forEach(item => {
      // Find if item already exists in inventory (match by name and HSN)
      const existingItemIndex = updatedInventory.findIndex(
        inv => inv.name.toLowerCase() === item.name.toLowerCase() && inv.hsn === item.hsn
      );
      
      if (existingItemIndex !== -1) {
        // Item exists, update stock and quantity
        updatedInventory[existingItemIndex] = {
          ...updatedInventory[existingItemIndex],
          stock: updatedInventory[existingItemIndex].stock + item.qty,
          quantity: updatedInventory[existingItemIndex].quantity + item.qty,
          price: item.rate, // Update base price with latest purchase price
          size: item.size || updatedInventory[existingItemIndex].size,
          color: item.color || updatedInventory[existingItemIndex].color,
          colorCode: item.colorCode || updatedInventory[existingItemIndex].colorCode
        };
      } else {
        // Item doesn't exist, add to inventory
        updatedInventory.push({
          id: Math.max(...updatedInventory.map(i => i.id || 0), 0) + 1,
          name: item.name,
          hsn: item.hsn,
          quantity: item.qty,
          size: item.size || '',
          stock: item.qty,
          color: item.color || 'Gray',
          colorCode: item.colorCode || '#808080',
          price: item.rate,
          gst: item.gst
        });
      }
    });
    
    setInventory(updatedInventory);
  };

  const handleSubmit = () => {
    if (!formData.supplier || !formData.billNumber || !formData.gstin) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.items.some(item => !item.name || item.qty <= 0 || item.rate <= 0)) {
      alert('Please fill in all item details correctly');
      return;
    }

    const newPurchase = {
      id: generatePurchaseNumber(),
      ...formData,
      items: formData.items.map(item => ({
        ...item,
        qty: parseFloat(item.qty),
        rate: parseFloat(item.rate),
        gst: parseInt(item.gst)
      })),
      receiptFile: formData.receiptFileData ? {
        name: formData.receiptFileName,
        data: formData.receiptFileData,
        type: formData.receiptFile?.type || 'unknown',
        uploadDate: new Date().toISOString()
      } : null
    };

    setPurchases([newPurchase, ...(purchases || [])]);
    
    // Update inventory with purchased items
    updateInventoryFromPurchase(newPurchase.items);
    
    // Save supplier information
    const supplierKey = formData.gstin;
    if (!suppliers[supplierKey]) {
      setSuppliers({
        ...suppliers,
        [supplierKey]: {
          name: formData.supplier,
          gstin: formData.gstin,
          phone: formData.phone || '',
          email: formData.email || '',
          address: formData.address || '',
          totalPurchases: 1,
          totalAmount: parseFloat(calculatePurchase(formData.items).grandTotal),
          lastPurchaseDate: formData.date
        }
      });
    } else {
      setSuppliers({
        ...suppliers,
        [supplierKey]: {
          ...suppliers[supplierKey],
          name: formData.supplier, // Update name in case it changed
          phone: formData.phone || suppliers[supplierKey].phone,
          email: formData.email || suppliers[supplierKey].email,
          address: formData.address || suppliers[supplierKey].address,
          totalPurchases: suppliers[supplierKey].totalPurchases + 1,
          totalAmount: suppliers[supplierKey].totalAmount + parseFloat(calculatePurchase(formData.items).grandTotal),
          lastPurchaseDate: formData.date
        }
      });
    }
    
    setShowAddModal(false);
    resetForm();
    alert('Purchase bill added successfully and inventory updated!');
  };

  const resetForm = () => {
    setFormData({
      supplier: '',
      gstin: '',
      billNumber: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      paymentMode: 'Cash',
      paymentStatus: 'pending',
      items: [{ name: '', hsn: '', qty: 1, size: '', color: '', colorCode: '#808080', rate: 0, gst: 18 }],
      receiptFile: null,
      receiptFileName: '',
      receiptFileData: null
    });
  };

  const totalPurchases = (purchases || []).reduce((sum, p) => {
    if (!p || !p.items) return sum;
    const calc = calculatePurchase(p.items);
    return sum + parseFloat(calc.grandTotal);
  }, 0);

  const paidAmount = (purchases || []).filter(p => p && p.paymentStatus === 'paid').reduce((sum, p) => {
    const calc = calculatePurchase(p.items);
    return sum + parseFloat(calc.grandTotal);
  }, 0);

  const pendingAmount = (purchases || []).filter(p => p && p.paymentStatus === 'pending').reduce((sum, p) => {
    const calc = calculatePurchase(p.items);
    return sum + parseFloat(calc.grandTotal);
  }, 0);

  const overdueAmount = (purchases || []).filter(p => p && p.paymentStatus === 'overdue').reduce((sum, p) => {
    const calc = calculatePurchase(p.items);
    return sum + parseFloat(calc.grandTotal);
  }, 0);

  return (
    <div className="purchases">
      <div className="purchases-header">
        <div>
          <h1>Purchases Management</h1>
          <p className="subtitle">Track supplier bills and payments</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary" onClick={() => setShowSupplierReport(true)}>
            📊 Supplier Report
          </button>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Purchase Bill
          </button>
        </div>
      </div>

      <div className="purchases-stats">
        <div className="stat-card blue">
          <div className="stat-icon">📄</div>
          <div className="stat-content">
            <h3>₹{totalPurchases.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
            <p>Total Purchases</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>₹{paidAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
            <p>Paid Amount</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>₹{pendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
            <p>Pending Payment</p>
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>₹{overdueAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
            <p>Overdue Amount</p>
          </div>
        </div>
      </div>

      <div className="search-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by purchase ID, supplier, phone, bill number, or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="purchases-table-container">
        <table className="purchases-table">
          <thead>
            <tr>
              <th>Purchase ID</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Phone</th>
              <th>Bill Number</th>
              <th>GSTIN</th>
              <th>Items</th>
              <th>Amount (₹)</th>
              <th>Payment Mode</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPurchases.length > 0 ? (
              filteredPurchases.map(purchase => {
                if (!purchase || !purchase.items) return null;
                const calc = calculatePurchase(purchase.items);
                return (
                  <tr key={purchase.id}>
                    <td className="bill-number">{purchase.id}</td>
                    <td>{new Date(purchase.date).toLocaleDateString('en-IN')}</td>
                    <td className="supplier-name">{purchase.supplier}</td>
                    <td className="phone-cell">{purchase.phone || 'N/A'}</td>
                    <td>{purchase.billNumber}</td>
                    <td className="gstin-cell">{purchase.gstin}</td>
                    <td className="text-center">{purchase.items.length}</td>
                    <td className="amount total">₹{calc.grandTotal}</td>
                    <td>{purchase.paymentMode}</td>
                    <td>{new Date(purchase.dueDate).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className={`status-badge ${purchase.paymentStatus}`}>
                        {purchase.paymentStatus === 'paid' ? '✅ Paid' : 
                         purchase.paymentStatus === 'pending' ? '⏳ Pending' : '⚠️ Overdue'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button 
                          className="btn-icon" 
                          title="View Details"
                          onClick={() => handleViewDetails(purchase)}
                        >
                          👁️
                        </button>
                        {purchase.receiptFile && (
                          <button 
                            className="btn-icon" 
                            title="View Receipt"
                            onClick={() => handleViewReceipt(purchase.receiptFile)}
                          >
                            📄
                          </button>
                        )}
                        <button 
                          className="btn-icon" 
                          title="Edit Purchase"
                          onClick={() => handleEditPurchase(purchase)}
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-icon" 
                          title="Delete Purchase"
                          onClick={() => handleDeletePurchase(purchase.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="12" className="no-results">
                  No purchases found matching your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredPurchases.length > 0 && (
        <div className="table-footer">
          <p>Showing {filteredPurchases.length} of {(purchases || []).length} purchases</p>
        </div>
      )}

      {showViewModal && viewingPurchase && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <div className="edit-modal-header">
              <h2>Purchase Details - {viewingPurchase.id}</h2>
              <button className="btn-close" onClick={() => setShowViewModal(false)}>✕</button>
            </div>

            <div className="edit-modal-body">
              <div className="invoice-summary-section">
                <h3>Supplier Information</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Supplier Name:</span>
                    <span className="summary-value">{viewingPurchase.supplier}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">GSTIN:</span>
                    <span className="summary-value">{viewingPurchase.gstin}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Bill Number:</span>
                    <span className="summary-value">{viewingPurchase.billNumber}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Purchase Date:</span>
                    <span className="summary-value">{new Date(viewingPurchase.date).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="invoice-summary-section">
                <h3>Payment Information</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Payment Mode:</span>
                    <span className="summary-value">{viewingPurchase.paymentMode}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Due Date:</span>
                    <span className="summary-value">{new Date(viewingPurchase.dueDate).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Payment Status:</span>
                    <span className={`status-badge ${viewingPurchase.paymentStatus}`}>
                      {viewingPurchase.paymentStatus === 'paid' ? '✅ Paid' : 
                       viewingPurchase.paymentStatus === 'pending' ? '⏳ Pending' : '⚠️ Overdue'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="items-detail-section">
                <h3>Purchase Items</h3>
                <table className="items-detail-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Item Name</th>
                      <th>HSN</th>
                      <th>Qty</th>
                      <th>Size</th>
                      <th>Rate (₹)</th>
                      <th>GST %</th>
                      <th>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingPurchase.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{item.name}</td>
                        <td>{item.hsn}</td>
                        <td>{item.qty}</td>
                        <td>{item.size || '-'}</td>
                        <td>₹{item.rate.toFixed(2)}</td>
                        <td>{item.gst}%</td>
                        <td>₹{(item.qty * item.rate * (1 + item.gst / 100)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="invoice-summary-section" style={{ background: '#ffebee', borderLeft: '4px solid #e74c3c' }}>
                <h3>Bill Summary</h3>
                {(() => {
                  const calc = calculatePurchase(viewingPurchase.items);
                  return (
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span className="summary-label">Subtotal:</span>
                        <span className="summary-value">₹{calc.subtotal}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Total GST:</span>
                        <span className="summary-value">₹{calc.totalGST}</span>
                      </div>
                      <div className="summary-item" style={{ gridColumn: '1 / -1' }}>
                        <span className="summary-label" style={{ fontSize: '1.25rem' }}>Grand Total:</span>
                        <span className="summary-value total-amount" style={{ fontSize: '1.5rem', color: '#e74c3c' }}>₹{calc.grandTotal}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {viewingPurchase.receiptFile && (
                <div className="invoice-summary-section" style={{ background: '#e8f5e8', borderLeft: '4px solid #27ae60' }}>
                  <h3>📄 Supplier Receipt/Bill</h3>
                  <div className="receipt-section">
                    <div className="receipt-info">
                      <div className="summary-item">
                        <span className="summary-label">File Name:</span>
                        <span className="summary-value">{viewingPurchase.receiptFile.name}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Upload Date:</span>
                        <span className="summary-value">
                          {new Date(viewingPurchase.receiptFile.uploadDate).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">File Type:</span>
                        <span className="summary-value">
                          {viewingPurchase.receiptFile.type === 'application/pdf' ? 'PDF Document' : 'Image File'}
                        </span>
                      </div>
                    </div>
                    <div className="receipt-actions">
                      <button 
                        className="btn-primary" 
                        onClick={() => handleViewReceipt(viewingPurchase.receiptFile)}
                      >
                        👁️ View Receipt
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="edit-modal-footer">
              <button className="btn-secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <div className="edit-modal-header">
              <h2>Add Purchase Bill</h2>
              <button className="btn-close" onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}>✕</button>
            </div>

            <div className="edit-modal-body">
              <div className="form-section">
                <h3>Supplier Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Supplier Name *</label>
                    <input
                      type="text"
                      placeholder="Enter supplier name"
                      value={formData.supplier}
                      onChange={(e) => handleFormChange('supplier', e.target.value)}
                      list="supplier-names"
                    />
                    <datalist id="supplier-names">
                      {Object.values(suppliers).map((supp, idx) => (
                        <option key={idx} value={supp.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label>Supplier GSTIN *</label>
                    <input
                      type="text"
                      placeholder="27AABCP1234F1Z5"
                      value={formData.gstin}
                      onChange={(e) => {
                        const gstin = e.target.value;
                        handleFormChange('gstin', gstin);
                        // Autofill if supplier exists
                        if (suppliers[gstin]) {
                          setFormData({
                            ...formData,
                            gstin,
                            supplier: suppliers[gstin].name
                          });
                        }
                      }}
                      list="supplier-gstins"
                    />
                    <datalist id="supplier-gstins">
                      {Object.keys(suppliers).map((gstin, idx) => (
                        <option key={idx} value={gstin} />
                      ))}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label>Bill Number *</label>
                    <input
                      type="text"
                      placeholder="Enter bill number"
                      value={formData.billNumber}
                      onChange={(e) => handleFormChange('billNumber', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Purchase Date *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleFormChange('date', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Payment Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Payment Mode *</label>
                    <select
                      value={formData.paymentMode}
                      onChange={(e) => handleFormChange('paymentMode', e.target.value)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Credit">Credit</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Due Date *</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => handleFormChange('dueDate', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Status *</label>
                    <select
                      value={formData.paymentStatus}
                      onChange={(e) => handleFormChange('paymentStatus', e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Receipt/Bill Upload</h3>
                <div className="file-upload-section">
                  <div className="form-group">
                    <label>Upload Supplier Receipt/Bill (Optional)</label>
                    <div className="file-upload-container">
                      <input
                        type="file"
                        id="receipt-upload"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="receipt-upload" className="file-upload-btn">
                        📎 Choose File
                      </label>
                      <span className="file-upload-info">
                        Supported: Images (JPEG, PNG, GIF) and PDF files (Max 5MB)
                      </span>
                    </div>
                    
                    {formData.receiptFileName && (
                      <div className="uploaded-file">
                        <div className="file-info">
                          <span className="file-icon">
                            {formData.receiptFileName.toLowerCase().includes('.pdf') ? '📄' : '🖼️'}
                          </span>
                          <span className="file-name">{formData.receiptFileName}</span>
                          <button 
                            type="button" 
                            className="remove-file-btn" 
                            onClick={removeReceiptFile}
                            title="Remove file"
                          >
                            ✕
                          </button>
                        </div>
                        {formData.receiptFileData && !formData.receiptFileName.toLowerCase().includes('.pdf') && (
                          <div className="file-preview">
                            <img 
                              src={formData.receiptFileData} 
                              alt="Receipt preview" 
                              className="receipt-preview"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <h3>Purchase Items</h3>
                  <button className="btn-add-item" onClick={handleAddItem}>+ Add Item</button>
                </div>
                
                {formData.items.map((item, index) => (
                  <div key={index} className="item-form">
                    <div className="item-form-grid">
                      <div className="form-group">
                        <label>Item Name</label>
                        <input
                          type="text"
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => {
                            const itemName = e.target.value;
                            handleItemChange(index, 'name', itemName);
                            // Autofill if item exists in inventory
                            const inventoryItem = inventory.find(inv => 
                              inv.name.toLowerCase() === itemName.toLowerCase()
                            );
                            if (inventoryItem) {
                              handleItemChange(index, 'hsn', inventoryItem.hsn);
                              handleItemChange(index, 'size', inventoryItem.size);
                              handleItemChange(index, 'color', inventoryItem.color);
                              handleItemChange(index, 'colorCode', inventoryItem.colorCode);
                              handleItemChange(index, 'rate', inventoryItem.price);
                              handleItemChange(index, 'gst', inventoryItem.gst);
                            }
                          }}
                          list="inventory-items-add"
                        />
                        <datalist id="inventory-items-add">
                          {inventory.map((inv, idx) => (
                            <option key={idx} value={inv.name} />
                          ))}
                        </datalist>
                      </div>
                      <div className="form-group">
                        <label>HSN Code</label>
                        <input
                          type="text"
                          value={item.hsn}
                          onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Quantity</label>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Size (with units)</label>
                        <input
                          type="text"
                          placeholder="e.g., 2x6x12ft, 25kg bags"
                          value={item.size || ''}
                          onChange={(e) => handleItemChange(index, 'size', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Color</label>
                        <input
                          type="text"
                          placeholder="e.g., Natural, Brown, Gray"
                          value={item.color || ''}
                          onChange={(e) => handleItemChange(index, 'color', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Color Code</label>
                        <input
                          type="color"
                          value={item.colorCode || '#808080'}
                          onChange={(e) => handleItemChange(index, 'colorCode', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Rate (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="form-group">
                        <label>GST %</label>
                        <select
                          value={item.gst}
                          onChange={(e) => handleItemChange(index, 'gst', parseFloat(e.target.value))}
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
                          value={`₹${(item.qty * item.rate * (1 + item.gst / 100)).toFixed(2)}`}
                          disabled
                        />
                      </div>
                    </div>
                    {formData.items.length > 1 && (
                      <button className="btn-remove" onClick={() => handleRemoveItem(index)}>
                        🗑️ Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="invoice-summary">
                {(() => {
                  const calc = calculatePurchase(formData.items);
                  return (
                    <>
                      <div className="summary-row">
                        <span>Subtotal:</span>
                        <span>₹{calc.subtotal}</span>
                      </div>
                      <div className="summary-row">
                        <span>Total GST:</span>
                        <span>₹{calc.totalGST}</span>
                      </div>
                      <div className="summary-row total">
                        <span>Grand Total:</span>
                        <span>₹{calc.grandTotal}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="edit-modal-footer">
              <button className="btn-secondary" onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSubmit}>
                Add Purchase Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingPurchase && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <div className="edit-modal-header">
              <h2>Edit Purchase Bill - {editingPurchase.id}</h2>
              <button className="btn-close" onClick={() => {
                setShowEditModal(false);
                setEditingPurchase(null);
                resetForm();
              }}>✕</button>
            </div>

            <div className="edit-modal-body">
              <div className="form-section">
                <h3>Supplier Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Supplier Name *</label>
                    <input
                      type="text"
                      placeholder="Enter supplier name"
                      value={formData.supplier}
                      onChange={(e) => handleFormChange('supplier', e.target.value)}
                      list="supplier-names-edit"
                    />
                    <datalist id="supplier-names-edit">
                      {Object.values(suppliers).map((supp, idx) => (
                        <option key={idx} value={supp.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label>Supplier GSTIN *</label>
                    <input
                      type="text"
                      placeholder="27AABCP1234F1Z5"
                      value={formData.gstin}
                      onChange={(e) => {
                        const gstin = e.target.value;
                        handleFormChange('gstin', gstin);
                        // Autofill if supplier exists
                        if (suppliers[gstin]) {
                          setFormData({
                            ...formData,
                            gstin,
                            supplier: suppliers[gstin].name
                          });
                        }
                      }}
                      list="supplier-gstins-edit"
                    />
                    <datalist id="supplier-gstins-edit">
                      {Object.keys(suppliers).map((gstin, idx) => (
                        <option key={idx} value={gstin} />
                      ))}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label>Bill Number *</label>
                    <input
                      type="text"
                      placeholder="Enter bill number"
                      value={formData.billNumber}
                      onChange={(e) => handleFormChange('billNumber', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Purchase Date *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleFormChange('date', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Payment Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Payment Mode *</label>
                    <select
                      value={formData.paymentMode}
                      onChange={(e) => handleFormChange('paymentMode', e.target.value)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Credit">Credit</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Due Date *</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => handleFormChange('dueDate', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Status *</label>
                    <select
                      value={formData.paymentStatus}
                      onChange={(e) => handleFormChange('paymentStatus', e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <h3>Purchase Items</h3>
                  <button className="btn-add-item" onClick={handleAddItem}>+ Add Item</button>
                </div>
                
                {formData.items.map((item, index) => (
                  <div key={index} className="item-form">
                    <div className="item-form-grid">
                      <div className="form-group">
                        <label>Item Name</label>
                        <input
                          type="text"
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => {
                            const itemName = e.target.value;
                            handleItemChange(index, 'name', itemName);
                            // Autofill if item exists in inventory
                            const inventoryItem = inventory.find(inv => 
                              inv.name.toLowerCase() === itemName.toLowerCase()
                            );
                            if (inventoryItem) {
                              handleItemChange(index, 'hsn', inventoryItem.hsn);
                              handleItemChange(index, 'size', inventoryItem.size);
                              handleItemChange(index, 'color', inventoryItem.color);
                              handleItemChange(index, 'colorCode', inventoryItem.colorCode);
                              handleItemChange(index, 'rate', inventoryItem.price);
                              handleItemChange(index, 'gst', inventoryItem.gst);
                            }
                          }}
                          list="inventory-items-edit"
                        />
                        <datalist id="inventory-items-edit">
                          {inventory.map((inv, idx) => (
                            <option key={idx} value={inv.name} />
                          ))}
                        </datalist>
                      </div>
                      <div className="form-group">
                        <label>HSN Code</label>
                        <input
                          type="text"
                          value={item.hsn}
                          onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Quantity</label>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Size (with units)</label>
                        <input
                          type="text"
                          placeholder="e.g., 2x6x12ft, 25kg bags"
                          value={item.size || ''}
                          onChange={(e) => handleItemChange(index, 'size', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Color</label>
                        <input
                          type="text"
                          placeholder="e.g., Natural, Brown, Gray"
                          value={item.color || ''}
                          onChange={(e) => handleItemChange(index, 'color', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Color Code</label>
                        <input
                          type="color"
                          value={item.colorCode || '#808080'}
                          onChange={(e) => handleItemChange(index, 'colorCode', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Rate (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="form-group">
                        <label>GST %</label>
                        <select
                          value={item.gst}
                          onChange={(e) => handleItemChange(index, 'gst', parseFloat(e.target.value))}
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
                          value={`₹${(item.qty * item.rate * (1 + item.gst / 100)).toFixed(2)}`}
                          disabled
                        />
                      </div>
                    </div>
                    {formData.items.length > 1 && (
                      <button className="btn-remove" onClick={() => handleRemoveItem(index)}>
                        🗑️ Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="invoice-summary">
                {(() => {
                  const calc = calculatePurchase(formData.items);
                  return (
                    <>
                      <div className="summary-row">
                        <span>Subtotal:</span>
                        <span>₹{calc.subtotal}</span>
                      </div>
                      <div className="summary-row">
                        <span>Total GST:</span>
                        <span>₹{calc.totalGST}</span>
                      </div>
                      <div className="summary-row total">
                        <span>Grand Total:</span>
                        <span>₹{calc.grandTotal}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="edit-modal-footer">
              <button className="btn-secondary" onClick={() => {
                setShowEditModal(false);
                setEditingPurchase(null);
                resetForm();
              }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleUpdatePurchase}>
                Update Purchase Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Report Modal */}
      {showSupplierReport && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <div className="edit-modal-header">
              <h2>Supplier Report</h2>
              <button className="btn-close" onClick={() => setShowSupplierReport(false)}>✕</button>
            </div>

            <div className="edit-modal-body">
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Supplier Name</th>
                      <th>Phone</th>
                      <th>GSTIN</th>
                      <th>Total Purchases</th>
                      <th>Total Amount (₹)</th>
                      <th>Last Purchase Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(suppliers).length > 0 ? (
                      Object.entries(suppliers).map(([gstin, supplier]) => (
                        <tr key={gstin}>
                          <td className="supplier-name">{supplier.name}</td>
                          <td className="phone-cell">{supplier.phone || 'N/A'}</td>
                          <td className="gstin-cell">{gstin}</td>
                          <td className="text-center">{supplier.totalPurchases}</td>
                          <td className="amount total">₹{supplier.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          <td>{new Date(supplier.lastPurchaseDate).toLocaleDateString('en-IN')}</td>
                          <td>
                            <button 
                              className="btn-icon" 
                              title="Generate PDF Report"
                              onClick={() => generateSupplierPDF(gstin, supplier)}
                            >
                              📄
                            </button>
                            <button 
                              className="btn-icon delete-btn" 
                              title="Delete Supplier"
                              onClick={() => handleDeleteSupplier(gstin, supplier.name)}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="no-results">
                          No supplier data available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {Object.keys(suppliers).length > 0 && (
                <div className="report-summary">
                  <h3>Summary</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Total Suppliers:</span>
                      <span className="summary-value">{Object.keys(suppliers).length}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Total Purchase Amount:</span>
                      <span className="summary-value total-amount">
                        ₹{Object.values(suppliers).reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="edit-modal-footer">
              <button className="btn-secondary" onClick={() => setShowSupplierReport(false)}>
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

export default Purchases;
