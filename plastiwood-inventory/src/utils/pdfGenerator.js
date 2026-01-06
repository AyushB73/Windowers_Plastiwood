export const generateInvoicePDF = (invoice, companyInfo, calculations) => {
  const { subtotal, cgst, sgst, igst, totalGST, grandTotal } = calculations;
  const isInterState = invoice.state !== companyInfo.state;

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.id}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      color: #333;
    }
    
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #333;
      padding: 20px;
    }
    
    .invoice-header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    
    .company-logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 5px;
    }
    
    .company-details {
      font-size: 12px;
      line-height: 1.6;
      color: #666;
    }
    
    .invoice-title {
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      background: #2c3e50;
      color: white;
      padding: 10px;
      margin: 20px 0;
    }
    
    .invoice-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    
    .meta-section {
      flex: 1;
    }
    
    .meta-section h3 {
      font-size: 14px;
      margin-bottom: 10px;
      color: #2c3e50;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    
    .meta-section p {
      font-size: 12px;
      line-height: 1.6;
      margin-bottom: 3px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .items-table th {
      background: #2c3e50;
      color: white;
      padding: 10px;
      text-align: left;
      font-size: 12px;
      border: 1px solid #333;
    }
    
    .items-table td {
      padding: 8px;
      border: 1px solid #ddd;
      font-size: 12px;
    }
    
    .items-table tr:nth-child(even) {
      background: #f9f9f9;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .totals-section {
      margin-top: 20px;
      float: right;
      width: 350px;
    }
    
    .totals-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .totals-table td {
      padding: 8px;
      border: 1px solid #ddd;
      font-size: 12px;
    }
    
    .totals-table .label {
      font-weight: bold;
      background: #f5f5f5;
    }
    
    .totals-table .grand-total {
      background: #2c3e50;
      color: white;
      font-weight: bold;
      font-size: 14px;
    }
    
    .bank-details {
      clear: both;
      margin-top: 40px;
      padding: 15px;
      background: #f9f9f9;
      border: 1px solid #ddd;
    }
    
    .bank-details h3 {
      font-size: 14px;
      margin-bottom: 10px;
      color: #2c3e50;
    }
    
    .bank-details p {
      font-size: 12px;
      line-height: 1.6;
      margin-bottom: 3px;
    }
    
    .terms {
      margin-top: 20px;
      font-size: 11px;
      color: #666;
      line-height: 1.6;
    }
    
    .signature-section {
      margin-top: 40px;
      text-align: right;
    }
    
    .signature-line {
      margin-top: 60px;
      border-top: 1px solid #333;
      display: inline-block;
      padding-top: 5px;
      min-width: 200px;
      text-align: center;
      font-size: 12px;
    }
    
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 11px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 15px;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="invoice-header">
      <div class="company-logo">${companyInfo.logo}</div>
      <div class="company-name">${companyInfo.name}</div>
      <div class="company-details">
        ${companyInfo.address}, ${companyInfo.city}, ${companyInfo.state} - ${companyInfo.pincode}<br>
        GSTIN: ${companyInfo.gstin} | PAN: ${companyInfo.pan}<br>
        Email: ${companyInfo.email} | Phone: ${companyInfo.phone}
        ${companyInfo.website ? `<br>Website: ${companyInfo.website}` : ''}
      </div>
    </div>
    
    <!-- Invoice Title -->
    <div class="invoice-title">TAX INVOICE</div>
    
    <!-- Invoice Meta -->
    <div class="invoice-meta">
      <div class="meta-section">
        <h3>Bill To:</h3>
        <p><strong>${invoice.customer}</strong></p>
        <p>GSTIN: ${invoice.gstin}</p>
        <p>State: ${invoice.state}</p>
        <p>Place of Supply: ${invoice.placeOfSupply}</p>
      </div>
      
      <div class="meta-section">
        <h3>Invoice Details:</h3>
        <p><strong>Invoice No:</strong> ${invoice.id}</p>
        <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString('en-IN')}</p>
        <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
      </div>
    </div>
    
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="text-center">S.No</th>
          <th>Product Description</th>
          <th class="text-center">HSN/SAC</th>
          <th class="text-center">Qty</th>
          <th class="text-right">Rate (₹)</th>
          <th class="text-center">GST %</th>
          <th class="text-right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map((item, index) => `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td>${item.name || item.product}</td>
            <td class="text-center">${item.hsn}</td>
            <td class="text-center">${item.qty}</td>
            <td class="text-right">${item.rate.toFixed(2)}</td>
            <td class="text-center">${item.gst}%</td>
            <td class="text-right">${(item.qty * item.rate).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <!-- Totals -->
    <div class="totals-section">
      <table class="totals-table">
        <tr>
          <td class="label">Subtotal:</td>
          <td class="text-right">₹${subtotal}</td>
        </tr>
        ${isInterState ? `
          <tr>
            <td class="label">IGST (18%):</td>
            <td class="text-right">₹${igst}</td>
          </tr>
        ` : `
          <tr>
            <td class="label">CGST (9%):</td>
            <td class="text-right">₹${cgst}</td>
          </tr>
          <tr>
            <td class="label">SGST (9%):</td>
            <td class="text-right">₹${sgst}</td>
          </tr>
        `}
        <tr>
          <td class="label">Total GST:</td>
          <td class="text-right">₹${totalGST}</td>
        </tr>
        <tr class="grand-total">
          <td>Grand Total:</td>
          <td class="text-right">₹${grandTotal}</td>
        </tr>
      </table>
    </div>
    
    <!-- Bank Details -->
    <div class="bank-details">
      <h3>Bank Details:</h3>
      <p><strong>Bank Name:</strong> ${companyInfo.bankName}</p>
      <p><strong>Account Number:</strong> ${companyInfo.accountNumber}</p>
      <p><strong>IFSC Code:</strong> ${companyInfo.ifscCode}</p>
      <p><strong>Branch:</strong> ${companyInfo.branch}</p>
    </div>
    
    <!-- Terms -->
    <div class="terms">
      <strong>Terms & Conditions:</strong><br>
      1. Payment is due within 30 days from the invoice date.<br>
      2. Please make payment to the above bank account.<br>
      3. All disputes are subject to ${companyInfo.city} jurisdiction only.<br>
      4. Goods once sold will not be taken back or exchanged.
    </div>
    
    <!-- Signature -->
    <div class="signature-section">
      <div class="signature-line">
        Authorized Signatory<br>
        <strong>${companyInfo.name}</strong>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      This is a computer-generated invoice and does not require a physical signature.<br>
      For any queries, please contact us at ${companyInfo.email} or ${companyInfo.phone}
    </div>
  </div>
  
  <div class="no-print" style="text-align: center; margin-top: 20px;">
    <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin-right: 10px;">Print Invoice</button>
    <button onclick="window.close()" style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">Close</button>
  </div>
</body>
</html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
