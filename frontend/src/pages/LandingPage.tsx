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

      {/* Three-Party Escrow Showcase */}
      <section id="three-party" className="py-20 bg-gradient-to-b from-ink-800 via-ink-900 to-ink-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full mb-5">
              <Users className="w-4 h-4 text-emerald-400 mr-2" />
              <span className="text-emerald-300 text-sm font-medium">Three-Party Escrow · Hawker ↔ Shop ↔ Buyer</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              Sell stock you <span className="gradient-text">don't own yet</span>
            </h2>
            <p className="text-ink-300 text-lg max-w-2xl mx-auto">
              For <strong className="text-white">Wachuuzi</strong> (street hawkers): list items from Kariakoo shop owners,
              share an escrow link, and earn commission the moment delivery is confirmed —
              without paying a single shilling upfront.
            </p>
          </div>

          {/* Flow diagram — 5 numbered steps */}
          <div className="grid md:grid-cols-5 gap-4 mb-14">
            {[
              { num: '1', emoji: '📱', title: 'Hawker creates link', sw: 'Mchuuzi atengeneza kiungo', desc: 'Set buyer price + supplier cost in the 4-step wizard' },
              { num: '2', emoji: '💬', title: 'Shop owner approves', sw: 'Mmiliki anakubali kwa SMS', desc: 'Gets WhatsApp/SMS → taps link → accepts (no account needed)' },
              { num: '3', emoji: '🔒', title: 'Buyer pays escrow', sw: 'Mnunuzi analipa escrow', desc: 'Funds held in licensed bank account · M-Pesa / Tigo Pesa' },
              { num: '4', emoji: '📦', title: 'Goods delivered', sw: 'Bidhaa inatolewa', desc: 'Hawker collects from shop, delivers to buyer' },
              { num: '5', emoji: '💰', title: 'Auto split payout', sw: 'Malipo yanagawanywa', desc: 'Supplier → M-Pesa · Hawker → commission · instant' },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="glass rounded-2xl p-5 h-full hover:border-emerald-500/40 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                      {s.num}
                    </div>
                    <div className="text-3xl">{s.emoji}</div>
                  </div>
                  <h4 className="text-white font-bold mb-1 text-sm">{s.title}</h4>
                  <p className="text-emerald-300/70 text-xs mb-2 italic">{s.sw}</p>
                  <p className="text-ink-400 text-xs leading-relaxed">{s.desc}</p>
                </div>
                {i < 4 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 text-gold-500/40 text-2xl">→</div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Commission breakdown + Letter of Comfort preview */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* LEFT: Commission breakdown */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass rounded-3xl p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gold-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Transparent Split</h3>
                  <p className="text-ink-400 text-xs">Everyone sees every shilling</p>
                </div>
              </div>

              {/* Example tx */}
              <div className="bg-ink-900 rounded-2xl p-5 mb-4 border border-ink-700">
                <p className="text-ink-400 text-xs mb-1">EXAMPLE · Samsung Galaxy S24</p>
                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-white text-2xl font-bold">TSh 1,850,000</span>
                  <span className="text-emerald-400 text-xs font-medium">Buyer pays</span>
                </div>

                <div className="space-y-0">
                  {[
                    { label: 'Mmiliki Anapata · Supplier (after 2% fee)', amount: '1,617,000', pct: '87.4%', color: 'text-emerald-300', bar: 'bg-emerald-500' },
                    { label: 'Faida Yako · Hawker Commission', amount: '144,500', pct: '7.8%', color: 'text-gold-300', bar: 'bg-gold-500' },
                    { label: 'Ada ya Biz-Salama · 2% supply + 3% buyer', amount: '88,500', pct: '4.8%', color: 'text-ink-400', bar: 'bg-ink-500' },
                  ].map((row, i) => (
                    <div key={i} className="py-3 border-b border-ink-800 last:border-0">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-ink-300 text-sm">{row.label}</span>
                        <span className={`${row.color} font-bold text-sm`}>TSh {row.amount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-ink-800 rounded-full overflow-hidden">
                          <div className={`h-full ${row.bar}`} style={{ width: row.pct }} />
                        </div>
                        <span className="text-ink-500 text-xs w-10 text-right">{row.pct}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-emerald-200 text-xs leading-relaxed">
                  Split happens <strong>automatically</strong> the moment the buyer taps "Confirm Delivery".
                  Supplier's share goes to their M-Pesa · Hawker's commission goes to theirs.
                </p>
              </div>
            </motion.div>

            {/* RIGHT: Letter of Comfort preview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="glass rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Letter of Comfort</h3>
                    <p className="text-ink-400 text-xs">What the shop owner gets</p>
                  </div>
                </div>

                {/* Mock phone frame with the letter */}
                <div className="bg-ink-900 rounded-2xl p-5 border border-gold-500/20 shadow-2xl">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-ink-700">
                    <div>
                      <div className="text-white font-display font-bold text-base">
                        Biz-<span className="text-gold-400">Salama</span>
                      </div>
                      <div className="text-ink-500 text-[10px]">biz-salama.co.tz · Escrow Licensed</div>
                    </div>
                    <div className="text-right">
                      <div className="text-ink-500 text-[10px]">Tarehe</div>
                      <div className="text-white text-xs font-bold">Today</div>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/40 rounded-full px-3 py-1 mb-4">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-300 text-[10px] font-bold tracking-wider">IMESHIKWA SALAMA · FUNDS SECURED</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      ['🔐 TX ID', '3PT-A47F2X', true],
                      ['📦 Item', 'Samsung Galaxy S24 Ultra', false],
                      ['💰 Amount', 'TSh 1,850,000', false],
                      ['📱 Supplier', 'Jumla Electronics Kariakoo', false],
                      ['🏦 Held at', 'CRDB Bank PLC', false],
                      ['⏳ Released when', 'Buyer confirms delivery', false],
                    ].map(([l, v, mono], i) => (
                      <div key={i} className="flex justify-between py-1 border-b border-ink-800 last:border-0">
                        <span className="text-ink-400">{l as string}</span>
                        <span className={`text-white font-medium text-right ml-2 ${mono ? 'font-mono' : ''}`}>
                          {v as string}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 bg-ink-800 rounded-lg p-3 text-center border border-ink-700">
                    <div className="text-ink-500 text-[9px] font-bold tracking-widest mb-1">VERIFY YOURSELF</div>
                    <div className="text-emerald-400 text-[10px] font-mono break-all">
                      biz-salama.co.tz/verify/3PT-A47F2X
                    </div>
                  </div>

                  <div className="mt-3 text-ink-500 text-[10px] leading-relaxed">
                    Shop owner taps the link → sees escrow status live → taps <strong className="text-emerald-300">"NDIO / Accept"</strong>
                    from their own phone. No Biz-Salama account required.
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <div className="flex-1 bg-[#25D366]/15 border border-[#25D366]/40 rounded-xl p-3 text-center">
                    <div className="text-[#25D366] text-xs font-bold mb-1">💬 WhatsApp</div>
                    <div className="text-ink-400 text-[10px]">1-tap share to supplier</div>
                  </div>
                  <div className="flex-1 bg-blue-500/15 border border-blue-500/30 rounded-xl p-3 text-center">
                    <div className="text-blue-400 text-xs font-bold mb-1">📱 SMS</div>
                    <div className="text-ink-400 text-[10px]">Feature-phone ready</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* CTA row */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              data-testid="landing-try-three-party-btn"
              to="/hawker/new"
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full font-bold hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg hover:shadow-emerald-500/25"
            >
              <Users className="w-5 h-5 mr-2" />
              Try 3-Party Escrow Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              data-testid="landing-supplier-portal-btn"
              to="/supplier/portal"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-ink-600 text-white rounded-full font-bold hover:bg-ink-800 hover:border-gold-500/40 transition-all"
            >
              <Shield className="w-5 h-5 mr-2" />
              I'm a Shop Owner (Supplier)
            </Link>
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
