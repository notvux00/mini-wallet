import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import OfficerLayout from './components/OfficerLayout';
import OfficerLogin from './pages/officer/OfficerLogin';
import ServiceManagement from './pages/officer/ServiceManagement';
import TransactionDesign from './pages/officer/TransactionDesign';
import PocketManagement from './pages/officer/PocketManagement';
import BillerManagement from './pages/officer/BillerManagement';
import CustomerManagement from './pages/officer/CustomerManagement';
import TransactionTrail from './pages/officer/TransactionTrail';
import TransactionHistory from './pages/officer/TransactionHistory';
import CustomerLayout from './components/CustomerLayout';
import CustomerLogin from './pages/customer/CustomerLogin';
import CustomerRegister from './pages/customer/CustomerRegister';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import TransferP2P from './pages/customer/TransferP2P';
import BillPayment from './pages/customer/BillPayment';
import CustomerHistory from './pages/customer/CustomerHistory';
import ComingSoon from './pages/customer/ComingSoon';
import './App.css';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/app/login" replace />} />
          
          {/* Officer Routes */}
          <Route path="/officer" element={<OfficerLayout />}>
            <Route index element={<Navigate to="/officer/login" replace />} />
            <Route path="login" element={<OfficerLogin />} />
            <Route path="services" element={<ServiceManagement />} />
            <Route path="transaction-design" element={<TransactionDesign />} />
            <Route path="pockets" element={<PocketManagement />} />
            <Route path="billers" element={<BillerManagement />} />
            <Route path="customers" element={<CustomerManagement />} />
            <Route path="history" element={<TransactionHistory />} />
            <Route path="trail" element={<TransactionTrail />} />
          </Route>

          {/* Customer App */}
          <Route path="/app" element={<CustomerLayout />}>
            <Route index element={<Navigate to="/app/login" replace />} />
            <Route path="login" element={<CustomerLogin />} />
            <Route path="register" element={<CustomerRegister />} />
            <Route path="home" element={<CustomerDashboard />} />
            <Route path="transfer" element={<TransferP2P />} />
            <Route path="bill-payment" element={<BillPayment />} />
            <Route path="history" element={<CustomerHistory />} />
            <Route path="coming-soon" element={<ComingSoon />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
