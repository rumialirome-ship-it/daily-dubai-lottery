import React from 'react';
// FIX: The named imports for Routes, Route, and Navigate were failing. Using a namespace import as a workaround for a potential build tool or module resolution issue.
import * as ReactRouterDom from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.tsx';
import LandingPage from '../pages/LandingPage.tsx';
import Login from '../components/auth/Login.tsx';
import Dashboard from '../pages/Dashboard.tsx';

const AppRoutes = () => {
    const { currentClient } = useAppContext();
    return (
        <ReactRouterDom.Routes>
            <ReactRouterDom.Route path="/" element={currentClient ? <ReactRouterDom.Navigate to="/dashboard" /> : <LandingPage />} />
            <ReactRouterDom.Route path="/login" element={currentClient ? <ReactRouterDom.Navigate to="/dashboard" /> : <Login />} />
            <ReactRouterDom.Route path="/dashboard" element={currentClient ? <Dashboard /> : <ReactRouterDom.Navigate to="/login" />} />
            <ReactRouterDom.Route path="*" element={<ReactRouterDom.Navigate to="/" />} />
        </ReactRouterDom.Routes>
    );
};

export default AppRoutes;
