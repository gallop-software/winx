import Script from 'next/script'

type GoogleAdsProps = {
  adId: string
  loadGtagJs?: boolean // Optional flag to skip duplicate gtag.js load
}

export default function GoogleAds({ adId, loadGtagJs = true }: GoogleAdsProps) {
  if (!adId) return null

  return (
    <>
      {loadGtagJs && (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${adId}`}
          strategy="afterInteractive"
        />
      )}
      <Script
        id="google-ads-config"
        strategy="afterInteractive"
      >
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('config', '${adId}');
        `}
      </Script>
    </>
  )
}
