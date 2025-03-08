import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import {
  HomeIcon,
  BuildingOfficeIcon,
  ArrowRightOnRectangleIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline';

export const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className={`${theme === 'dark' ? 'bg-dark-300' : 'bg-white'} shadow-lg`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Spa Platform
              </Link>
            </div>

            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {user?.role === 'super_admin' && (
                <Link
                  to="/admin/platform"
                  className={`${
                    isActive('/admin/platform')
                      ? `border-primary-500 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`
                      : `border-transparent ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} hover:border-gray-300 hover:text-gray-700`
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  <BuildingOfficeIcon className="h-5 w-5 mr-1" />
                  Platform Overview
                </Link>
              )}

              {user?.role === 'spa_admin' && (
                <>
                  <Link
                    to="/dashboard"
                    className={`${
                      isActive('/dashboard')
                        ? `border-primary-500 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`
                        : `border-transparent ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} hover:border-gray-300 hover:text-gray-700`
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <HomeIcon className="h-5 w-5 mr-1" />
                    Dashboard
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="ml-3 relative">
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-md ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  } focus:outline-none transition-colors`}
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <SunIcon className="h-5 w-5" />
                  ) : (
                    <MoonIcon className="h-5 w-5" />
                  )}
                </button>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user?.businessName || user?.email}
                </span>
                <button
                  onClick={() => logout()}
                  className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
                    theme === 'dark'
                      ? 'text-gray-400 bg-dark-200 hover:text-white'
                      : 'text-gray-500 bg-white hover:text-gray-700'
                  } focus:outline-none transition ease-in-out duration-150`}
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden" id="mobile-menu">
        <div className="pt-2 pb-3 space-y-1">
          {user?.role === 'super_admin' && (
            <Link
              to="/admin/platform"
              className={`${
                isActive('/admin/platform')
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              Platform Overview
            </Link>
          )}

          {user?.role === 'spa_admin' && (
            <>
              <Link
                to="/dashboard"
                className={`${
                  isActive('/dashboard')
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              >
                Dashboard
              </Link>
            </>
          )}
        </div>
        <div className="pt-4 pb-3 border-t border-gray-200">
          <div className="flex items-center px-4">
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-500">{user?.businessName || user?.email}</div>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <button
              onClick={() => logout()}
              className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}; 