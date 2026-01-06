import { useState } from 'react';
import './Products.css';

const Products = () => {
  const [products] = useState([
    {
      id: 1,
      name: 'Plastiwood Deck Board 2x6',
      category: 'Decking',
      description: 'Premium composite decking board made from recycled plastics and wood fibers',
      price: 3499,
      image: '🏗️',
      specifications: '2" x 6" x 12ft',
      color: 'Natural Wood',
      hsn: '39259099',
      gst: 18
    },
    {
      id: 2,
      name: 'Composite Fence Panel 6ft',
      category: 'Fencing',
      description: 'Durable weather-resistant fence panel for outdoor applications',
      price: 6899,
      image: '🚧',
      specifications: '6ft x 8ft',
      color: 'Gray',
      hsn: '39259099',
      gst: 18
    },
    {
      id: 3,
      name: 'Outdoor Furniture Set',
      category: 'Furniture',
      description: 'Complete patio furniture set including table and 4 chairs',
      price: 45999,
      image: '🪑',
      specifications: 'Table: 60" x 36"',
      color: 'Brown',
      hsn: '94036090',
      gst: 18
    },
    {
      id: 4,
      name: 'Garden Edging 10ft',
      category: 'Landscaping',
      description: 'Flexible garden border edging for landscaping projects',
      price: 1899,
      image: '🌿',
      specifications: '10ft length, 4" height',
      color: 'Black',
      hsn: '39259099',
      gst: 18
    },
    {
      id: 5,
      name: 'Plastiwood Railing System',
      category: 'Decking',
      description: 'Complete railing system with posts, rails, and balusters',
      price: 12299,
      image: '🛡️',
      specifications: '6ft section',
      color: 'White',
      hsn: '39259099',
      gst: 18
    },
    {
      id: 6,
      name: 'Composite Planter Box',
      category: 'Furniture',
      description: 'Large decorative planter box for outdoor plants',
      price: 6099,
      image: '🪴',
      specifications: '24" x 24" x 18"',
      color: 'Terracotta',
      hsn: '39269099',
      gst: 18
    }
  ]);

  return (
    <div className="products">
      <div className="products-header">
        <div>
          <h1>Product Catalog</h1>
          <p className="subtitle">Browse our complete range of plastiwood products</p>
        </div>
        <button className="btn-primary">+ Add New Product</button>
      </div>

      <div className="products-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <div className="product-image">
              <span className="product-icon">{product.image}</span>
            </div>
            <div className="product-content">
              <span className="product-category">{product.category}</span>
              <h3 className="product-title">{product.name}</h3>
              <p className="product-description">{product.description}</p>
              
              <div className="product-specs">
                <div className="spec-item">
                  <span className="spec-label">Size:</span>
                  <span className="spec-value">{product.specifications}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Color:</span>
                  <span className="spec-value">{product.color}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">HSN Code:</span>
                  <span className="spec-value">{product.hsn}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">GST:</span>
                  <span className="spec-value">{product.gst}%</span>
                </div>
              </div>

              <div className="product-footer">
                <span className="product-price">₹{product.price.toLocaleString('en-IN')}</span>
                <div className="product-actions">
                  <button className="btn-secondary">Edit</button>
                  <button className="btn-secondary">View Details</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Products;
