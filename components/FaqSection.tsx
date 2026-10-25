import { TranslatedText } from "./LanguageSwitcher";

const faqs = [
  {
    question: "What is the fee for an online video consultation with Dr. Manish Vishnoi?",
    questionHi: "डॉ. मनीष विश्नोई के साथ ऑनलाइन वीडियो परामर्श का शुल्क कितना है?",
    answer: "The fee for an online video consultation with Dr. Manish Vishnoi is ₹1,500.",
    answerHi: "डॉ. मनीष विश्नोई के साथ ऑनलाइन वीडियो परामर्श का शुल्क ₹1,500 है।",
  },
  {
    question: "How will the online consultation take place?",
    questionHi: "ऑनलाइन परामर्श कैसे होगा?",
    answer: "After successful payment, you will be provided with an available video consultation time slot. You will need to connect with Dr. Manish Vishnoi at the scheduled time.",
    answerHi: "सफल भुगतान के बाद आपको वीडियो परामर्श के लिए उपलब्ध समय दिया जाएगा। आपको निर्धारित समय पर डॉ. मनीष विश्नोई से जुड़ना होगा।",
  },
  {
    question: "Can I speak with the doctor at any time after making the payment?",
    questionHi: "क्या भुगतान के बाद मैं किसी भी समय डॉक्टर से बात कर सकता हूँ?",
    answer: "No. The consultation will take place only during the confirmed time slot provided to you. Please make sure you are available at the scheduled time.",
    answerHi: "नहीं। परामर्श केवल आपको दिए गए पुष्ट समय पर ही होगा। कृपया सुनिश्चित करें कि आप निर्धारित समय पर उपलब्ध हों।",
  },
  {
    question: "What happens to the ₹1,500 consultation fee if I proceed with treatment?",
    questionHi: "यदि मैं इलाज करवाता हूँ, तो ₹1,500 के परामर्श शुल्क का क्या होगा?",
    answer: "If you decide to proceed with the recommended treatment with Dr. Manish Vishnoi, the ₹1,500 consultation fee will be adjusted against your treatment charges, as applicable.",
    answerHi: "यदि आप डॉ. मनीष विश्नोई से सुझाया गया इलाज करवाने का निर्णय लेते हैं, तो लागू शर्तों के अनुसार ₹1,500 का परामर्श शुल्क आपके इलाज के शुल्क में समायोजित किया जाएगा।",
  },
  {
    question: "How long is the consultation advice valid?",
    questionHi: "परामर्श की सलाह कितने समय तक मान्य है?",
    answer: "The consultation and medical advice provided by Dr. Manish Vishnoi will be considered valid for 15 days from the date of consultation. After 15 days, a fresh consultation may be required depending on your condition.",
    answerHi: "डॉ. मनीष विश्नोई द्वारा दिया गया परामर्श और चिकित्सकीय सलाह परामर्श की तारीख से 15 दिनों तक मान्य होगी। 15 दिनों के बाद आपकी स्थिति के अनुसार नए परामर्श की आवश्यकता हो सकती है।",
  },
  {
    question: "Do I need to come to Kanpur for treatment?",
    questionHi: "क्या इलाज के लिए मुझे कानपुर आना होगा?",
    answer: "Yes. The initial consultation can be completed online through video consultation. However, if any dental procedure or physical treatment is recommended, you will need to visit Kanpur for the treatment.",
    answerHi: "हाँ। शुरुआती परामर्श ऑनलाइन वीडियो के माध्यम से हो सकता है। लेकिन यदि किसी दंत प्रक्रिया या प्रत्यक्ष इलाज की सलाह दी जाती है, तो आपको इलाज के लिए कानपुर आना होगा।",
  },
  {
    question: "Is the ₹1,500 fee only for the video consultation?",
    questionHi: "क्या ₹1,500 का शुल्क केवल वीडियो परामर्श के लिए है?",
    answer: "Yes. The ₹1,500 fee covers the online video consultation with Dr. Manish Vishnoi. Tests, investigations, medicines, dental procedures, or other treatments are not included in this consultation fee.",
    answerHi: "हाँ। ₹1,500 का शुल्क डॉ. मनीष विश्नोई के साथ ऑनलाइन वीडियो परामर्श के लिए है। जाँच, दवाएँ, दंत प्रक्रियाएँ या अन्य इलाज इस परामर्श शुल्क में शामिल नहीं हैं।",
  },
  {
    question: "What happens after I make the payment?",
    questionHi: "भुगतान के बाद क्या होगा?",
    answer: "After successful payment, the coordination team will contact you, collect the required patient details, and provide you with the confirmed consultation slot and further instructions.",
    answerHi: "सफल भुगतान के बाद समन्वय टीम आपसे संपर्क करेगी, मरीज़ की आवश्यक जानकारी लेगी और आपको परामर्श का पुष्ट समय तथा आगे के निर्देश देगी।",
  },
  {
    question: "What if further examination is required after the video consultation?",
    questionHi: "यदि वीडियो परामर्श के बाद अतिरिक्त जाँच की आवश्यकता हो तो क्या होगा?",
    answer: "Based on your condition, Dr. Manish Vishnoi may recommend an in-person examination, diagnostic test, scan, or treatment. In such cases, you will need to visit the designated facility in Kanpur.",
    answerHi: "आपकी स्थिति के आधार पर डॉ. मनीष विश्नोई प्रत्यक्ष परीक्षण, नैदानिक जाँच, स्कैन या इलाज की सलाह दे सकते हैं। ऐसे मामलों में आपको कानपुर में निर्धारित केंद्र पर आना होगा।",
  },
  {
    question: "Does an online consultation guarantee that treatment can be completed remotely?",
    questionHi: "क्या ऑनलाइन परामर्श से यह गारंटी मिलती है कि पूरा इलाज दूर से हो सकता है?",
    answer: "No. The online consultation is intended for initial assessment, professional advice, and treatment guidance. Dental procedures that require physical examination or intervention must be carried out in person.",
    answerHi: "नहीं। ऑनलाइन परामर्श शुरुआती आकलन, विशेषज्ञ सलाह और इलाज के मार्गदर्शन के लिए है। जिन दंत प्रक्रियाओं में शारीरिक परीक्षण या उपचार की आवश्यकता होती है, वे प्रत्यक्ष रूप से ही की जाती हैं।",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="faq-section" aria-labelledby="faq-title">
      <div className="container-shell faq-container">
        <div className="faq-heading">
          <span className="eyebrow"><TranslatedText en="Before your consultation" hi="आपके परामर्श से पहले" /></span>
          <h2 id="faq-title"><TranslatedText en="Frequently Asked Questions" hi="अक्सर पूछे जाने वाले प्रश्न" /></h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <details className="faq-item" key={faq.question} open={index === 0}>
              <summary>
                <span className="faq-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3><TranslatedText en={faq.question} hi={faq.questionHi} /></h3>
                <span className="faq-toggle" aria-hidden="true" />
              </summary>
              <p><TranslatedText en={faq.answer} hi={faq.answerHi} /></p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
