import Link from "next/link";
import { Package, ShoppingBag, ShieldCheck, Sparkles, Store } from "lucide-react";
import ProductNavbar from "@/components/products/navBar";
import Footer from "@/components/products/footer";

const featureCards = [
  {
    icon: ShoppingBag,
    title: "Shop Verified Listings",
    description: "Explore products, compare prices, and open product pages before creating an account.",
  },
  {
    icon: ShieldCheck,
    title: "Secure M-Pesa Payments",
    description: "Pay safely with M-Pesa when you're ready to checkout. Orders and payment activity stay protected.",
  },
  {
    icon: Store,
    title: "Powerful Seller Tools",
    description: "Add products, update stock, share listings to social media, and manage your business from one place.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ProductNavbar />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_35%),linear-gradient(180deg,#ffffff_0%,#eff6ff_100%)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm text-blue-700 shadow-sm">
                <Sparkles className="h-4 w-4" />
                Buy online. Sell with confidence.
              </div>

              <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
                Discover trusted products from sellers across Kenya.
              </h1>

              <p className="mt-5 max-w-2xl text-lg text-slate-600">
                Browse products, compare prices, and shop from one marketplace.
                Sign in only when you&apos;re ready to buy, sell, or manage your orders.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold shadow-sm transition hover:bg-blue-700"
                >
                  Shop Now
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                >
                  Start Selling
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid gap-6 md:grid-cols-3">
            {featureCards.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-slate-900">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-3xl border border-slate-200 bg-slate-900 px-6 py-10 sm:px-10 text-white">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-blue-100">
                  <Package className="h-4 w-4" />
                  Marketplace access
                </div>
                <h2 className="mt-4 text-2xl sm:text-3xl font-bold">
                  What visitors can do without signing in
                </h2>
                <p className="mt-3 text-sm sm:text-base text-slate-300">
                  Anyone can browse the marketplace and view product details.
                  Only buying, selling, editing products, and order management require an account.
                </p>
              </div>

              <div className="grid gap-3 text-sm text-slate-200 sm:min-w-[260px]">
                <div className="rounded-xl bg-white/10 px-4 py-3">Public: Home, products, product details</div>
                <div className="rounded-xl bg-white/10 px-4 py-3">Protected: Checkout, selling, editing, orders</div>
                <Link
                  href="/products"
                  className="rounded-xl bg-white px-4 py-3 text-center font-semibold text-slate-900 transition hover:bg-blue-50"
                >
                  Browse Marketplace
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
