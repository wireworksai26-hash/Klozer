import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ScrollAppShowcase from "@/components/landing/ScrollAppShowcase";
import StickyTransformation from "@/components/landing/StickyTransformation";
import HowItWorks from "@/components/landing/HowItWorks";
import DeepDive from "@/components/landing/DeepDive";
import IndustryCarousel from "@/components/landing/IndustryCarousel";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import ChatWidget from "@/components/landing/ChatWidget";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f9f8f6] text-[#171417] selection:bg-[#2545ff] selection:text-white relative w-full max-w-[100vw] overflow-x-hidden">
      <Navbar />
      <main className="w-full max-w-[100vw] overflow-x-hidden">
        <Hero />
        <ScrollAppShowcase />
        <StickyTransformation />
        <HowItWorks />
        <DeepDive />
        <IndustryCarousel />
        <Testimonials />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
