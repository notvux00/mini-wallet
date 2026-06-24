import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import TransactionDesign from './pages/TransactionDesign';
import ServiceManagement from './pages/ServiceManagement';
import PocketManagement from './pages/PocketManagement';
import BillerManagement from './pages/BillerManagement';
import CustomerManagement from './pages/CustomerManagement';
import TransactionTrail from './pages/TransactionTrail';
import TransactionHistory from './pages/TransactionHistory';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/services" replace />} />
          <Route path="services" element={<ServiceManagement />} />
          <Route path="transaction-design" element={<TransactionDesign />} />
          <Route path="pockets" element={<PocketManagement />} />
          <Route path="billers" element={<BillerManagement />} />
          <Route path="customers" element={<CustomerManagement />} />
          <Route path="trail" element={<TransactionTrail />} />
          <Route path="history" element={<TransactionHistory />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
