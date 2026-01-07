import { useState, useEffect } from 'react';
import './CompanySettings.css';

const CompanySettings = ({ onClose, onSave }) => {
  const [companyInfo, setCompanyInfo] = useState(() => {
    const saved = localStorage.getItem('companyInfo');
    return saved ? JSON.parse(saved) : {
      name: 'Windowers Plastiwood Pvt Ltd',
      address: '123, Industrial Area, Phase 2',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      gstin: '27AABCP1234F1Z5',
      pan: 'AABCP1234F',
      email: 'info@plastiwood.com',
      phone: '+91 98765 43210',
      website: 'www.plastiwood.com',
      bankName: 'State Bank of India',
      accountNumber: '1234567890',
      ifscCode: 'SBIN0001234',
      branch: 'Mumbai Main Branch',
      logo: '🌲'
    };
  });

  const handleSave = () => {
    localStorage.setItem('companyInfo', JSON.stringify(companyInfo));
    onSave(companyInfo);
    alert('Company information saved successfully!');
  };

  const handleChange = (field, value) => {
    setCompanyInfo({ ...companyInfo, [field]: value });
  };

  return (
    <div className="settings-modal">
      <div className="settings-content">
        <div className="settings-header">
          <h2>Company Settings</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <h3>Company Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  value={companyInfo.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Logo Emoji</label>
                <input
                  type="text"
                  value={companyInfo.logo}
                  onChange={(e) => handleChange('logo', e.target.value)}
                  placeholder="🌲"
                />
              </div>
              <div className="form-group full-width">
                <label>Address *</label>
                <input
                  type="text"
                  value={companyInfo.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  value={companyInfo.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>State *</label>
                <input
                  type="text"
                  value={companyInfo.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Pincode *</label>
                <input
                  type="text"
                  value={companyInfo.pincode}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Tax Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>GSTIN *</label>
                <input
                  type="text"
                  value={companyInfo.gstin}
                  onChange={(e) => handleChange('gstin', e.target.value)}
                  placeholder="27AABCP1234F1Z5"
                />
              </div>
              <div className="form-group">
                <label>PAN *</label>
                <input
                  type="text"
                  value={companyInfo.pan}
                  onChange={(e) => handleChange('pan', e.target.value)}
                  placeholder="AABCP1234F"
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Contact Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={companyInfo.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="text"
                  value={companyInfo.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Website</label>
                <input
                  type="text"
                  value={companyInfo.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Banking Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Bank Name *</label>
                <input
                  type="text"
                  value={companyInfo.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Account Number *</label>
                <input
                  type="text"
                  value={companyInfo.accountNumber}
                  onChange={(e) => handleChange('accountNumber', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>IFSC Code *</label>
                <input
                  type="text"
                  value={companyInfo.ifscCode}
                  onChange={(e) => handleChange('ifscCode', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Branch</label>
                <input
                  type="text"
                  value={companyInfo.branch}
                  onChange={(e) => handleChange('branch', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
};

export default CompanySettings;
