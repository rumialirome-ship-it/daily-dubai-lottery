import React from 'react';
// FIX: The named imports for Link and NavLink were failing. Using a namespace import as a workaround for a potential build tool or module resolution issue.
import * as ReactRouterDom from 'react-router-dom';
import { Client, Role } from '../../types/index.ts';

const Logo = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="#f0b90b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 12L22 7" stroke="#f0b90b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 12V22" stroke="#f0b90b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 12L2 7" stroke="#f0b90b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16.5 4.5L7.5 9.5" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
)


const Header: React.FC<{ onLogout: () => void; client: Client | null; }> = ({ onLogout, client }) => (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-brand-surface/80 backdrop-blur-lg p-4 flex justify-between items-center shadow-md border-b border-brand-secondary h-16">
        <ReactRouterDom.Link to={client ? "/dashboard" : "/"} className="flex items-center gap-3 text-xl font-bold text-brand-primary">
            <Logo />
            <span className="hidden sm:inline">Daily Dubai Lottery</span>
        </ReactRouterDom.Link>
        <div className="flex items-center space-x-4">
            {client ? (
                <>
                    <div className="hidden md:flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm font-medium text-green-400">Live</span>
                    </div>
                    <span className="text-brand-text-secondary hidden sm:inline">Welcome, <span className="font-semibold text-brand-text">{client.username}</span></span>
                    <button onClick={onLogout} className="bg-danger/80 hover:bg-danger text-white font-bold py-2 px-4 rounded-lg transition-colors">Logout</button>
                </>
            ) : (
                <ReactRouterDom.NavLink to="/login" className="bg-brand-primary hover:shadow-glow text-brand-bg font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-all duration-300">
                    Login / Register
                </ReactRouterDom.NavLink>
            )}
        </div>
    </header>
);

export default Header;
