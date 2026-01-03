import React from 'react';
import { useAuth } from '../context/AuthContext';

const VendorDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="container">
      <h1>Vendor Dashboard</h1>
      <div className="card">
        <h2>Welcome, {user?.name}</h2>
        <p>This is the vendor dashboard. In a full implementation, vendors would:</p>
        <ul>
          <li>View and manage orders</li>
          <li>Update inventory and prices</li>
          <li>Track order status</li>
          <li>Manage their profile and ratings</li>
        </ul>
        <p>Currently, vendor prices are managed through mock APIs for demonstration purposes.</p>
      </div>
    </div>
  );
};

export default VendorDashboard;

