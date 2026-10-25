import { TranslatedText } from "./LanguageSwitcher";
import { FaqSection } from "./FaqSection";
import { CheckCircle2, MessageCircle, PhoneCall } from "lucide-react";
import Image from "next/image";
import { PingButton } from "./PingExperience";

export function LandingPage() {
  return (
    <main id="main-content">
      <section className="conversion-hero" aria-labelledby="conversion-hero-title">
        <div className="container-shell conversion-hero-grid">
          <div className="conversion-hero-copy">
            <span className="eyebrow">Dentist At Door</span>
            <h1 id="conversion-hero-title"><TranslatedText en="Talk to Dr. Vishnoi." hi="डॉ. विश्नोई से बात करें," /><br /><span><TranslatedText en="Get expert advice." hi="पाएं विशेषज्ञ की सलाह।" /></span></h1>
            <p><TranslatedText en="Have a dental concern? Send your enquiry and the DAD's coordination team will contact you to understand your needs and help you with the next step." hi="दांतों से जुड़ी कोई परेशानी है? अपनी पूछताछ भेजें। DAD की समन्वय टीम आपकी ज़रूरत समझने और अगले कदम में मदद करने के लिए आपसे संपर्क करेगी।" /></p>
            <div className="conversion-hero-actions">
              <PingButton source="conversion_hero" className="conversion-hero-ping">Ping</PingButton>
            </div>
            <p className="conversion-hero-reassurance"><CheckCircle2 size={17} aria-hidden="true" /> <TranslatedText en="Consultation with Dr Manish Vishnoi: ₹1,500. Pay first, then share your details." hi="डॉ. मनीष विश्नोई से परामर्श: ₹1,500। पहले भुगतान करें, फिर अपनी जानकारी साझा करें।" /></p>
            <div className="hero-partner" aria-label="In collaboration with Vishnoi Dental Hospital">
              <span className="hero-partner-label"><TranslatedText en="In collaboration with" hi="के सहयोग से" /></span>
              <Image className="hero-partner-logo" src="/brand/vishnoi-dental-transparent.png" alt="Vishnoi Dental Hospital" width={2170} height={725} sizes="(max-width: 767px) 280px, 340px" />
            </div>
          </div>

          <div className="conversion-hero-media">
            <Image
              src="/brand/dr-vishnoi-dental-hero-v3.png"
              alt="AI-generated portrait of Dr. Manish Vishnoi in a white coat with a Doctors At Door badge, seated at a dental consultation table"
              fill
              sizes="(max-width: 767px) calc(100vw - 2rem), 46vw"
              preload
              quality={75}
            />
            <span className="hero-media-tag hero-media-tag-top"><MessageCircle size={15} aria-hidden="true" /> <TranslatedText en="Easy dental enquiries" hi="दांतों से जुड़ी आसान पूछताछ" /></span>
            <span className="hero-media-tag hero-media-tag-bottom"><PhoneCall size={15} aria-hidden="true" /> <TranslatedText en="Human follow-up" hi="हमारी टीम आपसे संपर्क करेगी" /></span>
          </div>
        </div>
      </section>

      <section className="ping-hero orbit-reinforcement" aria-labelledby="orbit-title">
        <div className="ping-hero-glow" aria-hidden="true" />
        <div className="container-shell ping-hero-inner">
          <p className="orbit-kicker"><TranslatedText en="Your dental enquiry starts with a Ping" hi="दांतों से जुड़ी आपकी पूछताछ एक पिंग से शुरू होती है" /></p>
          <div className="ping-orbit">
            <div className="ping-waves" aria-hidden="true"><span /><span /><span /></div>
            <div className="orbit-track orbit-track-one" aria-hidden="true"><span className="orbit-service"><MessageCircle size={15} /><b><TranslatedText en="Send enquiry" hi="पूछताछ भेजें" /></b></span></div>
            <div className="orbit-track orbit-track-two" aria-hidden="true"><span className="orbit-service"><PhoneCall size={15} /><b><TranslatedText en="We call" hi="हम कॉल करेंगे" /></b></span></div>
            <div className="orbit-track orbit-track-three" aria-hidden="true"><span className="orbit-service"><CheckCircle2 size={15} /><b><TranslatedText en="Next steps" hi="अगले कदम" /></b></span></div>
            <div className="ping-core">
              <Image className="ping-core-logo" src="/brand/doctors-at-door-wordmark.svg" alt="Doctors At Door" width={382} height={215} sizes="180px" />
              <p className="ping-core-presents"><TranslatedText en="Presents" hi="प्रस्तुत करता है" /></p>
              <h2 id="orbit-title">Dentist At Door</h2>
              <span className="ping-signal"><PingButton source="orbit_hero" className="ping-core-button">Ping</PingButton></span>
            </div>
          </div>
        </div>
      </section>

      <FaqSection />
      <div className="mobile-ping-bar md:hidden"><PingButton source="mobile_sticky" className="w-full">Ping</PingButton></div>
    </main>
  );
}
