import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, 
  ShoppingBag, 
  CreditCard, 
  CheckCircle, 
  Star, 
  ArrowRight,
  Lock,
  Users,
  TrendingUp,
  Smartphone
} from 'lucide-react';
import SEO from '../components/SEO';

const LandingPage: React.FC = () => {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <div className="overflow-hidden">
      <SEO
        title="Shop Safely with Escrow Protection"
        description="Tanzania's #1 trusted escrow marketplace. Your money stays protected until you receive your goods. 2,000+ happy customers. M-Pesa, Tigo Pesa & Airtel Money supported."
        url="/"
      />
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDI1MmYiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTItNCAwLTQgMiAwIDQgMiA0IDQgMCA0LTJzLTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse-slow" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeInUp}>
              <div className="inline-flex items-center px-4 py-2 bg-gold-500/10 border border-gold-500/30 rounded-full mb-6">
                <Shield className="w-4 h-4 text-gold-400 mr-2" />
                <span className="text-gold-400 text-sm font-medium">Tanzania's #1 Secure Marketplace</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white leading-tight mb-6">
                Shop Safely with{' '}
                <span className="gradient-text">Escrow Protection</span>
              </h1>
              
              <p className="text-xl text-ink-300 mb-8 max-w-lg">
                Your money stays protected until you receive your goods. 
                Buy from verified sellers across Tanzania with complete peace of mind.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/marketplace"
                  className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 rounded-full font-bold text-lg hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg hover:shadow-gold-500/25 group"
                >
                  Browse Products
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-ink-600 text-white rounded-full font-bold text-lg hover:bg-ink-800 transition-all"
                >
                  Start Selling
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-6 mt-10">
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 border-2 border-ink-900 flex items-center justify-center text-ink-900 text-sm font-bold">
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                  </div>
                  <span className="ml-4 text-ink-300">
                    <span className="text-white font-bold">2,000+</span> Happy Customers
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Hero Image/Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative glass rounded-3xl p-8 glow-gold">
                <div className="absolute -top-4 -right-4 bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center">
                  <Lock className="w-4 h-4 mr-1" />
                  Escrow Protected
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-ink-400 text-sm">Transaction Amount</p>
                      <p className="text-3xl font-bold text-white">TZS 150,000</p>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-gold-400 to-gold-600 rounded-2xl flex items-center justify-center">
                      <Shield className="w-8 h-8 text-ink-900" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b border-ink-700">
                      <span className="text-ink-400">Seller</span>
                      <span className="text-white font-medium flex items-center">
                        Mama Biashara
                        <CheckCircle className="w-4 h-4 text-emerald-400 ml-2" />
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-ink-700">
                      <span className="text-ink-400">Product</span>
                      <span className="text-white font-medium">Kitenge Fabric (5m)</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-ink-400">Status</span>
                      <span className="text-emerald-400 font-medium flex items-center">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
                        Funds Secured
                      </span>
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" />
                    <p className="text-emerald-300 text-sm">
                      Your payment is held securely until delivery is confirmed
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-ink-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              How Biz-Salama Works
            </h2>
            <p className="text-ink-400 text-lg max-w-2xl mx-auto">
              Simple, secure, and transparent. Here's how we protect every transaction.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: ShoppingBag,
                title: 'Browse & Order',
                description: 'Find products from verified sellers across Tanzania. Place your order with confidence.',
                step: '01'
              },
              {
                icon: Lock,
                title: 'Secure Payment',
                description: 'Pay via M-Pesa, Airtel Money, or Tigo Pesa. Your money is held safely in escrow.',
                step: '02'
              },
              {
                icon: CheckCircle,
                title: 'Confirm & Release',
                description: 'Receive your goods, confirm delivery, and the seller gets paid. Simple!',
                step: '03'
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                viewport={{ once: true }}
                className="relative group"
              >
                <div className="glass rounded-2xl p-8 h-full hover:border-gold-500/50 transition-all">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center text-ink-900 font-bold">
                    {item.step}
                  </div>
                  <div className="w-16 h-16 bg-ink-700 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-gold-500/10 transition-colors">
                    <item.icon className="w-8 h-8 text-gold-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-ink-400">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="trust" className="py-20 bg-ink-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-6">
                Why Tanzanians Trust{' '}
                <span className="gradient-text">Biz-Salama</span>
              </h2>
              <p className="text-ink-400 text-lg mb-8">
                We've built the most secure marketplace in East Africa, 
                specifically designed for social sellers and their customers.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: Shield,
                    title: 'Escrow Protection',
                    description: 'Every transaction is protected. Sellers only get paid when you confirm delivery.'
                  },
                  {
                    icon: Users,
                    title: 'Verified Sellers',
                    description: 'All sellers go through KYC verification. Shop from people you can trust.'
                  },
                  {
                    icon: Smartphone,
                    title: 'Mobile Money First',
                    description: 'Pay with M-Pesa, Airtel Money, or Tigo Pesa. No bank account needed.'
                  },
                  {
                    icon: TrendingUp,
                    title: 'Fair for Everyone',
                    description: 'Low fees split between buyer and seller. Everyone wins.'
                  }
                ].map((item, index) => (
                  <div key={index} className="flex items-start">
                    <div className="w-12 h-12 bg-gold-500/10 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                      <item.icon className="w-6 h-6 text-gold-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">{item.title}</h4>
                      <p className="text-ink-400">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="glass rounded-3xl p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full mb-4">
                    <Star className="w-10 h-10 text-ink-900" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Trusted by Thousands</h3>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {[
                    { value: '5,000+', label: 'Transactions' },
                    { value: '98%', label: 'Success Rate' },
                    { value: 'TZS 500M+', label: 'Protected' },
                    { value: '1,200+', label: 'Sellers' }
                  ].map((stat, index) => (
                    <div key={index} className="text-center p-4 bg-ink-800 rounded-xl">
                      <p className="text-2xl font-bold gradient-text">{stat.value}</p>
                      <p className="text-ink-400 text-sm">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-gold-600 to-gold-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-ink-900 mb-6">
            Ready to Shop or Sell Safely?
          </h2>
          <p className="text-ink-700 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of Tanzanians who trust Biz-Salama for secure transactions.
            Start today - it's free!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center px-8 py-4 bg-ink-900 text-white rounded-full font-bold text-lg hover:bg-ink-800 transition-all"
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              Explore Marketplace
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-ink-900 rounded-full font-bold text-lg hover:bg-ink-100 transition-all"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Start Selling Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
