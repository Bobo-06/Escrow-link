import React from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Package, Truck, Home, Shield } from 'lucide-react';

const OrderTracking: React.FC = () => {
  const { orderId } = useParams();

  const steps = [
    { icon: CheckCircle, label: 'Order Confirmed', status: 'complete', time: '10:30 AM' },
    { icon: Package, label: 'Preparing', status: 'complete', time: '11:00 AM' },
    { icon: Truck, label: 'In Transit', status: 'current', time: 'Est. 2:00 PM' },
    { icon: Home, label: 'Delivered', status: 'pending', time: '' },
  ];

  return (
    <div className="min-h-screen bg-ink-900 pt-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-4">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white">Order #{orderId}</h1>
          <p className="text-ink-400">Your payment is protected until delivery</p>
        </div>

        <div className="glass rounded-xl p-6">
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.status === 'complete' ? 'bg-emerald-500' :
                  step.status === 'current' ? 'bg-gold-500' : 'bg-ink-700'
                }`}>
                  <step.icon className={`w-5 h-5 ${
                    step.status === 'pending' ? 'text-ink-400' : 'text-white'
                  }`} />
                </div>
                <div className="ml-4 flex-1">
                  <p className={`font-medium ${
                    step.status === 'pending' ? 'text-ink-400' : 'text-white'
                  }`}>{step.label}</p>
                  <p className="text-ink-500 text-sm">{step.time}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="absolute left-5 mt-10 w-0.5 h-6 bg-ink-700" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-ink-700">
            <button className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold hover:from-emerald-400 hover:to-emerald-500 transition-all">
              Confirm Delivery & Release Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
