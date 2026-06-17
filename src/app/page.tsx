import Link from "next/link";
import { Database, ArrowRight, Shield, BarChart3, Users } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="max-w-3xl">
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                GADFS Data Entry System
              </h1>
              <p className="text-xl text-primary-100 mb-8">
                Gender and Development Framework Statistics — collect, categorize,
                and share tabulated data segregated by sex and barangay.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/register" className="btn bg-white text-primary-700 hover:bg-primary-50 px-6 py-3 text-base">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
                <Link href="/browse" className="btn border-2 border-white text-white hover:bg-white/10 px-6 py-3 text-base">
                  Browse Public Data
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Database,
                title: "Spreadsheet Entry",
                desc: "Google Sheets-like interface for tabulated data with sex and barangay segregation.",
              },
              {
                icon: BarChart3,
                title: "Auto-Categorization",
                desc: "Automatic sector, subcategory, and tag assignment for easy filtering.",
              },
              {
                icon: Shield,
                title: "Secure Registration",
                desc: "Email OTP + Google Authenticator two-factor authentication.",
              },
              {
                icon: Users,
                title: "Role-Based Access",
                desc: "Admin, data encoder, and public visitor roles with appropriate permissions.",
              },
            ].map((f) => (
              <div key={f.title} className="card p-6">
                <f.icon className="w-10 h-10 text-primary-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
