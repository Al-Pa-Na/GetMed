import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './PatientDashboard.css';

const PatientDashboard = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [verifiedPrescriptions, setVerifiedPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [medicinePrices, setMedicinePrices] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    fetchPrescriptions();
    fetchVerifiedPrescriptions();
    fetchOrders();
    fetchVendors();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const response = await axios.get('/api/prescriptions/patient');
      setPrescriptions(response.data);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    }
  };

  const fetchVerifiedPrescriptions = async () => {
    try {
      const response = await axios.get('/api/prescriptions/patient/verified');
      setVerifiedPrescriptions(response.data);
    } catch (error) {
      console.error('Error fetching verified prescriptions:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/orders/patient');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axios.get('/api/vendors');
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      await axios.post('/api/prescriptions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchPrescriptions();
      alert('Prescription uploaded successfully!');
    } catch (error) {
      alert('Error uploading prescription: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleViewMedicines = async (prescription) => {
    try {
      const response = await axios.post('/api/vendors/compare-prices', {
        medicines: prescription.verified_data
      });
      setMedicinePrices(response.data);
      setSelectedPrescription(prescription);
    } catch (error) {
      alert('Error loading medicines: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleAddToCart = (medicine, vendor, price, quantity = 1) => {
    const cartItem = {
      id: `${medicine}-${vendor.id}-${Date.now()}`,
      medicineName: medicine,
      vendorId: vendor.id,
      vendorName: vendor.name,
      price: price,
      quantity: quantity,
      dosage: medicinePrices.find(m => m.medicine === medicine)?.dosage || '',
      frequency: medicinePrices.find(m => m.medicine === medicine)?.frequency || ''
    };

    setCart([...cart, cartItem]);
    alert(`${medicine} added to cart from ${vendor.name}`);
  };

  const handleRemoveFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveFromCart(itemId);
      return;
    }
    setCart(cart.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    if (!selectedPrescription) {
      alert('Please select a prescription first!');
      return;
    }

    try {
      await axios.post('/api/orders', {
        prescriptionId: selectedPrescription.id,
        cartItems: cart.map(item => ({
          medicineName: item.medicineName,
          vendorId: item.vendorId,
          quantity: item.quantity,
          price: item.price
        }))
      });

      alert('Order placed successfully!');
      setCart([]);
      setSelectedPrescription(null);
      setMedicinePrices([]);
      fetchOrders();
    } catch (error) {
      alert('Error placing order: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDownloadReceipt = async (orderId) => {
    try {
      const response = await axios.get(`/api/orders/${orderId}/receipt/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-order-${orderId}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error downloading receipt: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleViewReceipt = async (orderId) => {
    try {
      const response = await axios.get(`/api/orders/${orderId}/receipt`, {
        responseType: 'text'
      });
      const newWindow = window.open('', '_blank');
      newWindow.document.write(response.data);
      newWindow.document.close();
    } catch (error) {
      alert('Error viewing receipt: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="container">
      <h1>Patient Dashboard</h1>

      <div className="card">
        <h2>Upload Prescription</h2>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={loading}
        />
        {loading && <p>Processing prescription...</p>}
      </div>

      <div className="card">
        <h2>My Prescriptions</h2>
        <div className="prescription-list">
          {prescriptions.map(prescription => (
            <div key={prescription.id} className="prescription-item">
              <div className="prescription-header">
                <span>Status: <strong>{prescription.status}</strong></span>
                <span>Confidence: {(prescription.confidence * 100).toFixed(1)}%</span>
                <span>Date: {new Date(prescription.created_at).toLocaleDateString()}</span>
              </div>
              {prescription.status === 'verified' && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleViewMedicines(prescription)}
                >
                  View Medicines
                </button>
              )}
              <img
                src={`http://localhost:5000/uploads/${prescription.image_path}`}
                alt="Prescription"
                className="prescription-image"
              />
            </div>
          ))}
        </div>
      </div>

      {selectedPrescription && Array.isArray(medicinePrices) && medicinePrices.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Available Medicines</h2>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedPrescription(null);
                setMedicinePrices([]);
              }}
            >
              Close
            </button>
          </div>
          <div className="medicines-list">
            {medicinePrices.map((item, index) => (
              <div key={index} className="medicine-item">
                <div className="medicine-info">
                  <h3>{item.medicine}</h3>
                  <p>Dosage: {item.dosage} | Frequency: {item.frequency}</p>
                </div>
                <div className="vendors-list">
                  {item.vendors.map((vendor, vIndex) => (
                    <div key={vIndex} className="vendor-option">
                      <div className="vendor-info">
                        <span className="vendor-name">{vendor.vendor.name}</span>
                        <span className="vendor-rating">⭐ {vendor.vendor.rating}</span>
                        <span className="vendor-price">₹{vendor.price.toFixed(2)}</span>
                        <span className="vendor-stock">Stock: {vendor.stock}</span>
                      </div>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleAddToCart(item.medicine, vendor.vendor, vendor.price)}
                        disabled={vendor.stock === 0}
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cart.length > 0 && (
        <div className="card cart-card">
          <div className="card-header">
            <h2>Shopping Cart ({cart.length} items)</h2>
          </div>
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <h4>{item.medicineName}</h4>
                  <p>{item.vendorName} | Dosage: {item.dosage} | Frequency: {item.frequency}</p>
                  <p className="cart-item-price">₹{item.price.toFixed(2)} per unit</p>
                </div>
                <div className="cart-item-controls">
                  <div className="quantity-controls">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                    >
                      -
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="cart-item-total">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveFromCart(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="cart-footer">
            <div className="cart-total">
              <h3>Total: ₹{calculateTotal().toFixed(2)}</h3>
            </div>
            <button
              className="btn btn-success btn-large"
              onClick={handlePlaceOrder}
            >
              Place Order
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2>My Orders</h2>
        {orders.length === 0 ? (
          <p>No orders yet</p>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.id} className="order-item">
                <div className="order-header">
                  <span>Order #{order.id}</span>
                  <span>Vendor: {order.vendor_name}</span>
                  <span>Total: ₹{order.total_price.toFixed(2)}</span>
                  <span>Status: {order.status}</span>
                  <span>Date: {new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <ul>
                  {order.items.map((item, index) => (
                    <li key={index}>
                      {item.medicine_name} - Qty: {item.quantity} - ₹{item.price.toFixed(2)}
                    </li>
                  ))}
                </ul>
                <div className="order-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleViewReceipt(order.id)}
                  >
                    View Receipt
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDownloadReceipt(order.id)}
                  >
                    Download Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
