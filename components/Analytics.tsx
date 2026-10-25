import Script from "next/script";

export function Analytics() {
  const rawGaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  const rawPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const gaId = rawGaId && /^(G|GT)-[A-Z0-9-]+$/i.test(rawGaId) ? rawGaId : undefined;
  const pixelId = rawPixelId && /^\d{5,30}$/.test(rawPixelId) ? rawPixelId : undefined;
  const gaIdLiteral = JSON.stringify(gaId);
  const pixelIdLiteral = JSON.stringify(pixelId);

  return (
    <>
      {gaId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config',${gaIdLiteral},{anonymize_ip:true});`}
          </Script>
        </>
      ) : null}
      {pixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${pixelIdLiteral});fbq('track','PageView');`}
        </Script>
      ) : null}
    </>
  );
}
