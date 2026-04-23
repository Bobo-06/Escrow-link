import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, CreditCard, MapPin, Phone, User } from 'lucide-react';

const Checkout: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-ink-900 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-display font-bold text-white mb-8">Secure Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-gold-400" />
                Delivery Information
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full px-4 py-3 bg-ink-700 border border-ink-600 rounded-xl text-white placeholder-ink-400 focus:outline-none focus:border-gold-500"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  className="w-full px-4 py-3 bg-ink-700 border border-ink-600 rounded-xl text-white placeholder-ink-400 focus:outline-none focus:border-gold-500"
                />
                <textarea
                  placeholder="Delivery Address"
                  rows={3}
                  className="w-full px-4 py-3 bg-ink-700 border border-ink-600 rounded-xl text-white placeholder-ink-400 focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-gold-400" />
                Payment Method
              </h2>
              <div className="space-y-3">
                {['M-Pesa', 'Airtel Money', 'Tigo Pesa'].map((method) => (
                  <label key={method} className="flex items-center p-4 bg-ink-700 rounded-xl cursor-pointer hover:bg-ink-600 transition-colors">
                    <input type="radio" name="payment" className="w-5 h-5 text-gold-500" />
                    <span className="ml-3 text-white">{method}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="glass rounded-xl p-6 h-fit">
            <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-ink-300">
                <span>Subtotal</span>
                <span>TZS 75,000</span>
              </div>
              <div className="flex justify-between text-ink-300">
                <span>Protection Fee (3%)</span>
                <span>TZS 2,250</span>
              </div>
              <div className="border-t border-ink-700 pt-3 flex justify-between text-white font-semibold">
                <span>Total</span>
                <span className="text-gold-400">TZS 77,250</span>
              </div>
            </div>

            <button className="w-full py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 rounded-xl font-bold hover:from-gold-400 hover:to-gold-500 transition-all">
              Pay Securely
            </button>

            <div className="mt-4 flex items-center justify-center text-emerald-400 text-sm">
              <Shield className="w-4 h-4 mr-2" />
              Protected by Escrow
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
