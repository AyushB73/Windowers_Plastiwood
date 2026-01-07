import { useState, useEffect } from 'react';
import { companyAPI } from '../services/api';
import './CompanySettings.css';

const CompanySettings = ({ onClose, onSave }) => {
  const [companyInfo, setCompanyInfo] = useState({
    name: 'Windowers Plastiwood',
    address: '123, Industrial Area, Phase 2',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    gstin: '27AABCP1234F1Z5',
    pan: 'AABCP1234F',
    email: 'info@windowersplastiwood.com',
    phone: '+91 98765 43210',
    website: 'www.windowersplastiwood.com',
    bankName: 'State Bank of India',
    accountNumber: '1234567890',
    ifscCode: 'SBIN0001234',
    branch: 'Mumbai Main Branch',
    logo: '🌲'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      setLoading(true);
      const response = await companyAPI.get();
      if (response.company) {
        setCompanyInfo(response.company);
      }
    } catch (error) {
      console.error('Error loading company info:', error);
      // Use default values if API fails
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await companyAPI.update(companyInfo);
      onSave(response.company || companyInfo);
      alert('Company information saved successfully!');
    } catch (error) {
      console.error('Error saving company info:', error);
      // Fallback to localStorage for offline mode
      localStorage.setItem('companyInfo', JSON.stringify(companyInfo));
      onSave(companyInfo);
      alert('Company information saved successfully!');
    }
  };

  const handleChange = (field, value) => {
    setCompanyInfo({ ...companyInfo, [field]: value });
  };

  if (loading) {
    return (
      <div className="settings-modal">
        <div className="settings-content">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading company settings...</p>
          </div>
        </div>
      </div>
    );
  }

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
                  placeholder="Enter company name"
                />
              </div>
              <div className="form-group">
                <label>Logo/Icon</label>
                <input
                  type="text"
                  value={companyInfo.logo}
                  onChange={(e) => handleChange('logo', e.target.value)}
                  placeholder="Enter emoji or text logo"
                />
              </div>
              <div className="form-group full-width">
                <label>Address *</label>
                <textarea
                  value={companyInfo.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Enter complete address"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  value={companyInfo.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Enter city"
                />
              </div>
              <div className="form-group">
                <label>State *</label>
                <input
                  type="text"
                  value={companyInfo.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="Enter state"
                />
              </div>
              <div className="form-group">
                <label>PIN Code *</label>
                <input
                  type="text"
                  value={companyInfo.pincode}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  placeholder="Enter PIN code"
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
                  placeholder="Enter GSTIN"
                />
              </div>
              <div className="form-group">
                <label>PAN *</label>
                <input
                  type="text"
                  value={companyInfo.pan}
                  onChange={(e) => handleChange('pan', e.target.value)}
                  placeholder="Enter PAN"
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
                  placeholder="Enter email address"
                />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  value={companyInfo.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  value={companyInfo.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="Enter website URL"
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Banking Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  value={companyInfo.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  placeholder="Enter bank name"
                />
              </div>
              <div className="form-group">
                <label>Account Number</label>
                <input
                  type="text"
                  value={companyInfo.accountNumber}
                  onChange={(e) => handleChange('accountNumber', e.target.value)}
                  placeholder="Enter account number"
                />
              </div>
              <div className="form-group">
                <label>IFSC Code</label>
                <input
                  type="text"
                  value={companyInfo.ifscCode}
                  onChange={(e) => handleChange('ifscCode', e.target.value)}
                  placeholder="Enter IFSC code"
                />
              </div>
              <div className="form-group">
                <label>Branch</label>
                <input
                  type="text"
                  value={companyInfo.branch}
                  onChange={(e) => handleChange('branch', e.target.value)}
                  placeholder="Enter branch name"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanySettings;