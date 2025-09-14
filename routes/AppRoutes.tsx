import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.tsx';
import LandingPage from '../pages/LandingPage.tsx';
import Login from '../components/auth/Login.tsx';
import Dashboard from '../pages/Dashboard.tsx';

const AppRoutes = () => {
    const { currentClient } = useAppContext();
    return (
        <Routes>
            <Route path="/" element={currentClient ? <Navigate to="/dashboard" /> : <LandingPage />} />
            <Route path="/login" element={currentClient ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="/dashboard" element={currentClient ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

export default AppRoutes;