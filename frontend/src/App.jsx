import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import OfficerLayout from './components/OfficerLayout';
import OfficerLogin from './pages/officer/OfficerLogin';
import OfficerDashboard from './pages/officer/OfficerDashboard';
import ServiceManagement from './pages/officer/ServiceManagement';
import ServiceBuilder from './pages/officer/ServiceBuilder';
import PocketManagement from './pages/officer/PocketManagement';
import BillerManagement from './pages/officer/BillerManagement';
import CustomerManagement from './pages/officer/CustomerManagement';
import BankManagement from './pages/officer/BankManagement';
import TransactionTrail from './pages/officer/TransactionTrail';
import TransactionHistory from './pages/officer/TransactionHistory';
import PocketEntryHistory from './pages/officer/PocketEntryHistory';
import Reconciliation from './pages/officer/Reconciliation';
import CustomerLayout from './components/CustomerLayout';
import CustomerLogin from './pages/customer/CustomerLogin';
import CustomerRegister from './pages/customer/CustomerRegister';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import TransferP2P from './pages/customer/TransferP2P';
import BillPayment from './pages/customer/BillPayment';
import CustomerHistory from './pages/customer/CustomerHistory';
import QRPayment from './pages/customer/QRPayment';
import ComingSoon from './pages/customer/ComingSoon';
import MobileTopup from './pages/customer/MobileTopup';
import LinkedBanks from './pages/customer/LinkedBanks';
import './App.css';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/app/login" replace />} />
            
            {/* Officer Routes */}
            <Route path="/officer" element={<OfficerLayout />}>
              <Route index element={<Navigate to="/officer/dashboard" replace />} />
              <Route path="login" element={<OfficerLogin />} />
              <Route path="dashboard" element={<OfficerDashboard />} />
              <Route path="services" element={<ServiceManagement />} />
              <Route path="service-builder" element={<ServiceBuilder />} />
              <Route path="service-builder/:id" element={<ServiceBuilder />} />
              <Route path="pockets" element={<PocketManagement />} />
              <Route path="billers" element={<BillerManagement />} />
              <Route path="customers" element={<CustomerManagement />} />
              <Route path="banks" element={<BankManagement />} />
              <Route path="history" element={<TransactionHistory />} />
              <Route path="trail" element={<TransactionTrail />} />
              <Route path="pocket-entries" element={<PocketEntryHistory />} />
              <Route path="reconciliation" element={<Reconciliation />} />
            </Route>

            {/* Customer App */}
            <Route path="/app" element={<CustomerLayout />}>
              <Route index element={<Navigate to="/app/login" replace />} />
              <Route path="login" element={<CustomerLogin />} />
              <Route path="register" element={<CustomerRegister />} />
              <Route path="home" element={<CustomerDashboard />} />
              <Route path="transfer" element={<TransferP2P />} />
              <Route path="banks" element={<LinkedBanks />} />
              <Route path="bill-payment" element={<BillPayment />} />
              <Route path="topup" element={<MobileTopup />} />
              <Route path="history" element={<CustomerHistory />} />
              <Route path="qr" element={<QRPayment />} />
              <Route path="coming-soon" element={<ComingSoon />} />
            </Route>
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
