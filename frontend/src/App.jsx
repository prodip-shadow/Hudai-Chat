import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import { Login } from './pages/user-login/Login';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ProtectedRoute, PublicRoute } from './Protected.jsx';
import HomePage from './components/HomePage.jsx';
import UserDetails from './components/UserDetails.jsx';
import Status from './pages/StatusSection/Status.jsx';
import Setting from './pages/SettingSection/Setting.jsx';
import { Layout } from './components/Layout.jsx';
import useUserStore from './store/useUserStore.js';
import { disconnectSocket, initializeSocket } from './services/chat.service.js';
import { useChatStore } from './store/chatStore.js';

const App = () => {

  const { user } = useUserStore();
  const { setCurrentUser, initsocketListners, cleanUP } = useChatStore();
  
  useEffect(() => {
    if (user?._id) {
      const socket = initializeSocket();


      if (socket) { 
        setCurrentUser(user); 
        initsocketListners(socket);
      }

    }
    
    return () => { 
      cleanUP();
      disconnectSocket();
    }



  },[cleanUP, initsocketListners, setCurrentUser, user]);


  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Router>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/user-login" element={<Login />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/user-profile" element={<UserDetails />} />
              <Route path="/status" element={<Status />} />
              <Route path="/setting" element={<Setting />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </>
  );
};

export default App;
