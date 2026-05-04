'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, Home, Package, Menu, X, LogOut } from 'lucide-react';
import { useUser, UserButton, SignInButton, useClerk } from '@clerk/nextjs'; // ← added useClerk

const ProductNavbar = () => {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk(); // ← added: direct access to signOut
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleSellClick = () => {
    if (isSignedIn) {
      router.push('/products/add-product');
      return;
    }

    router.push('/sign-in?redirect_url=/products/add-product');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-blue-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo Section */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-blue-500 p-2 rounded-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-800 hidden sm:block">
                Smart<span className="text-blue-500">E-commerce</span>
              </span>
            </Link>
          </div>

          {/* Navigation Icons & Sell Button */}
          <div className="flex items-center space-x-3">

            {/* Home Link */}
            <Link
              href="/"
              className="hidden sm:flex p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            >
              <Home className="h-5 w-5" />
            </Link>

            {/* Sell Button */}
            <button
              onClick={handleSellClick}
              className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md active:scale-95"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              <span>Sell</span>
            </button>

            {/* Auth Section */}
            {isLoaded && (
              <>
                {isSignedIn ? (
                  <div className="flex items-center space-x-2">
                    {/* Avatar + account management dropdown */}
                    <UserButton /> {/* ← removed broken afterSignOutUrl prop */}
                    {/* Custom sign out button with guaranteed redirect */}
                    <button
                      onClick={() => signOut(() => router.push('/'))} // ← redirect callback
                      className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <SignInButton mode="redirect">
                    <button className="flex items-center px-4 py-2 border border-blue-500 text-blue-500 hover:bg-blue-50 text-sm font-medium rounded-lg transition-all duration-200">
                      Sign In
                    </button>
                  </SignInButton>
                )}
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-2 border-t border-blue-100 bg-white">
            <div className="flex flex-col space-y-1">
              <Link
                href="/products"
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="h-5 w-5 mr-3 text-blue-500" />
                <span>Home</span>
              </Link>

              {/* Mobile sign out */}
              {isLoaded && isSignedIn && (
                <button
                  onClick={() => signOut(() => router.push('/'))} // ← same callback on mobile
                  className="flex items-center px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-500 transition-colors rounded-lg"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  <span>Sign Out</span>
                </button>
              )}

              {isLoaded && !isSignedIn && (
                <Link
                  href="/sign-in?redirect_url=/products/add-product"
                  className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="ml-8">Sign In</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default ProductNavbar;
